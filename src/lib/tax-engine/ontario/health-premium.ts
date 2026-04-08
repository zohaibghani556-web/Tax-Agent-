/**
 * Ontario Health Premium — Ontario Taxation Act s.33.1
 * Based on taxable income (not basic Ontario tax). Collected via personal income tax.
 *
 * CRA formula: graduated "lesser of" tiers. Each tier adds an amount capped by a maximum.
 * Source: CRA ON428, line 62: canada.ca/en/revenue-agency/services/tax/individuals/topics/
 *   about-your-tax-return/completing-a-tax-return/provincial-territorial-tax-credits-individuals/
 *   ontario-tax-ob428/line-62-ontario-health-premium.html
 *
 * 2025 premium tiers (by taxable income):
 *   ≤ $20,000         : $0
 *   $20,001–$36,000   : lesser of $300 and 6% of (income − $20,000)
 *   $36,001–$48,000   : $300 + lesser of $150 and 6% of (income − $36,000)
 *   $48,001–$72,000   : $450 + lesser of $150 and 25% of (income − $48,000)
 *   $72,001–$200,000  : $600 + lesser of $300 and 25% of (income − $72,000)
 *   > $200,000        : $900
 */

import { ONTARIO_HEALTH_PREMIUM } from '../constants';
import { roundCRA } from '../federal/brackets';

/**
 * Calculates the Ontario Health Premium for 2025.
 * Each tier uses a "lesser of [max] or [rate × excess]" formula.
 */
export function calculateOntarioHealthPremium(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  const {
    tier1Start, tier1End, tier1Rate, tier1Max,
    tier2End, tier2Rate, tier2Max,
    tier3End, tier3Rate, tier3Max,
    tier4End, tier4Rate, tier4Max,
    maxPremium,
  } = ONTARIO_HEALTH_PREMIUM;

  if (taxableIncome <= tier1Start) return 0;

  if (taxableIncome <= tier1End) {
    // $20,001–$36,000: lesser of $300 or 6% of excess over $20,000
    return roundCRA(Math.min(tier1Max, tier1Rate * (taxableIncome - tier1Start)));
  }

  if (taxableIncome <= tier2End) {
    // $36,001–$48,000: $300 + lesser of $150 or 6% of excess over $36,000
    return roundCRA(tier1Max + Math.min(tier2Max, tier2Rate * (taxableIncome - tier1End)));
  }

  if (taxableIncome <= tier3End) {
    // $48,001–$72,000: $450 + lesser of $150 or 25% of excess over $48,000
    return roundCRA(
      tier1Max + tier2Max +
      Math.min(tier3Max, tier3Rate * (taxableIncome - tier2End))
    );
  }

  if (taxableIncome <= tier4End) {
    // $72,001–$200,000: $600 + lesser of $300 or 25% of excess over $72,000
    return roundCRA(
      tier1Max + tier2Max + tier3Max +
      Math.min(tier4Max, tier4Rate * (taxableIncome - tier3End))
    );
  }

  // > $200,000: flat $900
  return maxPremium;
}
