-- ============================================================
-- TaxAgent.ai — Unified Slip Store Foundation
-- Migration: 20260425000002_unified_slip_store
--
-- Extends tax_slips with:
--   - Direct user_id column (bypasses profile_id join for new rows)
--   - tax_year column (explicit, not derived from profile)
--   - source_method with CHECK (replaces implicit 'source' column)
--   - slip_status lifecycle column (active/amended/cancelled/duplicate/needs_review)
--   - field_provenance JSONB (per-box source + confidence)
--   - raw_extracted_data JSONB (full unmodified model output)
--   - unmapped_fields JSONB (fields found by OCR/XML but not in schema)
--   - missing_required TEXT[] (required boxes that were absent)
--   - file_hash TEXT (SHA-256 for dedup + audit)
--   - original_filename TEXT
--   - schema_version TEXT (CRA XSD version used, e.g. 'v1.26.3')
--   - imported_at TIMESTAMPTZ
--   - extraction_model TEXT
--   - extraction_model_version TEXT
--   - needs_review BOOLEAN (denormalized from slip_status for partial index)
--   - updated_at TIMESTAMPTZ
--
-- Strategy: ALTER existing table. All new columns are nullable
-- (except slip_status and needs_review which have NOT NULL defaults)
-- so existing rows are unaffected.
--
-- The 'boxes' JSONB column already exists — not re-added.
-- ============================================================

-- ── 2a — Refresh the slip_type CHECK constraint ─────────────────────────────
-- Migration 20260420000001 already defined all 14 types under the name
-- tax_slips_slip_type_check. Drop and re-add here so this migration is the
-- single authoritative definition going forward.

ALTER TABLE public.tax_slips
  DROP CONSTRAINT IF EXISTS tax_slips_slip_type_check;

ALTER TABLE public.tax_slips
  ADD CONSTRAINT tax_slips_slip_type_check
  CHECK (slip_type IN (
    'T4', 'T5', 'T5008', 'T3', 'T4A', 'T2202',
    'T4E', 'T5007', 'T4AP', 'T4AOAS', 'T4RSP',
    'T4RIF', 'RRSP-Receipt', 'T4FHSA'
  ));

-- ── 2b — New columns ────────────────────────────────────────────────────────

-- Direct user reference. New rows from slip-store.ts set this directly;
-- old rows continue to use profile_id → tax_profiles join for RLS.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS user_id uuid
    REFERENCES auth.users(id) ON DELETE CASCADE;

-- Explicit tax year. Old rows derive this from their profile; new rows set it.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS tax_year integer;

-- How the slip was ingested. Superset of the old 'source' column.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS source_method text
    CHECK (source_method IN ('xml', 'pdf-text', 'ocr', 'manual', 'imported'));

-- Lifecycle status. NOT NULL with default so existing rows read as 'active'.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS slip_status text NOT NULL DEFAULT 'active'
    CHECK (slip_status IN (
      'active', 'amended', 'cancelled', 'duplicate', 'needs_review'
    ));

-- Field-level provenance: CRA box key → FieldProvenance object.
-- Populated by OCR/XML pipeline; updated by recordManualOverride.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS field_provenance jsonb;

-- Full raw model output stored unmodified for debugging and fine-tuning.
-- Also used as the append-only manual-override audit log (_manualAudit key).
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS raw_extracted_data jsonb;

-- Fields OCR/XML found but could not map to a known CRA box key.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS unmapped_fields jsonb;

-- Box keys that are required for this slip type but were absent in extraction.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS missing_required text[];

-- SHA-256 of the original uploaded file for deduplication and audit.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS file_hash text;

ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS original_filename text;

-- CRA XSD version used during XML import (e.g. 'v1.26.3').
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS schema_version text;

ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;

-- Claude model used for extraction (e.g. 'claude-sonnet-4-6').
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS extraction_model text;

ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS extraction_model_version text;

-- Denormalized review flag. Kept in sync with slip_status = 'needs_review'
-- so a partial index can efficiently serve the review queue.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

-- Optimistic concurrency / audit timestamp.
ALTER TABLE public.tax_slips
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ── 2c — Indexes ─────────────────────────────────────────────────────────────

-- Primary query pattern for the new store: user + year + status.
CREATE INDEX IF NOT EXISTS idx_tax_slips_user_year_status
  ON public.tax_slips(user_id, tax_year, slip_status);

-- Partial index for the review queue (small, fast).
CREATE INDEX IF NOT EXISTS idx_tax_slips_needs_review
  ON public.tax_slips(user_id)
  WHERE needs_review = true;

-- ── 2d — RLS ─────────────────────────────────────────────────────────────────
-- Existing policy "tax_slips: owner access only" resolves ownership via
-- the profile_id → tax_profiles.user_id join. It remains in place and
-- covers all existing rows (which have profile_id but no user_id).
--
-- New rows written by slip-store.ts carry user_id directly and no profile_id.
-- Add a direct-user_id policy so they are accessible without the join.
--
-- Postgres applies RLS policies with OR semantics per command:
--   - A row passes if it satisfies ANY policy's USING clause (SELECT).
--   - An INSERT passes if the new row satisfies ANY policy's WITH CHECK.
-- Both populations are naturally disjoint (old rows: profile_id, no user_id;
-- new rows: user_id, no profile_id), so there is no cross-ownership risk.

DROP POLICY IF EXISTS "users_own_slips" ON public.tax_slips;
CREATE POLICY "users_own_slips"
  ON public.tax_slips
  FOR ALL
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
