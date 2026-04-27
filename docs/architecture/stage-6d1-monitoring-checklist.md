# Stage 6D1 Monitoring Checklist

Stage 6D1 is the read-only monitoring and go/no-go checkpoint before any Stage 6D2 `NOT NULL` constraints. It does not change schema, RLS, application code, tax logic, or production data.

## Purpose

Stage 6D1 verifies that the Stage 6C and Stage 6F ownership alignment is stable in live usage:

- Existing profile-owned rows have non-null `profile_id`, `user_id`, and `tax_year`.
- Denormalized `user_id` and `tax_year` still match `tax_profiles`.
- No candidate rows are orphaned from `tax_profiles`.
- Foreign keys are present and validated.
- Current RLS policy shape is captured before any future hardening.
- Fresh app writes continue to populate the aligned fields.

## What Stage 6D1 Does Not Do

- Does not change app code.
- Does not create migrations.
- Does not apply SQL.
- Does not change RLS.
- Does not add `NOT NULL` constraints.
- Does not switch to `slip-store.ts`.
- Does not add T5018.
- Does not wire CRA XSD schemas.
- Does not change tax math.
- Does not run production commands automatically.

## Read-Only Supabase SQL Checks

Run these manually in live Supabase. They are read-only `select` queries.

### 1. Candidate Column Shape

```sql
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'tax_profiles',
    'tax_slips',
    'tax_calculations',
    'chat_messages',
    'deductions_credits',
    'business_income',
    'rental_income'
  )
  and column_name in ('id', 'profile_id', 'user_id', 'tax_year')
order by table_name, ordinal_position;
```

Expected Stage 6D1 result:

- Candidate tables have `profile_id`, `user_id`, and `tax_year`.
- `user_id` and `tax_year` may still be nullable before Stage 6D2.

### 2. Null Counts By Candidate Table

```sql
select 'tax_slips' as table_name,
  count(*) as row_count,
  count(*) filter (where profile_id is null) as null_profile_id,
  count(*) filter (where user_id is null) as null_user_id,
  count(*) filter (where tax_year is null) as null_tax_year
from public.tax_slips
union all
select 'tax_calculations',
  count(*),
  count(*) filter (where profile_id is null),
  count(*) filter (where user_id is null),
  count(*) filter (where tax_year is null)
from public.tax_calculations
union all
select 'chat_messages',
  count(*),
  count(*) filter (where profile_id is null),
  count(*) filter (where user_id is null),
  count(*) filter (where tax_year is null)
from public.chat_messages
union all
select 'deductions_credits',
  count(*),
  count(*) filter (where profile_id is null),
  count(*) filter (where user_id is null),
  count(*) filter (where tax_year is null)
from public.deductions_credits
union all
select 'business_income',
  count(*),
  count(*) filter (where profile_id is null),
  count(*) filter (where user_id is null),
  count(*) filter (where tax_year is null)
from public.business_income
union all
select 'rental_income',
  count(*),
  count(*) filter (where profile_id is null),
  count(*) filter (where user_id is null),
  count(*) filter (where tax_year is null)
from public.rental_income
order by table_name;
```

Expected Stage 6D1 result:

- All `null_profile_id`, `null_user_id`, and `null_tax_year` counts are `0` for any table considered for Stage 6D2.

### 3. Parent Profile Integrity

```sql
select
  count(*) as total_profiles,
  count(*) filter (where id is null) as null_id,
  count(*) filter (where user_id is null) as null_user_id,
  count(*) filter (where tax_year is null) as null_tax_year
from public.tax_profiles;
```

Expected Stage 6D1 result:

- `null_user_id = 0`.
- `null_tax_year = 0`.

### 4. Mismatched `user_id` Versus `tax_profiles.user_id`

```sql
select 'tax_slips' as table_name,
  count(*) as mismatched_user_id
from public.tax_slips t
join public.tax_profiles p on p.id = t.profile_id
where t.user_id is distinct from p.user_id
union all
select 'tax_calculations',
  count(*)
from public.tax_calculations t
join public.tax_profiles p on p.id = t.profile_id
where t.user_id is distinct from p.user_id
union all
select 'chat_messages',
  count(*)
from public.chat_messages t
join public.tax_profiles p on p.id = t.profile_id
where t.user_id is distinct from p.user_id
union all
select 'deductions_credits',
  count(*)
from public.deductions_credits t
join public.tax_profiles p on p.id = t.profile_id
where t.user_id is distinct from p.user_id
union all
select 'business_income',
  count(*)
from public.business_income t
join public.tax_profiles p on p.id = t.profile_id
where t.user_id is distinct from p.user_id
union all
select 'rental_income',
  count(*)
from public.rental_income t
join public.tax_profiles p on p.id = t.profile_id
where t.user_id is distinct from p.user_id
order by table_name;
```

Expected Stage 6D1 result:

- Every `mismatched_user_id` count is `0`.

### 5. Mismatched `tax_year` Versus `tax_profiles.tax_year`

```sql
select 'tax_slips' as table_name,
  count(*) as mismatched_tax_year
from public.tax_slips t
join public.tax_profiles p on p.id = t.profile_id
where t.tax_year is distinct from p.tax_year
union all
select 'tax_calculations',
  count(*)
from public.tax_calculations t
join public.tax_profiles p on p.id = t.profile_id
where t.tax_year is distinct from p.tax_year
union all
select 'chat_messages',
  count(*)
from public.chat_messages t
join public.tax_profiles p on p.id = t.profile_id
where t.tax_year is distinct from p.tax_year
union all
select 'deductions_credits',
  count(*)
from public.deductions_credits t
join public.tax_profiles p on p.id = t.profile_id
where t.tax_year is distinct from p.tax_year
union all
select 'business_income',
  count(*)
from public.business_income t
join public.tax_profiles p on p.id = t.profile_id
where t.tax_year is distinct from p.tax_year
union all
select 'rental_income',
  count(*)
from public.rental_income t
join public.tax_profiles p on p.id = t.profile_id
where t.tax_year is distinct from p.tax_year
order by table_name;
```

Expected Stage 6D1 result:

- Every `mismatched_tax_year` count is `0`.

### 6. Orphaned `profile_id` Rows

```sql
select 'tax_slips' as table_name,
  count(*) as orphaned_profile_id_rows
from public.tax_slips t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'tax_calculations',
  count(*)
from public.tax_calculations t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'chat_messages',
  count(*)
from public.chat_messages t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'deductions_credits',
  count(*)
from public.deductions_credits t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'business_income',
  count(*)
from public.business_income t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'rental_income',
  count(*)
from public.rental_income t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
order by table_name;
```

Expected Stage 6D1 result:

- Every `orphaned_profile_id_rows` count is `0`.

### 7. Unvalidated Foreign Keys

```sql
select
  conrelid::regclass as table_name,
  conname,
  contype,
  convalidated
from pg_constraint
where conrelid in (
  'public.tax_slips'::regclass,
  'public.tax_calculations'::regclass,
  'public.chat_messages'::regclass,
  'public.deductions_credits'::regclass,
  'public.business_income'::regclass,
  'public.rental_income'::regclass,
  'public.tax_returns'::regclass,
  'public.slip_extractions'::regclass,
  'public.slip_corrections'::regclass
)
  and contype = 'f'
  and convalidated = false
order by table_name::text, conname;
```

Expected Stage 6D1 result:

- Query returns zero rows.

### 8. Full Foreign Key Inventory

```sql
select
  conrelid::regclass as table_name,
  conname,
  contype,
  convalidated
from pg_constraint
where conrelid in (
  'public.tax_slips'::regclass,
  'public.tax_calculations'::regclass,
  'public.chat_messages'::regclass,
  'public.deductions_credits'::regclass,
  'public.business_income'::regclass,
  'public.rental_income'::regclass,
  'public.tax_returns'::regclass,
  'public.slip_extractions'::regclass,
  'public.slip_corrections'::regclass
)
  and contype = 'f'
order by table_name::text, conname;
```

Use this output as deployment evidence before Stage 6D2.

### 9. Current RLS Policy Inventory

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'tax_profiles',
    'tax_slips',
    'tax_calculations',
    'chat_messages',
    'deductions_credits',
    'business_income',
    'rental_income',
    'tax_returns',
    'slip_extractions',
    'slip_corrections'
  )
order by tablename, policyname, cmd;
```

Expected Stage 6D1 result:

- Inventory is captured for review.
- Stage 6D1 does not require RLS policy changes.

### 10. RLS Enabled Check

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'tax_profiles',
    'tax_slips',
    'tax_calculations',
    'chat_messages',
    'deductions_credits',
    'business_income',
    'rental_income',
    'tax_returns',
    'slip_extractions',
    'slip_corrections'
  )
order by c.relname;
```

Expected Stage 6D1 result:

- RLS remains enabled on user/profile data tables.
- Do not change RLS as part of Stage 6D1 or Stage 6D2.

### 11. Recent Write Monitoring After Smoke Tests

Run this after the manual smoke tests below.

```sql
select 'tax_slips' as table_name,
  max(created_at) as latest_write_at,
  count(*) filter (where profile_id is null or user_id is null or tax_year is null) as recent_bad_rows
from public.tax_slips
where created_at > now() - interval '1 day'
union all
select 'tax_calculations',
  max(calculated_at),
  count(*) filter (where profile_id is null or user_id is null or tax_year is null)
from public.tax_calculations
where calculated_at > now() - interval '1 day'
union all
select 'chat_messages',
  max(created_at),
  count(*) filter (where profile_id is null or user_id is null or tax_year is null)
from public.chat_messages
where created_at > now() - interval '1 day'
union all
select 'deductions_credits',
  max(updated_at),
  count(*) filter (where profile_id is null or user_id is null or tax_year is null)
from public.deductions_credits
where updated_at > now() - interval '1 day'
order by table_name;
```

If `deductions_credits.updated_at` does not exist on live, use this replacement branch for deductions:

```sql
select 'deductions_credits' as table_name,
  null::timestamptz as latest_write_at,
  count(*) filter (where profile_id is null or user_id is null or tax_year is null) as recent_bad_rows
from public.deductions_credits;
```

Expected Stage 6D1 result:

- `recent_bad_rows = 0` for every smoke-tested table.

## Manual Smoke Tests

Perform these with normal application flows, then run the recent write monitoring query.

| Smoke test | Expected database effect | Required result |
| --- | --- | --- |
| Save or upload a slip | New or replaced `tax_slips` rows for the active `profile_id` | New rows have non-null `profile_id`, `user_id`, and `tax_year`; OCR rows keep `file_hash` and `source_extraction_id` behavior unchanged. |
| Run calculation | New `tax_calculations` row | New row has non-null `profile_id`, `user_id`, and `tax_year`; calculation output is unchanged. |
| Save chat message, if applicable | New `chat_messages` row | New row has non-null `profile_id`, `user_id`, and resolved profile `tax_year`; no hardcoded year regression. |
| Save or update deductions, if applicable | Upserted `deductions_credits` row | Row has non-null `profile_id`, `user_id`, and `tax_year`; `profile_id` remains the conflict key. |

For `business_income` and `rental_income`, no active production write path was identified in the Stage 6D preflight. If a smoke path exists before Stage 6D2, test it and require non-null `profile_id`, `user_id`, and `tax_year`. If no active write path exists, treat these tables as conditional Stage 6D2 candidates.

## Recommended Monitoring Period

Minimum recommendation before Stage 6D2:

- Run the full Stage 6D1 SQL checklist once at the start of monitoring.
- Complete the manual smoke tests.
- Run recent write monitoring immediately after smoke tests.
- Monitor for at least 3 calendar days or one meaningful live usage cycle, whichever is longer.
- Run the full Stage 6D1 SQL checklist again immediately before drafting or approving Stage 6D2.

Conservative recommendation:

- Use 5 to 7 calendar days if production traffic is low or if deductions/chat/slip paths are not exercised during the first monitoring window.
- Do not count a quiet period with no new writes as proof that write paths are safe. At least one controlled smoke test is required.

## Stage 6D2 Go/No-Go Criteria

Proceed to draft Stage 6D2 `NOT NULL` constraints only if all are true:

- Null-count query returns zero nulls for every proposed table/column.
- Mismatched `user_id` query returns zero for every proposed table.
- Mismatched `tax_year` query returns zero for every proposed table.
- Orphaned `profile_id` query returns zero for every proposed table.
- Unvalidated FK query returns zero rows.
- Recent write monitoring after smoke tests returns zero bad rows.
- `tax_slips` smoke test confirms new rows have `profile_id`, `user_id`, and `tax_year`.
- `tax_calculations` smoke test confirms new rows have `profile_id`, `user_id`, and `tax_year`.
- `chat_messages` smoke test confirms new rows use the profile tax year.
- `deductions_credits` is either smoke-tested successfully or excluded from the first Stage 6D2 batch.
- `business_income` and `rental_income` are either confirmed empty/inactive and intentionally included, or excluded until active writes exist.
- Backup status is acceptable for the deployment window.
- A human reviews and approves the exact Stage 6D2 migration before execution.
- Stage 6D2 migration contains `NOT NULL` constraints only and does not change RLS.

## Reasons To Delay Stage 6D2

Delay Stage 6D2 if any are true:

- Any candidate table has null `profile_id`, `user_id`, or `tax_year`.
- Any candidate table has `user_id` or `tax_year` mismatches against `tax_profiles`.
- Any candidate table has orphaned `profile_id` rows.
- Any FK needed for ownership integrity is missing or unvalidated.
- Any smoke test creates a null or mismatched denormalized field.
- The deployed app version is uncertain.
- Backup status is not acceptable.
- The proposed migration includes RLS changes, tax math changes, `slip-store.ts`, T5018, CRA XSD wiring, or unrelated features.
- `business_income` or `rental_income` are included without agreement on their inactive/empty status and future write requirements.

## Why RLS Consolidation Remains Delayed

RLS consolidation should remain delayed because:

- `profile_id` is canonical for tax-year filing data.
- Join-based RLS through `tax_profiles` reinforces the canonical ownership model.
- Direct `user_id`-only RLS is not equivalent to profile ownership. A malformed row with one user's `user_id` and another user's `profile_id` could become visible under direct user-only policies.
- RLS policy changes affect user-visible access immediately and are harder to roll back safely than nullable constraints.
- Stage 6D2 should be a narrow constraint hardening stage. Mixing RLS with constraints makes failure diagnosis harder.

If RLS consolidation is later justified, prefer a combined policy pattern that requires both direct `user_id` match and matching profile ownership:

```sql
auth.uid() = user_id
and exists (
  select 1
  from public.tax_profiles p
  where p.id = <table>.profile_id
    and p.user_id = auth.uid()
)
```

## Rollback Plan If Stage 6D2 Later Fails

For a failed or problematic `NOT NULL` constraint:

```sql
alter table public.<table_name>
  alter column <column_name> drop not null;
```

For a table-level rollback of Stage 6D2 constraints:

```sql
alter table public.<table_name>
  alter column profile_id drop not null,
  alter column user_id drop not null,
  alter column tax_year drop not null;
```

Rollback principles:

- Do not delete or rewrite data during rollback.
- Keep backfilled values in place.
- Roll back only the failing table/column when possible.
- Re-run null, mismatch, orphan, and recent-write monitoring after rollback.
- Do not change RLS as part of constraint rollback.

## Candidate Columns For Future Stage 6D2 `NOT NULL`

| Table | Candidate columns | Stage 6D2 readiness | Notes |
| --- | --- | --- | --- |
| `tax_slips` | `profile_id`, `user_id`, `tax_year` | Strong candidate after monitoring | Stage 6F writes and backfill are verified by latest context; still smoke-test because slip paths are historically complex. |
| `tax_calculations` | `profile_id`, `user_id`, `tax_year` | Strong candidate after monitoring | Active writes include all fields; append-only history means failures would block history writes. |
| `chat_messages` | `profile_id`, `user_id`, `tax_year` | Strong candidate after monitoring | Verify actual profile tax year is written and no hardcoded year path remains deployed. |
| `deductions_credits` | `profile_id`, `user_id`, `tax_year` | Candidate after successful smoke test | Low/zero row count means live write smoke coverage matters. |
| `business_income` | `profile_id`, `user_id`, `tax_year` | Conditional candidate | Include only if empty/inactive status is confirmed and future writes will populate all fields. |
| `rental_income` | `profile_id`, `user_id`, `tax_year` | Conditional candidate | Include only if empty/inactive status is confirmed and future writes will populate all fields. |

## Recommendation

Stage 6D2 should not proceed immediately after a single historical smoke test. It should proceed only after Stage 6D1 monitoring confirms clean current data, clean smoke-test writes, validated FKs, captured RLS inventory, and acceptable backup status.

Recommended next action:

- Run the Stage 6D1 SQL checklist manually on live Supabase.
- Perform the manual smoke tests.
- Re-run recent write monitoring.
- Monitor for at least 3 calendar days or one meaningful live usage cycle.
- Draft Stage 6D2 `NOT NULL` migration only after the final prechecks are still clean.
