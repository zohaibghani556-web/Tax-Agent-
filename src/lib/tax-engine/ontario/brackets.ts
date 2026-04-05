/**
 * Ontario tax bracket calculations — Ontario Taxation Act s.8
 * Progressive marginal rates applied to taxable income.
 */

import { ONTARIO_BRACKETS } from '../constants';
import { calculateTaxOnIncome } from '../federal/brackets';

/**
 * Ontario income tax before surtax, low-income reduction, or health premium.
 * Uses the same progressive bracket engine as the federal calculation.
 */
export function calculateOntarioTaxOnIncome(taxableIncome: number): number {
  return calculateTaxOnIncome(taxableIncome, ONTARIO_BRACKETS);
}
