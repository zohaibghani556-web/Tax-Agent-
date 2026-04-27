# Pilot Scorecard

Purpose: define measurable pilot criteria for the TaxAgent firm-first wedge. The pilot should prove workflow value before broader product build, connectors, RLS consolidation, CRA XSD wiring, or tax software replacement work.

## Pilot Objective

Validate whether TaxAgent can turn scattered T1 client documents into a review-ready, source-linked package that saves time and earns reviewer trust without replacing the firm's existing tax software.

## Pilot Scope

Recommended first pilot:

- 1 to 3 small Canadian tax firms.
- 10 to 30 anonymized or consented T1 files per firm.
- Start with simple-to-moderate Ontario T1 files.
- Include a mix of CRA-held slips and non-CRA documents.
- Do not promise filing, NETFILE, or replacement of TaxCycle, ProFile, Taxprep, Cantax, DT Max, or other tools.

Out of scope:

- Production filing.
- Autonomous tax advice.
- AI tax math.
- Direct tax software replacement.
- Broad connector setup.
- T5018 or new slip type expansion unless separately approved.

## Scorecard Metrics

| Metric | Definition | How to measure | Target for pilot signal | Red flag |
| --- | --- | --- | --- | --- |
| Minutes saved per file | Net time saved compared with current workflow | Stopwatch or screen-recorded timing of current process vs TaxAgent-assisted process for matched file types. Self-reported estimates are acceptable for early interviews but must be replaced with observed timing in the pilot. | 15+ minutes for target segment, or clear reviewer-time savings | Zero or negative time savings after corrections/export cleanup |
| Error introduction rate | Share of fields where TaxAgent creates a new wrong value that would not have existed otherwise | Reviewer marks wrong extracted or transformed fields caused by TaxAgent | Below 10% of reviewed fields for pilot confidence | Above 15-20% of reviewed fields, especially on high-value boxes |
| OCR correction rate | Share of extracted fields that require human correction | Count corrected fields / extracted fields by document type and field | Trending down by document type; acceptable for low-risk fields | Repeated corrections on core fields like T4 employment income or tax deducted |
| Duplicate detection value | Value of duplicate prevention or duplicate alerts | Count duplicate slip/document cases caught; ask reviewer whether it helped | At least one meaningful duplicate issue caught in pilot set, or reviewer confirms prevention is valuable | Duplicate false positives create extra review burden |
| Missing-item detection value | Accuracy and usefulness of missing-item flags | Track true positive, false positive, false negative missing-item flags | High-value true positives; false positives tolerated if low and explainable | Reviewers ignore alerts due to noise |
| Review time reduction | Change in reviewer minutes per file | Reviewer time logs before/after or self-reported ranges | 10%+ reduction, or source lookup time materially reduced | Reviewer spends more time validating TaxAgent than current process |
| Client follow-up reduction | Fewer or clearer follow-up touches | Count follow-up requests per file before/after | Reduced touches or better first follow-up quality | More client confusion or repeated clarification |
| CPA trust score | Reviewer confidence in source-linked package | 1-5 score after each file | Average 4+ for source traceability | Average below 3 or reviewers refuse to rely on outputs |
| Willingness to pay | Whether firm would pay after pilot | Ask after measured workflow; test pricing bands | Clear yes at a specific per-file/seasonal price | "Useful but would not pay" |
| Export usefulness | Fit of CSV/JSON/PDF/package output into workflow | Reviewer/preparer rates export from 1-5 and describes cleanup | 4+ or clear path to accepted format | Export creates more work than manual entry |

## Qualitative Questions After Each Pilot File

1. What did TaxAgent save you from doing?
2. What did TaxAgent add to your workload?
3. Which extracted values did you trust immediately?
4. Which values did you re-check manually?
5. Were source links easy to follow?
6. Did the package make review faster?
7. Did missing-item or duplicate alerts help?
8. What export cleanup was required?
9. Would you use this on the next similar file?
10. Would you trust a junior staff member to use this with reviewer oversight?

## File-Level Score Sheet

```text
Firm:
File segment:
Tax software used:
Document count:
Non-CRA document count:
CRA Auto-fill available:
Baseline minutes:
TaxAgent-assisted minutes:
Minutes saved:
Extracted fields reviewed:
Fields corrected:
TaxAgent-introduced errors:
Duplicate issues caught:
Missing-item true positives:
Missing-item false positives:
Missing-item false negatives:
Reviewer trust score (1-5):
Export usefulness score (1-5):
Would use again?:
Would pay?:
Notes:
```

## Pilot-Level Rollup

Track these across all pilot files:

- Total files processed.
- Files by segment: simple, student/young worker, moderate, rental, self-employment, investment.
- Average minutes saved per file.
- Median minutes saved per file.
- Files with negative time savings.
- OCR correction rate by document type.
- Error introduction rate by document type and field.
- Missing-item detection precision and recall.
- Duplicate alerts: true positives and false positives.
- Reviewer trust score average and distribution.
- Export usefulness score average and distribution.
- Firm willingness to pay by pricing model.

## Go/No-Go Criteria After Pilot

Go toward Phase 1/2 build if:

- Firms confirm source-linked intake/review is a real workflow pain.
- Reviewers trust the evidence trail.
- Net time savings are positive for a defined file segment.
- Error introduction rate is below the firm's tolerance.
- Export output is usable enough for pilot workflow.
- At least one firm expresses willingness to pay or continue testing.

Delay or refocus if:

- Simple files are too low-pain to justify pricing.
- AFR makes slip OCR irrelevant for the interviewed segment and non-CRA document pain is weak.
- Reviewer trust is low even with source links.
- Export cleanup cancels time savings.
- Firms want direct tax software replacement rather than upstream workbench.
- Privacy or AI concerns block adoption.

## Pricing Signals To Capture

Ask after showing measured value:

- Would you pay per processed file?
- Would you pay a fixed seasonal pilot fee?
- Would you pay monthly during tax season?
- What price would be easy to approve?
- What price would need partner approval?
- Would you pay more for moderate-complexity files?
- Would you pay only if export integrates with your current software?

## Pilot Evidence Needed Before Build Expansion

- 10 to 15 CPA/preparer discovery interviews.
- At least 3 firms willing to review a prototype or pilot.
- Clear ranking of file segments by pain.
- Clear export format preference.
- Acceptable correction/error threshold.
- Confirmed stance on AFR impact.
- Privacy and consent requirements for using real files.
