/**
 * TaxAgent.ai — 2025 Canadian Tax Constants (Ontario)
 * SINGLE SOURCE OF TRUTH. To update for new tax year, modify ONLY this file.
 * 
 * Sources verified against:
 * - CRA federal rates: canada.ca/en/revenue-agency
 * - H&R Block 2025 brackets: hrblock.ca
 * - EY Ontario 2025 tax tables: ey.com
 * - TaxTips.ca: taxtips.ca/taxrates/on.htm
 * - Wealthsimple 2025 Ontario: wealthsimple.com/en-ca/learn/ontario-tax-brackets
 * 
 * 2025 SPECIAL NOTE: Federal lowest rate is BLENDED 14.5%
 * (15% Jan 1–Jun 30, 14% Jul 1–Dec 31)
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
// FEDERAL TAX BRACKETS
// ============================================================

export const FEDERAL_BRACKETS: TaxBracket[] = [
  { min: 0,       max: 57375,    rate: 0.145  },
  { min: 57375,   max: 114750,   rate: 0.205  },
  { min: 114750,  max: 177882,   rate: 0.26   },
  { min: 177882,  max: 253414,   rate: 0.29   },
  { min: 253414,  max: Infinity, rate: 0.33   },
];

// Credit rate: 15% preserved via Top-Up Tax Credit for 2025
export const FEDERAL_CREDIT_RATE = 0.15;
export const FEDERAL_LOWEST_RATE = 0.145;

// ============================================================
// ONTARIO TAX BRACKETS
// ============================================================

export const ONTARIO_BRACKETS: TaxBracket[] = [
  { min: 0,       max: 52886,    rate: 0.0505 },
  { min: 52886,   max: 105775,   rate: 0.0915 },
  { min: 105775,  max: 150000,   rate: 0.1116 },
  { min: 150000,  max: 220000,   rate: 0.1216 },
  { min: 220000,  max: Infinity, rate: 0.1316 },
];

export const ONTARIO_CREDIT_RATE = 0.0505;

// Ontario Surtax (applied to basic Ontario tax, NOT income)
export const ONTARIO_SURTAX = {
  threshold1: 6104,
  rate1: 0.20,
  threshold2: 7812,
  rate2: 0.36,  // Additional 36% (total 56% on amount over threshold2)
};

// Ontario Health Premium (based on taxable income, NOT basic Ontario tax)
export const ONTARIO_HEALTH_PREMIUM_BRACKETS = [
  { min: 0,      max: 20000,  base: 0,   rate: 0,    prevMax: 0   },
  { min: 20000,  max: 25000,  base: 0,   rate: 0.06, prevMax: 0   },
  { min: 25000,  max: 36000,  base: 300, rate: 0.06, prevMax: 300 },
  { min: 36000,  max: 38500,  base: 450, rate: 0.25, prevMax: 450 },
  { min: 38500,  max: 48000,  base: 600, rate: 0.25, prevMax: 600 },
  { min: 48000,  max: 48600,  base: 750, rate: 0.25, prevMax: 750 },
  { min: 48600,  max: 72000,  base: 900, rate: 0,    prevMax: 900 },
  { min: 72000,  max: 72600,  base: 900, rate: 0.25, prevMax: 900 },
  { min: 72600,  max: 200000, base: 900, rate: 0,    prevMax: 900 },
  { min: 200000, max: 200600, base: 900, rate: 0.25, prevMax: 900 },
  { min: 200600, max: Infinity, base: 900, rate: 0,  prevMax: 900 },
];

// Ontario low-income tax reduction
export const ONTARIO_LOW_INCOME_REDUCTION = {
  baseReduction: 294,        // Reduction in Ontario tax
  clawbackStart: 18569,      // Taxable income threshold
  clawbackRate: 0.0505,      // Clawed back at lowest Ontario rate
};

// ============================================================
// BASIC PERSONAL AMOUNTS
// ============================================================

export const FEDERAL_BPA = {
  base: 14538,
  additional: 1591,
  max: 16129,                 // base + additional
  clawbackStart: 177882,     // Additional reduced above this
  clawbackEnd: 253414,       // Additional fully eliminated
};

export const ONTARIO_BPA = 12747;

// ============================================================
// CPP / CPP2 / EI (2025)
// ============================================================

export const CPP = {
  maxPensionableEarnings: 71300,
  basicExemption: 3500,
  employeeRate: 0.0595,
  selfEmployedRate: 0.1190,   // Both portions
  maxEmployeeContribution: 4034.10,
  maxSelfEmployedContribution: 8068.20,
};

export const CPP2 = {
  secondCeiling: 81200,
  rate: 0.04,
  selfEmployedRate: 0.08,
  maxEmployeeContribution: 396.00,
  maxSelfEmployedContribution: 792.00,
};

export const EI = {
  maxInsurableEarnings: 65700,
  premiumRate: 0.0164,
  maxPremium: 1077.48,
};

// ============================================================
// RRSP / FHSA
// ============================================================

export const RRSP = {
  maxContribution: 32490,
  earnedIncomeRate: 0.18,
};

export const FHSA = {
  annualLimit: 8000,
  lifetimeLimit: 40000,
};

// ============================================================
// CAPITAL GAINS (2025)
// ============================================================

// For 2025, the inclusion rate increase to 2/3 was DEFERRED to Jan 1, 2026
// So for 2025 tax year: flat 50% inclusion rate for all individuals
export const CAPITAL_GAINS = {
  inclusionRate: 0.50,
  lcge: 1250000,             // Lifetime Capital Gains Exemption (QSBC/farm/fishing)
  principalResidenceExempt: true,
};

// ============================================================
// DIVIDENDS
// ============================================================

export const DIVIDENDS = {
  eligible: {
    grossUpRate: 0.38,        // Gross-up by 38%
    federalCreditRate: 0.150187,  // 15.0198% of taxable amount
    ontarioCreditRate: 0.10,   // 10% of taxable amount
  },
  nonEligible: {
    grossUpRate: 0.15,        // Gross-up by 15%
    federalCreditRate: 0.090301,  // 9.0301% of taxable amount
    ontarioCreditRate: 0.028571,  // 2.8571% of taxable amount
  },
};

// ============================================================
// NON-REFUNDABLE CREDIT AMOUNTS (FEDERAL)
// ============================================================

export const FEDERAL_CREDITS = {
  canadaEmploymentAmount: 1368,
  pensionIncomeMax: 2000,
  
  ageAmount: {
    max: 9028,
    clawbackStart: 44325,
    clawbackRate: 0.15,       // Reduced by 15% of net income over clawbackStart
  },

  disabilityAmount: {
    base: 9872,
    supplementUnder18: 5758,
    supplementClawbackRate: 1.0, // Reduced $ for $ by child care + attendant care over threshold
    supplementClawbackThreshold: 3464,
  },

  interestOnStudentLoans: true, // Deductible at federal credit rate

  caregiver: {
    canadaCaregiver: 8375,    // For infirm dependant 18+
    clawbackStart: 0,         // Reduced by dependant's net income over BPA
  },

  homeAccessibility: {
    max: 20000,               // Qualifying expenses
  },

  homeBuyers: {
    amount: 10000,            // First-time home buyer (credit = amount × 15%)
  },

  digitalNewsSubscription: {
    max: 500,
  },

  volunteerFirefighter: 3000, // Or search and rescue volunteer
};

// ============================================================
// DONATION CREDITS (FEDERAL)
// ============================================================

export const DONATIONS = {
  firstTierLimit: 200,
  firstTierRate: 0.15,
  secondTierRate: 0.29,
  highIncomeRate: 0.33,       // On amounts over $200 if income > top bracket
  topBracketThreshold: 253414,
  maxClaimRate: 0.75,         // Max 75% of net income (100% in year of death)
  carryForwardYears: 5,
  firstTimeSuperCredit: false, // Expired after 2017
};

// Ontario donation credit
export const ONTARIO_DONATIONS = {
  firstTierLimit: 200,
  firstTierRate: 0.0505,
  secondTierRate: 0.1116,
};

// ============================================================
// MEDICAL EXPENSES
// ============================================================

export const MEDICAL_EXPENSES = {
  threshold: 2759,            // Or 3% of net income, whichever is LESS
  thresholdRate: 0.03,
  dependantMax: 7999,         // Max per dependant 18+ (other than spouse)
  dependantThreshold: 2759,
};

// ============================================================
// TUITION (FEDERAL)
// ============================================================

export const TUITION = {
  creditRate: 0.15,           // Federal credit rate
  maxTransfer: 5000,          // Max transfer to parent/grandparent/spouse
  carryForward: true,         // Unused amounts carry forward indefinitely
  // Full-time students: $500 scholarship exemption
  scholarshipExemptionFullTime: Infinity,  // Fully exempt for full-time
  scholarshipExemptionPartTime: 500,
};

// ============================================================
// ONTARIO TRILLIUM BENEFIT (OTB) — 2025 tax year → 2026 payments
// ============================================================

// Ontario Sales Tax Credit (OSTC)
export const OSTC = {
  adultAmount: 345,
  childAmount: 345,
  singleReductionThreshold: 29047,
  familyReductionThreshold: 36309,
  reductionRate: 0.04,
};

// Ontario Energy and Property Tax Credit (OEPTC)
export const OEPTC = {
  // Non-senior (under 65)
  energyComponent: 280,
  propertyTaxComponent: {
    maxRent: 0.20,            // 20% of rent paid counts as "property tax"
    maxPropertyTax: Infinity, // Actual property tax paid
    maxCredit: 1248,          // Maximum property tax credit (non-senior)
  },
  // Senior (65+)
  seniorEnergyComponent: 280,
  seniorPropertyTaxMax: 1421,
  // Reduction
  singleReductionThreshold: 29047,
  familyReductionThreshold: 36309,
  reductionRate: 0.02,        // 2% of adjusted family net income over threshold
  // Student residence
  studentResidenceEligible: true, // Students in designated residence can claim energy component
};

// ============================================================
// CORPORATE TAX (CCPC)
// ============================================================

export const CORPORATE = {
  federalGeneralRate: 0.15,     // After 10% provincial abatement
  federalSmallBusinessRate: 0.09,
  smallBusinessLimit: 500000,
  ontarioGeneralRate: 0.115,
  ontarioSmallBusinessRate: 0.032,
  ontarioSmallBusinessLimit: 500000,
  // Combined rates
  combinedGeneralRate: 0.265,   // 15% + 11.5%
  combinedSmallBusinessRate: 0.122, // 9% + 3.2%
};

// ============================================================
// HST (ONTARIO)
// ============================================================

export const HST = {
  rate: 0.13,
  federalComponent: 0.05,     // GST
  provincialComponent: 0.08,  // PST
  registrationThreshold: 30000, // Must register if >$30K in 12 months
  quickMethodRates: {
    retail: 0.044,             // 4.4% for resellers of goods
    service: 0.088,            // 8.8% for service providers
  },
};

// ============================================================
// FILING DEADLINES (2025 tax year)
// ============================================================

export const DEADLINES = {
  filingDeadline: '2026-04-30',
  selfEmployedFilingDeadline: '2026-06-15',
  paymentDeadline: '2026-04-30',         // Payment always Apr 30
  rrspContributionDeadline: '2026-03-02', // First 60 days of 2026
};

// ============================================================
// CRA LINE NUMBER MAPPINGS
// ============================================================

export const CRA_LINES = {
  // Total income
  employmentIncome: 10100,
  otherEmploymentIncome: 10400,
  oldAgeSecurity: 11300,
  cppBenefits: 11400,
  otherPensions: 11500,
  electedPensionSplit: 11600,
  eiIncome: 11900,
  eligibleDividends: 12000,
  otherDividends: 12010,
  interestIncome: 12100,
  rentalIncome: 12600,
  taxableCapitalGains: 12700,
  rrspIncome: 12900,
  otherIncome: 13000,
  selfEmploymentBusiness: 13500,
  selfEmploymentProfessional: 13700,
  selfEmploymentCommission: 13900,
  selfEmploymentFarming: 14100,
  selfEmploymentFishing: 14300,
  totalIncome: 15000,

  // Net income
  pensionAdjustment: 20600,
  rppContributions: 20700,
  rrspDeduction: 20800,
  fhsaDeduction: 20805,
  unionDues: 21200,
  childcareExpenses: 21400,
  movingExpenses: 21900,
  supportPaymentsMade: 22000,
  carryingCharges: 22100,
  cppSelfEmployed: 22200,
  employmentExpenses: 22900,
  otherDeductions: 23200,
  netIncome: 23600,

  // Taxable income
  canadianForcesDeduction: 24400,
  socialBenefitsRepayment: 23500,
  capitalGainsDeduction: 25400,
  northernResidents: 25500,
  lossesOtherYears: 25200,
  taxableIncome: 26000,

  // Federal tax (Schedule 1)
  basicPersonalAmount: 30000,
  ageAmount: 30100,
  spouseAmount: 30300,
  eligibleDependantAmount: 30400,
  cppContributions: 30800,
  cpp2Contributions: 30900,
  eiPremiums: 31200,
  canadaEmployment: 31260,
  pensionIncomeAmount: 31400,
  disabilityAmount: 31600,
  studentLoanInterest: 31900,
  tuitionAmount: 32300,
  tuitionTransfer: 32400,
  medicalExpenses: 33099,
  medicalExpensesSupplement: 33199,
  donationsCredits: 34900,
  
  // Tax deducted
  totalTaxDeducted: 43700,
  
  // Refund or balance
  totalPayable: 43500,
  refund: 48400,
  balanceOwing: 48500,
} as const;
