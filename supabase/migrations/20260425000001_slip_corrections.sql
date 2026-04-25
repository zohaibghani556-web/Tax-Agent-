-- ============================================================
-- TaxAgent.ai — slip_corrections table
-- Migration: 20260425000001_slip_corrections
--
-- Stores user corrections to AI-extracted slip fields.
-- Every corrected field records both the original extracted
-- value and the user's correction — training signal for
-- future prompt improvements and fine-tuning.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.slip_corrections (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  extraction_id    uuid NOT NULL REFERENCES public.slip_extractions(id) ON DELETE CASCADE,
  field_name       text NOT NULL,
  original_value   text,            -- NULL means the field was missing / not extracted
  corrected_value  text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by extraction for quality analysis
CREATE INDEX IF NOT EXISTS idx_slip_corrections_extraction_id
  ON public.slip_corrections(extraction_id);

-- User-level lookup for audit trail
CREATE INDEX IF NOT EXISTS idx_slip_corrections_user_id
  ON public.slip_corrections(user_id);

COMMENT ON TABLE public.slip_corrections IS
  'User corrections to AI-extracted slip fields. Pairs with slip_extractions for quality tracking.';
COMMENT ON COLUMN public.slip_corrections.original_value IS
  'The value the extraction pipeline produced. NULL if the field was absent.';
COMMENT ON COLUMN public.slip_corrections.corrected_value IS
  'The value the user entered or confirmed. This is the authoritative value.';

-- ── RLS ──────────────────────────────────────────────────────
-- Users can only read/write their own corrections.

ALTER TABLE public.slip_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slip_corrections: owner access only" ON public.slip_corrections;
CREATE POLICY "slip_corrections: owner access only"
  ON public.slip_corrections
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
