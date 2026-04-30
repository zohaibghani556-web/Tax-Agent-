# OCR Source Inventory

This inventory turns public CRA/OCR research links into an implementation map. It does not wire new services into production. It defines what each source is for, what it cannot solve, and how it should feed the fixture harness.

## Principles

- Use official CRA sources for slip layouts, box labels, and XML field definitions.
- Use synthetic values for committed fixtures; keep real taxpayer documents out of git.
- Use public OCR datasets for robustness research, not Canadian tax correctness.
- Compare OCR engines through local/private benchmark adapters before production use.
- Keep the deterministic tax engine separate from OCR and AI extraction.

## Source Classes

| Source class | Examples | Use | Not for |
| --- | --- | --- | --- |
| Official CRA blank/fillable forms | T4, T4A, T2202, T5, T5008, T3, T5007, T4E, T4RSP, T4RIF, T4FHSA | Synthetic visual fixtures with known expected boxes | Tax calculations |
| Official CRA sample/info pages | T4A(P), T4A(OAS) | Sample-layout fixture design where blank PDFs are not available | Production schema enforcement by itself |
| CRA XSD files | `scripts/cra-xsds/*.xsd` | Field existence, XML tag mapping, structural validation, eventual CRA XML export | Reading blurry PDFs/images |
| OCR/PDF engines | Claude, OpenAI, Google Document AI, AWS Textract, Mistral OCR, PaddleOCR, docTR, Tesseract, PyMuPDF, PDFBox | Benchmark candidates and preprocessing research | Automatic production replacement |
| Public datasets | FUNSD, SROIE, DocVQA, Kleister, RVL-CDIP | General OCR/layout robustness and classification research | Canadian tax slip ground truth |

## Supported Slip Source Map

The executable source map lives in `src/lib/extraction/ocr-source-manifest.ts` and is covered by `src/lib/extraction/ocr-source-manifest.test.ts`.

| Slip | Visual source | XSD source | Fixture strategy |
| --- | --- | --- | --- |
| T4 | CRA fillable form | `t4.xsd`, `T619_T4.xsd` | Synthetic fillable PDF variants |
| T4A | CRA fillable form | `t4a.xsd`, `T619_T4A.xsd` | Synthetic fillable PDF variants |
| T2202 | CRA fillable form | `t2202.xsd`, `T619_T2202.xsd` | Synthetic fillable PDF variants |
| T5 | CRA fillable form | `t5.xsd`, `T619_T5.xsd` | Synthetic fillable PDF variants |
| T5008 | CRA fillable form | `t5008.xsd`, `T619_T5008.xsd` | Synthetic fillable PDF variants |
| T3 | CRA fillable form | `t3.xsd`, `T619_T3.xsd` | Synthetic fillable PDF variants |
| T4E | CRA fillable form | `t4e.xsd`, `T619_T4E.xsd` | Synthetic fillable PDF variants |
| T5007 | CRA fillable form | `t5007.xsd`, `T619_T5007.xsd` | Synthetic fillable PDF variants |
| T4A(P) | CRA sample/info page | `t4a-p.xsd`, `T619_T4A_P.xsd` | Synthetic sample-image variants |
| T4A(OAS) | CRA sample/info page | `t4a-oas.xsd`, `T619_T4A_OAS.xsd` | Synthetic sample-image variants |
| T4RSP | CRA fillable form | `t4rsp.xsd`, `T619_T4RSP.xsd` | Synthetic fillable PDF variants |
| T4RIF | CRA fillable form | `t4rif.xsd`, `T619_T4RIF.xsd` | Synthetic fillable PDF variants |
| RRSP receipt | Issuer-style receipt | `rrsp.xsd`, `T619_RRSP.xsd` | Private/synthetic issuer-layout variants |
| T4FHSA | CRA fillable form | `t4fhsa.xsd`, `T619_T4FHSA.xsd` | Synthetic fillable PDF variants |

## OCR Engine Evaluation Order

1. Baseline: current Anthropic pipeline with `npm run capture:ocr-fixture` and `npm run eval:ocr`.
2. Preprocessing: test PDF text extraction/rendering with PyMuPDF or PDFBox before model calls.
3. Local OCR baselines: Tesseract, PaddleOCR, and docTR against the same fixtures.
4. Paid service comparisons: OpenAI, Mistral, Google Document AI, and AWS Textract behind local-only adapters.
5. Production decision only after fixture pass rates and latency/cost are measured.

## XSD Role

The XSDs are already present under `scripts/cra-xsds/`. They should be used for:

- app-field to CRA XML tag mapping;
- validating extracted box keys against official slip schemas;
- generating or checking TypeScript/Zod types;
- eventual CRA-compatible XML export.

They should not be expected to fix OCR blank reads or visual box confusion. OCR must first read the visual document correctly; XSD validation then checks whether the result is structurally valid.

The current safe offline check is:

```bash
npm run report:ocr-xsd
```

This command reads the generated CRA XSD box maps plus report-only supplemental
maps for supported slips that are not generated yet, then compares them with the
app-supported OCR/review fields. It does not run extraction, write to Supabase,
apply SQL, or wire XSD validation into production uploads.

## Non-Goals For This Stage

- No SQL or production Supabase work.
- No migration creation.
- No RLS changes.
- No new slip types.
- No CRA XSD wiring into production extraction.
- No paid OCR provider in production.
- No tax math changes.
