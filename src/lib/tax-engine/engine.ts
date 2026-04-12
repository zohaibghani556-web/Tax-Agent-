/**
 * TaxAgent.ai — Main Tax Calculation Engine
 * Orchestrates all federal and Ontario tax calculations to produce TaxCalculationResult.
 *
 * Form references:
 *   T1 General     — Lines 15000, 23600, 26000
 *   Schedule 1     — Federal tax, non-refundable credits (NRCs), DTC, top-up credit
 *   ON428          — Ontario tax, NRCs, DTC, low-income reduction, surtax
 *   ON-BEN         — Ontario Trillium Benefit estimate (OEPTC + OSTC)
 */

import {
  TAX_YEAR,
  FEDERAL_CREDIT_RATE,
  FEDERAL_LOWEST_RATE,
  FEDERAL_BRACKETS,
  ONTARIO_BRACKETS,
  ONTARIO_CREDIT_RATE,
  ONTARIO_BPA,
  FEDERAL_CREDITS,
  ONTARIO_CREDITS,
  ONTARIO_DONATIONS,
  OSTC,
  OEPTC,
  RRSP,
  CPP,
  CPP2,
  EI,
  CRA_LINES,
  GST_CREDIT,
  CANADA_CAREGIVER,
  ONTARIO_SENIORS_CARE,
} from './constants';

import type {
  TaxProfile,
  TaxSlip,
  BusinessIncome,
  RentalIncome,
  DeductionsCreditsInput,
  TaxCalculationResult,
  TaxWarning,
  EdgeCaseFlag,
  T4Slip,
  T5Slip,
  T5008Slip,
  T3Slip,
  T4ASlip,
  T4ESlip,
  T2202Slip,
  T4APSlip,
  T4AOASSlip,
  T4RSPSlip,
  T4RIFSlip,
  RRSPReceiptSlip,
  T4FHSASlip,
} from './types';

import {
  roundCRA,
  calculateFederalTaxOnIncome,
  getMarginalRate,
  getAverageTaxRate,
} from './federal/brackets';

import {
  aggregateTotalIncome,
  calculateNetIncome,
  calculateTaxableIncome,
  type TotalIncomeResult,
} from './federal/income';

import {
  calculateTotalFederalCredits,
  calculateMedicalExpenseCredit,
  calculatePensionIncomeCredit,
  calculateCWB,
  calculateRMES,
  calculateCTC,
} from './federal/credits';

import { calculateDTC } from './federal/disability';
import { calculateDividendIncome } from './federal/dividends';
import { calculateCapitalGains } from './federal/capital-gains';
import { calculateOntarioTaxOnIncome } from './ontario/brackets';
import { calculateOntarioSurtax } from './ontario/surtax';
import { calculateOntarioHealthPremium } from './ontario/health-premium';
import { calculateLowIncomeReduction } from './ontario/low-income-reduction';

// ============================================================
// AGE HELPER
// ============================================================

/**
 * Returns the taxpayer's age on December 31 of the tax year.
 * Controls eligibility for age amount, senior OHP/OTB rates.
 */
function getAgeOnDec31(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const dec31 = new Date(`${TAX_YEAR}-12-31`);
  const yearsOld = dec31.getFullYear() - birth.getFullYear();
  const hadBirthday =
    dec31.getMonth() > birth.getMonth() ||
    (dec31.getMonth() === birth.getMonth() && dec31.getDate() >= birth.getDate());
  return hadBirthday ? yearsOld : yearsOld - 1;
}

// ============================================================
// ONTARIO NON-REFUNDABLE CREDITS (ON428)
// ============================================================

/**
 * Calculates total Ontario non-refundable credit value.
 *
 * Credit amounts mirror federal inputs but use Ontario BPA ($12,747) and
 * the Ontario credit rate (5.05%) — Ontario Taxation Act s.8(3), ON428.
 *
 * Donation credit uses Ontario-specific tiered rates (5.05% / 11.16%) per
 * Ontario Taxation Act s.8.4. Tuition credit excluded — Ontario eliminated
 * it after the 2017 tax year.
 */
function calculateOntarioNonRefundableCredits(params: {
  netIncome: number;
  ageOnDec31: number;
  hasEmploymentIncome: boolean;
  cppContributions: number;
  cpp2Contributions: number;
  eiPremiums: number;
  eligiblePensionIncome: number;
  totalMedicalExpenses: number;
  totalDonations: number;
  hasDisability: boolean;
  /** Full Ontario DTC credit amount (base + supplement, before × 5.05%) */
  ontarioDisabilityCreditAmount?: number;
  hasSpouseOrCL: boolean;
  spouseNetIncome: number;
  spouseIsInfirm: boolean;
  hasEligibleDependant: boolean;
  eligibleDependantNetIncome: number;
  eligibleDependantIsInfirm: boolean;
  caregiverForDependant18Plus: boolean;
  caregiverDependantNetIncome: number;
}): number {
  // Ontario Age Amount — Ontario Taxation Act s.4(3.1); mirrors federal structure
  let ontarioAgeAmount = 0;
  if (params.ageOnDec31 >= 65) {
    const { max, clawbackStart, clawbackRate } = ONTARIO_CREDITS.ageAmount;
    const reduction = Math.max(0, roundCRA((params.netIncome - clawbackStart) * clawbackRate));
    ontarioAgeAmount = Math.max(0, roundCRA(max - reduction));
  }

  // Ontario Spouse/CL Partner Amount — Ontario Taxation Act s.8(1)
  let ontarioSpouseAmount = 0;
  if (params.hasSpouseOrCL) {
    const base = ONTARIO_CREDITS.spouseAmountMax;
    const supplement = params.spouseIsInfirm ? CANADA_CAREGIVER.spouseInfirmSupplement : 0;
    ontarioSpouseAmount = Math.max(0, roundCRA(base + supplement - params.spouseNetIncome));
  }

  // Ontario Eligible Dependant Amount
  let ontarioEligibleDependantAmount = 0;
  if (params.hasEligibleDependant && !params.hasSpouseOrCL) {
    const base = ONTARIO_CREDITS.eligibleDependantMax;
    const supplement = params.eligibleDependantIsInfirm ? CANADA_CAREGIVER.spouseInfirmSupplement : 0;
    ontarioEligibleDependantAmount = Math.max(0, roundCRA(base + supplement - params.eligibleDependantNetIncome));
  }

  // Ontario Caregiver Amount (infirm 18+ dependant, not spouse) — ON428 line 5820
  let ontarioCaregiverAmount = 0;
  if (params.caregiverForDependant18Plus) {
    const reduction = Math.max(0, roundCRA(params.caregiverDependantNetIncome - CANADA_CAREGIVER.infirmDependantIncomeThreshold));
    ontarioCaregiverAmount = Math.max(0, roundCRA(ONTARIO_CREDITS.caregiverAmount - reduction));
  }

  const creditAmountsTotal = roundCRA(
    ONTARIO_BPA +
    ontarioAgeAmount +
    ontarioSpouseAmount +
    ontarioEligibleDependantAmount +
    ontarioCaregiverAmount +
    params.cppContributions +
    params.cpp2Contributions +
    params.eiPremiums +
    (params.hasEmploymentIncome ? FEDERAL_CREDITS.canadaEmploymentAmount : 0) +
    Math.min(params.eligiblePensionIncome, ONTARIO_CREDITS.pensionIncomeMax) +
    calculateMedicalExpenseCredit(params.totalMedicalExpenses, params.netIncome) +
    // Use pre-computed Ontario DTC amount (includes under-18 supplement) when available
    (params.hasDisability
      ? (params.ontarioDisabilityCreditAmount ?? ONTARIO_CREDITS.disabilityAmount.base)
      : 0)
  );

  const baseCreditsValue = roundCRA(creditAmountsTotal * ONTARIO_CREDIT_RATE);

  // Ontario donation credit — tiered rates per Ontario Taxation Act s.8.4
  const ontarioDonationCredit = roundCRA(
    roundCRA(
      Math.min(params.totalDonations, ONTARIO_DONATIONS.firstTierLimit) *
        ONTARIO_DONATIONS.firstTierRate
    ) +
    roundCRA(
      Math.max(0, params.totalDonations - ONTARIO_DONATIONS.firstTierLimit) *
        ONTARIO_DONATIONS.secondTierRate
    )
  );

  return roundCRA(baseCreditsValue + ontarioDonationCredit);
}

// ============================================================
// OTB ESTIMATE (ON-BEN)
// ============================================================

/**
 * Estimates Ontario Trillium Benefit for the following year.
 * Combines OSTC and OEPTC, both reduced by income above the single threshold.
 * Family income / spouse / children supplements are not modeled here.
 */
function estimateOTB(
  netIncome: number,
  rentPaid: number,
  propertyTaxPaid: number,
  studentResidence: boolean,
  isSenior: boolean,
): number {
  // OSTC — Ontario Sales Tax Credit, reduced 4% of income over $29,047 (single)
  const ostcBase = OSTC.adultAmount;
  const ostcReduction =
    Math.max(0, netIncome - OSTC.singleReductionThreshold) * OSTC.reductionRate;
  const ostc = Math.max(0, roundCRA(ostcBase - ostcReduction));

  // OEPTC — Ontario Energy and Property Tax Credit
  const energyComponent = isSenior
    ? OEPTC.seniorEnergyComponent
    : OEPTC.energyComponent;

  // Renters: deemed property tax = 20% of rent paid (ON-BEN line)
  const deemedPropertyTax = roundCRA(rentPaid * OEPTC.propertyTaxComponent.maxRent);
  const effectivePropertyTax = Math.max(deemedPropertyTax, propertyTaxPaid);
  const maxPropertyCredit = isSenior
    ? OEPTC.seniorPropertyTaxMax
    : OEPTC.propertyTaxComponent.maxCredit;
  const propertyComponent = Math.min(effectivePropertyTax, maxPropertyCredit);

  // Students in a designated post-secondary residence claim energy component only
  const oeptcBase = studentResidence
    ? energyComponent
    : roundCRA(energyComponent + propertyComponent);

  const oeptcReduction =
    Math.max(0, netIncome - OEPTC.singleReductionThreshold) * OEPTC.reductionRate;
  const oeptc = Math.max(0, roundCRA(oeptcBase - oeptcReduction));

  return roundCRA(ostc + oeptc);
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================

export function calculateTaxReturn(
  profile: TaxProfile,
  slips: TaxSlip[],
  business: BusinessIncome[],
  rental: RentalIncome[],
  deductions: DeductionsCreditsInput,
): TaxCalculationResult {
  const warnings: TaxWarning[] = [];
  const edgeCaseFlags: EdgeCaseFlag[] = [];

  // — Partition slips by type for downstream calculations —
  const t4Slips: T4Slip[] = [];
  const t5Slips: T5Slip[] = [];
  const t5008Slips: T5008Slip[] = [];
  const t3Slips: T3Slip[] = [];
  const t4aSlips: T4ASlip[] = [];
  const t4eSlips: T4ESlip[] = [];
  const t2202Slips: T2202Slip[] = [];
  const t4apSlips: T4APSlip[] = [];
  const t4aoasSlips: T4AOASSlip[] = [];
  const t4rspSlips: T4RSPSlip[] = [];
  const t4rifSlips: T4RIFSlip[] = [];
  const rrspReceiptSlips: RRSPReceiptSlip[] = [];
  const t4fhsaSlips: T4FHSASlip[] = [];

  for (const slip of slips) {
    switch (slip.type) {
      case 'T4':           t4Slips.push(slip.data);          break;
      case 'T5':           t5Slips.push(slip.data);          break;
      case 'T5008':        t5008Slips.push(slip.data);       break;
      case 'T3':           t3Slips.push(slip.data);          break;
      case 'T4A':          t4aSlips.push(slip.data);         break;
      case 'T4E':          t4eSlips.push(slip.data);         break;
      case 'T2202':        t2202Slips.push(slip.data);       break;
      case 'T4AP':         t4apSlips.push(slip.data);        break;
      case 'T4AOAS':       t4aoasSlips.push(slip.data);      break;
      case 'T4RSP':        t4rspSlips.push(slip.data);       break;
      case 'T4RIF':        t4rifSlips.push(slip.data);       break;
      case 'RRSP-Receipt': rrspReceiptSlips.push(slip.data); break;
      case 'T4FHSA':       t4fhsaSlips.push(slip.data);      break;
    }
  }

  // RRSP contributions from uploaded receipts augment any manually entered amount
  const rrspFromReceipts = roundCRA(
    rrspReceiptSlips.reduce((sum, s) => sum + s.amount, 0)
  );

  // ITA s.118.5 — current-year tuition from uploaded T2202 slips (Box A)
  const tuitionCurrentYear = roundCRA(
    t2202Slips.reduce((sum, s) => sum + (s.boxA || 0), 0)
  );

  const hasEmploymentIncome = t4Slips.some(s => s.box14 > 0);

  // ── CPP1/CPP2/EI: cap over-deductions at annual maximums ─────────────────
  // When a taxpayer has multiple T4s, each employer withholds as if it were the
  // only employer. Combined deductions can exceed the annual maximum.
  // The credit is capped at the maximum; the excess is refundable via line 44800.
  // ITA s.118.7; CPP max 2025: $4,034.10 (CPP1), $396.00 (CPP2); EI max: $1,077.48

  const rawCPP1 = roundCRA(t4Slips.reduce((sum, s) => sum + s.box16, 0));
  const rawCPP2 = roundCRA(t4Slips.reduce((sum, s) => sum + s.box16A, 0));
  const rawEI   = roundCRA(t4Slips.reduce((sum, s) => sum + s.box18, 0));

  const totalCPP = Math.min(rawCPP1, CPP.maxEmployeeContribution);
  const totalCPP2 = Math.min(rawCPP2, CPP2.maxEmployeeContribution);
  const totalEI  = Math.min(rawEI, EI.maxPremium);

  if (rawCPP1 > CPP.maxEmployeeContribution) {
    const overDeducted = roundCRA(rawCPP1 - CPP.maxEmployeeContribution);
    edgeCaseFlags.push({
      type: 'info',
      code: 'CPP_OVER_DEDUCTED',
      message: `Your employers collectively over-deducted $${overDeducted.toFixed(2)} in CPP contributions above the 2025 maximum ($${CPP.maxEmployeeContribution.toFixed(2)}). The credit is capped at the maximum.`,
      affectedAmount: overDeducted,
      resolution: 'Claim the over-deducted CPP as a refund on line 44800 of your T1. The tax engine has already capped your CPP credit at the maximum.',
    });
  }

  if (rawCPP2 > CPP2.maxEmployeeContribution) {
    const overDeducted = roundCRA(rawCPP2 - CPP2.maxEmployeeContribution);
    edgeCaseFlags.push({
      type: 'info',
      code: 'CPP2_OVER_DEDUCTED',
      message: `Your employers over-deducted $${overDeducted.toFixed(2)} in CPP2 contributions above the 2025 maximum ($${CPP2.maxEmployeeContribution.toFixed(2)}).`,
      affectedAmount: overDeducted,
      resolution: 'Claim the over-deducted CPP2 as a refund on line 44800 of your T1.',
    });
  }

  if (rawEI > EI.maxPremium) {
    const overDeducted = roundCRA(rawEI - EI.maxPremium);
    edgeCaseFlags.push({
      type: 'info',
      code: 'EI_OVER_DEDUCTED',
      message: `Your employers collectively over-deducted $${overDeducted.toFixed(2)} in EI premiums above the 2025 maximum ($${EI.maxPremium.toFixed(2)}).`,
      affectedAmount: overDeducted,
      resolution: 'Claim the over-deducted EI as a refund on line 45000 of your T1.',
    });
  }

  if (t4Slips.length > 1) {
    edgeCaseFlags.push({
      type: 'info',
      code: 'MULTIPLE_T4S',
      message: `${t4Slips.length} T4 slips detected. Employment income and deductions have been combined correctly across all employers.`,
      affectedAmount: 0,
      resolution: 'Review the combined totals carefully and ensure all T4s are included. Check that CPP/EI over-deductions (if any) are flagged above.',
    });
  }
  // Age computed early — needed for Ontario NRCs, OTB senior rates, and Seniors Care credit.
  const ageOnDec31 = getAgeOnDec31(profile.dateOfBirth);
  const isSenior   = ageOnDec31 >= 65;

  // Eligible pension income drives the $2,000 pension income credit (ITA s.118(3)).
  // T4A pension, CPP (T4AP), and OAS (T4AOAS) all qualify.
  const eligiblePensionIncome = roundCRA(
    t4aSlips.reduce((sum, s) => sum + s.box016, 0) +
    t4apSlips.reduce((sum, s) => sum + s.box16 + s.box20, 0) +
    t4aoasSlips.reduce((sum, s) => sum + s.box18, 0)
  );

  // Merge RRSP receipt amounts into the deductions input so income.ts can apply them
  const mergedDeductions: DeductionsCreditsInput = rrspFromReceipts > 0
    ? { ...deductions, rrspContributions: roundCRA(deductions.rrspContributions + rrspFromReceipts) }
    : deductions;

  const totalMedicalExpenses = roundCRA(
    mergedDeductions.medicalExpenses.reduce((sum, e) => sum + e.amount, 0)
  );
  const totalDonations = roundCRA(
    mergedDeductions.donations.reduce((sum, d) => sum + d.amount, 0)
  );

  // ── STEPS 1–3: Income aggregation ────────────────────────────────────────

  const incomeResult: TotalIncomeResult = aggregateTotalIncome(slips, business, rental);
  const totalIncome   = incomeResult.totalIncome;
  // Social assistance is included in totalIncome (line 14500) but ITA s.110(1)(f)
  // requires a corresponding deduction at line 25000 so it has no net impact.
  const netIncome     = calculateNetIncome(totalIncome, mergedDeductions, incomeResult.socialAssistanceIncome);
  const taxableIncome = calculateTaxableIncome(netIncome, mergedDeductions);

  // ── DTC: Disability Tax Credit (ITA s.118.3) ─────────────────────────────
  // Compute once and pass to both federal and Ontario credit aggregators.
  // Under-18 supplement and transfer flag are derived from optional DTC inputs.

  const dtcResult = calculateDTC({
    hasDTC: mergedDeductions.hasDisabilityCredit,
    // Default to adult (999) when age not supplied — suppresses supplement safely
    ageOnDec31: mergedDeductions.disabilityClaimantAge ?? 999,
    childCareAttendantCare: mergedDeductions.disabilityChildCareAttendantCare ?? 0,
    transferToSupporter: mergedDeductions.disabilityTransferToSupporter ?? false,
  });

  // ── STEP 4: Federal tax on taxable income (Schedule 1) ───────────────────

  const federalTaxOnIncome = calculateFederalTaxOnIncome(taxableIncome);

  // ── STEP 5: Federal non-refundable credits (Schedule 1) ──────────────────

  const fedCredits = calculateTotalFederalCredits({
    netIncome,
    taxableIncome,
    dateOfBirth: profile.dateOfBirth,
    hasEmploymentIncome,
    cppContributions: totalCPP,
    cpp2Contributions: totalCPP2,
    eiPremiums: totalEI,
    eligiblePensionIncome,
    totalMedicalExpenses,
    totalDonations,
    tuitionAmount: tuitionCurrentYear,
    tuitionCarryforward: mergedDeductions.tuitionCarryforward ?? 0,
    studentLoanInterest: mergedDeductions.studentLoanInterest ?? 0,
    hasDisability: mergedDeductions.hasDisabilityCredit,
    disabilitySupplementAmount: dtcResult.federalSupplementAmount,
    // Spouse / dependant / caregiver
    hasSpouseOrCL: mergedDeductions.hasSpouseOrCL ?? false,
    spouseNetIncome: mergedDeductions.spouseNetIncome ?? 0,
    spouseIsInfirm: mergedDeductions.spouseIsInfirm ?? false,
    hasEligibleDependant: mergedDeductions.hasEligibleDependant ?? false,
    eligibleDependantNetIncome: mergedDeductions.eligibleDependantNetIncome ?? 0,
    eligibleDependantIsInfirm: mergedDeductions.eligibleDependantIsInfirm ?? false,
    caregiverForDependant18Plus: mergedDeductions.caregiverForDependant18Plus ?? false,
    caregiverDependantNetIncome: mergedDeductions.caregiverDependantNetIncome ?? 0,
    caregiverForChildUnder18: mergedDeductions.caregiverForChildUnder18 ?? false,
    // Other credits
    homeBuyersEligible: mergedDeductions.homeBuyersEligible ?? false,
    homeAccessibilityExpenses: mergedDeductions.homeAccessibilityExpenses ?? 0,
    digitalNewsSubscription: mergedDeductions.digitalNewsSubscription ?? 0,
    volunteerFirefighter: mergedDeductions.volunteerFirefighter ?? false,
    searchAndRescue: mergedDeductions.searchAndRescue ?? false,
    adoptionExpenses: mergedDeductions.adoptionExpenses ?? 0,
  });

  const federalNonRefundableCredits = fedCredits.totalCreditValue;

  // ── STEP 6: Federal dividend tax credit (Schedule 1) ─────────────────────

  const divResult = calculateDividendIncome(t5Slips, t3Slips);
  const federalDividendTaxCredit = roundCRA(
    divResult.federalDTC + divResult.federalNonEligibleDTC
  );

  // ── STEP 7: Top-Up Tax Credit — 2025 only (Schedule 1, line 41000) ───────
  // The non-refundable credit rate is maintained at 15% even though the lowest
  // bracket dropped to 14.5% (blended). The top-up = creditAmounts × 0.5%
  // delivers the extra credit value so taxpayers are not disadvantaged.

  const topUpTaxCredit = roundCRA(
    fedCredits.totalCreditAmount * (FEDERAL_CREDIT_RATE - FEDERAL_LOWEST_RATE)
  );

  // ── STEP 8: Net federal tax ───────────────────────────────────────────────

  let netFederalTax = Math.max(
    0,
    roundCRA(
      federalTaxOnIncome -
      federalNonRefundableCredits -
      federalDividendTaxCredit -
      topUpTaxCredit
    )
  );

  // AMT carryforward credit (line 40425) — ITA s.120.2
  // Prior years' minimum tax can offset regular federal tax (7-year carryforward).
  // Apply only when AMT is NOT triggered this year. Cannot reduce tax below zero.
  const amtCarryforwardCredit = deductions.amtCarryforwardCredit ?? 0;
  if (amtCarryforwardCredit > 0) {
    const creditApplied = Math.min(amtCarryforwardCredit, netFederalTax);
    netFederalTax = roundCRA(netFederalTax - creditApplied);
  }

  // ── STEPS 9–10: Ontario tax on income + non-refundable credits (ON428) ───

  const ontarioTaxOnIncome = calculateOntarioTaxOnIncome(taxableIncome);

  const ontarioNonRefundableCredits = calculateOntarioNonRefundableCredits({
    netIncome,
    ageOnDec31,
    hasEmploymentIncome,
    cppContributions: totalCPP,
    cpp2Contributions: totalCPP2,
    eiPremiums: totalEI,
    eligiblePensionIncome,
    totalMedicalExpenses,
    totalDonations,
    hasDisability: mergedDeductions.hasDisabilityCredit,
    ontarioDisabilityCreditAmount: dtcResult.ontarioTotalCreditAmount,
    hasSpouseOrCL: mergedDeductions.hasSpouseOrCL ?? false,
    spouseNetIncome: mergedDeductions.spouseNetIncome ?? 0,
    spouseIsInfirm: mergedDeductions.spouseIsInfirm ?? false,
    hasEligibleDependant: mergedDeductions.hasEligibleDependant ?? false,
    eligibleDependantNetIncome: mergedDeductions.eligibleDependantNetIncome ?? 0,
    eligibleDependantIsInfirm: mergedDeductions.eligibleDependantIsInfirm ?? false,
    caregiverForDependant18Plus: mergedDeductions.caregiverForDependant18Plus ?? false,
    caregiverDependantNetIncome: mergedDeductions.caregiverDependantNetIncome ?? 0,
  });

  // ── STEP 11: Ontario dividend tax credit (ON428) ──────────────────────────

  const ontarioDividendTaxCredit = roundCRA(
    divResult.ontarioDTC + divResult.ontarioNonEligibleDTC
  );

  // ── STEP 12: Ontario low-income reduction (Ontario Taxation Act s.8(3)) ──
  // Applied after NRCs and DTC, before surtax.

  const preLIROntarioTax = Math.max(
    0,
    roundCRA(ontarioTaxOnIncome - ontarioNonRefundableCredits - ontarioDividendTaxCredit)
  );
  const ontarioLowIncomeReduction = calculateLowIncomeReduction(preLIROntarioTax, taxableIncome);

  // ── STEP 13: Basic Ontario tax ────────────────────────────────────────────

  const basicOntarioTax = Math.max(0, roundCRA(preLIROntarioTax - ontarioLowIncomeReduction));

  // ── STEP 14: Ontario surtax (Ontario Taxation Act s.48) ──────────────────

  const ontarioSurtax = calculateOntarioSurtax(basicOntarioTax);

  // ── STEP 15–16: Ontario tax payable + Ontario Health Premium ─────────────

  const ontarioTaxPayable  = roundCRA(basicOntarioTax + ontarioSurtax);
  const ontarioHealthPremium = calculateOntarioHealthPremium(taxableIncome);

  // ── STEP 17: Total tax payable ────────────────────────────────────────────

  const netOntarioTax   = roundCRA(ontarioTaxPayable + ontarioHealthPremium);
  const totalTaxPayable = roundCRA(netFederalTax + netOntarioTax);

  // ── STEP 18: Total tax deducted at source ─────────────────────────────────
  // All CRA slips that report "income tax deducted at source"

  const totalTaxDeducted = roundCRA(
    t4Slips.reduce((sum, s) => sum + s.box22, 0) +
    t4aSlips.reduce((sum, s) => sum + s.box022, 0) +
    t4eSlips.reduce((sum, s) => sum + s.box22, 0) +
    t4apSlips.reduce((sum, s) => sum + s.box22, 0) +
    t4aoasSlips.reduce((sum, s) => sum + s.box22, 0) +
    t4rspSlips.reduce((sum, s) => sum + s.box30, 0) +
    t4rifSlips.reduce((sum, s) => sum + s.box30, 0) +
    t4fhsaSlips.reduce((sum, s) => sum + s.box22, 0)
  );

  // ── STEP 18b: CPP/EI over-deduction refund — line 44800/45000 ────────────
  // Over-deducted amounts (multiple employers) are refunded separately, not a credit.
  const cppEiOverdeductionRefund = roundCRA(
    Math.max(0, rawCPP1 - CPP.maxEmployeeContribution) +
    Math.max(0, rawCPP2 - CPP2.maxEmployeeContribution) +
    Math.max(0, rawEI - EI.maxPremium)
  );

  // ── STEP 18c: Refundable credits ─────────────────────────────────────────

  // Earned income = T4 employment + self-employment business net income
  const earnedIncome = roundCRA(
    t4Slips.reduce((sum, s) => sum + s.box14, 0) +
    business.reduce((sum, b) => sum + Math.max(0, b.netIncome), 0)
  );

  // Canada Workers Benefit — refundable for low-income workers
  const canadaWorkersCredit = calculateCWB(
    earnedIncome,
    netIncome,
    (mergedDeductions.hasSpouseOrCL ?? false) || (mergedDeductions.hasEligibleDependant ?? false),
  );

  // Refundable Medical Expense Supplement — for low-income working Canadians
  const eligibleMedicalForCredit = calculateMedicalExpenseCredit(totalMedicalExpenses, netIncome);
  const refundableMedicalSupplement = calculateRMES(eligibleMedicalForCredit, earnedIncome, netIncome);

  // Canada Training Credit — 50% of eligible training fees, capped at room from NOA
  const canadaTrainingCredit = calculateCTC(
    mergedDeductions.trainingFeesForCTC ?? 0,
    mergedDeductions.canadaTrainingCreditRoom ?? 0,
  );

  // Ontario Seniors Care at Home Tax Credit — refundable, for Ontario residents 70+
  let ontarioSeniorsHomeCredit = 0;
  if (ageOnDec31 >= ONTARIO_SENIORS_CARE.minAge) {
    const rawCredit = roundCRA(
      Math.min(totalMedicalExpenses, ONTARIO_SENIORS_CARE.maxExpenses) * ONTARIO_SENIORS_CARE.creditRate
    );
    const clawback = Math.max(0, roundCRA((netIncome - ONTARIO_SENIORS_CARE.clawbackStart) * ONTARIO_SENIORS_CARE.clawbackRate));
    ontarioSeniorsHomeCredit = Math.max(0, roundCRA(rawCredit - clawback));
  }

  // GST/HST Credit estimate — paid quarterly based on prior-year net income
  const gstAdult = GST_CREDIT.baseAdult;
  const gstReduction = Math.max(0, roundCRA((netIncome - GST_CREDIT.clawStart) * GST_CREDIT.clawRate));
  const estimatedGSTCredit = Math.max(0, roundCRA(gstAdult - gstReduction));

  // ── STEP 19: Balance owing / refund ──────────────────────────────────────
  // Negative = refund. Refundable credits reduce payable directly (like tax withheld).

  const totalInstalmentsApplied = mergedDeductions.instalmentsPaid ?? 0;
  const balanceOwing = roundCRA(
    totalTaxPayable
    - totalTaxDeducted
    - totalInstalmentsApplied
    - canadaWorkersCredit
    - refundableMedicalSupplement
    - canadaTrainingCredit
    - ontarioSeniorsHomeCredit
    - cppEiOverdeductionRefund
  );

  // ── STEP 20: Marginal and average rates ───────────────────────────────────

  const marginalFederalRate  = getMarginalRate(taxableIncome, FEDERAL_BRACKETS);
  const marginalOntarioRate  = getMarginalRate(taxableIncome, ONTARIO_BRACKETS);
  const combinedMarginalRate = roundCRA(marginalFederalRate + marginalOntarioRate);
  const averageTaxRate       = getAverageTaxRate(taxableIncome, totalTaxPayable);

  // ── STEP 21: OTB estimate (ON-BEN, paid starting Jul 2026) ───────────────

  const estimatedOTB = estimateOTB(
    netIncome,
    mergedDeductions.rentPaid ?? 0,
    mergedDeductions.propertyTaxPaid ?? 0,
    mergedDeductions.studentResidence ?? false,
    isSenior,
  );

  // ── Warnings ─────────────────────────────────────────────────────────────

  if (
    totalMedicalExpenses > 0 &&
    totalMedicalExpenses < Math.min(2759, roundCRA(netIncome * 0.03))
  ) {
    warnings.push({
      severity: 'info',
      message:
        `Medical expenses ($${totalMedicalExpenses.toFixed(2)}) are below the ` +
        `$${Math.min(2759, roundCRA(netIncome * 0.03)).toFixed(2)} threshold — no credit generated.`,
      line: CRA_LINES.medicalExpenses,
    });
  }

  if (deductions.rrspContributions > deductions.rrspContributionRoom) {
    warnings.push({
      severity: 'warning',
      message:
        `RRSP contributions ($${deductions.rrspContributions}) exceed available room ` +
        `($${deductions.rrspContributionRoom}). Only $${deductions.rrspContributionRoom} deducted.`,
      line: CRA_LINES.rrspDeduction,
      action: 'Withdraw the excess before the over-contribution penalty applies (ITA s.204.1).',
    });
    const overContribution = roundCRA(deductions.rrspContributions - deductions.rrspContributionRoom);
    edgeCaseFlags.push({
      type: 'error',
      code: 'RRSP_OVER_CONTRIBUTION',
      message: `RRSP over-contribution detected: $${overContribution.toFixed(2)} contributed beyond your available room of $${deductions.rrspContributionRoom.toFixed(2)}.`,
      affectedAmount: overContribution,
      resolution: 'Withdraw the excess contribution as soon as possible — a 1% per month penalty applies on the excess above the $2,000 buffer. File Form T1-OVP to report the over-contribution.',
    });
  }

  // ── Newcomer proration flag ───────────────────────────────────────────────
  // If a residency start date is provided, personal credits must be prorated.
  // ITA s.118.91 — Part-year residents prorate most non-refundable credits.
  if (profile.residencyStartDate) {
    const startDate = new Date(profile.residencyStartDate);
    const yearStart = new Date(`${TAX_YEAR}-01-01`);
    const yearEnd   = new Date(`${TAX_YEAR}-12-31`);
    if (startDate > yearStart && startDate <= yearEnd) {
      const daysResident = Math.round(
        (yearEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      const prorationFactor = roundCRA(daysResident / 365);
      edgeCaseFlags.push({
        type: 'info',
        code: 'NEWCOMER_PRORATION',
        message: `Newcomer residency detected: arrived ${profile.residencyStartDate} (${daysResident} days in Canada in 2025). Personal credits (BPA, age amount, etc.) are prorated at ${(prorationFactor * 100).toFixed(1)}% per ITA s.118.91.`,
        affectedAmount: daysResident,
        resolution: 'Ensure your tax preparer applies the partial-year residency proration to all personal non-refundable credits. Only income earned from the date of arrival is reported.',
      });
    }
  }

  // ── CRA line-by-line reference ────────────────────────────────────────────

  // Capital gains computed separately here for lineByLine exposure.
  // The same calculation runs inside aggregateTotalIncome — results are identical.
  const cgLineResult = calculateCapitalGains(t5008Slips, t3Slips);

  const rrspDeductionLine = Math.min(
    deductions.rrspContributions,
    deductions.rrspContributionRoom,
    RRSP.maxContribution
  );

  const lineByLine: Record<number, number> = {
    [CRA_LINES.employmentIncome]:    roundCRA(t4Slips.reduce((sum, s) => sum + s.box14, 0)),
    [CRA_LINES.eligibleDividends]:   divResult.eligibleTaxable,
    [CRA_LINES.otherDividends]:      divResult.nonEligibleTaxable,
    [CRA_LINES.interestIncome]:      roundCRA(
      t5Slips.reduce((sum, s) => sum + s.box13, 0) +
      t3Slips.reduce((sum, s) => sum + s.box49, 0)
    ),
    [CRA_LINES.taxableCapitalGains]: cgLineResult.taxableGain,
    [CRA_LINES.totalIncome]:         totalIncome,
    [CRA_LINES.rrspDeduction]:       rrspDeductionLine,
    [CRA_LINES.netIncome]:           netIncome,
    [CRA_LINES.taxableIncome]:       taxableIncome,
    [CRA_LINES.totalTaxDeducted]:    totalTaxDeducted,
    [CRA_LINES.totalPayable]:        totalTaxPayable,
    [CRA_LINES.balanceOwing]:        balanceOwing,
  };

  return {
    totalIncome,
    netIncome,
    taxableIncome,

    federalTaxOnIncome,
    federalNonRefundableCredits,
    federalDividendTaxCredit,
    topUpTaxCredit,
    netFederalTax,

    ontarioTaxOnIncome,
    ontarioNonRefundableCredits,
    ontarioDividendTaxCredit,
    ontarioSurtax,
    ontarioHealthPremium,
    ontarioLowIncomeReduction,
    netOntarioTax,

    totalTaxPayable,
    totalTaxDeducted,
    totalInstalmentsApplied,

    canadaWorkersCredit,
    canadaTrainingCredit,
    refundableMedicalSupplement,
    ontarioSeniorsHomeCredit,
    cppEiOverdeductionRefund,

    balanceOwing,

    estimatedOTB,
    estimatedGSTCredit,

    lineByLine,

    marginalFederalRate,
    marginalOntarioRate,
    combinedMarginalRate,
    averageTaxRate,

    warnings,
    edgeCaseFlags,
  };
}
