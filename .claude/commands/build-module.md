# Build Module

Build the requested tax engine module following all TaxAgent conventions.

## Steps (always follow in order):

1. **Read relevant existing files first** — check constants.ts, types.ts, and any related modules for existing patterns and interfaces before writing any code.

2. **Implement the module** in the correct directory following kebab-case naming. Apply `roundCRA()` to ALL monetary values. No `any`. Full TypeScript strict mode.

3. **Write the test file** alongside the module (same directory). Minimum test cases:
   - Zero income / null input
   - Simple single-bracket case
   - Edge of bracket / threshold boundary
   - Multi-bracket / complex case
   - CRA-documented example if one exists
   - At least 10 test cases total for any new calculator

4. **Run `npx tsc --noEmit`** — fix all type errors before running tests.

5. **Run `npm run test:run`** (the FULL suite, not just new tests). Fix any failures — never change expected values to match a wrong calculation, fix the calculation.

6. **Commit** — `git add` only the new/changed files, write a clear commit message explaining the CRA rule implemented, push to main.

## Module to build:
$ARGUMENTS
