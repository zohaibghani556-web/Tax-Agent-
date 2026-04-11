/**
 * TaxAgent.ai — 2025 Canadian Tax Constants (Ontario)
 * SINGLE SOURCE OF TRUTH. To update for new tax year, modify ONLY this file.
 *
 * Sources verified against:
 *   CRA T4032 Payroll Deductions Tables (2025): canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables.html
 *   CRA Schedule 1 Federal Tax (2025): canada.ca/en/revenue-agency/services/forms-publications/tax-packages-years/general-income-tax-benefit-package/5000-s1.html
 *   CRA ON428 Ontario Tax (2025): canada.ca/en/revenue-agency/services/forms-publications/tax-packages-years/general-income-tax-benefit-package/ontario/5006-pc.html
 *   CRA ON-BEN (2025): ontario trillium benefit
 *   EY Ontario 2025 personal tax rates: ey.com/en_ca/tax/tax-calculators/personal-tax
 *   Finance Canada Bill C-4 (2025): blended lowest federal rate 14.5%
 *
 * 2025 SPECIAL NOTE: Federal lowest rate is BLENDED 14.5%
 * (15% Jan 1–Jun 30, 14% Jul 1–Dec 31, per Bill C-4)
 */

export const TAX_YEAR = 2025;

// ============================================================
// INTERFACES
// ============================================================

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export interface BenefitThreshold {
  amount: number;
  incomeThresholdSingle: number;
  incomeThresholdFamily: number;
  reductionRate: number;
}

// ============================================================
// FEDERAL TAX BRACKETS — ITA s.117
// Bill C-4 blends 15% (Jan-Jun) and 14% (Jul-Dec) to 14.5% effective
// ============================================================

export const FEDERAL_BRACKETS: TaxBracket[] = [
  { min: 0,       max: 57375,    rate: 0.145  },  // 14.5% blended
  { min: 57375,   max: 114750,   rate: 0.205  },  // 20.5%
  { min: 114750,  max: 177882,   rate: 0.26   },  // 26%
  { min: 177882,  max: 253414,   rate: 0.29   },  // 29%
  { min: 253414,  max: Infinity, rate: 0.33   },  // 33%
];

/**
 * Non-refundable credit rate stays at 15% (pre-Bill C-4 rate) per Top-Up Tax Credit.
 * This preserves the dollar value of personal credits in the transition year.
 * CRA Schedule 1 line 30000–33500 all use 15%.
 */
export const FEDERAL_CREDIT_RATE = 0.15;

/**
 * Actual blended lowest bracket rate (14.5%).
 * Used to compute the Top-Up Tax Credit = credit amounts × (15% − 14.5%).
 */
export const FEDERAL_LOWEST_RATE = 0.145;

// ============================================================
// ONTARIO TAX BRACKETS — Ontario Taxation Act s.8
// Source: CRA T4032ON, effective Jan 1 2025
// ============================================================

export const ONTARIO_BRACKETS: TaxBracket[] = [
  { min: 0,       max: 51446,    rate: 0.0505 },  // 5.05%
  { min: 51446,   max: 102894,   rate: 0.0915 },  // 9.15%
  { min: 102894,  max: 150000,   rate: 0.1116 },  // 11.16%
  { min: 150000,  max: 220000,   rate: 0.1216 },  // 12.16%
  { min: 220000,  max: Infinity, rate: 0.1316 },  // 13.16%
];

export const ONTARIO_CREDIT_RATE = 0.0505;

// Ontario Surtax — Ontario Taxation Act s.48
// Applied on basic Ontario tax (after NRCs/DTC/LITR), before OHP
// Source: CRA T4032ON Jan 2025
export const ONTARIO_SURTAX = {
  threshold1: 5818,   // 20% surtax on basic Ontario tax above this
  rate1: 0.20,
  threshold2: 7446,   // additional 36% surtax on basic Ontario tax above this
  rate2: 0.36,        // total 56% (20% + 36%) on amount above threshold2
};

// Ontario Health Premium — Ontario Taxation Act s.33.1
// Uses graduated "lesser of" formula — do NOT use a simple bracket table.
// Thresholds and max amounts by tier (see calculateOntarioHealthPremium function).
export const ONTARIO_HEALTH_PREMIUM = {
  tier1Start:  20000,  // premium is $0 for income at or below this
  tier1End:    36000,  // first partial premium tier ends here
  tier1Rate:   0.06,   // 6% of income above $20,000
  tier1Max:    300,    // maximum premium added in tier 1

  tier2End:    48000,  // second partial premium tier ends here
  tier2Rate:   0.06,   // 6% of income above $36,000
  tier2Max:    150,    // maximum additional premium in tier 2 ($300 → $450)

  tier3End:    72000,  // third partial premium tier ends here
  tier3Rate:   0.25,   // 25% of income above $48,000
  tier3Max:    150,    // maximum additional premium in tier 3 ($450 → $600)

  tier4End:    200000, // fourth partial premium tier ends here
  tier4Rate:   0.25,   // 25% of income above $72,000
  tier4Max:    300,    // maximum additional premium in tier 4 ($600 → $900)

  maxPremium:  900,    // absolute maximum premium ($200,001+)
};

// Ontario Low-Income Tax Reduction — Ontario Taxation Act s.8(3)
export const ONTARIO_LOW_INCOME_REDUCTION = {
  baseReduction: 294,      // maximum reduction in Ontario tax
  clawbackStart: 18569,    // reduction clawed back above this taxable income
  clawbackRate:  0.0505,   // clawback at lowest Ontario rate
};

// ============================================================
// BASIC PERSONAL AMOUNTS
// ============================================================

/** Federal BPA — ITA s.118(1)(c). Full BPA at income ≤ $177,882; additional
 *  $1,591 clawed back linearly between $177,882 and $253,414. */
export const FEDERAL_BPA = {
  base:          14538,   // Base BPA (everyone)
  additional:    1591,    // Additional BPA clawed back above $177,882
  max:           16129,   // Full BPA = base + additional
  clawbackStart: 177882,  // Clawback of additional begins here
  clawbackEnd:   253414,  // Additional fully eliminated at this net income
};

/** Ontario BPA — Ontario Taxation Act s.8(1). × 5.05% = $599.18 credit */
export const ONTARIO_BPA = 11865;

// ============================================================
// CPP / CPP2 / EI 2025 — source: CRA T4032
// ============================================================

export const CPP = {
  maxPensionableEarnings:     71300,
  basicExemption:             3500,
  employeeRate:               0.0595,
  selfEmployedRate:           0.1190,    // pays both employee + employer
  maxEmployeeContribution:    4034.10,   // (71300 - 3500) × 5.95%
  maxSelfEmployedContribution: 8068.20,  // both halves
};

export const CPP2 = {
  secondCeiling:               81200,    // YAMPE
  rate:                        0.04,
  selfEmployedRate:            0.08,
  maxEmployeeContribution:     396.00,   // (81200 - 71300) × 4%
  maxSelfEmployedContribution: 792.00,
};

export const EI = {
  maxInsurableEarnings: 65700,
  premiumRate:          0.0164,
  maxPremium:           1077.48,         // 65700 × 1.64%
  employerRateMultiple: 1.4,             // employer pays 1.4× employee rate
};

// ============================================================
// RRSP / FHSA 2025
// ============================================================

export const RRSP = {
  maxContribution:    32490,   // dollar limit; actual room also capped at 18% prior-year earned income
  earnedIncomeRate:   0.18,
};

export const FHSA = {
  annualLimit:         8000,
  lifetimeLimit:       40000,
  carryForwardMax:     8000,   // one year unused room carries forward
};

// ============================================================
// CAPITAL GAINS (2025) — ITA s.38
// Two-tier system per user specification:
//   First $250,000 net gains: 50% inclusion
//   Above $250,000: 66.67% inclusion (Budget 2024)
// LCGE for qualifying small business shares: $1,250,000
// ============================================================

export const CAPITAL_GAINS = {
  inclusionRateLow:  0.50,      // first $250,000 of net gains
  inclusionRateHigh: 0.6667,    // net gains above $250,000
  threshold:         250000,    // threshold between rates
  lcge:              1250000,   // Lifetime Capital Gains Exemption (QSBC/farm/fishing)
  principalResidenceExempt: true,
};

// ============================================================
// DIVIDENDS 2025 — ITA s.82, s.121
// ============================================================

export const DIVIDENDS = {
  eligible: {
    grossUpRate:         0.38,       // actual dividend × 1.38 = taxable amount (line 12000)
    federalCreditRate:   0.150198,   // % of grossed-up dividend (ITA s.121(a))
    ontarioCreditRate:   0.100,      // % of grossed-up dividend (Ontario Taxation Act s.19.1)
  },
  nonEligible: {
    grossUpRate:         0.15,       // actual dividend × 1.15 = taxable amount (line 12010)
    federalCreditRate:   0.090301,   // % of grossed-up dividend (ITA s.121(b))
    ontarioCreditRate:   0.03282,    // % of grossed-up dividend (Ontario Taxation Act s.19.1)
  },
};

// ============================================================
// FEDERAL NON-REFUNDABLE CREDIT AMOUNTS — ITA s.118–118.62
// All multiplied by FEDERAL_CREDIT_RATE (15%) to get credit value.
// Exceptions: donations (tiered rates), top-up credit.
// ============================================================

export const FEDERAL_CREDITS = {
  /** Canada Employment Amount — ITA s.118(10) */
  canadaEmploymentAmount: 1433,

  /** Pension Income Amount — ITA s.118(3) */
  pensionIncomeMax: 2000,

  /** Age Amount — ITA s.118(2). Clawed back 15% above $44,325; eliminated at ~$103,325. */
  ageAmount: {
    max:             8790,
    clawbackStart:   44325,
    clawbackRate:    0.15,
    eliminationIncome: 103325,   // approx: $44,325 + $8,790/0.15
  },

  /** Disability Tax Credit — ITA s.118.3. Requires CRA-approved T2201. */
  disabilityAmount: {
    base:                       9872,
    supplementUnder18:          5758,
    supplementClawbackThreshold: 3302,  // supplement reduced $ for $ above this
    supplementClawbackRate:     1.0,
  },

  /** Canada Caregiver Amount — ITA s.118(1)(d)/(e). For infirm dependant 18+. */
  caregiver: {
    canadaCaregiver: 7999,
    clawbackStart:   0,
  },

  /** Home Accessibility Tax Credit — ITA s.118.041 */
  homeAccessibility: {
    max: 20000,
  },

  /** First Home Buyers' Amount — ITA s.118.05. Credit = $10,000 × 15% = $1,500 */
  homeBuyers: {
    amount: 10000,
  },

  /** Digital News Subscription Credit — ITA s.118.02 */
  digitalNewsSubscription: {
    max: 500,
  },

  /** Volunteer Firefighter / Search and Rescue — ITA s.118.06/118.07 */
  volunteerFirefighter: 3000,
  searchAndRescue:      3000,

  /** Spouse/Common-law Partner Amount — ITA s.118(1)(a) */
  spouseAmountMax: 16129,

  /** Eligible Dependant Amount — ITA s.118(1)(b) */
  eligibleDependantMax: 16129,

  /** Adoption Expenses — ITA s.118.02 */
  adoptionExpensesMax: 19350,
};

// ============================================================
// ONTARIO NON-REFUNDABLE CREDIT AMOUNTS
// All multiplied by ONTARIO_CREDIT_RATE (5.05%).
// ============================================================

export const ONTARIO_CREDITS = {
  /** Ontario Age Amount — Ontario Taxation Act s.4(3.1) */
  ageAmount: {
    max:           5994,
    clawbackStart: 44325,
    clawbackRate:  0.15,
  },

  /** Ontario Disability Amount */
  disabilityAmount: {
    base:            9286,
    supplementChild: 5416,
  },

  /** Ontario Pension Income Amount — max $1,595 */
  pensionIncomeMax: 1595,

  /** Ontario Spouse/Common-law Partner Amount */
  spouseAmountMax: 10582,

  /** Ontario Eligible Dependant Amount */
  eligibleDependantMax: 10582,

  /** Ontario Caregiver Amount */
  caregiverAmount: 5443,

  /** Ontario Political Contribution Credit — tiered; max credit $1,316 */
  politicalContributionMaxCredit: 1316,
};

// ============================================================
// DONATIONS — ITA s.118.1
// ============================================================

export const DONATIONS = {
  firstTierLimit:         200,
  firstTierRate:          0.15,     // 15% on first $200 (federal)
  secondTierRate:         0.29,     // 29% on amounts above $200
  highIncomeRate:         0.33,     // 33% on amounts above $200 if taxable income > $253,414
  topBracketThreshold:    253414,
  maxClaimRate:           0.75,     // max 75% of net income (100% in year of death)
  carryForwardYears:      5,
};

export const ONTARIO_DONATIONS = {
  firstTierLimit:  200,
  firstTierRate:   0.0505,  // 5.05% on first $200
  secondTierRate:  0.1116,  // 11.16% on amounts above $200
};

// ============================================================
// MEDICAL EXPENSES — ITA s.118.2
// ============================================================

export const MEDICAL_EXPENSES = {
  threshold:         2635,   // lesser of $2,635 or 3% of net income
  thresholdRate:     0.03,
  dependantMax:      7999,   // max per dependant 18+ (not spouse)
  dependantThreshold: 2635,
};

// ============================================================
// TUITION — ITA s.118.5 / s.118.61
// NOTE: Ontario eliminated tuition credit after 2017 tax year.
// ============================================================

export const TUITION = {
  creditRate:                      0.15,   // Federal only
  maxTransfer:                     5000,   // Max transfer to parent/grandparent/spouse
  carryForward:                    true,
  scholarshipExemptionFullTime:    Infinity,
  scholarshipExemptionPartTime:    500,
};

// ============================================================
// ALTERNATIVE MINIMUM TAX (AMT) — ITA s.127.5
// Reformed since June 2024 (Budget 2024): higher rate + higher exemption
// ============================================================

export const AMT = {
  rate:      0.205,    // 20.5% flat rate (was 15%)
  exemption: 173205,   // basic exemption (was $40,000, indexed)
};

// ============================================================
// OAS CLAWBACK (Social Benefits Repayment) — ITA s.180.2
// ============================================================

export const OAS_CLAWBACK = {
  threshold:    90997,  // 2025: 15% repayment on net income above this
  rate:         0.15,
};

// ============================================================
// CANADA WORKERS BENEFIT (CWB) — ITA s.122.7
// Refundable federal credit for low-income workers
// ============================================================

export const CWB = {
  basicSingleMax:     1518,
  basicFamilyMax:     2616,
  disabilitySingle:   784,
  disabilityFamily:   784,
  singleClawStart:    22944,
  familyClawStart:    26177,
  clawRate:           0.15,
  workingIncomeMin:   3000,
};

// ============================================================
// GST/HST CREDIT — ITA s.122.5
// Quarterly refundable federal credit
// ============================================================

export const GST_CREDIT = {
  baseAdult:  349,    // per adult
  baseChild:  184,    // per child under 19
  clawRate:   0.05,   // 5% reduction per dollar above threshold
  clawStart:  40000,  // adjusted family net income threshold
};

// ============================================================
// CANADA CHILD BENEFIT (CCB) — ITA s.122.61
// Monthly; not reported as income
// ============================================================

export const CCB = {
  under6Max:         7787,   // per year per child under 6
  aged6to17Max:      6570,   // per year per child 6–17
  clawStart1Child:   36502,  // family net income threshold (1 child)
  clawRate1:         0.135,  // clawback rate for 1 child (13.5%)
  clawRate2Plus:     0.059,  // clawback rate per additional child (5.9%)
};

// ============================================================
// ONTARIO TRILLIUM BENEFIT (OTB) — ON-BEN
// Paid monthly from Jul 2026 based on 2025 return
// ============================================================

// Ontario Sales Tax Credit (OSTC)
export const OSTC = {
  adultAmount:               345,
  childAmount:               345,
  singleReductionThreshold:  29047,
  familyReductionThreshold:  36309,
  reductionRate:             0.04,
};

// Ontario Energy and Property Tax Credit (OEPTC)
export const OEPTC = {
  energyComponent:           280,
  propertyTaxComponent: {
    maxRent:    0.20,   // 20% of rent paid = deemed property tax
    maxCredit:  1248,   // maximum property tax credit (non-senior)
  },
  seniorEnergyComponent:     280,
  seniorPropertyTaxMax:      1421,
  singleReductionThreshold:  29047,
  familyReductionThreshold:  36309,
  reductionRate:             0.02,
};

// ============================================================
// CANADA TRAINING CREDIT (CTC) — ITA s.122.91
// Refundable; 50% of eligible tuition/training fees, capped at accumulated room.
// $250 added to room per year (from 2020 onward); max room $5,000 lifetime.
// ============================================================

export const CANADA_TRAINING_CREDIT = {
  annualRoomAccrual: 250,   // $250 added to room each year (if $10,000+ earned income)
  creditRate: 0.50,          // 50% of eligible fees
  maxLifetimeRoom: 5000,
};

// ============================================================
// CANADA CAREGIVER AMOUNT — ITA s.118(1)(d)/(e), s.118(4)
// ============================================================

export const CANADA_CAREGIVER = {
  // Line 30425: supplement added to spouse/CL amount when spouse is infirm
  spouseInfirmSupplement: 2616,

  // Line 30450: for infirm dependant 18+ (parent, adult child, sibling, etc.)
  infirmDependant18Plus: 7999,
  infirmDependantIncomeThreshold: 18783,  // Reduced by net income above this

  // Line 30500: for child under 18 with impairment (no income test)
  childUnder18: 2616,
};

// ============================================================
// ONTARIO SENIORS CARE AT HOME TAX CREDIT — Ontario Budget 2021+
// Refundable; 25% of qualifying expenses up to $6,000, max credit $1,500.
// Available to seniors 70+; clawed back 5% above $65,000 family net income.
// ============================================================

export const ONTARIO_SENIORS_CARE = {
  minAge: 70,
  creditRate: 0.25,
  maxExpenses: 6000,
  maxCredit: 1500,
  clawbackStart: 65000,
  clawbackRate: 0.05,
};

// ============================================================
// REFUNDABLE MEDICAL EXPENSE SUPPLEMENT — ITA s.122.51
// Refundable; 25% of eligible medical, capped at $1,524 (2025).
// Requires $3,840+ earned income; clawed back 5% above ~$30,652.
// ============================================================

export const REFUNDABLE_MEDICAL_SUPPLEMENT = {
  creditRate: 0.25,
  maxCredit: 1524,
  minEarnedIncome: 3840,
  clawbackStart: 30652,
  clawbackRate: 0.05,
};

// ============================================================
// CORPORATE TAX (CCPC) — reference rates
// ============================================================

export const CORPORATE = {
  federalGeneralRate:         0.15,
  federalSmallBusinessRate:   0.09,
  smallBusinessLimit:         500000,
  ontarioGeneralRate:         0.115,
  ontarioSmallBusinessRate:   0.032,
  combinedGeneralRate:        0.265,
  combinedSmallBusinessRate:  0.122,
};

// ============================================================
// HST (ONTARIO)
// ============================================================

export const HST = {
  rate:                   0.13,
  federalComponent:       0.05,
  provincialComponent:    0.08,
  registrationThreshold:  30000,
};

// ============================================================
// FILING DEADLINES (2025 tax year)
// ============================================================

export const DEADLINES = {
  filingDeadline:              '2026-04-30',
  selfEmployedFilingDeadline:  '2026-06-15',
  paymentDeadline:             '2026-04-30',
  rrspContributionDeadline:    '2026-03-02',
};

// ============================================================
// CRA LINE NUMBER MAPPINGS
// ============================================================

export const CRA_LINES = {
  // Total income
  employmentIncome:          10100,
  otherEmploymentIncome:     10400,
  oldAgeSecurity:            11300,
  cppBenefits:               11400,
  otherPensions:             11500,
  electedPensionSplit:       11600,
  eiIncome:                  11900,
  eligibleDividends:         12000,
  otherDividends:            12010,
  interestIncome:            12100,
  rentalIncome:              12600,
  taxableCapitalGains:       12700,
  rrspIncome:                12900,
  otherIncome:               13000,
  selfEmploymentBusiness:    13500,
  selfEmploymentProfessional: 13700,
  selfEmploymentCommission:  13900,
  selfEmploymentFarming:     14100,
  selfEmploymentFishing:     14300,
  totalIncome:               15000,

  // Net income
  pensionAdjustment:         20600,
  rppContributions:          20700,
  rrspDeduction:             20800,
  fhsaDeduction:             20805,
  unionDues:                 21200,
  childcareExpenses:         21400,
  movingExpenses:            21900,
  supportPaymentsMade:       22000,
  carryingCharges:           22100,
  cppSelfEmployed:           22200,
  employmentExpenses:        22900,
  otherDeductions:           23200,
  netIncome:                 23600,

  // Taxable income
  canadianForcesDeduction:   24400,
  socialBenefitsRepayment:   23500,
  capitalGainsDeduction:     25400,
  northernResidents:         25500,
  lossesOtherYears:          25200,
  taxableIncome:             26000,

  // Federal tax (Schedule 1)
  basicPersonalAmount:       30000,
  ageAmount:                 30100,
  spouseAmount:              30300,
  eligibleDependantAmount:   30400,
  cppContributions:          30800,
  cpp2Contributions:         30900,
  eiPremiums:                31200,
  canadaEmployment:          31260,
  pensionIncomeAmount:       31400,
  disabilityAmount:          31600,
  studentLoanInterest:       31900,
  tuitionAmount:             32300,
  tuitionTransfer:           32400,
  medicalExpenses:           33099,
  medicalExpensesSupplement: 33199,
  donationsCredits:          34900,

  // Tax deducted
  totalTaxDeducted:          43700,

  // Refund or balance
  totalPayable:              43500,
  refund:                    48400,
  balanceOwing:              48500,
} as const;
