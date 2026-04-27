# Research Assumptions To Validate

Purpose: keep Phase 0 honest. These assumptions must be validated through CPA, tax preparer, bookkeeper, and consumer interviews before building more product surface.

## Highest-Priority Assumptions

| Assumption | Why it matters | Validation method | Strong signal | Weak or negative signal |
| --- | --- | --- | --- | --- |
| Simple/student/young-worker files are a viable first wedge | Current strategy starts with simpler files, but firms may already handle them quickly | CPA interviews, pilot time tracking by file segment | Firms report real intake/review pain and measurable time savings | Firms say simple files are already too fast/low-margin to justify a tool |
| Moderate-complexity files may be the better commercial wedge | Rental, self-employment, investment, and non-CRA documents may create more pain | Ask firms to rank pain by file type; pilot multiple segments | Moderate files show higher minutes saved and willingness to pay | Moderate files require too much judgment for MVP |
| Export format matters more than direct integration at first | A manual export can validate value faster than building integrations | Ask firms what they would accept for pilot: PDF, CSV, Excel, JSON, copy/paste | Firms accept manual structured export for pilot | Firms require direct TaxCycle/ProFile/Taxprep/DT Max integration before trying |
| Standalone workbench is acceptable initially | TaxAgent needs to fit before/around existing tools without replacing them | Ask where the product should live in workflow | Firms accept a separate intake/review workspace if export is useful | Firms refuse another tool/login |
| CRA Auto-fill reduces slip-OCR value | AFR may make T4/T5/T3 OCR less valuable for firms | Ask every firm about AFR usage, trust, and gaps | Firms say non-CRA docs/source evidence remain painful | Firms say AFR and current tools already solve the target pain |
| Acceptable correction/error rate is strict | If TaxAgent creates too many wrong fields, it increases review time | Ask tolerance; measure OCR correction and error introduction rate in pilot | Firms tolerate low correction rates with source links | One or two core-field errors destroy trust |
| Source-linked workpapers are valuable | The moat depends on evidence and review trust | Ask reviewers how they verify sources and archive workpapers | Reviewers say source links reduce review time | Reviewers prefer existing workpaper process and see no value |
| Missing-item detection saves time | Readiness scoring depends on useful missing-item logic | Ask common missing items; pilot true/false positives | Firms value accurate missing-item flags | False positives cause alert fatigue |
| Client follow-up drafts are useful if reviewed | Follow-up agent is later roadmap, but discovery should test desire | Ask who writes follow-ups and what language is acceptable | Staff want editable drafts linked to missing items | Firms worry clients will be confused or messages will be risky |
| Firms will pay for time savings and trust | Without willingness to pay, the wedge is weak | Ask pricing after value discussion; pilot post-scorecard | Firms name a price or pilot budget | "Useful but not worth paying for" |

## Simple Versus Moderate-Complexity Wedge

Questions to validate:

- Are student/young-worker files painful enough for firms, or are they already efficient?
- Which file types produce the most preventable review time?
- Are moderate files more commercially attractive despite higher product complexity?
- Does the first wedge need rental, self-employment, donations/medical, or T5008 support to be valuable?
- Which segment has the best combination of high pain and low product risk?

Decision rule:

- Use simple files first for technical validation if needed.
- Use the file segment with the highest measured time savings and trust score for commercial positioning.
- Do not assume the easiest technical segment is the best business wedge.

## Export Format Preference

Formats to test:

- Source-linked PDF workpaper.
- CSV.
- Excel.
- JSON.
- Copy/paste preparer summary.
- Per-slip summary.
- Exception report.
- Direct integration later.

Questions to validate:

- What output would let a preparer use TaxAgent without redoing the work?
- What format would a reviewer trust?
- Which fields must be present in a minimum export?
- Is manual download acceptable for a pilot?
- How much cleanup kills the value?

Decision rule:

- Build the simplest export that lets firms evaluate real workflow value.
- Do not build direct integrations before export preference is validated.

## Standalone Versus Integration Preference

Questions to validate:

- Would firms tolerate a separate review workbench?
- Which existing system should TaxAgent sit beside?
- Does the user expect TaxAgent to be a portal, pre-prep workspace, workpaper generator, or tax software plugin?
- Which integration is mandatory versus nice to have?
- What workflow handoff is acceptable for tax season?

Decision rule:

- If standalone is acceptable, prioritize source-linked workbench and manual export.
- If standalone is not acceptable, identify the single highest-value integration before building broad connectors.

## AFR Reducing Slip-OCR Value

Questions to validate:

- Does the firm use CRA Auto-fill for most T1 files?
- Which slips are already reliably imported?
- Which slips/documents still arrive outside AFR?
- Are client-provided PDFs needed only as evidence, or as primary data?
- How often does AFR data need source-document confirmation?
- Are new clients or authorization delays a meaningful pain?

Decision rule:

- If AFR solves most slip-entry pain, position TaxAgent around non-CRA documents, source evidence, missing items, and workpapers.
- Do not position generic slip OCR as the main moat.

## Acceptable Correction And Error Rate

Definitions:

- OCR correction rate: percentage of extracted fields that a reviewer edits.
- Error introduction rate: percentage of fields where TaxAgent creates a wrong value that would not have existed otherwise.
- False missing-item rate: percentage of missing-item alerts that reviewers reject.

Questions to validate:

- What correction rate is acceptable if source review is fast?
- Which field errors are tolerable, and which are fatal?
- Is a wrong low-value field acceptable if flagged for review?
- Does one wrong core tax field break product trust?
- What false-positive rate is acceptable for missing items?

Decision rule:

- Treat error introduction rate as more important than OCR correction rate.
- Do not proceed to firm beta if reviewers spend more time validating TaxAgent than doing current workflow.

## Price Sensitivity

Pricing models to test:

- Per file.
- Per firm per season.
- Monthly during tax season.
- Flat pilot fee.
- Tiered by file complexity.
- Free discovery/prototype, paid pilot.

Questions to validate:

- What is the approval path for a new tax-season tool?
- What price is easy to approve?
- What price requires partner approval?
- Would the firm pay before measured results?
- Would the firm pay only after time savings are proven?
- Would pricing by file complexity feel fair?

Decision rule:

- Prefer pricing that maps to measurable file-level value.
- Avoid annual commitments before pilot proof.

## AI Trust And Privacy

Questions to validate:

- Which AI tasks are acceptable: extraction, classification, follow-up drafts, research, explanations?
- Which AI tasks are unacceptable: tax math, filing decisions, uncited tax advice?
- What disclosure is needed for cross-border AI processing?
- Does Canadian data residency matter?
- Is no-SIN collection important?
- What client consent is needed for pilot files?

Decision rule:

- Keep deterministic tax math and source-linked evidence as core trust language.
- Do not pitch AI autonomy; pitch reviewer-controlled workflow acceleration.

## Discovery Exit Criteria

Phase 0 is ready to move toward Phase 1 if:

- 10 to 15 CPA/tax preparer interviews are completed.
- At least 3 firms agree to review a prototype or pilot plan.
- The highest-pain file segment is identified.
- AFR impact is understood.
- Export format preference is clear enough to build a minimal export primitive.
- Acceptable correction/error thresholds are documented.
- At least one plausible pricing model survives interviews.
- Privacy and consent requirements for pilot files are clear.

Phase 0 should delay product build if:

- Firms do not see source-linked intake/review as urgent.
- Firms require direct integration before any pilot.
- Consumer demand is stronger but firm demand is weak, forcing a strategy decision.
- AI/privacy concerns block use of real or anonymized files.
- No segment shows measurable time savings potential.
