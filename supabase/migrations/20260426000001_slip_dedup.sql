-- ============================================================
-- TaxAgent.ai — Slip Deduplication Constraints
-- Migration: 20260426000001_slip_dedup
--
-- Fixes two duplicate-persistence bugs:
--
-- Bug 1 — Review-flow double-save:
--   The review page's createSlip() could be called more than once
--   for the same extraction (e.g. user navigates back and re-saves).
--   Fix: source_extraction_id tracks which slip_extractions row produced
--   this tax_slips row. A partial UNIQUE index prevents two unified-slip
--   rows from pointing at the same extraction.
--
-- Bug 2 — Re-upload of the same file:
--   Uploading an identical file twice produced two rows with the same
--   data, doubling employment income in the tax engine.
--   Fix: file_hash (SHA-256) is now stored on slip_extractions at OCR
--   time and propagated to tax_slips at review-save time. A partial
--   UNIQUE index on (user_id, tax_year, slip_type, file_hash) prevents
--   two unified-slip rows from the same physical document.
--
-- Both indexes are partial (WHERE col IS NOT NULL) because:
--   - Manually-entered slips have no source file → file_hash IS NULL
--   - Old-path rows (profile_id) have no source_extraction_id → NULL
--   - NULL values are excluded from UNIQUE constraints in Postgres, so
--     partial indexes are needed to enforce uniqueness only where the
--     column is populated.
-- ============================================================

-- ── slip_extractions: store SHA-256 of uploaded file ─────────────────────────

ALTER TABLE public.slip_extractions
  ADD COLUMN IF NOT EXISTS file_hash text;

COMMENT ON COLUMN public.slip_extractions.file_hash IS
  'SHA-256 hex digest of the original uploaded file. Used to detect re-uploads '
  'of the same document and propagated to tax_slips.file_hash at review-save.';

-- ── tax_slips: track which extraction produced each unified slip ──────────────

ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS source_extraction_id uuid
    REFERENCES public.slip_extractions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tax_slips.source_extraction_id IS
  'The slip_extractions row that produced this unified slip. NULL for manually '
  'entered slips or old-path rows (profile_id). Used for review-flow idempotency.';

-- ── Unique partial index: one unified slip per extraction ─────────────────────
-- Prevents createSlip() from inserting a second row when the user re-saves the
-- same review session (e.g. back-navigation, double-click).

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_slips_unique_source_extraction
  ON public.tax_slips(user_id, source_extraction_id)
  WHERE source_extraction_id IS NOT NULL;

-- ── Unique partial index: one unified slip per file hash ──────────────────────
-- Prevents re-uploading the same physical document from doubling income.
-- Scoped to (user_id, tax_year, slip_type) so two different users uploading
-- the same employer's PDF do not conflict.

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_slips_unique_file_hash
  ON public.tax_slips(user_id, tax_year, slip_type, file_hash)
  WHERE file_hash IS NOT NULL;
