# Product Quality Backlog

This backlog captures issues observed during Stage 6D1 smoke testing and recent product review. These are not Stage 6D ownership blockers, but several are beta blockers.

## Priority Summary

| Priority | Area | Severity | Beta blocker? | Rationale |
| --- | --- | --- | --- | --- |
| 1 | Calculation correctness audit | Critical | Yes | If tax output is materially wrong, the product cannot be trusted regardless of UX or data model readiness. |
| 2 | OCR quality and blank extraction | High | Yes for intake MVP | Source-linked intake depends on usable document extraction; blank reads force manual work and break trust. |
| 3 | Duplicate slip handling beyond T2202 | High | Yes | Duplicate T4s can double employment income and produce materially wrong returns. |
| 4 | Performance audit | High | Yes before firm beta | A Vercel Speed Insights score of 56 and slow upload/filing-guide flows will reduce adoption during tax season. |
| 5 | Assessment UX redesign | Medium-high | Yes before firm beta, maybe not before internal testing | Current chatbot-first flow does not yet feel like an AI tax workbench or structured T1 intake. |
| 6 | Filing guide and upload flow responsiveness | Medium-high | Yes before beta | Slow generated guidance and upload states make the product feel unreliable even if backend data is correct. |

## 1. Calculation Correctness Audit

Status: Observed during smoke testing; not yet diagnosed.

Why it matters:

- TaxAgent is tax software, not a general chatbot.
- Incorrect calculations are more damaging than missing features.
- CPA firms will reject the product if they cannot trust deterministic outputs.

Scope:

- Compare slip-based `src/lib/tax-engine/engine.ts` and flat-input `src/lib/taxEngine.ts` on the same user scenarios.
- Verify slip field mapping from `tax_slips.boxes` into engine inputs.
- Verify T4 totals, CPP, EI, tax withheld, tuition, RRSP, deductions, credits, Ontario credits, and refund/payable.
- Confirm provenance records trace each line to the right input.
- Add or strengthen regression tests for the smoke-test profile that looked wrong.

What not to do:

- Do not patch expected test values to match current output.
- Do not ask an LLM to decide tax math.
- Do not add new tax features until the current output is trusted.

Recommendation: Make this the next product-quality priority before more feature expansion.

## 2. OCR Quality And Blank Extraction

Status: Synthetic OCR benchmark is now measurable and passing; real/private and
official-layout coverage still needs production-aligned observability.

Verified local baseline:

- Public synthetic eval fixtures: 14/14 passed, 42/42 fields.
- Private synthetic PDF captures: 22/22 passed, 84/84 fields.
- Private synthetic image captures: 56/56 passed, 168/168 fields.
- Recursive private captured corpus: 81/81 passed, 264/264 fields.

Remaining risk:

- Synthetic fixtures do not prove real issuer/official-layout performance.
- Supabase production metrics for blank extraction, corrections, duplicate
  signals, and source linkage are not yet summarized in a read-only dashboard.

Why it matters:

- The Tax File Graph depends on reliable source-linked extraction.
- Poor OCR increases manual correction time and weakens the intake value proposition.
- A "completed" extraction with empty fields is worse UX than an explicit failure.

Scope:

- Inspect `/api/ocr` extraction results for blank `boxes`, low confidence, and unsupported/poor images.
- Add clearer UI states for "read completed but no usable fields found."
- Review prompt/schema behavior for T4 extraction.
- Track extraction quality metrics: field count, confidence, blank-box rate, correction rate.
- Keep correction memory and source linkage intact.
- Add read-only OCR observability SQL/docs before any schema changes so OCR
  quality, `slip_extractions`, `slip_corrections`, and `tax_slips` stay aligned.
- Use `docs/architecture/ocr-production-observability.md` as the operating
  checklist for extraction health, field presence, review linkage, correction
  rate, duplicate signals, and provenance coverage.

What not to do:

- Do not wire CRA XSD schemas into active extraction yet.
- Do not add new slip types.
- Do not let AI calculate taxes from OCR output.

## 3. Duplicate Slip Handling Beyond T2202

Status: A duplicate T4 appeared or was preserved during smoke testing. T2202 duplicate handling is fixed, but T4 behavior needs audit.

Why it matters:

- Duplicate employment slips can double income, CPP, EI, and withholding.
- Firms need confidence that repeated uploads do not silently corrupt the file.

Scope:

- Audit `upsertSlipInList`, `dedupeSlipList`, OCR metadata propagation, `file_hash`, and `source_extraction_id`.
- Decide intended behavior for multiple T4s:
  - Allow multiple employers.
  - Detect exact duplicate uploads by `file_hash`.
  - Warn on same issuer, same year, and same key box values.
- Add tests for exact duplicate T4 upload and legitimate two-employer T4 cases.

What not to do:

- Do not block legitimate multiple T4s.
- Do not make T4 dedup logic identical to T2202 if employer/multiple-job behavior needs different rules.

## 4. Performance Audit

Status: Website feels slow; Vercel Speed Insights score reported as 56. Home page, upload, and filing guide feel slow.

Why it matters:

- Slow intake will hurt CPA firm adoption during high-volume tax season.
- Users perceive slow AI actions as broken even when requests eventually finish.

Scope:

- Capture baseline metrics for home page, app shell, `/slips`, `/slips/upload/[slip_type]`, `/calculator`, and `/filing-guide`.
- Separate frontend bundle/page-load issues from backend API latency.
- Check client component size, heavy imports, image/font loading, and AI route duration.
- Add timeout/error states for long-running OCR and filing-guide actions.
- Consider progressive UI states for long AI calls.

What not to do:

- Do not prematurely rewrite architecture.
- Do not add broad caching that could leak user tax data.
- Do not optimize before measuring route-level bottlenecks.

## 5. Assessment UX Redesign

Status: Current assessment feels like a plain chatbot. That is weaker than the TaxAgent master-plan direction.

Why it matters:

- The intended product is an AI T1 Intake + Review Workbench, not a GPT wrapper.
- Structured intake should reduce uncertainty and guide users through missing items, evidence, and review state.

Scope:

- Replace pure chat feel with guided phases, option cards, progress, missing-item checklist, and editable extracted facts.
- Preserve conversational help where useful.
- Show the user what TaxAgent has learned: income, slips, deductions, credits, documents, open questions.
- Align with CPA review workflow, not consumer chatbot novelty.

What not to do:

- Do not copy TurboTax directly.
- Do not let option cards hide complex tax uncertainty.
- Do not remove source-linked evidence from the workflow.

## 6. Filing Guide And Upload Responsiveness

Status: Filing guide generation and upload/review interactions feel slow.

Why it matters:

- Filing guide is user-facing trust material.
- Upload is the front door to the Tax File Graph.

Scope:

- Add better progress states, failure states, and retry guidance.
- Measure `/api/filing-guide` latency separately from page rendering.
- Consider caching generated filing guide records after calculation changes.
- Ensure upload retry does not create duplicate records.

What not to do:

- Do not rely on generic spinners for long AI operations.
- Do not hide errors behind silent retries.

## Recommended Order Before Beta

1. Calculation correctness audit and regression tests.
2. T4 duplicate and OCR quality audit.
3. Performance baseline and timeout/error-state fixes.
4. Assessment UX redesign into guided intake/workbench.
5. Filing guide/upload responsiveness polish.

Stage 6D2 can proceed as database hardening if kept narrow and reviewed. Product work should not be bundled into Stage 6D2.
