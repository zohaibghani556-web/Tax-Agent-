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
  CWB,
  CANADA_TRAINING_CREDIT,
  CANADA_CAREGIVER,
  REFUNDABLE_MEDICAL_SUPPLEMENT,
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

/**
 * Spouse or Common-law Partner Amount — ITA s.118(1)(a), line 30300
 * Max amount = $16,129 (same as BPA max); reduced dollar-for-dollar by spouse's net income.
 * If spouse is infirm, add the Canada Caregiver supplement ($2,616) per ITA s.118(1)(a)(ii).
 */
export function calculateSpouseAmount(
  hasSpouseOrCL: boolean,
  spouseNetIncome: number,
  spouseIsInfirm: boolean = false,
): number {
  if (!hasSpouseOrCL) return 0;
  const base = FEDERAL_CREDITS.spouseAmountMax;
  const supplement = spouseIsInfirm ? CANADA_CAREGIVER.spouseInfirmSupplement : 0;
  return Math.max(0, roundCRA(base + supplement - spouseNetIncome));
}

/**
 * Eligible Dependant Amount — ITA s.118(1)(b), line 30400
 * Single parents can claim one eligible dependant (usually a child under 18).
 * Same max as spouse amount ($16,129); reduced by dependant's net income.
 * Cannot claim this if claiming a spouse amount.
 * If dependant is infirm, add the Canada Caregiver supplement ($2,616).
 */
export function calculateEligibleDependantAmount(
  hasEligibleDependant: boolean,
  dependantNetIncome: number,
  dependantIsInfirm: boolean = false,
): number {
  if (!hasEligibleDependant) return 0;
  const base = FEDERAL_CREDITS.eligibleDependantMax;
  const supplement = dependantIsInfirm ? CANADA_CAREGIVER.spouseInfirmSupplement : 0;
  return Math.max(0, roundCRA(base + supplement - dependantNetIncome));
}

/**
 * Canada Caregiver Amount for infirm 18+ dependant — ITA s.118(1)(d), line 30450
 * For an infirm parent, adult child, sibling, niece, nephew, etc. (not spouse — that uses line 30425).
 * Base: $7,999; reduced by the dependant's net income above $18,783.
 */
export function calculateCaregiverForAdultDependant(
  caregiverForDependant18Plus: boolean,
  dependantNetIncome: number,
): number {
  if (!caregiverForDependant18Plus) return 0;
  const { infirmDependant18Plus, infirmDependantIncomeThreshold } = CANADA_CAREGIVER;
  const reduction = Math.max(0, roundCRA(dependantNetIncome - infirmDependantIncomeThreshold));
  return Math.max(0, roundCRA(infirmDependant18Plus - reduction));
}

/**
 * Canada Caregiver Amount for child under 18 with infirmity — ITA s.118(1)(b.1), line 30500
 * Flat $2,616 — no income test. For each infirm child under 18.
 */
export function calculateCaregiverForChildUnder18(
  caregiverForChildUnder18: boolean,
): number {
  return caregiverForChildUnder18 ? CANADA_CAREGIVER.childUnder18 : 0;
}

/**
 * Home Buyers' Amount — ITA s.118.05, line 31270
 * $10,000 × 15% = $1,500 non-refundable credit for first-time home buyers.
 * Cannot have owned a home that was a principal residence in the past 4 years.
 */
export function calculateHomeBuyersCredit(homeBuyersEligible: boolean): number {
  return homeBuyersEligible ? FEDERAL_CREDITS.homeBuyers.amount : 0;
}

/**
 * Home Accessibility Tax Credit — ITA s.118.041, line 31285
 * 15% on eligible renovation expenses up to $20,000 for seniors 65+ or DTC holders.
 * Returns the credit amount (to be × 15%).
 */
export function calculateHomeAccessibilityCredit(homeAccessibilityExpenses: number): number {
  return Math.min(homeAccessibilityExpenses, FEDERAL_CREDITS.homeAccessibility.max);
}

/**
 * Digital News Subscription Credit — ITA s.118.02, line 31350
 * 15% on up to $500 of qualifying Canadian digital news subscriptions.
 */
export function calculateDigitalNewsCredit(digitalNewsSubscription: number): number {
  return Math.min(digitalNewsSubscription, FEDERAL_CREDITS.digitalNewsSubscription.max);
}

/**
 * Volunteer Firefighter / Search and Rescue — ITA s.118.06/118.07, lines 31240/31255
 * $3,000 × 15% = $450 each. Must perform 200+ eligible hours in the year.
 * Cannot claim both if the hours overlap.
 */
export function calculateVolunteerCredit(
  volunteerFirefighter: boolean,
  searchAndRescue: boolean,
): number {
  // CRA: can only claim one if hours overlap; we let both stand and leave overlap-check to the user
  let amount = 0;
  if (volunteerFirefighter) amount += FEDERAL_CREDITS.volunteerFirefighter;
  if (searchAndRescue) amount += FEDERAL_CREDITS.searchAndRescue;
  return amount;
}

/**
 * Adoption Expenses Credit — ITA s.118.02, line 31300
 * 15% on eligible adoption expenses up to $19,350.
 */
export function calculateAdoptionCredit(adoptionExpenses: number): number {
  return Math.min(adoptionExpenses ?? 0, FEDERAL_CREDITS.adoptionExpensesMax);
}

// ============================================================
// REFUNDABLE CREDITS
// ============================================================

/**
 * Canada Workers Benefit (CWB) — ITA s.122.7, line 45300
 * Refundable credit for low-income working Canadians.
 * Requires $3,000+ working income (employment + self-employment).
 * Basic single: max $1,518, reduced at 15% above $22,944.
 */
export function calculateCWB(
  workingIncome: number,      // T4 box14 + business net income
  netIncome: number,
  hasSpouseOrDependant: boolean,
): number {
  if (workingIncome < CWB.workingIncomeMin) return 0;

  const maxAmount = hasSpouseOrDependant ? CWB.basicFamilyMax : CWB.basicSingleMax;
  const clawStart = hasSpouseOrDependant ? CWB.familyClawStart : CWB.singleClawStart;

  if (netIncome <= clawStart) return maxAmount;
  const reduction = roundCRA((netIncome - clawStart) * CWB.clawRate);
  return Math.max(0, roundCRA(maxAmount - reduction));
}

/**
 * Refundable Medical Expense Supplement (RMES) — ITA s.122.51, line 45200
 * 25% of eligible medical expenses, capped at $1,524.
 * Requires $3,840+ earned income; reduced 5% above $30,652 family net income.
 */
export function calculateRMES(
  eligibleMedicalExpenses: number,  // Same amount used for non-refundable credit
  earnedIncome: number,              // T4 box14 + business net income
  netIncome: number,
): number {
  if (earnedIncome < REFUNDABLE_MEDICAL_SUPPLEMENT.minEarnedIncome) return 0;
  if (eligibleMedicalExpenses <= 0) return 0;

  const rawCredit = roundCRA(eligibleMedicalExpenses * REFUNDABLE_MEDICAL_SUPPLEMENT.creditRate);
  const capped = Math.min(rawCredit, REFUNDABLE_MEDICAL_SUPPLEMENT.maxCredit);

  if (netIncome <= REFUNDABLE_MEDICAL_SUPPLEMENT.clawbackStart) return capped;
  const reduction = roundCRA((netIncome - REFUNDABLE_MEDICAL_SUPPLEMENT.clawbackStart) * REFUNDABLE_MEDICAL_SUPPLEMENT.clawbackRate);
  return Math.max(0, roundCRA(capped - reduction));
}

/**
 * Canada Training Credit (CTC) — ITA s.122.91, line 45350
 * Refundable; 50% of eligible tuition/training fees paid in the year,
 * capped at the individual's CTC room from their prior-year NOA.
 */
export function calculateCTC(
  trainingFees: number,        // Eligible fees (from T2202 + receipts for qualifying courses)
  ctcRoom: number,             // From prior-year NOA line 45375
): number {
  if (!trainingFees || !ctcRoom) return 0;
  const credit = roundCRA(trainingFees * CANADA_TRAINING_CREDIT.creditRate);
  return Math.min(credit, ctcRoom);
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
  cpp2Contributions: number;
  eiPremiums: number;
  eligiblePensionIncome: number;
  totalMedicalExpenses: number;
  totalDonations: number;
  tuitionAmount: number;
  tuitionCarryforward: number;
  studentLoanInterest: number;
  hasDisability: boolean;
  // Spouse / dependant / caregiver
  hasSpouseOrCL: boolean;
  spouseNetIncome: number;
  spouseIsInfirm: boolean;
  hasEligibleDependant: boolean;
  eligibleDependantNetIncome: number;
  eligibleDependantIsInfirm: boolean;
  caregiverForDependant18Plus: boolean;
  caregiverDependantNetIncome: number;
  caregiverForChildUnder18: boolean;
  // Other credits
  homeBuyersEligible: boolean;
  homeAccessibilityExpenses: number;
  digitalNewsSubscription: number;
  volunteerFirefighter: boolean;
  searchAndRescue: boolean;
  adoptionExpenses: number;
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
    spouseAmount: calculateSpouseAmount(inputs.hasSpouseOrCL, inputs.spouseNetIncome, inputs.spouseIsInfirm),
    eligibleDependantAmount: calculateEligibleDependantAmount(
      // Cannot claim both spouse and eligible dependant
      inputs.hasEligibleDependant && !inputs.hasSpouseOrCL,
      inputs.eligibleDependantNetIncome,
      inputs.eligibleDependantIsInfirm,
    ),
    caregiverAdult: calculateCaregiverForAdultDependant(inputs.caregiverForDependant18Plus, inputs.caregiverDependantNetIncome),
    caregiverChild: calculateCaregiverForChildUnder18(inputs.caregiverForChildUnder18),
    cppAmount: calculateCPPCredit(inputs.cppContributions),
    cpp2Amount: inputs.cpp2Contributions,   // CPP2 enhanced employee contributions — also a NRC amount
    eiAmount: calculateEICredit(inputs.eiPremiums),
    employmentAmount: calculateCanadaEmploymentCredit(inputs.hasEmploymentIncome),
    pensionAmount: calculatePensionIncomeCredit(inputs.eligiblePensionIncome),
    medicalAmount: calculateMedicalExpenseCredit(inputs.totalMedicalExpenses, inputs.netIncome),
    tuitionAmount: calculateTuitionCredit(inputs.tuitionAmount, inputs.tuitionCarryforward),
    studentLoanAmount: calculateStudentLoanInterestCredit(inputs.studentLoanInterest),
    disabilityAmount: calculateDisabilityCredit(inputs.hasDisability),
    homeBuyersAmount: calculateHomeBuyersCredit(inputs.homeBuyersEligible),
    homeAccessibilityAmount: calculateHomeAccessibilityCredit(inputs.homeAccessibilityExpenses),
    digitalNewsAmount: calculateDigitalNewsCredit(inputs.digitalNewsSubscription),
    volunteerAmount: calculateVolunteerCredit(inputs.volunteerFirefighter, inputs.searchAndRescue),
    adoptionAmount: calculateAdoptionCredit(inputs.adoptionExpenses),
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
