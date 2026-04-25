/**
 * TaxAgent.ai — Comprehensive 2025 Ontario Tax Engine
 *
 * Flat-input interface: accepts all income sources, deductions, and credits
 * as plain numbers. Returns a fully detailed TaxBreakdown including every
 * CRA line number, marginal/effective rates, refundable credits, and
 * plain-English optimizations.
 *
 * Architecture rule: ZERO AI in this file. All math is deterministic TypeScript.
 *
 * Calculation order follows T1 General form:
 *   1. Total income (line 15000)
 *   2. Deductions → net income (line 23600)
 *   3. Further deductions → taxable income (line 26000)
 *   4. Federal tax on taxable income (Schedule 1)
 *   5. Ontario tax on taxable income (ON428)
 *   6. Federal non-refundable credits
 *   7. Ontario non-refundable credits
 *   8. Ontario surtax (applied AFTER NRCs, per ON428 sequence)
 *   9. Ontario Health Premium (ON428 line 62)
 *  10. Ontario Low-Income Tax Reduction (ON428)
 *  11. OAS clawback (line 23500)
 *  12. Alternative Minimum Tax check (Schedule 12)
 *  13. Refundable credits (CWB, GST/HST credit, OTB estimates)
 *  14. Net against withholding/installments → refund or owing
 */

import {
  FEDERAL_BRACKETS,
  ONTARIO_BRACKETS,
  FEDERAL_CREDIT_RATE,
  FEDERAL_LOWEST_RATE,
  ONTARIO_CREDIT_RATE,
  FEDERAL_BPA,
  ONTARIO_BPA,
  ONTARIO_SURTAX,
  ONTARIO_LOW_INCOME_REDUCTION,
  ONTARIO_CREDITS,
  FEDERAL_CREDITS,
  DONATIONS,
  ONTARIO_DONATIONS,
  MEDICAL_EXPENSES,
  CAPITAL_GAINS,
  DIVIDENDS,
  CPP,
  CPP2,
  EI,
  RRSP,
  FHSA,
  AMT,
  OAS_CLAWBACK,
  CWB,
  GST_CREDIT,
  CCB,
  OSTC,
  OEPTC,
  CORPORATE,
} from './tax-engine/constants';
import { calculateOntarioHealthPremium } from './tax-engine/ontario/health-premium';
import type { TaxBracket } from './tax-engine/constants';
import { ProvenanceCollector } from './tax-engine/types/provenance';

// ============================================================
// ROUNDING HELPER
// ============================================================

/** CRA rounding: nearest cent, half rounds up (ITA s.257). */
function r(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// TAX INPUT INTERFACE — every possible consumer situation
// ============================================================

export interface TaxInput {
  // ── Income sources (all annual, pre-deduction)
  employmentIncome:         number;  // T4 Box 14
  selfEmploymentNetIncome:  number;  // T2125 net profit
  otherEmploymentIncome:    number;  // tips, gratuities not on T4
  pensionIncome:            number;  // T4A Box 016 (eligible)
  annuityIncome:            number;  // T4A other
  rrspIncome:               number;  // T4RSP — RRSP withdrawal
  otherIncome:              number;  // line 13000: retiring allowances, etc.
  interestIncome:           number;  // T5 Box 13
  eligibleDividends:        number;  // T5 Box 24 (ACTUAL amount — engine grosses up)
  ineligibleDividends:      number;  // T5 Box 11/12 (ACTUAL amount — engine grosses up)
  capitalGains:             number;  // net realized in 2025
  capitalLossesPriorYears:  number;  // carry-forward from prior NOAs
  rentalIncome:             number;  // gross
  rentalExpenses:           number;  // eligible deductions
  foreignIncome:            number;  // converted to CAD
  foreignTaxPaid:           number;
  eiRegularBenefits:        number;  // T4E Box 14
  socialAssistance:         number;  // non-taxable; but affects clawbacks
  workersComp:              number;  // non-taxable (line 14400, offset by 25000)
  disabilityPensionCPP:     number;  // T4A(P)
  oasPension:               number;  // T4A(OAS)
  netPartnershipIncome:     number;
  scholarshipFellowship:    number;  // post-secondary full-time: exempt
  researchGrants:           number;

  // ── Deductions (above-the-line, reduce to net income)
  rrspContribution:         number;  // claimed this year
  rrspContributionRoom:     number;  // available room from NOA
  prppContribution:         number;
  fhsaContribution:         number;
  unionDues:                number;  // T4 Box 44
  profDues:                 number;  // professional membership fees
  childcareExpenses:        number;  // eligible; limited per child age
  movingExpenses:           number;  // moved 40km+ closer to work/school
  supportPayments:          number;  // alimony paid under court order
  carryingCharges:          number;  // investment interest, safety deposit box, etc.
  employmentExpenses:       number;  // T2200 required
  otherDeductions:          number;  // line 23200

  // ── Non-refundable credit inputs
  age:                            number;   // taxpayer's age on Dec 31
  isBlind:                        boolean;
  hasDisability:                  boolean;  // T2201 certified
  hasDisabledSpouse:              boolean;
  hasDisabledDependent:           boolean;
  disabledDependentAge:           number;
  hasSpouse:                      boolean;
  spouseNetIncome:                number;
  numberOfDependentsUnder18:      number;
  numberOfDependents18Plus:       number;   // infirm dependants
  isCaregiver:                    boolean;
  tuitionFederal:                 number;   // T2202 eligible tuition
  tuitionCarryforwardFed:         number;   // unused from prior years
  studentLoanInterest:            number;   // eligible government student loan interest
  medicalExpenses:                number;   // self + family; 12-month period
  charitableDonations:            number;   // federal Schedule 9
  politicalContributions:         number;   // federal
  ontarioPoliticalContributions:  number;
  firstTimeHomeBuyer:             boolean;  // eligible if neither spouse owned in 4 prior years
  homeAccessibilityReno:          number;   // qualifying renovations for senior/disability
  adoptionExpenses:               number;
  pensionIncomeSplitting:         number;   // amount transferred to/from spouse (net)
  isVolunteerFirefighter:         boolean;
  isSearchAndRescue:              boolean;
  digitalNewsSubscriptions:       number;   // max $500

  // ── Payroll / withholding
  taxWithheld:              number;  // T4 Box 22 — total income tax deducted
  cppContributedEmployee:   number;  // T4 Box 16 — actual CPP paid
  cpp2ContributedEmployee:  number;  // T4 Box 16A
  eiContributedEmployee:    number;  // T4 Box 18

  // ── Ontario-specific
  rentPaid:                         number;   // for OEPTC; if renter
  propertyTaxPaid:                  number;   // for OEPTC; if homeowner
  isNorthernOntario:                boolean;
  ontarioSalesTaxCreditEligible:    boolean;

  // ── Miscellaneous
  installmentsPaid:       number;   // income tax installments paid
  fhsaWithdrawal:         number;   // qualifying withdrawal (not taxable, not in income)
  hasPriorYearCapitalLosses: boolean;
  numberOfChildren:       number;   // for CCB calculation
  numberOfChildrenUnder6: number;   // for CCB (higher rate)
  hasSpouseForBenefits:   boolean;  // married/CLP for CWB/GST/CCB purposes
}

// ============================================================
// TAX BREAKDOWN — every output a consumer or CPA would care about
// ============================================================

export interface TaxBreakdown {
  // ── Income assembly (T1 form line numbers)
  lines: {
    L10100_employment:         number;
    L10400_otherEmployment:    number;
    L11300_oas:                number;
    L11400_cppDisability:      number;
    L11500_pension:            number;
    L11900_ei:                 number;
    L12000_eligibleDividends:  number;   // grossed up
    L12010_ineligibleDividends: number;  // grossed up
    L12100_interest:           number;
    L12700_capitalGains:       number;   // taxable portion
    L13000_otherIncome:        number;
    L13500_netSelfEmployment:  number;
    L15000_totalIncome:        number;
    L20800_rrspDeduction:      number;
    L21000_supportPayments:    number;
    L21400_childcare:          number;
    L21900_movingExpenses:     number;
    L22200_cpp_self_employed:  number;
    L22900_otherEmployExpenses: number;
    L23200_otherDeductions:    number;
    L23600_netIncome:          number;
    L25000_limitedPartnership: number;
    L26000_taxableIncome:      number;
  };

  // ── Federal calculation
  federal: {
    grossTax:                   number;
    bpaCredit:                  number;
    ageCredit:                  number;
    spouseCredit:               number;
    cppCredit:                  number;
    cpp2Credit:                 number;
    eiCredit:                   number;
    canadaEmploymentCredit:     number;
    pensionIncomeCredit:        number;
    disabilityCredit:           number;
    disabilitySupplementCredit: number;
    caregiverCredit:            number;
    tuitionCredit:              number;
    studentLoanCredit:          number;
    medicalCredit:              number;
    donationCredit:             number;
    politicalCredit:            number;
    firstHomeCredit:            number;
    homeAccessibilityCredit:    number;
    adoptionCredit:             number;
    volunteerCredit:            number;
    digitalNewsCredit:          number;
    foreignTaxCredit:           number;
    dividendTaxCredit:          number;
    totalNonRefundableCredits:  number;
    netFederalTax:              number;
    oasClawback:                number;
    amtPayable:                 number;
    federalTaxPayable:          number;
  };

  // ── Ontario calculation
  ontario: {
    basicOntarioTax:            number;
    surtax:                     number;
    ontarioTaxBeforeCredits:    number;
    bpaCredit:                  number;
    ageCredit:                  number;
    spouseCredit:               number;
    cppCredit:                  number;
    eiCredit:                   number;
    pensionIncomeCredit:        number;
    disabilityCredit:           number;
    disabilitySupplementCredit: number;
    caregiverCredit:            number;
    tuitionCreditNote:          string;
    medicalCredit:              number;
    donationCredit:             number;
    politicalCredit:            number;
    dividendTaxCredit:          number;
    totalNonRefundableCredits:  number;
    lowIncomeTaxReduction:      number;
    netOntarioTax:              number;
    ontarioHealthPremium:       number;
    ontarioTaxPayable:          number;
  };

  // ── Payroll deductions
  payroll: {
    cppEmployee:             number;
    cpp2Employee:            number;
    cppSelfEmployed:         number;
    cpp2SelfEmployed:        number;
    cppDeductionLine31000:   number;
    eiEmployee:              number;
    eiDeductionLine31200:    number;
  };

  // ── Refundable credits
  refundable: {
    cwbBasic:                        number;
    cwbDisability:                   number;
    gstHstCredit:                    number;
    ontarioTrilliumBenefit:          number;
    ontarioSalesTaxCredit:           number;
    ontarioEnergyPropertyTaxCredit:  number;
    northernOntarioEnergyCredit:     number;
  };

  // ── Summary
  summary: {
    totalIncome:          number;
    netIncome:            number;
    taxableIncome:        number;
    totalTaxPayable:      number;
    totalCreditsApplied:  number;
    taxAlreadyPaid:       number;
    refundOrOwing:        number;   // positive = refund, negative = balance owing
    marginalFederalRate:  number;
    marginalOntarioRate:  number;
    marginalCombinedRate: number;
    effectiveRate:        number;
    takeHomePay: {
      annual:    number;
      monthly:   number;
      biweekly:  number;
      weekly:    number;
    };
  };

  warnings:      string[];
  optimizations: string[];

  // Provenance — every computed field traced to its source
  provenance: import('./tax-engine/types/provenance').ProvenanceRecord[];
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/** Progressive bracket tax on income. */
function taxOnIncome(income: number, brackets: TaxBracket[]): number {
  if (income <= 0) return 0;
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    tax += r((Math.min(income, b.max) - b.min) * b.rate);
  }
  return r(tax);
}

/** Marginal rate: rate that applies to the next dollar. */
function marginalRate(income: number, brackets: TaxBracket[]): number {
  if (income <= 0) return brackets[0]?.rate ?? 0;
  for (const b of brackets) {
    if (income <= b.max) return b.rate;
  }
  return brackets[brackets.length - 1]?.rate ?? 0;
}

/**
 * Federal BPA — ITA s.118(1)(c).
 * Full BPA at income ≤ $177,882; additional $1,591 linearly clawed back to $253,414.
 */
function federalBPA(netIncome: number): number {
  if (netIncome <= FEDERAL_BPA.clawbackStart) return FEDERAL_BPA.max;
  if (netIncome >= FEDERAL_BPA.clawbackEnd)   return FEDERAL_BPA.base;
  const fraction = (netIncome - FEDERAL_BPA.clawbackStart) / (FEDERAL_BPA.clawbackEnd - FEDERAL_BPA.clawbackStart);
  return r(FEDERAL_BPA.max - r(fraction * FEDERAL_BPA.additional));
}

/**
 * Age Amount — ITA s.118(2).
 * Available 65+ on Dec 31. Clawed back 15% above $44,325; floor zero.
 */
function calcAgeAmount(age: number, netIncome: number, amounts: { max: number; clawbackStart: number; clawbackRate: number }): number {
  if (age < 65) return 0;
  if (netIncome <= amounts.clawbackStart) return amounts.max;
  const reduction = r((netIncome - amounts.clawbackStart) * amounts.clawbackRate);
  return Math.max(0, r(amounts.max - reduction));
}

/**
 * Federal charitable donation credit — ITA s.118.1.
 * Returns the CREDIT VALUE (not the amount), using tiered rates.
 */
function donationCredit(donations: number, taxableIncome: number): number {
  if (donations <= 0) return 0;
  const first  = Math.min(donations, DONATIONS.firstTierLimit);
  const above  = Math.max(0, donations - DONATIONS.firstTierLimit);
  const topRate = taxableIncome > DONATIONS.topBracketThreshold ? DONATIONS.highIncomeRate : DONATIONS.secondTierRate;
  return r(r(first * DONATIONS.firstTierRate) + r(above * topRate));
}

/**
 * Ontario political contribution credit — tiered: 75% on first $400, 50% on $400–$750,
 * 33.3% above; maximum credit $1,316.
 */
function ontarioPoliticalCredit(contrib: number): number {
  if (contrib <= 0) return 0;
  let credit = 0;
  if (contrib <= 400) {
    credit = r(contrib * 0.75);
  } else if (contrib <= 750) {
    credit = r(400 * 0.75 + (contrib - 400) * 0.50);
  } else {
    credit = r(400 * 0.75 + 350 * 0.50 + (contrib - 750) * 0.3333);
  }
  return Math.min(credit, ONTARIO_CREDITS.politicalContributionMaxCredit);
}

/**
 * Federal political contribution credit — tiered: 75% on first $400,
 * 50% on $400–$750, 33.3% above $750; maximum credit $650.
 */
function federalPoliticalCredit(contrib: number): number {
  if (contrib <= 0) return 0;
  let credit = 0;
  if (contrib <= 400) {
    credit = r(contrib * 0.75);
  } else if (contrib <= 750) {
    credit = r(400 * 0.75 + (contrib - 400) * 0.50);
  } else {
    credit = r(400 * 0.75 + 350 * 0.50 + (contrib - 750) * 0.3333);
  }
  return Math.min(credit, 650);
}

/**
 * Capital gains inclusion rate for 2025: 50% flat (ITA s.38(a)).
 * The proposed two-tier increase (>$250k at 66.67%) was deferred to 2026.
 */
function taxableCapitalGain(netGain: number): number {
  if (netGain <= 0) return 0;
  return r(netGain * CAPITAL_GAINS.inclusionRateLow);
}

/**
 * Ontario Low-Income Tax Reduction — Ontario Taxation Act s.8(3).
 * Max $294; clawed back 5.05% above $18,569 of taxable income.
 * Cannot reduce Ontario tax below zero.
 */
function calcLITR(ontarioTaxBeforeLITR: number, taxableIncome: number): number {
  const { baseReduction, clawbackStart, clawbackRate } = ONTARIO_LOW_INCOME_REDUCTION;
  const clawback  = r(Math.max(0, taxableIncome - clawbackStart) * clawbackRate);
  const reduction = Math.max(0, baseReduction - clawback);
  return r(Math.min(ontarioTaxBeforeLITR, reduction));
}

/**
 * Ontario surtax — Ontario Taxation Act s.48.
 * Tier 1: 20% × max(0, basicOntarioTax − $5,818)
 * Tier 2: 36% × max(0, basicOntarioTax − $7,446)
 */
function calcSurtax(basicOntarioTax: number): number {
  const t1 = Math.max(0, basicOntarioTax - ONTARIO_SURTAX.threshold1);
  const t2 = Math.max(0, basicOntarioTax - ONTARIO_SURTAX.threshold2);
  return r(ONTARIO_SURTAX.rate1 * t1 + ONTARIO_SURTAX.rate2 * t2);
}

// ============================================================
// MAIN CALCULATION
// ============================================================

/**
 * Calculates a complete Ontario personal tax return for 2025.
 * All monetary inputs in CAD; all outputs in CAD rounded to nearest cent.
 *
 * @param input - Flat TaxInput object with all income/deduction/credit fields.
 * @returns     - Complete TaxBreakdown with every CRA line, rate, and optimization.
 */
export function calculateTaxes(input: TaxInput): TaxBreakdown {
  const warnings:      string[] = [];
  const optimizations: string[] = [];
  const prov = new ProvenanceCollector();

  // ── STEP 1: Income lines ─────────────────────────────────────────────────

  // Gross up dividends (actual → taxable)
  const eligibleDividendsTaxable   = r(input.eligibleDividends * (1 + DIVIDENDS.eligible.grossUpRate));
  const ineligibleDividendsTaxable = r(input.ineligibleDividends * (1 + DIVIDENDS.nonEligible.grossUpRate));

  // Capital gains — net current-year gains minus prior-year carryforward losses
  const netCapGains = Math.max(0, r(input.capitalGains - input.capitalLossesPriorYears));
  const taxableCapGains = taxableCapitalGain(netCapGains);

  // Rental net
  const rentalNet = r(input.rentalIncome - input.rentalExpenses);

  // OAS (before clawback — included in income, clawback is a separate deduction)
  const oasAmount = input.oasPension;

  // Social assistance and workers comp: included in total income but deducted at line 25000
  // Net effect on taxable income = 0; we include them in total for clawback calc purposes.
  const nonTaxableOffset = r(input.socialAssistance + input.workersComp);

  const L10100 = input.employmentIncome;
  const L10400 = input.otherEmploymentIncome;
  const L11300 = oasAmount;
  const L11400 = input.disabilityPensionCPP;
  const L11500 = r(input.pensionIncome + input.annuityIncome);
  const L11900 = input.eiRegularBenefits;
  const L12000 = eligibleDividendsTaxable;
  const L12010 = ineligibleDividendsTaxable;
  const L12100 = input.interestIncome;
  const L12700 = taxableCapGains;
  const L13000 = r(input.otherIncome + input.rrspIncome + input.scholarshipFellowship + input.researchGrants + nonTaxableOffset);
  const L13500 = input.selfEmploymentNetIncome;
  const L12600 = rentalNet;
  const L13100 = input.netPartnershipIncome;
  const L14500 = input.foreignIncome; // simplified: foreign income on line 13000/14500

  const L15000_totalIncome = r(
    L10100 + L10400 + L11300 + L11400 + L11500 + L11900 +
    L12000 + L12010 + L12100 + L12700 + L13000 + L13500 +
    L12600 + L13100 + L14500
  );

  // Provenance: income lines
  prov.record('line_10100', L10100).input('employmentIncome').rule('Employment income', 'ITA s.5(1)', 'T1 line 10100').emit();
  prov.record('line_10400', L10400).input('otherEmploymentIncome').rule('Other employment income', 'ITA s.6', 'T1 line 10400').emit();
  prov.record('line_11300', L11300).input('oasPension').rule('OAS pension', 'ITA s.56(1)(a)', 'T1 line 11300').emit();
  prov.record('line_11400', L11400).input('disabilityPensionCPP').rule('CPP/QPP benefits', 'ITA s.56(1)(a)', 'T1 line 11400').emit();
  prov.record('line_11500', L11500).input('pensionIncome').rule('Other pensions and annuities', 'ITA s.56(1)(a)', 'T1 line 11500').computation(`${input.pensionIncome} + ${input.annuityIncome} = ${L11500}`).emit();
  prov.record('line_11900', L11900).input('eiRegularBenefits').rule('EI benefits', 'ITA s.56(1)(a)', 'T1 line 11900').emit();
  prov.record('line_12000', L12000).input('eligibleDividends').rule('Taxable eligible dividends (grossed up)', 'ITA s.82(1)(b)', 'T1 line 12000').computation(`${input.eligibleDividends} × ${1 + DIVIDENDS.eligible.grossUpRate} = ${L12000}`).emit();
  prov.record('line_12010', L12010).input('ineligibleDividends').rule('Taxable non-eligible dividends (grossed up)', 'ITA s.82(1)(b)', 'T1 line 12010').computation(`${input.ineligibleDividends} × ${1 + DIVIDENDS.nonEligible.grossUpRate} = ${L12010}`).emit();
  prov.record('line_12100', L12100).input('interestIncome').rule('Interest and other investment income', 'ITA s.12(1)(c)', 'T1 line 12100').emit();
  prov.record('line_12700', L12700).computed('capitalGains').rule('Taxable capital gains', 'ITA s.38', 'T1 line 12700').computation(`max(0, ${input.capitalGains} - ${input.capitalLossesPriorYears}) × ${CAPITAL_GAINS.inclusionRateLow} = ${L12700}`).emit();
  prov.record('line_13000', L13000).input('otherIncome').rule('Other income', 'ITA s.56', 'T1 line 13000').emit();
  prov.record('line_13500', L13500).input('selfEmploymentNetIncome').rule('Self-employment net income', 'ITA s.9', 'T1 line 13500').emit();
  prov.record('line_15000', L15000_totalIncome).computed('line_10100', 'line_10400', 'line_11300', 'line_11400', 'line_11500', 'line_11900', 'line_12000', 'line_12010', 'line_12100', 'line_12700', 'line_13000', 'line_13500').rule('Total income', 'ITA s.3', 'T1 line 15000').computation(`sum of all income lines = ${L15000_totalIncome}`).emit();

  // ── STEP 2: Deductions → net income ──────────────────────────────────────

  // RRSP deduction capped at contribution room and annual max
  const rrspDeduction = r(Math.min(
    input.rrspContribution,
    input.rrspContributionRoom,
    RRSP.maxContribution
  ));

  // FHSA deduction (annual limit $8,000)
  const fhsaDeduction = r(Math.min(input.fhsaContribution, FHSA.annualLimit));

  // CPP on self-employment: self-employed pays both halves; half is deductible from income
  const selfEmpNetForCPP = Math.max(0, input.selfEmploymentNetIncome - CPP.basicExemption);
  const selfEmpCPP1 = Math.min(CPP.maxSelfEmployedContribution, r(selfEmpNetForCPP * CPP.selfEmployedRate));
  const selfEmpAboveCeiling = Math.max(0, Math.min(input.selfEmploymentNetIncome, CPP2.secondCeiling) - CPP.maxPensionableEarnings);
  const selfEmpCPP2 = Math.min(CPP2.maxSelfEmployedContribution, r(selfEmpAboveCeiling * CPP2.selfEmployedRate));
  const cppSelfDeduction = r((selfEmpCPP1 + selfEmpCPP2) / 2); // ITA s.60(e) — deduct half

  const L20800 = rrspDeduction;
  const L21000 = input.supportPayments;
  const L21400 = input.childcareExpenses;
  const L21900 = input.movingExpenses;
  const L22200 = cppSelfDeduction;
  const L22900 = input.employmentExpenses;
  const L23200 = r(
    input.otherDeductions +
    input.unionDues + input.profDues +
    input.carryingCharges +
    fhsaDeduction +
    (input.prppContribution ?? 0)
  );

  // Non-taxable income offset (SA + workers comp deducted at line 25000)
  const totalDeductions = r(
    rrspDeduction + L21000 + L21400 + L21900 + L22200 + L22900 + L23200 +
    nonTaxableOffset
  );

  const L23600_netIncome = Math.max(0, r(L15000_totalIncome - totalDeductions));

  prov.record('line_20800', L20800).input('rrspContribution').rule('RRSP deduction', 'ITA s.60(i)', 'T1 line 20800').computation(`min(${input.rrspContribution}, ${input.rrspContributionRoom}, ${RRSP.maxContribution}) = ${L20800}`).emit();
  prov.record('line_23600', L23600_netIncome).computed('line_15000').rule('Net income', 'ITA s.3(e)', 'T1 line 23600').computation(`${L15000_totalIncome} - ${totalDeductions} = ${L23600_netIncome}`).emit();

  // OAS clawback (social benefits repayment) — ITA s.180.2
  const oasClawback = input.oasPension > 0 && L23600_netIncome > OAS_CLAWBACK.threshold
    ? Math.min(
        input.oasPension,
        r((L23600_netIncome - OAS_CLAWBACK.threshold) * OAS_CLAWBACK.rate)
      )
    : 0;

  if (oasClawback > 0) {
    warnings.push(`OAS clawback applies: $${oasClawback.toFixed(2)} of OAS must be repaid (net income $${L23600_netIncome.toLocaleString()} > $${OAS_CLAWBACK.threshold.toLocaleString()} threshold).`);
  }

  // ── STEP 3: Further deductions → taxable income ────────────────────────

  const capitalLossCarryforward = input.capitalLossesPriorYears; // already applied to net gains above
  const L26000_taxableIncome = Math.max(0, L23600_netIncome); // simplified: no LCGE in this version

  prov.record('line_26000', L26000_taxableIncome).computed('line_23600').rule('Taxable income', 'ITA s.3', 'T1 line 26000').computation(`max(0, ${L23600_netIncome}) = ${L26000_taxableIncome}`).emit();

  // ── STEP 4: Federal tax on taxable income ─────────────────────────────────

  const federalGrossTax = taxOnIncome(L26000_taxableIncome, FEDERAL_BRACKETS);

  prov.record('federal_gross_tax', federalGrossTax).computed('line_26000').rule('Federal tax on taxable income using progressive brackets', 'ITA s.117', 'Schedule 1').computation(`progressive brackets on ${L26000_taxableIncome} = ${federalGrossTax}`).emit();

  // ── STEP 5: Federal non-refundable credits ────────────────────────────────

  const bpa        = federalBPA(L23600_netIncome);
  const ageAmt     = calcAgeAmount(input.age, L23600_netIncome, FEDERAL_CREDITS.ageAmount);

  // Spouse/common-law partner amount — ITA s.118(1)(a)
  // Reduced by spouse's net income; max = federal BPA
  const spouseAmt  = input.hasSpouse
    ? Math.max(0, r(FEDERAL_CREDITS.spouseAmountMax - input.spouseNetIncome))
    : 0;

  // CPP/EI credits: use actual amounts paid, capped at maximums
  const cppCredit  = Math.min(
    r(input.cppContributedEmployee + selfEmpCPP1 / 2),  // employee portion
    CPP.maxEmployeeContribution
  );
  const cpp2Credit = Math.min(input.cpp2ContributedEmployee, CPP2.maxEmployeeContribution);
  const eiCredit   = Math.min(input.eiContributedEmployee, EI.maxPremium);

  const empAmt = L10100 > 0 ? Math.min(FEDERAL_CREDITS.canadaEmploymentAmount, L10100) : 0;

  // Pension income amount — ITA s.118(3).
  // Eligible base: T4A pension (L11500) + CPP/QPP (L11400) + OAS (L11300).
  // engine.ts includes all three without an age restriction; aligned to match.
  const eligiblePensionBase = r(L11500 + L11400 + L11300);
  const pensionAmt = Math.min(eligiblePensionBase, FEDERAL_CREDITS.pensionIncomeMax);

  // Disability credit — ITA s.118.3
  const disabilityAmt = input.hasDisability ? FEDERAL_CREDITS.disabilityAmount.base : 0;
  // Disability supplement for under-18 dependant (reduced by childcare/attendant over threshold)
  const disabilitySuppl = (input.hasDisabledDependent && input.disabledDependentAge < 18)
    ? Math.max(0, FEDERAL_CREDITS.disabilityAmount.supplementUnder18 -
        Math.max(0, input.childcareExpenses - FEDERAL_CREDITS.disabilityAmount.supplementClawbackThreshold))
    : 0;

  // Caregiver amount — infirm adult dependant (ITA s.118(1)(d))
  const caregiverAmt = (input.isCaregiver || input.numberOfDependents18Plus > 0)
    ? r(FEDERAL_CREDITS.caregiver.canadaCaregiver * Math.max(1, input.numberOfDependents18Plus))
    : 0;

  // Tuition credit — federal only (Ontario eliminated after 2017)
  const tuitionAmt = r(input.tuitionFederal + input.tuitionCarryforwardFed);

  // Student loan interest — ITA s.118.62
  const studentLoanAmt = input.studentLoanInterest;

  // Medical expense credit — ITA s.118.2
  const medThreshold = Math.min(MEDICAL_EXPENSES.threshold, r(L23600_netIncome * MEDICAL_EXPENSES.thresholdRate));
  const medicalAmt   = Math.max(0, r(input.medicalExpenses - medThreshold));

  // Home accessibility — ITA s.118.041
  const homeAccessAmt  = Math.min(input.homeAccessibilityReno, FEDERAL_CREDITS.homeAccessibility.max);
  const firstHomeAmt   = input.firstTimeHomeBuyer ? FEDERAL_CREDITS.homeBuyers.amount : 0;
  const adoptionAmt    = Math.min(input.adoptionExpenses, 19350);
  const volunteerAmt   = (input.isVolunteerFirefighter || input.isSearchAndRescue) ? FEDERAL_CREDITS.volunteerFirefighter : 0;
  const digitalNewsAmt = Math.min(input.digitalNewsSubscriptions, FEDERAL_CREDITS.digitalNewsSubscription.max);

  // All amounts × 15% → credit values
  const creditAmounts = r(
    bpa + ageAmt + spouseAmt +
    cppCredit + cpp2Credit + eiCredit + empAmt + pensionAmt +
    disabilityAmt + disabilitySuppl + caregiverAmt +
    tuitionAmt + studentLoanAmt + medicalAmt +
    homeAccessAmt + firstHomeAmt + adoptionAmt + volunteerAmt + digitalNewsAmt
  );

  const fedNRCBase = r(creditAmounts * FEDERAL_CREDIT_RATE);
  // Top-up credit: preserves 15% credit value in transition year — ITA Schedule 1 line 41000
  const topUpCredit   = r(creditAmounts * (FEDERAL_CREDIT_RATE - FEDERAL_LOWEST_RATE));

  const fedDonationCredit  = donationCredit(input.charitableDonations, L26000_taxableIncome);
  const fedPoliticalCredit = federalPoliticalCredit(input.politicalContributions);

  // Dividend tax credits (on grossed-up amounts)
  const fedEligDTC    = r(eligibleDividendsTaxable * DIVIDENDS.eligible.federalCreditRate);
  const fedIneligDTC  = r(ineligibleDividendsTaxable * DIVIDENDS.nonEligible.federalCreditRate);
  const fedDividendTC = r(fedEligDTC + fedIneligDTC);

  // Foreign tax credit (simplified: direct credit up to foreign tax paid)
  const foreignTaxCredit = Math.min(input.foreignTaxPaid, r(input.foreignIncome * marginalRate(L26000_taxableIncome, FEDERAL_BRACKETS)));

  const totalFedNRC = r(fedNRCBase + topUpCredit + fedDonationCredit + fedPoliticalCredit);

  prov.record('federal_nrc', totalFedNRC).computed('line_26000').rule('Federal non-refundable credits total', 'ITA s.118', 'Schedule 1 line 35000').computation(`base credits × 15% + top-up + donations + political = ${totalFedNRC}`).emit();
  prov.record('federal_dtc_dividend', fedDividendTC).computed('line_12000', 'line_12010').rule('Federal dividend tax credit', 'ITA s.121', 'Schedule 1').computation(`eligible ${fedEligDTC} + non-eligible ${fedIneligDTC} = ${fedDividendTC}`).emit();

  // Net federal tax before OAS clawback
  const netFedBeforeOAS = Math.max(0, r(federalGrossTax - totalFedNRC - fedDividendTC - foreignTaxCredit));

  // OAS clawback added to federal tax (ITA s.180.2)
  const federalTaxPayablePreAMT = r(netFedBeforeOAS + oasClawback);

  prov.record('net_federal_tax', federalTaxPayablePreAMT).computed('federal_gross_tax', 'federal_nrc', 'federal_dtc_dividend').rule('Net federal tax (before AMT)', 'ITA s.117–120', 'T1').computation(`max(0, ${federalGrossTax} - ${totalFedNRC} - ${fedDividendTC} - ${foreignTaxCredit}) + OAS ${oasClawback} = ${federalTaxPayablePreAMT}`).emit();

  // ── STEP 6: Alternative Minimum Tax ───────────────────────────────────────
  // Simplified AMT: only applies when taxable capital gains or certain preference items
  // exist. Full AMT calculation would require Schedule 12.
  const amtBase = Math.max(0, r(L26000_taxableIncome - AMT.exemption));
  const amtTax  = r(amtBase * AMT.rate);
  const amtApplies = amtTax > federalTaxPayablePreAMT && (input.capitalGains > 50000);
  const amtPayable = amtApplies ? r(amtTax - federalTaxPayablePreAMT) : 0;
  const federalTaxPayable = r(federalTaxPayablePreAMT + amtPayable);

  if (amtApplies) {
    warnings.push(`Alternative Minimum Tax may apply: estimated AMT $${amtTax.toFixed(2)} > regular federal tax $${federalTaxPayablePreAMT.toFixed(2)}. Review Schedule 12.`);
  }

  // ── STEP 7: Ontario non-refundable credits (ON428) ───────────────────────

  const ontarioBPACredit          = r(ONTARIO_BPA * ONTARIO_CREDIT_RATE);
  const ontarioAgeCreditAmt       = calcAgeAmount(input.age, L23600_netIncome, ONTARIO_CREDITS.ageAmount);
  const ontarioAgeCreditValue     = r(ontarioAgeCreditAmt * ONTARIO_CREDIT_RATE);
  const ontarioSpouseAmt          = input.hasSpouse
    ? Math.max(0, r(ONTARIO_CREDITS.spouseAmountMax - input.spouseNetIncome))
    : 0;
  const ontarioSpouseCredit       = r(ontarioSpouseAmt * ONTARIO_CREDIT_RATE);
  const ontarioCPPCredit          = r(Math.min(cppCredit, CPP.maxEmployeeContribution) * ONTARIO_CREDIT_RATE);
  const ontarioEICredit           = r(eiCredit * ONTARIO_CREDIT_RATE);
  // Ontario pension income amount uses the same eligible base as federal — ITA s.118(3) / OTA s.8(1).
  const ontarioPensionCreditAmt   = Math.min(eligiblePensionBase, ONTARIO_CREDITS.pensionIncomeMax);
  const ontarioPensionCredit      = r(ontarioPensionCreditAmt * ONTARIO_CREDIT_RATE);
  const ontarioDisabilityCredit   = r((input.hasDisability ? ONTARIO_CREDITS.disabilityAmount.base : 0) * ONTARIO_CREDIT_RATE);
  const ontarioDisabilitySuppl    = r(disabilitySuppl > 0 ? ONTARIO_CREDITS.disabilityAmount.supplementChild * ONTARIO_CREDIT_RATE : 0);
  const ontarioCaregiverCredit    = r((input.isCaregiver ? ONTARIO_CREDITS.caregiverAmount : 0) * ONTARIO_CREDIT_RATE);

  // Medical: same 3% rule for Ontario
  const ontarioMedicalCredit      = r(medicalAmt * ONTARIO_CREDIT_RATE);

  // Ontario donation credit — tiered rates (Ontario Taxation Act s.8.4)
  const ontarioDonFirst  = r(Math.min(input.charitableDonations, ONTARIO_DONATIONS.firstTierLimit) * ONTARIO_DONATIONS.firstTierRate);
  const ontarioDonAbove  = r(Math.max(0, input.charitableDonations - ONTARIO_DONATIONS.firstTierLimit) * ONTARIO_DONATIONS.secondTierRate);
  const ontarioDonationCredit = r(ontarioDonFirst + ontarioDonAbove);

  const ontarioPolitical = ontarioPoliticalCredit(input.ontarioPoliticalContributions);

  // Ontario dividend tax credits
  const ontarioEligDTC   = r(eligibleDividendsTaxable * DIVIDENDS.eligible.ontarioCreditRate);
  const ontarioIneligDTC = r(ineligibleDividendsTaxable * DIVIDENDS.nonEligible.ontarioCreditRate);
  const ontarioDivTC     = r(ontarioEligDTC + ontarioIneligDTC);

  const ontarioNRC = r(
    ontarioBPACredit + ontarioAgeCreditValue + ontarioSpouseCredit +
    ontarioCPPCredit + ontarioEICredit + ontarioPensionCredit +
    ontarioDisabilityCredit + ontarioDisabilitySuppl + ontarioCaregiverCredit +
    ontarioMedicalCredit + ontarioDonationCredit + ontarioPolitical
  );

  // ── STEP 8: Ontario tax and LITR ─────────────────────────────────────────

  const ontarioGrossTax  = taxOnIncome(L26000_taxableIncome, ONTARIO_BRACKETS);
  const ontarioPreLITR   = Math.max(0, r(ontarioGrossTax - ontarioNRC - ontarioDivTC));
  const litr             = calcLITR(ontarioPreLITR, L26000_taxableIncome);
  const basicOntarioTax  = Math.max(0, r(ontarioPreLITR - litr));
  const surtax           = calcSurtax(basicOntarioTax);
  const ontarioTaxBeforeCredits = r(basicOntarioTax + surtax);

  // Ontario Health Premium — Ontario Taxation Act s.33.1
  const ohp = calculateOntarioHealthPremium(L26000_taxableIncome);

  const ontarioTaxPayable = r(ontarioTaxBeforeCredits + ohp);

  prov.record('ontario_gross_tax', ontarioGrossTax).computed('line_26000').rule('Ontario tax on taxable income', 'Ontario Taxation Act s.8', 'ON428').computation(`progressive brackets on ${L26000_taxableIncome} = ${ontarioGrossTax}`).emit();
  prov.record('ontario_nrc', ontarioNRC).computed('line_26000').rule('Ontario non-refundable credits total', 'Ontario Taxation Act s.8(3)', 'ON428').computation(`BPA + age + CPP/EI + other credits × 5.05% + donations + political = ${ontarioNRC}`).emit();
  prov.record('ontario_surtax', surtax).computed('ontario_gross_tax', 'ontario_nrc').rule('Ontario surtax', 'Ontario Taxation Act s.48', 'ON428').computation(`surtax on basic Ontario tax ${basicOntarioTax} = ${surtax}`).emit();
  prov.record('ontario_health_premium', ohp).computed('line_26000').rule('Ontario Health Premium', 'Ontario Taxation Act s.33.1', 'ON428 line 62').computation(`OHP on ${L26000_taxableIncome} = ${ohp}`).emit();
  prov.record('net_ontario_tax', ontarioTaxPayable).computed('ontario_gross_tax', 'ontario_surtax', 'ontario_health_premium').rule('Net Ontario tax', 'Ontario Taxation Act', 'ON428').computation(`${ontarioTaxBeforeCredits} + ${ohp} = ${ontarioTaxPayable}`).emit();

  // ── STEP 9: Total tax payable ─────────────────────────────────────────────

  const totalTaxPayable = r(federalTaxPayable + ontarioTaxPayable);

  prov.record('total_tax_payable', totalTaxPayable).computed('net_federal_tax', 'net_ontario_tax').rule('Total tax payable (federal + Ontario)', 'T1 line 43500').computation(`${federalTaxPayable} + ${ontarioTaxPayable} = ${totalTaxPayable}`).emit();

  // ── STEP 10: Payroll ──────────────────────────────────────────────────────

  // Employee CPP on employment income
  const empForCPP = Math.max(0, Math.min(input.employmentIncome, CPP.maxPensionableEarnings) - CPP.basicExemption);
  const calcCPPEmployee = Math.min(CPP.maxEmployeeContribution, r(empForCPP * CPP.employeeRate));
  const cppEmployee     = input.cppContributedEmployee > 0 ? Math.min(input.cppContributedEmployee, CPP.maxEmployeeContribution) : calcCPPEmployee;
  const cpp2Employee    = input.cpp2ContributedEmployee > 0 ? Math.min(input.cpp2ContributedEmployee, CPP2.maxEmployeeContribution) : 0;
  const eiEmployee      = input.eiContributedEmployee > 0 ? Math.min(input.eiContributedEmployee, EI.maxPremium) : Math.min(EI.maxPremium, r(Math.min(input.employmentIncome, EI.maxInsurableEarnings) * EI.premiumRate));

  // ── STEP 11: Refundable credits ───────────────────────────────────────────

  // Canada Workers Benefit — ITA s.122.7
  const workingIncome = r(L10100 + L13500);
  let cwbBasic = 0;
  let cwbDisability = 0;
  if (workingIncome >= CWB.workingIncomeMin) {
    const clawStart = input.hasSpouseForBenefits ? CWB.familyClawStart : CWB.singleClawStart;
    const maxBasic  = input.hasSpouseForBenefits ? CWB.basicFamilyMax   : CWB.basicSingleMax;
    const clawback  = r(Math.max(0, L23600_netIncome - clawStart) * CWB.clawRate);
    cwbBasic = Math.max(0, r(maxBasic - clawback));
    if (input.hasDisability) {
      const disClawback = r(Math.max(0, L23600_netIncome - clawStart) * CWB.clawRate);
      cwbDisability = Math.max(0, r(CWB.disabilitySingle - disClawback));
    }
  }

  // GST/HST Credit — ITA s.122.5 (annual estimate)
  const gstAdult = GST_CREDIT.baseAdult * (input.hasSpouseForBenefits ? 2 : 1);
  const gstChild = GST_CREDIT.baseChild * (input.numberOfChildren ?? 0);
  const gstFamilyNet = L23600_netIncome; // simplified: use taxpayer net income
  const gstClawback  = r(Math.max(0, gstFamilyNet - GST_CREDIT.clawStart) * GST_CREDIT.clawRate);
  const gstCredit    = Math.max(0, r(gstAdult + gstChild - gstClawback));

  // Ontario Trillium Benefit estimate (OSTC + OEPTC)
  const ostcAdult     = OSTC.adultAmount;
  const ostcReduction = r(Math.max(0, L23600_netIncome - OSTC.singleReductionThreshold) * OSTC.reductionRate);
  const ostc          = Math.max(0, r(ostcAdult - ostcReduction));

  const isSenior             = input.age >= 65;
  const energyComp           = isSenior ? OEPTC.seniorEnergyComponent : OEPTC.energyComponent;
  const deemedPropertyTax    = r(input.rentPaid * OEPTC.propertyTaxComponent.maxRent);
  const effectivePropertyTax = Math.max(deemedPropertyTax, input.propertyTaxPaid);
  const maxPropCredit        = isSenior ? OEPTC.seniorPropertyTaxMax : OEPTC.propertyTaxComponent.maxCredit;
  const propertyComp         = Math.min(effectivePropertyTax, maxPropCredit);
  const oeptcBase            = r(energyComp + propertyComp);
  const oeptcReduction       = r(Math.max(0, L23600_netIncome - OEPTC.singleReductionThreshold) * OEPTC.reductionRate);
  const oeptc                = Math.max(0, r(oeptcBase - oeptcReduction));
  const otb                  = r(ostc + oeptc);

  // ── STEP 12: Refund or balance owing ─────────────────────────────────────

  const taxAlreadyPaid = r(input.taxWithheld + input.installmentsPaid);
  // CWB (line 45300) is a refundable credit that directly reduces balance owing — ITA s.122.7.
  // Positive refundOrOwing = refund; negative = balance owing.
  const refundOrOwing  = r(taxAlreadyPaid - totalTaxPayable + cwbBasic + cwbDisability);

  prov.record('total_tax_deducted', taxAlreadyPaid).input('taxWithheld').rule('Tax already paid (withheld + instalments)', 'ITA s.153', 'T1 line 43700').computation(`${input.taxWithheld} + ${input.installmentsPaid} = ${taxAlreadyPaid}`).emit();
  prov.record('balance_owing', refundOrOwing).computed('total_tax_payable', 'total_tax_deducted', 'cwb').rule('Refund or balance owing (after refundable credits)', 'ITA s.122.7, T1 line 48400/48500').computation(`${taxAlreadyPaid} - ${totalTaxPayable} + ${cwbBasic} + ${cwbDisability} = ${refundOrOwing}`).emit();

  // ── Rates ─────────────────────────────────────────────────────────────────

  const margFed  = marginalRate(L26000_taxableIncome, FEDERAL_BRACKETS);
  const margON   = marginalRate(L26000_taxableIncome, ONTARIO_BRACKETS);
  const margComb = r(margFed + margON);
  const effRate  = L15000_totalIncome > 0 ? r((totalTaxPayable / L15000_totalIncome) * 100) : 0;

  // Take-home pay
  const annualTakeHome = Math.max(0, r(L15000_totalIncome - totalTaxPayable - cppEmployee - cpp2Employee - eiEmployee));

  // ── Optimizations ─────────────────────────────────────────────────────────

  if (input.rrspContributionRoom > 0 && input.rrspContribution < input.rrspContributionRoom) {
    const unused = r(input.rrspContributionRoom - input.rrspContribution);
    const savingEstimate = r(unused * margComb);
    optimizations.push(`RRSP: contributing an additional $${Math.min(unused, 10000).toLocaleString()} to your RRSP would save approximately $${r(Math.min(unused, 10000) * margComb).toLocaleString()} in combined federal+Ontario tax at your ${(margComb * 100).toFixed(1)}% marginal rate.`);
  }

  if (input.charitableDonations === 0) {
    optimizations.push('Charitable donations: any eligible donations would generate a federal credit of 15% on the first $200 and 29% on amounts above $200.');
  }

  if (input.pensionIncome >= 2000 && input.hasSpouse && input.spouseNetIncome < L23600_netIncome * 0.5) {
    optimizations.push('Pension income splitting: you may be able to split up to 50% of eligible pension income with your spouse/partner to reduce your combined tax burden. Model this with calculatePensionSplitting().');
  }

  if (oasClawback > 0) {
    const rrspToEliminate = r(oasClawback / OAS_CLAWBACK.rate);
    optimizations.push(`OAS clawback: an RRSP contribution of $${rrspToEliminate.toLocaleString()} could reduce net income enough to eliminate the $${oasClawback.toFixed(2)} OAS clawback.`);
  }

  if (input.age >= 65 && !input.hasDisability && input.medicalExpenses < 3000) {
    optimizations.push('Medical expenses: seniors often have qualifying medical costs. Track all eligible expenses — prescriptions, dental, vision, attendant care, home modifications — for potential credit.');
  }

  if (input.selfEmploymentNetIncome > 0 && input.rrspContributionRoom > 0) {
    optimizations.push('Self-employed RRSP: 18% of your prior-year self-employment net income (less pension adjustment) generates new RRSP room. Maximize contributions to reduce net income and CPP installment obligations.');
  }

  // Ontario tuition credit note
  const tuitionNote = 'Ontario tuition credit was eliminated after the 2017 tax year. Federal tuition credit (if eligible) still applies.';
  if (input.tuitionFederal > 0) {
    warnings.push(tuitionNote);
  }

  // ── Assemble output ───────────────────────────────────────────────────────

  return {
    lines: {
      L10100_employment:          L10100,
      L10400_otherEmployment:     L10400,
      L11300_oas:                 L11300,
      L11400_cppDisability:       L11400,
      L11500_pension:             L11500,
      L11900_ei:                  L11900,
      L12000_eligibleDividends:   L12000,
      L12010_ineligibleDividends: L12010,
      L12100_interest:            L12100,
      L12700_capitalGains:        L12700,
      L13000_otherIncome:         L13000,
      L13500_netSelfEmployment:   L13500,
      L15000_totalIncome:         L15000_totalIncome,
      L20800_rrspDeduction:       L20800,
      L21000_supportPayments:     L21000,
      L21400_childcare:           L21400,
      L21900_movingExpenses:      L21900,
      L22200_cpp_self_employed:   L22200,
      L22900_otherEmployExpenses: L22900,
      L23200_otherDeductions:     L23200,
      L23600_netIncome:           L23600_netIncome,
      L25000_limitedPartnership:  0,
      L26000_taxableIncome:       L26000_taxableIncome,
    },

    federal: {
      grossTax:                   federalGrossTax,
      bpaCredit:                  r(bpa * FEDERAL_CREDIT_RATE),
      ageCredit:                  r(ageAmt * FEDERAL_CREDIT_RATE),
      spouseCredit:               r(spouseAmt * FEDERAL_CREDIT_RATE),
      cppCredit:                  r(cppCredit * FEDERAL_CREDIT_RATE),
      cpp2Credit:                 r(cpp2Credit * FEDERAL_CREDIT_RATE),
      eiCredit:                   r(eiCredit * FEDERAL_CREDIT_RATE),
      canadaEmploymentCredit:     r(empAmt * FEDERAL_CREDIT_RATE),
      pensionIncomeCredit:        r(pensionAmt * FEDERAL_CREDIT_RATE),
      disabilityCredit:           r(disabilityAmt * FEDERAL_CREDIT_RATE),
      disabilitySupplementCredit: r(disabilitySuppl * FEDERAL_CREDIT_RATE),
      caregiverCredit:            r(caregiverAmt * FEDERAL_CREDIT_RATE),
      tuitionCredit:              r(tuitionAmt * FEDERAL_CREDIT_RATE),
      studentLoanCredit:          r(studentLoanAmt * FEDERAL_CREDIT_RATE),
      medicalCredit:              r(medicalAmt * FEDERAL_CREDIT_RATE),
      donationCredit:             fedDonationCredit,
      politicalCredit:            fedPoliticalCredit,
      firstHomeCredit:            r(firstHomeAmt * FEDERAL_CREDIT_RATE),
      homeAccessibilityCredit:    r(homeAccessAmt * FEDERAL_CREDIT_RATE),
      adoptionCredit:             r(adoptionAmt * FEDERAL_CREDIT_RATE),
      volunteerCredit:            r(volunteerAmt * FEDERAL_CREDIT_RATE),
      digitalNewsCredit:          r(digitalNewsAmt * FEDERAL_CREDIT_RATE),
      foreignTaxCredit:           foreignTaxCredit,
      dividendTaxCredit:          fedDividendTC,
      totalNonRefundableCredits:  totalFedNRC,
      netFederalTax:              netFedBeforeOAS,
      oasClawback:                oasClawback,
      amtPayable:                 amtPayable,
      federalTaxPayable:          federalTaxPayable,
    },

    ontario: {
      basicOntarioTax:            basicOntarioTax,
      surtax:                     surtax,
      ontarioTaxBeforeCredits:    ontarioTaxBeforeCredits,
      bpaCredit:                  ontarioBPACredit,
      ageCredit:                  ontarioAgeCreditValue,
      spouseCredit:               ontarioSpouseCredit,
      cppCredit:                  ontarioCPPCredit,
      eiCredit:                   ontarioEICredit,
      pensionIncomeCredit:        ontarioPensionCredit,
      disabilityCredit:           ontarioDisabilityCredit,
      disabilitySupplementCredit: ontarioDisabilitySuppl,
      caregiverCredit:            ontarioCaregiverCredit,
      tuitionCreditNote:          tuitionNote,
      medicalCredit:              ontarioMedicalCredit,
      donationCredit:             ontarioDonationCredit,
      politicalCredit:            ontarioPolitical,
      dividendTaxCredit:          ontarioDivTC,
      totalNonRefundableCredits:  ontarioNRC,
      lowIncomeTaxReduction:      litr,
      netOntarioTax:              ontarioTaxBeforeCredits,
      ontarioHealthPremium:       ohp,
      ontarioTaxPayable:          ontarioTaxPayable,
    },

    payroll: {
      cppEmployee:            cppEmployee,
      cpp2Employee:           cpp2Employee,
      cppSelfEmployed:        selfEmpCPP1,
      cpp2SelfEmployed:       selfEmpCPP2,
      cppDeductionLine31000:  cppCredit,
      eiEmployee:             eiEmployee,
      eiDeductionLine31200:   eiCredit,
    },

    refundable: {
      cwbBasic:                       cwbBasic,
      cwbDisability:                  cwbDisability,
      gstHstCredit:                   gstCredit,
      ontarioTrilliumBenefit:         otb,
      ontarioSalesTaxCredit:          ostc,
      ontarioEnergyPropertyTaxCredit: oeptc,
      northernOntarioEnergyCredit:    0, // not modeled in this version
    },

    summary: {
      totalIncome:          L15000_totalIncome,
      netIncome:            L23600_netIncome,
      taxableIncome:        L26000_taxableIncome,
      totalTaxPayable:      totalTaxPayable,
      totalCreditsApplied:  r(totalFedNRC + ontarioNRC + fedDividendTC + ontarioDivTC),
      taxAlreadyPaid:       taxAlreadyPaid,
      refundOrOwing:        refundOrOwing,
      marginalFederalRate:  margFed,
      marginalOntarioRate:  margON,
      marginalCombinedRate: margComb,
      effectiveRate:        effRate,
      takeHomePay: {
        annual:   annualTakeHome,
        monthly:  r(annualTakeHome / 12),
        biweekly: r(annualTakeHome / 26),
        weekly:   r(annualTakeHome / 52),
      },
    },

    warnings,
    optimizations,

    provenance: prov.toArray(),
  };
}

// ============================================================
// SCENARIO FUNCTIONS
// ============================================================

/**
 * Calculates optimal RRSP contribution for the current year.
 * @returns current tax, a function to model any contribution amount, and the recommended amount.
 */
export function calculateRRSPOptimal(input: TaxInput): {
  currentTax:          number;
  withContribution:    (amount: number) => { tax: number; savings: number; marginalRate: number };
  recommendedAmount:   number;
  shouldDefer:         boolean;
  deferReason:         string;
} {
  const current = calculateTaxes(input);
  const currentTax = current.summary.totalTaxPayable;
  const availableRoom = r(input.rrspContributionRoom - input.rrspContribution);

  function withContribution(amount: number) {
    const capped = Math.min(amount, availableRoom);
    const modified = { ...input, rrspContribution: r(input.rrspContribution + capped) };
    const result = calculateTaxes(modified);
    return {
      tax:         result.summary.totalTaxPayable,
      savings:     r(currentTax - result.summary.totalTaxPayable),
      marginalRate: current.summary.marginalCombinedRate,
    };
  }

  const recommended = Math.min(availableRoom, RRSP.maxContribution);

  // Suggest deferring if income is expected to be higher next year
  const shouldDefer = current.summary.marginalCombinedRate < 0.30;
  const deferReason = shouldDefer
    ? `Your combined marginal rate is ${(current.summary.marginalCombinedRate * 100).toFixed(1)}%. If your income will be higher next year, deferring RRSP contributions may save more tax.`
    : '';

  return { currentTax, withContribution, recommendedAmount: recommended, shouldDefer, deferReason };
}

/**
 * Models optimal pension income splitting between two spouses.
 * CRA allows up to 50% of eligible pension income to be allocated to the lower-income spouse.
 */
export function calculatePensionSplitting(primary: TaxInput, spouse: TaxInput): {
  withoutSplitting:    { primaryTax: number; spouseTax: number; combined: number };
  withOptimalSplitting: { primaryTax: number; spouseTax: number; combined: number; splitAmount: number };
  savings:             number;
} {
  const primaryResult = calculateTaxes(primary);
  const spouseResult  = calculateTaxes(spouse);
  const withoutCombined = r(primaryResult.summary.totalTaxPayable + spouseResult.summary.totalTaxPayable);

  // Try split amounts in $5,000 increments up to 50% of eligible pension
  const maxSplit = r(primary.pensionIncome * 0.50);
  let bestSavings = 0;
  let bestSplit = 0;
  let bestPrimaryTax = primaryResult.summary.totalTaxPayable;
  let bestSpouseTax  = spouseResult.summary.totalTaxPayable;

  for (let split = 5000; split <= maxSplit; split += 5000) {
    const modPrimary = { ...primary, pensionIncomeSplitting: split, pensionIncome: r(primary.pensionIncome - split) };
    const modSpouse  = { ...spouse,  pensionIncomeSplitting: -split, pensionIncome: r(spouse.pensionIncome + split) };
    const pTax = calculateTaxes(modPrimary).summary.totalTaxPayable;
    const sTax = calculateTaxes(modSpouse).summary.totalTaxPayable;
    const combined = r(pTax + sTax);
    if (withoutCombined - combined > bestSavings) {
      bestSavings = r(withoutCombined - combined);
      bestSplit   = split;
      bestPrimaryTax = pTax;
      bestSpouseTax  = sTax;
    }
  }

  return {
    withoutSplitting:    { primaryTax: primaryResult.summary.totalTaxPayable, spouseTax: spouseResult.summary.totalTaxPayable, combined: withoutCombined },
    withOptimalSplitting: { primaryTax: bestPrimaryTax, spouseTax: bestSpouseTax, combined: r(bestPrimaryTax + bestSpouseTax), splitAmount: bestSplit },
    savings: bestSavings,
  };
}

/**
 * Models capital gains harvesting: tax impact of additional capital gains this year.
 */
export function calculateCapitalGainsHarvesting(input: TaxInput, additionalGains: number): {
  taxOnCurrentGains:       number;
  taxWithAdditional:       number;
  marginalRateOnAdditional: number;
  warningIfAbove250k:      boolean;
} {
  const current     = calculateTaxes(input);
  const modified    = { ...input, capitalGains: r(input.capitalGains + additionalGains) };
  const withGains   = calculateTaxes(modified);
  const marginal    = r((withGains.summary.totalTaxPayable - current.summary.totalTaxPayable) / additionalGains);
  const above250k   = r(input.capitalGains + additionalGains) > CAPITAL_GAINS.threshold;

  return {
    taxOnCurrentGains:        current.summary.totalTaxPayable,
    taxWithAdditional:        withGains.summary.totalTaxPayable,
    marginalRateOnAdditional: marginal,
    warningIfAbove250k:       above250k,
  };
}

/**
 * Calculates OAS clawback and how much income reduction would eliminate it.
 */
export function calculateOASClawback(netIncome: number, oasBenefitsReceived: number): {
  clawbackRate:            number;
  clawbackAmount:          number;
  netOAS:                  number;
  incomeToReduceClawback:  number;
} {
  if (netIncome <= OAS_CLAWBACK.threshold) {
    return { clawbackRate: 0, clawbackAmount: 0, netOAS: oasBenefitsReceived, incomeToReduceClawback: 0 };
  }
  const clawback = Math.min(oasBenefitsReceived, r((netIncome - OAS_CLAWBACK.threshold) * OAS_CLAWBACK.rate));
  const incomeReductionNeeded = r(clawback / OAS_CLAWBACK.rate);
  return {
    clawbackRate:           OAS_CLAWBACK.rate,
    clawbackAmount:         clawback,
    netOAS:                 r(oasBenefitsReceived - clawback),
    incomeToReduceClawback: incomeReductionNeeded,
  };
}

/**
 * Complete tax calculation for a self-employed individual.
 * Computes both halves of CPP, quarterly installment amounts, and full TaxBreakdown.
 */
export function calculateSelfEmployedTax(grossRevenue: number, expenses: number): {
  netIncome:            number;
  cppBothHalves:        number;
  cpp2BothHalves:       number;
  taxBreakdown:         TaxBreakdown;
  quarterlyInstallments: number;
} {
  const net = Math.max(0, r(grossRevenue - expenses));
  const forCPP = Math.max(0, Math.min(net, CPP.maxPensionableEarnings) - CPP.basicExemption);
  const cpp1   = Math.min(CPP.maxSelfEmployedContribution, r(forCPP * CPP.selfEmployedRate));
  const cpp2Above = Math.max(0, Math.min(net, CPP2.secondCeiling) - CPP.maxPensionableEarnings);
  const cpp2   = Math.min(CPP2.maxSelfEmployedContribution, r(cpp2Above * CPP2.selfEmployedRate));

  const input: TaxInput = {
    ...emptyTaxInput(),
    selfEmploymentNetIncome: net,
    taxWithheld: 0,
    cppContributedEmployee: 0,
    cpp2ContributedEmployee: 0,
    eiContributedEmployee: 0,
    rrspContributionRoom: r(net * RRSP.earnedIncomeRate),
  };

  const breakdown = calculateTaxes(input);
  const quarterly = r(breakdown.summary.totalTaxPayable / 4);

  return { netIncome: net, cppBothHalves: cpp1, cpp2BothHalves: cpp2, taxBreakdown: breakdown, quarterlyInstallments: quarterly };
}

/**
 * Salary vs dividend comparison for owner-manager of a CCPC.
 * Simplified: does not model refundable dividend tax (GRIP/RDTOH).
 */
export function calculateDividendVsSalary(corporateIncome: number): {
  salary:         { personalTax: number; totalCost: number };
  dividend:       { personalTax: number; corporateTax: number; totalCost: number };
  recommendation: string;
} {
  // Salary scenario: corp pays out all as salary, gets deduction; personal pays full tax
  const salaryInput: TaxInput = { ...emptyTaxInput(), employmentIncome: corporateIncome };
  const salaryTax = calculateTaxes(salaryInput).summary.totalTaxPayable;

  // Dividend scenario: corp pays small business tax, then distributes as non-eligible dividend
  const corpTax   = r(corporateIncome * CORPORATE.combinedSmallBusinessRate);
  const netForDiv = r(corporateIncome - corpTax);
  const divInput: TaxInput = { ...emptyTaxInput(), ineligibleDividends: netForDiv };
  const divTax    = calculateTaxes(divInput).summary.totalTaxPayable;
  const divTotal  = r(corpTax + divTax);

  return {
    salary:    { personalTax: salaryTax, totalCost: salaryTax },
    dividend:  { personalTax: divTax, corporateTax: corpTax, totalCost: divTotal },
    recommendation: salaryTax < divTotal
      ? 'Salary results in lower combined tax for this income level. Consider a mix for CPP/RRSP room benefits.'
      : 'Dividend may result in lower combined tax. Consult a tax professional regarding your specific corporate structure.',
  };
}

/**
 * Canada Child Benefit estimate for 2025.
 */
export function estimateCCB(input: TaxInput): {
  monthlyAmount:  number;
  annualAmount:   number;
  clawbackIncome: number;
} {
  const under6  = input.numberOfChildrenUnder6 ?? 0;
  const older   = Math.max(0, (input.numberOfChildren ?? 0) - under6);
  const base    = r(under6 * CCB.under6Max + older * CCB.aged6to17Max);
  const nChildren = input.numberOfChildren ?? 0;

  let clawback = 0;
  // Simplified: use employment+self-employment as proxy for adjusted family net income
  const familyNet = r(input.employmentIncome + input.selfEmploymentNetIncome + input.otherIncome);
  if (familyNet > CCB.clawStart1Child && nChildren > 0) {
    const rate1   = CCB.clawRate1;
    const rate2   = nChildren > 1 ? CCB.clawRate2Plus * (nChildren - 1) : 0;
    clawback = r((familyNet - CCB.clawStart1Child) * (rate1 + rate2));
  }
  const annual = Math.max(0, r(base - clawback));
  return { monthlyAmount: r(annual / 12), annualAmount: annual, clawbackIncome: familyNet };
}

/**
 * GST/HST credit annual estimate.
 */
export function estimateGSTCredit(input: TaxInput): {
  quarterlyAmount: number;
  annualAmount:    number;
} {
  const result = calculateTaxes(input);
  return {
    quarterlyAmount: r(result.refundable.gstHstCredit / 4),
    annualAmount:    result.refundable.gstHstCredit,
  };
}

/**
 * Ontario Trillium Benefit annual estimate.
 */
export function estimateOntarioTrilliumBenefit(input: TaxInput): {
  monthlyAmount: number;
  annualAmount:  number;
  breakdown:     { oeptc: number; ostc: number; noec: number };
} {
  const result = calculateTaxes(input);
  const annual  = result.refundable.ontarioTrilliumBenefit;
  return {
    monthlyAmount: r(annual / 12),
    annualAmount:  annual,
    breakdown: {
      oeptc: result.refundable.ontarioEnergyPropertyTaxCredit,
      ostc:  result.refundable.ontarioSalesTaxCredit,
      noec:  result.refundable.northernOntarioEnergyCredit,
    },
  };
}

/**
 * Alternative Minimum Tax calculation.
 */
export function calculateAMT(input: TaxInput, regularTax: number): {
  adjustedIncome: number;
  amtTax:         number;
  amtApplies:     boolean;
  carryforward:   number;
} {
  const result = calculateTaxes(input);
  const adjustedIncome = Math.max(0, r(result.summary.taxableIncome - AMT.exemption));
  const amtTax  = r(adjustedIncome * AMT.rate);
  const amtApplies = amtTax > regularTax;
  return {
    adjustedIncome,
    amtTax,
    amtApplies,
    carryforward: amtApplies ? r(amtTax - regularTax) : 0,
  };
}

/** Creates a zero-value TaxInput. Useful as a base for partial scenarios. */
export function emptyTaxInput(): TaxInput {
  return {
    employmentIncome: 0, selfEmploymentNetIncome: 0, otherEmploymentIncome: 0,
    pensionIncome: 0, annuityIncome: 0, rrspIncome: 0, otherIncome: 0,
    interestIncome: 0, eligibleDividends: 0, ineligibleDividends: 0,
    capitalGains: 0, capitalLossesPriorYears: 0,
    rentalIncome: 0, rentalExpenses: 0, foreignIncome: 0, foreignTaxPaid: 0,
    eiRegularBenefits: 0, socialAssistance: 0, workersComp: 0,
    disabilityPensionCPP: 0, oasPension: 0, netPartnershipIncome: 0,
    scholarshipFellowship: 0, researchGrants: 0,
    rrspContribution: 0, rrspContributionRoom: 0, prppContribution: 0, fhsaContribution: 0,
    unionDues: 0, profDues: 0, childcareExpenses: 0, movingExpenses: 0,
    supportPayments: 0, carryingCharges: 0, employmentExpenses: 0, otherDeductions: 0,
    age: 35, isBlind: false, hasDisability: false, hasDisabledSpouse: false,
    hasDisabledDependent: false, disabledDependentAge: 0,
    hasSpouse: false, spouseNetIncome: 0,
    numberOfDependentsUnder18: 0, numberOfDependents18Plus: 0, isCaregiver: false,
    tuitionFederal: 0, tuitionCarryforwardFed: 0, studentLoanInterest: 0,
    medicalExpenses: 0, charitableDonations: 0, politicalContributions: 0,
    ontarioPoliticalContributions: 0, firstTimeHomeBuyer: false,
    homeAccessibilityReno: 0, adoptionExpenses: 0, pensionIncomeSplitting: 0,
    isVolunteerFirefighter: false, isSearchAndRescue: false, digitalNewsSubscriptions: 0,
    taxWithheld: 0, cppContributedEmployee: 0, cpp2ContributedEmployee: 0, eiContributedEmployee: 0,
    rentPaid: 0, propertyTaxPaid: 0, isNorthernOntario: false, ontarioSalesTaxCreditEligible: false,
    installmentsPaid: 0, fhsaWithdrawal: 0, hasPriorYearCapitalLosses: false,
    numberOfChildren: 0, numberOfChildrenUnder6: 0, hasSpouseForBenefits: false,
  };
}

// Needed for estimateCCB reference
declare const summary: undefined;
