/**
 * TaxAgent.ai — Extraction Pipeline Zod Schemas
 *
 * These schemas drive Claude's structured output for each pipeline stage.
 * They use app-layer box keys (box14, box22, etc.) — NOT CRA XSD field names.
 *
 * IMPORTANT: Structured outputs JSON Schema limitations apply:
 *   - No min/max on numbers (zodOutputFormat strips them)
 *   - No minLength/maxLength on strings
 *   - additionalProperties must be false (SDK adds automatically)
 *   - No recursive schemas
 *
 * The SDK's zodOutputFormat() handles the Zod→JSON Schema conversion and
 * strips unsupported constraints automatically.
 */

import { z } from 'zod/v4';
import type { ClassifiableSlipType, ExtractableSlipType } from './types';

// ---------------------------------------------------------------------------
// Reusable field wrappers
// ---------------------------------------------------------------------------

/** Numeric field with extraction confidence */
const numericField = () =>
  z.object({
    value: z.number(),
    confidence: z.number(),
  }).optional();

/** String field with extraction confidence */
const stringField = () =>
  z.object({
    value: z.string(),
    confidence: z.number(),
  }).optional();

/** Required string field with extraction confidence */
const requiredStringField = () =>
  z.object({
    value: z.string(),
    confidence: z.number(),
  });

/** Required numeric field with extraction confidence */
const requiredNumericField = () =>
  z.object({
    value: z.number(),
    confidence: z.number(),
  });

/** Slip metadata — present on every extraction */
const metadataSchema = z.object({
  issuerName: requiredStringField(),
  taxYear: requiredNumericField(),
});

// ---------------------------------------------------------------------------
// Stage 1 — Classification Schema (Haiku)
// ---------------------------------------------------------------------------

const CLASSIFIABLE_SLIP_TYPES: [ClassifiableSlipType, ...ClassifiableSlipType[]] = [
  't4', 't4a', 't5', 't3', 't2202', 't5008',
  't4e', 't5007', 't4ap', 't4aoas', 't4rsp', 't4rif',
  'rrsp_receipt', 't4fhsa',
  'rc62', 'rc210', 'prior_year_return',
  'unsupported', 'unclear',
];

export const ClassificationSchema = z.object({
  slipType: z.enum(CLASSIFIABLE_SLIP_TYPES),
  confidence: z.number(),
  notes: z.string(),
});

export type ClassificationOutput = z.infer<typeof ClassificationSchema>;

// ---------------------------------------------------------------------------
// Stage 2 — Per-Slip-Type Extraction Schemas (Sonnet)
// ---------------------------------------------------------------------------

/**
 * T4 — Statement of Remuneration Paid
 * Primary boxes for tax filing: employment income, CPP, EI, tax deducted
 */
export const T4ExtractionSchema = z.object({
  metadata: metadataSchema,
  box14: numericField(),  // Employment income
  box16: numericField(),  // CPP contributions
  box16A: numericField(), // CPP2 contributions
  box17: numericField(),  // QPP contributions
  box18: numericField(),  // EI premiums
  box20: numericField(),  // RPP contributions
  box22: numericField(),  // Income tax deducted
  box24: numericField(),  // EI insurable earnings
  box26: numericField(),  // CPP/QPP pensionable earnings
  box40: numericField(),  // Other taxable allowances and benefits
  box42: numericField(),  // Employment commissions
  box44: numericField(),  // Union dues
  box45: stringField(),   // Employer-offered dental benefits code (1–5)
  box46: numericField(),  // Charitable donations
  box52: numericField(),  // Pension adjustment
  box55: numericField(),  // PPIP premiums
  box85: numericField(),  // Employee health premiums
});

/**
 * T4A — Statement of Pension, Retirement, Annuity, and Other Income
 * Uses 3-digit box numbers per CRA convention
 */
export const T4AExtractionSchema = z.object({
  metadata: metadataSchema,
  box016: numericField(), // Pension or superannuation
  box018: numericField(), // Lump-sum payments
  box020: numericField(), // Self-employed commissions
  box022: numericField(), // Income tax deducted
  box024: numericField(), // Annuities
  box028: numericField(), // Other income
  box048: numericField(), // Fees for services
  box105: numericField(), // Scholarships/bursaries — ITA s.56(3)
  box122: numericField(), // RESP accumulated income
  box130: numericField(), // RESP educational assistance
  box135: numericField(), // RESP income (designated)
});

/**
 * T5 — Statement of Investment Income
 * Dividends (eligible and non-eligible), interest, foreign income
 */
export const T5ExtractionSchema = z.object({
  metadata: metadataSchema,
  box11: numericField(), // Taxable non-eligible dividends
  box12: numericField(), // Actual non-eligible dividends
  box13: numericField(), // Interest from Canadian sources
  box14: numericField(), // Other income
  box15: numericField(), // Foreign income
  box16: numericField(), // Foreign tax paid
  box24: numericField(), // Actual eligible dividends
  box25: numericField(), // Taxable eligible dividends
  box26: numericField(), // Eligible dividend tax credit
});

/**
 * T5008 — Statement of Securities Transactions
 * box15 and box16 are strings (type code, security description)
 */
export const T5008ExtractionSchema = z.object({
  metadata: metadataSchema,
  box15: stringField(),   // Type code (e.g. "SHR")
  box16: stringField(),   // Security description
  box17: numericField(),  // Quantity
  box20: numericField(),  // Cost or book value (ACB)
  box21: numericField(),  // Proceeds of disposition
  box22: stringField(),   // Recipient type code
});

/**
 * T3 — Statement of Trust Income Allocations
 * Complex slip with many optional boxes
 */
export const T3ExtractionSchema = z.object({
  metadata: metadataSchema,
  box21: numericField(),  // Capital gains
  box22: numericField(),  // Actual eligible dividends
  box23: numericField(),  // Taxable eligible dividends
  box25: numericField(),  // Foreign non-business income
  box26: numericField(),  // Other income
  box32: numericField(),  // Taxable non-eligible dividends
  box33: numericField(),  // Actual non-eligible dividends
  box36: numericField(),  // Foreign business tax paid
  box37: numericField(),  // Foreign non-business tax paid
  box49: numericField(),  // Interest/charitable donations
  box50: numericField(),  // Other investment income
});

/**
 * T2202 — Tuition and Enrolment Certificate
 * Uses letter-based box keys (boxA, boxB, boxC)
 */
export const T2202ExtractionSchema = z.object({
  metadata: metadataSchema,
  boxA: numericField(), // Eligible tuition fees
  boxB: numericField(), // Part-time months
  boxC: numericField(), // Full-time months
});

/**
 * T4E — Statement of Employment Insurance and Other Benefits
 */
export const T4EExtractionSchema = z.object({
  metadata: metadataSchema,
  box14: numericField(), // Total EI benefits
  box22: numericField(), // Income tax deducted
});

/**
 * T5007 — Statement of Benefits (social assistance)
 */
export const T5007ExtractionSchema = z.object({
  metadata: metadataSchema,
  box10: numericField(), // Social assistance payments
});

/**
 * T4AP — Statement of Canada Pension Plan Benefits
 */
export const T4APExtractionSchema = z.object({
  metadata: metadataSchema,
  box16: numericField(), // CPP retirement/disability pension
  box20: numericField(), // Death benefit
  box22: numericField(), // Income tax deducted
});

/**
 * T4AOAS — Statement of Old Age Security
 */
export const T4AOASExtractionSchema = z.object({
  metadata: metadataSchema,
  box18: numericField(), // OAS pension
  box21: numericField(), // GIS net supplements (not taxable)
  box22: numericField(), // Income tax deducted
});

/**
 * T4RSP — Statement of RRSP Income (withdrawal)
 */
export const T4RSPExtractionSchema = z.object({
  metadata: metadataSchema,
  box20: numericField(), // Total RRSP income withdrawn → line 12900
  box22: numericField(), // Income tax deducted at source
});

/**
 * T4RIF — Statement of Income from RRIF
 */
export const T4RIFExtractionSchema = z.object({
  metadata: metadataSchema,
  box16: numericField(), // Taxable RRIF amounts
  box30: numericField(), // Income tax deducted
});

/**
 * RRSP-Receipt — Contribution receipt (not a CRA slip)
 */
export const RRSPReceiptExtractionSchema = z.object({
  metadata: metadataSchema,
  amount: numericField(),        // Total RRSP contribution
  planType: stringField(),       // "RRSP" or "SPOUSAL-RRSP"
  dateOfContribution: stringField(), // YYYY-MM-DD if visible
});

/**
 * T4FHSA — Statement of First Home Savings Account Activity
 */
export const T4FHSAExtractionSchema = z.object({
  metadata: metadataSchema,
  box14: numericField(), // Taxable FHSA income (non-qualifying withdrawals)
  box22: numericField(), // Income tax deducted
  box24: numericField(), // FHSA contributions
});

// ---------------------------------------------------------------------------
// Schema registry — maps slip type to its extraction schema
// ---------------------------------------------------------------------------

export const EXTRACTION_SCHEMAS: Record<ExtractableSlipType, z.ZodObject<z.ZodRawShape>> = {
  t4: T4ExtractionSchema,
  t4a: T4AExtractionSchema,
  t5: T5ExtractionSchema,
  t5008: T5008ExtractionSchema,
  t3: T3ExtractionSchema,
  t2202: T2202ExtractionSchema,
  t4e: T4EExtractionSchema,
  t5007: T5007ExtractionSchema,
  t4ap: T4APExtractionSchema,
  t4aoas: T4AOASExtractionSchema,
  t4rsp: T4RSPExtractionSchema,
  t4rif: T4RIFExtractionSchema,
  rrsp_receipt: RRSPReceiptExtractionSchema,
  t4fhsa: T4FHSAExtractionSchema,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a classified slip type has an extraction schema */
export function isExtractable(slipType: string): slipType is ExtractableSlipType {
  return slipType in EXTRACTION_SCHEMAS;
}

/** Human-readable slip type names for prompts and UI */
export const SLIP_TYPE_LABELS: Record<ExtractableSlipType, string> = {
  t4: 'T4 — Statement of Remuneration Paid',
  t4a: 'T4A — Statement of Pension, Retirement, Annuity, and Other Income',
  t5: 'T5 — Statement of Investment Income',
  t5008: 'T5008 — Statement of Securities Transactions',
  t3: 'T3 — Statement of Trust Income Allocations',
  t2202: 'T2202 — Tuition and Enrolment Certificate',
  t4e: 'T4E — Statement of Employment Insurance and Other Benefits',
  t5007: 'T5007 — Statement of Benefits',
  t4ap: 'T4A(P) — Statement of Canada Pension Plan Benefits',
  t4aoas: 'T4A(OAS) — Statement of Old Age Security',
  t4rsp: 'T4RSP — Statement of RRSP Income',
  t4rif: 'T4RIF — Statement of Income from RRIF',
  rrsp_receipt: 'RRSP Contribution Receipt',
  t4fhsa: 'T4FHSA — First Home Savings Account',
};

/**
 * Maps pipeline slip type codes (lowercase) to the engine's slip type codes (uppercase).
 * The engine uses TaxSlip['type'] which is uppercase (T4, T4A, etc.).
 */
export const PIPELINE_TO_ENGINE_TYPE: Record<ExtractableSlipType, string> = {
  t4: 'T4',
  t4a: 'T4A',
  t5: 'T5',
  t5008: 'T5008',
  t3: 'T3',
  t2202: 'T2202',
  t4e: 'T4E',
  t5007: 'T5007',
  t4ap: 'T4AP',
  t4aoas: 'T4AOAS',
  t4rsp: 'T4RSP',
  t4rif: 'T4RIF',
  rrsp_receipt: 'RRSP-Receipt',
  t4fhsa: 'T4FHSA',
};
