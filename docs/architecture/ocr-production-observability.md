# OCR Production Observability

Status: planning and read-only monitoring bundle. This is not a migration and
does not change Supabase.

## Purpose

The synthetic OCR benchmark proves the extractor can read controlled fixture
documents. Corporation-level slip reading also needs production-aligned evidence:
which real uploads go blank, which boxes users correct, whether reviewed OCR rows
become `tax_slips`, whether duplicate protections fire, and whether calculation
provenance still points back to slip sources.

Use
[`ocr-production-observability-readonly-sql-bundle.sql`](./ocr-production-observability-readonly-sql-bundle.sql)
as the first Supabase-aligned OCR quality check. It is a manual, read-only SQL
bundle for the Supabase SQL Editor. Codex must not run it against production.

## What It Measures

| Area | Source tables | Reason |
| --- | --- | --- |
| Extraction health | `slip_extractions` | Finds failed, blank, low-confidence, unreviewed, or missing-hash OCR attempts. |
| Field presence | `slip_extractions.boxes` | Shows which slip boxes are consistently missing, blank, or zero after extraction. |
| Review linkage | `slip_extractions`, `tax_slips` | Confirms reviewed OCR records become profile-owned tax inputs through `source_extraction_id`. |
| Correction rate | `slip_corrections`, `slip_extractions` | Converts user edits into field-level quality signals. |
| Duplicate signals | `tax_slips.file_hash`, `tax_slips.source_extraction_id`, key boxes | Catches repeated uploads and logical duplicate candidates without deleting anything. |
| Provenance coverage | `tax_returns.provenance_records`, `tax_slips` | Checks whether slip-backed calculation outputs remain traceable. |

## How To Use

1. Run the product smoke test for the slip families under review.
2. Paste the read-only SQL bundle into the Supabase SQL Editor.
3. Save the result summary in project notes or a PR comment, not in source
   control if it contains private data.
4. Triage failures in this order: extraction blank/failure rows, missing review
   linkage, field correction hotspots, duplicate candidates, provenance gaps.

## Expected Interpretation

- `blank_boxes_rows` greater than 0 means extraction or normalization still has
  a real-world failure mode even if synthetic fixtures pass.
- Reviewed OCR rows without a linked `tax_slips` row usually point to review-save
  metadata propagation, `upsertSlips`, profile/year alignment, or client state.
- High correction counts for one field should become an extractor, prompt, or
  normalization task before broadening to more slip families.
- Duplicate candidates are warning signals only. Do not delete rows from this
  report.
- Slips-mode `tax_returns` with reviewed slips but no slip-backed provenance
  need calculation-path review; AI must not fill that gap with tax math.

## Safety Boundaries

- Do not apply SQL automatically.
- Do not place this file in `supabase/migrations`.
- Do not change RLS from this work.
- Do not create new tables until the read-only metrics prove the missing
  operational requirement.
- Do not switch production reads or writes to `slip-store.ts`.
- Do not wire CRA XSD schemas into active extraction or validation as part of
  observability.
