# Slip Extraction Pipeline — Architecture

## Overview

The extraction pipeline replaces the single-prompt OCR approach with a 3-stage pipeline using Claude's **structured outputs** to guarantee schema-compliant JSON. Each stage uses the cheapest model capable of its task.

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Stage 1    │    │   Stage 2    │    │   Stage 3    │
│ Classify     │───▶│ Extract      │───▶│ Validate     │
│ (Haiku 4.5)  │    │ (Sonnet 4.6) │    │ (Zod parse)  │
└──────────────┘    └──────────────┘    └──────────────┘
     ~$0.001             ~$0.01              free
```

## Stage 1 — Classification (Haiku 4.5)

**Purpose**: Identify which of the 14 supported CRA slip types the document is, or flag it as unsupported/unclear.

**Model**: `claude-haiku-4-5-20251001` — cheapest vision model, sufficient for reading a slip title.

**Structured output schema** (`ClassificationSchema`):
```json
{
  "slipType": "t4",         // enum of 19 possible values
  "confidence": 0.95,       // 0–1
  "notes": "Title reads..."
}
```

**Gating rules**:
- If `confidence < 0.70`: pipeline stops, user asked to select slip type manually
- If `slipType` is `unsupported`, `unclear`, `rc62`, `rc210`, `prior_year_return`: pipeline stops
- User can bypass classification entirely by passing `slipType` in the form data

## Stage 2 — Extraction (Sonnet 4.6)

**Purpose**: Extract all financial fields from the document using a slip-type-specific Zod schema.

**Model**: `claude-sonnet-4-6` — best accuracy for reading dollar amounts from varied document quality.

**Key design decisions**:

1. **Per-slip-type schemas**: Each slip type has its own Zod schema (e.g., `T4ExtractionSchema`) with only the fields relevant to that slip. The model cannot invent box numbers.

2. **Per-field confidence**: Every field wraps `{ value, confidence }` so the validation stage can flag uncertain extractions:
   ```json
   {
     "box14": { "value": 72400, "confidence": 0.95 },
     "box22": { "value": 14280, "confidence": 0.60 }
   }
   ```

3. **App-layer box keys**: Schemas use `box14`, `box22`, etc. (the keys the tax engine consumes), not CRA XSD internal field names like `empt_incamt`. The XSD-to-app mapping exists in `box-mappings.ts` for XML import; OCR uses app keys directly.

4. **zodOutputFormat()**: The Anthropic TypeScript SDK's `zodOutputFormat()` helper converts the Zod schema to JSON Schema, strips unsupported constraints (min/max, regex, etc.), and passes it via `output_config.format`. The response is guaranteed valid JSON matching the schema.

5. **Temperature 0**: OCR is pure extraction — randomness produces wrong numbers.

## Stage 3 — Validation (Zod + Confidence Threshold)

**Purpose**: Catch extraction errors and flag fields that need human review.

**No API call** — this stage is pure TypeScript.

**Checks performed**:
1. **Zod parse**: Re-validate the extraction result against the schema. Catches type mismatches.
2. **Confidence threshold**: Any field with `confidence < 0.85` is flagged for user review.
3. **Metadata confidence**: Issuer name below threshold is also flagged.

**Output statuses**:
| Status | Meaning |
|--------|---------|
| `success` | All fields valid, all confidence ≥ 0.85 |
| `needs_review` | Extraction succeeded but some fields flagged |
| `classification_failed` | Stage 1 failed or low confidence |
| `extraction_failed` | Stage 2 API error (after retries) |
| `validation_failed` | Zod parse produced errors |

## Error Handling

- **API errors**: Exponential backoff with up to 2 retries. Retries on 500, 529 (overloaded), and timeout errors.
- **Classification failure**: Returns a `classification_failed` result with instructions for manual selection.
- **Extraction failure**: Returns `extraction_failed` with user-friendly message.
- **Persistence failure**: Non-fatal. Extraction result is still returned even if Supabase insert fails.
- **Storage upload failure**: Non-fatal. The document is in memory as base64 for extraction.

## Data Flow

```
User uploads file (POST /api/ocr)
  │
  ├─ Auth check (Supabase JWT)
  ├─ CSRF validation
  ├─ Rate limit (20/hour/user)
  ├─ File validation (type, size)
  │
  ├─ Upload to Supabase Storage (ca-central-1)
  │   └─ Non-fatal if fails
  │
  ├─ Stage 1: classifyDocument(base64, mediaType)
  │   └─ Haiku structured output → ClassificationResult
  │
  ├─ Stage 2: extractFields(base64, mediaType, slipType)
  │   └─ Sonnet structured output → ExtractionResult
  │
  ├─ Stage 3: validateExtraction(extraction, slipType)
  │   └─ Zod parse + confidence flags → ValidationResult
  │
  ├─ Flatten to boxes (engine-ready format)
  │
  ├─ Persist to slip_extractions table
  │   └─ Includes raw_model_response for debugging
  │
  └─ Return OcrResult (no raw model data)
```

## Cost Estimates (per extraction)

| Stage | Model | Input tokens | Output tokens | Cost |
|-------|-------|-------------|---------------|------|
| Classification | Haiku 4.5 | ~1,500 | ~50 | ~$0.001 |
| Extraction | Sonnet 4.6 | ~2,000 | ~500 | ~$0.012 |
| **Total** | | | | **~$0.013** |

At 20 extractions/user/hour rate limit, maximum cost is ~$0.26/user/hour.

## Supported Slip Types

| Pipeline Code | Engine Code | Schema |
|--------------|-------------|--------|
| `t4` | `T4` | `T4ExtractionSchema` |
| `t4a` | `T4A` | `T4AExtractionSchema` |
| `t5` | `T5` | `T5ExtractionSchema` |
| `t5008` | `T5008` | `T5008ExtractionSchema` |
| `t3` | `T3` | `T3ExtractionSchema` |
| `t2202` | `T2202` | `T2202ExtractionSchema` |
| `t4e` | `T4E` | `T4EExtractionSchema` |
| `t5007` | `T5007` | `T5007ExtractionSchema` |
| `t4ap` | `T4AP` | `T4APExtractionSchema` |
| `t4aoas` | `T4AOAS` | `T4AOASExtractionSchema` |
| `t4rsp` | `T4RSP` | `T4RSPExtractionSchema` |
| `t4rif` | `T4RIF` | `T4RIFExtractionSchema` |
| `rrsp_receipt` | `RRSP-Receipt` | `RRSPReceiptExtractionSchema` |
| `t4fhsa` | `T4FHSA` | `T4FHSAExtractionSchema` |

## File Structure

```
src/lib/extraction/
  types.ts          — TypeScript interfaces for all pipeline stages
  schemas.ts        — Zod schemas for classification + 14 slip types
  schemas.test.ts   — 30 unit tests for schema validation
  pipeline.ts       — 3-stage pipeline implementation
  index.ts          — Public API exports

src/app/api/ocr/route.ts       — API route (rebuilt to use pipeline)
supabase/migrations/20260424000001_slip_extractions.sql — DB table + RLS
```

## Key Dependencies

- `@anthropic-ai/sdk` (^0.82.0) — `zodOutputFormat()` and `messages.create()` with `output_config`
- `zod` (^4.3.6) — Schema definitions, used by both structured outputs and validation
- No new dependencies added.
