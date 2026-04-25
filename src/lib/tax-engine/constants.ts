/**
 * TaxAgent.ai — 2025 Canadian Tax Constants (Ontario)
 * SINGLE SOURCE OF TRUTH. To update for new tax year, modify ONLY this file.
 *
 * Sources verified against:
 *   CRA T1 General 2025 (5006-r-25e): canada.ca/content/dam/cra-arc/formspubs/pbg/5006-r/5006-r-25e.txt
 *   CRA T4032ON Payroll Tables Jul 2025: canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032on-july/t4032on-july-general-information.html
 *   CRA Basic Personal Amount 2025: canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-30000-basic-personal-amount.html
 *   CRA CPP rates 2025: canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html
 *   CRA EI rates 2025: canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html
 *   CRA RRSP limit 2025: canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html
 *   CRA TFSA 2025: canada.ca/en/revenue-agency/news/newsroom/tax-tips/tax-tips-2025/tax-free-savings-account-limit.html
 *   CRA Capital gains 2025: canada.ca/en/revenue-agency/news/newsroom/tax-tips/tax-tips-2025/update-cra-administration-proposed-capital-gains-taxation-changes.html
 * All values verified: 2026-04-24
 *
 * 2025 NOTE — federal first-bracket rate for T1 returns:
 *   Use 14.5% (blended: 15% Jan–Jun + 14% Jul–Dec per Bill C-4).
 *   The July 2025 payroll withholding tables show 14% only because withholding was
 *   prorated after the mid-year tax cut; the 2025 T1 annual return uses 14.5%.
 *   The federal non-refundable credit rate is also 14.5% per the CRA T1 2025 form
 *   (5006-r-25e), not the prior-year 15%.
 *
 * 2025 NOTE — capital gains inclusion rate:
 *   CRA reverted to the currently enacted 50% flat rate for all 2025 T1 returns.
 *   The proposed two-thirds (66.67%) rate above $250,000 was deferred to Jan 1, 2026
 *   and does NOT affect 2025 returns.
 *   Source: canada.ca/en/revenue-agency/news/newsroom/tax-tips/tax-tips-2025/
 *           update-cra-administration-proposed-capital-gains-taxation-changes.html
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
// Source: CRA T1 General 2025 (5006-r-25e.txt)
// Tax year: 2025 | Verified: 2026-04-24
// Bill C-4 blends 15% (Jan-Jun) and 14% (Jul-Dec) to 14.5% effective for T1.
// Base-tax constants from column thresholds on CRA T1 2025 form:
//   $0: base $0; $57,375: base $8,319.38; $114,750: base $20,081.25;
//   $177,882: base $36,495.57; $253,414: base $58,399.85
// ============================================================

export const FEDERAL_BRACKETS: TaxBracket[] = [
  { min: 0,       max: 57375,    rate: 0.145  },  // 14.5% blended (Bill C-4 2025)
  { min: 57375,   max: 114750,   rate: 0.205  },  // 20.5%
  { min: 114750,  max: 177882,   rate: 0.26   },  // 26%
  { min: 177882,  max: 253414,   rate: 0.29   },  // 29%
  { min: 253414,  max: Infinity, rate: 0.33   },  // 33%
];

/**
 * Federal non-refundable tax credit rate — 14.5% for 2025 T1 returns.
 * Source: CRA T1 2025 (5006-r-25e.txt), Schedule 1 lines 30000–33500.
 * Tax year: 2025 | Verified: 2026-04-24
 *
 * NOTE: The 2025 T1 form applies 14.5% (the blended bracket rate) to all NRC amounts.
 * This replaces the prior 15% rate. The Top-Up Tax Credit mechanism (engine.ts) produces
 * $0 for 2025 since FEDERAL_CREDIT_RATE === FEDERAL_LOWEST_RATE.
 */
export const FEDERAL_CREDIT_RATE = 0.145;

/**
 * Blended lowest bracket rate (14.5%) — same as FEDERAL_CREDIT_RATE for 2025.
 * Source: CRA T1 2025 (5006-r-25e.txt) | Tax year: 2025 | Verified: 2026-04-24
 */
export const FEDERAL_LOWEST_RATE = 0.145;

// ============================================================
// ONTARIO TAX BRACKETS — Ontario Taxation Act s.8
// Source: CRA T4032ON Jul 2025 — canada.ca/en/revenue-agency/services/forms-publications/
//   payroll/t4032-payroll-deductions-tables/t4032on-july/t4032on-july-general-information.html
// Tax year: 2025 | Verified: 2026-04-24
// KP constants: $0 / $2,168 / $4,294 / $5,794 / $7,994
// ============================================================

export const ONTARIO_BRACKETS: TaxBracket[] = [
  { min: 0,       max: 52886,    rate: 0.0505 },  // 5.05%
  { min: 52886,   max: 105775,   rate: 0.0915 },  // 9.15%
  { min: 105775,  max: 150000,   rate: 0.1116 },  // 11.16%
  { min: 150000,  max: 220000,   rate: 0.1216 },  // 12.16%
  { min: 220000,  max: Infinity, rate: 0.1316 },  // 13.16%
];

/**
 * Ontario non-refundable tax credit rate — 5.05%
 * Source: CRA T4032ON Jul 2025 | Tax year: 2025 | Verified: 2026-04-24
 */
export const ONTARIO_CREDIT_RATE = 0.0505;

/**
 * Ontario Surtax — Ontario Taxation Act s.48
 * Applied on basic Ontario tax (after NRCs/DTC/LITR), before OHP.
 * Source: CRA T4032ON Jul 2025 | Tax year: 2025 | Verified: 2026-04-24
 */
export const ONTARIO_SURTAX = {
  threshold1: 5710,   // 20% surtax on basic Ontario tax above this
  rate1: 0.20,
  threshold2: 7307,   // additional 36% surtax on basic Ontario tax above this
  rate2: 0.36,        // total 56% (20% + 36%) on amount above threshold2
};

/**
 * Ontario Health Premium — Ontario Taxation Act s.33.1
 * Based on taxable income (line 26000). Graduated "lesser of" tiers — do NOT use
 * a simple bracket table. Each tier adds an amount capped by a per-tier maximum.
 * Source: CRA T4032ON Jul 2025 | Tax year: 2025 | Verified: 2026-04-24
 *
 * Tier structure (cumulative):
 *   Tier 1 ($20,001–$36,000):  min($300, 6% × (income − $20,000))          → max $300
 *   Tier 2 ($36,001–$48,000):  $300 + min($150, 6% × (income − $36,000))   → max $450
 *   Tier 3 ($48,001–$72,000):  $450 + min($150, 25% × (income − $48,000))  → max $600
 *   Tier 4 ($72,001–$200,000): $600 + min($150, 25% × (income − $72,000))  → max $750
 *   Tier 5 ($200,001+):        $750 + min($150, 25% × (income − $200,000)) → max $900
 */
export const ONTARIO_HEALTH_PREMIUM = {
  tier1Start:  20000,  // premium is $0 for income at or below this
  tier1End:    36000,  // tier 1 ends here
  tier1Rate:   0.06,   // 6% of income above $20,000
  tier1Max:    300,    // max premium added in tier 1 ($0 → $300)

  tier2End:    48000,  // tier 2 ends here
  tier2Rate:   0.06,   // 6% of income above $36,000
  tier2Max:    150,    // max additional premium in tier 2 ($300 → $450)

  tier3End:    72000,  // tier 3 ends here
  tier3Rate:   0.25,   // 25% of income above $48,000
  tier3Max:    150,    // max additional premium in tier 3 ($450 → $600)

  tier4End:    200000, // tier 4 ends here
  tier4Rate:   0.25,   // 25% of income above $72,000
  tier4Max:    150,    // max additional premium in tier 4 ($600 → $750)

  tier5Rate:   0.25,   // 25% of income above $200,000
  tier5Max:    150,    // max additional premium in tier 5 ($750 → $900)

  maxPremium:  900,    // absolute maximum premium
};

/**
 * Ontario Low-Income Tax Reduction — Ontario Taxation Act s.8(3)
 * Source: CRA T4032ON Jul 2025 | Tax year: 2025 | Verified: 2026-04-24
 * Basic amount for Ontario tax reduction: $294 per person.
 */
export const ONTARIO_LOW_INCOME_REDUCTION = {
  baseReduction: 294,      // maximum reduction per personal amount ($294 × 2 = $588 for single)
  clawbackStart: 18569,    // reduction starts phasing out above this taxable income
  clawbackRate:  0.0505,   // clawback at lowest Ontario rate
};

// ============================================================
// BASIC PERSONAL AMOUNTS
// ============================================================

/**
 * Federal Basic Personal Amount — ITA s.118(1)(c)
 * Source: CRA line 30000: canada.ca/en/revenue-agency/services/tax/individuals/topics/
 *   about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/
 *   line-30000-basic-personal-amount.html
 * Tax year: 2025 | Verified: 2026-04-24
 *
 * Full BPA ($16,129) for net income ≤ $177,882.
 * Minimum BPA ($14,538) for net income ≥ $253,414.
 * Phase-out: federalBPA = 16129 − ((netIncome − 177882) × (1591 / 75532)); clamp to [14538, 16129].
 */
export const FEDERAL_BPA = {
  base:          14538,   // Minimum BPA (net income ≥ $253,414)
  additional:    1591,    // Additional amount clawed back between $177,882 and $253,414
  max:           16129,   // Full BPA (net income ≤ $177,882)
  clawbackStart: 177882,  // Phase-out begins at start of 29% bracket
  clawbackEnd:   253414,  // Additional fully eliminated at start of 33% bracket; range = $75,532
};

/**
 * Ontario Basic Personal Amount — Ontario Taxation Act s.8(1)
 * Credit = $12,747 × 5.05% = $643.72
 * Source: CRA T4032ON Jul 2025 | Tax year: 2025 | Verified: 2026-04-24
 */
export const ONTARIO_BPA = 12747;

// ============================================================
// CPP / CPP2 / EI 2025
// Source: CRA T4032ON Jul 2025 + CRA CPP/EI rate pages | Verified: 2026-04-24
// ============================================================

/**
 * Canada Pension Plan (CPP + first additional CPP) 2025
 * Source: canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/
 *   payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html
 * Tax year: 2025 | Verified: 2026-04-24
 * YMPE $71,300 | Basic exemption $3,500 | Employee rate 5.95% (base 4.95% + first additional 1.00%)
 */
export const CPP = {
  maxPensionableEarnings:      71300,   // YMPE 2025
  basicExemption:              3500,    // unchanged
  employeeRate:                0.0595,  // 5.95% combined (base 4.95% + first additional 1.00%)
  selfEmployedRate:            0.1190,  // pays both employee + employer sides
  maxEmployeeContribution:     4034.10, // (71300 − 3500) × 5.95%
  maxSelfEmployedContribution: 8068.20, // both halves
};

/**
 * Second Additional CPP (CPP2) 2025
 * Source: canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/calculating-deductions/
 *   making-deductions/second-additional-cpp-contribution-rates-maximums.html
 * Tax year: 2025 | Verified: 2026-04-24
 * YAMPE $81,200 | Employee rate 4.00% on earnings between YMPE and YAMPE
 */
export const CPP2 = {
  secondCeiling:               81200,   // YAMPE 2025
  rate:                        0.04,    // 4.00% employee/employer rate
  selfEmployedRate:            0.08,    // both sides
  maxEmployeeContribution:     396.00,  // (81200 − 71300) × 4.00%
  maxSelfEmployedContribution: 792.00,
};

/**
 * Employment Insurance (EI) 2025 — Canada except Quebec
 * Source: canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/
 *   payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html
 * Tax year: 2025 | Verified: 2026-04-24
 * Max insurable $65,700 | Employee rate 1.64% | Max employee premium $1,077.48
 */
export const EI = {
  maxInsurableEarnings: 65700,   // maximum annual insurable earnings
  premiumRate:          0.0164,  // 1.64% employee rate
  maxPremium:           1077.48, // 65700 × 1.64%
  employerRateMultiple: 1.4,     // employer pays 1.4× employee rate
};

// ============================================================
// RRSP / TFSA / FHSA 2025
// ============================================================

/**
 * RRSP deduction limit 2025 — ITA s.146(5)
 * Source: canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/
 *   pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html
 * Tax year: 2025 | Verified: 2026-04-24
 * Dollar limit $32,490; actual room = lesser of this or 18% of prior-year earned income.
 */
export const RRSP = {
  maxContribution:    32490,  // 2025 annual RRSP dollar limit
  earnedIncomeRate:   0.18,   // 18% of prior-year earned income
};

/**
 * TFSA annual contribution limit 2025
 * Source: canada.ca/en/revenue-agency/news/newsroom/tax-tips/tax-tips-2025/
 *   tax-free-savings-account-limit.html
 * Tax year: 2025 | Verified: 2026-04-24
 * 2024 limit: $7,000 | 2025 limit: $7,000 | 2026 limit: $7,000
 */
export const TFSA = {
  annualLimit: 7000,  // 2025 annual TFSA dollar limit
};

export const FHSA = {
  annualLimit:         8000,
  lifetimeLimit:       40000,
  carryForwardMax:     8000,   // one year unused room carries forward
};

// ============================================================
// CAPITAL GAINS (2025) — ITA s.38
// Source: canada.ca/en/revenue-agency/news/newsroom/tax-tips/tax-tips-2025/
//   update-cra-administration-proposed-capital-gains-taxation-changes.html
// Tax year: 2025 | Verified: 2026-04-24
//
// CRA reverted to the currently enacted 50% flat inclusion rate for all 2025 T1 returns.
// The proposed two-thirds (66.67%) rate above $250,000 was deferred to Jan 1, 2026.
// Do NOT apply the $250,000 two-tier threshold for 2025 T1 calculations.
// LCGE for qualifying small business shares / farm / fishing property: $1,250,000
// ============================================================

export const CAPITAL_GAINS = {
  inclusionRateLow:  0.50,   // 50% flat for ALL 2025 capital gains (no two-tier split)
  inclusionRateHigh: 0.50,   // same as low — two-tier deferred to Jan 1, 2026
  threshold:         250000, // threshold retained for reference; both rates are equal for 2025
  lcge:              1250000, // Lifetime Capital Gains Exemption (QSBC/farm/fishing)
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
// All multiplied by FEDERAL_CREDIT_RATE (14.5%) to get credit value.
// Exceptions: donations (tiered rates), political contributions (direct credit).
// Source: CRA T1 2025 (5006-r-25e.txt) | Tax year: 2025 | Verified: 2026-04-24
// ============================================================

export const FEDERAL_CREDITS = {
  /**
   * Canada Employment Amount — ITA s.118(10)
   * Lesser of $1,471 or employment income (line 10100 + line 10400).
   * Source: CRA T1 2025 (5006-r-25e.txt) | Tax year: 2025 | Verified: 2026-04-24
   */
  canadaEmploymentAmount: 1471,

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

  /** Federal Political Contribution Credit — ITA s.127(3). Direct credit (not × 15%). Max $650. */
  politicalContributionMaxCredit: 650,
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
  threshold:         2759,   // 2025: lesser of $2,759 or 3% of net income (ITA s.118.2(1)(d))
  thresholdRate:     0.03,
  dependantMax:      7999,   // max per dependant 18+ (not spouse)
  dependantThreshold: 2759,
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

  // HBP/LLP repayments (ITA s.146.01/146.02)
  rrspHbpLlpRepayment:       24600,

  // AMT carryforward credit — prior years' minimum tax offset (ITA s.120.2)
  amtCarryforwardCredit:     40425,

  // Tax deducted
  totalTaxDeducted:          43700,

  // Refund or balance
  totalPayable:              43500,
  refund:                    48400,
  balanceOwing:              48500,
} as const;
