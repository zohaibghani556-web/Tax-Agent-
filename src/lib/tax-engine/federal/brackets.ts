/**
 * Federal tax bracket calculations — ITA s.117
 * Progressive marginal rates: only income within each bracket is taxed at that rate.
 */

import { FEDERAL_BRACKETS } from '../constants';
import type { TaxBracket } from '../constants';

/**
 * CRA rounding: nearest cent, half rounds up (ITA s.257).
 */
export function roundCRA(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Applies progressive tax brackets to taxable income.
 * Each bracket's contribution is rounded separately before accumulating,
 * matching CRA's per-bracket rounding methodology.
 */
export function calculateTaxOnIncome(
  taxableIncome: number,
  brackets: TaxBracket[]
): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;

    // Only the income WITHIN this bracket is taxed at this rate
    const incomeInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += roundCRA(incomeInBracket * bracket.rate);
  }

  // Final round eliminates floating-point drift from summing per-bracket cents
  return roundCRA(tax);
}

/**
 * Federal tax on taxable income using 2025 federal brackets.
 * 2025 note: lowest rate is 14.5% (blended 15% Jan-Jun / 14% Jul-Dec).
 */
export function calculateFederalTaxOnIncome(taxableIncome: number): number {
  return calculateTaxOnIncome(taxableIncome, FEDERAL_BRACKETS);
}

/**
 * Returns the marginal rate — the rate that applies to the last dollar of income.
 * Useful for RRSP savings estimates and investment decisions.
 */
export function getMarginalRate(
  taxableIncome: number,
  brackets: TaxBracket[]
): number {
  if (taxableIncome <= 0) return brackets[0]?.rate ?? 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.max) return bracket.rate;
  }

  // Income exceeds all defined brackets — return the last bracket's rate
  return brackets[brackets.length - 1]?.rate ?? 0;
}

/**
 * Average (effective) tax rate: total tax as a percentage of taxable income.
 * Returns 0 for zero income to avoid division by zero.
 */
export function getAverageTaxRate(
  taxableIncome: number,
  taxPayable: number
): number {
  if (taxableIncome <= 0) return 0;
  return roundCRA((taxPayable / taxableIncome) * 100);
}
