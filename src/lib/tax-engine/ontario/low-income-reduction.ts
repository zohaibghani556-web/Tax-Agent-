/**
 * Ontario low-income tax reduction — Ontario Taxation Act s.8(3)
 * Reduces Ontario tax payable for lower-income individuals. The base reduction is
 * clawed back once taxable income exceeds the threshold, at the lowest Ontario rate.
 */

import { ONTARIO_LOW_INCOME_REDUCTION } from '../constants';
import { roundCRA } from '../federal/brackets';

/**
 * Calculates the Ontario low-income reduction.
 *
 * Base reduction: $294
 * Claw-back: 5.05% of taxable income over $18,569
 * The reduction cannot exceed the basic Ontario tax (cannot create a negative tax).
 */
export function calculateLowIncomeReduction(
  basicOntarioTax: number,
  taxableIncome: number
): number {
  const { baseReduction, clawbackStart, clawbackRate } = ONTARIO_LOW_INCOME_REDUCTION;

  const clawback = Math.max(0, taxableIncome - clawbackStart) * clawbackRate;
  const reduction = Math.max(0, baseReduction - clawback);

  // Cannot reduce Ontario tax below zero
  return roundCRA(Math.min(basicOntarioTax, reduction));
}
