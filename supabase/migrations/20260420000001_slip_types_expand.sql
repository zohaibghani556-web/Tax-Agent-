-- ============================================================
-- TaxAgent.ai — Expand tax_slips.slip_type CHECK constraint
-- Migration: 20260420000001_slip_types_expand
--
-- The original CHECK constraint only allowed 8 slip types.
-- The parser, engine, and OCR pipeline all handle 14 types.
-- T4RSP, T4RIF, RRSP-Receipt, T4FHSA, T4AP, T4AOAS were being
-- silently dropped on every save. This migration brings the DB
-- in sync with the application layer.
-- ============================================================

-- Drop the old constraint (Supabase names unnamed CHECKs with the
-- pattern <table>_<column>_check). Use both variants defensively.
ALTER TABLE public.tax_slips
  DROP CONSTRAINT IF EXISTS tax_slips_slip_type_check;

ALTER TABLE public.tax_slips
  DROP CONSTRAINT IF EXISTS tax_slips_type_check;

-- Explicit named constraint so future migrations can reference it by name.
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
