# TaxAgent Codebase Audit — April 2026

## Executive Summary

TaxAgent.ai is a real, production-quality Next.js 14 / Supabase / TypeScript codebase for Ontario T1 personal tax filing. The tax engine is the strongest part: 519 tests, all passing, covering federal and Ontario brackets, credits, capital gains, AMT, disability, moving expenses, pension splitting, rental income, self-employment, HBP/LLP repayments, stock options, instalments, and a full-family optimizer. The dual-engine architecture (slip-based `engine.ts` + flat-input `taxEngine.ts`) is consistent and well-integrated into API routes. The AI pipeline (chat, OCR, filing guide, retroactive NOA recovery) is real and complete. The main weaknesses are (1) the DB slip type allowlist is stale — it only allows 8 slip types but the type system supports 14; (2) the settings page password-change UI is cosmetic and not wired to Supabase; (3) the CPA/returns page uses entirely mock data with no backend; and (4) Supabase Vault for SIN encryption is specified but not implemented in any code path. The product is functionally viable for an MVP launch but these gaps need closing before showing to tax professionals or CRA-sensitive users.

---

## Tax Engine (`src/lib/tax-engine/` + `src/lib/taxEngine.ts`)

### What's Built

**Constants (`src/lib/tax-engine/constants.ts`)**
- Single source of truth, fully cited against CRA publications.
- All 2025 values verified: Federal BPA $16,129 | Ontario BPA $12,747 | Federal blended rate 14.5% (Bill C-4) | Federal NRC rate 15% | Ontario 5.05%.
- CPP ($71,300 ceiling, 5.95%), CPP2 ($81,200 YAMPE, 4%), EI ($65,700, 1.64%).
- Capital gains: two-tier 50% / 66.67% with $250,000 threshold (Budget 2024) — NOTE: this contradicts the CLAUDE.md annotation "50% flat, two-tier deferred to 2026." The constants.ts and engine both implement the two-tier system already.
- RRSP $32,490, FHSA $8,000/$40,000.
- AMT: 20.5%, $173,205 exemption (reformed 2024).
- OAS clawback: $90,997, 15%.
- CWB, GST credit, CCB, Ontario Trillium Benefit (OSTC + OEPTC), Ontario Health Premium (graduated formula), Ontario Surtax (two-tier 20%/36%), Ontario Low-Income Tax Reduction.
- CRA line number mappings for all T1 lines used.

**Slip-based engine (`src/lib/tax-engine/engine.ts`) — 820 lines**
- Handles T4, T5, T5008, T3, T4A, T4E, T5007, T4AP, T4AOAS, T4RSP, T4RIF, RRSP-Receipt, T4FHSA.
- Calculates: total income, net income, taxable income, federal tax, Ontario tax, all NRCs (federal + Ontario), DTC, OAS clawback, CWB, RMES, CTC, Ontario seniors care, CPP/EI over-deduction refund, OTB estimate.
- Top-up tax credit for 2025 blended rate transition is correctly implemented.
- Newcomer proration flag emitted (warning only — proration itself not applied to credits, just flagged).
- Edge case flags: CPP over-deduction, RRSP over-contribution, OAS clawback, newcomer proration, HBP/LLP repayment due.
- Line-by-line CRA mapping for key lines in the result.

**Flat-input engine (`src/lib/taxEngine.ts`) — 1,230 lines**
- Accepts every income source and deduction as plain numbers.
- Produces `TaxBreakdown` with full line-by-line detail, federal + Ontario breakdowns, payroll deductions, refundable credits, CCB estimate, OTB estimate, take-home pay (annual/monthly/biweekly/weekly).
- `emptyTaxInput()` factory function exists — good for tests.
- `calculateTaxes()` is the main export.

**Federal modules (`src/lib/tax-engine/federal/`)**
All have corresponding `.test.ts` files:
- `brackets.ts` — `roundCRA()`, `calculateFederalTaxOnIncome()`, `getMarginalRate()`, `getAverageTaxRate()`.
- `income.ts` — `aggregateTotalIncome()`, `calculateNetIncome()`, `calculateTaxableIncome()`.
- `credits.ts` — `calculateTotalFederalCredits()`, `calculateMedicalExpenseCredit()`, `calculatePensionIncomeCredit()`, `calculateCWB()`, `calculateRMES()`, `calculateCTC()`.
- `disability.ts` — `calculateDTC()` with under-18 supplement and caregiver claim logic.
- `dividends.ts` — gross-up + dividend tax credits for eligible and non-eligible.
- `capital-gains.ts` — two-tier inclusion with $250k threshold per T5008 and T3.
- `amt.ts` — Schedule 12 AMT check (20.5%, $173,205 exemption).
- `foreign-tax-credit.ts` — Section 126 credit.
- `instalments.ts` — quarterly instalment calculation (prior-year and current-year methods).
- `moving-expenses.ts` — T1-M with 40 km test and income cap.
- `pension-split-optimizer.ts` — sweeps 0–50% split in $500 increments.
- `principal-residence.ts` — designation logic for capital gains exemption.
- `rental-income.ts` — T776 net income after expenses (CCA decision).
- `rrsp-repayments.ts` — HBP and LLP annual repayment and carryover logic.
- `self-employment.ts` — T2125: CPP on self-employment, business-use-of-home, vehicle log.
- `stock-options.ts` — employment benefit vs. capital gain treatment.

**Ontario modules (`src/lib/tax-engine/ontario/`)**
- `brackets.ts` — `calculateOntarioTaxOnIncome()`.
- `surtax.ts` — two-tier surtax (20% above $5,818, +36% above $7,446).
- `health-premium.ts` — graduated "lesser of" formula, max $900.
- `low-income-reduction.ts` — $294 reduction, clawed back at 5.05% above $18,569.

**Other engine utilities**
- `constants-by-year.ts` — historical constants for 2022, 2023, 2024 (for NOA recovery).
- `family-optimizer.ts` — joint optimization: childcare claimant, pension splitting, RRSP allocation.
- `validator.ts` — T1 completeness scoring (0–100%) and issue detection.

### What's Missing or Incomplete

1. **Newcomer credit proration not applied** — the engine emits a flag (`NEWCOMER_PRORATION`) when `residencyStartDate` is set but does not actually prorate personal NRCs. ITA s.118.91 requires proportional reduction of most credits for part-year residents.

2. **CCA for rental/self-employment** — types define a `capitalCostAllowance` expense field, but there is no CCA schedule calculation (Class selection, half-year rule, UCC tracking). Users must input a pre-computed CCA amount; the engine does not calculate it.

3. **T2125 home-office detailed method** — `HomeOfficeExpense.method = 'detailed'` is typed but the self-employment module's detailed pro-rata calculation path has limited coverage for all expense sub-items.

4. **Northern residents deduction** — appears on `TaxInput` as `isNorthernOntario` flag and in `TaxBreakdown.lines` as an unfilled zero; no calculation implemented.

5. **T5007 (social assistance) income offset** — typed and routed in OCR, but the engine does not apply the line 25000 social assistance offset (non-taxable but reported for benefit purposes).

6. **FHSA deduction validation** — `fhsaContributions` is passed through to the deduction, but no check confirms the user opened the FHSA before the deadline or tracks carryforward room.

7. **AMT carryforward credit application** — `amtCarryforwardCredit` field exists in `DeductionsCreditsInput` but the slip-based engine does not apply it against federal tax. The flat-input engine does include it.

8. **Two-tier capital gains discrepancy in CLAUDE.md** — the old CLAUDE.md says "50% flat (two-tier deferred to 2026)" but `constants.ts` implements two-tier (50%/$250k/66.67%) and the engine uses it. The CLAUDE.md was wrong; the code is correct per Budget 2024.

### Dual-Engine Parity Issues

Both engines implement all major income sources and deductions. Known differences:

| Rule | `engine.ts` (slip-based) | `taxEngine.ts` (flat-input) |
|---|---|---|
| AMT carryforward credit | Not applied | Applied (line 40425) |
| Newcomer proration | Flag only | Not implemented either |
| Rental income net | Reads from `RentalIncome[]` input | `rentalIncome - rentalExpenses` flat field |
| T4FHSA taxable income | Included from slip data | Not modeled as separate field |
| Stock options | Separate module, not wired into engine orchestrator | Not modeled |
| OTB estimate | Full OSTC+OEPTC formula | Full OSTC+OEPTC formula (consistent) |

The AMT carryforward credit asymmetry (`src/lib/tax-engine/engine.ts` does not apply it, `src/lib/taxEngine.ts` does) is the most significant parity gap.

---

## AI / Chat Pipeline (`src/lib/ai/`, `src/app/api/chat/`)

### What's Built

- **System prompt** (`src/lib/ai/system-prompt.ts`): Full conversational CPA persona. Life-situation adaptation for students, employees, self-employed, investors, retirees, rental owners. Correct Canadian terminology (CRA, NETFILE, etc.). One-question-at-a-time instruction enforced. Slip recommendation logic. Never asks for SIN.

- **Knowledge injection** (`src/lib/ai/canadian-tax-knowledge.ts`): Structured knowledge base (`TAX_KNOWLEDGE_2025`) with credit eligibility rules. `getRelevantCreditKeys()` filters by user profile; `getRelevantMistakes()` filters common errors by situation. Injected into system prompt per request.

- **Assessment parser** (`src/lib/ai/assessment.ts`): Extracts ````tax-profile-update``` ` JSON blocks from Claude responses. Parses all `TaxProfile` fields. `calculateAssessmentProgress()` scores 9-phase completion.

- **Chat API** (`src/app/api/chat/route.ts`, 412 lines): Streams Claude `claude-sonnet-4-6` via Anthropic SDK. Auth check (Supabase JWT), CSRF, rate limit (10 messages/user/minute). RAG retrieval injected per turn. History capped at 100 messages / 50 KB. Message role validated.

- **Onboarding page** (`src/app/(app)/onboarding/page.tsx`): Full chat UI with streaming. Parses `<tax-profile-complete>` XML block at assessment end. Persists profile + deductions to Supabase. Saves/loads chat history from Supabase. `<slip-recommendations>` parsed and stored.

### Issues Found

- **Model ID**: Codebase uses `claude-sonnet-4-6` (correct per CLAUDE.md). No hardcoded model fallback.
- **RAG retrieval** calls `match_tax_knowledge` Supabase RPC which requires the `tax_knowledge` table and vector extension to be seeded. This is not in the migration. If the table is empty, RAG silently returns `[]` — non-fatal by design.
- **Contact form** (`src/app/api/contact/route.ts`) has a personal email address hardcoded in the source: `zohaibghani556@gmail.com`. Should be an environment variable.

---

## Slip OCR Pipeline (`src/lib/slips/`, `src/app/api/ocr/`)

### What's Built

- **Slip router** (`src/lib/slips/slip-router.ts`): Regex-based slip type detection from OCR text. Handles T4, T4A, T4AP, T4AOAS, T4RSP, T4RIF, T4FHSA, RRSP-Receipt, T4E, T5, T5007, T5008, T3, T2202 — all 14 slip types in the type union. Ordered by specificity.

- **Slip fields** (`src/lib/slips/slip-fields.ts`): `SLIP_TYPE_LABELS` and `SLIP_PRIMARY_BOX` lookup maps used by UI (slip grid display, primary amount formatting).

- **OCR API** (`src/app/api/ocr/route.ts`): Accepts multipart form (PNG, JPG, WebP, PDF). Max 10 MB. Sends to Claude Vision with detailed per-slip extraction instructions. Cross-validates Claude's slip type with `routeSlipType()` regex. Returns `{slipType, issuerName, taxYear, boxes, summary, confidence, lowConfidenceFields}`. Auth, CSRF, rate limit (Supabase JWT).

- **Manual entry form** (`src/components/slips/ManualEntryForm.tsx`): UI form for each slip type.

- **Slip upload** (`src/components/slips/SlipUpload.tsx`): Drag-and-drop upload component.

### Issues Found

1. **DB slip type allowlist mismatch** (`src/lib/supabase/tax-data.ts`, line 59): `SUPPORTED_SLIP_TYPES` only allows `['T4', 'T5', 'T5008', 'T3', 'T4A', 'T2202', 'T4E', 'T5007']`. This silently drops T4AP, T4AOAS, T4RSP, T4RIF, RRSP-Receipt, T4FHSA — the 6 newer slip types. OCR can detect them, the engine can process them, but they cannot persist to the database.

2. **PDF OCR limitation**: The API accepts `application/pdf` but Anthropic's Vision API supports PDF only in limited contexts. No explicit page extraction or PDF-to-image conversion step exists. Multi-page PDFs may not be processed reliably.

---

## RAG Knowledge Base (`src/lib/rag/`)

### What's Built

- **Embeddings** (`src/lib/rag/embed.ts`): `@xenova/transformers` with `Supabase/gte-small` (384 dimensions). Singleton pipeline pattern. `embedText()` produces normalized float32 vectors. `retrieveRelevantKnowledge()` calls `match_tax_knowledge` Supabase RPC with 0.75 similarity threshold, returns up to 6 chunks.

- **Knowledge base** (`src/lib/rag/knowledge-base.ts`): 20 curated entries covering BPA, RRSP, FHSA, CPP/EI, capital gains, dividends, OAS clawback, medical expenses, charitable donations, tuition, disability, CWB, Ontario surtax, OHP, OTB, age amount, pension splitting. All dollar amounts imported from `constants.ts` — no hardcoding.

- **Types** (`src/lib/rag/types.ts`): `KnowledgeEntry` and `KnowledgeChunk` interfaces.

### Issues Found

- **No migration for `tax_knowledge` table** or `match_tax_knowledge` RPC. The single migration file only covers user data tables (tax_profiles, tax_slips, etc.). The RAG table and vector extension setup are not in the repo. RAG will silently fail on any deployment that hasn't manually set this up.
- **Cold-start overhead**: `@xenova/transformers` downloads the model on first call. No warm-up mechanism exists. First RAG-enabled chat request in a cold Vercel serverless instance will be slow (potentially >10s).
- `@xenova/transformers` is an older package. The model loading approach works but should eventually migrate to `@huggingface/transformers` or a dedicated embedding endpoint.

---

## API Routes (`src/app/api/`)

### Complete List with Status

| Route | Method | Auth | CSRF | Rate Limit | Status |
|---|---|---|---|---|---|
| `/api/chat` | POST | Supabase JWT | Yes | 10/min | Production-ready |
| `/api/calculate` | POST | Supabase JWT | Yes | 30/min | Production-ready |
| `/api/ocr` | POST | Supabase JWT | Yes | Not set (chat limit used) | Functional — see DB slip type issue |
| `/api/filing-guide` | POST | Supabase JWT | Yes | 5/hr | Production-ready |
| `/api/estimate` | POST | None | No | 5/IP/min | Production-ready (public) |
| `/api/recovery` | POST | Supabase JWT | Yes | 10/hr | Production-ready |
| `/api/health` | GET | None | No | None | Production-ready |
| `/api/contact` | POST | None | No | 3/IP/hr | Functional; personal email hardcoded |
| `/api/account/delete` | POST | Supabase JWT | Yes | 3/hr | Production-ready |

**Note on `/api/ocr` rate limit**: The route calls `checkRateLimit('ocr:${userId}', ...)` but the parameters are not visible in the first 100 lines — it does have its own key, confirming separation.

---

## App Pages (`src/app/`)

### Authenticated Pages (`src/app/(app)/`)

| Page | Route | Real Data | Status |
|---|---|---|---|
| Dashboard | `/dashboard` | Supabase (slips, calculations, history) | Functional; real data loaded |
| Onboarding / Chat | `/onboarding` | Supabase (messages, profile) | Functional; streaming works |
| Slips | `/slips` | Supabase (tax_slips) | Functional; DB slip type gap (see above) |
| Calculator | `/calculator` | Supabase (slips, deductions, calculations) | Functional; full engine integration |
| Family Optimizer | `/family` | Client-side only (no persistence) | Functional |
| Filing Guide | `/filing-guide` | Supabase (calculations, filing_guides) | Functional; guide cached in DB |
| History | `/history` | Supabase (tax_calculations) | Functional |
| Recovery (NOA scan) | `/recovery` | API-only, no persistence | Functional |
| Settings | `/settings` | Auth data only | Partial — see below |

**Settings page gaps**:
- Password change UI (`/settings`) renders fields but the "Save changes" button calls `toast.success('Changes saved')` directly — no Supabase `auth.updateUser()` call. Password change is not wired.
- Notification preferences (`filingDeadline`, `rrspDeadline`, `slipAvailable`) are local React state only. Not persisted to Supabase.
- Name/email fields are read-only from Supabase auth. No edit path exists.

### Public / Marketing Pages

| Page | Route | Status |
|---|---|---|
| Landing | `/` | Polished; animated hero, feature sections, FAQ |
| Login | `/login` | Real Supabase auth |
| Signup | `/signup` | Real Supabase auth |
| Estimate | `/estimate` | Real engine, public, no auth |
| Pricing | `/pricing` | Static |
| For CPAs | `/for-cpas` | Contact form (sends to hardcoded email) |
| CPA Returns | `/cpa/returns` | Fully mocked — `MOCK_RETURNS` from `cpa-returns.ts`, search is no-op |
| Privacy | `/privacy` | Static legal copy |
| Terms | `/terms` | Static legal copy |

---

## Infrastructure & Security

### Auth, CSRF, RLS, Rate Limiting

- **Auth**: Supabase JWT via `@supabase/ssr`. Session refresh happens in middleware on every request. All protected routes redirect unauthenticated users to `/login`.
- **CSRF**: Double-submit cookie pattern. `csrf-client.ts` generates 64-char hex token via `crypto.getRandomValues()`. `csrf.ts` server-side validates `X-CSRF-Token` header against cookie. Applied to all state-mutating API routes.
- **RLS**: Migration `20260405000000_initial_schema_rls.sql` enables RLS on all user tables with owner-only policies. Tables covered: `tax_profiles`, `tax_slips`, `tax_calculations`, `deductions_credits`, `business_income`, `audit_log`.
- **Rate limiting**: In-process token bucket (`rate-limit.ts`) with optional Upstash Redis sliding window. In-process is per-instance only — documented limitation. Upstash path exists but requires env vars.
- **Security headers**: CSP, X-Frame-Options DENY, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all set in `next.config.ts`.
- **Logger**: PII scrubbing enforced — removes `email`, `name`, `legalName`, `sin`, `taxAmount`, `balanceOwing`, `slipData`, etc.
- **Sentry**: Configured for error monitoring (`sentry.client.config.ts`, `sentry.server.config.ts`).

### Issues Found

1. **SIN Vault encryption not implemented**: `PayrollEmployee.sin` in types.ts has a TODO comment: "encrypt with Vault.encrypt() before INSERT, decrypt on SELECT." No actual Vault calls exist anywhere in the codebase. The individual consumer T1 flow does not collect SIN (intentionally per system prompt), but the payroll/corporate data model does. The privacy page and marketing copy state SIN is encrypted; this is aspirational, not implemented.

2. **Rate limiting is per-instance only in production**: On multi-instance Vercel deployments (any paid plan), a determined attacker can bypass in-memory rate limits by routing to different instances. Upstash Redis must be configured before production launch.

3. **Contact API exposes a personal email** (`src/app/api/contact/route.ts`, line approx. 100): The recipient address `zohaibghani556@gmail.com` is hardcoded in source, not an env var. Should be `process.env.CONTACT_EMAIL`.

4. **No CSRF on `/api/contact` and `/api/estimate`**: These are intentionally public routes; this is acceptable by design, documented in the route comments.

5. **Middleware does not protect `/cpa/*` routes**: `src/middleware.ts` lists specific protected paths. `/cpa` is not in `PROTECTED`, so `/cpa/returns` is accessible without auth. Given the mock data, this is low risk now, but needs attention before real CPA data is wired.

6. **No cookie consent / tracking gate**: The landing page has no cookie consent banner. Sentry and Vercel Analytics fire without user consent. PIPEDA requires consent before tracking — missing.

---

## Test Coverage

### Passing / Total

```
26 test files, 519 tests, all passing.
Duration: ~21s
```

### Test Files and Their Scope

| Test File | Tests | Coverage |
|---|---|---|
| `federal/brackets.test.ts` | 17 | Bracket math, rounding, marginal/average rates |
| `federal/credits.test.ts` | 35 | All NRCs, CWB, RMES, CTC, medical, donations |
| `federal/income.test.ts` | 37 | Total/net/taxable income assembly |
| `federal/disability.test.ts` | 21 | DTC base, under-18 supplement, transfer |
| `federal/moving-expenses.test.ts` | 22 | 40 km test, income cap, carryover |
| `federal/amt.test.ts` | 16 | AMT Schedule 12 |
| `federal/foreign-tax-credit.test.ts` | 8 | s.126 credit |
| `federal/instalments.test.ts` | 18 | Quarterly instalments, both methods |
| `federal/pension-split-optimizer.test.ts` | 12 | Sweep and optimal split |
| `federal/principal-residence.test.ts` | 8 | PRE designation |
| `federal/rental-income.test.ts` | 12 | T776 net income |
| `federal/rrsp-repayments.test.ts` | 15 | HBP and LLP repayment |
| `federal/self-employment.test.ts` | 27 | T2125, CPP, home office |
| `federal/stock-options.test.ts` | 8 | ESO benefit vs. capital gain |
| `ontario/brackets.test.ts` | 6 | Ontario bracket tax |
| `ontario/surtax.test.ts` | 6 | Two-tier surtax |
| `ontario/health-premium.test.ts` | 13 | All OHP tiers |
| `ontario/low-income-reduction.test.ts` | 6 | LITR |
| `engine.test.ts` | 39 | Full slip-based engine integration |
| `family-optimizer.test.ts` | 22 | Joint optimization scenarios |
| `validator.test.ts` | 21 | Completeness scoring and issues |
| `constants-by-year.test.ts` | 42 | Historical constants integrity |
| `recovery/recovery-engine.test.ts` | 20 | NOA analysis opportunities |
| `tests/federal-brackets.test.ts` | 17 | Bracket boundary cross-validation |
| `tests/scenarios.test.ts` | 59 | 10 consumer profile scenarios (flat engine) |
| `tests/edge-cases.test.ts` | 15 | Edge cases (zero income, max brackets, etc.) |
| `tests/end-to-end.test.ts` | 14 | End-to-end flat engine results |

### Gaps

- No tests for `src/lib/ai/assessment.ts` (profile update extraction) or `src/lib/ai/canadian-tax-knowledge.ts`.
- No tests for `src/lib/slips/slip-router.ts`.
- No tests for `src/lib/rag/embed.ts` or `src/lib/rag/knowledge-base.ts`.
- No tests for API routes (integration / E2E).
- `src/lib/taxEngine.ts` missing a dedicated module-level test file (tested indirectly via `tests/scenarios.test.ts`).
- No UI component tests.

---

## Broken / Stubbed / TODO

### Complete List

| Item | File | Notes |
|---|---|---|
| Password change not wired | `src/app/(app)/settings/page.tsx:66` | Save button calls `toast.success()` directly |
| Notification prefs not persisted | `src/app/(app)/settings/page.tsx` | Local state only |
| DB allowlist missing 6 slip types | `src/lib/supabase/tax-data.ts:59` | T4AP, T4AOAS, T4RSP, T4RIF, RRSP-Receipt, T4FHSA silently dropped |
| SIN Vault encryption not implemented | `src/lib/tax-engine/types.ts:506` | TODO comment, no Vault calls exist |
| CPA returns page fully mocked | `src/app/cpa/returns/page.tsx:27` | `MOCK_RETURNS`, search is no-op |
| CPA route not protected by middleware | `src/middleware.ts:4` | `/cpa` not in PROTECTED list |
| Contact recipient email hardcoded | `src/app/api/contact/route.ts` | `zohaibghani556@gmail.com` |
| RAG table migration missing | No migration file | `tax_knowledge` table and `match_tax_knowledge` RPC not in repo |
| Data retention cron not scheduled | `src/lib/data-retention.ts:8` | SQL provided as comment, not deployed |
| Newcomer credit proration not computed | `src/lib/tax-engine/engine.ts` | Flag emitted but proration not applied |
| AMT carryforward missing from slip engine | `src/lib/tax-engine/engine.ts` | Flat engine applies it, slip engine does not |
| Northern residents deduction not calculated | `src/lib/taxEngine.ts` | Field exists, zero always output |
| Demo data file still present | `src/lib/demo-data.ts:7` | TODO: remove once all pages use Supabase |
| Subscription gating not wired | `src/lib/subscription.ts:40` | `return true` for all users |
| Cookie consent / tracking gate missing | Landing page, global layout | Sentry + analytics fire without consent |
| pdf-to-image conversion for OCR | `src/app/api/ocr/route.ts` | Multi-page PDFs may not extract reliably |
| Filing guide caching per (userId, taxYear) | `src/app/(app)/filing-guide/page.tsx:11` | TODO in file; guide does persist but no per-year dedup |
| profile.userId validation in calculate | `src/app/api/calculate/route.ts:13` | TODO: validate userId matches auth user |

---

## Priority Fix Queue

### Must Fix Before Showing to Users

1. **DB slip type allowlist** (`src/lib/supabase/tax-data.ts:59`): Add T4AP, T4AOAS, T4RSP, T4RIF, RRSP-Receipt, T4FHSA to `SUPPORTED_SLIP_TYPES`. Also requires a DB migration to update the `tax_slips.slip_type` CHECK constraint.

2. **Contact email as env var** (`src/app/api/contact/route.ts`): Replace hardcoded personal email with `process.env.CONTACT_EMAIL ?? 'zohaibghani556@gmail.com'`.

3. **CPA route protection** (`src/middleware.ts`): Add `/cpa` to `PROTECTED` array before any real CPA data is wired.

4. **Rate limiting Redis setup**: Document Upstash Redis as a required env var for production. The in-memory fallback is not safe on multi-instance Vercel.

5. **RAG table migration**: Write a migration for `tax_knowledge` table with `pgvector` extension, `match_tax_knowledge` RPC, and a seed script for the 20 knowledge base entries.

6. **Cookie consent**: Add a consent banner before Sentry and Vercel Analytics fire. Required for PIPEDA compliance.

### Must Fix Before Charging Users

7. **Password change wiring** (`src/app/(app)/settings/page.tsx`): Connect to `supabase.auth.updateUser({ password })`.

8. **Notification preferences persistence**: Persist to Supabase `user_metadata` or a `user_preferences` table.

9. **AMT carryforward parity** (`src/lib/tax-engine/engine.ts`): Apply `deductions.amtCarryforwardCredit` against `netFederalTax` in the slip-based engine to match the flat engine.

10. **Newcomer credit proration** (`src/lib/tax-engine/engine.ts`): Apply the `prorationFactor` to all personal NRCs when `profile.residencyStartDate` is set, per ITA s.118.91.

11. **Subscription gating** (`src/lib/subscription.ts`): Wire billing (Stripe or Paddle) and replace `return true`.

### Nice to Have

12. Remove `src/lib/demo-data.ts` once all pages confirmed loading from Supabase.
13. SIN Vault encryption for the payroll/corporate data model (T1 consumer flow intentionally does not collect SIN).
14. Migrate from `@xenova/transformers` to `@huggingface/transformers` or dedicated embedding endpoint.
15. Add a warm-up ping for the RAG embedding model to reduce cold-start latency.
16. Real CPA portal backend (currently fully mocked).
17. Data retention cron (`pg_cron`) deployment.
18. Northern residents deduction calculation.
19. CCA schedule calculation (Class selection, half-year rule, UCC tracking).
20. Decimal.js — the CLAUDE.md mandates it but the codebase uses `Math.round()` consistently; tests pass at cent-level precision. The current approach is acceptable but Decimal.js would be more defensive.
