/**
 * TaxAgent.ai — Readiness Score Computation
 *
 * Computes a 0–100 score indicating how ready a tax file is for review.
 * Based entirely on TaxFileGraph data — no DB calls.
 *
 * Scoring rules:
 *   Start at 100, deduct for deficiencies:
 *   - Unreviewed extraction: -15 each
 *   - Missing mentioned slip (from chat): -10 each
 *   - No calculation exists: -25
 *   - Error-level warning: -20 each
 *   - No deductions entered: -5
 *
 *   Floor: 0 (never negative)
 */

import type { TaxFileGraph } from '@/lib/tax-file/types';

export interface ReadinessScoreBreakdown {
  score: number;
  deductions: {
    unreviewedExtractions: number;
    missingSlips: number;
    noCalculation: number;
    errorWarnings: number;
    noDeductions: number;
  };
}

const PENALTY_UNREVIEWED_EXTRACTION = 15;
const PENALTY_MISSING_SLIP = 10;
const PENALTY_NO_CALCULATION = 25;
const PENALTY_ERROR_WARNING = 20;
const PENALTY_NO_DEDUCTIONS = 5;

/**
 * Compute readiness score from an assembled TaxFileGraph.
 * Pure function — deterministic, no side effects.
 */
export function computeReadinessScore(graph: TaxFileGraph): ReadinessScoreBreakdown {
  const unreviewedCount = graph.summary.unreviewedExtractionCount;
  const missingSlipCount = graph.warnings.filter(
    (w) => w.code === 'MISSING_MENTIONED_SLIP',
  ).length;
  const errorWarningCount = graph.warnings.filter(
    (w) => w.severity === 'error',
  ).length;
  const hasNoCalculation = !graph.summary.hasCalculation;
  const hasNoDeductions = !graph.summary.hasDeductions;

  const unreviewedPenalty = unreviewedCount * PENALTY_UNREVIEWED_EXTRACTION;
  const missingSlipPenalty = missingSlipCount * PENALTY_MISSING_SLIP;
  const noCalcPenalty = hasNoCalculation ? PENALTY_NO_CALCULATION : 0;
  const errorPenalty = errorWarningCount * PENALTY_ERROR_WARNING;
  const noDeductionsPenalty = hasNoDeductions ? PENALTY_NO_DEDUCTIONS : 0;

  const totalPenalty =
    unreviewedPenalty + missingSlipPenalty + noCalcPenalty + errorPenalty + noDeductionsPenalty;

  return {
    score: Math.max(0, 100 - totalPenalty),
    deductions: {
      unreviewedExtractions: unreviewedPenalty,
      missingSlips: missingSlipPenalty,
      noCalculation: noCalcPenalty,
      errorWarnings: errorPenalty,
      noDeductions: noDeductionsPenalty,
    },
  };
}

/**
 * Count error-level warnings in a graph (used for approval gate).
 * Returns the number of unresolved error-level warnings.
 */
export function countErrorWarnings(graph: TaxFileGraph): number {
  return graph.warnings.filter((w) => w.severity === 'error').length;
}
