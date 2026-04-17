# TaxAgent.ai — Canadian Tax Filing Platform

## Project Summary
AI-powered Ontario tax filing assistant. Conversational AI (Claude API) for assessment, deterministic TypeScript engine for all calculations. Next.js 14 App Router + Supabase + Vercel.

## Architecture Rules
- ALL tax math is deterministic TypeScript — ZERO AI for calculations
- AI (Claude API sonnet) is ONLY for: conversational assessment, OCR slip reading, filing guide generation
- Tax year: 2025 (filing 2026). Blended federal lowest rate = 14.5% (15% Jan-Jun, 14% Jul-Dec)
- Ontario only. No other provinces.
- All year-specific values live in `src/lib/tax-engine/constants.ts` — single source of truth
- SIN must be encrypted (Supabase Vault). Never stored in plaintext. Display masked (***-***-XXX).

## Tech Stack
- Next.js 14+ App Router, TypeScript strict mode
- Supabase: PostgreSQL, Auth (MFA), Storage, Vault, RLS on ALL tables
- Vercel deployment
- Claude API (claude-sonnet-4-6) for chat + OCR
- Tailwind CSS + shadcn/ui
- Canadian data residency (Supabase ca-central-1)

## Code Style
- Strict TypeScript. No `any`. All tax interfaces fully typed.
- All monetary values: `number` (not string), rounded to 2 decimal places using `Math.round(x * 100) / 100`
- File naming: kebab-case (`capital-gains.ts`)
- Functions: camelCase. Interfaces: PascalCase.
- Every calculation function must have unit tests.
- Use `Decimal.js` or careful rounding — CRA rounds to nearest cent.
- Comments: explain the WHY (CRA rule, ITA section), not the WHAT.

## Tax Engine Conventions (enforce always — do not skip)
- ALWAYS wrap final monetary results in `roundCRA()` — floating-point accumulation causes off-by-one-cent test failures. Round intermediate values at every addition boundary, not just at the end.
- Never fix a test by changing the expected value to match a wrong calculation. Fix the calculation.
- Every new module ships with a corresponding `.test.ts` file in the same directory, committed together.
- After building any new module, run the FULL test suite (`npm run test:run`), not just the new tests, before declaring done. Catch regressions immediately.
- Run `npx tsc --noEmit` before committing to catch TypeScript errors before they hit the build.

## Dual-Engine Parity (critical — enforced on every tax feature)
There are TWO tax engines that must stay in sync:
- `src/lib/tax-engine/engine.ts` — slip-based engine (T4/T5/etc. typed inputs)
- `src/lib/taxEngine.ts` — flat-input engine (plain number inputs, used by WhatIf/optimizer)

**Any tax rule, credit, deduction, or clawback added to one engine MUST be added to the other.** Before marking any tax feature complete, explicitly check both files. Omitting a rule from one engine (e.g. OAS clawback, capital gains rate) produces silently wrong results for users of that path.

## Constants Are the Only Source of Truth
- NEVER hardcode a dollar amount, rate, or threshold in business logic. Every tax value belongs in `constants.ts` and must be imported.
- If you see a magic number in engine code (e.g. `2759`, `90997`, `44325`), move it to `constants.ts` immediately.
- When adding a new tax year constant, cite the CRA source in a comment (e.g. `// CRA T1 2025, Schedule 1`). Never copy-paste a prior-year value without re-verifying it against CRA's current-year publications.
- Key 2025 values already verified: Federal BPA $16,129 | Ontario BPA $12,747 | Medical threshold $2,759 | RRSP max $32,490 | Capital gains inclusion 50% flat (two-tier deferred to 2026).

## CRA Classification — Check Before Coding
Before implementing any new deduction or credit, answer these two questions:
1. **Is it a deduction from income** (reduces net income, appears above line 23600 on the T1)? → implement in `calculateNetIncome()` or `calculateTaxableIncome()`.
2. **Is it a tax credit** (reduces tax payable, appears below line 30000 on Schedule 1 or ON428)? → implement in the credits aggregator, NOT in income functions.

Getting this wrong causes a double benefit. Specific traps confirmed in this codebase:
- Student loan interest → credit only (ITA s.118.62, line 31900). Do NOT deduct from net income.
- Union dues → income deduction (ITA s.8(1)(i), line 21200). Not a credit.

## Ontario vs Federal Credits — Always Check ON428
Ontario Taxation Act credits differ from federal. Before adding any credit to `calculateOntarioNonRefundableCredits()`:
- Verify the credit line exists on **ON428** (not just Schedule 1).
- Canada Employment Amount (line 31260) is federal-only — ON428 has no equivalent.
- Ontario eliminated the tuition credit after the 2017 tax year.
- Ontario has no Home Buyers' Amount, no Digital News Credit, no Volunteer credits.

## Security Checklist (enforce on every feature)
- [ ] RLS policy on any new table
- [ ] Input validation server-side (not just client)
- [ ] No PII in URL parameters or logs
- [ ] API routes require auth (Supabase JWT)
- [ ] Every new client `fetch()` to a protected API route uses `addCsrfHeader()` from `@/lib/csrf-client`
- [ ] Every new API route calls `validateCsrfToken(req)` and returns 403 on failure

## Key File Structure
```
src/lib/tax-engine/constants.ts    — ALL 2025 rates/thresholds
src/lib/tax-engine/federal/        — Federal tax calculations
src/lib/tax-engine/ontario/        — Ontario tax calculations
src/lib/tax-engine/engine.ts       — Main orchestrator
src/lib/tax-engine/types.ts        — All interfaces
src/lib/slips/                     — Tax slip parsers (T4,T5,T5008,T3,T4A,T2202)
src/lib/ai/                        — Claude API system prompt + chat logic
src/app/api/                       — API routes
tests/                             — Unit + integration tests
```

## Testing
- Use Vitest. Test file next to source: `brackets.ts` → `brackets.test.ts`
- Minimum test scenarios per calculation: simple income, edge of bracket, multi-bracket, zero income
- Cross-validate against CRA's own examples where available

## Security Checklist (enforce on every feature)
- [ ] RLS policy on any new table
- [ ] Input validation server-side (not just client)
- [ ] No PII in URL parameters or logs
- [ ] API routes require auth (Supabase JWT)
