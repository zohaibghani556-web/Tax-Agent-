# TaxAgent.ai Agent Context

This repository is a Canadian T1 filing platform for individual taxpayers. Codex and other AI workers must treat it as tax software: correctness, provenance, data safety, and human review matter more than speed.

## Project Overview

TaxAgent.ai helps Canadians prepare and understand Ontario T1 returns. It supports slip OCR, manual slip entry, deterministic tax calculation, provenance-rich return storage, and AI-assisted onboarding/document extraction.

The product is not CRA NETFILE-certified yet. It guides users through filing and produces explanations; it does not submit returns to CRA.

## Tech Stack

- Next.js 15 App Router, React 19, TypeScript strict mode.
- Tailwind CSS, shadcn/ui, Framer Motion, Sonner.
- Supabase PostgreSQL/Auth/Storage/RLS in `ca-central-1`.
- Deterministic TypeScript tax engine under `src/lib/tax-engine/` and `src/lib/taxEngine.ts`.
- Anthropic Claude for slip extraction, document classification, onboarding, filing guide narrative, and recovery analysis only.
- Vitest for tests.

## Current Production Path

- Stage 2 is complete: `slip_extractions` exists on live Supabase and receives OCR rows.
- Stage 3 is complete: `slip_corrections` exists on live Supabase with RLS and foreign keys.
- Stage 4 is complete: `tax_slips` links to `slip_extractions` through `file_hash` and `source_extraction_id`.
- Stage 5 is complete: `tax_returns` exists live and persists provenance records.
- A verified `tax_returns` row exists with `tax_year = 2025`, `engine_mode = slips`, `engine_version = 1.0.0`, and `provenance_count = 23`.
- The T2202 duplicate issue is fixed and smoke-tested.
- T2202 Box A, Box B, and Box C mapping is fixed.
- `src/lib/supabase/tax-data.ts` with the `profile_id` path is production canonical.
- `slip-store.ts` is not production-safe yet and must not replace `tax-data.ts`.
- CRA XSD schemas exist, but they are not wired into active extraction or validation.
- `tax_calculations` and `tax_returns` both remain in use:
  - `tax_calculations` is append-only calculation history.
  - `tax_returns` is the latest provenance-rich return per profile/year/mode.

## Canonical Data Ownership Model

- `auth.users` is account identity.
- `tax_profiles` is the canonical filing context.
- `profile_id` is canonical for tax-year filing data.
- `user_id` is denormalized on key tables for RLS/query convenience.
- `tax_slips`, `tax_returns`, `tax_calculations`, and `deductions_credits` should belong to `profile_id` long-term.
- Key profile-owned tables should also include `user_id`.
- `slip_extractions` is `user_id`-owned because OCR happens before final review/profile linkage.
- `slip_corrections` is `user_id` plus `extraction_id` owned.
- `tax_returns` and `tax_slips` are the current reference models.

## Tax And AI Rules

- The deterministic TypeScript tax engine does all tax math.
- LLMs are only for slip extraction, document classification, and onboarding.
- Never let AI do tax math.
- Never cite tax rules from model memory.
- CRA/ITA/cited constants and the rules database must be the source of tax truth.
- Do not hardcode tax constants in business logic.

## Safe Tasks

- Documentation updates.
- Read-only code review and architecture audit.
- Test execution and type/lint/build checks.
- Drafting migration SQL for human review, without applying it.
- Planning backfills/preflight checks.
- Producing issue lists, risk assessments, and handoff notes.

## Unsafe Tasks Without Explicit Human Approval

- Changing app code during documentation-only tasks.
- Creating or applying migrations.
- Applying SQL to production Supabase.
- Running destructive SQL.
- Switching production code to `slip-store.ts`.
- Adding new slip types.
- Wiring CRA XSD schemas into active extraction/validation.
- Making `tax_slips` `user_id`-primary.
- Adding T5018.
- Replacing `tax_calculations` with `tax_returns`.
- Running production commands.

## Commands To Run

Use these checks before committing implementation changes. For documentation-only changes, run the subset requested by the task owner.

```bash
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```

## Git Workflow

- Work on `ai-worker/*` branches.
- Never edit `main` directly unless instructed.
- Keep changes scoped to the assigned task.
- Commit only after the requested tests/checks pass.
- Do not revert unrelated user or worker changes.

## Supabase Safety

- Do not apply SQL automatically.
- Output SQL for human review.
- Never run destructive SQL without explicit approval.
- Never modify production Supabase unless the user explicitly instructs it.
- Any migration must be reviewed before it is run.
- The user manually approves and runs production SQL.

## Current Next Stage

- Current task: Stage 6A docs.
- Next: Stage 6C preflight/backfill planning for `user_id` on profile-owned tables.
- Do not do Stage 6D `NOT NULL` constraints until backups and prechecks pass.
