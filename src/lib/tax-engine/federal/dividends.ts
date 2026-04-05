/**
 * Dividend income calculations — ITA s.82, s.121
 * Gross-up and dividend tax credit (DTC) rules for eligible and non-eligible dividends.
 *
 * IMPORTANT: T5 box 25 and T3 box 23 already contain the grossed-up (taxable) amount.
 * The gross-up has already been applied by the payer. We use the taxable amounts directly
 * and compute the corresponding DTC from them.
 */

import { DIVIDENDS } from '../constants';
import { roundCRA } from './brackets';
import type { T5Slip, T3Slip } from '../types';

export interface DividendIncomeResult {
  /** Grossed-up eligible dividends — CRA line 12000 */
  eligibleTaxable: number;
  /** Grossed-up non-eligible dividends — CRA line 12010 */
  nonEligibleTaxable: number;
  /** Federal DTC for eligible dividends (Schedule 1) */
  federalDTC: number;
  /** Federal DTC for non-eligible dividends (Schedule 1) */
  federalNonEligibleDTC: number;
  /** Ontario DTC for eligible dividends (ON428) */
  ontarioDTC: number;
  /** Ontario DTC for non-eligible dividends (ON428) */
  ontarioNonEligibleDTC: number;
}

/**
 * Aggregates dividend income and computes dividend tax credits from T5 and T3 slips.
 *
 * Eligible dividends (T5 box 25, T3 box 23): grossed up at 38%.
 *   Federal DTC = taxable × 15.0198% (ITA s.121(a))
 *   Ontario DTC = taxable × 10% (Ontario Taxation Act s.19.1)
 *
 * Non-eligible dividends (T5 box 11, T3 box 32): grossed up at 15%.
 *   Federal DTC = taxable × 9.0301% (ITA s.121(b))
 *   Ontario DTC = taxable × 2.8571% (Ontario Taxation Act s.19.1)
 */
export function calculateDividendIncome(
  t5Slips: T5Slip[],
  t3Slips: T3Slip[]
): DividendIncomeResult {
  let eligibleTaxable = 0;
  let nonEligibleTaxable = 0;

  // T5 box 25 = taxable eligible dividends (already grossed up by 38%)
  // T5 box 11 = taxable non-eligible dividends (already grossed up by 15%)
  for (const slip of t5Slips) {
    eligibleTaxable = roundCRA(eligibleTaxable + (slip.box25 ?? 0));
    nonEligibleTaxable = roundCRA(nonEligibleTaxable + (slip.box11 ?? 0));
  }

  // T3 box 23 = taxable eligible dividends; T3 box 32 = taxable other (non-eligible) dividends
  for (const slip of t3Slips) {
    eligibleTaxable = roundCRA(eligibleTaxable + (slip.box23 ?? 0));
    nonEligibleTaxable = roundCRA(nonEligibleTaxable + (slip.box32 ?? 0));
  }

  const federalDTC = roundCRA(eligibleTaxable * DIVIDENDS.eligible.federalCreditRate);
  const federalNonEligibleDTC = roundCRA(nonEligibleTaxable * DIVIDENDS.nonEligible.federalCreditRate);
  const ontarioDTC = roundCRA(eligibleTaxable * DIVIDENDS.eligible.ontarioCreditRate);
  const ontarioNonEligibleDTC = roundCRA(nonEligibleTaxable * DIVIDENDS.nonEligible.ontarioCreditRate);

  return {
    eligibleTaxable,
    nonEligibleTaxable,
    federalDTC,
    federalNonEligibleDTC,
    ontarioDTC,
    ontarioNonEligibleDTC,
  };
}
