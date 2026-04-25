-- ============================================================
-- TaxAgent.ai — slip_extractions table
-- Migration: 20260424000001_slip_extractions
--
-- Stores results from the 3-stage extraction pipeline:
--   Stage 1: Classification (Haiku)
--   Stage 2: Extraction (Sonnet structured outputs)
--   Stage 3: Validation (Zod)
--
-- Every extraction is persisted for quality analysis, debugging,
-- and cost tracking. raw_model_response stores the full model
-- output for each stage.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.slip_extractions (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_storage_path   text NOT NULL,
  slip_type_detected      text NOT NULL,
  classification_confidence numeric(4,3) NOT NULL DEFAULT 0,
  status                  text NOT NULL DEFAULT 'success'
                          CHECK (status IN (
                            'success',
                            'needs_review',
                            'classification_failed',
                            'extraction_failed',
                            'validation_failed'
                          )),
  extraction_result       jsonb,
  boxes                   jsonb,
  raw_model_response      jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_errors       jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_tokens            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  reviewed_by_user_at     timestamptz
);

-- Index for user lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_slip_extractions_user_id
  ON public.slip_extractions(user_id);

-- Index for quality analysis: find extractions needing review
CREATE INDEX IF NOT EXISTS idx_slip_extractions_status
  ON public.slip_extractions(status)
  WHERE status != 'success';

-- Index for time-based queries (cost reports, recent extractions)
CREATE INDEX IF NOT EXISTS idx_slip_extractions_created_at
  ON public.slip_extractions(created_at DESC);

COMMENT ON TABLE public.slip_extractions IS
  'Stores every slip extraction pipeline run for debugging, quality analysis, and cost tracking.';
COMMENT ON COLUMN public.slip_extractions.raw_model_response IS
  'Full model responses from classification and extraction stages. For debugging only — never expose to client.';
COMMENT ON COLUMN public.slip_extractions.usage_tokens IS
  'Token counts: { classificationInputTokens, classificationOutputTokens, extractionInputTokens, extractionOutputTokens }';

-- ── RLS ──────────────────────────────────────────────────────
-- Users can only see their own extractions. raw_model_response
-- is stored but only accessible server-side (never returned to client).

ALTER TABLE public.slip_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slip_extractions: owner access only" ON public.slip_extractions;
CREATE POLICY "slip_extractions: owner access only"
  ON public.slip_extractions
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
