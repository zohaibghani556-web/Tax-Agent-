# Current State

This document records the verified production state for TaxAgent.ai through Stage 6D1. It is intended to keep Claude Code, Codex, and any future AI worker aligned before making changes.

## Live In Production

- `slip_extractions` exists on live Supabase and receives OCR rows.
- `slip_corrections` exists on live Supabase with RLS and foreign keys.
- `tax_slips` links to `slip_extractions` through `file_hash` and `source_extraction_id`.
- `tax_returns` exists live and persists provenance records.
- A verified `tax_returns` row exists:
  - `tax_year = 2025`
  - `engine_mode = slips`
  - `engine_version = 1.0.0`
  - `provenance_count = 23`
- The T2202 duplicate issue is fixed and smoke-tested.
- T2202 Box A, Box B, and Box C mapping is fixed.
- `tax-data.ts` with the `profile_id` path is the production canonical persistence path.
- Stage 6C is complete: `tax_calculations`, `deductions_credits`, `chat_messages`, `business_income`, and `rental_income` now have nullable `user_id` and `tax_year`, backfilled from `tax_profiles`, with validated `user_id` foreign keys.
- Stage 6F is complete: future writes populate denormalized `user_id` and `tax_year` where active write paths support them, and `tax_slips.user_id` was backfilled and verified.
- Stage 6D1 is complete: live smoke testing and the read-only go/no-go SQL summary passed for null ownership, `user_id` mismatch, `tax_year` mismatch, orphaned `profile_id`, unvalidated FKs, and dangling FKs.

## Stable

- Deterministic TypeScript tax engine owns all tax math.
- LLMs are limited to slip extraction, document classification, onboarding, and narrative assistance.
- `tax_returns` is the latest provenance-rich return per profile/year/mode.
- `tax_calculations` remains append-only calculation history.
- `tax_returns` and `tax_calculations` both remain in use.
- `tax_returns` and `tax_slips` are current reference models for profile-owned tables with denormalized `user_id`.
- `profile_id` is canonical for tax-year filing data.
- `user_id` remains useful and expected on key tables for RLS/query convenience.
- Stage 6F aligns future writes to populate denormalized `user_id` and `tax_year` where the schema supports them; `profile_id` remains canonical.

## Pre-Production Or Not Production-Safe

- `slip-store.ts` is not production-safe yet.
- CRA XSD schemas exist, but they are not wired into active extraction or validation.
- Stage 6D2 `NOT NULL` constraint planning is not applied yet.
- `business_income` and `rental_income` exist and have aligned ownership columns, but no active UI/API write path has been found.

## Intentionally Postponed

- Do not switch production persistence to `slip-store.ts`.
- Do not add new slip types.
- Do not add T5018.
- Do not wire CRA XSD schemas into active extraction/validation yet.
- Do not make `tax_slips` `user_id`-primary.
- Do not replace `tax_calculations` with `tax_returns`.
- Do not run production SQL automatically.
- Do not add Stage 6D2 `NOT NULL` constraints until the Stage 6D2 plan is reviewed and the user manually approves SQL.
- Do not change `tax_slips` RLS or consolidate to user_id-only RLS as part of Stage 6D2.

## Tax Truth Boundaries

- Never let AI do tax math.
- Never cite tax rules from model memory.
- CRA/ITA/cited constants and the rules database must be the source of tax truth.
- Any migration must be reviewed before execution.
- Production SQL is manually approved and run by the user.
