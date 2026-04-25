/**
 * TaxAgent.ai — Slip Extraction Pipeline Types
 *
 * Three-stage pipeline:
 *   Stage 1: Classification (Haiku) — what type of slip is this?
 *   Stage 2: Extraction (Sonnet) — pull structured fields using slip-specific schema
 *   Stage 3: Validation (Zod) — parse, flag low-confidence fields for human review
 */

// ---------------------------------------------------------------------------
// Stage 1 — Classification
// ---------------------------------------------------------------------------

/** Slip types the classifier can detect */
export type ClassifiableSlipType =
  | 't4' | 't4a' | 't5' | 't3' | 't2202' | 't5008'
  | 't4e' | 't5007' | 't4ap' | 't4aoas' | 't4rsp' | 't4rif'
  | 'rrsp_receipt' | 't4fhsa'
  | 'rc62' | 'rc210' | 'prior_year_return'
  | 'unsupported' | 'unclear';

/** Slip types we can extract (have schemas for) */
export type ExtractableSlipType =
  | 't4' | 't4a' | 't5' | 't3' | 't2202' | 't5008'
  | 't4e' | 't5007' | 't4ap' | 't4aoas' | 't4rsp' | 't4rif'
  | 'rrsp_receipt' | 't4fhsa';

export interface ClassificationResult {
  slipType: ClassifiableSlipType;
  confidence: number; // 0–1
  notes: string;
}

// ---------------------------------------------------------------------------
// Stage 2 — Extraction
// ---------------------------------------------------------------------------

/** A single extracted field with its confidence score */
export interface ExtractedField<T = number> {
  value: T;
  confidence: number; // 0–1
}

/** Common metadata extracted from every slip */
export interface SlipMetadata {
  issuerName: ExtractedField<string>;
  taxYear: ExtractedField<number>;
}

/**
 * Generic extraction result — keys are app-layer box keys (box14, box22, etc.)
 * plus metadata. The specific shape per slip type is enforced by the Zod schemas
 * in schemas.ts; this type is the union after extraction.
 */
export interface ExtractionResult {
  metadata: SlipMetadata;
  fields: Record<string, ExtractedField>;
}

// ---------------------------------------------------------------------------
// Stage 3 — Validation
// ---------------------------------------------------------------------------

export interface ValidationFlag {
  field: string;
  reason: 'low_confidence' | 'zod_error' | 'missing_required';
  message: string;
  extractedValue?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  flags: ValidationFlag[];
}

// ---------------------------------------------------------------------------
// Pipeline Result (all 3 stages combined)
// ---------------------------------------------------------------------------

export type PipelineStatus =
  | 'success'               // extraction complete, no flags
  | 'needs_review'          // extraction complete but has low-confidence fields
  | 'classification_failed' // stage 1 failed or low confidence
  | 'extraction_failed'     // stage 2 API error
  | 'validation_failed';    // stage 3 Zod parse failed entirely

export interface PipelineResult {
  status: PipelineStatus;

  // Stage 1
  classification: ClassificationResult;

  // Stage 2 (null if classification failed)
  extraction: ExtractionResult | null;

  // Stage 3 (null if extraction failed)
  validation: ValidationResult | null;

  // Flattened boxes for the engine (box14: 72400, box22: 14280, etc.)
  // null if extraction failed
  boxes: Record<string, number | string> | null;

  // Metadata
  slipType: string;
  issuerName: string;
  taxYear: number;
  summary: string;

  // For debugging and quality improvement
  rawModelResponses: {
    classification: unknown;
    extraction: unknown;
  };

  // Cost tracking
  usage: {
    classificationInputTokens: number;
    classificationOutputTokens: number;
    extractionInputTokens: number;
    extractionOutputTokens: number;
  };
}

// ---------------------------------------------------------------------------
// Supabase persistence shape
// ---------------------------------------------------------------------------

export interface SlipExtractionRecord {
  id: string;
  user_id: string;
  document_storage_path: string;
  slip_type_detected: string;
  classification_confidence: number;
  extraction_result: ExtractionResult | null;
  boxes: Record<string, number | string> | null;
  raw_model_response: {
    classification: unknown;
    extraction: unknown;
  };
  validation_errors: ValidationFlag[];
  status: PipelineStatus;
  created_at: string;
  reviewed_by_user_at: string | null;
}
