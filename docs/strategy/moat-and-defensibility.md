# Moat And Defensibility

TaxAgent's defensibility should come from accumulated tax-file workflow data, evidence links, correction memory, and reviewer trust. Connectors help distribution and data ingestion, but they are not the moat by themselves.

## Easy To Copy

These should not be treated as durable advantages:

- A chatbot that answers tax questions.
- Basic slip upload.
- Generic OCR over tax slips.
- Simple tax explanations.
- A Gmail or Outlook connector.
- A clean upload UI.
- A basic checklist.
- A generic client portal.
- A generic practice management task list.
- A one-off export CSV.

These features are still useful, but incumbents and new entrants can reproduce them. If TaxAgent is only these things, it will be forced into price competition or acquisition dependence.

## Harder To Copy

Harder advantages require compounding over real reviewed files:

- Tax File Graph connecting documents, extracted values, corrections, calculations, provenance, exceptions, review notes, and export artifacts.
- Source-linked workpapers that answer where every important number came from.
- Reviewed correction memory by document type, issuer, field, firm, and reviewer.
- CRA-grounded rules database with versioned citations and deterministic application boundaries.
- Readiness scoring tuned from real missing-item and exception outcomes.
- Exception review workflows that fit how small firms actually work in tax season.
- Firm-specific file history across tax years.
- Reviewer trust earned through source evidence, low hallucination risk, and consistent outputs.
- Pilot data showing actual minutes saved, error rates reduced, and files completed faster.

## Tax File Graph As The Core Moat

The Tax File Graph should become the durable system of record around the filing process.

Graph nodes:

- Account identity.
- Tax profile and tax year.
- Client answers.
- Documents and files.
- OCR extraction rows.
- Saved slips.
- Field-level corrections.
- Deductions and credits.
- Calculation history.
- Provenance-rich tax returns.
- CRA rules and cited constants.
- Exceptions.
- Review notes.
- Client follow-up requests and responses.
- Export/workpaper artifacts.

Graph edges:

- Source document supports extracted field.
- Extracted field became saved slip field.
- Saved slip field supports tax engine input.
- Engine result field is supported by provenance record.
- Client answer supports or conflicts with source evidence.
- Correction replaced extracted value.
- Exception points to missing, conflicting, or suspicious evidence.
- Reviewer note resolves exception.
- Export artifact contains reviewed graph state.

This graph is hard to copy because it requires more than OCR. It requires the workflow and review loop that labels what was wrong, what was corrected, what was trusted, and what was exported.

## Correction Memory

Correction memory is valuable only if it is grounded in reviewed corrections, not arbitrary model preferences.

Potential memory dimensions:

- Slip type.
- Issuer name.
- Source format.
- Field/box number.
- Original extracted value.
- Corrected value.
- Reviewer identity or firm.
- Confidence and recurrence.
- Tax year.

Use cases:

- Improve extraction review suggestions.
- Flag fields that are often wrong for a specific issuer or document type.
- Reduce repeated corrections for the same firm.
- Improve readiness and exception scoring.

Safety boundary:

- Correction memory can suggest or flag.
- A human reviewer should approve changes before they affect final reviewed outputs.
- It must not change tax math.

## Source-Linked Workpapers

Source-linked workpapers are defensible because they solve CPA trust, not just data entry.

The workpaper should show:

- What documents were received.
- What values were extracted.
- What values were corrected.
- What values support each major tax line.
- What is missing or unresolved.
- Who reviewed what.
- What was exported.

This is the bridge between AI extraction and professional acceptance. If a reviewer cannot audit the source, the automation will not be trusted in real tax season.

## CRA-Grounded Rule Layer

The tax truth source must be deterministic and cited.

Rules:

- Tax constants belong in code or a cited rules database, not LLM prompts.
- CRA/ITA/source citations must be versioned.
- AI can retrieve and summarize cited sources, but cannot create tax rules from memory.
- Tax math stays in deterministic TypeScript.

This protects the product from the largest credibility failure: a confident but unsupported tax answer.

## CPA Workflow Adoption

Workflow adoption is a moat because firms build habits around tax season processes. Once TaxAgent becomes the place where intake, evidence, corrections, exceptions, and review status live, switching requires re-training, migration, and trust rebuilding.

Adoption compounding loops:

- More files create more correction memory.
- More reviewed exceptions improve readiness rules.
- More firm-specific exports improve fit with existing tools.
- More historical files improve year-over-year review.
- More reviewer notes improve staff training and consistency.

## What Incumbents Can Copy

Incumbents can copy:

- OCR slip extraction.
- Chat-style guidance.
- Upload checklists.
- Basic document organization.
- Direct import into their own tax software.
- Practice management task fields.

Incumbents may have advantages:

- Existing user base.
- Existing tax software trust.
- Filing workflow integration.
- Support teams and certification experience.
- Brand credibility.

## What Incumbents Will Find Harder

Incumbents may find it harder to copy:

- A product centered on source-linked pre-prep and exception review rather than final form preparation.
- Firm-specific correction memory across messy client documents.
- Neutral workbench positioning around multiple prep tools.
- A graph architecture built from OCR, corrections, provenance, and review notes from day one.
- Rapid workflow experimentation with small firms.

This is not guaranteed. The moat must be built through real pilot usage, not strategy language.

## Defensibility Risks

- If TaxAgent remains consumer-first, incumbents can outspend it on distribution.
- If provenance is hidden, CPAs will not trust the automation.
- If connectors become the focus too early, the product becomes a commodity ingestion layer.
- If RLS or ownership work is rushed, data trust is damaged.
- If AI ever does math or cites from memory, credibility drops.
- If export is weak, firms will not adopt the workbench.
- If correction memory is not reviewed, it can compound errors.
- If Thomson Reuters brings SurePrep-like source-doc extraction to DT Max for Canadian forms, the neutral workbench wedge narrows for DT Max firms. TaxAgent's defense is multi-tool neutrality and correction memory outside any single vendor ecosystem.
- CRA Auto-fill already provides structured slip data for government-held documents. TaxAgent's OCR value is strongest for non-CRA documents, client-provided PDFs, and new clients without CRA linkage. Do not position OCR alone as the moat.

## Defensibility Priorities

1. Keep `profile_id` canonical and the tax file data model coherent.
2. Build the Tax File Graph over existing OCR, corrections, slips, calculations, and provenance.
3. Make source evidence visible and reviewable.
4. Add correction memory only from reviewed changes.
5. Add readiness and exceptions from deterministic/cited rules.
6. Build export/workpaper outputs that fit real firm workflows.
7. Validate with pilots before broad integrations.
