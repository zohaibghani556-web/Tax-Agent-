/**
 * Ontario surtax — Ontario Taxation Act s.48
 * Applied on top of basic Ontario tax (after low-income reduction, before health premium).
 * Two additive tiers: 20% above threshold 1, plus an additional 36% above threshold 2.
 */

import { ONTARIO_SURTAX } from '../constants';
import { roundCRA } from '../federal/brackets';

/**
 * Calculates Ontario surtax on basic Ontario tax.
 *
 * Tier 1: 20% × max(0, basicOntarioTax − $5,818)
 * Tier 2: 36% × max(0, basicOntarioTax − $7,446)  [additive, not either/or]
 */
export function calculateOntarioSurtax(basicOntarioTax: number): number {
  const tier1 = Math.max(0, basicOntarioTax - ONTARIO_SURTAX.threshold1);
  const tier2 = Math.max(0, basicOntarioTax - ONTARIO_SURTAX.threshold2);

  return roundCRA(
    ONTARIO_SURTAX.rate1 * tier1 + ONTARIO_SURTAX.rate2 * tier2
  );
}
