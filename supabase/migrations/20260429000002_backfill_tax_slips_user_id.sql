-- ============================================================
-- Stage 6F follow-up draft: backfill tax_slips.user_id
--
-- Purpose:
--   Existing tax_slips rows may have profile_id and tax_year populated
--   while user_id remains null. This draft backfills user_id from the
--   canonical tax_profiles owner through profile_id.
--
-- Scope:
--   - Backfill public.tax_slips.user_id from public.tax_profiles.user_id.
--   - Keep profile_id as the canonical ownership path.
--
-- Explicitly NOT included:
--   - No NOT NULL constraints.
--   - No RLS policy changes.
--   - No file_hash/source_extraction_id changes.
--   - No tax_year changes.
-- ============================================================

UPDATE public.tax_slips s
SET user_id = p.user_id
FROM public.tax_profiles p
WHERE p.id = s.profile_id
  AND s.user_id IS DISTINCT FROM p.user_id;

-- Verification after manual application:
--
-- SELECT
--   count(*) AS total_slips,
--   count(*) FILTER (WHERE profile_id IS NULL) AS null_profile_id,
--   count(*) FILTER (WHERE user_id IS NULL) AS null_user_id,
--   count(*) FILTER (WHERE tax_year IS NULL) AS null_tax_year
-- FROM public.tax_slips;
--
-- SELECT count(*) AS mismatched_user_id
-- FROM public.tax_slips s
-- JOIN public.tax_profiles p ON p.id = s.profile_id
-- WHERE s.user_id IS DISTINCT FROM p.user_id;
