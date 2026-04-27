# Product Phases

These phases turn the master plan into staged build scope. Each phase should be treated as a gate: do not advance because a feature is exciting; advance because the prior phase met its success criteria.

## Phase 0: Strategy And Discovery

Goal:

- Validate the CPA wedge, workflow pain, willingness to pay, and minimum trusted output before building more product surface.

Exact features:

- CPA discovery interview script.
- Interview notes template.
- Firm segment list.
- Pilot hypothesis.
- Baseline time-and-motion model.
- Export requirements inventory.

Data model needed:

- None beyond documentation.

What to build:

- Research artifacts, interview notes, decision memo.

What not to build:

- Connectors, review queue, RLS consolidation, T5018, XSD wiring, tax software integrations.

Dependencies:

- Current architecture docs.
- Stage 6D preflight findings.

Success metrics:

- 10 to 15 CPA/tax preparer interviews.
- Clear top 3 workflow pain points.
- Clear first export requirement.
- At least 3 firms willing to review a prototype or pilot proposal.

Risks:

- Founder bias toward building before validating workflow.
- Overweighting consumer pain and underweighting firm adoption constraints.

Go/no-go:

- Go if firms confirm intake, document chase, source review, and workpaper prep are painful enough to pay for.
- No-go if firms only want direct tax software replacement or if no one will review a pilot.

## Phase 1: Tax File Graph MVP

Goal:

- Make the Tax File Graph the core product object.

Exact features:

- File-level view for one taxpayer/profile/year.
- Nodes for profile, documents, extraction rows, saved slips, corrections, calculations, tax return provenance, and client answers.
- Edges for source-of, corrected-by, supports-line, conflicts-with, missing-from, and reviewed-by.
- Minimal source preview and field evidence panel.
- Graph status model: draft, needs review, reviewed, export ready.

Data model needed:

- Existing `tax_profiles`, `slip_extractions`, `slip_corrections`, `tax_slips`, `tax_calculations`, `tax_returns`.
- New tables may be needed later for graph events, review notes, and file status, but this phase should first prove an app-layer graph assembled from existing records.

What to build:

- Read model and UI view over current data.
- Source-linked field panel for current slips and provenance records.
- Minimal export primitive: CSV/JSON download of slips, calculations, and provenance for a given profile and tax year. Firms cannot evaluate the workbench without getting data out. This is not the full export package (Phase 7) but a basic structured data export so pilot evaluation is possible.
- Tests that graph assembly does not change tax math.

What not to build:

- New slip types.
- CRA XSD wiring.
- Formatted workpaper PDF export (Phase 3/7).
- Direct integration with tax software.
- AI-generated tax conclusions.

Dependencies:

- Stable Stage 6D direction.
- Existing OCR, corrections, slips, and tax returns.

Success metrics:

- Reviewer can answer "where did this number come from?" for key slip-backed fields.
- Existing live test file can be shown as a coherent tax file graph.
- No tax engine output changes.

Risks:

- Over-modeling graph storage too early.
- Treating graph visualization as the product instead of review workflow.

Go/no-go:

- Go if reviewers can trace sources faster than in the current app.
- No-go if source provenance is incomplete or confusing.

## Phase 2: CPA Review Queue

Goal:

- Turn files into reviewable work items.

Exact features:

- Firm/team review queue.
- File statuses.
- Assigned preparer/reviewer fields.
- Exception count.
- Readiness score placeholder.
- Filters by tax year, client, status, exception type, and last updated.
- Reviewer note and sign-off skeleton.

Data model needed:

- `review_files` or equivalent status table keyed by `profile_id` and `tax_year`.
- `review_notes` keyed by file and optionally by graph node.
- Firm/user role model if not already present.

What to build:

- Queue UI.
- Status transitions.
- Minimal role-aware access model, without broad RLS consolidation unless separately planned.

What not to build:

- Generic practice management replacement.
- Billing, proposals, broad CRM, or staff capacity planning.

Dependencies:

- Phase 1 graph view.
- CPA interview validation.

Success metrics:

- Staff can triage files without opening each file.
- Reviewer can focus on exceptions first.
- Queue maps to real firm workflow from interviews.

Risks:

- Competing with Karbon, TaxDome, Canopy, or QBO practice management instead of augmenting tax review.

Go/no-go:

- Go if queue reduces manual tracking in spreadsheets or email.
- No-go if firms say their current practice management queue is sufficient and only need evidence/export.

## Phase 3: Source-Linked Workpaper

Goal:

- Produce review-ready workpapers where every key value links back to source evidence or a manual/corrected entry.

Exact features:

- Workpaper package per file.
- Source thumbnails/previews.
- Field-level evidence links.
- Correction history.
- Reviewer notes.
- Sign-off marks.
- PDF or structured export draft.

Data model needed:

- Workpaper artifact metadata.
- Review sign-offs.
- Field-level evidence references if not fully covered by provenance records.

What to build:

- Workpaper UI and export preview.
- Evidence coverage report.
- Correction memory surfacing.

What not to build:

- Full direct import into every tax prep tool.
- AI-generated unsupported workpaper conclusions.

Dependencies:

- Phase 1 graph.
- Phase 2 review queue.
- Stable provenance records.

Success metrics:

- Reviewer can complete a source review without hunting through raw PDFs.
- Workpaper output is acceptable to at least one pilot firm.

Risks:

- Workpaper output not matching firm standards.
- Too much UI complexity before firms validate format.

Go/no-go:

- Go if pilot firms accept the package format.
- No-go if reviewers still prefer raw PDFs because evidence links are incomplete.

## Phase 4: Missing-Item And Exception Engine

Goal:

- Identify incomplete, inconsistent, or suspicious tax file data before final prep.

Exact features:

- Missing slip/document checks.
- Cross-slip duplicate/conflict checks.
- Year-over-year variance checks where prior file history exists.
- Client-answer-to-slip consistency checks.
- Exception severity and ownership.
- Readiness score v1.

Data model needed:

- `exceptions` table keyed by file and graph node.
- `readiness_scores` or calculated view.
- Rule versioning tied to cited source or internal deterministic rule.

What to build:

- Deterministic exception rules.
- Exception queue inside file and review queue.
- Readiness score explanation.

What not to build:

- LLM tax judgment.
- Unsupported CRA rule inference.
- Broad tax planning engine.

Dependencies:

- Phase 1 graph.
- Phase 3 source-linked workpapers.
- Rules database or cited deterministic checks.

Success metrics:

- High-value missing items are caught before reviewer finalization.
- Low false-positive rate in pilot files.

Risks:

- Alert fatigue.
- Rules interpreted as guarantees.

Go/no-go:

- Go if exceptions reliably save reviewer time.
- No-go if false positives overwhelm staff.

## Phase 5: Client Follow-Up Agent

Goal:

- Convert missing items and exceptions into structured, tracked client follow-up.

Exact features:

- Client question generation from deterministic exceptions.
- CPA-editable message drafts.
- Client response capture.
- Response-to-graph linking.
- Follow-up status and reminders.

Data model needed:

- `client_requests`.
- `client_responses`.
- Link to graph nodes and exceptions.

What to build:

- Draft generation with human review.
- Secure response capture.
- File update from client response, with reviewer approval.

What not to build:

- Autonomous final answers.
- Broad email client replacement.
- Unreviewed client data writes into tax calculations.

Dependencies:

- Phase 4 exception engine.
- Portal or messaging decision.

Success metrics:

- Fewer manual client follow-up messages.
- Faster missing-item resolution.
- CPA maintains approval control.

Risks:

- Client confusion.
- Over-automation of sensitive tax communication.

Go/no-go:

- Go if firms want TaxAgent to draft and track follow-up.
- No-go if firms only want internal review package first.

## Phase 6: Autoprep Inbox And Connectors

Goal:

- Reduce intake friction after the review workflow is proven.

Exact features:

- Upload inbox.
- Email-forwarding ingestion.
- Optional Gmail/Microsoft mailbox import after security review.
- QuickBooks/Xero import exploration where firm interviews justify it.
- Connector audit log.

Data model needed:

- `ingestion_sources`.
- `ingestion_events`.
- External account tokens, encrypted and scoped.

What to build:

- One or two highest-value ingestion paths from interviews.

What not to build:

- Broad connector marketplace.
- Unscoped mailbox scraping.
- Connector-first moat story.

Dependencies:

- Phase 1 to Phase 5 validation.
- Security/privacy review.

Success metrics:

- Measurable reduction in manual upload/chase.
- Low connector failure/support burden.

Risks:

- OAuth/security complexity.
- Connectors distract from core evidence workflow.

Go/no-go:

- Go if manual upload is the bottleneck after workbench value is proven.
- No-go if connectors are being used to compensate for weak product value.

## Phase 7: Export Package

Goal:

- Fit cleanly before existing tax prep and workpaper systems.

Exact features:

- Export package with normalized slip data.
- Source-linked workpaper PDF.
- CSV/JSON export.
- Reviewer sign-off summary.
- Exception report.
- Optional per-firm export template.

Data model needed:

- `export_packages`.
- Export artifact storage metadata.
- Export versioning.

What to build:

- Manual-download export that works for at least one pilot workflow.
- Structured data export before direct integrations.

What not to build:

- Fragile robotic UI automation into tax software.
- Direct integration with every incumbent.

Dependencies:

- Source-linked workpaper and reviewer acceptance.

Success metrics:

- Pilot firm can use exported package in its current prep workflow.
- Export reduces re-keying or review time.

Risks:

- Export format not accepted by firms.
- Incumbent software import limitations.

Go/no-go:

- Go if at least one firm can process a file using the package.
- No-go if export creates more cleanup than it saves.

## Phase 8: Firm Beta

Goal:

- Validate real tax-season usage with small firms.

Exact features:

- Pilot onboarding.
- File processing support workflow.
- Usage analytics.
- Time-savings measurement.
- Error/correction reporting.
- Security and support runbooks.

Data model needed:

- Firm/account model if not already built.
- Pilot metrics tables or analytics events.

What to build:

- Production-grade pilot support, observability, and review feedback loop.

What not to build:

- Large-scale marketing.
- Enterprise features.
- Direct replacement promises.

Dependencies:

- Phases 1 to 7 enough for real workflow.

Success metrics:

- Pilot files processed.
- Time saved/file.
- Reviewer trust score.
- Retention/willingness to pay after pilot.

Risks:

- Support load.
- Data privacy expectations.
- Incomplete edge cases.

Go/no-go:

- Go if pilot firms agree to measurable success criteria.
- No-go if product cannot safely handle real client data workflow.

## Phase 9: CRA-Grounded Research Assistant

Goal:

- Add source-grounded tax research support without contaminating tax math.

Exact features:

- CRA/ITA/source retrieval.
- Citation-first answers.
- Rule snippets linked to file exceptions.
- Clear "research support only" boundary.

Data model needed:

- Rules/citations database.
- Source documents and versions.
- Retrieval evaluation records.

What to build:

- Cited research assistance for reviewers.

What not to build:

- AI tax calculations.
- Model-memory citations.
- Final tax advice without reviewer control.

Dependencies:

- Rules database, retrieval evaluation, guardrails.

Success metrics:

- Reviewers find cited sources faster.
- No uncited tax claims in outputs.

Risks:

- Hallucination.
- Legal/professional reliance risk.

Go/no-go:

- Go if retrieval can be evaluated and citations are reliable.
- No-go if assistant cannot distinguish source-grounded answers from model memory.

## Phase 10: Advanced Integrations

Goal:

- Deepen defensibility after workflow adoption.

Exact features:

- Direct exports/imports to selected tax software if feasible.
- Practice management sync.
- Prior-year file import.
- Firm-specific correction memory.
- Multi-year file history.

Data model needed:

- Integration mappings.
- Firm configuration.
- Prior-year graph history.

What to build:

- Integrations demanded by beta firms and justified by usage data.

What not to build:

- Integration breadth without depth.
- Anything that makes TaxAgent a brittle dependency in filing season.

Dependencies:

- Firm beta results and stable export package.

Success metrics:

- Reduced manual work beyond export package.
- Lower correction rate over time.
- Higher firm retention.

Risks:

- Incumbent API limitations.
- Support burden.
- Integration fragility during tax season.

Go/no-go:

- Go only for integrations that solve validated workflow bottlenecks.
- No-go if integration complexity outruns product maturity.
