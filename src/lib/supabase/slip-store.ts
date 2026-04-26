/**
 * TaxAgent.ai — Unified Slip Store
 *
 * Persistence layer for all 14 CRA slip types. Backed by the tax_slips table
 * with the schema added in 20260425000002_unified_slip_store.sql.
 *
 * Design contract:
 *   - STORE layer (UnifiedSlip) never coerces null/undefined to 0. Missing
 *     boxes stay absent (null/undefined) in UnifiedSlip.boxes.
 *   - ENGINE boundary (toTaxSlip) is the ONLY place where 0 defaults are
 *     applied for required numeric fields, using `typeof v === 'number' ? v : 0`.
 *   - All functions accept a SupabaseClient so they can be called from both
 *     server (createServerSupabaseClient) and client contexts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';
import type { TaxSlip } from '@/lib/tax-engine/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** All 14 CRA slip types supported by the platform (ITA / CRA 2025). */
export type TaxSlipType =
  | 'T4'
  | 'T5'
  | 'T5008'
  | 'T3'
  | 'T4A'
  | 'T2202'
  | 'T4E'
  | 'T5007'
  | 'T4AP'
  | 'T4AOAS'
  | 'T4RSP'
  | 'T4RIF'
  | 'RRSP-Receipt'
  | 'T4FHSA';

/**
 * Per-field provenance record. Stored in UnifiedSlip.fieldProvenance keyed
 * by CRA box key (e.g. 'box14', 'box22', 'boxA').
 */
export interface FieldProvenance {
  /** How this field value was obtained. */
  source: 'xml' | 'pdf-text' | 'ocr' | 'manual' | 'imported';
  /** Model confidence 0–1. Absent for manual/xml (deterministic). */
  confidence?: number;
  /** Whether this field requires human review before submission. */
  needsReview: boolean;
  /** Original field name before normalization (e.g. 'brsy_amt' → 'box105'). */
  rawFieldName?: string;
  /** Canonical CRA box key after normalization (e.g. 'box105'). */
  normalizedBox: string;
}

/**
 * Unified slip record — the single store-layer representation of any CRA slip.
 * Never passes directly to the tax engine; use toTaxSlip() to bridge.
 */
export interface UnifiedSlip {
  id: string;
  userId: string;
  taxYear: number;
  slipType: TaxSlipType;
  issuerName: string;
  sourceMethod: 'xml' | 'pdf-text' | 'ocr' | 'manual' | 'imported';
  slipStatus: 'active' | 'amended' | 'cancelled' | 'duplicate' | 'needs_review';
  /** Flat map of CRA box keys to their values. Absent keys are genuinely absent — never coerced to 0 here. */
  boxes: Record<string, number | string | null>;
  /** Per-box provenance keyed by box key. */
  fieldProvenance: Record<string, FieldProvenance>;
  /** Full unmodified model output from OCR/XML ingestion, plus _manualAudit log. */
  rawExtractedData: unknown | null;
  /** Fields the model found but could not map to a known box key. */
  unmappedFields: Record<string, unknown> | null;
  /** Box keys that are required for this slip type but were absent in extraction. */
  missingRequired: string[];
  /** SHA-256 of the original uploaded file. */
  fileHash: string | null;
  originalFilename: string | null;
  /** CRA XSD schema version used (e.g. 'v1.26.3'). */
  schemaVersion: string | null;
  importedAt: string | null;
  /** Claude model used for OCR extraction (e.g. 'claude-sonnet-4-6'). */
  extractionModel: string | null;
  extractionModelVersion: string | null;
  needsReview: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Internal audit types ─────────────────────────────────────────────────────

interface ManualAuditEntry {
  box: string;
  previousValue: number | string | null;
  newValue: number | string | null;
  userId: string;
  timestamp: string;
}

interface RawExtractedDataWithAudit {
  _manualAudit?: ManualAuditEntry[];
  [key: string]: unknown;
}

// ─── Engine bridge helpers ────────────────────────────────────────────────────

/**
 * Safe numeric extraction at the engine boundary.
 * Returns the value if it is already a number, otherwise 0.
 * NEVER call Number(v) || 0 — that silently converts null/NaN to 0.
 */
function n(v: number | string | null | undefined): number {
  return typeof v === 'number' ? v : 0;
}

/**
 * Safe string extraction at the engine boundary.
 * Returns the value if it is already a string, otherwise ''.
 */
function s(v: number | string | null | undefined): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

/**
 * Bridge a UnifiedSlip to the TaxSlip union type consumed by the engine.
 *
 * This is the ONLY place where absent boxes are defaulted to 0 — at the engine
 * boundary, not in the store. The store layer (UnifiedSlip.boxes) preserves
 * null/undefined to distinguish "not extracted" from "explicitly zero".
 *
 * Returns null if slipType is unrecognized (defensive — should not happen with
 * a valid TaxSlipType, but callers must handle it).
 */
export function toTaxSlip(slip: UnifiedSlip): TaxSlip | null {
  const b = slip.boxes;

  switch (slip.slipType) {
    case 'T4':
      return {
        type: 'T4',
        data: {
          issuerName: slip.issuerName,
          box14: n(b['box14']),
          box16: n(b['box16']),
          box16A: n(b['box16A']),
          box17: n(b['box17']),
          box18: n(b['box18']),
          box20: n(b['box20']),
          box22: n(b['box22']),
          box24: n(b['box24']),
          box26: n(b['box26']),
          box40: n(b['box40']),
          box42: n(b['box42']),
          box44: n(b['box44']),
          box45: s(b['box45']),
          box46: n(b['box46']),
          box52: n(b['box52']),
          box85: n(b['box85']),
        },
      };

    case 'T5':
      return {
        type: 'T5',
        data: {
          issuerName: slip.issuerName,
          box11: n(b['box11']),
          box12: n(b['box12']),
          box13: n(b['box13']),
          box14: n(b['box14']),
          box15: n(b['box15']),
          box16: n(b['box16']),
          box18: n(b['box18']),
          box24: n(b['box24']),
          box25: n(b['box25']),
          box26: n(b['box26']),
        },
      };

    case 'T5008':
      return {
        type: 'T5008',
        data: {
          issuerName: slip.issuerName,
          box15: s(b['box15']),
          box16: s(b['box16']),
          box20: n(b['box20']),
          box21: n(b['box21']),
          box22: n(b['box22']),
        },
      };

    case 'T3':
      return {
        type: 'T3',
        data: {
          issuerName: slip.issuerName,
          box21: n(b['box21']),
          box22: n(b['box22']),
          box23: n(b['box23']),
          box25: n(b['box25']),
          box26: n(b['box26']),
          box32: n(b['box32']),
          box37: n(b['box37']),
          box49: n(b['box49']),
          box50: n(b['box50']),
        },
      };

    case 'T4A':
      return {
        type: 'T4A',
        data: {
          issuerName: slip.issuerName,
          box016: n(b['box016']),
          box018: n(b['box018']),
          box020: n(b['box020']),
          box022: n(b['box022']),
          box024: n(b['box024']),
          box028: n(b['box028']),
          // box048 is optional in T4ASlip but we always provide it as a number
          // (0 when absent) so callers don't need to handle undefined.
          box048: n(b['box048']),
          box105: n(b['box105']),
          box135: n(b['box135']),
        },
      };

    case 'T2202':
      return {
        type: 'T2202',
        data: {
          // T2202Slip uses 'institutionName', not 'issuerName'.
          // The store uses issuerName as the canonical top-level field.
          institutionName: slip.issuerName || s(b['institutionName']),
          boxA: n(b['boxA']),
          boxB: n(b['boxB']),
          boxC: n(b['boxC']),
        },
      };

    case 'T4E':
      return {
        type: 'T4E',
        data: {
          box14: n(b['box14']),
          box22: n(b['box22']),
        },
      };

    case 'T5007':
      return {
        type: 'T5007',
        data: {
          box10: n(b['box10']),
        },
      };

    case 'T4AP':
      return {
        type: 'T4AP',
        data: {
          issuerName: slip.issuerName,
          box16: n(b['box16']),
          box20: n(b['box20']),
          box22: n(b['box22']),
        },
      };

    case 'T4AOAS':
      return {
        type: 'T4AOAS',
        data: {
          issuerName: slip.issuerName,
          box18: n(b['box18']),
          box21: n(b['box21']),
          box22: n(b['box22']),
        },
      };

    case 'T4RSP':
      return {
        type: 'T4RSP',
        data: {
          issuerName: slip.issuerName,
          box20: n(b['box20']),
          box22: n(b['box22']),
        },
      };

    case 'T4RIF':
      return {
        type: 'T4RIF',
        data: {
          issuerName: slip.issuerName,
          box16: n(b['box16']),
          box30: n(b['box30']),
        },
      };

    case 'RRSP-Receipt':
      return {
        type: 'RRSP-Receipt',
        data: {
          issuerName: slip.issuerName,
          amount: n(b['amount']),
          planType: s(b['planType']) || 'RRSP',
        },
      };

    case 'T4FHSA':
      return {
        type: 'T4FHSA',
        data: {
          issuerName: slip.issuerName,
          box14: n(b['box14']),
          box22: n(b['box22']),
          box24: n(b['box24']),
        },
      };

    default:
      // TypeScript exhaustiveness guard — should never reach here with a valid TaxSlipType.
      return null;
  }
}

// ─── Box accessors ────────────────────────────────────────────────────────────

/**
 * Read a box value from a UnifiedSlip without coercion.
 * Returns null if the box is absent or null.
 */
export function getSlipBoxValue(
  slip: UnifiedSlip,
  box: string,
): number | string | null {
  const v = slip.boxes[box];
  return v ?? null;
}

/**
 * Return a new UnifiedSlip with the specified box updated and provenance
 * recorded. Does NOT write to the database — the caller is responsible for
 * calling updateSlip() afterwards.
 */
export function setSlipBoxValue(
  slip: UnifiedSlip,
  box: string,
  value: number | string | null,
  source: FieldProvenance['source'],
  confidence?: number,
): UnifiedSlip {
  const provenance: FieldProvenance = {
    source,
    confidence,
    needsReview: false,
    normalizedBox: box,
  };

  return {
    ...slip,
    boxes: { ...slip.boxes, [box]: value },
    fieldProvenance: { ...slip.fieldProvenance, [box]: provenance },
  };
}

// ─── DB row ↔ UnifiedSlip mapping ────────────────────────────────────────────

function rowToUnifiedSlip(row: Record<string, unknown>): UnifiedSlip {
  return {
    id: row['id'] as string,
    userId: (row['user_id'] as string | null) ?? '',
    taxYear: (row['tax_year'] as number | null) ?? 2025,
    slipType: row['slip_type'] as TaxSlipType,
    issuerName: (row['issuer_name'] as string | null) ?? '',
    sourceMethod:
      (row['source_method'] as UnifiedSlip['sourceMethod'] | null) ?? 'manual',
    slipStatus:
      (row['slip_status'] as UnifiedSlip['slipStatus'] | null) ?? 'active',
    boxes:
      (row['boxes'] as Record<string, number | string | null> | null) ?? {},
    fieldProvenance:
      (row['field_provenance'] as Record<string, FieldProvenance> | null) ?? {},
    rawExtractedData: row['raw_extracted_data'] ?? null,
    unmappedFields:
      (row['unmapped_fields'] as Record<string, unknown> | null) ?? null,
    missingRequired: (row['missing_required'] as string[] | null) ?? [],
    fileHash: (row['file_hash'] as string | null) ?? null,
    originalFilename: (row['original_filename'] as string | null) ?? null,
    schemaVersion: (row['schema_version'] as string | null) ?? null,
    importedAt: (row['imported_at'] as string | null) ?? null,
    extractionModel: (row['extraction_model'] as string | null) ?? null,
    extractionModelVersion:
      (row['extraction_model_version'] as string | null) ?? null,
    needsReview: (row['needs_review'] as boolean | null) ?? false,
    createdAt:
      (row['created_at'] as string | null) ?? new Date().toISOString(),
    updatedAt:
      (row['updated_at'] as string | null) ?? new Date().toISOString(),
  };
}

function unifiedSlipToInsertRow(
  input: Omit<UnifiedSlip, 'id' | 'createdAt' | 'updatedAt'>,
): Record<string, unknown> {
  return {
    user_id: input.userId,
    tax_year: input.taxYear,
    slip_type: input.slipType,
    issuer_name: input.issuerName,
    source_method: input.sourceMethod,
    slip_status: input.slipStatus,
    boxes: input.boxes,
    field_provenance: input.fieldProvenance,
    raw_extracted_data: input.rawExtractedData,
    unmapped_fields: input.unmappedFields,
    missing_required: input.missingRequired,
    file_hash: input.fileHash,
    original_filename: input.originalFilename,
    schema_version: input.schemaVersion,
    imported_at: input.importedAt,
    extraction_model: input.extractionModel,
    extraction_model_version: input.extractionModelVersion,
    needs_review: input.needsReview,
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Insert a new slip row and return the persisted UnifiedSlip.
 * Throws on Supabase errors — callers should handle appropriately.
 */
export async function createSlip(
  client: SupabaseClient,
  input: Omit<UnifiedSlip, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<UnifiedSlip> {
  const row = unifiedSlipToInsertRow(input);

  const { data, error } = await client
    .from('tax_slips')
    .insert(row)
    .select('*')
    .single();

  if (error || !data) {
    log('error', 'slip-store.createSlip.error', {
      reason: error?.message ?? 'no data returned',
    });
    throw new Error(`createSlip failed: ${error?.message ?? 'no data returned'}`);
  }

  return rowToUnifiedSlip(data as Record<string, unknown>);
}

/**
 * Apply a partial update to an existing slip. Returns the updated slip.
 * The caller must not include 'id', 'userId', or 'createdAt' in the patch.
 */
export async function updateSlip(
  client: SupabaseClient,
  id: string,
  patch: Partial<Omit<UnifiedSlip, 'id' | 'userId' | 'createdAt'>>,
): Promise<UnifiedSlip> {
  // Map camelCase patch fields to snake_case DB columns explicitly.
  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.taxYear !== undefined)       dbPatch['tax_year'] = patch.taxYear;
  if (patch.slipType !== undefined)      dbPatch['slip_type'] = patch.slipType;
  if (patch.issuerName !== undefined)    dbPatch['issuer_name'] = patch.issuerName;
  if (patch.sourceMethod !== undefined)  dbPatch['source_method'] = patch.sourceMethod;
  if (patch.slipStatus !== undefined)    dbPatch['slip_status'] = patch.slipStatus;
  if (patch.boxes !== undefined)         dbPatch['boxes'] = patch.boxes;
  if (patch.fieldProvenance !== undefined)
    dbPatch['field_provenance'] = patch.fieldProvenance;
  if (patch.rawExtractedData !== undefined)
    dbPatch['raw_extracted_data'] = patch.rawExtractedData;
  if (patch.unmappedFields !== undefined)
    dbPatch['unmapped_fields'] = patch.unmappedFields;
  if (patch.missingRequired !== undefined)
    dbPatch['missing_required'] = patch.missingRequired;
  if (patch.fileHash !== undefined)       dbPatch['file_hash'] = patch.fileHash;
  if (patch.originalFilename !== undefined)
    dbPatch['original_filename'] = patch.originalFilename;
  if (patch.schemaVersion !== undefined)
    dbPatch['schema_version'] = patch.schemaVersion;
  if (patch.importedAt !== undefined)     dbPatch['imported_at'] = patch.importedAt;
  if (patch.extractionModel !== undefined)
    dbPatch['extraction_model'] = patch.extractionModel;
  if (patch.extractionModelVersion !== undefined)
    dbPatch['extraction_model_version'] = patch.extractionModelVersion;
  if (patch.needsReview !== undefined)    dbPatch['needs_review'] = patch.needsReview;

  const { data, error } = await client
    .from('tax_slips')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    log('error', 'slip-store.updateSlip.error', {
      id,
      reason: error?.message ?? 'no data returned',
    });
    throw new Error(`updateSlip failed: ${error?.message ?? 'no data returned'}`);
  }

  return rowToUnifiedSlip(data as Record<string, unknown>);
}

/**
 * Fetch a single slip by ID. Returns null if not found.
 * Throws on Supabase errors.
 */
export async function getSlip(
  client: SupabaseClient,
  id: string,
): Promise<UnifiedSlip | null> {
  const { data, error } = await client
    .from('tax_slips')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    log('error', 'slip-store.getSlip.error', { id, reason: error.message });
    throw new Error(`getSlip failed: ${error.message}`);
  }

  if (!data) return null;
  return rowToUnifiedSlip(data as Record<string, unknown>);
}

/**
 * List all slips for a user and tax year, optionally filtered by status.
 * Returns an empty array if the user has no slips.
 */
export async function listSlipsByUserAndTaxYear(
  client: SupabaseClient,
  userId: string,
  taxYear: number,
  statusFilter?: UnifiedSlip['slipStatus'][],
): Promise<UnifiedSlip[]> {
  // Split into two queries to avoid the conditional .in() chain which causes
  // TypeScript "type instantiation is excessively deep" on the Supabase builder.
  const { data, error } = await (statusFilter && statusFilter.length > 0
    ? client
        .from('tax_slips')
        .select('*')
        .eq('user_id', userId)
        .eq('tax_year', taxYear)
        .in('slip_status', statusFilter)
        .order('created_at', { ascending: true })
    : client
        .from('tax_slips')
        .select('*')
        .eq('user_id', userId)
        .eq('tax_year', taxYear)
        .order('created_at', { ascending: true }));

  if (error) {
    log('error', 'slip-store.listSlips.error', {
      userId,
      taxYear,
      reason: error.message,
    });
    throw new Error(`listSlipsByUserAndTaxYear failed: ${error.message}`);
  }

  return ((data as Record<string, unknown>[]) ?? []).map(rowToUnifiedSlip);
}

/**
 * Flag a slip for human review. Sets slip_status → 'needs_review' and
 * needs_review → true. Optionally records the reason in rawExtractedData.
 */
export async function markSlipNeedsReview(
  client: SupabaseClient,
  id: string,
  reason?: string,
): Promise<void> {
  const patch: Partial<Omit<UnifiedSlip, 'id' | 'userId' | 'createdAt'>> = {
    slipStatus: 'needs_review',
    needsReview: true,
  };

  if (reason) {
    // Get the current rawExtractedData so we can append the reason.
    const existing = await getSlip(client, id);
    const currentRaw =
      (existing?.rawExtractedData as RawExtractedDataWithAudit | null) ?? {};
    patch.rawExtractedData = { ...currentRaw, _reviewReason: reason };
  }

  await updateSlip(client, id, patch);
}

/** Mark a slip as a duplicate of another slip. */
export async function markSlipDuplicate(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  await updateSlip(client, id, { slipStatus: 'duplicate' });
}

/**
 * Mark a slip as amended (a corrected version was issued by the employer/payer).
 * The original slip is not deleted — both are retained for audit.
 */
export async function markSlipAmended(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  await updateSlip(client, id, { slipStatus: 'amended' });
}

/**
 * Mark a slip as cancelled (the issuer voided it).
 * The slip is retained for audit but excluded from tax calculations.
 */
export async function markSlipCancelled(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  await updateSlip(client, id, { slipStatus: 'cancelled' });
}

/**
 * Record a user's manual correction to a slip field.
 *
 * - Updates boxes[box] = newValue
 * - Updates fieldProvenance[box] = { source: 'manual', needsReview: false, normalizedBox: box }
 * - Appends an audit entry to rawExtractedData._manualAudit
 *
 * Returns the updated UnifiedSlip. Does NOT clear needs_review on other fields —
 * the caller decides whether the overall slip is now review-complete.
 */
export async function recordManualOverride(
  client: SupabaseClient,
  id: string,
  box: string,
  previousValue: number | string | null,
  newValue: number | string | null,
  userId: string,
): Promise<UnifiedSlip> {
  const existing = await getSlip(client, id);
  if (!existing) {
    throw new Error(`recordManualOverride: slip ${id} not found`);
  }

  // Append to the audit log inside rawExtractedData
  const currentRaw =
    (existing.rawExtractedData as RawExtractedDataWithAudit | null) ?? {};
  const auditLog: ManualAuditEntry[] = Array.isArray(currentRaw['_manualAudit'])
    ? [...(currentRaw['_manualAudit'] as ManualAuditEntry[])]
    : [];

  auditLog.push({
    box,
    previousValue,
    newValue,
    userId,
    timestamp: new Date().toISOString(),
  });

  const updatedRaw: RawExtractedDataWithAudit = {
    ...currentRaw,
    _manualAudit: auditLog,
  };

  // Build updated slip (in memory first, then persist once)
  const withBox = setSlipBoxValue(existing, box, newValue, 'manual');

  return updateSlip(client, id, {
    boxes: withBox.boxes,
    fieldProvenance: withBox.fieldProvenance,
    rawExtractedData: updatedRaw,
  });
}
