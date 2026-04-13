# Ship

Autonomously iterate until all tests pass and TypeScript is clean, then commit and push.

## What this does (in plain English)
Run tests → if anything fails, fix it → run again → keep going until everything is green → type-check → commit → push. No asking for confirmation mid-loop.

## Steps (run silently, no check-ins until done):

1. **Run the full test suite**: `npm run test:run`
   - If all pass → go to step 3
   - If any fail → go to step 2

2. **Fix failures autonomously**:
   - Read the failing test output carefully
   - Fix the CALCULATION, never change the expected value in the test to match wrong output
   - Apply `roundCRA()` to all monetary results — most failures are off-by-one-cent rounding
   - Re-run `npm run test:run`
   - Repeat until all tests pass (max 5 iterations — if still failing after 5, stop and explain)

3. **Type-check**: `npx tsc --noEmit`
   - If errors → fix them, re-run until clean
   - No `any` types. No ignoring errors.

4. **Commit**:
   - `git add` only files you actually changed
   - Write a commit message that explains the CRA rule or feature, not just "fix tests"
   - `git push origin main`

5. **Report**:
   - Total tests passing
   - Files changed
   - Commit hash

## Scope (what to ship):
$ARGUMENTS
