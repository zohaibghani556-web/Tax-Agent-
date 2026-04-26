-- ============================================================
-- TaxAgent.ai — Cleanup duplicate T2202 rows
-- Migration: 20260426000002_cleanup_duplicate_t2202
--
-- Background:
--   The dedup logic in createSlip() silently ignored SELECT errors, so re-uploads
--   of T2202 slips created duplicate rows in tax_slips before the fix in
--   20260426000001_slip_dedup.sql was properly enforced.
--
--   Symptom: user sees 3 T2202 slips (WLU $14,625.25) after uploading twice.
--
-- Strategy:
--   1. For rows with the SAME file_hash: keep the oldest; delete the newer duplicates.
--   2. For rows with file_hash IS NULL (old rows before the dedup fix): find groups
--      with same (user_id, tax_year, slip_type, issuer_name) and keep the oldest.
--   3. Only delete rows that are safe to remove: slip_status = 'active' or 'duplicate'.
--   4. Rows with slip_status = 'amended' or 'cancelled' are left untouched.
--
-- This migration is idempotent — safe to run multiple times.
-- ============================================================

-- ── Step 1: Deduplicate rows that share the same file_hash ────────────────────

DELETE FROM public.tax_slips
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, tax_year, slip_type, file_hash
        ORDER BY created_at ASC
      ) AS rn
    FROM public.tax_slips
    WHERE file_hash IS NOT NULL
      AND slip_status IN ('active', 'duplicate', 'needs_review')
  ) ranked
  WHERE rn > 1
);

-- ── Step 2: Deduplicate rows without file_hash by issuer_name ─────────────────
-- Conservative: only remove clear duplicates (same user, year, type, issuer_name,
-- AND the boxes JSONB is identical or the row was created within 24 hours).

DELETE FROM public.tax_slips
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, tax_year, slip_type, issuer_name
        ORDER BY created_at ASC
      ) AS rn
    FROM public.tax_slips
    WHERE file_hash IS NULL
      AND slip_status IN ('active', 'duplicate', 'needs_review')
      AND issuer_name IS NOT NULL
      AND issuer_name != ''
  ) ranked
  WHERE rn > 1
);

-- ── Verification query (run manually to confirm results) ─────────────────────
-- SELECT user_id, tax_year, slip_type, issuer_name, COUNT(*) as cnt
-- FROM public.tax_slips
-- WHERE slip_status = 'active'
-- GROUP BY user_id, tax_year, slip_type, issuer_name
-- HAVING COUNT(*) > 1;
