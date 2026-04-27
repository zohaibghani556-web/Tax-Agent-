# AI Worker Handoff

This project can use Claude Code and Codex together, but they must coordinate through branches, human review, and explicit task boundaries. TaxAgent.ai is tax software; safe collaboration matters more than autonomous speed.

## Roles

- Claude Code can remain the main implementation worker.
- Codex can act as a second-opinion, documentation, audit, and review worker.
- Codex may implement only when explicitly assigned implementation work.
- Human review is the gate before changes move back to `main`.

## Branch Coordination

- AI workers should work on `ai-worker/*` branches.
- Codex must stay on its assigned `ai-worker/*` branch when implementing.
- Do not edit `main` directly unless explicitly instructed.
- Bring changes back to `main` only after human review.
- Do not revert unrelated changes from the user, Claude Code, or another AI worker.

## Safe Codex Work

- Documentation and architecture notes.
- Read-only audits of current code and migrations.
- Second-opinion review of proposed changes.
- Test, typecheck, lint, and build verification.
- Drafting SQL or migration plans for human review without applying them.
- Backfill/preflight planning.

## Unsafe Codex Work Without Explicit Approval

- Applying SQL locally or to production Supabase.
- Creating migrations during documentation-only tasks.
- Running production commands.
- Switching active persistence to `slip-store.ts`.
- Adding slip types or T5018.
- Wiring CRA XSD schemas into active extraction/validation.
- Replacing `tax_calculations` with `tax_returns`.
- Making `tax_slips` `user_id`-primary.
- Adding Stage 6D `NOT NULL` constraints before backups/prechecks pass.

## Implementation Rules

- Deterministic TypeScript does all tax math.
- LLMs are only for slip extraction, document classification, and onboarding.
- Never let AI do tax math.
- Never cite tax rules from model memory.
- CRA/ITA/cited constants/rules database must be the tax truth source.
- Any tax-rule change must preserve dual-engine parity between `src/lib/tax-engine/engine.ts` and `src/lib/taxEngine.ts`.

## Handoff Procedure

1. Confirm the branch and task scope.
2. Check current worktree status before editing.
3. Keep changes constrained to the assigned files.
4. Run only the commands requested or appropriate for the task.
5. Review `git diff` before reporting completion.
6. Commit only after requested checks pass.
7. Leave production SQL as reviewable output unless the user explicitly approves execution.

## Stage Context

- Current stage: Stage 6A docs.
- Next stage: Stage 6C preflight/backfill planning for `user_id` on profile-owned tables.
- Later stage: Stage 6D `NOT NULL` constraints, only after backups and prechecks pass.
