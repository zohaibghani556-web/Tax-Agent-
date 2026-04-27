# Unfinished Work Register

This register tracks work that must not be forgotten and work that must not be done prematurely. It is intentionally conservative: TaxAgent is tax software, so sequencing, reviewability, and rollback matter.

Risk levels:

- Low: mostly documentation, discovery, or additive work.
- Medium: changes user workflow or persistence behavior but can be staged safely.
- High: could affect data safety, tax correctness, RLS, production continuity, or user trust.

## Register

| Item | Current status | Why it matters | Dependencies | Risk | When to do it | What not to do prematurely |
| --- | --- | --- | --- | --- | --- | --- |
| Stage 6D preflight and monitoring | Preflight doc exists; next step is Stage 6D1 read-only monitoring | Confirms live data is ready before hard constraints | Clean null checks, orphan checks, mismatch checks, smoke tests, backup status | Low | Immediately before any Stage 6D migration | Do not bundle with RLS changes or unrelated schema work |
| Stage 6D `NOT NULL` constraints | Not applied | Converts ownership alignment from convention into enforced schema | Stage 6D1 clean results, human-reviewed migration, acceptable backup posture | Medium | After clean prechecks | Do not add constraints if any candidate table has nulls, mismatches, or legacy write gaps |
| RLS consolidation | Delayed | May simplify policies or improve direct user-id queries, but can weaken canonical ownership if done badly | Stage 6D2 complete, policy inventory, multi-user RLS tests | High | Later separate stage only if justified | Do not switch to user_id-only RLS; do not combine with `NOT NULL` |
| `slip-store.ts` production safety | Present but not production canonical | It could eventually support all slip types, but current canonical path is `tax-data.ts` | Full audit, parity with `tax-data.ts`, tests, RLS/data model review | High | After current production path is stable and a migration plan exists | Do not switch production writes to `slip-store.ts` yet |
| CRA XSD schema wiring | Generated schemas exist but are not active | Useful for future CRA XML import and stricter validation | Mapping audit, error handling, extraction pipeline design, tests | Medium | After Tax File Graph MVP or when XML import becomes a priority | Do not wire schemas into OCR validation casually; do not block current slip path |
| T5018 | Delayed | Common contractor slip could expand market, but adds type/schema/engine surface area | Slip type schema, UI fields, OCR prompt, tax engine mapping, DB constraint migration | Medium | After existing slip/workbench loop is trusted | Do not add slip type without DB, UI, extraction, and tests together |
| Cross-slip validation | Not built | Detects duplicate/missing/conflicting values across slips and client answers | Tax File Graph, source linkage, rule database, review UI | High | After graph MVP and provenance UI | Do not implement as model-memory tax logic |
| Provenance UI | Not built | Makes `tax_returns.provenance_records` useful to reviewers | Stable provenance schema, graph UI, source document viewer | Medium | Phase 1 to Phase 3 | Do not show unsupported explanations or uncited tax assertions |
| CPA review queue | Not built | Turns raw data into work routing and exception review | Firm/user roles, file statuses, readiness score, reviewer notes | Medium | Phase 2 | Do not build a generic task manager that competes with Karbon/TaxDome/Canopy |
| Source-linked workpaper UI | Not built | Core evidence layer for CPA trust and audit defense | Provenance UI, source document storage, reviewer sign-off model | High | Phase 3 | Do not export unsupported numbers or hide source uncertainty |
| Readiness score | Not built | Helps firms prioritize complete files and chase missing items | Missing-item rules, source coverage, correction status, review status | Medium | Phase 4 | Do not present score as tax correctness guarantee |
| Client follow-up workflow | Not built | Converts exceptions into structured client questions and reduces back-and-forth | Readiness score, missing-item engine, secure messaging/portal strategy | Medium | Phase 5 | Do not build broad CRM or billing |
| Connector strategy | Not built | Connectors reduce friction, but are not the moat | Discovery interviews, graph model, minimum viable import/export needs | Medium | Phase 6 after wedge validation | Do not start with Gmail/QuickBooks breadth before review workflow is valuable |
| Export package | Not built | Needed to fit before TaxCycle, ProFile, Taxprep, Cantax, DT Max, Excel, or workpapers | Graph schema, workpaper UI, firm pilot feedback | High | Phase 7 | Do not promise direct two-way tax software sync before manual export works |
| Firm beta | Not started | Needed to validate time savings, trust, and willingness to pay | Phase 1 to Phase 4 usable workflow, security review, support plan | High | Phase 8 | Do not onboard firms before evidence, rollback, and support flows are ready |
| CPA discovery interviews | Not started | Prevents building the wrong product around imagined workflow pain | Target segment list, interview script, competitive map | Low | Before major product coding beyond hardening | Do not infer CPA workflow solely from consumer assumptions |
| CRA-grounded research assistant | Not built | Valuable later, but must be source-grounded and separate from calculations | Rules database, citation ingestion, retrieval evaluation, guardrails | High | Phase 9 | Do not let AI cite from memory or affect math |
| Advanced integrations | Not built | Could increase lock-in after workflow value is proven | Stable export, firm beta feedback, partner/API feasibility | High | Phase 10 | Do not build integrations before wedge/product-market fit |
| Multi-year chat/profile flow | Partially implicit; many paths still default to 2025 | Future product will need multi-year filing context consistency | Tax year selector, chat API changes, tests, schema constraints | Medium | After T1 workbench flow is stable | Do not hardcode active years in new write paths |
| Backup posture before hardening | Needs confirmation before Stage 6D2 | Schema hardening should not happen without recovery confidence | Supabase backup status, manual backup, deploy plan | High | Before any production constraint migration | Do not run hardening SQL without backup confirmation |

## Current Priority Order

1. CPA discovery interviews and workflow validation (Phase 0) — start immediately, do not block on hardening.
2. Stage 6D1 monitoring and final read-only prechecks (in parallel with Phase 0).
3. Stage 6D2 `NOT NULL` only if prechecks pass.
4. Tax File Graph MVP with minimal export primitive (Phase 1).
5. CPA Review Queue (Phase 2).
6. Source-linked Workpaper (Phase 3).
7. Missing-item/Exception Engine (Phase 4).

## Explicit Delay List

Do not prioritize these until their dependencies are met:

- RLS consolidation.
- `slip-store.ts` production switch.
- CRA XSD production wiring.
- T5018.
- Broad connector suite.
- Direct tax software replacement.
- NETFILE certification.
- AI tax research assistant.
- Consumer-only chatbot expansion.
