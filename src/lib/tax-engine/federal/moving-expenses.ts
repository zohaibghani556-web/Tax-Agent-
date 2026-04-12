/**
 * Federal Moving Expenses Deduction — ITA s.62
 * CRA line 21900 of the T1 General return.
 *
 * A taxpayer may deduct eligible moving expenses when relocating to take up
 * new employment, self-employment, or full-time post-secondary education,
 * provided the new home is at least 40 km closer (by the shortest normal
 * route) to the new work/school location than the old home — the "40 km test".
 *
 * The deduction is limited to net income earned at the new location in the
 * year of the move. Unused expenses carry forward indefinitely (ITA s.62(1)(b))
 * to offset future income at the new location.
 *
 * Eligible expense categories are enumerated in ITA s.62(3) and described in
 * CRA Guide T4044 (Employment Expenses) and the T1-M form.
 */

import { roundCRA } from './brackets';
import type { MovingExpensesInput, MovingExpensesResult } from '../types';

/**
 * ITA s.62(1): 40 km eligibility test.
 *
 * The new residence must be at least 40 km closer (measured by the shortest
 * normal route) to the new work or school location than the old residence.
 * CRA interprets "shortest normal route" as ordinary road distance, not
 * straight-line distance.
 *
 * @param distanceOldHomeToNewWork  km from old home to new work/school
 * @param distanceNewHomeToNewWork  km from new home to new work/school
 */
export function passes40kmTest(
  distanceOldHomeToNewWork: number,
  distanceNewHomeToNewWork: number,
): boolean {
  return (distanceOldHomeToNewWork - distanceNewHomeToNewWork) >= 40;
}

/**
 * Computes the moving expenses deduction for CRA line 21900.
 *
 * Calculation sequence (per CRA T1-M form):
 *   1. Sum all eligible expense categories for the current year
 *   2. Add prior-year carryforward (ITA s.62(1)(b))
 *   3. Cap total at income earned at the new location in this tax year
 *   4. Excess (total − deduction) carries forward to the following year
 *
 * Returns eligible=false with all amounts at $0 when the 40 km test fails.
 */
export function calculateMovingExpenses(
  input: MovingExpensesInput,
): MovingExpensesResult {
  if (!passes40kmTest(input.distanceOldHomeToNewWork, input.distanceNewHomeToNewWork)) {
    return {
      eligible: false,
      totalEligibleExpenses: 0,
      currentYearDeduction: 0,
      carryforwardToNextYear: 0,
    };
  }

  // ITA s.62(3)(a)–(f): sum all eligible categories.
  // temporaryLiving is already externally capped to 15 days by the taxpayer.
  const currentYearExpenses = roundCRA(
    input.movingCosts +
    input.travelCosts +
    Math.max(0, input.temporaryLiving) +
    input.sellingCosts +
    input.legalFeesPurchase +
    input.leaseCancellationPenalty +
    input.vacantHomeMaintenance,
  );

  // Prior-year carryforward (ITA s.62(1)(b)) added before applying income cap
  const totalEligibleExpenses = roundCRA(
    currentYearExpenses + Math.max(0, input.priorYearCarryforward),
  );

  // Deduction limited to income earned at new location — ITA s.62(1)
  const incomeLimit = Math.max(0, input.incomeAtNewLocation);
  const currentYearDeduction = roundCRA(Math.min(totalEligibleExpenses, incomeLimit));
  const carryforwardToNextYear = roundCRA(totalEligibleExpenses - currentYearDeduction);

  return {
    eligible: true,
    totalEligibleExpenses,
    currentYearDeduction,
    carryforwardToNextYear,
  };
}
