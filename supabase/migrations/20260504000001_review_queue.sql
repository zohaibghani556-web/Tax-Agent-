-- ============================================================
-- TaxAgent.ai — CPA Review Queue tables
-- Migration: 20260504000001_review_queue
--
-- DRAFT — requires human approval before applying to production.
--
-- Two tables:
--   review_files  — one row per tax file under review
--   review_notes  — per-node reviewer comments
--
-- RLS: users see their own files OR files assigned to them.
-- ============================================================

-- ── review_files ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.review_files (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id            uuid NOT NULL REFERENCES public.tax_profiles(id) ON DELETE CASCADE,
  tax_year              int  NOT NULL DEFAULT 2025,
  status                text NOT NULL DEFAULT 'in_prep'
                        CHECK (status IN (
                          'in_prep',
                          'in_review',
                          'approved',
                          'filed',
                          'needs_info'
                        )),
  assigned_preparer_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_reviewer_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  exception_count       int  NOT NULL DEFAULT 0,
  readiness_score       int  NOT NULL DEFAULT 0
                        CHECK (readiness_score >= 0 AND readiness_score <= 100),
  reviewer_approved_at  timestamptz,
  reviewer_notes        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- One review file per profile per tax year
  CONSTRAINT review_files_profile_year_unique UNIQUE (profile_id, tax_year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_files_profile_id
  ON public.review_files(profile_id);

CREATE INDEX IF NOT EXISTS idx_review_files_status
  ON public.review_files(status);

CREATE INDEX IF NOT EXISTS idx_review_files_preparer
  ON public.review_files(assigned_preparer_id)
  WHERE assigned_preparer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_files_reviewer
  ON public.review_files(assigned_reviewer_id)
  WHERE assigned_reviewer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_files_updated_at
  ON public.review_files(updated_at DESC);

COMMENT ON TABLE public.review_files IS
  'CPA review queue — one row per tax file under review. Status tracks workflow from prep through filing.';

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_review_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_files_updated_at
  BEFORE UPDATE ON public.review_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_files_updated_at();

-- ── RLS for review_files ────────────────────────────────────
-- Users can see files they own (via profile), are assigned as preparer, or as reviewer.

ALTER TABLE public.review_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_files: owner or assignee access" ON public.review_files;
CREATE POLICY "review_files: owner or assignee access"
  ON public.review_files
  FOR ALL
  USING (
    auth.uid() IN (
      -- File owner (via tax_profiles)
      (SELECT user_id FROM public.tax_profiles WHERE id = profile_id),
      -- Assigned preparer
      assigned_preparer_id,
      -- Assigned reviewer
      assigned_reviewer_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      (SELECT user_id FROM public.tax_profiles WHERE id = profile_id),
      assigned_preparer_id,
      assigned_reviewer_id
    )
  );


-- ── review_notes ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.review_notes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_file_id  uuid NOT NULL REFERENCES public.review_files(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_type       text CHECK (node_type IN ('slip', 'extraction', 'calculation', 'general') OR node_type IS NULL),
  node_id         uuid,
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_notes_review_file_id
  ON public.review_notes(review_file_id);

CREATE INDEX IF NOT EXISTS idx_review_notes_user_id
  ON public.review_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_review_notes_created_at
  ON public.review_notes(created_at DESC);

COMMENT ON TABLE public.review_notes IS
  'Per-node reviewer comments attached to a review file. node_type/node_id link to specific graph nodes.';

-- ── RLS for review_notes ────────────────────────────────────
-- Users can see notes on review files they have access to.

ALTER TABLE public.review_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_notes: access via review_files" ON public.review_notes;
CREATE POLICY "review_notes: access via review_files"
  ON public.review_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.review_files rf
      WHERE rf.id = review_file_id
      AND auth.uid() IN (
        (SELECT user_id FROM public.tax_profiles WHERE id = rf.profile_id),
        rf.assigned_preparer_id,
        rf.assigned_reviewer_id
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.review_files rf
      WHERE rf.id = review_file_id
      AND auth.uid() IN (
        (SELECT user_id FROM public.tax_profiles WHERE id = rf.profile_id),
        rf.assigned_preparer_id,
        rf.assigned_reviewer_id
      )
    )
  );
