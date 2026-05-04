/**
 * TaxAgent.ai — Tax File Graph Assembler
 *
 * Assembles a TaxFileGraph from 8 existing Supabase tables. This is a
 * READ-ONLY function — it never inserts, updates, or creates profiles.
 *
 * All queries go through RLS via the authenticated Supabase client.
 * Query cost is trivial (~20 slips, ~50 provenance records per user).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProvenanceRecord } from '@/lib/tax-engine/types/provenance';
import type { TaxCalculationResult } from '@/lib/tax-engine/types';
import type {
  TaxFileGraph,
  TaxFileStatus,
  TaxFileProfileNode,
  TaxFileDocumentNode,
  TaxFileSlipNode,
  TaxFileCorrectionNode,
  TaxFileCalculationNode,
  TaxFileReturnNode,
  TaxFileDeductionsNode,
  TaxFileEdge,
  TaxFileWarning,
  TaxFileSummary,
} from './types';

// ============================================================
// MAIN ENTRY POINT
// ============================================================

/**
 * Assemble the complete Tax File Graph for a user's tax year.
 *
 * READ-ONLY — never calls getOrCreateProfileContext. If no profile
 * exists, returns null (the user hasn't started their return yet).
 */
export async function assembleTaxFileGraph(
  supabase: SupabaseClient,
  userId: string,
  taxYear: number,
): Promise<TaxFileGraph | null> {
  // Step 1: Resolve profile (read-only — no creation)
  const { data: profileRow, error: profileErr } = await supabase
    .from('tax_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('tax_year', taxYear)
    .maybeSingle();

  if (profileErr || !profileRow) return null;

  const profileId = profileRow.id as string;

  const profile: TaxFileProfileNode = {
    profileId,
    userId: profileRow.user_id as string,
    taxYear: profileRow.tax_year as number,
    legalName: (profileRow.legal_name as string | null) ?? '',
    maritalStatus: (profileRow.marital_status as string | null) ?? 'single',
    residencyStatus: (profileRow.residency_status as string | null) ?? 'citizen',
    assessmentComplete: (profileRow.assessment_complete as boolean | null) ?? false,
    createdAt: (profileRow.created_at as string | null) ?? '',
    updatedAt: (profileRow.updated_at as string | null) ?? '',
  };

  // Step 2: Parallel queries to all remaining tables
  const [
    slipsResult,
    documentsResult,
    correctionsResult,
    calculationResult,
    returnResult,
    deductionsResult,
    messagesResult,
  ] = await Promise.all([
    querySlips(supabase, profileId),
    queryDocuments(supabase, userId),
    queryCorrections(supabase, userId),
    queryLatestCalculation(supabase, profileId),
    queryTaxReturn(supabase, profileId, taxYear),
    queryDeductions(supabase, profileId),
    queryMessages(supabase, profileId),
  ]);

  // Step 3: Build edges
  const edges = buildEdges(
    documentsResult,
    slipsResult,
    correctionsResult,
    returnResult,
  );

  // Step 4: Compute warnings (including chat-based missing slip detection)
  const warnings = computeWarnings(
    documentsResult,
    slipsResult,
    calculationResult,
    messagesResult,
  );

  // Step 5: Compute status
  const status = computeStatus(
    slipsResult,
    documentsResult,
    calculationResult,
    warnings,
  );

  // Step 6: Build summary
  const summary: TaxFileSummary = {
    documentCount: documentsResult.length,
    slipCount: slipsResult.length,
    correctionCount: correctionsResult.length,
    warningCount: warnings.length,
    unreviewedExtractionCount: documentsResult.filter((d) => !d.reviewedAt).length,
    hasCalculation: calculationResult !== null,
    hasReturn: returnResult !== null,
    hasDeductions: deductionsResult !== null,
  };

  return {
    profileId,
    taxYear,
    status,
    profile,
    documents: documentsResult,
    slips: slipsResult,
    corrections: correctionsResult,
    calculation: calculationResult,
    taxReturn: returnResult,
    deductions: deductionsResult,
    edges,
    warnings,
    summary,
    assembledAt: new Date().toISOString(),
  };
}

// ============================================================
// QUERY HELPERS — all read-only, all through RLS
// ============================================================

async function querySlips(
  supabase: SupabaseClient,
  profileId: string,
): Promise<TaxFileSlipNode[]> {
  const { data, error } = await supabase
    .from('tax_slips')
    .select('id, slip_type, issuer_name, boxes, source, file_hash, source_extraction_id, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return (data as Array<Record<string, unknown>>).map((row) => ({
    slipId: row.id as string,
    slipType: row.slip_type as string,
    issuerName: (row.issuer_name as string | null) ?? '',
    source: (row.source as string | null) ?? 'manual',
    boxes: (row.boxes as Record<string, number | string>) ?? {},
    fileHash: (row.file_hash as string | null) ?? null,
    sourceExtractionId: (row.source_extraction_id as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? '',
  }));
}

/**
 * Query slip_extractions. Wrapped in try/catch because this table may
 * not exist on all deployments (it was added after the initial schema).
 */
async function queryDocuments(
  supabase: SupabaseClient,
  userId: string,
): Promise<TaxFileDocumentNode[]> {
  try {
    const { data, error } = await supabase
      .from('slip_extractions')
      .select('id, slip_type_detected, status, classification_confidence, file_hash, boxes, reviewed_by_user_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => {
      const boxes = row.boxes as Record<string, unknown> | null;
      const boxCount = boxes && typeof boxes === 'object' ? Object.keys(boxes).length : 0;

      return {
        extractionId: row.id as string,
        slipTypeDetected: (row.slip_type_detected as string | null) ?? 'unknown',
        status: (row.status as string | null) ?? 'unknown',
        classificationConfidence: (row.classification_confidence as number | null) ?? null,
        fileHash: (row.file_hash as string | null) ?? null,
        boxCount,
        reviewedAt: (row.reviewed_by_user_at as string | null) ?? null,
        createdAt: (row.created_at as string | null) ?? '',
      };
    });
  } catch {
    // slip_extractions table may not exist
    return [];
  }
}

async function queryCorrections(
  supabase: SupabaseClient,
  userId: string,
): Promise<TaxFileCorrectionNode[]> {
  try {
    const { data, error } = await supabase
      .from('slip_corrections')
      .select('id, extraction_id, field_name, original_value, corrected_value, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => ({
      correctionId: row.id as string,
      extractionId: row.extraction_id as string,
      fieldName: row.field_name as string,
      originalValue: (row.original_value as string | null) ?? null,
      correctedValue: (row.corrected_value as string | null) ?? '',
      createdAt: (row.created_at as string | null) ?? '',
    }));
  } catch {
    // slip_corrections table may not exist
    return [];
  }
}

async function queryLatestCalculation(
  supabase: SupabaseClient,
  profileId: string,
): Promise<TaxFileCalculationNode | null> {
  const { data, error } = await supabase
    .from('tax_calculations')
    .select('id, total_income, net_income, taxable_income, federal_tax, ontario_tax, balance_owing, tax_deducted, calculated_at, detailed_breakdown')
    .eq('profile_id', profileId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const breakdown = data.detailed_breakdown as TaxCalculationResult | null;

  return {
    calculationId: data.id as string,
    totalIncome: Number(data.total_income ?? 0),
    netIncome: Number(data.net_income ?? 0),
    taxableIncome: Number(data.taxable_income ?? 0),
    netFederalTax: Number(data.federal_tax ?? 0),
    netOntarioTax: breakdown?.netOntarioTax ?? 0,
    totalTaxPayable: breakdown?.totalTaxPayable ?? 0,
    totalTaxDeducted: Number(data.tax_deducted ?? 0),
    balanceOwing: Number(data.balance_owing ?? 0),
    calculatedAt: (data.calculated_at as string | null) ?? '',
    detailedBreakdown: breakdown,
  };
}

async function queryTaxReturn(
  supabase: SupabaseClient,
  profileId: string,
  taxYear: number,
): Promise<TaxFileReturnNode | null> {
  // Prefer slips-mode return; fall back to flat
  for (const mode of ['slips', 'flat'] as const) {
    const { data, error } = await supabase
      .from('tax_returns')
      .select('engine_mode, engine_version, provenance_records, updated_at')
      .eq('profile_id', profileId)
      .eq('tax_year', taxYear)
      .eq('engine_mode', mode)
      .maybeSingle();

    if (!error && data) {
      return {
        engineMode: data.engine_mode as 'slips' | 'flat',
        engineVersion: (data.engine_version as string | null) ?? '0.0.0',
        provenanceRecords: (data.provenance_records as ProvenanceRecord[]) ?? [],
        updatedAt: (data.updated_at as string | null) ?? '',
      };
    }
  }

  return null;
}

async function queryDeductions(
  supabase: SupabaseClient,
  profileId: string,
): Promise<TaxFileDeductionsNode | null> {
  const { data, error } = await supabase
    .from('deductions_credits')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error || !data) return null;

  const medArr = Array.isArray(data.medical_expenses)
    ? (data.medical_expenses as Array<{ amount: number }>)
    : [];
  const donArr = Array.isArray(data.donations)
    ? (data.donations as Array<{ amount: number }>)
    : [];

  return {
    rrspContributions: Number(data.rrsp_contributions ?? 0),
    childcareExpenses: Number(data.childcare_expenses ?? 0),
    medicalExpenses: medArr.reduce((s, e) => s + (e.amount ?? 0), 0),
    charitableDonations: donArr.reduce((s, d) => s + (d.amount ?? 0), 0),
    studentLoanInterest: Number(data.student_loan_interest ?? 0),
    unionDues: Number(data.union_dues ?? 0),
    tuitionCarryforward: Number(data.tuition_carryforward ?? 0),
    movingExpenses: Number(data.moving_expenses ?? 0),
    rentPaid: Number(data.rent_paid ?? 0),
    propertyTaxPaid: Number(data.property_tax_paid ?? 0),
    hasDisabilityCredit: Boolean(data.has_disability_credit),
    homeBuyersEligible: Boolean(data.home_buyers_eligible),
  };
}

/**
 * Query chat messages for slip type mentions (used for missing-slip detection).
 * Returns just the assistant message content — we scan for slip type keywords.
 */
async function queryMessages(
  supabase: SupabaseClient,
  profileId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('content')
    .eq('profile_id', profileId)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return (data as Array<{ content: string }>).map((row) => row.content);
}

// ============================================================
// EDGE BUILDER
// ============================================================

function buildEdges(
  documents: TaxFileDocumentNode[],
  slips: TaxFileSlipNode[],
  corrections: TaxFileCorrectionNode[],
  taxReturn: TaxFileReturnNode | null,
): TaxFileEdge[] {
  const edges: TaxFileEdge[] = [];

  // source-of: extraction → slip (linked by source_extraction_id)
  for (const slip of slips) {
    if (slip.sourceExtractionId) {
      edges.push({
        type: 'source-of',
        extractionId: slip.sourceExtractionId,
        slipId: slip.slipId,
      });
    }
  }

  // corrected-by: extraction → correction
  for (const correction of corrections) {
    edges.push({
      type: 'corrected-by',
      extractionId: correction.extractionId,
      correctionId: correction.correctionId,
    });
  }

  // reviewed-by: extraction → review timestamp
  for (const doc of documents) {
    if (doc.reviewedAt) {
      edges.push({
        type: 'reviewed-by',
        extractionId: doc.extractionId,
        reviewedAt: doc.reviewedAt,
      });
    }
  }

  // supports-line: slip → provenance record (via slip source matching)
  if (taxReturn) {
    for (const prov of taxReturn.provenanceRecords) {
      if (prov.source.type === 'slip') {
        // Match by slip type and index from the provenance source
        const slipSource = prov.source as { type: 'slip'; slip_type: string; slip_index: number; box: string };
        const targetSlip = slips.filter((s) => s.slipType === slipSource.slip_type)[slipSource.slip_index];
        if (targetSlip) {
          edges.push({
            type: 'supports-line',
            slipId: targetSlip.slipId,
            lineFieldId: prov.field_id,
            value: prov.value,
          });
        }
      }
    }
  }

  return edges;
}

// ============================================================
// WARNING COMPUTATION
// ============================================================

/** Slip types that the AI assessment commonly mentions. */
const KNOWN_SLIP_TYPES = ['T4', 'T5', 'T5008', 'T3', 'T4A', 'T2202', 'T4E', 'T5007', 'T4AP', 'T4RSP', 'T4RIF', 'T4FHSA'];

function computeWarnings(
  documents: TaxFileDocumentNode[],
  slips: TaxFileSlipNode[],
  calculation: TaxFileCalculationNode | null,
  chatMessages: string[],
): TaxFileWarning[] {
  const warnings: TaxFileWarning[] = [];

  // Unreviewed OCR extractions
  const unreviewedDocs = documents.filter((d) => !d.reviewedAt && d.status === 'success');
  for (const doc of unreviewedDocs) {
    warnings.push({
      severity: 'warning',
      code: 'UNREVIEWED_EXTRACTION',
      message: `${doc.slipTypeDetected} extraction has not been reviewed`,
      action: 'Review extraction',
      actionHref: `/slips/review/${doc.extractionId}`,
    });
  }

  // Failed extractions
  const failedDocs = documents.filter((d) =>
    ['classification_failed', 'extraction_failed', 'validation_failed'].includes(d.status),
  );
  for (const doc of failedDocs) {
    warnings.push({
      severity: 'error',
      code: 'EXTRACTION_FAILED',
      message: `${doc.slipTypeDetected} extraction failed (${doc.status})`,
      action: 'Re-upload document',
      actionHref: '/slips',
    });
  }

  // Chat-based missing slip detection: scan assistant messages for slip type mentions
  const uploadedTypes = new Set(slips.map((s) => s.slipType));
  const mentionedInChat = new Set<string>();
  const chatText = chatMessages.join(' ');
  for (const slipType of KNOWN_SLIP_TYPES) {
    // Match "T4" but not "T4A" when looking for T4 — use word boundary
    const regex = new RegExp(`\\b${slipType}\\b`, 'i');
    if (regex.test(chatText) && !uploadedTypes.has(slipType)) {
      mentionedInChat.add(slipType);
    }
  }
  for (const slipType of mentionedInChat) {
    warnings.push({
      severity: 'info',
      code: 'MISSING_MENTIONED_SLIP',
      message: `${slipType} was mentioned in your assessment but no ${slipType} slip has been uploaded`,
      action: `Upload ${slipType}`,
      actionHref: '/slips',
    });
  }

  // No calculation yet despite having slips
  if (slips.length > 0 && !calculation) {
    warnings.push({
      severity: 'info',
      code: 'NO_CALCULATION',
      message: 'Slips uploaded but no tax calculation has been run yet',
      action: 'Run calculation',
      actionHref: '/calculator',
    });
  }

  return warnings;
}

// ============================================================
// STATUS COMPUTATION
// ============================================================

function computeStatus(
  slips: TaxFileSlipNode[],
  documents: TaxFileDocumentNode[],
  calculation: TaxFileCalculationNode | null,
  warnings: TaxFileWarning[],
): TaxFileStatus {
  // draft: no slips at all
  if (slips.length === 0) return 'draft';

  // needs_review: unreviewed OCR extractions exist
  const hasUnreviewedOcr = documents.some((d) => !d.reviewedAt && d.status === 'success');
  if (hasUnreviewedOcr) return 'needs_review';

  // reviewed: all extractions reviewed AND a calculation exists
  if (!calculation) return 'needs_review';

  // export_ready: reviewed + no error-level warnings
  const hasCriticalWarnings = warnings.some((w) => w.severity === 'error');
  if (hasCriticalWarnings) return 'reviewed';

  return 'export_ready';
}
