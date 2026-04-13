/**
 * TaxAgent.ai — Retroactive Recovery Engine
 *
 * Analyzes a parsed Notice of Assessment and surfaces credits that were
 * eligible but not claimed. All calculations are deterministic TypeScript
 * using historical year constants — zero AI involvement.
 *
 * CRA allows T1-ADJ adjustments going back 10 years (ITA s.152(4.2)).
 *
 * Recovery opportunities checked (ordered by typical dollar value):
 *   1. Canada Workers Benefit (CWB) — line 45300, ITA s.122.7
 *   2. Age Amount — line 30100, ITA s.118(2)
 *   3. Tuition carryforward — lines 32300/32400, ITA s.118.61
 *   4. RRSP room notice — informational, not a T1-ADJ
 */

import { roundCRA } from '../tax-engine/federal/brackets';

// ============================================================
// HISTORICAL CWB CONSTANTS — ITA s.122.7
// CRA Schedule 6 (each year)
// ============================================================

/**
 * Year-specific CWB thresholds.
 * workingIncomeMin: minimum working income to be eligible ($3,000 all years).
 * Phase-out rate: 15% above clawback start (all years).
 */
const CWB_BY_YEAR: Record<number, {
  singleMax: number;
  familyMax: number;
  singleClawStart: number;
  familyClawStart: number;
  workingIncomeMin: number;
}> = {
  // CRA Schedule 6 (2022)
  2022: {
    singleMax:        1395,
    familyMax:        2403,
    singleClawStart:  22944,
    familyClawStart:  26177,
    workingIncomeMin: 3000,
  },
  // CRA Schedule 6 (2023)
  2023: {
    singleMax:        1428,
    familyMax:        2461,
    singleClawStart:  22944,
    familyClawStart:  26177,
    workingIncomeMin: 3000,
  },
  // CRA Schedule 6 (2024) — same max as 2025 (Bill C-4 changes)
  2024: {
    singleMax:        1518,
    familyMax:        2616,
    singleClawStart:  22944,
    familyClawStart:  26177,
    workingIncomeMin: 3000,
  },
  // 2025 — CWB constants from constants.ts
  2025: {
    singleMax:        1518,
    familyMax:        2616,
    singleClawStart:  22944,
    familyClawStart:  26177,
    workingIncomeMin: 3000,
  },
};

// ============================================================
// HISTORICAL AGE AMOUNT CONSTANTS — ITA s.118(2)
// CRA Schedule 1 (each year); clawback rate 15% all years
// ============================================================

const AGE_AMOUNT_BY_YEAR: Record<number, {
  max: number;
  clawbackStart: number;
  clawbackRate: number;
}> = {
  // CRA Schedule 1 (2022)
  2022: { max: 7898,  clawbackStart: 39826, clawbackRate: 0.15 },
  // CRA Schedule 1 (2023)
  2023: { max: 8396,  clawbackStart: 42335, clawbackRate: 0.15 },
  // CRA Schedule 1 (2024)
  2024: { max: 8790,  clawbackStart: 44325, clawbackRate: 0.15 },
  // CRA Schedule 1 (2025)
  2025: { max: 8790,  clawbackStart: 44325, clawbackRate: 0.15 },
};

// ============================================================
// FEDERAL CREDIT RATE — always 15%
// ============================================================

const FEDERAL_CREDIT_RATE = 0.15;

// ============================================================
// PUBLIC TYPES
// ============================================================

/** Confidence in whether the opportunity is real vs. speculative */
export type OpportunityConfidence = 'high' | 'medium' | 'low';

/**
 * A concrete opportunity to recover money via a T1-ADJ or informational notice.
 */
export interface RecoveryOpportunity {
  /** User-facing headline (e.g. "Canada Workers Benefit not claimed") */
  description: string;
  /** T1 line number relevant to this opportunity */
  lineNumber: string;
  /** Estimated additional tax credit or refund, in dollars */
  estimatedAmount: number;
  /** Plain-English instructions on how to claim */
  instructions: string;
  /** Whether a T1-ADJ (Request for Adjustment) form is required */
  t1AdjRequired: boolean;
  /** How confident we are that this is a real missed opportunity */
  confidence: OpportunityConfidence;
}

/** Options that augment the NOA data for more precise analysis */
export interface RecoveryOptions {
  /**
   * Whether the taxpayer had a spouse or qualifying dependant in that year.
   * Affects CWB family vs. single calculation.
   * Defaults to false (single) when not provided.
   */
  hasSpouseOrDependant?: boolean;
  /**
   * Taxpayer's age on December 31 of the tax year.
   * Required for age amount check — otherwise we flag it as medium-confidence.
   */
  ageOnDec31?: number;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Calculates eligible CWB for a given year, income, and family status.
 * Returns 0 if income exceeds the full phase-out range.
 * Returns -1 if the year has no CWB constants (pre-2022).
 */
function calcEligibleCWB(
  year: number,
  workingIncome: number,
  netIncome: number,
  hasSpouseOrDependant: boolean,
): number {
  const cwb = CWB_BY_YEAR[year];
  if (!cwb) return -1;
  if (workingIncome < cwb.workingIncomeMin) return 0;

  const maxAmount = hasSpouseOrDependant ? cwb.familyMax : cwb.singleMax;
  const clawStart = hasSpouseOrDependant ? cwb.familyClawStart : cwb.singleClawStart;

  if (netIncome <= clawStart) return maxAmount;
  const reduction = roundCRA((netIncome - clawStart) * 0.15);
  return Math.max(0, roundCRA(maxAmount - reduction));
}

/**
 * Calculates eligible age amount credit value (not just the amount, the tax reduction)
 * for a given year and net income.
 * Returns 0 if under 65 or income too high.
 * Returns -1 if year has no constants.
 */
function calcEligibleAgeCredit(
  year: number,
  netIncome: number,
  ageOnDec31: number,
): number {
  if (ageOnDec31 < 65) return 0;

  const aa = AGE_AMOUNT_BY_YEAR[year];
  if (!aa) return -1;

  if (netIncome <= aa.clawbackStart) {
    return roundCRA(aa.max * FEDERAL_CREDIT_RATE);
  }
  const reduction = roundCRA((netIncome - aa.clawbackStart) * aa.clawbackRate);
  const eligibleAmount = Math.max(0, roundCRA(aa.max - reduction));
  return roundCRA(eligibleAmount * FEDERAL_CREDIT_RATE);
}

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================

import type { ParsedNOA } from './noa-parser';

/**
 * Analyzes a parsed NOA and returns a list of recovery opportunities.
 *
 * The returned list is ordered by estimatedAmount descending (highest value first).
 * An empty array means no recovery opportunities were identified.
 */
export function analyzeReturn(
  noa: ParsedNOA,
  options: RecoveryOptions = {},
): RecoveryOpportunity[] {
  const { hasSpouseOrDependant = false, ageOnDec31 } = options;
  const opportunities: RecoveryOpportunity[] = [];

  // Working income = employment income + any business income (line 13500 not captured,
  // so we use line 10100 as a proxy — conservative, understates for self-employed)
  const workingIncome = Math.max(0, noa.line10100);
  const netIncome     = Math.max(0, noa.line23600);

  // ── CHECK 1: Canada Workers Benefit (CWB) ──────────────────────────────────
  // ITA s.122.7 — refundable credit for low-income workers.
  // line45300 = -1 → not printed on NOA → almost certainly not claimed.
  // line45300 = 0  → explicitly filed as $0.
  // Either way, if eligible amount > 0, they may have missed it.
  if (workingIncome >= 3000 && netIncome > 0) {
    const eligibleCWB = calcEligibleCWB(
      noa.taxYear,
      workingIncome,
      netIncome,
      hasSpouseOrDependant,
    );

    if (eligibleCWB > 0) {
      // line45300 not present on NOA (-1) → very likely not claimed
      // line45300 = 0 → claimed but got $0 (possible if they filed Schedule 6 incorrectly)
      const claimedCWB = Math.max(0, noa.line45300);  // treat -1 as 0 claimed
      const delta = roundCRA(eligibleCWB - claimedCWB);

      if (delta >= 50) {  // only surface if meaningful amount
        opportunities.push({
          description: 'Canada Workers Benefit (CWB) not fully claimed',
          lineNumber: '45300',
          estimatedAmount: delta,
          instructions:
            `File a T1-ADJ for your ${noa.taxYear} return. On Schedule 6 (Canada Workers Benefit), ` +
            `enter your working income and net income. The CWB is refundable — it adds directly to ` +
            `your refund even if you owe no tax. You can request this adjustment at My Account on ` +
            `CRA's website or mail Form T1-ADJ.`,
          t1AdjRequired: true,
          confidence: noa.line45300 === -1 ? 'high' : 'medium',
        });
      }
    }
  }

  // ── CHECK 2: Age Amount ─────────────────────────────────────────────────────
  // ITA s.118(2) — non-refundable credit for taxpayers who were 65+ on Dec 31.
  // line30100 = -1 → not on NOA → likely not claimed.
  if (noa.line30100 === -1 && netIncome > 0) {
    if (ageOnDec31 !== undefined) {
      // We know their age — precise calculation
      const eligibleAgeCredit = calcEligibleAgeCredit(noa.taxYear, netIncome, ageOnDec31);
      if (eligibleAgeCredit > 0) {
        opportunities.push({
          description: 'Age Amount not claimed (65+ credit)',
          lineNumber: '30100',
          estimatedAmount: eligibleAgeCredit,
          instructions:
            `File a T1-ADJ for your ${noa.taxYear} return. On Schedule 1, claim the Age Amount ` +
            `(line 30100). If your net income was under $${AGE_AMOUNT_BY_YEAR[noa.taxYear]?.clawbackStart.toLocaleString('en-CA') ?? 'the threshold'}, ` +
            `you receive the full credit. This reduces federal tax — not refundable, but reduces ` +
            `what you owe.`,
          t1AdjRequired: true,
          confidence: 'high',
        });
      }
    } else {
      // Age unknown — flag as low-confidence if income is in the eligible range
      const aaConstants = AGE_AMOUNT_BY_YEAR[noa.taxYear];
      if (aaConstants && netIncome < aaConstants.clawbackStart + (aaConstants.max / 0.15)) {
        // Estimate full credit if 65+
        const worstCaseCredit = roundCRA(aaConstants.max * FEDERAL_CREDIT_RATE);
        opportunities.push({
          description: 'Age Amount may not have been claimed (65+ credit)',
          lineNumber: '30100',
          estimatedAmount: worstCaseCredit,
          instructions:
            `If you were 65 or older on December 31, ${noa.taxYear}, you are eligible for the ` +
            `Age Amount (line 30100). File a T1-ADJ to claim it. The credit is up to ` +
            `$${worstCaseCredit.toFixed(0)} depending on your net income.`,
          t1AdjRequired: true,
          confidence: 'low',
        });
      }
    }
  }

  // ── CHECK 3: Tuition Carryforward ──────────────────────────────────────────
  // ITA s.118.61 — unused tuition credit from prior years carries forward indefinitely.
  // If the NOA shows a carryforward > 0 and line 32300 is 0 (or absent), it wasn't used.
  // The carryforward reduces federal tax at 15%.
  if (noa.tuitionCarryforward > 0) {
    const creditValue = roundCRA(noa.tuitionCarryforward * FEDERAL_CREDIT_RATE);
    opportunities.push({
      description: 'Unused tuition credit carryforward available',
      lineNumber: '32300',
      estimatedAmount: creditValue,
      instructions:
        `Your ${noa.taxYear} NOA shows $${noa.tuitionCarryforward.toLocaleString('en-CA')} of ` +
        `unused tuition carryforward (line 32300). This reduces your federal tax by ` +
        `$${creditValue.toFixed(2)}. Claim it on your NEXT unfiled or adjustable return — ` +
        `it cannot reduce income below zero but applies directly against tax payable.`,
      t1AdjRequired: false,  // Use it on the next return, not T1-ADJ for this year
      confidence: 'high',
    });
  }

  // ── CHECK 4: RRSP Room Informational ───────────────────────────────────────
  // Not a T1-ADJ item — RRSP contributions are for the current year.
  // We surface it as a planning opportunity if they have significant unused room.
  if (noa.rrspRoomNextYear >= 5000) {
    // Estimate tax savings at the 26% combined marginal rate (conservative for middle income)
    const estimatedSavings = roundCRA(noa.rrspRoomNextYear * 0.26);
    opportunities.push({
      description: 'Significant unused RRSP contribution room',
      lineNumber: '20800',
      estimatedAmount: estimatedSavings,
      instructions:
        `Your ${noa.taxYear} NOA shows $${noa.rrspRoomNextYear.toLocaleString('en-CA')} of ` +
        `available RRSP room. Contributing the maximum could reduce your ${noa.taxYear + 1} ` +
        `taxes by approximately $${estimatedSavings.toLocaleString('en-CA')} (estimated at ` +
        `your marginal rate). Contribute by March 1, ${noa.taxYear + 2} to claim the deduction ` +
        `on your ${noa.taxYear + 1} return. This is a planning opportunity, not a past amendment.`,
      t1AdjRequired: false,
      confidence: 'medium',
    });
  }

  // Sort by estimated amount descending — show highest-value opportunities first
  opportunities.sort((a, b) => b.estimatedAmount - a.estimatedAmount);

  return opportunities;
}

/**
 * Returns the total dollar value of all recovery opportunities.
 * Only sums t1AdjRequired opportunities (actual recoverable amounts).
 */
export function totalRecoverable(opportunities: RecoveryOpportunity[]): number {
  return roundCRA(
    opportunities
      .filter((o) => o.t1AdjRequired)
      .reduce((sum, o) => sum + o.estimatedAmount, 0),
  );
}
