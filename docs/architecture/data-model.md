# Data Model

This document codifies TaxAgent.ai's canonical ownership model and the current/target table state. Use it before changing persistence, RLS, migrations, or Supabase access helpers.

## Canonical Ownership Model

- `auth.users` is account identity.
- `tax_profiles` is the canonical filing context.
- `profile_id` is canonical for tax-year filing data.
- `user_id` is denormalized on key tables for RLS/query convenience.
- Profile-owned tables should belong to `profile_id` long-term and also include `user_id` where useful for RLS/query paths.
- OCR extraction is different: it starts before final review/profile linkage, so extraction tables are `user_id`-owned first.

## Table-By-Table Ownership

| Table | Current owner | Target owner | Notes |
| --- | --- | --- | --- |
| `auth.users` | Account identity | Account identity | Supabase Auth source of truth for login/account identity. |
| `tax_profiles` | `user_id` | `user_id` | Canonical filing context for a taxpayer/tax year workflow. |
| `slip_extractions` | `user_id` | `user_id` | OCR happens before final review/profile linkage. Live and receiving OCR rows. |
| `slip_corrections` | `user_id` + `extraction_id` | `user_id` + `extraction_id` | Live with RLS and foreign keys. |
| `tax_slips` | `profile_id` with extraction linkage | `profile_id` plus denormalized `user_id` | Current reference model. Links to `slip_extractions` via `file_hash` and `source_extraction_id`. Do not make `user_id` primary. |
| `tax_returns` | `profile_id` plus provenance | `profile_id` plus denormalized `user_id` | Current reference model. Latest provenance-rich return per profile/year/mode. |
| `tax_calculations` | Calculation history | `profile_id` plus denormalized `user_id` | Append-only calculation history. Do not replace with `tax_returns`. |
| `deductions_credits` | Filing data | `profile_id` plus denormalized `user_id` | Should belong to filing context long-term. |
| `chat_messages` | Onboarding conversation data | `profile_id` plus denormalized `user_id` | Stage 6C/6F aligned. Chat remains tied to the active filing context. |
| `business_income` | Filing data | `profile_id` plus denormalized `user_id` | Table exists and Stage 6C aligned it, but no active UI/API write path has been found. |
| `rental_income` | Filing data | `profile_id` plus denormalized `user_id` | Table exists and Stage 6C aligned it, but no active UI/API write path has been found. |

## Current State

- `tax-data.ts` with the `profile_id` path is production canonical.
- `slip-store.ts` is not production-safe yet.
- `slip_extractions` is live and receives OCR rows.
- `slip_corrections` is live with RLS and foreign keys.
- `tax_slips` links to OCR extraction rows through `file_hash` and `source_extraction_id`.
- `tax_returns` is live and persists provenance records.
- Verified `tax_returns` production row:
  - `tax_year = 2025`
  - `engine_mode = slips`
  - `engine_version = 1.0.0`
  - `provenance_count = 23`
- `tax_calculations` and `tax_returns` both remain active:
  - `tax_calculations` is append-only calculation history.
  - `tax_returns` is the latest provenance-rich return per profile/year/mode.
- Stage 6C is complete: `tax_calculations`, `deductions_credits`, `chat_messages`, `business_income`, and `rental_income` have nullable `user_id` and `tax_year`, backfilled from `tax_profiles`, with validated `user_id` foreign keys.
- Stage 6F aligns future write paths so new rows populate denormalized `user_id` and `tax_year` where the schema supports them.
- `tax_slips.user_id` was separately backfilled and verified after Stage 6F.
- Stage 6D1 read-only monitoring passed its final go/no-go SQL summary.

## Target State

- Profile-owned tax-year data consistently uses `profile_id` as the canonical owner.
- Key profile-owned tables also include `user_id` for RLS/query convenience.
- `tax_slips`, `tax_returns`, `tax_calculations`, and `deductions_credits` align around `profile_id`.
- Extraction remains separate:
  - `slip_extractions` stays `user_id`-owned.
  - `slip_corrections` stays `user_id` plus `extraction_id` owned.
- Stage 6C completed additive alignment for profile-owned tables.
- Stage 6D2 `NOT NULL` constraints should wait until the Stage 6D2 plan is reviewed and the user manually approves SQL.
- RLS consolidation, if any, should happen after additive backfills, app write-path updates, and verification that no new null `user_id`/`tax_year` rows are being created.

## What Not To Change Yet

- Do not switch to `slip-store.ts`.
- Do not make `tax_slips` `user_id`-primary.
- Do not add T5018.
- Do not add new slip types.
- Do not wire CRA XSD schemas into active extraction/validation.
- Do not replace `tax_calculations` with `tax_returns`.
- Do not run production SQL automatically.
- Do not create migrations during documentation-only work.
- Do not apply Stage 6D2 `NOT NULL` constraints without reviewed SQL and human approval.
- Do not change `tax_slips` RLS or consolidate to user_id-only RLS as part of Stage 6D2.

## Supabase Safety

- Any migration must be reviewed first.
- Output SQL for human review instead of applying it.
- Production SQL is manually approved and run by the user.
- Never run destructive SQL without explicit approval.
