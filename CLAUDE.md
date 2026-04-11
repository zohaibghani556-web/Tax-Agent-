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
- Claude API (claude-sonnet-4-20250514) for chat + OCR
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
