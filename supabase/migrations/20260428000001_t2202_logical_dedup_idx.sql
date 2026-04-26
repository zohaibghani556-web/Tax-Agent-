-- ============================================================
-- TaxAgent.ai — T2202 logical-duplicate index
-- Migration: 20260428000001_t2202_logical_dedup_idx
--
-- Context:
--   The smoke test on 2026-04-26 produced two identical T2202 rows for
--   Wilfrid Laurier University (boxA = 14625.25) because the app-layer dedup
--   in upsertSlipInList() was not always reached before upsertSlips() wrote
--   to the database.  The primary fix is app-layer (dedupeSlipList() is now
--   called inside upsertSlips()), but this index adds a DB-level safety net.
--
-- Design:
--   Two T2202 slips are logical duplicates when they share:
--     - same profile (profile_id)
--     - same effective tax year (coalesce null → 2025)
--     - same institution name (case-insensitive, trimmed)
--     - same eligible tuition dollar amount (boxes->>'boxA')
--
--   The partial WHERE clause limits the index to rows where both the
--   institution name AND boxA are non-null/non-empty, so:
--     - Manual slips with no issuer_name are never blocked.
--     - T2202 slips with different tuition amounts (different semesters)
--       are separate rows and will never conflict.
--
-- Cleanup:
--   The migration first removes any existing duplicate rows, keeping the most
--   recently created one per logical key, so that CREATE UNIQUE INDEX succeeds
--   even when the live database already has duplicates.
-- ============================================================

-- ── 1. Remove existing duplicate T2202 rows ────────────────────────────────
-- Keeps the most recently created row per (profile_id, tax_year, issuer_name, boxA).
-- Only affects rows where both discriminators are present (matches the index WHERE).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        profile_id,
        coalesce(tax_year, 2025),
        lower(trim(issuer_name)),
        (boxes->>'boxA')
      ORDER BY created_at DESC NULLS LAST
    ) AS rn
  FROM public.tax_slips
  WHERE slip_type = 'T2202'
    AND issuer_name IS NOT NULL
    AND issuer_name <> ''
    AND boxes->>'boxA' IS NOT NULL
)
DELETE FROM public.tax_slips
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ── 2. Create logical-dedup index ─────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_slips_t2202_logical_dedup
  ON public.tax_slips (
    profile_id,
    coalesce(tax_year, 2025),
    lower(trim(issuer_name)),
    (boxes->>'boxA')
  )
  WHERE slip_type = 'T2202'
    AND issuer_name IS NOT NULL
    AND issuer_name <> ''
    AND boxes->>'boxA' IS NOT NULL;
