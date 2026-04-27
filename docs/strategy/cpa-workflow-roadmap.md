# CPA Workflow Roadmap

TaxAgent's first firm product should reduce tax-season bottlenecks without asking firms to replace their existing tax software. The strongest workflow position is before and around TaxCycle, ProFile, Taxprep, Cantax, DT Max, QuickBooks, Excel, email, and client portals.

## Current CPA And Tax Preparer Workflow

Typical small-firm T1 flow:

1. Client sends documents by email, portal, upload link, in person, or mixed channels.
2. Admin or junior staff collect source documents and chase missing items.
3. Staff organize PDFs, photos, receipts, prior-year files, CRA slips, and client notes.
4. Staff enter slip values into TaxCycle, ProFile, Taxprep, Cantax, DT Max, or another prep system.
5. Staff manually track uncertain items in spreadsheets, notes, emails, or the tax software file.
6. Reviewer compares return output to source documents and prior-year expectations.
7. Client is contacted for missing or conflicting information.
8. Final review/sign-off occurs.
9. Return is filed through the firm's normal filing process.
10. Workpapers and source documents are archived.

## Pain Points

- Client documents arrive scattered across channels.
- Staff spend too much time sorting, naming, and re-checking documents.
- Missing item lists are often manual and inconsistent.
- Reviewers must hunt through source PDFs to confirm numbers.
- Corrections to OCR or staff entry are not remembered across files.
- Prior-year comparisons are manual or tool-specific.
- Workpaper quality varies by preparer.
- Practice management systems track tasks but not tax evidence.
- Tax software prepares returns but does not always solve upstream intake chaos.
- Documents CRA does not hold (receipts, rental statements, self-employment records, client-provided PDFs) still require manual intake and review.
- New clients without prior-year CRA linkage require full manual slip processing.

Note: CRA Auto-fill for Returns (AFR) has reduced the slip data entry pain for government-held slips (T4, T5, T3, etc.) in firms that use AFR-enabled software. The remaining high-value pain is for non-CRA documents, client-provided PDFs that supplement or contradict Auto-fill data, missing-item detection, source evidence review, and workpaper preparation. Do not overstate "repetitive slip entry" as the primary pain for AFR-enabled firms.

## Where TaxAgent Fits

TaxAgent should fit as a pre-prep and review workbench:

- Intake scattered source documents.
- Extract and normalize slip data.
- Preserve source evidence.
- Detect missing and conflicting items.
- Produce an exception queue.
- Support reviewer notes and sign-off.
- Export a review-ready package into the firm's existing prep workflow.

TaxAgent should not initially replace:

- TaxCycle, ProFile, Taxprep, Cantax, DT Max, or other filing engines.
- QuickBooks or bookkeeping systems.
- Karbon, TaxDome, Canopy, or other broad practice management systems.
- Caseware or full engagement workpaper platforms.

## Before And After Workflow

Before TaxAgent:

- Client sends mixed documents.
- Staff organize and enter data manually.
- Staff chase missing items by memory/checklists.
- Reviewer re-checks source documents from scratch.
- Workpapers are assembled late.
- Corrections are not systematically reused.

After TaxAgent:

- Client file is assembled into a Tax File Graph.
- Documents, extracted values, corrections, and client answers are linked.
- Readiness score highlights incomplete files.
- Exception queue routes judgment-heavy issues to reviewers.
- Source-linked workpaper is available before final prep.
- Export package carries reviewed data into existing software.
- Corrections improve future files after human review.

## Daily Tax Season Usage

Daily staff workflow:

- Open review queue.
- Sort by readiness and exception count.
- Process newly uploaded documents.
- Review extracted fields with source preview.
- Resolve low-risk corrections.
- Send structured follow-up drafts for missing items.
- Mark files export-ready.

Daily reviewer workflow:

- Open exception-heavy files first.
- Review source-linked fields rather than raw PDFs.
- Approve corrections and sign-offs.
- Check variance or missing-item alerts.
- Approve export package.

Weekly owner/manager workflow:

- Monitor file throughput.
- See bottlenecks by exception type.
- Identify clients with missing items.
- See staff capacity and reviewer load if queue data is available.
- Review pilot metrics: minutes saved, corrections, readiness, turnaround.

## Staff Role Change

TaxAgent should move staff away from:

- Manual data entry.
- Repeated document sorting.
- Unstructured client chasing.
- Re-checking every field without prioritization.

TaxAgent should move staff toward:

- Exception review.
- Source verification.
- Client communication quality.
- Advisory opportunities from clean data.
- Consistent workpaper preparation.

This is a workforce augmentation story, not an "AI replaces tax preparers" story.

## Consumer Workflow Analysis

Consumer pain:

- Tax documents are scattered across CRA, school portals, employers, brokerages, email, and paper.
- Users do not know what is missing.
- DIY software asks questions, but users may not understand why.
- Students and young workers often have simple returns but low confidence.
- Users who later hire a CPA often hand over incomplete or messy packages.

Student and young-worker use case:

- Upload T4, T2202, T5, RRSP/FHSA receipts, and rent/tuition-related documents.
- TaxAgent extracts and organizes evidence.
- User sees missing items and plain-language explanations.
- Output becomes either a guided self-prep package or CPA-ready package.

DIY filer use case:

- User builds a source-linked tax file before entering numbers in a certified filing product.
- TaxAgent helps identify missing documents and explains source coverage.
- Filing still happens through certified software or a preparer until TaxAgent pursues certification.

CPA-ready package use case:

- User uploads documents and answers guided questions.
- TaxAgent generates a structured package with documents, extracted values, corrections, and missing-item status.
- CPA receives cleaner intake and spends less time chasing basics.

How consumer product feeds firm product:

- Consumer intake can become the front door for CPA firms.
- Simple filers can graduate into firm-supported workflows when they need help.
- Consumer data should use the same Tax File Graph primitives so firm workflows do not require re-entry.

## Roadmap Implications

Near-term:

- Build evidence and review workflow before connectors.
- Keep exports practical and firm-accepted.
- Interview CPAs before finalizing queue and workpaper design.

Mid-term:

- Add readiness and exception scoring.
- Add client follow-up agent with CPA approval.
- Add firm-specific correction memory.

Long-term:

- Add selected connectors and integrations after the workbench is valuable.
- Add CRA-grounded research support only with citations and guardrails.
- Consider direct filing/certification only after the workbench and compliance foundation are mature.
