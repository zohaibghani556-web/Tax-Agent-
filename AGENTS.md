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

## Two-Agent Workflow

This project uses two AI agents with distinct roles:

**Codex** (OpenAI, on `ai-worker/*` branches):
- Heavy implementation, drafting, and documentation work.
- Creates new modules, writes tests, drafts migration SQL, produces planning docs.
- Never commits to `main`. Always works on `ai-worker/*` branches.
- Never applies SQL to production. Drafts only — labels as "DRAFT" and requires human approval.

**Claude Code** (Anthropic, on `main`):
- Reviewer, tester, QA gate, merger, prompt author.
- Reviews Codex's work, runs pre-merge checklist, merges to `main`, pushes.
- Creates PRs, summarizes changes, checks safety, helps with continuation prompts.
- Never writes implementation code on `ai-worker/*` branches.

**Handoff protocol:**
- After Codex finishes a task, it should produce a summary of what changed, what was tested, and what needs human review.
- Claude reviews, runs checks, and merges only after human approval.
- Use `docs/operations/ai-worker-continuation-template.md` to transfer context between agents and sessions.

## Git Workflow

- Codex works on `ai-worker/*` branches. Claude Code works on `main`.
- Never edit `main` directly unless instructed.
- Keep changes scoped to the assigned task.
- Commit only after the requested tests/checks pass.
- Do not revert unrelated user or worker changes.
- When code changes are involved, always run `npx tsc --noEmit`, `npm run test:run`, and `npm run lint` before committing. Report pass/fail counts.
- For docs-only changes, checks are optional unless the task owner requests them.

## Supabase Safety

- Do not apply SQL automatically.
- Output SQL for human review. Label draft migrations clearly as "DRAFT — requires human approval".
- Never run destructive SQL without explicit approval.
- Never modify production Supabase unless the user explicitly instructs it.
- Any migration must be reviewed before it is run.
- The user manually approves and runs production SQL in the Supabase SQL Editor.
- Read-only monitoring SQL (SELECT only) may be drafted and committed to `docs/` but never auto-executed against production.

## Session Continuity

When ending a session or handing off to the other agent:
1. Summarize what was completed (files changed, tests added/passing).
2. List what remains and exact next steps with file paths.
3. Note any decisions made or deferred.
4. If a continuation prompt is needed, use the template at `docs/operations/ai-worker-continuation-template.md`.

## Current Next Stage

- Stage 6D1 is complete: path coverage matrix and read-only SQL monitoring bundle merged to `main`. All 6 go/no-go checks passed.
- Next: Stage 6D2 NOT NULL constraint planning (docs/planning only — no migration without human approval).
- Do not apply NOT NULL constraints until Stage 6D1 monitoring passes and the team decides on `business_income`/`rental_income` scope.
