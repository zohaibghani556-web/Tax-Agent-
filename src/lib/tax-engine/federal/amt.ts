/**
 * Alternative Minimum Tax (AMT) — ITA s.127.5, s.127.52
 *
 * The 2024 budget (effective 2024+) significantly reformed AMT:
 *   - Rate increased from 15% to 20.5%
 *   - Basic exemption increased from $40,000 (indexed) to $173,205
 *   - Capital gains: 100% inclusion in AMT base (vs 50%/66.67% regular)
 *   - Charitable donations: 30% add-back of the donation deduction
 *   - Employee stock options: 100% of benefit in AMT base
 *   - Most deductions are limited to 50% of their regular value
 *
 * AMT payable = max(regular federal tax, AMT_base_tax)
 * Excess AMT over regular tax can be carried forward 7 years as a credit (line 40425).
 *
 * Primary impact: high-income earners with large capital gains, stock options,
 * significant charitable donations, or loss deductions.
 */

import { AMT } from '../constants';
import { roundCRA } from './brackets';
import { calculateFederalTaxOnIncome } from './brackets';

export interface AMTInput {
  regularTaxableIncome: number;
  regularFederalTax: number;     // Net federal tax before AMT (after all credits)

  // Income adjustments for AMT base
  netCapitalGains: number;       // From Schedule 3 (before inclusion rate)
  regularCapitalGainsInclusion: number;  // Amount included in regular taxable income
  stockOptionBenefit: number;    // T4 box 38 — already in regular income; no add-back needed
  stockOptionDeduction: number;  // Line 24900 — 50% deduction; must be added back for AMT

  // Deduction adjustments
  totalDonations: number;        // For 30% add-back rule
  donationDeductionClaimed: number;  // Actual donation deduction in net income

  // Other AMT adjustments
  lossDeductionsLimited: number; // Certain loss deductions limited to 50% for AMT
}

export interface AMTResult {
  amtApplicable: boolean;        // true if AMT > regular federal tax
  adjustedTaxableIncome: number; // AMT base before exemption
  amtBaseAfterExemption: number; // ATI minus $173,205 exemption
  amtTax: number;                // 20.5% × base after exemption
  regularFederalTax: number;     // For comparison
  amtPayable: number;            // max(regular, AMT) — this replaces netFederalTax
  amtCarryforward: number;       // Excess AMT over regular tax (7-year carryforward)
}

/**
 * Calculates the AMT base (Adjusted Taxable Income) by adding back
 * preferences and adjustments to regular taxable income.
 *
 * Key adjustments (ITA s.127.52):
 * 1. Capital gains: regular includes 50%/66.67%; AMT requires 100% inclusion
 *    → add back (netCapitalGains − regularCapitalGainsInclusion)
 * 2. Stock option deduction: 50% deduction at line 24900 is disallowed for AMT
 *    → add back the deduction
 * 3. Charitable donations: 30% of donations add back
 * 4. Certain loss deductions limited to 50%
 */
export function calculateAMTBase(input: AMTInput): number {
  // Capital gains add-back: AMT requires 100% inclusion
  // Regular taxable income already includes regularCapitalGainsInclusion
  // AMT wants 100% of net gains, so add back the difference
  const capitalGainsAddBack = roundCRA(
    input.netCapitalGains - input.regularCapitalGainsInclusion
  );

  // Stock option deduction add-back: line 24900 deduction disallowed for AMT
  const stockOptionAddBack = roundCRA(input.stockOptionDeduction);

  // Charitable donation add-back: 30% of donations not deductible for AMT
  const donationAddBack = roundCRA(input.totalDonations * 0.30);

  // Loss deduction limitation
  const lossAddBack = roundCRA(input.lossDeductionsLimited * 0.50);

  const ati = roundCRA(
    input.regularTaxableIncome +
    Math.max(0, capitalGainsAddBack) +
    stockOptionAddBack +
    donationAddBack +
    lossAddBack
  );

  return ati;
}

/**
 * Calculates Alternative Minimum Tax.
 * Returns AMT result; if amtApplicable = false, no action needed on the return.
 */
export function calculateAMT(input: AMTInput): AMTResult {
  const adjustedTaxableIncome = calculateAMTBase(input);

  // Apply $173,205 basic exemption
  const amtBaseAfterExemption = Math.max(0, roundCRA(adjustedTaxableIncome - AMT.exemption));

  // AMT = 20.5% × base after exemption
  const amtTax = roundCRA(amtBaseAfterExemption * AMT.rate);

  const regularFederalTax = input.regularFederalTax;

  // AMT applies only when it exceeds regular federal tax
  const amtApplicable = amtTax > regularFederalTax;
  const amtPayable    = Math.max(regularFederalTax, amtTax);

  // Excess AMT can be carried forward 7 years as a credit (ITA s.120.2)
  const amtCarryforward = amtApplicable ? roundCRA(amtTax - regularFederalTax) : 0;

  return {
    amtApplicable,
    adjustedTaxableIncome,
    amtBaseAfterExemption,
    amtTax,
    regularFederalTax,
    amtPayable,
    amtCarryforward,
  };
}
