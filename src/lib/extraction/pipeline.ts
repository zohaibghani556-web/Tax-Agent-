/**
 * TaxAgent.ai — 3-Stage Slip Extraction Pipeline
 *
 * Stage 1: Classification (Haiku 4.5) — identifies slip type
 * Stage 2: Extraction (Sonnet 4.6) — extracts fields using structured outputs
 * Stage 3: Validation (Zod) — parses result, flags low-confidence fields
 *
 * Uses Claude's structured outputs (output_config.format) with zodOutputFormat()
 * to guarantee schema-compliant JSON from the model. No more regex-based JSON
 * extraction or prompt-based field enumeration.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { log } from '@/lib/logger';
import {
  ClassificationSchema,
  EXTRACTION_SCHEMAS,
  SLIP_TYPE_LABELS,
  PIPELINE_TO_ENGINE_TYPE,
  isExtractable,
} from './schemas';
import type {
  ClassifiableSlipType,
  ExtractableSlipType,
  ClassificationResult,
  ExtractionResult,
  ExtractedField,
  ValidationFlag,
  ValidationResult,
  PipelineResult,
  PipelineStatus,
} from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CLASSIFICATION_MODEL = 'claude-haiku-4-5-20251001';
const EXTRACTION_MODEL = 'claude-sonnet-4-6';

/** Fields below this confidence are flagged for human review */
const CONFIDENCE_THRESHOLD = 0.85;

/** Classification below this threshold → don't proceed to extraction */
const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.70;

const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Anthropic client (singleton, reuses connection pool)
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Retry helper — exponential backoff on API errors
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const isRetryable =
        lastError.message?.includes('overloaded') ||
        lastError.message?.includes('529') ||
        lastError.message?.includes('500') ||
        lastError.message?.includes('timeout');

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw lastError;
      }

      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
      log('warn', `extraction.${label}.retry`, {
        attempt: attempt + 1,
        delay,
        reason: lastError.message,
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Content block builder — images vs PDFs
// ---------------------------------------------------------------------------

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

function buildDocumentBlock(
  base64: string,
  mediaType: string,
): Anthropic.Messages.ContentBlockParam {
  if (mediaType === 'application/pdf') {
    // PDF document block
    return {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType as ImageMediaType,
      data: base64,
    },
  };
}

// ---------------------------------------------------------------------------
// Stage 1 — Classification (Haiku)
// ---------------------------------------------------------------------------

const CLASSIFICATION_SYSTEM = `You are a Canadian tax document classifier. Given an image or PDF of a document, identify which CRA tax slip type it is.

SLIP TYPES:
- t4: T4 — Statement of Remuneration Paid (from employer)
- t4a: T4A — Pension, Retirement, Annuity, and Other Income
- t4e: T4E — Employment Insurance benefits
- t5: T5 — Investment Income (interest, dividends)
- t5007: T5007 — Statement of Benefits (social assistance)
- t5008: T5008 — Securities Transactions (investment sales)
- t3: T3 — Trust Income Allocations
- t2202: T2202 — Tuition and Enrolment Certificate
- t4ap: T4A(P) — Canada Pension Plan Benefits
- t4aoas: T4A(OAS) — Old Age Security
- t4rsp: T4RSP — RRSP Income (withdrawal)
- t4rif: T4RIF — RRIF Income
- rrsp_receipt: RRSP Contribution Receipt (from bank/investment firm)
- t4fhsa: T4FHSA — First Home Savings Account
- rc62: RC62 — Universal Child Care Benefit
- rc210: RC210 — Working Income Tax Benefit advance
- prior_year_return: A previously filed T1 return or Notice of Assessment
- unsupported: A document type we don't support
- unclear: Cannot determine the document type

RULES:
- Look for the slip type identifier printed on the document (e.g. "T4", "T5008")
- Check for CRA form numbers, titles, and distinctive layouts
- T4A(P) and T4A(OAS) are distinct from T4A — classify them separately
- RRSP receipts are NOT T4RSP slips — T4RSP is for withdrawals, RRSP-Receipt is for contributions
- Set confidence to 1.0 if the slip type is clearly printed; 0.5-0.8 if partially visible; below 0.5 if guessing
- Use notes to explain what you see (e.g. "Title reads 'Statement of Remuneration Paid'")`;

async function classifyDocument(
  base64: string,
  mediaType: string,
): Promise<{ result: ClassificationResult; raw: unknown; usage: { input: number; output: number } }> {
  const client = getClient();
  const docBlock = buildDocumentBlock(base64, mediaType);

  const requestOptions =
    mediaType === 'application/pdf'
      ? { headers: { 'anthropic-beta': 'pdfs-2024-09-25' } }
      : undefined;

  const response = await withRetry(
    () =>
      client.messages.create(
        {
          model: CLASSIFICATION_MODEL,
          max_tokens: 256,
          temperature: 0,
          system: CLASSIFICATION_SYSTEM,
          messages: [
            {
              role: 'user',
              content: [
                docBlock,
                { type: 'text', text: 'Classify this Canadian tax document.' },
              ],
            },
          ],
          output_config: {
            format: zodOutputFormat(ClassificationSchema),
          },
        },
        requestOptions,
      ),
    'classification',
  );

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const parsed = JSON.parse(rawText) as ClassificationResult;

  return {
    result: parsed,
    raw: { model: CLASSIFICATION_MODEL, response: rawText },
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  };
}

// ---------------------------------------------------------------------------
// Stage 2 — Extraction (Sonnet)
// ---------------------------------------------------------------------------

function buildExtractionPrompt(slipType: ExtractableSlipType): string {
  const label = SLIP_TYPE_LABELS[slipType];
  return `You are a Canadian tax document data extractor. This document is a ${label}.

RULES:
- Extract ONLY the fields defined in the output schema. Do not invent additional fields.
- For each field, provide:
  - value: the numeric amount (or string for text fields) exactly as printed on the document
  - confidence: 0.0–1.0 indicating how certain you are of the extracted value
    - 1.0 = clearly printed and unambiguous
    - 0.7–0.9 = partially obscured but likely correct
    - Below 0.7 = estimated or very uncertain
- For metadata.issuerName: the employer, institution, or payer name printed on the slip
- For metadata.taxYear: the tax year printed on the slip (default 2025 if not visible)
- If a field is not present on the document, omit it (leave as null/undefined)
- All monetary values must be positive numbers (not strings). Use 0 for explicitly printed zeros.
- Do NOT guess amounts that aren't printed — omit the field instead.`;
}

async function extractFields(
  base64: string,
  mediaType: string,
  slipType: ExtractableSlipType,
): Promise<{ result: ExtractionResult; raw: unknown; usage: { input: number; output: number } }> {
  const client = getClient();
  const docBlock = buildDocumentBlock(base64, mediaType);
  const schema = EXTRACTION_SCHEMAS[slipType];

  const requestOptions =
    mediaType === 'application/pdf'
      ? { headers: { 'anthropic-beta': 'pdfs-2024-09-25' } }
      : undefined;

  const response = await withRetry(
    () =>
      client.messages.create(
        {
          model: EXTRACTION_MODEL,
          max_tokens: 4096,
          temperature: 0,
          system: buildExtractionPrompt(slipType),
          messages: [
            {
              role: 'user',
              content: [
                docBlock,
                { type: 'text', text: 'Extract all fields from this tax slip.' },
              ],
            },
          ],
          output_config: {
            format: zodOutputFormat(schema),
          },
        },
        requestOptions,
      ),
    'extraction',
  );

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const parsed = JSON.parse(rawText) as Record<string, unknown>;

  // Separate metadata from box fields
  const metadata = parsed.metadata as ExtractionResult['metadata'];
  const fields: Record<string, ExtractedField> = {};

  for (const [key, val] of Object.entries(parsed)) {
    if (key === 'metadata' || val == null) continue;
    const field = val as ExtractedField;
    if (typeof field === 'object' && 'value' in field && 'confidence' in field) {
      fields[key] = field;
    }
  }

  return {
    result: { metadata, fields },
    raw: { model: EXTRACTION_MODEL, response: rawText },
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  };
}

// ---------------------------------------------------------------------------
// Stage 3 — Validation
// ---------------------------------------------------------------------------

function validateExtraction(
  extraction: ExtractionResult,
  slipType: ExtractableSlipType,
): ValidationResult {
  const flags: ValidationFlag[] = [];

  // Check per-field confidence
  for (const [key, field] of Object.entries(extraction.fields)) {
    if (field.confidence < CONFIDENCE_THRESHOLD) {
      flags.push({
        field: key,
        reason: 'low_confidence',
        message: `${key} has confidence ${(field.confidence * 100).toFixed(0)}% (threshold: ${CONFIDENCE_THRESHOLD * 100}%)`,
        extractedValue: field.value,
      });
    }
  }

  // Check metadata confidence
  if (extraction.metadata.issuerName.confidence < CONFIDENCE_THRESHOLD) {
    flags.push({
      field: 'issuerName',
      reason: 'low_confidence',
      message: `Issuer name confidence ${(extraction.metadata.issuerName.confidence * 100).toFixed(0)}%`,
      extractedValue: extraction.metadata.issuerName.value,
    });
  }

  // Zod parse the raw extraction against the schema to catch type errors
  const schema = EXTRACTION_SCHEMAS[slipType];
  const rawForParse: Record<string, unknown> = { metadata: extraction.metadata };
  for (const [key, field] of Object.entries(extraction.fields)) {
    rawForParse[key] = field;
  }

  const parseResult = schema.safeParse(rawForParse);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      flags.push({
        field: issue.path.join('.'),
        reason: 'zod_error',
        message: issue.message,
      });
    }
  }

  return {
    valid: flags.filter((f) => f.reason === 'zod_error').length === 0,
    flags,
  };
}

// ---------------------------------------------------------------------------
// Flatten extraction to engine-consumable boxes
// ---------------------------------------------------------------------------

function flattenToBoxes(
  extraction: ExtractionResult,
): Record<string, number | string> {
  const boxes: Record<string, number | string> = {};
  for (const [key, field] of Object.entries(extraction.fields)) {
    boxes[key] = field.value;
  }
  return boxes;
}

function buildSummary(
  slipType: ExtractableSlipType,
  extraction: ExtractionResult,
): string {
  const label = SLIP_TYPE_LABELS[slipType];
  const issuer = extraction.metadata.issuerName.value || 'Unknown issuer';
  const year = extraction.metadata.taxYear.value;

  const amounts = Object.entries(extraction.fields)
    .filter(([, f]) => typeof f.value === 'number' && f.value > 0)
    .map(([key, f]) => `${key}: $${(f.value as number).toLocaleString('en-CA', { minimumFractionDigits: 2 })}`)
    .slice(0, 4) // Keep summary concise
    .join(', ');

  return `${label} from ${issuer} (${year}). ${amounts || 'No monetary amounts extracted.'}`;
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

export interface ExtractSlipOptions {
  /** Base64-encoded document content */
  base64: string;
  /** MIME type: image/jpeg, image/png, image/webp, application/pdf */
  mediaType: string;
  /** If the user manually selected a slip type, skip classification */
  manualSlipType?: ExtractableSlipType;
}

export async function extractSlip(options: ExtractSlipOptions): Promise<PipelineResult> {
  const { base64, mediaType, manualSlipType } = options;

  // -- Stage 1: Classification --
  let classification: ClassificationResult;
  let classificationRaw: unknown = null;
  let classificationUsage = { input: 0, output: 0 };

  if (manualSlipType) {
    // User override — skip Haiku call
    classification = {
      slipType: manualSlipType,
      confidence: 1.0,
      notes: 'User-selected slip type',
    };
  } else {
    try {
      const stage1 = await classifyDocument(base64, mediaType);
      classification = stage1.result;
      classificationRaw = stage1.raw;
      classificationUsage = stage1.usage;

      log('info', 'extraction.classification', {
        slipType: classification.slipType,
        confidence: classification.confidence,
      });
    } catch (err) {
      log('error', 'extraction.classification.error', {
        message: (err as Error).message,
      });
      return {
        status: 'classification_failed',
        classification: {
          slipType: 'unclear',
          confidence: 0,
          notes: `Classification API error: ${(err as Error).message}`,
        },
        extraction: null,
        validation: null,
        boxes: null,
        slipType: 'unclear',
        issuerName: '',
        taxYear: 2025,
        summary: 'Classification failed. Please select the slip type manually.',
        rawModelResponses: { classification: null, extraction: null },
        usage: {
          classificationInputTokens: 0,
          classificationOutputTokens: 0,
          extractionInputTokens: 0,
          extractionOutputTokens: 0,
        },
      };
    }
  }

  // Gate: if classification confidence is too low or type is not extractable
  if (classification.confidence < CLASSIFICATION_CONFIDENCE_THRESHOLD) {
    return {
      status: 'classification_failed',
      classification,
      extraction: null,
      validation: null,
      boxes: null,
      slipType: classification.slipType,
      issuerName: '',
      taxYear: 2025,
      summary: `Low confidence (${(classification.confidence * 100).toFixed(0)}%) classifying this document as ${classification.slipType}. Please select the correct slip type manually.`,
      rawModelResponses: { classification: classificationRaw, extraction: null },
      usage: {
        classificationInputTokens: classificationUsage.input,
        classificationOutputTokens: classificationUsage.output,
        extractionInputTokens: 0,
        extractionOutputTokens: 0,
      },
    };
  }

  if (!isExtractable(classification.slipType)) {
    return {
      status: 'classification_failed',
      classification,
      extraction: null,
      validation: null,
      boxes: null,
      slipType: classification.slipType,
      issuerName: '',
      taxYear: 2025,
      summary: `Document classified as "${classification.slipType}" which is not a supported slip type for extraction.`,
      rawModelResponses: { classification: classificationRaw, extraction: null },
      usage: {
        classificationInputTokens: classificationUsage.input,
        classificationOutputTokens: classificationUsage.output,
        extractionInputTokens: 0,
        extractionOutputTokens: 0,
      },
    };
  }

  const extractableType = classification.slipType as ExtractableSlipType;
  const engineSlipType = PIPELINE_TO_ENGINE_TYPE[extractableType];

  // -- Stage 2: Extraction --
  let extraction: ExtractionResult;
  let extractionRaw: unknown = null;
  let extractionUsage = { input: 0, output: 0 };

  try {
    const stage2 = await extractFields(base64, mediaType, extractableType);
    extraction = stage2.result;
    extractionRaw = stage2.raw;
    extractionUsage = stage2.usage;

    log('info', 'extraction.fields', {
      slipType: extractableType,
      fieldCount: Object.keys(extraction.fields).length,
    });
  } catch (err) {
    log('error', 'extraction.extraction.error', {
      message: (err as Error).message,
      slipType: extractableType,
    });
    return {
      status: 'extraction_failed',
      classification,
      extraction: null,
      validation: null,
      boxes: null,
      slipType: engineSlipType,
      issuerName: '',
      taxYear: 2025,
      summary: `Extraction failed for ${SLIP_TYPE_LABELS[extractableType]}. Please try again or enter values manually.`,
      rawModelResponses: { classification: classificationRaw, extraction: null },
      usage: {
        classificationInputTokens: classificationUsage.input,
        classificationOutputTokens: classificationUsage.output,
        extractionInputTokens: 0,
        extractionOutputTokens: 0,
      },
    };
  }

  // -- Stage 3: Validation --
  const validation = validateExtraction(extraction, extractableType);
  const boxes = flattenToBoxes(extraction);
  const summary = buildSummary(extractableType, extraction);
  const hasFlags = validation.flags.length > 0;

  let status: PipelineStatus;
  if (!validation.valid) {
    status = 'validation_failed';
  } else if (hasFlags) {
    status = 'needs_review';
  } else {
    status = 'success';
  }

  log('info', 'extraction.complete', {
    slipType: engineSlipType,
    status,
    flagCount: validation.flags.length,
  });

  return {
    status,
    classification,
    extraction,
    validation,
    boxes,
    slipType: engineSlipType,
    issuerName: extraction.metadata.issuerName.value,
    taxYear: extraction.metadata.taxYear.value,
    summary,
    rawModelResponses: {
      classification: classificationRaw,
      extraction: extractionRaw,
    },
    usage: {
      classificationInputTokens: classificationUsage.input,
      classificationOutputTokens: classificationUsage.output,
      extractionInputTokens: extractionUsage.input,
      extractionOutputTokens: extractionUsage.output,
    },
  };
}
