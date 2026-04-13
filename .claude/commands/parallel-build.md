# Parallel Build

Build multiple independent tax engine modules simultaneously using sub-agents, then integrate and verify.

## What this does (in plain English)
Instead of building Module A, then Module B, then Module C one by one — this spawns separate workers that each build one module at the same time. When they're all done, run the full test suite together to catch any integration issues.

## Steps:

1. **Parse the module list** from $ARGUMENTS
   - Each module should be independent (no module depends on another being built in this same run)
   - If modules depend on each other, order them and build sequentially instead

2. **Spawn one sub-agent per module** using the Agent tool (run all in parallel):
   Each sub-agent gets this exact instruction:
   > "Build the [MODULE_NAME] module for TaxAgent.ai. Follow all CLAUDE.md conventions:
   > 1. Read constants.ts, types.ts, and related modules first
   > 2. Implement the module with full TypeScript strict mode, roundCRA() on all monetary values
   > 3. Write a test file alongside it with minimum 10 test cases
   > 4. Run `npx tsc --noEmit` and fix all type errors
   > 5. Run `npm run test:run` and fix all failures (never change expected values)
   > 6. Report back: file paths created, test count, pass/fail status, any issues"

3. **Wait for all sub-agents to finish**, then:
   - Run the FULL test suite: `npm run test:run`
   - Run type-check: `npx tsc --noEmit`
   - Fix any cross-module integration errors (import issues, type conflicts)

4. **Commit all modules together**:
   - One commit per module OR one combined commit — use judgement based on how related they are
   - `git push origin main`

5. **Report**:
   - Which modules were built
   - Total test count (before and after)
   - Any modules that had issues

## Modules to build in parallel:
$ARGUMENTS
