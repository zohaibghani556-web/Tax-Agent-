/**
 * Federal non-refundable tax credits — ITA s.118–118.62
 * Each credit AMOUNT is multiplied by FEDERAL_CREDIT_RATE (15%) to get the tax reduction,
 * except donations which have their own tiered rates.
 */

import {
  TAX_YEAR,
  FEDERAL_BPA,
  FEDERAL_CREDIT_RATE,
  FEDERAL_CREDITS,
  MEDICAL_EXPENSES,
  DONATIONS,
} from '../constants';
import { roundCRA } from './brackets';

// ============================================================
// INDIVIDUAL CREDIT CALCULATORS
// ============================================================

/**
 * Basic Personal Amount — ITA s.118(1)(c)
 * Full amount for incomes at or below the 4th bracket start.
 * The $1,591 "additional" amount is linearly clawed back between $177,882 and $253,414.
 */
export function calculateBPA(netIncome: number): number {
  if (netIncome <= FEDERAL_BPA.clawbackStart) return FEDERAL_BPA.max;
  if (netIncome >= FEDERAL_BPA.clawbackEnd) return FEDERAL_BPA.base;

  const clawbackRange = FEDERAL_BPA.clawbackEnd - FEDERAL_BPA.clawbackStart;
  const excess = netIncome - FEDERAL_BPA.clawbackStart;
  const reduction = roundCRA((excess / clawbackRange) * FEDERAL_BPA.additional);
  return roundCRA(FEDERAL_BPA.max - reduction);
}

/**
 * Age Amount — ITA s.118(2)
 * Available to individuals 65+ on December 31 of the tax year.
 * Reduced by 15% of net income over $44,325; cannot go below zero.
 */
export function calculateAgeCredit(netIncome: number, dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const dec31 = new Date(`${TAX_YEAR}-12-31`);

  const yearsOld = dec31.getFullYear() - birthDate.getFullYear();
  const hadBirthdayByDec31 =
    dec31.getMonth() > birthDate.getMonth() ||
    (dec31.getMonth() === birthDate.getMonth() && dec31.getDate() >= birthDate.getDate());
  const ageOnDec31 = hadBirthdayByDec31 ? yearsOld : yearsOld - 1;

  if (ageOnDec31 < 65) return 0;

  const { max, clawbackStart, clawbackRate } = FEDERAL_CREDITS.ageAmount;
  if (netIncome <= clawbackStart) return max;

  const reduction = roundCRA((netIncome - clawbackStart) * clawbackRate);
  return Math.max(0, roundCRA(max - reduction));
}

/**
 * CPP/QPP Contributions — ITA s.118.7(a)
 * Returns the contribution amount; actual credit = amount × 15%.
 */
export function calculateCPPCredit(cppContributions: number): number {
  return cppContributions;
}

/**
 * EI Premiums — ITA s.118.7(b)
 * Returns the premium amount; actual credit = amount × 15%.
 */
export function calculateEICredit(eiPremiums: number): number {
  return eiPremiums;
}

/**
 * Canada Employment Credit — ITA s.118(10)
 * Flat $1,368 for individuals with employment income.
 */
export function calculateCanadaEmploymentCredit(hasEmploymentIncome: boolean): number {
  return hasEmploymentIncome ? FEDERAL_CREDITS.canadaEmploymentAmount : 0;
}

/**
 * Pension Income Amount — ITA s.118(3)
 * Lesser of eligible pension income or $2,000.
 */
export function calculatePensionIncomeCredit(eligiblePensionIncome: number): number {
  return Math.min(eligiblePensionIncome, FEDERAL_CREDITS.pensionIncomeMax);
}

/**
 * Medical Expense Credit — ITA s.118.2
 * Eligible = total expenses minus the LESSER of $2,759 or 3% of net income.
 * Returns the eligible credit amount (multiply by 15% for actual credit value).
 */
export function calculateMedicalExpenseCredit(
  totalMedicalExpenses: number,
  netIncome: number
): number {
  const threshold = Math.min(
    MEDICAL_EXPENSES.threshold,
    roundCRA(netIncome * MEDICAL_EXPENSES.thresholdRate)
  );
  return Math.max(0, roundCRA(totalMedicalExpenses - threshold));
}

/**
 * Charitable Donation Credit — ITA s.118.1
 * NOTE: Unlike other credits, this function returns the actual tax credit value directly
 * (not an amount to multiply by 15%), because donations use tiered rates:
 *   - First $200 at 15%
 *   - Amount over $200 at 29%, or 33% if taxable income exceeds the top bracket ($253,414)
 */
export function calculateDonationCredit(
  totalDonations: number,
  taxableIncome: number
): number {
  if (totalDonations <= 0) return 0;

  const { firstTierLimit, firstTierRate, secondTierRate, highIncomeRate, topBracketThreshold } =
    DONATIONS;

  const firstTier = Math.min(totalDonations, firstTierLimit);
  const secondTier = Math.max(0, totalDonations - firstTierLimit);
  const topRate = taxableIncome > topBracketThreshold ? highIncomeRate : secondTierRate;

  return roundCRA(roundCRA(firstTier * firstTierRate) + roundCRA(secondTier * topRate));
}

/**
 * Tuition Credit — ITA s.118.5 / s.118.61
 * Returns total eligible tuition amount (current year + carryforward).
 * Actual credit = amount × 15%.
 */
export function calculateTuitionCredit(
  tuitionAmount: number,
  tuitionCarryforward: number
): number {
  return roundCRA(tuitionAmount + tuitionCarryforward);
}

/**
 * Student Loan Interest — ITA s.118.62
 * Returns interest paid on qualifying student loans.
 * Actual credit = amount × 15%.
 */
export function calculateStudentLoanInterestCredit(interestPaid: number): number {
  return interestPaid;
}

/**
 * Disability Tax Credit (DTC) — ITA s.118.3
 * Base amount: $9,872. Requires CRA-approved T2201 certificate.
 */
export function calculateDisabilityCredit(hasDisability: boolean): number {
  return hasDisability ? FEDERAL_CREDITS.disabilityAmount.base : 0;
}

// ============================================================
// AGGREGATOR
// ============================================================

export interface FederalCreditsInput {
  netIncome: number;
  taxableIncome: number;
  dateOfBirth: string;
  hasEmploymentIncome: boolean;
  cppContributions: number;
  eiPremiums: number;
  eligiblePensionIncome: number;
  totalMedicalExpenses: number;
  totalDonations: number;
  tuitionAmount: number;
  tuitionCarryforward: number;
  studentLoanInterest: number;
  hasDisability: boolean;
}

export interface FederalCreditsResult {
  creditAmounts: Record<string, number>;
  totalCreditAmount: number;
  totalCreditValue: number;
  donationCreditValue: number;
}

/**
 * Aggregates all federal non-refundable credits.
 * totalCreditValue = totalCreditAmount × 15% + donationCreditValue
 * Donation credit is excluded from the 15% pool because it has its own tiered rates.
 */
export function calculateTotalFederalCredits(inputs: FederalCreditsInput): FederalCreditsResult {
  const creditAmounts: Record<string, number> = {
    bpa: calculateBPA(inputs.netIncome),
    ageAmount: calculateAgeCredit(inputs.netIncome, inputs.dateOfBirth),
    cppAmount: calculateCPPCredit(inputs.cppContributions),
    eiAmount: calculateEICredit(inputs.eiPremiums),
    employmentAmount: calculateCanadaEmploymentCredit(inputs.hasEmploymentIncome),
    pensionAmount: calculatePensionIncomeCredit(inputs.eligiblePensionIncome),
    medicalAmount: calculateMedicalExpenseCredit(inputs.totalMedicalExpenses, inputs.netIncome),
    tuitionAmount: calculateTuitionCredit(inputs.tuitionAmount, inputs.tuitionCarryforward),
    studentLoanAmount: calculateStudentLoanInterestCredit(inputs.studentLoanInterest),
    disabilityAmount: calculateDisabilityCredit(inputs.hasDisability),
  };

  const totalCreditAmount = roundCRA(
    Object.values(creditAmounts).reduce((sum, v) => sum + v, 0)
  );
  const donationCreditValue = calculateDonationCredit(inputs.totalDonations, inputs.taxableIncome);
  const totalCreditValue = roundCRA(totalCreditAmount * FEDERAL_CREDIT_RATE + donationCreditValue);

  return {
    creditAmounts,
    totalCreditAmount,
    totalCreditValue,
    donationCreditValue,
  };
}
