# OCR Fixture Evaluation

The OCR contract tests prove that the slip-reading code path is internally aligned. The fixture evaluator is the next layer: it scores captured OCR outputs against expected boxes so extraction quality can be measured by slip type and field.

## What This Covers

- All 14 currently supported slip types.
- Expected issuer, tax year, and box values.
- Missing boxes.
- Wrong numeric or text values.
- Unexpected boxes.
- Unknown fields outside the supported slip contract.
- Blocking validation flags such as `blank_extraction`.

This is deterministic. It does not call Anthropic, Supabase, Vercel, or production services.

## What This Does Not Do Yet

- It does not store real taxpayer documents in the repo.
- It does not run live model extraction from image/PDF files.
- It does not wire CRA XSD schemas into OCR.
- It does not add new slip types.
- It does not perform tax math.

## Fixture Location

Committed synthetic fixtures live here:

```text
src/lib/extraction/fixtures/ocr-eval/
```

Private real-document fixtures, if used locally, must stay out of git:

```text
ocr-fixtures/private/
src/lib/extraction/fixtures/ocr-eval/private/
```

Both private paths are ignored by `.gitignore`.

## Running The Eval

Run the committed synthetic fixture set:

```bash
npm run eval:ocr
```

Run a specific local fixture file or directory:

```bash
npm run eval:ocr -- path/to/fixtures.json
npm run eval:ocr -- path/to/fixture-directory
```

The command exits non-zero if any fixture fails.

## Fixture Shape

Each fixture compares expected values to a captured OCR result:

```json
{
  "id": "synthetic-t4-basic",
  "slipType": "t4",
  "expected": {
    "issuerName": "Acme Payroll Inc.",
    "taxYear": 2025,
    "boxes": {
      "box14": 52000,
      "box22": 7800
    }
  },
  "actual": {
    "issuerName": "Acme Payroll Inc.",
    "taxYear": 2025,
    "boxes": {
      "box14": 52000,
      "box22": 7800
    },
    "flags": []
  }
}
```

Use redacted or synthetic values only in committed fixtures. For real-world OCR quality testing, store source files and captured outputs outside git, then commit only aggregated findings or sanitized fixtures.

## Quality Gate Direction

Before firm beta, build a private fixture set with representative samples for every supported slip type. Track:

- Pass rate by slip type.
- Field accuracy by box.
- Blank extraction rate.
- Low-confidence rate.
- Correction rate after human review.

This moves OCR work from anecdotal smoke testing to measurable intake quality.
