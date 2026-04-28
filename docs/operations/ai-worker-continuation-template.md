# AI Worker Continuation Template

> Copy this template when handing off between Codex and Claude Code sessions,
> or when a session ends mid-task. Fill in the sections below.

---

## Session Info

- **Date**: YYYY-MM-DD
- **Agent**: Codex / Claude Code
- **Branch**: ai-worker/...
- **Task**: (one-line description)

## What Was Completed

- [ ] (file or action completed)
- [ ] (file or action completed)

**Tests**: X/Y passing after this session.

## What Remains

- [ ] (next step — include file path if known)
- [ ] (next step)

## Key Decisions Made

- (decision and reasoning)

## Key Decisions Deferred

- (decision deferred and why)

## Observed Issues (non-blocking)

- (issue observed during this session that is not part of the current task)

## Files Changed

```
(paste output of git diff --stat or git diff --name-only)
```

## Checks Run

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS / FAIL / skipped |
| `npm run test:run` | X/Y passing / skipped |
| `npm run lint` | PASS / FAIL / skipped |
| `npm run build` | PASS / FAIL / skipped |

## Next Agent Prompt

> Paste the exact prompt the next agent (Codex or Claude) should receive.
> Include: files to read, rules, task, and expected output.

```
(prompt here)
```

## Safe to Commit?

- [ ] Yes — human has reviewed
- [ ] No — needs review first (explain what to check)
