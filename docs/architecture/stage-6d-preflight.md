# Stage 6D Preflight

This is a read-only audit for deciding whether Stage 6D should proceed. No SQL has been applied by this report.

## Current Readiness Summary

Stage 6D can proceed only as a split, conservative hardening stage. The data shape is close enough for `NOT NULL` prechecks, but RLS consolidation should not be bundled with constraints.

Verified project context:

- Stage 6C is complete live: `tax_calculations`, `deductions_credits`, `chat_messages`, `business_income`, and `rental_income` have nullable `user_id` and `tax_year`, were backfilled from `tax_profiles`, and have validated `user_id` foreign keys.
- Stage 6F is complete live: future writes populate denormalized ownership fields in active `tax-data.ts` paths.
- `tax_slips.user_id` was separately backfilled manually and verified.
- `profile_id` remains canonical for tax-year filing data.
- `user_id` and `tax_year` are denormalized convenience fields for RLS/query performance and should not replace `profile_id` as the ownership model.
- Existing join-based RLS remains safe because it resolves ownership through `profile_id -> tax_profiles.user_id`.

Local code audit:

- Active production persistence is still `src/lib/supabase/tax-data.ts`.
- `upsertSlips()` writes `user_id`, `profile_id`, and `tax_year` to `tax_slips`.
- `saveCalculationResult()` writes `user_id`, `profile_id`, and `tax_year` to `tax_calculations`.
- `saveMessage()` writes `user_id`, `profile_id`, and resolved `profile.taxYear` to `chat_messages`.
- `upsertDeductions()` writes `user_id`, `profile_id`, and `tax_year` to `deductions_credits`.
- `saveTaxReturn()` already writes `user_id`, `profile_id`, and `tax_year` to `tax_returns`, whose migration already declares those fields `NOT NULL`.
- No active `tax-data.ts` write path was found for `business_income` or `rental_income`.
- `slip_extractions` and `slip_corrections` are user-owned extraction tables and already have `user_id NOT NULL`; they are not profile-owned Stage 6D targets.

## Safe Candidates For NOT NULL

These are safe candidates if the live SQL checks below return zero nulls, zero mismatches, and validated constraints.

| Table | Candidate columns | Readiness | Notes |
| --- | --- | --- | --- |
| `tax_slips` | `profile_id`, `user_id`, `tax_year` | Likely safe after live checks | Future writes now include `user_id`; manual backfill reportedly cleared existing nulls. Keep `profile_id` canonical. |
| `tax_calculations` | `profile_id`, `user_id`, `tax_year` | Likely safe after live checks | Active writes include all three fields. Append-only history means constraint failure would block calculation history writes. |
| `chat_messages` | `profile_id`, `user_id`, `tax_year` | Likely safe after live checks | Active writes include all three fields. Verify `saveMessage()` deployed version derives `tax_year` from profile context. |
| `deductions_credits` | `profile_id`, `user_id`, `tax_year` | Conditionally safe | Active writes include all three fields, but row count has been low/zero. Need an actual write smoke test or live row checks immediately before constraints. |
| `business_income` | `profile_id`, `user_id`, `tax_year` | Conditionally safe | No active write path found. Empty table makes constraints easy to apply, but future code must populate these fields before inserts. |
| `rental_income` | `profile_id`, `user_id`, `tax_year` | Conditionally safe | No active write path found. Empty table makes constraints easy to apply, but future code must populate these fields before inserts. |

## Not Safe Candidates Yet

| Table | Reason |
| --- | --- |
| `tax_returns` | Already uses `user_id NOT NULL`, `profile_id NOT NULL`, and `tax_year NOT NULL`; no Stage 6D `NOT NULL` work needed. |
| `slip_extractions` | Correctly `user_id`-owned before profile linkage; do not force `profile_id` or `tax_year` into this table. |
| `slip_corrections` | Correctly `user_id + extraction_id` owned; do not force `profile_id` or `tax_year` into this table. |
| Any user-owned or reference table outside the profile-owned set | Out of Stage 6D scope. |

RLS consolidation is not safe to combine with `NOT NULL`. It should be treated as a separate later stage because the current join-based RLS is safer than direct `user_id`-only RLS for detecting malformed rows.

## Live Read-Only SQL Checks

Run these on live Supabase immediately before any Stage 6D implementation.

### Column Nullability And Shape

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
    'tax_returns',
    'deductions_credits',
    'chat_messages',
    'business_income',
    'rental_income',
    'slip_extractions',
    'slip_corrections'
  )
  and column_name in ('id', 'profile_id', 'user_id', 'tax_year', 'extraction_id')
order by table_name, ordinal_position;
```

### Null Counts For Stage 6D Candidate Columns

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
select 'deductions_credits',
  count(*),
  count(*) filter (where profile_id is null),
  count(*) filter (where user_id is null),
  count(*) filter (where tax_year is null)
from public.deductions_credits
union all
select 'chat_messages',
  count(*),
  count(*) filter (where profile_id is null),
  count(*) filter (where user_id is null),
  count(*) filter (where tax_year is null)
from public.chat_messages
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

### Parent Profile Integrity

```sql
select
  count(*) as total_profiles,
  count(*) filter (where user_id is null) as null_user_id,
  count(*) filter (where tax_year is null) as null_tax_year
from public.tax_profiles;
```

### Orphaned Profile Rows

```sql
select 'tax_slips' as table_name, count(*) as orphaned_rows
from public.tax_slips t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'tax_calculations', count(*)
from public.tax_calculations t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'deductions_credits', count(*)
from public.deductions_credits t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'chat_messages', count(*)
from public.chat_messages t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'business_income', count(*)
from public.business_income t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
union all
select 'rental_income', count(*)
from public.rental_income t
left join public.tax_profiles p on p.id = t.profile_id
where t.profile_id is not null and p.id is null
order by table_name;
```

### Denormalized Value Mismatches

```sql
select 'tax_slips' as table_name,
  count(*) filter (where t.user_id is distinct from p.user_id) as mismatched_user_id,
  count(*) filter (where t.tax_year is distinct from p.tax_year) as mismatched_tax_year
from public.tax_slips t
join public.tax_profiles p on p.id = t.profile_id
union all
select 'tax_calculations',
  count(*) filter (where t.user_id is distinct from p.user_id),
  count(*) filter (where t.tax_year is distinct from p.tax_year)
from public.tax_calculations t
join public.tax_profiles p on p.id = t.profile_id
union all
select 'deductions_credits',
  count(*) filter (where t.user_id is distinct from p.user_id),
  count(*) filter (where t.tax_year is distinct from p.tax_year)
from public.deductions_credits t
join public.tax_profiles p on p.id = t.profile_id
union all
select 'chat_messages',
  count(*) filter (where t.user_id is distinct from p.user_id),
  count(*) filter (where t.tax_year is distinct from p.tax_year)
from public.chat_messages t
join public.tax_profiles p on p.id = t.profile_id
union all
select 'business_income',
  count(*) filter (where t.user_id is distinct from p.user_id),
  count(*) filter (where t.tax_year is distinct from p.tax_year)
from public.business_income t
join public.tax_profiles p on p.id = t.profile_id
union all
select 'rental_income',
  count(*) filter (where t.user_id is distinct from p.user_id),
  count(*) filter (where t.tax_year is distinct from p.tax_year)
from public.rental_income t
join public.tax_profiles p on p.id = t.profile_id
order by table_name;
```

### Foreign Key Validation

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
  'public.deductions_credits'::regclass,
  'public.chat_messages'::regclass,
  'public.business_income'::regclass,
  'public.rental_income'::regclass,
  'public.tax_returns'::regclass,
  'public.slip_extractions'::regclass,
  'public.slip_corrections'::regclass
)
  and contype = 'f'
order by table_name::text, conname;
```

### RLS Policy Inventory

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
    'tax_returns',
    'deductions_credits',
    'chat_messages',
    'business_income',
    'rental_income',
    'slip_extractions',
    'slip_corrections'
  )
order by tablename, policyname, cmd;
```

### RLS Enabled Check

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
    'tax_returns',
    'deductions_credits',
    'chat_messages',
    'business_income',
    'rental_income',
    'slip_extractions',
    'slip_corrections'
  )
order by c.relname;
```

### Recent Write Monitoring

Run this after a fresh smoke test that creates/updates slips, messages, deductions, and calculations.

```sql
select 'tax_slips' as table_name,
  max(created_at) as latest_created_at,
  count(*) filter (where user_id is null or tax_year is null or profile_id is null) as recent_bad_rows
from public.tax_slips
where created_at > now() - interval '1 day'
union all
select 'tax_calculations',
  max(calculated_at),
  count(*) filter (where user_id is null or tax_year is null or profile_id is null)
from public.tax_calculations
where calculated_at > now() - interval '1 day'
union all
select 'chat_messages',
  max(created_at),
  count(*) filter (where user_id is null or tax_year is null or profile_id is null)
from public.chat_messages
where created_at > now() - interval '1 day'
union all
select 'deductions_credits',
  max(updated_at),
  count(*) filter (where user_id is null or tax_year is null or profile_id is null)
from public.deductions_credits
where updated_at > now() - interval '1 day';
```

If `deductions_credits.updated_at` does not exist on live, replace that branch with a table-wide null count.

## Risks Of Adding NOT NULL Constraints

- A missed legacy write path would turn a silent nullable write into a hard runtime failure.
- `chat_messages` currently defaults to the 2025 active profile if no tax year is passed; this is acceptable for the current product but should be verified before multi-year chat support.
- `business_income` and `rental_income` have no active write path in `tax-data.ts`; constraints are safe for empty tables but future features must populate `user_id` and `tax_year`.
- `tax_slips` is the highest-risk profile-owned table because it has multiple historical paths, OCR lineage fields, dedup indexes, and a non-production `slip-store.ts` path still present in the repo.
- `ALTER TABLE ... SET NOT NULL` can take locks. With current low row counts this is likely trivial, but it should still be done during a quiet period after backup confirmation.
- Free-tier Supabase backup status should be rechecked before any irreversible constraint work, even though `SET NOT NULL` is reversible.

## Risks Of Changing RLS

- Direct `user_id`-only RLS is not equivalent to join-based RLS. If a malformed row has `user_id` for one account and `profile_id` for another, direct RLS could expose or allow mutation of a row whose canonical filing context belongs elsewhere.
- Join-based RLS reinforces the canonical model because `profile_id` remains the ownership source for tax-year filing data.
- Replacing policies can create brief access outages if a policy is dropped before its replacement is correct.
- `tax_returns` already uses direct `user_id` RLS. Before consolidating other tables, decide whether the final pattern should be direct `user_id`, join-based `profile_id`, or a stricter combined policy requiring both `auth.uid() = user_id` and a matching `tax_profiles` row.
- Local migrations include historical/unified-store policy text for `tax_slips`; live policy inventory must be checked before assuming the current policy set.
- RLS policy behavior is harder to rollback safely than `NOT NULL` because it changes user-visible access immediately.

## Recommended Split

Do not do all Stage 6D topics in one migration. Split Stage 6D as follows.

### Stage 6D1: Monitoring And Final Read-Only Prechecks

- Run all live SQL checks in this document.
- Perform a smoke test that writes a slip, calculation, chat message, and deductions row.
- Re-run recent write monitoring.
- Confirm no nulls, no mismatches, no orphaned profiles, and validated FKs.
- Confirm Supabase backup status before schema hardening.

### Stage 6D2: NOT NULL Only

- Add `NOT NULL` constraints only for columns whose prechecks are clean.
- Keep existing RLS unchanged.
- Keep `profile_id` canonical.
- Do not add T5018, do not switch to `slip-store.ts`, and do not wire CRA XSD schemas.
- Prefer separate statements per table so a failure identifies the exact table.

Recommended initial candidate set if checks pass:

- `tax_slips.profile_id`, `tax_slips.user_id`, `tax_slips.tax_year`
- `tax_calculations.profile_id`, `tax_calculations.user_id`, `tax_calculations.tax_year`
- `chat_messages.profile_id`, `chat_messages.user_id`, `chat_messages.tax_year`
- `deductions_credits.profile_id`, `deductions_credits.user_id`, `deductions_credits.tax_year`

Conditionally include `business_income` and `rental_income` only if live checks show their schemas are aligned and there is agreement that future insert code must supply these fields before those features become active.

### Stage 6D3: RLS Review Or Consolidation

- Delay RLS changes until after Stage 6D2 has run cleanly and enough monitoring confirms no malformed denormalized rows.
- Prefer no RLS change unless there is a measured performance or maintainability reason.
- If consolidation is still desired, use a combined policy pattern rather than direct `user_id` only:

```sql
auth.uid() = user_id
and exists (
  select 1
  from public.tax_profiles p
  where p.id = <table>.profile_id
    and p.user_id = auth.uid()
)
```

This keeps `profile_id` canonical while allowing direct `user_id` indexing to help query paths.

## Rollback Strategy

### For NOT NULL Constraints

- Rollback is straightforward:

```sql
alter table public.<table_name>
  alter column user_id drop not null,
  alter column tax_year drop not null;
```

- If `profile_id NOT NULL` is newly added and must be rolled back:

```sql
alter table public.<table_name>
  alter column profile_id drop not null;
```

- Do not delete or rewrite data as part of rollback.
- Keep backfilled values in place; dropping `NOT NULL` only restores insert tolerance.

### For Indexes Or Additional Constraints

- New non-unique indexes can be dropped by name with `drop index concurrently if exists <index_name>;` if they cause planning or write overhead.
- New foreign keys can be dropped with `alter table public.<table_name> drop constraint if exists <constraint_name>;`.
- Do not drop existing validated Stage 6C/6F foreign keys unless a specific production incident requires it.

### For RLS Changes

- Capture existing policies from `pg_policies` before changing anything.
- Rollback should recreate the current join-based owner policies exactly.
- Do not rely only on migration rollback text; store the live `pg_policies` output with the deployment notes.
- Test read/write access as at least two separate users after any RLS policy rollback.

## Go/No-Go Criteria

### Go For Stage 6D1

- Go now. Stage 6D1 is read-only monitoring and should be the next step.

### Go For Stage 6D2

Proceed with `NOT NULL` only if all are true:

- Live null-count query returns zero nulls for every candidate column.
- Orphaned profile query returns zero for every candidate table.
- Denormalized mismatch query returns zero for every candidate table.
- Relevant `user_id` foreign keys are present and validated.
- Recent write monitoring after smoke tests returns zero bad rows.
- `tax_slips` smoke test confirms new rows have `profile_id`, `user_id`, and `tax_year`.
- Backup status is acceptable for the deployment window.
- Human review approves the exact migration before execution.

### No-Go For Stage 6D2

Do not add `NOT NULL` constraints if any are true:

- Any candidate table has null `profile_id`, `user_id`, or `tax_year`.
- Any candidate table has mismatched `user_id` or `tax_year` versus `tax_profiles`.
- Any candidate table has orphaned `profile_id`.
- Any active write smoke test creates a null or mismatched denormalized field.
- The migration tries to change RLS at the same time.
- The migration tries to switch to `slip-store.ts`, add T5018, wire CRA XSD schemas, or change tax math.

### Go For Stage 6D3

Proceed with RLS review only after Stage 6D2 has been live and monitored. RLS consolidation should be optional, separate, and justified by a concrete benefit. The default recommendation is to keep join-based RLS because it best matches the canonical ownership model.

## Recommendation

Stage 6D should proceed, but only split into sub-stages.

- Recommended next step: Stage 6D1 read-only monitoring and final prechecks.
- Recommended implementation after clean checks: Stage 6D2 `NOT NULL` constraints only.
- Recommended delay: Stage 6D3 RLS consolidation. Do not change RLS in the same stage as constraints.

The strongest immediate candidate tables are `tax_slips`, `tax_calculations`, and `chat_messages` because they have live row verification and active write-path smoke coverage. `deductions_credits` is likely safe after a write smoke test. `business_income` and `rental_income` should be treated as conditional because they are low/zero-row tables with no active write path found.
