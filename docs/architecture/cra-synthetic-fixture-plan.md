# CRA Synthetic OCR Fixture Plan

The goal is to create a private, repeatable OCR benchmark from official CRA layouts and known fake values. This closes the gap between "it worked on one smoke test" and measured slip-reading quality.

## Fixture Matrix

Each supported slip should eventually have these private fixture variants:

| Variant | Purpose |
| --- | --- |
| Clean fillable PDF | Baseline reading of official layout |
| Standard print PDF | Non-fillable visual baseline |
| Phone screenshot | Mobile upload path and camera distortion |
| Rotated/skewed image | Orientation robustness |
| Compressed/low contrast image | Real-world upload degradation |
| Duplicate-copy page | Avoid double-reading repeated slips on one page |
| Sparse boxes | Ensure blank boxes are omitted, not zeroed |
| Dense boxes | Ensure many boxes can be read without drift |

## Priority Order

1. T4, T4A, T2202: already found product smoke issues and core student/employment use cases.
2. T5, T5008, T3: high calculation-risk investment slips.
3. RRSP receipt, T4RSP, T4RIF, T4FHSA: registered-plan workflows.
4. T4E, T5007, T4A(P), T4A(OAS): benefits/pension workflows.

## Expected-Value Rules

- Expected files must be hand-authored or generated from the synthetic input data.
- Never let an AI model define the expected values.
- Use exact app keys from `src/lib/slips/slip-fields.ts`.
- Include only boxes that are printed and intended to be extracted.
- Keep real taxpayer documents and captured outputs in ignored private paths.

## Local Folder Layout

```text
ocr-fixtures/private/
  source/
    cra-synthetic/
    real-user-approved/
  expected/
    cra-synthetic/
    real-user-approved/
  captured/
    cra-synthetic/
    real-user-approved/
  reports/
```

## Workflow

1. Generate the first clean synthetic source PDFs and expected values:

```bash
npm run gen:ocr-synthetic-fixtures
```

This writes fake local source PDFs to `ocr-fixtures/private/source/cra-synthetic/`
and matching expected JSON files to `ocr-fixtures/private/expected/cra-synthetic/`.

2. For official-layout variants, download the official CRA fillable PDF or use an official CRA sample page.
3. Create a fake-value source document.
4. Save the expected boxes as JSON under `ocr-fixtures/private/expected/`.
5. Capture OCR output:

```bash
npm run capture:ocr-fixture -- \
  --file ocr-fixtures/private/source/cra-synthetic/t4-clean.pdf \
  --slip-type t4 \
  --expected ocr-fixtures/private/expected/cra-synthetic/t4-clean.json \
  --out ocr-fixtures/private/captured/cra-synthetic/t4-clean.json \
  --id cra-synthetic-t4-clean
```

6. Evaluate:

```bash
npm run eval:ocr -- ocr-fixtures/private/captured/cra-synthetic
```

7. Convert every failure into either a prompt/parser fix or a documented unsupported condition.

## Quality Gates

Before a firm beta, the private fixture corpus should track:

- pass rate by slip type;
- field accuracy by box;
- blank extraction rate;
- low-confidence rate;
- unexpected-box rate;
- median and p95 extraction time;
- cost per successful extraction;
- failures by source condition: clean PDF, screenshot, rotated, low contrast, duplicate-copy.

## Implementation Sequence

1. Maintain `ocr-source-manifest.ts` as the canonical source map.
2. Maintain `npm run gen:ocr-synthetic-fixtures` as the local-only starter generator for clean fake PDFs and expected values.
3. Add a local-only CRA form download/reference script.
4. Add degradation generation for image variants.
5. Add a report command that summarizes private eval results by slip and box.
6. Add optional OCR engine adapters only after the Anthropic benchmark is stable.

## Safety

This plan uses private local fixtures and docs only. It does not add slip types, wire XSD schemas into active extraction, change production persistence, or change tax calculation behavior.
