# Stage 6D2 NOT NULL Plan

Stage 6D2 should be a narrow schema-hardening stage. Its only goal is to convert verified profile-owned ownership columns from nullable to `NOT NULL` after Stage 6D1 monitoring passed.

This plan is documentation only. It is not a migration and must not be applied automatically.

## Recommendation

Proceed with Stage 6D2 only as a split, `NOT NULL`-only stage:

- Stage 6D2A: add `NOT NULL` to active, smoke-tested profile-owned write paths.
- Stage 6D2B: decide separately whether to constrain inactive `business_income` and `rental_income`.
- Stage 6D3 or later: RLS consolidation, if still desired.

Do not bundle RLS changes, `slip-store.ts`, new slip types, CRA XSD wiring, tax math changes, or product-quality fixes into Stage 6D2.

## Candidate Columns

| Table | Candidate columns | Recommendation | Reason |
| --- | --- | --- | --- |
| `tax_slips` | `profile_id`, `user_id`, `tax_year` | Include in 6D2A | Active OCR/manual write paths populate all three; Stage 6D1 passed. Keep `profile_id` canonical. |
| `tax_calculations` | `profile_id`, `user_id`, `tax_year` | Include in 6D2A | Active calculation history writes populate all three; Stage 6D1 passed. |
| `chat_messages` | `profile_id`, `user_id`, `tax_year` | Include in 6D2A | Active onboarding writes populate all three; Stage 6D1 passed. |
| `deductions_credits` | `profile_id`, `user_id`, `tax_year` | Include in 6D2A if final precheck still passes | Active write path exists, but only fires when onboarding emits structured deductions data. Nullable fields are no longer needed if precheck remains clean. |
| `business_income` | `profile_id`, `user_id`, `tax_year` | Split to 6D2B | Table exists and Stage 6C aligned it, but no active UI/API write path was found. |
| `rental_income` | `profile_id`, `user_id`, `tax_year` | Split to 6D2B | Same as `business_income`. |
| `tax_returns` | `profile_id`, `user_id`, `tax_year` | No action | Already `NOT NULL` in the `tax_returns` migration. |
| `tax_profiles` | `user_id`, `tax_year` | No action in 6D2 | Anchor table already passed integrity checks; not part of this hardening slice unless a separate schema audit says otherwise. |
| `slip_extractions` | `user_id` | No action | Correctly user-owned before profile linkage. Do not add `profile_id`/`tax_year`. |
| `slip_corrections` | `user_id`, `extraction_id` | No action | Correctly user plus extraction owned. Do not add `profile_id`/`tax_year`. |

## Why Split Business And Rental Income

`business_income` and `rental_income` are schema-aligned but not actively written by the app. Constraining empty or low-row inactive tables is technically low-risk, but it has not been proven through user-facing smoke tests.

Recommended decision:

- 6D2A should focus on active, tested production paths.
- 6D2B can either add `NOT NULL` to `business_income` and `rental_income` after one final live row check, or defer until real write paths are built and tested.

This avoids overstating coverage while keeping the long-term ownership model intact.

## Required Final Precheck

Run the corrected Stage 6D1 read-only SQL bundle immediately before drafting or applying Stage 6D2 SQL. Stage 6D2 must not proceed unless every final go/no-go row returns `PASS`:

- `A_null_ownership`
- `B_user_id_mismatch`
- `C_tax_year_mismatch`
- `D_orphaned_profile_id`
- `E_unvalidated_foreign_keys`
- `F_dangling_foreign_keys`

Also confirm a current backup strategy before applying production DDL.

## Draft SQL Shape

This is planning SQL only. Do not place this in `supabase/migrations` or run it until the human approves a reviewed migration.

```sql
-- DRAFT ONLY - Stage 6D2A NOT NULL constraints.
-- Requires final read-only precheck PASS immediately before execution.

ALTER TABLE public.tax_slips
  ALTER COLUMN profile_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN tax_year SET NOT NULL;

ALTER TABLE public.tax_calculations
  ALTER COLUMN profile_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN tax_year SET NOT NULL;

ALTER TABLE public.chat_messages
  ALTER COLUMN profile_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN tax_year SET NOT NULL;

ALTER TABLE public.deductions_credits
  ALTER COLUMN profile_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN tax_year SET NOT NULL;
```

Optional 6D2B, only if explicitly approved:

```sql
-- DRAFT ONLY - Optional Stage 6D2B inactive-table constraints.

ALTER TABLE public.business_income
  ALTER COLUMN profile_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN tax_year SET NOT NULL;

ALTER TABLE public.rental_income
  ALTER COLUMN profile_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN tax_year SET NOT NULL;
```

## RLS Consolidation Remains Delayed

Do not simplify RLS in Stage 6D2.

Current join-based RLS is safer for the canonical model because ownership is resolved through `profile_id -> tax_profiles.user_id`. Direct `user_id`-only RLS is not equivalent: a malformed row could have a correct `user_id` but an incorrect `profile_id`, which would weaken the canonical filing-context boundary.

RLS consolidation should only be considered after:

- `NOT NULL` constraints are live and stable.
- A separate RLS matrix is written.
- Cross-profile mismatch tests exist.
- The team explicitly decides whether `user_id` is only a convenience field or also a policy boundary.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Missed legacy write path writes null ownership fields. | Runtime inserts fail after constraints. | Final precheck plus targeted app smoke test before applying SQL. |
| `deductions_credits` path is conditional. | Constraint could reveal an untested onboarding variant. | Include only if final precheck passes; monitor after deployment. |
| Table lock during `ALTER TABLE`. | Brief write interruption. | Apply during quiet period; current row counts are low. |
| Product bugs get confused with schema readiness. | Team may over-scope Stage 6D2. | Keep OCR, duplicates, performance, UX, and tax correctness in separate backlog. |
| RLS changes are bundled accidentally. | Possible access-control regression. | Make 6D2 migration `NOT NULL` only. |

## Rollback Plan

If Stage 6D2 causes application write failures, rollback is straightforward but still requires human-approved SQL:

```sql
-- DRAFT ONLY - rollback shape.

ALTER TABLE public.tax_slips
  ALTER COLUMN profile_id DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN tax_year DROP NOT NULL;

ALTER TABLE public.tax_calculations
  ALTER COLUMN profile_id DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN tax_year DROP NOT NULL;

ALTER TABLE public.chat_messages
  ALTER COLUMN profile_id DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN tax_year DROP NOT NULL;

ALTER TABLE public.deductions_credits
  ALTER COLUMN profile_id DROP NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN tax_year DROP NOT NULL;
```

If 6D2B is applied, rollback must also drop `NOT NULL` on the same columns in `business_income` and `rental_income`.

Rollback only restores permissive nullability. It does not fix the write path that attempted to write nulls; that must be diagnosed separately.

## Go/No-Go Criteria

Go for 6D2A only if all are true:

- Corrected Stage 6D1 SQL bundle final summary is all `PASS`.
- Latest smoke test includes `tax_slips`, `tax_calculations`, and `chat_messages`.
- `deductions_credits` either has a clean live row or the team accepts constraining an empty/low-row table with a verified write helper.
- No RLS changes are included.
- A human has reviewed the draft migration SQL.
- The user manually approves and applies production SQL.

No-go if any are true:

- Any final go/no-go check returns `FAIL`.
- A target table has null ownership fields, mismatches, orphaned profiles, unvalidated FKs, or dangling FKs.
- The migration includes RLS policy changes.
- The team wants to fix OCR, duplicates, performance, UI, or tax math in the same stage.

## Next Step

Draft a reviewed Stage 6D2A migration only after Claude reviews this plan. Do not apply it automatically.
