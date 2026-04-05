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
  ONTARIO_DONATIONS,
  OSTC,
  OEPTC,
  RRSP,
  CRA_LINES,
} from './constants';

import type {
  TaxProfile,
  TaxSlip,
  BusinessIncome,
  RentalIncome,
  DeductionsCreditsInput,
  TaxCalculationResult,
  TaxWarning,
  T4Slip,
  T5Slip,
  T3Slip,
  T4ASlip,
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
} from './federal/income';

import {
  calculateTotalFederalCredits,
  calculateMedicalExpenseCredit,
  calculatePensionIncomeCredit,
} from './federal/credits';

import { calculateDividendIncome } from './federal/dividends';
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
  hasEmploymentIncome: boolean;
  cppContributions: number;
  eiPremiums: number;
  eligiblePensionIncome: number;
  totalMedicalExpenses: number;
  totalDonations: number;
  hasDisability: boolean;
}): number {
  const creditAmountsTotal = roundCRA(
    ONTARIO_BPA +
    params.cppContributions +
    params.eiPremiums +
    (params.hasEmploymentIncome ? FEDERAL_CREDITS.canadaEmploymentAmount : 0) +
    calculatePensionIncomeCredit(params.eligiblePensionIncome) +
    calculateMedicalExpenseCredit(params.totalMedicalExpenses, params.netIncome) +
    (params.hasDisability ? FEDERAL_CREDITS.disabilityAmount.base : 0)
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

  // — Partition slips by type for downstream calculations —
  const t4Slips: T4Slip[] = [];
  const t5Slips: T5Slip[] = [];
  const t3Slips: T3Slip[] = [];
  const t4aSlips: T4ASlip[] = [];

  for (const slip of slips) {
    switch (slip.type) {
      case 'T4':  t4Slips.push(slip.data);  break;
      case 'T5':  t5Slips.push(slip.data);  break;
      case 'T3':  t3Slips.push(slip.data);  break;
      case 'T4A': t4aSlips.push(slip.data); break;
    }
  }

  const hasEmploymentIncome = t4Slips.some(s => s.box14 > 0);
  // CPP/EI totals drive both the credit calculation and the net income floor check
  const totalCPP = roundCRA(t4Slips.reduce((sum, s) => sum + s.box16, 0));
  const totalEI  = roundCRA(t4Slips.reduce((sum, s) => sum + s.box18, 0));
  // Eligible pension income drives the $2,000 pension income credit (ITA s.118(3))
  const eligiblePensionIncome = roundCRA(t4aSlips.reduce((sum, s) => sum + s.box016, 0));

  const totalMedicalExpenses = roundCRA(
    deductions.medicalExpenses.reduce((sum, e) => sum + e.amount, 0)
  );
  const totalDonations = roundCRA(
    deductions.donations.reduce((sum, d) => sum + d.amount, 0)
  );

  // ── STEPS 1–3: Income aggregation ────────────────────────────────────────

  const totalIncome   = aggregateTotalIncome(slips, business, rental);
  const netIncome     = calculateNetIncome(totalIncome, deductions);
  const taxableIncome = calculateTaxableIncome(netIncome, deductions);

  // ── STEP 4: Federal tax on taxable income (Schedule 1) ───────────────────

  const federalTaxOnIncome = calculateFederalTaxOnIncome(taxableIncome);

  // ── STEP 5: Federal non-refundable credits (Schedule 1) ──────────────────

  const fedCredits = calculateTotalFederalCredits({
    netIncome,
    taxableIncome,
    dateOfBirth: profile.dateOfBirth,
    hasEmploymentIncome,
    cppContributions: totalCPP,
    eiPremiums: totalEI,
    eligiblePensionIncome,
    totalMedicalExpenses,
    totalDonations,
    tuitionAmount: 0,  // T2202 tuition amount flows through carryforward only
    tuitionCarryforward: deductions.tuitionCarryforward ?? 0,
    studentLoanInterest: deductions.studentLoanInterest ?? 0,
    hasDisability: deductions.hasDisabilityCredit,
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

  const netFederalTax = Math.max(
    0,
    roundCRA(
      federalTaxOnIncome -
      federalNonRefundableCredits -
      federalDividendTaxCredit -
      topUpTaxCredit
    )
  );

  // ── STEPS 9–10: Ontario tax on income + non-refundable credits (ON428) ───

  const ontarioTaxOnIncome = calculateOntarioTaxOnIncome(taxableIncome);

  const ontarioNonRefundableCredits = calculateOntarioNonRefundableCredits({
    netIncome,
    hasEmploymentIncome,
    cppContributions: totalCPP,
    eiPremiums: totalEI,
    eligiblePensionIncome,
    totalMedicalExpenses,
    totalDonations,
    hasDisability: deductions.hasDisabilityCredit,
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
  // T4 box 22 + T4A box 022 (both are "income tax deducted")

  const totalTaxDeducted = roundCRA(
    t4Slips.reduce((sum, s) => sum + s.box22, 0) +
    t4aSlips.reduce((sum, s) => sum + s.box022, 0)
  );

  // ── STEP 19: Balance owing / refund ──────────────────────────────────────
  // Negative = refund owing to taxpayer. Instalments not modeled in this version.

  const totalInstalmentsApplied = 0;
  const balanceOwing = roundCRA(totalTaxPayable - totalTaxDeducted - totalInstalmentsApplied);

  // ── STEP 20: Marginal and average rates ───────────────────────────────────

  const marginalFederalRate  = getMarginalRate(taxableIncome, FEDERAL_BRACKETS);
  const marginalOntarioRate  = getMarginalRate(taxableIncome, ONTARIO_BRACKETS);
  const combinedMarginalRate = roundCRA(marginalFederalRate + marginalOntarioRate);
  const averageTaxRate       = getAverageTaxRate(taxableIncome, totalTaxPayable);

  // ── STEP 21: OTB estimate (ON-BEN, paid starting Jul 2026) ───────────────

  const ageOnDec31 = getAgeOnDec31(profile.dateOfBirth);
  const isSenior   = ageOnDec31 >= 65;

  const estimatedOTB = estimateOTB(
    netIncome,
    deductions.rentPaid ?? 0,
    deductions.propertyTaxPaid ?? 0,
    deductions.studentResidence ?? false,
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
  }

  // ── CRA line-by-line reference ────────────────────────────────────────────

  const rrspDeductionLine = Math.min(
    deductions.rrspContributions,
    deductions.rrspContributionRoom,
    RRSP.maxContribution
  );

  const lineByLine: Record<number, number> = {
    [CRA_LINES.employmentIncome]:  roundCRA(t4Slips.reduce((sum, s) => sum + s.box14, 0)),
    [CRA_LINES.eligibleDividends]: divResult.eligibleTaxable,
    [CRA_LINES.otherDividends]:    divResult.nonEligibleTaxable,
    [CRA_LINES.interestIncome]:    roundCRA(
      t5Slips.reduce((sum, s) => sum + s.box13, 0) +
      t3Slips.reduce((sum, s) => sum + s.box49, 0)
    ),
    [CRA_LINES.totalIncome]:       totalIncome,
    [CRA_LINES.rrspDeduction]:     rrspDeductionLine,
    [CRA_LINES.netIncome]:         netIncome,
    [CRA_LINES.taxableIncome]:     taxableIncome,
    [CRA_LINES.totalTaxDeducted]:  totalTaxDeducted,
    [CRA_LINES.totalPayable]:      totalTaxPayable,
    [CRA_LINES.balanceOwing]:      balanceOwing,
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
    balanceOwing,

    estimatedOTB,
    estimatedGSTCredit: 0,  // GST/HST credit not modeled (requires benefit-year net income)

    lineByLine,

    marginalFederalRate,
    marginalOntarioRate,
    combinedMarginalRate,
    averageTaxRate,

    warnings,
  };
}
