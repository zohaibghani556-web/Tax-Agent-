/**
 * Pension Income Splitting Optimizer — ITA s.60.03, s.118(3)
 *
 * Under ITA s.60.03, the transferor spouse can elect to allocate up to 50%
 * of their "eligible pension income" to the recipient spouse's return.
 * The transferred amount is a deduction for the transferor (line 21000)
 * and income for the recipient (line 11600).
 *
 * Eligible pension income (for taxpayers under 65): NOT CPP/OAS — only T4A box 016.
 * Eligible pension income (for taxpayers 65+): T4A box 016, RRIF, CPP, life annuities.
 * For simplicity, this module accepts the eligible amount directly.
 *
 * Optimization: iterate from 0% to 50% in 1% increments, compute combined
 * federal + Ontario tax brackets for both spouses at each split, and return
 * the percentage that minimizes the household total.
 *
 * Bracket calculations use the progressive tax tables only (not full engine),
 * which is accurate for bracket optimization since credits are unchanged
 * (both spouses still get BPA etc.). For a full-engine comparison, use
 * calculateTaxReturn directly.
 */

import { FEDERAL_BRACKETS, ONTARIO_BRACKETS } from '../constants';
import { calculateTaxOnIncome, roundCRA } from './brackets';

export interface PensionSplitInput {
  transferorTaxableIncome: number;   // Transferor's taxable income before split
  recipientTaxableIncome: number;    // Recipient's taxable income before split
  eligiblePensionIncome: number;     // The transferable pension amount (T4A box 016 etc.)
}

export interface PensionSplitResult {
  optimalSplitPct: number;           // 0–50 (integer percent)
  optimalSplitAmount: number;        // Dollar amount transferred
  taxSaving: number;                 // Combined tax saving vs 0% split
  noSplitTax: number;                // Combined tax at 0% split (baseline)
  optimalTax: number;                // Combined tax at optimal split
  breakdown: PensionSplitBreakdown[];// All 51 scenarios (0% to 50%) for UI charting
}

export interface PensionSplitBreakdown {
  splitPct: number;
  splitAmount: number;
  transferorTax: number;
  recipientTax: number;
  combinedTax: number;
}

/**
 * Combined federal + Ontario tax on taxable income (brackets only, no credits).
 * Credits are held constant in both scenarios so comparing bracket tax is sufficient.
 */
function combinedBracketTax(taxableIncome: number): number {
  return roundCRA(
    calculateTaxOnIncome(taxableIncome, FEDERAL_BRACKETS) +
    calculateTaxOnIncome(taxableIncome, ONTARIO_BRACKETS)
  );
}

/**
 * Finds the optimal pension split percentage (0%–50%) that minimizes
 * combined household federal + Ontario tax.
 *
 * Returns the optimal percentage, the dollar saving, and a full breakdown
 * for all 51 split points so the UI can plot the curve.
 */
export function optimizePensionSplit(input: PensionSplitInput): PensionSplitResult {
  const {
    transferorTaxableIncome,
    recipientTaxableIncome,
    eligiblePensionIncome,
  } = input;

  const maxTransfer = roundCRA(eligiblePensionIncome * 0.50);

  const breakdown: PensionSplitBreakdown[] = [];
  let optimalSplitPct  = 0;
  let optimalCombined  = Infinity;

  for (let pct = 0; pct <= 50; pct++) {
    const splitAmount       = roundCRA(eligiblePensionIncome * (pct / 100));
    const clampedAmount     = Math.min(splitAmount, maxTransfer);

    const transferorIncome  = roundCRA(transferorTaxableIncome - clampedAmount);
    const recipientIncome   = roundCRA(recipientTaxableIncome  + clampedAmount);

    const transferorTax     = combinedBracketTax(Math.max(0, transferorIncome));
    const recipientTax      = combinedBracketTax(Math.max(0, recipientIncome));
    const combinedTax       = roundCRA(transferorTax + recipientTax);

    breakdown.push({ splitPct: pct, splitAmount: clampedAmount, transferorTax, recipientTax, combinedTax });

    if (combinedTax < optimalCombined) {
      optimalCombined = combinedTax;
      optimalSplitPct = pct;
    }
  }

  const noSplitTax      = breakdown[0].combinedTax;
  const optimalEntry    = breakdown[optimalSplitPct];
  const optimalTax      = optimalEntry.combinedTax;
  const taxSaving       = roundCRA(noSplitTax - optimalTax);
  const optimalSplitAmount = optimalEntry.splitAmount;

  return {
    optimalSplitPct,
    optimalSplitAmount,
    taxSaving,
    noSplitTax,
    optimalTax,
    breakdown,
  };
}
