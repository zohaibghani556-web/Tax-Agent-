/**
 * HBP (Home Buyers' Plan) and LLP (Lifelong Learning Plan) repayment calculations.
 *
 * HBP — ITA s.146.01:
 *   Allows withdrawal from RRSP (up to $35,000) to buy a first home.
 *   Repayment period: 15 years, starting 2 years after the calendar year of first withdrawal.
 *   Minimum annual repayment = total balance ÷ remaining years in period.
 *   If the taxpayer does not repay the minimum, the shortfall is added to RRSP income
 *   on line 12900 for that year (treated as a withdrawal).
 *
 * LLP — ITA s.146.02:
 *   Allows withdrawal from RRSP (up to $10,000/year, $20,000 lifetime) for full-time
 *   education. Repayment period: 10 years.
 *   Shortfall → line 12900 (same as HBP).
 *
 * Both plans share line 24600 on the T1 for repayments made during the year.
 */

import { roundCRA } from './brackets';

// ── HBP ─────────────────────────────────────────────────────────────────────

export interface HBPRepaymentInput {
  /** Total HBP amount originally withdrawn (maximum $35,000 per ITA s.146.01) */
  totalWithdrawn: number;
  /** Calendar year of the first RRSP withdrawal under the HBP */
  yearOfFirstWithdrawal: number;
  /** Current tax year being calculated (2025) */
  taxYear: number;
  /** Amount the taxpayer is repaying this year (line 24600) */
  amountRepaidThisYear: number;
}

export interface HBPRepaymentResult {
  /** CRA minimum repayment required this year */
  minimumRequired: number;
  /** Amount repaid as supplied (may exceed minimum) */
  amountRepaid: number;
  /** Shortfall = max(0, minimumRequired − amountRepaid) */
  shortfall: number;
  /** Shortfall added to income (line 12900) per ITA s.146.01(3)(c) */
  addedToIncome: number;
  /** Remaining balance after this year's repayment */
  remainingBalance: number;
  /** Years left in the 15-year repayment period */
  repaymentYearsLeft: number;
}

/**
 * Calculates the HBP repayment obligation for a given tax year.
 *
 * The 15-year repayment period begins in the SECOND year after the calendar year
 * of the first withdrawal. For example, a 2020 withdrawal starts repayments in 2022.
 * Year 1 of repayments = yearOfFirstWithdrawal + 2.
 * Year 15 (final) = yearOfFirstWithdrawal + 16.
 */
export function calculateHBPRepayment(input: HBPRepaymentInput): HBPRepaymentResult {
  const { totalWithdrawn, yearOfFirstWithdrawal, taxYear, amountRepaidThisYear } = input;

  // Repayment period starts 2 years after first withdrawal year
  const repaymentStartYear = yearOfFirstWithdrawal + 2;
  const repaymentEndYear   = yearOfFirstWithdrawal + 16; // 15 years of repayment

  // Before the repayment period starts, no minimum is required
  if (taxYear < repaymentStartYear) {
    return {
      minimumRequired: 0,
      amountRepaid: roundCRA(amountRepaidThisYear),
      shortfall: 0,
      addedToIncome: 0,
      remainingBalance: roundCRA(Math.max(0, totalWithdrawn - amountRepaidThisYear)),
      repaymentYearsLeft: 15,
    };
  }

  // After the period ends, any remaining balance becomes income
  if (taxYear > repaymentEndYear) {
    return {
      minimumRequired: 0,
      amountRepaid: roundCRA(amountRepaidThisYear),
      shortfall: 0,
      addedToIncome: roundCRA(Math.max(0, totalWithdrawn)),
      remainingBalance: 0,
      repaymentYearsLeft: 0,
    };
  }

  // Within the repayment period
  const yearsElapsed    = taxYear - repaymentStartYear;
  const yearsRemaining  = repaymentEndYear - taxYear + 1; // including this year
  const totalYears      = 15;

  // Minimum = total withdrawn ÷ total years (each year is 1/15 of the original amount)
  // CRA rounds to the nearest cent
  const annualMinimum = roundCRA(totalWithdrawn / totalYears);

  // Years left AFTER this repayment year
  const repaymentYearsLeft = Math.max(0, yearsRemaining - 1);

  // If it's the final year, the minimum = whatever is left
  const isLastYear = taxYear === repaymentEndYear;
  const minimumRequired = isLastYear
    ? roundCRA(Math.max(0, totalWithdrawn - (yearsElapsed * annualMinimum)))
    : annualMinimum;

  const amountRepaid = roundCRA(Math.max(0, amountRepaidThisYear));
  const shortfall    = roundCRA(Math.max(0, minimumRequired - amountRepaid));
  const addedToIncome = shortfall; // per ITA s.146.01(3)(c), shortfall = RRSP income
  const remainingBalance = roundCRA(Math.max(0, totalWithdrawn - (yearsElapsed * annualMinimum) - amountRepaid));

  return {
    minimumRequired,
    amountRepaid,
    shortfall,
    addedToIncome,
    remainingBalance,
    repaymentYearsLeft,
  };
}

// ── LLP ─────────────────────────────────────────────────────────────────────

export interface LLPRepaymentInput {
  /** Total LLP amount withdrawn (maximum $20,000 lifetime per ITA s.146.02) */
  totalWithdrawn: number;
  /** Calendar year of the first RRSP withdrawal under the LLP */
  yearOfFirstWithdrawal: number;
  /** Current tax year being calculated (2025) */
  taxYear: number;
  /** Amount the taxpayer is repaying this year (line 24600) */
  amountRepaidThisYear: number;
}

export interface LLPRepaymentResult {
  /** CRA minimum repayment required this year */
  minimumRequired: number;
  /** Amount repaid as supplied */
  amountRepaid: number;
  /** Shortfall = max(0, minimumRequired − amountRepaid) */
  shortfall: number;
  /** Shortfall added to income (line 12900) per ITA s.146.02(3)(d) */
  addedToIncome: number;
  /** Remaining balance after this year's repayment */
  remainingBalance: number;
  /** Years left in the 10-year repayment period */
  repaymentYearsLeft: number;
}

/**
 * Calculates the LLP repayment obligation for a given tax year.
 *
 * Repayment period: 10 years.
 * Repayment starts the EARLIER of:
 *   (a) 2 years after the LAST withdrawal year
 *   (b) 5 years after the FIRST withdrawal year
 *
 * For simplicity (single withdrawal year scenario), we use:
 *   repaymentStartYear = yearOfFirstWithdrawal + 2
 * which is the most common case.
 * The repayment end year = repaymentStartYear + 9 (10 total years).
 */
export function calculateLLPRepayment(input: LLPRepaymentInput): LLPRepaymentResult {
  const { totalWithdrawn, yearOfFirstWithdrawal, taxYear, amountRepaidThisYear } = input;

  // Repayment starts 2 years after the first withdrawal year
  const repaymentStartYear = yearOfFirstWithdrawal + 2;
  const repaymentEndYear   = repaymentStartYear + 9; // 10 years total
  const totalYears         = 10;

  // Before repayment period
  if (taxYear < repaymentStartYear) {
    return {
      minimumRequired: 0,
      amountRepaid: roundCRA(amountRepaidThisYear),
      shortfall: 0,
      addedToIncome: 0,
      remainingBalance: roundCRA(Math.max(0, totalWithdrawn - amountRepaidThisYear)),
      repaymentYearsLeft: totalYears,
    };
  }

  // After period ends — any remaining balance becomes income
  if (taxYear > repaymentEndYear) {
    return {
      minimumRequired: 0,
      amountRepaid: roundCRA(amountRepaidThisYear),
      shortfall: 0,
      addedToIncome: roundCRA(Math.max(0, totalWithdrawn)),
      remainingBalance: 0,
      repaymentYearsLeft: 0,
    };
  }

  // Within repayment period
  const yearsElapsed   = taxYear - repaymentStartYear;
  const yearsRemaining = repaymentEndYear - taxYear + 1;
  const annualMinimum  = roundCRA(totalWithdrawn / totalYears);

  const isLastYear = taxYear === repaymentEndYear;
  const minimumRequired = isLastYear
    ? roundCRA(Math.max(0, totalWithdrawn - (yearsElapsed * annualMinimum)))
    : annualMinimum;

  const repaymentYearsLeft = Math.max(0, yearsRemaining - 1);
  const amountRepaid = roundCRA(Math.max(0, amountRepaidThisYear));
  const shortfall    = roundCRA(Math.max(0, minimumRequired - amountRepaid));
  const addedToIncome = shortfall;
  const remainingBalance = roundCRA(Math.max(0, totalWithdrawn - (yearsElapsed * annualMinimum) - amountRepaid));

  return {
    minimumRequired,
    amountRepaid,
    shortfall,
    addedToIncome,
    remainingBalance,
    repaymentYearsLeft,
  };
}
