# OCR Quality To Tax File Graph Plan

TaxAgent's OCR work is only valuable if it feeds the Tax File Graph, reviewer
trust, and pilot scorecard metrics. This plan keeps the current OCR quality
push aligned with the architecture, strategy, discovery, and Supabase ownership
model.

## Current Baseline

Verified locally on 2026-04-30:

| Corpus | Fixtures | Pass rate | Field accuracy | Matched fields |
| --- | ---: | ---: | ---: | ---: |
| Committed public synthetic eval fixtures | 14 | 14/14 | 100.0% | 42/42 |
| Private captured synthetic PDFs | 22 | 22/22 | 100.0% | 84/84 |
| Private captured synthetic images | 56 | 56/56 | 100.0% | 168/168 |
| Recursive private captured corpus | 81 | 81/81 | 100.0% | 264/264 |

What this proves:

- The app schemas, prompts, parsers, fixture harness, and report commands can
  read the current supported synthetic slips across PDF and image variants.
- T4, T4A, and T2202 smoke-test failures have a repeatable measurement path.
- Batch capture needs pacing because Anthropic input-token rate limits can
  create false OCR failures if the corpus is captured too quickly.

What this does not prove yet:

- Official CRA form-layout accuracy for every supported slip.
- Real issuer layout accuracy beyond the private files already captured.
- Correction rate on real user/pilot files.
- Duplicate detection value on real repeated uploads.
- Reviewer trust or time savings in a firm workflow.
- Production persistence metrics in Supabase.

## Alignment With Product Strategy

The master plan defines TaxAgent as an AI T1 Intake + Review Workbench, not a
chatbot and not a tax software replacement. OCR must therefore produce
reviewable evidence, not just values.

OCR quality work should directly support these Phase 1 Tax File Graph objects:

- document/source file;
- `slip_extractions` row;
- saved `tax_slips` row;
- `slip_corrections` row;
- calculation and `tax_returns.provenance_records`;
- exception/duplicate/readiness signals;
- exportable reviewed data package.

Do not optimize OCR as an isolated benchmark. Every quality metric should help a
reviewer answer:

- What document produced this value?
- Was it extracted, corrected, or manually entered?
- Is the value supported by source evidence?
- Did a duplicate or conflicting source exist?
- Is this file ready for review/export?

## Supabase Mapping

Use existing production tables first. Do not create or apply migrations for this
stage.

| Quality object | Existing table/source | Current status | Near-term use |
| --- | --- | --- | --- |
| Raw OCR attempt | `slip_extractions` | Live, `user_id`-owned | Source for extraction status, raw boxes, model response, file hash, and pre-profile OCR evidence. |
| Human correction | `slip_corrections` | Live, `user_id` + `extraction_id` owned | Source for correction rate, reviewer trust, and field-level error analysis. |
| Reviewed slip | `tax_slips` | Live, `profile_id` canonical plus denormalized `user_id` | Source for tax engine inputs and duplicate slip analysis. |
| Calculation history | `tax_calculations` | Live append-only history | Audit trail for calculation runs; do not replace with `tax_returns`. |
| Latest return/provenance | `tax_returns` | Live profile-owned latest return | Source for reviewable return lines and Tax File Graph provenance. |
| Deductions/credits | `deductions_credits` | Live, Stage 6C/6F aligned | Must remain profile-owned and consistent with calculation path. |

Later tables may be needed for file statuses, review notes, exceptions, and
readiness scores. Those belong to Phase 1/2 planning and should be designed
after discovery confirms the workflow shape.

## Metrics To Derive Before New Tables

These can be computed from existing private fixture reports and existing
Supabase tables without changing RLS or applying SQL:

| Metric | Source | Pilot scorecard mapping |
| --- | --- | --- |
| OCR pass rate by slip type | `npm run report:ocr`, `slip_extractions` status fields if available | OCR correction rate, error introduction rate |
| Field accuracy by box | Fixture expected vs captured actual; later corrections vs original boxes | Error introduction rate |
| Blank extraction rate | `actual.boxes` empty or validation `blank_extraction` flags | OCR quality and blank extraction backlog |
| Low-confidence rate | validation flags | Review workload and trust score |
| Correction rate | `slip_corrections` grouped by slip type/field | OCR correction rate |
| Duplicate signal value | `tax_slips.file_hash`, `source_extraction_id`, same issuer/year/key boxes | Duplicate detection value |
| Source coverage | extraction linked to saved slip and provenance source | CPA trust score, review time reduction |
| Capture latency and rate-limit events | local capture logs, later API route telemetry | Upload responsiveness and operational reliability |

## Corporation-Level OCR Gates

Treat "corporation level" as passing gates, not as a vague quality label.

1. Coverage gate:
   - Every supported slip has generated/private source fixtures.
   - Every supported slip has at least clean PDF and image degradation captures.
   - Official CRA layout or issuer-style layout exists for priority slips.

2. Accuracy gate:
   - Synthetic and official-layout fixtures pass at 100% for required/core
     fields.
   - Real/private pilot files have measured correction/error rates by field.
   - Repeated failures convert into prompt/parser/preprocessing fixes or clear
     unsupported-condition documentation.

3. Safety gate:
   - Blank extraction is a visible failure/needs-review state, not a silent
     success.
   - Low-confidence and blocking flags are shown to the user/reviewer.
   - AI extraction never performs tax math.
   - Deterministic engine and provenance own tax output.

4. Data alignment gate:
   - Every saved slip links back to `slip_extractions` where available.
   - Corrections link to extraction rows.
   - Calculations use `tax-data.ts`/profile-owned canonical paths.
   - `tax_returns.provenance_records` can trace slip-backed lines to source
     slip boxes.

5. Duplicate gate:
   - Exact duplicate source files do not double-count.
   - Legitimate multiple T4s remain allowed.
   - Same issuer/year/key-box duplicate warnings are measured for reviewer
     usefulness before becoming hard blockers.

6. Reviewer gate:
   - A reviewer can inspect source, extracted value, correction history, and
     provenance in one file context.
   - Private/pilot files record correction rate and reviewer trust score.
   - Export output is usable enough for firm review.

7. Operational gate:
   - Batch capture is paced to avoid provider rate-limit false failures.
   - Upload and filing-guide UX expose progress, timeout, retry, and failure
     states.
   - Route-level latency is measured before broad performance rewrites.

## Next Implementation Sequence

1. Private real-file benchmark hygiene:
   - Keep real files and captured outputs ignored under `ocr-fixtures/private`.
   - Add expected JSON only locally unless sanitized.
   - Use recursive `npm run report:ocr -- ocr-fixtures/private/captured` for
     the whole private corpus.

2. OCR production observability design:
   - Draft read-only monitoring SQL for `slip_extractions`,
     `slip_corrections`, and `tax_slips`.
   - Measure blank-box rate, correction rate, duplicate signals, and linkage
     completeness.
   - Keep SQL read-only and docs-only until reviewed.

3. Tax File Graph read model:
   - Build an app-layer read model over existing tables first.
   - Include extraction rows, saved slips, corrections, calculations, returns,
     and provenance.
   - Do not introduce graph storage until the read model proves useful.

4. Duplicate and exception audit:
   - Add tests for exact duplicate T4 upload and legitimate two-employer T4s.
   - Draft deterministic duplicate warning rules.
   - Do not block legitimate multiple-employer files.

5. Pilot/discovery alignment:
   - Use discovery interviews to validate which documents and exports firms
     actually need.
   - Track the pilot scorecard metrics against private fixture/correction data.

## Explicit Non-Goals

- No production SQL execution.
- No migration creation as part of this alignment plan.
- No RLS changes.
- No switch to `slip-store.ts`.
- No new slip types.
- No CRA XSD runtime wiring.
- No AI tax math.
- No tax software replacement or NETFILE scope.

## Immediate Next Safe Work

The next safest implementation item is a read-only OCR observability bundle in
`docs/` that mirrors the Stage 6D1 monitoring style:

- blank extraction count/rate by slip type;
- correction count/rate by slip type and field;
- extraction-to-tax-slip linkage completeness;
- duplicate file hash and duplicate `source_extraction_id` candidates;
- same issuer/year/key-box duplicate warnings for T4/T4A/T2202;
- orphaned correction/extraction checks.

Use [`ocr-production-observability.md`](./ocr-production-observability.md) and
[`ocr-production-observability-readonly-sql-bundle.sql`](./ocr-production-observability-readonly-sql-bundle.sql)
as the first Supabase-aligned quality gate before further OCR runtime changes.

That gives us Supabase alignment without applying SQL or changing production
behavior.
