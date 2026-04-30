# OCR Synthetic Capture Results

Last updated: 2026-04-30

This note summarizes local/private OCR fixture captures. It does not include
source documents or captured OCR JSON; those remain ignored under
`ocr-fixtures/private/`.

## 2026-04-30 Synthetic Baseline

Commands:

```bash
npm run gen:ocr-synthetic-fixtures
npm run gen:ocr-image-variants
npm run capture:ocr-synthetic-fixtures -- --set pdf --force
npm run capture:ocr-synthetic-fixtures -- --set images --force --delay-ms 5000
npm run report:ocr -- ocr-fixtures/private/captured/cra-synthetic
npm run report:ocr -- ocr-fixtures/private/captured/cra-synthetic-images
```

Results:

| Corpus | Fixtures | Pass rate | Field accuracy | Matched fields | Missing / mismatch / unexpected |
| --- | ---: | ---: | ---: | ---: | ---: |
| Synthetic PDFs | 22 | 22/22 | 100.0% | 84/84 | 0 / 0 / 0 |
| Synthetic images | 56 | 56/56 | 100.0% | 168/168 | 0 / 0 / 0 |

Notes:

- One T3 PDF capture timed out on the first run, then passed on targeted
  recapture. Treat this as a provider latency/retry signal, not a field mapping
  failure.
- An unpaced full image run hit Anthropic input-token rate limits after the
  first 32 image captures. The paced rerun with `--delay-ms 5000` completed
  cleanly.
- These fixtures are intentionally simple synthetic documents. The next quality
  gate is official-layout/private-user fixture coverage with the same report
  commands.
