/**
 * TaxAgent.ai — Slip Extraction Pipeline
 *
 * Three-stage pipeline: Classify (Haiku) → Extract (Sonnet) → Validate (Zod)
 */

export { extractSlip } from './pipeline';
export type { ExtractSlipOptions } from './pipeline';
export {
  ClassificationSchema,
  EXTRACTION_SCHEMAS,
  SLIP_TYPE_LABELS,
  PIPELINE_TO_ENGINE_TYPE,
  isExtractable,
} from './schemas';
export type {
  ClassifiableSlipType,
  ExtractableSlipType,
  ClassificationResult,
  ExtractionResult,
  ExtractedField,
  ValidationFlag,
  ValidationResult,
  PipelineResult,
  PipelineStatus,
  SlipExtractionRecord,
} from './types';
