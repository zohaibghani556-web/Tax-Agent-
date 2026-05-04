/**
 * TaxAgent.ai — Tax File Graph Types
 *
 * The Tax File Graph is the core product object. It connects documents,
 * extractions, corrections, slips, calculations, provenance, and review
 * status into one reviewable file. A CPA can answer: "Where did this
 * number come from? What's missing? Is this file ready?"
 *
 * This is a READ MODEL — assembled per-request from 8 existing Supabase
 * tables. No new tables, no schema changes. The graph is computed, not stored.
 */

import type { ProvenanceRecord } from '@/lib/tax-engine/types/provenance';
import type { TaxCalculationResult, TaxWarning } from '@/lib/tax-engine/types';

// ============================================================
// GRAPH STATUS MODEL
// ============================================================

/**
 * Computed from data completeness — never stored.
 *
 * - draft: profile exists, zero slips
 * - needs_review: slips exist but unreviewed OCR extractions or missing expected slips
 * - reviewed: all OCR extractions reviewed, calculation exists
 * - export_ready: reviewed + no critical warnings
 */
export type TaxFileStatus = 'draft' | 'needs_review' | 'reviewed' | 'export_ready';

// ============================================================
// NODE TYPES — one per source table
// ============================================================

export interface TaxFileProfileNode {
  profileId: string;
  userId: string;
  taxYear: number;
  legalName: string;
  maritalStatus: string;
  residencyStatus: string;
  assessmentComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

/** From slip_extractions — an OCR attempt on an uploaded document. */
export interface TaxFileDocumentNode {
  extractionId: string;
  slipTypeDetected: string;
  status: string;
  classificationConfidence: number | null;
  fileHash: string | null;
  boxCount: number;
  reviewedAt: string | null;
  createdAt: string;
}

/** From tax_slips — a reviewed, profile-owned tax input. */
export interface TaxFileSlipNode {
  slipId: string;
  slipType: string;
  issuerName: string;
  source: string;
  boxes: Record<string, number | string>;
  fileHash: string | null;
  sourceExtractionId: string | null;
  createdAt: string;
}

/** From slip_corrections — a user correction to an extracted field. */
export interface TaxFileCorrectionNode {
  correctionId: string;
  extractionId: string;
  fieldName: string;
  originalValue: string | null;
  correctedValue: string;
  createdAt: string;
}

/** From tax_calculations — the latest calculation snapshot. */
export interface TaxFileCalculationNode {
  calculationId: string;
  totalIncome: number;
  netIncome: number;
  taxableIncome: number;
  netFederalTax: number;
  netOntarioTax: number;
  totalTaxPayable: number;
  totalTaxDeducted: number;
  balanceOwing: number;
  calculatedAt: string;
  /** Full TaxCalculationResult stored as JSONB — available for deep inspection. */
  detailedBreakdown: TaxCalculationResult | null;
}

/** From tax_returns — the provenance-rich latest return. */
export interface TaxFileReturnNode {
  engineMode: 'slips' | 'flat';
  engineVersion: string;
  provenanceRecords: ProvenanceRecord[];
  updatedAt: string;
}

/** From deductions_credits — user-entered deductions and credits. */
export interface TaxFileDeductionsNode {
  rrspContributions: number;
  childcareExpenses: number;
  medicalExpenses: number;
  charitableDonations: number;
  studentLoanInterest: number;
  unionDues: number;
  tuitionCarryforward: number;
  movingExpenses: number;
  rentPaid: number;
  propertyTaxPaid: number;
  hasDisabilityCredit: boolean;
  homeBuyersEligible: boolean;
}

// ============================================================
// EDGES — computed relationships between nodes
// ============================================================

/**
 * Discriminated union of relationships in the Tax File Graph.
 *
 * - source-of: extraction → slip (OCR produced this slip)
 * - corrected-by: extraction → correction (user corrected this extraction)
 * - supports-line: slip → CRA return line (via provenance)
 * - missing-from: expected slip type not uploaded
 * - reviewed-by: extraction → review timestamp
 */
export type TaxFileEdge =
  | { type: 'source-of'; extractionId: string; slipId: string }
  | { type: 'corrected-by'; extractionId: string; correctionId: string }
  | { type: 'supports-line'; slipId: string; lineFieldId: string; value: number }
  | { type: 'missing-from'; slipType: string; reason: string }
  | { type: 'reviewed-by'; extractionId: string; reviewedAt: string };

// ============================================================
// WARNINGS
// ============================================================

export interface TaxFileWarning {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  /** Optional action the user can take (e.g., "Upload T4" or "Review extraction"). */
  action?: string;
  /** Link to resolve (e.g., extraction review page). */
  actionHref?: string;
}

// ============================================================
// SUMMARY
// ============================================================

export interface TaxFileSummary {
  documentCount: number;
  slipCount: number;
  correctionCount: number;
  warningCount: number;
  unreviewedExtractionCount: number;
  hasCalculation: boolean;
  hasReturn: boolean;
  hasDeductions: boolean;
}

// ============================================================
// THE GRAPH — top-level object
// ============================================================

export interface TaxFileGraph {
  profileId: string;
  taxYear: number;
  status: TaxFileStatus;

  profile: TaxFileProfileNode;
  documents: TaxFileDocumentNode[];
  slips: TaxFileSlipNode[];
  corrections: TaxFileCorrectionNode[];
  calculation: TaxFileCalculationNode | null;
  taxReturn: TaxFileReturnNode | null;
  deductions: TaxFileDeductionsNode | null;

  edges: TaxFileEdge[];
  warnings: TaxFileWarning[];
  summary: TaxFileSummary;

  /** ISO 8601 timestamp of when the graph was assembled. */
  assembledAt: string;
}
