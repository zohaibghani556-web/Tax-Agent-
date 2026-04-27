# TaxAgent Master Plan

This is the planning source of truth before the next build stages. It combines the verified TaxAgent technical foundation, product thesis, market direction, and sequencing discipline so future Claude Code and Codex work does not reopen settled architecture decisions or prematurely build low-moat features.

Related docs:

- [Current state](../architecture/current-state.md)
- [Data model](../architecture/data-model.md)
- [AI worker handoff](../architecture/ai-worker-handoff.md)
- [Stage 6D preflight](../architecture/stage-6d-preflight.md)
- [Unfinished work register](unfinished-work-register.md)
- [Product phases](product-phases.md)
- [Moat and defensibility](moat-and-defensibility.md)
- [CPA workflow roadmap](cpa-workflow-roadmap.md)
- [Market and competitor analysis](market-and-competitor-analysis.md)

## Executive Position

TaxAgent should become the connected AI tax workbench that turns scattered client tax data into review-ready, source-linked, CPA-approved tax files.

TaxAgent should not be positioned as:

- A GPT wrapper.
- A consumer-only tax chatbot.
- An immediate replacement for TaxCycle, ProFile, Taxprep, Cantax, DT Max, QuickBooks, Excel, or other entrenched systems.
- A system where AI calculates tax or cites tax rules from model memory.

The first product wedge should be AI T1 Intake + Review Workbench for Canadian small tax firms, starting with simple, student, and young-worker Ontario T1 files.

## Current Technical Foundation

Built and live:

- `slip_extractions` is live and receives OCR rows.
- `slip_corrections` is live with RLS and foreign keys.
- `tax_slips` links to OCR through `file_hash` and `source_extraction_id`.
- `tax_returns` is live with `provenance_records`.
- A verified `tax_returns` row exists with `tax_year = 2025`, `engine_mode = slips`, `engine_version = 1.0.0`, and `provenance_count = 23`.
- T2202 duplicate handling is fixed and smoke-tested.
- T2202 Box A, Box B, and Box C mapping is fixed.
- Stage 6C schema alignment is complete: `tax_calculations`, `deductions_credits`, `chat_messages`, `business_income`, and `rental_income` have nullable `user_id` and `tax_year`, backfilled from `tax_profiles`, with validated `user_id` foreign keys.
- Stage 6F write-path alignment is complete: active future writes populate `user_id` and `tax_year` where supported.
- `tax_slips.user_id` was backfilled and verified per latest live context from the task owner.
- `tax-data.ts` with the `profile_id` path remains production canonical.
- Claude Code and Codex two-agent workflow exists for implementation, audit, and documentation quality control.

Stable rules:

- The deterministic TypeScript tax engine owns all tax math.
- LLMs are only for slip extraction, document classification, onboarding, and narrative assistance.
- AI must never do tax math.
- AI must never cite tax rules from model memory.
- CRA, ITA, cited constants, and the rules database must be the source of tax truth.
- `tax_calculations` and `tax_returns` both remain in use.
- `tax_calculations` is append-only calculation history.
- `tax_returns` is latest provenance-rich return per `profile_id`, `tax_year`, and mode.
- `profile_id` is canonical for tax-year filing data.
- `user_id` is denormalized for RLS and query convenience.

Intentionally delayed:

- Stage 6D `NOT NULL` constraints and any RLS consolidation.
- `slip-store.ts` production switch.
- CRA XSD schema wiring into active extraction or validation.
- T5018.
- Cross-slip validation.
- Provenance UI.
- Review queue.
- Source-linked workpaper UI.
- Readiness scoring.
- Client follow-up workflow.
- Connector strategy.
- Export package.
- Firm beta.
- CPA discovery interviews.

## Product Thesis

TaxAgent's product object should be the Tax File Graph, not a chat transcript and not a single uploaded slip.

The Tax File Graph connects:

- Taxpayer profile and tax year.
- Uploaded documents and OCR extraction rows.
- Saved `tax_slips`.
- Field-level corrections.
- Client answers.
- Deterministic calculation outputs.
- Provenance records that connect result fields to sources.
- CRA-grounded rules and constants.
- Missing items and exceptions.
- Reviewer notes and sign-offs.
- Export/workpaper artifacts.

The graph is valuable because it makes the tax file reviewable. It answers practical questions CPAs care about:

- What documents do we have?
- What is missing?
- Which values were extracted, corrected, or manually entered?
- Which source supports each return line?
- Which fields changed from last year?
- Which exceptions require reviewer judgment?
- What can be exported to the preparer, TaxCycle/ProFile/Taxprep, workpapers, or the client?

## Why Not An AI Tax Filing Chatbot

An AI tax chatbot is too weak as the core wedge because:

- Consumer chatbot experiences are easy for incumbents to copy.
- Chat does not create durable firm workflow data.
- A chat-first product increases risk that users treat LLM text as tax advice.
- The consumer market has high support and acquisition costs.
- DIY tax software already competes heavily on simple guidance and refund confidence.
- A chat transcript is not enough for CPA review, source evidence, or audit defense.

TaxAgent can still use conversation for onboarding and missing-item follow-up, but conversation should feed the Tax File Graph. It should not be the product's center of gravity.

## Why AI Tax Workbench Is Stronger

An AI tax workbench is stronger because it fits where the real bottleneck exists: collecting, normalizing, reviewing, and proving client tax data before and around existing tax preparation software.

TaxAgent should sit before and around incumbents:

- Before TaxCycle, ProFile, Taxprep, Cantax, and DT Max by preparing a review-ready intake package.
- Around QuickBooks and Excel by absorbing source documents, client answers, and exceptions that do not fit cleanly in bookkeeping systems.
- Around practice management systems by creating tax-file-specific readiness, evidence, and workpaper outputs rather than replacing CRM, billing, portal, or task management.
- Before consumer DIY filing by helping users produce a CPA-ready package, even if they later self-file elsewhere.

## First Target Customer

The first customer should be a Canadian small tax firm preparing high volumes of T1 returns, starting with simple-to-moderate files where:

- Source documents are repetitive but arrive scattered.
- Missing item chasing is common.
- Staff time is spent on low-judgment data entry and document organization.
- Reviewers need faster source verification.
- Firms are not ready to replace their tax software.

This buyer is more attractive than a pure consumer buyer because the firm has recurring seasonal volume, acute labor pressure, willingness to pay for time savings, and a professional review layer that reduces product liability.

Complexity note: simple/student/young-worker returns are the lowest-pain files for firms — they are already fast. CPA discovery interviews should test whether moderate-complexity files (T5008 with ACB issues, rental income, self-employment) yield higher per-file value. The initial build targets simple files for technical validation, but the commercial wedge may require moderate-complexity support to justify per-file pricing.

## First Product Wedge

Wedge: AI T1 Intake + Review Workbench for Canadian small tax firms.

Initial scope:

- Ingest common T1 slips and supporting documents.
- Extract document data into structured records.
- Preserve source evidence and provenance.
- Show readiness score.
- Show exception queue.
- Support staff correction and correction memory.
- Produce a CPA-reviewable package.
- Export a structured package for existing tax prep workflows.

Do not start by building:

- Full TaxCycle replacement.
- NETFILE submission.
- Broad connector network.
- T5018.
- CRA XSD production wiring.
- Multi-province enterprise tax suite.
- User-id-primary ownership model.
- AI tax math.

## Quantitative Model

These are planning assumptions, not validated facts. They must be tested in CPA discovery interviews.

Base small-firm assumptions:

- 250 to 1,000 T1 clients per firm per season.
- 150 to 600 simple or semi-simple T1 files suitable for the first wedge.
- 15 to 35 minutes saved per suitable file from source organization, extraction review, missing-item detection, and workpaper prep.
- CAD 30 to CAD 55 loaded hourly cost for junior/admin seasonal staff.
- CAD 75 to CAD 175 effective hourly value for reviewer/CPA time protected from low-level checking.

Illustrative pilot economics:

| Scenario | Suitable files | Minutes saved/file | Hours saved | Staff cost value at CAD 40/hr | Reviewer value at CAD 125/hr |
| --- | ---: | ---: | ---: | ---: | ---: |
| Conservative | 150 | 15 | 37.5 | CAD 1,500 | CAD 4,688 |
| Base | 300 | 25 | 125.0 | CAD 5,000 | CAD 15,625 |
| Strong | 600 | 35 | 350.0 | CAD 14,000 | CAD 43,750 |

Capacity impact:

- If a firm saves 20 to 30 minutes on 300 files, it frees 100 to 150 seasonal hours.
- At 60 to 90 minutes of total staff effort per simple file, that could support roughly 65 to 150 additional simple files if demand exists.
- The stronger value may be fewer overtime hours, faster turnaround, less reviewer fatigue, and better client experience rather than pure additional file volume.

Pricing options to test:

- CAD 5 to CAD 15 per processed client file.
- CAD 199 to CAD 599 per month during tax season plus usage.
- CAD 1,000 to CAD 5,000 fixed seasonal pilot for a small firm.
- Higher pricing only after export reliability, reviewer trust, and measurable time savings are proven.

Pilot metrics:

- Minutes from client upload to review-ready package.
- Percentage of files with complete source-linked evidence.
- OCR extraction correction rate by field and document type.
- Error introduction rate: how often TaxAgent extraction produces values that the reviewer must correct versus values that were correct on first pass. If this rate exceeds roughly 15 to 20 percent of fields, net time savings can go negative and firms will stop using the tool.
- Missing-item detection precision and recall.
- Reviewer time per file before and after.
- Number of client follow-up touches avoided.
- Number of errors caught before tax software entry.
- Staff and reviewer satisfaction.
- Files processed per staff member per day.

Interview validation needed:

- Actual T1 volume by firm segment.
- Current time spent by task: intake, chase, prep, review, workpaper, admin.
- Current software stack and pain points.
- Willingness to pay per file or per season.
- Which export format firms would accept before direct tax software integrations.
- Minimum evidence quality required before reviewers trust the package.

## Recommended Next Build Sequence

Before product expansion:

1. Start Phase 0 CPA discovery interviews immediately — they do not require database constraints and must not be blocked by hardening work.
2. In parallel, complete Stage 6D as split hardening: Stage 6D1 read-only monitoring, then Stage 6D2 `NOT NULL` only if checks pass.
3. Keep RLS consolidation delayed unless there is a concrete benefit and a safer combined policy is reviewed.
4. Define the Tax File Graph data model and UI object model.
5. Build Phase 1 Tax File Graph MVP with a minimal export primitive (CSV/JSON of slips, calculations, and provenance) — firms cannot evaluate the workbench without being able to get data out.

Phase 0 discovery and Stage 6D hardening are independent workstreams. Do not sequence them linearly.

Delay:

- `slip-store.ts` production switch.
- T5018.
- CRA XSD production wiring.
- Direct TaxCycle replacement.
- NETFILE certification.
- Full connector suite.
- RLS consolidation.
- Consumer-first chatbot positioning.

## Final Recommendation

Positioning statement:

TaxAgent is the AI tax workbench for Canadian T1 firms that turns scattered client documents, answers, corrections, CRA-grounded rules, and deterministic calculations into review-ready, source-linked tax files.

First target customer:

Small Canadian tax firms with high T1 volume, constrained seasonal staff capacity, and existing dependence on TaxCycle, ProFile, Taxprep, Cantax, DT Max, QuickBooks, Excel, email, and portals.

First product wedge:

AI T1 Intake + Review Workbench for simple/student/young-worker returns.

Next build after Stage 6D preflight:

Start Phase 0 CPA discovery interviews in parallel with Stage 6D1 monitoring and Stage 6D2 `NOT NULL` (if live prechecks pass). Then build Phase 1 Tax File Graph MVP with minimal export primitive.

What to validate before coding more:

- CPA workflow pain severity.
- Willingness to pay.
- Export requirements.
- Evidence and provenance trust threshold.
- File types and edge cases in real client packages.
- Whether firms want TaxAgent before tax software, inside practice management, or as a standalone review workbench.
