/**
 * Principal Residence Exemption (PRE) — ITA s.40(2)(b), s.54 "principal residence"
 * T2091 — Designation of a Property as a Principal Residence by an Individual
 * Schedule 3 — Capital Gains (or Losses)
 *
 * When a taxpayer designates a property as their principal residence for each
 * year they owned it, the capital gain on sale is fully exempt.
 *
 * Formula: Exempt portion = (1 + number of years designated) / total years owned
 * The "+1" is the extra year added under ITA s.40(2)(b)(ii) that allows
 * one year to overlap between a sold and purchased home.
 *
 * Partial designation (e.g., rental use for some years): partial gain is taxable
 * at the regular capital gains inclusion rate (50%/66.67% two-tier).
 *
 * Selling costs (agent commissions, legal fees) are deducted from the gain.
 */

import { CAPITAL_GAINS } from '../constants';
import { roundCRA } from './brackets';

export interface PrincipalResidenceInput {
  proceeds: number;            // Sale proceeds of the property
  acb: number;                 // Adjusted Cost Base (purchase price + improvements)
  sellingCosts: number;        // Agent commissions, legal fees on sale
  yearsOwned: number;          // Total number of calendar years owned (including partial)
  yearsDesignated: number;     // Years designated as principal residence (max = yearsOwned)
}

export interface PrincipalResidenceResult {
  totalGain: number;           // Proceeds − ACB − selling costs (before PRE)
  exemptGain: number;          // Gain sheltered by the PRE
  taxableGain: number;         // Gain remaining after PRE
  taxableGainInclusion: number; // Amount included in income after capital gains inclusion rates
  exemptionFraction: string;   // e.g., "7/6" for display
  fullyExempt: boolean;        // True when 100% of gain is exempt
  isLoss: boolean;             // True when proceeds < ACB (losses on principal residence not deductible)
}

/**
 * Applies the 2025 capital gains inclusion rate — flat 50% on all gains.
 * ITA s.38: CRA reverted to 50% for all 2025 T1 returns; the proposed two-thirds
 * rate above $250,000 was deferred to Jan 1, 2026.
 * Since CAPITAL_GAINS.inclusionRateLow === CAPITAL_GAINS.inclusionRateHigh === 0.50,
 * this simply applies the flat rate. The threshold split is not needed for 2025.
 */
function applyInclusionRate(netGain: number): number {
  if (netGain <= 0) return 0;
  return roundCRA(netGain * CAPITAL_GAINS.inclusionRateLow);
}

/**
 * Calculates the principal residence exemption.
 *
 * Capital gain = proceeds − ACB − selling costs.
 * Exempt fraction = min(1, (1 + yearsDesignated) / yearsOwned).
 * Taxable gain = totalGain × (1 − exempt fraction).
 *
 * If a loss results, it is NOT deductible (ITA s.40(2)(b) — PRE can shelter a gain
 * but a loss on a personal-use property is deemed nil per ITA s.40(2)(g)(iii)).
 */
export function calculatePrincipalResidenceExemption(
  input: PrincipalResidenceInput
): PrincipalResidenceResult {
  const { proceeds, acb, sellingCosts, yearsOwned, yearsDesignated } = input;

  const totalGain = roundCRA(proceeds - acb - sellingCosts);

  // A loss on a principal residence is not deductible
  if (totalGain <= 0) {
    return {
      totalGain,
      exemptGain: 0,
      taxableGain: 0,
      taxableGainInclusion: 0,
      exemptionFraction: `0/${Math.max(yearsOwned, 1)}`,
      fullyExempt: false,
      isLoss: true,
    };
  }

  // Exempt fraction cannot exceed 1 (i.e., can shelter up to 100% of the gain)
  const designatedPlusOne = Math.min(yearsDesignated + 1, yearsOwned);
  const exemptFraction    = designatedPlusOne / Math.max(yearsOwned, 1);
  const clampedFraction   = Math.min(1, exemptFraction);

  const exemptGain        = roundCRA(totalGain * clampedFraction);
  const taxableGain       = roundCRA(totalGain - exemptGain);
  const taxableGainInclusion = applyInclusionRate(taxableGain);
  const fullyExempt       = taxableGain <= 0;

  return {
    totalGain,
    exemptGain,
    taxableGain: Math.max(0, taxableGain),
    taxableGainInclusion,
    exemptionFraction: `${designatedPlusOne}/${yearsOwned}`,
    fullyExempt,
    isLoss: false,
  };
}
