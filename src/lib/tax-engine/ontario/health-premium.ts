/**
 * Ontario Health Premium — Ontario Taxation Act s.33.1
 * Based on taxable income (line 26000). Collected via personal income tax.
 *
 * Source: CRA T4032ON Jul 2025 — canada.ca/en/revenue-agency/services/forms-publications/
 *   payroll/t4032-payroll-deductions-tables/t4032on-july/t4032on-july-general-information.html
 * Tax year: 2025 | Verified: 2026-04-24
 *
 * 2025 premium tiers (by taxable income, "lesser of" formula per tier):
 *   ≤ $20,000          : $0
 *   $20,001–$36,000    : min($300, 6% × (income − $20,000))                → max $300
 *   $36,001–$48,000    : $300 + min($150, 6% × (income − $36,000))         → max $450
 *   $48,001–$72,000    : $450 + min($150, 25% × (income − $48,000))        → max $600
 *   $72,001–$200,000   : $600 + min($150, 25% × (income − $72,000))        → max $750
 *   $200,001+          : $750 + min($150, 25% × (income − $200,000))       → max $900
 *
 * NOTE: Tier 4 caps at $750 (NOT $900). The final $150 increment comes from tier 5.
 * Tier 4 reaches its cap at income = $72,600 (25% × $600 = $150).
 * Tier 5 reaches its cap at income = $200,600 (25% × $600 = $150).
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
    tier5Rate, tier5Max,
    maxPremium,
  } = ONTARIO_HEALTH_PREMIUM;

  if (taxableIncome <= tier1Start) return 0;

  if (taxableIncome <= tier1End) {
    // $20,001–$36,000: min($300, 6% of excess over $20,000)
    return roundCRA(Math.min(tier1Max, tier1Rate * (taxableIncome - tier1Start)));
  }

  if (taxableIncome <= tier2End) {
    // $36,001–$48,000: $300 + min($150, 6% of excess over $36,000)
    return roundCRA(tier1Max + Math.min(tier2Max, tier2Rate * (taxableIncome - tier1End)));
  }

  if (taxableIncome <= tier3End) {
    // $48,001–$72,000: $450 + min($150, 25% of excess over $48,000)
    return roundCRA(
      tier1Max + tier2Max +
      Math.min(tier3Max, tier3Rate * (taxableIncome - tier2End))
    );
  }

  if (taxableIncome <= tier4End) {
    // $72,001–$200,000: $600 + min($150, 25% of excess over $72,000); caps at $750
    return roundCRA(
      tier1Max + tier2Max + tier3Max +
      Math.min(tier4Max, tier4Rate * (taxableIncome - tier3End))
    );
  }

  // $200,001+: $750 + min($150, 25% of excess over $200,000); caps at $900
  return roundCRA(Math.min(
    maxPremium,
    tier1Max + tier2Max + tier3Max + tier4Max +
    tier5Rate * (taxableIncome - tier4End)
  ));
}
