/**
 * Ontario Health Premium — Ontario Taxation Act s.33.1
 * Based on taxable income (not basic Ontario tax). Collected via personal income tax.
 * The premium funds Ontario's publicly funded health services.
 */

import { ONTARIO_HEALTH_PREMIUM_BRACKETS } from '../constants';
import { roundCRA } from '../federal/brackets';

/**
 * Calculates the Ontario Health Premium for the tax year.
 * Finds the matching income bracket and applies: base + rate × (income − bracketMin).
 */
export function calculateOntarioHealthPremium(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  for (const bracket of ONTARIO_HEALTH_PREMIUM_BRACKETS) {
    if (taxableIncome <= bracket.max) {
      return roundCRA(bracket.base + bracket.rate * (taxableIncome - bracket.min));
    }
  }

  // Income exceeds all defined brackets — return the final bracket's base (capped at $900)
  const last = ONTARIO_HEALTH_PREMIUM_BRACKETS[ONTARIO_HEALTH_PREMIUM_BRACKETS.length - 1];
  return last.base;
}
