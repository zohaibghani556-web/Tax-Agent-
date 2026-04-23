# TaxAgent.ai — Canadian T1 Filing Platform

## Mission
Help Canadians file their own T1 tax return accurately and confidently, without paying an accountant or fighting CRA's NETFILE portal.

## Target Customer
Canadians filing their own T1 return (not accountants, not businesses). Ontario residents primarily. People who find TurboTax confusing, H&R Block expensive, and CRA's NETFILE portal overwhelming. First-time filers, newcomers to Canada, employees with a side income, retirees managing their first RRIF withdrawal, and self-employed tradespeople who want to understand what they owe.

## Product Goals (launch before tax season 2027)
- Complete slip OCR and manual entry for all 14 supported slip types
- Accurate T1 calculation for every Ontario resident income profile
- AI-guided assessment that produces a complete tax picture via conversation
- Personalized filing guide (step-by-step, CRA line by line)
- NOA retroactive recovery scan for missed credits on prior years
- PIPEDA-compliant data handling throughout
- Subscription gating (free tier: estimator + assessment; pro: optimizer, what-if, filing guide AI, history)
- Vercel production deployment, Canadian data residency

## Non-Goals
- We are NOT building accounting software
- We are NOT CRA-certified (NETFILE) yet — the product guides, it does not submit
- We are NOT targeting accountants or CPAs as primary users (CPA portal exists as a future revenue line, currently fully mocked)
- We are NOT building for provinces other than Ontario
- We are NOT adding features outside of T1 individual filing (no T2, no T3)
- We are NOT collecting SIN in the consumer T1 flow (the AI is instructed never to ask for it)

## Architecture Principles
- ALL tax math is deterministic TypeScript — ZERO AI for calculations, ZERO AI for rule citation
- AI (Claude API `claude-sonnet-4-6`) is ONLY for: conversational intake (`/api/chat`), slip OCR extraction (`/api/ocr`), filing guide narrative (`/api/filing-guide`), NOA recovery analysis (`/api/recovery`)
- If Claude outputs a dollar amount, it is wrong. Dollar amounts come from the engine only.
- Single source of truth: `src/lib/tax-engine/constants.ts` — never hardcode values in business logic
- Dual-engine parity: `engine.ts` (slip-based) and `taxEngine.ts` (flat-input) must always agree on every tax rule

## PIPEDA Constraints
- SIN: NOT collected in the consumer T1 flow by design. If a future feature requires SIN, it must be encrypted via Supabase Vault before persistence, never stored plaintext, displayed masked (***-***-XXX) only.
- No PII in URLs, logs, or error messages — logger (`src/lib/logger.ts`) enforces a prohibited key list
- Canadian data residency: Supabase ca-central-1
- Cookie consent required before Sentry and Vercel Analytics fire (not yet implemented — top priority)
- User can delete all their data via `/api/account/delete` (implemented and tested)
- CRA record-keeping rule: retain data 6 years per ITA s.230(4) — we keep 7 (see `src/lib/data-retention.ts`)

## Tax Scope
- Tax year: 2025 (filing in 2026)
- Province: Ontario only
- Return type: T1 individual only
- Slip support: T4, T5, T5008, T3, T4A, T2202, T4E, T5007, T4AP, T4AOAS, T4RSP, T4RIF, RRSP-Receipt, T4FHSA (14 types)
- **DB gap**: only 8 slip types persist to Supabase today (T4, T5, T5008, T3, T4A, T2202, T4E, T5007). T4AP, T4AOAS, T4RSP, T4RIF, RRSP-Receipt, T4FHSA are parsed by OCR and accepted by the engine but silently dropped on save. Fix by updating `SUPPORTED_SLIP_TYPES` in `src/lib/supabase/tax-data.ts` and the DB CHECK constraint.

## Capital Gains — 2025 Reality
The two-tier capital gains inclusion rate (50% on first $250,000 / 66.67% above) is **already implemented** in `constants.ts` and both engines per Budget 2024. The previous CLAUDE.md annotation "50% flat, two-tier deferred to 2026" was incorrect. Do not revert this.

## Tech Stack
- Next.js 15 (App Router), TypeScript strict mode (`"strict": true` in tsconfig)
- React 19, Tailwind CSS 3, shadcn/ui, Framer Motion, Sonner (toasts)
- Supabase: PostgreSQL, Auth (email+password via `@supabase/ssr`), Storage, RLS on all tables
- Vercel deployment + Sentry error monitoring
- Claude API `claude-sonnet-4-6` — Anthropic SDK `@anthropic-ai/sdk`
- `@xenova/transformers` with `Supabase/gte-small` for RAG embeddings
- Resend for transactional email

## Code Style
- Strict TypeScript. No `any`. All tax interfaces fully typed in `src/lib/tax-engine/types.ts`.
- All monetary values: `number` (not string), rounded to 2 decimal places using `roundCRA()` from `src/lib/tax-engine/federal/brackets.ts` (which wraps `Math.round(x * 100) / 100`).
- File naming: kebab-case (`capital-gains.ts`)
- Functions: camelCase. Interfaces: PascalCase.
- Every calculation function must have unit tests.
- Comments: explain the WHY (CRA rule, ITA section), not the WHAT.
- Decimal.js is NOT currently used — consistent `roundCRA()` application has kept all 519 tests passing at cent precision. Do not introduce Decimal.js unless a rounding regression is found.

## Tax Engine Conventions (enforce always — do not skip)
- ALWAYS wrap final monetary results in `roundCRA()` — floating-point accumulation causes off-by-one-cent test failures. Round intermediate values at every addition boundary, not just at the end.
- Never fix a test by changing the expected value to match a wrong calculation. Fix the calculation.
- Every new module ships with a corresponding `.test.ts` file in the same directory, committed together.
- After building any new module, run the FULL test suite (`npm run test:run`), not just the new tests, before declaring done. Catch regressions immediately.
- Run `npx tsc --noEmit` before committing to catch TypeScript errors before they hit the build.

## Dual-Engine Parity (critical — enforced on every tax feature)
There are TWO tax engines that must stay in sync:
- `src/lib/tax-engine/engine.ts` — slip-based engine (T4/T5/etc. typed inputs), used by `/api/calculate` in `mode: 'slips'` and by the filing guide
- `src/lib/taxEngine.ts` — flat-input engine (plain number inputs), used by WhatIfEngine, CreditFinder, TaxOptimizer, FamilyOptimizer, and `/api/calculate` in `mode: 'flat'`

**Any tax rule, credit, deduction, or clawback added to one engine MUST be added to the other.** Before marking any tax feature complete, explicitly check both files. Omitting a rule from one engine produces silently wrong results for users of that path.

**Known parity gap as of April 2026**: The AMT carryforward credit (`amtCarryforwardCredit`) is applied in `taxEngine.ts` but not in `engine.ts`. Fix this before closing the AMT feature.

## Constants Are the Only Source of Truth
- NEVER hardcode a dollar amount, rate, or threshold in business logic. Every tax value belongs in `src/lib/tax-engine/constants.ts` and must be imported.
- If you see a magic number in engine code (e.g. `2759`, `90997`, `44325`), move it to `constants.ts` immediately.
- When adding a new tax year constant, cite the CRA source in a comment (e.g. `// CRA T1 2025, Schedule 1`). Never copy-paste a prior-year value without re-verifying it against CRA's current-year publications.
- Key 2025 values verified in constants.ts: Federal BPA $16,129 | Ontario BPA $12,747 | Medical threshold $2,759 | RRSP max $32,490 | Capital gains: 50% (≤$250k) / 66.67% (>$250k).

## CRA Classification — Check Before Coding
Before implementing any new deduction or credit, answer these two questions:
1. **Is it a deduction from income** (reduces net income, appears above line 23600 on the T1)? → implement in `calculateNetIncome()` or `calculateTaxableIncome()`.
2. **Is it a tax credit** (reduces tax payable, appears below line 30000 on Schedule 1 or ON428)? → implement in the credits aggregator, NOT in income functions.

Getting this wrong causes a double benefit. Specific traps confirmed in this codebase:
- Student loan interest → credit only (ITA s.118.62, line 31900). Do NOT deduct from net income.
- Union dues → income deduction (ITA s.8(1)(i), line 21200). Not a credit.

## Ontario vs Federal Credits — Always Check ON428
Ontario Taxation Act credits differ from federal. Before adding any credit to `calculateOntarioNonRefundableCredits()` in `engine.ts` or the Ontario section of `taxEngine.ts`:
- Verify the credit line exists on **ON428** (not just Schedule 1).
- Canada Employment Amount (line 31260) is federal-only — ON428 has no equivalent.
- Ontario eliminated the tuition credit after the 2017 tax year.
- Ontario has no Home Buyers' Amount, no Digital News Credit, no Volunteer credits.
- Ontario political contribution credit uses a tiered formula (75%/50%/33.3%) — not 5.05% × amount.

## Security Checklist (enforce on every feature)
- [ ] RLS policy on any new Supabase table (see `supabase/migrations/` for examples)
- [ ] Input validation server-side (not just client) — validate types, ranges, lengths
- [ ] No PII in URL parameters or logs — use `log()` from `@/lib/logger`, never `console.log` PII
- [ ] API routes require auth (Supabase JWT via `createServerSupabaseClient()`)
- [ ] Every new client `fetch()` to a protected API route uses `addCsrfHeader()` from `@/lib/csrf-client`
- [ ] Every new state-mutating API route calls `validateCsrfToken(req)` and returns 403 on failure
- [ ] Rate limiting applied to every API route — use `checkRateLimit()` from `@/lib/rate-limit`
- [ ] No personal email addresses or secrets in source code — use env vars
  - `SUPPORT_EMAIL` — destination for contact form emails (POST /api/contact). Falls back to `support@taxagent.ai`.

## Key File Structure
```
src/lib/tax-engine/constants.ts        — ALL 2025 rates/thresholds (single source of truth)
src/lib/tax-engine/types.ts            — All interfaces (TaxProfile, TaxSlip, TaxCalculationResult, etc.)
src/lib/tax-engine/engine.ts           — Slip-based engine orchestrator
src/lib/tax-engine/federal/            — Federal modules (brackets, credits, income, AMT, DTC, etc.)
src/lib/tax-engine/ontario/            — Ontario modules (brackets, surtax, OHP, LITR)
src/lib/tax-engine/family-optimizer.ts — Joint household optimization (pension split, childcare, RRSP)
src/lib/tax-engine/validator.ts        — T1 completeness scoring and validation
src/lib/tax-engine/constants-by-year.ts — Historical constants 2022–2024 (for NOA recovery)
src/lib/taxEngine.ts                   — Flat-input engine (TaxInput → TaxBreakdown)
src/lib/slips/slip-router.ts           — Slip type detection from OCR text
src/lib/slips/slip-fields.ts           — Slip field labels and primary box lookups
src/lib/ai/system-prompt.ts            — Claude system prompt for assessment interview
src/lib/ai/canadian-tax-knowledge.ts   — Structured knowledge for dynamic prompt injection
src/lib/ai/assessment.ts              — TaxProfile update parser from Claude responses
src/lib/rag/embed.ts                   — @xenova/transformers embedding + Supabase retrieval
src/lib/rag/knowledge-base.ts          — 20 curated CRA knowledge entries
src/lib/supabase/tax-data.ts           — All Supabase persistence helpers
src/lib/supabase/client.ts             — Client-side Supabase client
src/lib/supabase/server.ts             — Server-side Supabase client
src/lib/csrf-client.ts                 — Client: generate + attach CSRF token
src/lib/csrf.ts                        — Server: validate CSRF token
src/lib/rate-limit.ts                  — In-process + Upstash Redis rate limiter
src/lib/logger.ts                      — Structured JSON logger with PII scrubbing
src/lib/recovery/recovery-engine.ts    — NOA retroactive opportunity analyzer
src/lib/recovery/noa-parser.ts         — NOA Claude extraction + structured result
src/lib/email/transactional.ts         — Welcome + assessment-complete emails via Resend
src/lib/subscription.ts               — Tier definitions (free/pro) — gating not yet wired
src/lib/data-retention.ts             — 7-year retention policy constants
src/app/api/chat/route.ts              — POST /api/chat — streaming Claude conversation
src/app/api/calculate/route.ts         — POST /api/calculate — runs tax engine
src/app/api/ocr/route.ts               — POST /api/ocr — slip extraction via Claude Vision
src/app/api/filing-guide/route.ts      — POST /api/filing-guide — AI filing narrative
src/app/api/estimate/route.ts          — POST /api/estimate — public, no auth
src/app/api/recovery/route.ts          — POST /api/recovery — NOA scan
src/app/api/health/route.ts            — GET /api/health — Supabase ping
src/app/api/account/delete/route.ts    — POST /api/account/delete — PIPEDA erasure
src/app/api/contact/route.ts           — POST /api/contact — lead capture email
src/app/(app)/onboarding/page.tsx      — Chat assessment (9-phase interview)
src/app/(app)/dashboard/page.tsx       — Overview with calculation summary
src/app/(app)/slips/page.tsx           — Slip management (OCR + manual entry)
src/app/(app)/calculator/page.tsx      — Full T1 calculator with what-if and optimizer
src/app/(app)/family/page.tsx          — Family joint optimizer
src/app/(app)/filing-guide/page.tsx    — Step-by-step filing guide
src/app/(app)/recovery/page.tsx        — NOA scan for retroactive credits
src/app/(app)/history/page.tsx         — Calculation history
src/app/(app)/settings/page.tsx        — Account settings + deletion
src/middleware.ts                      — Auth guard for protected routes
supabase/migrations/                   — DB schema + RLS policies
tests/                                 — Integration + scenario tests (flat engine)
```

## Testing
- Use Vitest. Test file next to source: `brackets.ts` → `brackets.test.ts`.
- Current status: **519 tests, 26 files, all passing** (`npm run test:run`).
- Minimum test scenarios per calculation module: simple income, edge of bracket, multi-bracket, zero income.
- Cross-validate against CRA's own examples where available.
- Integration tests for consumer scenarios live in `tests/tax-engine/scenarios.test.ts` (59 tests, 10 profiles).
- DO NOT add tests to `tests/` for new modules — put them next to the source file.
