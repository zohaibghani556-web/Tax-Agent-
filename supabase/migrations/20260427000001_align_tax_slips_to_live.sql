-- ============================================================
-- TaxAgent.ai — Align tax_slips to current live schema
-- Migration: 20260427000001_align_tax_slips_to_live
--
-- Context:
--   The live Supabase database uses the original profile_id-based
--   schema. Migrations 20260424–20260426 created tables
--   (slip_extractions, slip_corrections, tax_returns) and columns
--   that do NOT exist on the live database, so those migrations were
--   never applied to production.
--
--   This migration brings the live tax_slips table to a stable
--   intermediate state that:
--     • allows all 14 supported slip types (DB parity with SLIP_FIELDS)
--     • expands the source CHECK to cover all ingestion methods
--     • adds nullable columns used by app-layer code without breaking
--       the existing profile_id-based read/write path
--     • adds dedup indexes scoped to profile_id (safe for the current path)
--     • does NOT create slip_extractions, slip_corrections, or tax_returns
--     • does NOT add a FK on source_extraction_id (the referenced table
--       does not yet exist on live — FK will be added in the unified migration)
--
-- Design: every statement uses IF NOT EXISTS / DROP ... IF EXISTS so
-- this migration is idempotent and safe to re-run after a partial failure.
-- ============================================================

-- ── 1. Expand slip_type CHECK to all 14 supported slip types ──────────────────
-- The live DB may still have the old 8-type constraint or the 14-type
-- constraint added by 20260420000001 (which may or may not have run on live).
-- Drop both possible name variants defensively and re-create explicitly.

ALTER TABLE public.tax_slips
  DROP CONSTRAINT IF EXISTS tax_slips_slip_type_check;

ALTER TABLE public.tax_slips
  DROP CONSTRAINT IF EXISTS tax_slips_type_check;

-- Explicit name so future migrations can reference or drop it by name.
-- Must match SUPPORTED_SLIP_TYPES in src/lib/supabase/tax-data.ts exactly.
ALTER TABLE public.tax_slips
  ADD CONSTRAINT tax_slips_slip_type_check
  CHECK (slip_type IN (
    'T4',
    'T5',
    'T5008',
    'T3',
    'T4A',
    'T2202',
    'T4E',
    'T5007',
    'T4AP',
    'T4AOAS',
    'T4RSP',
    'T4RIF',
    'RRSP-Receipt',
    'T4FHSA'
  ));

-- ── 2. Expand source CHECK ────────────────────────────────────────────────────
-- The original live column had no named CHECK constraint; drop defensively.

ALTER TABLE public.tax_slips
  DROP CONSTRAINT IF EXISTS tax_slips_source_check;

ALTER TABLE public.tax_slips
  ADD CONSTRAINT tax_slips_source_check
  CHECK (source IN ('manual', 'ocr', 'xml', 'pdf-text', 'imported'));

-- ── 3. Nullable columns ───────────────────────────────────────────────────────

-- tax_year: which tax year this slip belongs to.
-- NULL means 2025 for all existing rows (all current live rows are 2025 filings).
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS tax_year integer;

-- user_id: direct reference to auth.users, bypassing the tax_profiles join.
-- NULL for existing profile_id-based rows — the old path remains unaffected.
-- Added without NOT NULL so existing rows are not disturbed.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS user_id uuid
    REFERENCES auth.users(id) ON DELETE CASCADE;

-- file_hash: SHA-256 hex digest of the original uploaded file.
-- Used for re-upload deduplication. NULL for manually-entered slips.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS file_hash text;

-- source_extraction_id: FK placeholder for slip_extractions.id.
-- slip_extractions does NOT yet exist on live, so no FK is added here.
-- TODO: add REFERENCES public.slip_extractions(id) ON DELETE SET NULL
--       in the unified-architecture migration once that table is created.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS source_extraction_id uuid;

-- updated_at: tracks last modification time for change detection and sync.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- slip_status: lifecycle state for the slip record.
-- Existing rows get NULL; application code must treat NULL as 'active'.
-- The unified store path will backfill this column when rows are first touched.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS slip_status text DEFAULT 'active'
    CHECK (slip_status IN ('active', 'amended', 'cancelled', 'duplicate', 'needs_review'));

-- ── 4. Indexes ────────────────────────────────────────────────────────────────

-- Primary list query: fetch all slips for a profile ordered by entry time.
CREATE INDEX IF NOT EXISTS idx_tax_slips_profile_id
  ON public.tax_slips(profile_id, created_at DESC);

-- Dedup: one row per (profile, year, type, file hash).
-- Partial: file_hash IS NULL rows (manual entry) are excluded from uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_slips_profile_file_hash
  ON public.tax_slips(profile_id, tax_year, slip_type, file_hash)
  WHERE file_hash IS NOT NULL;

-- Dedup: one unified-slip row per extraction session.
-- Partial: source_extraction_id IS NULL for old-path and manual rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_slips_profile_extraction
  ON public.tax_slips(profile_id, source_extraction_id)
  WHERE source_extraction_id IS NOT NULL;
