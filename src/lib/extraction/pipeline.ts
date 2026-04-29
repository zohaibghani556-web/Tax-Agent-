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
  T4FocusedExtractionSchema,
  isExtractable,
} from './schemas';
import { SLIP_FIELDS } from '@/lib/slips/slip-fields';
import { getIssuerFieldKey, isBlankReviewValue } from '@/lib/slips/review-values';
import type { ZodType } from 'zod/v4';
import type {
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
const CLASSIFICATION_REQUEST_TIMEOUT_MS = 20_000;
const EXTRACTION_REQUEST_TIMEOUT_MS = 60_000;
const FOCUSED_EXTRACTION_RETRY_TIMEOUT_MS = 30_000;
const LEGACY_JSON_FALLBACK_TIMEOUT_MS = 45_000;

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
      const isRetryable = isRetryableExtractionError(lastError);

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

export function isRetryableExtractionError(error: Error): boolean {
  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('overloaded') ||
    message.includes('529') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503')
  );
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

function buildAnthropicRequestOptions(
  mediaType: string,
  timeout: number,
): Anthropic.RequestOptions {
  return {
    ...(mediaType === 'application/pdf'
      ? { headers: { 'anthropic-beta': 'pdfs-2024-09-25' } }
      : {}),
    timeout,
    maxRetries: 0,
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

  const requestOptions = buildAnthropicRequestOptions(
    mediaType,
    CLASSIFICATION_REQUEST_TIMEOUT_MS,
  );

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

/**
 * Slip-type-specific extraction hints appended to the base prompt.
 * These correct recurring model errors where box labels on physical documents
 * differ from schema field names or appear in unexpected visual positions.
 */
export function buildSlipTypeHints(slipType: ExtractableSlipType): string {
  switch (slipType) {
    case 't4':
      return `

T4 CRITICAL FIELD MAPPING — read before extracting:
- Read the numbered T4 boxes directly from the slip. Use the box number beside each amount, not visual order.
- metadata.issuerName: employer name printed on the slip.
- metadata.taxYear: tax year printed on the slip.
- box14: Box 14, employment income. This is the primary required T4 amount.
- box16: Box 16, employee CPP contributions.
- box16A: Box 16A, employee second CPP contributions.
- box17: Box 17, employee QPP contributions.
- box18: Box 18, employee EI premiums.
- box20: Box 20, RPP contributions.
- box22: Box 22, income tax deducted.
- box24: Box 24, EI insurable earnings.
- box26: Box 26, CPP/QPP pensionable earnings.
- box40: Box 40, other taxable allowances and benefits.
- box42: Box 42, employment commissions.
- box44: Box 44, union dues.
- box45: Box 45, employer-offered dental benefits code. Keep the printed code as a string.
- box46: Box 46, charitable donations.
- box52: Box 52, pension adjustment.
- box55: Box 55, PPIP premiums.
- box85: Box 85, employee-paid private health premiums.

VALIDATION RULES:
- Do not use a value from an unnumbered total or another slip section unless it is clearly attached to that exact T4 box number.
- If a numbered box is blank or absent, omit that field. Use 0 only when the slip explicitly prints 0 or 0.00.
- If you can see Box 14 but cannot read it confidently, still extract the best visible value with a low confidence score instead of omitting every T4 box.`;
    case 't2202':
      // T2202 field mapping errors are the #1 source of bad extractions:
      // Claude frequently puts the tuition dollar amount into boxC (full-time months)
      // because some university PDFs show the dollar column to the right of the month
      // columns. This hint is intentionally emphatic.
      return `

T2202 CRITICAL FIELD MAPPING — read before extracting:
- boxA: DOLLAR AMOUNT — the "Eligible tuition fees" for the tax year. This is a currency amount (e.g. 14625.25). It will be the LARGEST number on the slip.
- boxB: MONTH COUNT — "Part-time months enrolled". This is a SMALL INTEGER (0–12). It is NOT a dollar amount.
- boxC: MONTH COUNT — "Full-time months enrolled". This is a SMALL INTEGER (0–12). It is NOT a dollar amount.

VALIDATION RULES:
- boxB and boxC MUST be 12 or less. If you read a value > 12 for boxB or boxC, you have almost certainly picked up the tuition amount by mistake — put the tuition amount in boxA instead.
- If boxA appears to be 0 but you can see a large dollar amount elsewhere on the form, that dollar amount belongs in boxA.
- The form may show multiple sessions (e.g. Fall, Winter). Add all session tuition amounts together for boxA; add all session months for boxB/boxC.`;
    default:
      return '';
  }
}

export function buildExtractionPrompt(slipType: ExtractableSlipType): string {
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
- All monetary values must be non-negative numbers (not strings). Use 0 for explicitly printed zeros.
- Do NOT guess amounts that aren't printed — omit the field instead.${buildSlipTypeHints(slipType)}`;
}

export function buildFocusedExtractionPrompt(slipType: ExtractableSlipType): string {
  if (slipType !== 't4') {
    return buildExtractionPrompt(slipType);
  }

  return `${buildExtractionPrompt(slipType)}

FOCUSED T4 RETRY:
- A previous extraction pass did not extract Box 14 or returned a blank T4.
- Inspect the document visually again and evaluate every T4 box in the output schema.
- For each numbered T4 box, output the printed value if it is visible, even when confidence is low.
- Use null only when that exact numbered box is blank, absent, cut off, or unreadable.
- Do not calculate, infer, or copy values from a different numbered box.`;
}

export function buildLegacyJsonFallbackPrompt(slipType: ExtractableSlipType): string {
  if (slipType !== 't4') {
    return buildExtractionPrompt(slipType);
  }

  return `You are a Canadian tax document specialist. Your job is to read a Canadian T4 slip and extract the financial data a CPA needs to file a T1 return.

Return ONLY valid JSON - no markdown, no explanation - with this exact shape:
{
  "slipType": "T4",
  "issuerName": "<employer name, empty string if not visible>",
  "taxYear": <number, e.g. 2025>,
  "boxes": { "<boxKey>": <value> },
  "summary": "<one plain-English sentence summarizing the key financial figures>",
  "confidence": <0.0 to 1.0>,
  "lowConfidenceFields": ["<boxKey>", ...]
}

T4 EXTRACTION RULES:
- Extract box14 (employment income - main salary), box16 (CPP employee contributions), box16A (CPP2 contributions, often 0), box17 (QPP contributions), box18 (EI premiums), box20 (RPP contributions), box22 (income tax deducted), box24 (EI insurable earnings), box26 (CPP/QPP pensionable earnings), box40 (taxable allowances and benefits), box42 (employment commissions), box44 (union dues), box45 (dental benefits code as a string), box46 (charitable donations), box52 (pension adjustment), box55 (PPIP premiums), and box85 (employee health premiums).
- Box keys must be exact: "box14", "box22", "box16A", etc.
- Read numbered boxes directly from the slip. Use the box number beside the amount, not visual order.
- Numeric boxes should be JSON numbers. If a value is printed with commas or a dollar sign, convert it to a number in JSON.
- Use 0 only when the box explicitly prints 0 or 0.00.
- If a numbered box is blank, absent, cut off, or unreadable, omit that box from "boxes".
- Do not calculate, infer, or copy values from a different numbered box.
- Put uncertain but visible values in "boxes" and list their keys in "lowConfidenceFields".`;
}

export function shouldRunFocusedExtractionRetry(
  slipType: ExtractableSlipType,
  extraction: ExtractionResult,
): boolean {
  return slipType === 't4' && isBlankReviewValue(extraction.fields.box14?.value);
}

export function mergeExtractionResults(
  primary: ExtractionResult,
  retry: ExtractionResult,
): ExtractionResult {
  return {
    metadata: {
      issuerName: isBlankReviewValue(primary.metadata.issuerName.value)
        ? retry.metadata.issuerName
        : primary.metadata.issuerName,
      taxYear: isBlankReviewValue(primary.metadata.taxYear.value)
        ? retry.metadata.taxYear
        : primary.metadata.taxYear,
    },
    fields: {
      ...retry.fields,
      ...primary.fields,
    },
  };
}

function normalizeParsedExtraction(parsed: Record<string, unknown>): ExtractionResult {
  const metadata = parsed.metadata as ExtractionResult['metadata'];
  const fields: Record<string, ExtractedField<number | string>> = {};

  for (const [key, val] of Object.entries(parsed)) {
    if (key === 'metadata' || val == null) continue;
    const field = val as ExtractedField;
    if (
      typeof field === 'object' &&
      'value' in field &&
      'confidence' in field &&
      !isBlankReviewValue(field.value)
    ) {
      fields[key] = field;
    }
  }

  return { metadata, fields };
}

interface LegacyJsonExtractionOutput {
  slipType?: string;
  issuerName?: string;
  institutionName?: string;
  taxYear?: number;
  boxes?: Record<string, number | string | null | undefined>;
  confidence?: number;
  lowConfidenceFields?: string[];
}

function parseJsonObjectFromText(rawText: string): Record<string, unknown> {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Legacy JSON fallback did not return parseable JSON');
  }
  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

function parseLegacyBoxValue(
  value: number | string | null | undefined,
  valueType: 'number' | 'text',
): number | string | null {
  if (value == null) return null;
  if (valueType === 'text') return String(value).trim();
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const normalized = value.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLegacyJsonExtraction(
  parsed: LegacyJsonExtractionOutput,
  slipType: ExtractableSlipType,
): ExtractionResult {
  const engineSlipType = PIPELINE_TO_ENGINE_TYPE[slipType];
  const fieldDefs = SLIP_FIELDS[engineSlipType] ?? [];
  const fieldByKey = new Map(fieldDefs.map((field) => [field.key, field]));
  const baseConfidence = parsed.confidence ?? 0.75;
  const lowConfidenceFields = new Set(parsed.lowConfidenceFields ?? []);
  const fields: Record<string, ExtractedField<number | string>> = {};

  for (const [key, value] of Object.entries(parsed.boxes ?? {})) {
    const fieldDef = fieldByKey.get(key);
    if (!fieldDef) continue;

    const normalized = parseLegacyBoxValue(value, fieldDef.valueType);
    if (normalized == null || isBlankReviewValue(normalized)) continue;

    fields[key] = {
      value: normalized,
      confidence: lowConfidenceFields.has(key) ? Math.min(baseConfidence, 0.6) : baseConfidence,
    };
  }

  return {
    metadata: {
      issuerName: {
        value: parsed.issuerName ?? parsed.institutionName ?? '',
        confidence: parsed.issuerName || parsed.institutionName ? baseConfidence : 0,
      },
      taxYear: {
        value: parsed.taxYear ?? 2025,
        confidence: parsed.taxYear ? baseConfidence : 0.5,
      },
    },
    fields,
  };
}

async function extractLegacyJsonFallback(
  base64: string,
  mediaType: string,
  slipType: ExtractableSlipType,
): Promise<{ result: ExtractionResult; raw: unknown; usage: { input: number; output: number } }> {
  const client = getClient();
  const docBlock = buildDocumentBlock(base64, mediaType);
  const requestOptions = buildAnthropicRequestOptions(
    mediaType,
    LEGACY_JSON_FALLBACK_TIMEOUT_MS,
  );

  const response = await withRetry(
    () =>
      client.messages.create(
        {
          model: EXTRACTION_MODEL,
          max_tokens: 2048,
          temperature: 0,
          system: buildLegacyJsonFallbackPrompt(slipType),
          messages: [
            {
              role: 'user',
              content: [
                docBlock,
                { type: 'text', text: 'Extract this T4 using the requested JSON object.' },
              ],
            },
          ],
        },
        requestOptions,
      ),
    'legacy_json_fallback',
  );

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const parsed = parseJsonObjectFromText(rawText) as LegacyJsonExtractionOutput;

  return {
    result: normalizeLegacyJsonExtraction(parsed, slipType),
    raw: { model: EXTRACTION_MODEL, response: rawText },
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  };
}

interface ExtractFieldsOptions {
  schema?: ZodType;
  systemPrompt?: string;
  userPrompt?: string;
  timeout?: number;
  label?: string;
}

async function extractFields(
  base64: string,
  mediaType: string,
  slipType: ExtractableSlipType,
  options: ExtractFieldsOptions = {},
): Promise<{ result: ExtractionResult; raw: unknown; usage: { input: number; output: number } }> {
  const client = getClient();
  const docBlock = buildDocumentBlock(base64, mediaType);
  const schema = options.schema ?? EXTRACTION_SCHEMAS[slipType];

  const requestOptions = buildAnthropicRequestOptions(
    mediaType,
    options.timeout ?? EXTRACTION_REQUEST_TIMEOUT_MS,
  );

  const response = await withRetry(
    () =>
      client.messages.create(
        {
          model: EXTRACTION_MODEL,
          max_tokens: 4096,
          temperature: 0,
          system: options.systemPrompt ?? buildExtractionPrompt(slipType),
          messages: [
            {
              role: 'user',
              content: [
                docBlock,
                { type: 'text', text: options.userPrompt ?? 'Extract all fields from this tax slip.' },
              ],
            },
          ],
          output_config: {
            format: zodOutputFormat(schema),
          },
        },
        requestOptions,
      ),
    options.label ?? 'extraction',
  );

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const parsed = JSON.parse(rawText) as Record<string, unknown>;

  return {
    result: normalizeParsedExtraction(parsed),
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

export function validateExtraction(
  extraction: ExtractionResult,
  slipType: ExtractableSlipType,
): ValidationResult {
  const flags: ValidationFlag[] = [];
  const engineSlipType = PIPELINE_TO_ENGINE_TYPE[slipType];
  const requiredFields = (SLIP_FIELDS[engineSlipType] ?? []).filter((field) => field.required);

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

  for (const field of requiredFields) {
    const issuerKey = getIssuerFieldKey(engineSlipType);
    if (field.key === issuerKey) {
      if (isBlankReviewValue(extraction.metadata.issuerName.value)) {
        flags.push({
          field: field.key,
          reason: 'missing_required',
          message: `${field.label} was not extracted. Review the source document and enter it before saving.`,
          extractedValue: extraction.metadata.issuerName.value,
        });
      }
      continue;
    }

    const extractedValue = extraction.fields[field.key]?.value;
    if (isBlankReviewValue(extractedValue)) {
      flags.push({
        field: field.key,
        reason: 'missing_required',
        message: `${field.label} was not extracted. Review the source document and enter it before saving.`,
        extractedValue,
      });
    }
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
  let focusedRetryRaw: unknown = null;
  let legacyJsonFallbackRaw: unknown = null;

  try {
    const stage2 = await extractFields(base64, mediaType, extractableType);
    extraction = stage2.result;
    extractionRaw = stage2.raw;
    extractionUsage = stage2.usage;

    log('info', 'extraction.fields', {
      slipType: extractableType,
      fieldCount: Object.keys(extraction.fields).length,
    });

    if (shouldRunFocusedExtractionRetry(extractableType, extraction)) {
      log('warn', 'extraction.focused_retry.start', {
        slipType: extractableType,
        reason: 'missing_required_box14',
      });

      try {
        const retry = await extractFields(base64, mediaType, extractableType, {
          schema: T4FocusedExtractionSchema,
          systemPrompt: buildFocusedExtractionPrompt(extractableType),
          userPrompt: 'Re-read this T4 and complete the focused value-or-null schema for every numbered box.',
          timeout: FOCUSED_EXTRACTION_RETRY_TIMEOUT_MS,
          label: 'focused_retry',
        });

        focusedRetryRaw = retry.raw;
        extractionUsage = {
          input: extractionUsage.input + retry.usage.input,
          output: extractionUsage.output + retry.usage.output,
        };

        const beforeCount = Object.keys(extraction.fields).length;
        extraction = mergeExtractionResults(extraction, retry.result);
        const afterCount = Object.keys(extraction.fields).length;

        log('info', 'extraction.focused_retry.complete', {
          slipType: extractableType,
          beforeCount,
          retryCount: Object.keys(retry.result.fields).length,
          afterCount,
          recoveredBox14: !isBlankReviewValue(extraction.fields.box14?.value),
        });
      } catch (retryErr) {
        log('warn', 'extraction.focused_retry.error', {
          message: (retryErr as Error).message,
          slipType: extractableType,
        });
      }
    }

    if (shouldRunFocusedExtractionRetry(extractableType, extraction)) {
      log('warn', 'extraction.legacy_json_fallback.start', {
        slipType: extractableType,
        reason: 'structured_extraction_still_missing_box14',
      });

      try {
        const fallback = await extractLegacyJsonFallback(base64, mediaType, extractableType);
        legacyJsonFallbackRaw = fallback.raw;
        extractionUsage = {
          input: extractionUsage.input + fallback.usage.input,
          output: extractionUsage.output + fallback.usage.output,
        };

        const beforeCount = Object.keys(extraction.fields).length;
        extraction = mergeExtractionResults(extraction, fallback.result);
        const afterCount = Object.keys(extraction.fields).length;

        log('info', 'extraction.legacy_json_fallback.complete', {
          slipType: extractableType,
          beforeCount,
          fallbackCount: Object.keys(fallback.result.fields).length,
          afterCount,
          recoveredBox14: !isBlankReviewValue(extraction.fields.box14?.value),
        });
      } catch (fallbackErr) {
        log('warn', 'extraction.legacy_json_fallback.error', {
          message: (fallbackErr as Error).message,
          slipType: extractableType,
        });
      }
    }
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
      extraction: focusedRetryRaw || legacyJsonFallbackRaw
        ? {
            primary: extractionRaw,
            ...(focusedRetryRaw ? { focusedRetry: focusedRetryRaw } : {}),
            ...(legacyJsonFallbackRaw ? { legacyJsonFallback: legacyJsonFallbackRaw } : {}),
          }
        : extractionRaw,
    },
    usage: {
      classificationInputTokens: classificationUsage.input,
      classificationOutputTokens: classificationUsage.output,
      extractionInputTokens: extractionUsage.input,
      extractionOutputTokens: extractionUsage.output,
    },
  };
}
