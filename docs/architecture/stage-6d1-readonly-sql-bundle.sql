-- ============================================================================
-- READ-ONLY MONITORING SCRIPT. DO NOT PLACE IN supabase/migrations. DO NOT MODIFY DATA.
--
-- Stage 6D1 - Ownership and integrity verification.
-- Run manually in the Supabase SQL Editor after app smoke tests.
-- Every executable statement below is read-only.
-- ============================================================================


-- ============================================================================
-- A. NULL OWNERSHIP CHECKS
-- Pass condition: null_profile_id, null_user_id, and null_tax_year are all 0.
-- ============================================================================

SELECT 'tax_slips' AS table_name,
       COUNT(*) FILTER (WHERE profile_id IS NULL) AS null_profile_id,
       COUNT(*) FILTER (WHERE user_id IS NULL) AS null_user_id,
       COUNT(*) FILTER (WHERE tax_year IS NULL) AS null_tax_year,
       COUNT(*) AS total_rows
FROM public.tax_slips
UNION ALL
SELECT 'tax_calculations',
       COUNT(*) FILTER (WHERE profile_id IS NULL),
       COUNT(*) FILTER (WHERE user_id IS NULL),
       COUNT(*) FILTER (WHERE tax_year IS NULL),
       COUNT(*)
FROM public.tax_calculations
UNION ALL
SELECT 'tax_returns',
       COUNT(*) FILTER (WHERE profile_id IS NULL),
       COUNT(*) FILTER (WHERE user_id IS NULL),
       COUNT(*) FILTER (WHERE tax_year IS NULL),
       COUNT(*)
FROM public.tax_returns
UNION ALL
SELECT 'chat_messages',
       COUNT(*) FILTER (WHERE profile_id IS NULL),
       COUNT(*) FILTER (WHERE user_id IS NULL),
       COUNT(*) FILTER (WHERE tax_year IS NULL),
       COUNT(*)
FROM public.chat_messages
UNION ALL
SELECT 'deductions_credits',
       COUNT(*) FILTER (WHERE profile_id IS NULL),
       COUNT(*) FILTER (WHERE user_id IS NULL),
       COUNT(*) FILTER (WHERE tax_year IS NULL),
       COUNT(*)
FROM public.deductions_credits
UNION ALL
SELECT 'business_income',
       COUNT(*) FILTER (WHERE profile_id IS NULL),
       COUNT(*) FILTER (WHERE user_id IS NULL),
       COUNT(*) FILTER (WHERE tax_year IS NULL),
       COUNT(*)
FROM public.business_income
UNION ALL
SELECT 'rental_income',
       COUNT(*) FILTER (WHERE profile_id IS NULL),
       COUNT(*) FILTER (WHERE user_id IS NULL),
       COUNT(*) FILTER (WHERE tax_year IS NULL),
       COUNT(*)
FROM public.rental_income
ORDER BY table_name;


-- ============================================================================
-- B. USER_ID MISMATCH CHECKS
-- Pass condition: mismatched_rows is 0 for every table.
-- ============================================================================

SELECT 'tax_slips' AS table_name, COUNT(*) AS mismatched_rows
FROM public.tax_slips t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.user_id IS DISTINCT FROM p.user_id
UNION ALL
SELECT 'tax_calculations', COUNT(*)
FROM public.tax_calculations t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.user_id IS DISTINCT FROM p.user_id
UNION ALL
SELECT 'tax_returns', COUNT(*)
FROM public.tax_returns t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.user_id IS DISTINCT FROM p.user_id
UNION ALL
SELECT 'chat_messages', COUNT(*)
FROM public.chat_messages t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.user_id IS DISTINCT FROM p.user_id
UNION ALL
SELECT 'deductions_credits', COUNT(*)
FROM public.deductions_credits t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.user_id IS DISTINCT FROM p.user_id
UNION ALL
SELECT 'business_income', COUNT(*)
FROM public.business_income t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.user_id IS DISTINCT FROM p.user_id
UNION ALL
SELECT 'rental_income', COUNT(*)
FROM public.rental_income t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.user_id IS DISTINCT FROM p.user_id
ORDER BY table_name;


-- ============================================================================
-- C. TAX_YEAR MISMATCH CHECKS
-- Pass condition: mismatched_rows is 0 for every table.
-- ============================================================================

SELECT 'tax_slips' AS table_name, COUNT(*) AS mismatched_rows
FROM public.tax_slips t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.tax_year IS DISTINCT FROM p.tax_year
UNION ALL
SELECT 'tax_calculations', COUNT(*)
FROM public.tax_calculations t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.tax_year IS DISTINCT FROM p.tax_year
UNION ALL
SELECT 'tax_returns', COUNT(*)
FROM public.tax_returns t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.tax_year IS DISTINCT FROM p.tax_year
UNION ALL
SELECT 'chat_messages', COUNT(*)
FROM public.chat_messages t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.tax_year IS DISTINCT FROM p.tax_year
UNION ALL
SELECT 'deductions_credits', COUNT(*)
FROM public.deductions_credits t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.tax_year IS DISTINCT FROM p.tax_year
UNION ALL
SELECT 'business_income', COUNT(*)
FROM public.business_income t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.tax_year IS DISTINCT FROM p.tax_year
UNION ALL
SELECT 'rental_income', COUNT(*)
FROM public.rental_income t
JOIN public.tax_profiles p ON t.profile_id = p.id
WHERE t.tax_year IS DISTINCT FROM p.tax_year
ORDER BY table_name;


-- ============================================================================
-- D. ORPHANED PROFILE_ID CHECKS
-- Pass condition: orphaned_rows is 0 for every table.
-- ============================================================================

SELECT 'tax_slips' AS table_name, COUNT(*) AS orphaned_rows
FROM public.tax_slips t
WHERE t.profile_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)
UNION ALL
SELECT 'tax_calculations', COUNT(*)
FROM public.tax_calculations t
WHERE t.profile_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)
UNION ALL
SELECT 'tax_returns', COUNT(*)
FROM public.tax_returns t
WHERE t.profile_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)
UNION ALL
SELECT 'chat_messages', COUNT(*)
FROM public.chat_messages t
WHERE t.profile_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)
UNION ALL
SELECT 'deductions_credits', COUNT(*)
FROM public.deductions_credits t
WHERE t.profile_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)
UNION ALL
SELECT 'business_income', COUNT(*)
FROM public.business_income t
WHERE t.profile_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)
UNION ALL
SELECT 'rental_income', COUNT(*)
FROM public.rental_income t
WHERE t.profile_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)
ORDER BY table_name;


-- ============================================================================
-- E. FK VALIDATION CHECKS
-- Pass condition: no unvalidated FK rows, no dangling FK rows.
-- ============================================================================

SELECT n.nspname AS schema_name,
       c.conrelid::regclass::text AS table_name,
       c.conname AS constraint_name,
       c.contype AS constraint_type,
       c.convalidated AS is_validated,
       pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname IN ('public', 'auth')
  AND c.contype = 'f'
  AND c.conrelid IN (
    'public.tax_profiles'::regclass,
    'public.tax_slips'::regclass,
    'public.tax_calculations'::regclass,
    'public.tax_returns'::regclass,
    'public.chat_messages'::regclass,
    'public.deductions_credits'::regclass,
    'public.business_income'::regclass,
    'public.rental_income'::regclass,
    'public.slip_extractions'::regclass,
    'public.slip_corrections'::regclass
  )
  AND c.convalidated = false
ORDER BY table_name, constraint_name;

SELECT 'tax_profiles_to_auth_users' AS fk_check, COUNT(*) AS dangling_fk_rows
FROM public.tax_profiles p
WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)
UNION ALL
SELECT 'tax_slips_to_tax_profiles', COUNT(*)
FROM public.tax_slips t
WHERE t.profile_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)
UNION ALL
SELECT 'tax_slips_to_auth_users', COUNT(*)
FROM public.tax_slips t
WHERE t.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id)
UNION ALL
SELECT 'tax_slips_to_slip_extractions', COUNT(*)
FROM public.tax_slips t
WHERE t.source_extraction_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.slip_extractions e WHERE e.id = t.source_extraction_id)
UNION ALL
SELECT 'slip_corrections_to_slip_extractions', COUNT(*)
FROM public.slip_corrections t
WHERE t.extraction_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.slip_extractions e WHERE e.id = t.extraction_id)
ORDER BY fk_check;


-- ============================================================================
-- F. RLS POLICY INVENTORY
-- Review only. This stage does not change policies.
-- ============================================================================

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'tax_profiles',
    'tax_slips',
    'tax_calculations',
    'tax_returns',
    'chat_messages',
    'deductions_credits',
    'business_income',
    'rental_income',
    'slip_extractions',
    'slip_corrections'
  )
ORDER BY tablename;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'tax_profiles',
    'tax_slips',
    'tax_calculations',
    'tax_returns',
    'chat_messages',
    'deductions_credits',
    'business_income',
    'rental_income',
    'slip_extractions',
    'slip_corrections'
  )
ORDER BY tablename, policyname;


-- ============================================================================
-- G. RECENT WRITE MONITORING
-- Review the most recent active writes plus inactive-table ownership snapshots.
-- ============================================================================

SELECT 'tax_slips' AS table_name, id, user_id, profile_id, tax_year, slip_type, source, created_at
FROM public.tax_slips
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

SELECT 'tax_calculations' AS table_name, id, user_id, profile_id, tax_year, calculated_at
FROM public.tax_calculations
WHERE calculated_at > NOW() - INTERVAL '24 hours'
ORDER BY calculated_at DESC
LIMIT 10;

SELECT 'tax_returns' AS table_name, id, user_id, profile_id, tax_year, engine_mode, updated_at
FROM public.tax_returns
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 10;

SELECT 'chat_messages' AS table_name, id, user_id, profile_id, tax_year, role,
       LENGTH(content) AS content_length, created_at
FROM public.chat_messages
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

SELECT 'deductions_credits' AS table_name, id, user_id, profile_id, tax_year, updated_at
FROM public.deductions_credits
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 10;

SELECT 'tax_profiles' AS table_name, id, user_id, tax_year, assessment_complete, updated_at
FROM public.tax_profiles
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC
LIMIT 10;

SELECT 'business_income' AS table_name,
       COUNT(*) AS total_rows,
       COUNT(*) FILTER (WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL) AS unsafe_rows
FROM public.business_income
UNION ALL
SELECT 'rental_income',
       COUNT(*),
       COUNT(*) FILTER (WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL)
FROM public.rental_income
ORDER BY table_name;


-- ============================================================================
-- H. TABLE ROW COUNTS
-- Snapshot only.
-- ============================================================================

SELECT 'tax_profiles' AS table_name, COUNT(*) AS row_count FROM public.tax_profiles
UNION ALL
SELECT 'tax_slips', COUNT(*) FROM public.tax_slips
UNION ALL
SELECT 'tax_calculations', COUNT(*) FROM public.tax_calculations
UNION ALL
SELECT 'tax_returns', COUNT(*) FROM public.tax_returns
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM public.chat_messages
UNION ALL
SELECT 'deductions_credits', COUNT(*) FROM public.deductions_credits
UNION ALL
SELECT 'business_income', COUNT(*) FROM public.business_income
UNION ALL
SELECT 'rental_income', COUNT(*) FROM public.rental_income
UNION ALL
SELECT 'slip_extractions', COUNT(*) FROM public.slip_extractions
UNION ALL
SELECT 'slip_corrections', COUNT(*) FROM public.slip_corrections
ORDER BY table_name;


-- ============================================================================
-- I. FINAL GO/NO-GO SUMMARY
-- Pass condition: every result is PASS.
-- ============================================================================

WITH checks AS (
  SELECT 'A_null_ownership' AS check_name,
         CASE WHEN (
           (SELECT COUNT(*) FROM public.tax_slips WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL) +
           (SELECT COUNT(*) FROM public.tax_calculations WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL) +
           (SELECT COUNT(*) FROM public.tax_returns WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL) +
           (SELECT COUNT(*) FROM public.chat_messages WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL) +
           (SELECT COUNT(*) FROM public.deductions_credits WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL) +
           (SELECT COUNT(*) FROM public.business_income WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL) +
           (SELECT COUNT(*) FROM public.rental_income WHERE profile_id IS NULL OR user_id IS NULL OR tax_year IS NULL)
         ) = 0 THEN 'PASS' ELSE 'FAIL' END AS result

  UNION ALL

  SELECT 'B_user_id_mismatch',
         CASE WHEN (
           (SELECT COUNT(*) FROM public.tax_slips t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.user_id IS DISTINCT FROM p.user_id) +
           (SELECT COUNT(*) FROM public.tax_calculations t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.user_id IS DISTINCT FROM p.user_id) +
           (SELECT COUNT(*) FROM public.tax_returns t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.user_id IS DISTINCT FROM p.user_id) +
           (SELECT COUNT(*) FROM public.chat_messages t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.user_id IS DISTINCT FROM p.user_id) +
           (SELECT COUNT(*) FROM public.deductions_credits t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.user_id IS DISTINCT FROM p.user_id) +
           (SELECT COUNT(*) FROM public.business_income t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.user_id IS DISTINCT FROM p.user_id) +
           (SELECT COUNT(*) FROM public.rental_income t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.user_id IS DISTINCT FROM p.user_id)
         ) = 0 THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'C_tax_year_mismatch',
         CASE WHEN (
           (SELECT COUNT(*) FROM public.tax_slips t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.tax_year IS DISTINCT FROM p.tax_year) +
           (SELECT COUNT(*) FROM public.tax_calculations t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.tax_year IS DISTINCT FROM p.tax_year) +
           (SELECT COUNT(*) FROM public.tax_returns t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.tax_year IS DISTINCT FROM p.tax_year) +
           (SELECT COUNT(*) FROM public.chat_messages t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.tax_year IS DISTINCT FROM p.tax_year) +
           (SELECT COUNT(*) FROM public.deductions_credits t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.tax_year IS DISTINCT FROM p.tax_year) +
           (SELECT COUNT(*) FROM public.business_income t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.tax_year IS DISTINCT FROM p.tax_year) +
           (SELECT COUNT(*) FROM public.rental_income t JOIN public.tax_profiles p ON t.profile_id = p.id WHERE t.tax_year IS DISTINCT FROM p.tax_year)
         ) = 0 THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'D_orphaned_profile_id',
         CASE WHEN (
           (SELECT COUNT(*) FROM public.tax_slips t WHERE t.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)) +
           (SELECT COUNT(*) FROM public.tax_calculations t WHERE t.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)) +
           (SELECT COUNT(*) FROM public.tax_returns t WHERE t.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)) +
           (SELECT COUNT(*) FROM public.chat_messages t WHERE t.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)) +
           (SELECT COUNT(*) FROM public.deductions_credits t WHERE t.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)) +
           (SELECT COUNT(*) FROM public.business_income t WHERE t.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)) +
           (SELECT COUNT(*) FROM public.rental_income t WHERE t.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id))
         ) = 0 THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'E_unvalidated_foreign_keys',
         CASE WHEN (
           SELECT COUNT(*)
           FROM pg_constraint c
           JOIN pg_namespace n ON n.oid = c.connamespace
           WHERE n.nspname IN ('public', 'auth')
             AND c.contype = 'f'
             AND c.conrelid IN (
               'public.tax_profiles'::regclass,
               'public.tax_slips'::regclass,
               'public.tax_calculations'::regclass,
               'public.tax_returns'::regclass,
               'public.chat_messages'::regclass,
               'public.deductions_credits'::regclass,
               'public.business_income'::regclass,
               'public.rental_income'::regclass,
               'public.slip_extractions'::regclass,
               'public.slip_corrections'::regclass
             )
             AND c.convalidated = false
         ) = 0 THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT 'F_dangling_foreign_keys',
         CASE WHEN (
           (SELECT COUNT(*) FROM public.tax_profiles p WHERE p.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)) +
           (SELECT COUNT(*) FROM public.tax_slips t WHERE t.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tax_profiles p WHERE p.id = t.profile_id)) +
           (SELECT COUNT(*) FROM public.tax_slips t WHERE t.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id)) +
           (SELECT COUNT(*) FROM public.tax_slips t WHERE t.source_extraction_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.slip_extractions e WHERE e.id = t.source_extraction_id)) +
           (SELECT COUNT(*) FROM public.slip_corrections t WHERE t.extraction_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.slip_extractions e WHERE e.id = t.extraction_id))
         ) = 0 THEN 'PASS' ELSE 'FAIL' END
)
SELECT check_name, result
FROM checks
ORDER BY check_name;
