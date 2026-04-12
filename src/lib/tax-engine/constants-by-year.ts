/**
 * TaxAgent.ai — Historical Canadian Tax Constants by Year (Ontario)
 * Covers 2022, 2023, 2024 tax years; current year (2025) remains in constants.ts.
 *
 * Sources:
 *   CRA T4032 Payroll Deductions Tables (each year)
 *   CRA Schedule 1 / ON428 forms (each year)
 *   Finance Canada Budget 2024 — AMT reform (effective 2024) and capital gains (June 25, 2024)
 *   Finance Canada Bill C-4 (2025) — blended federal lowest rate for 2025 (NOT these years)
 *
 * Notes:
 *   • CPP2 (second additional plan) did not exist before 2024 — null for 2022/2023.
 *   • The two-tier capital gains inclusion rate (50% / 66.67%) was introduced for
 *     dispositions on or after June 25, 2024. For 2022/2023, a flat 50% applies.
 *   • AMT was reformed for 2024 (rate 20.5%, exemption $173,205); prior years used
 *     the old system (rate 15%, exemption $40,000).
 */

import type { TaxBracket } from './constants';

// ============================================================
// TAXCONSTANTS INTERFACE
// ============================================================

export interface TaxConstants {
  year: number;

  // Federal brackets — ITA s.117
  federalBrackets: TaxBracket[];
  /**
   * Rate used to convert non-refundable credit amounts to credit value.
   * 15% for all years up to 2024; still 15% in 2025 (preserved via Top-Up Credit).
   */
  federalCreditRate: number;
  /** Lowest bracket tax rate (equals first-bracket rate except 2025 blended 14.5%) */
  federalLowestRate: number;

  // Federal Basic Personal Amount — ITA s.118(1)(c)
  federalBPA: {
    /** Base BPA (everyone receives this regardless of income) */
    base: number;
    /** Additional phased-in BPA clawed back through the top bracket range */
    additional: number;
    /** Maximum BPA = base + additional (applies at income ≤ clawbackStart) */
    max: number;
    /** Additional BPA begins clawback at the start of the 29% bracket */
    clawbackStart: number;
    /** Additional BPA fully eliminated at the start of the 33% bracket */
    clawbackEnd: number;
  };

  // Ontario brackets — Ontario Taxation Act s.8
  ontarioBrackets: TaxBracket[];
  /** Rate applied to Ontario credit amounts; 5.05% all years */
  ontarioCreditRate: number;
  /** Ontario Basic Personal Amount */
  ontarioBPA: number;

  // Ontario Surtax — Ontario Taxation Act s.48
  ontarioSurtax: {
    threshold1: number;   // 20% surtax on Ontario tax above this
    rate1: number;
    threshold2: number;   // Additional 36% surtax on Ontario tax above this
    rate2: number;
  };

  // Ontario Low-Income Tax Reduction — Ontario Taxation Act s.8(3)
  ontarioLowIncomeReduction: {
    baseReduction: number;     // Maximum Ontario tax reduction
    clawbackStart: number;     // Reduction clawed back at 5.05% above this income
    clawbackRate: number;
  };

  // CPP — Canada Pension Plan, ITA s.118.7
  cpp: {
    maxPensionableEarnings: number;
    basicExemption: number;
    employeeRate: number;
    selfEmployedRate: number;
    maxEmployeeContribution: number;
    maxSelfEmployedContribution: number;
  };

  /**
   * CPP2 — Second Additional Canada Pension Plan (ITA s.8.7 of CPP Act).
   * Null for 2022 and 2023 (did not exist); populated from 2024 onward.
   */
  cpp2: {
    secondCeiling: number;
    rate: number;
    selfEmployedRate: number;
    maxEmployeeContribution: number;
    maxSelfEmployedContribution: number;
  } | null;

  // Employment Insurance — ITA s.118.7
  ei: {
    maxInsurableEarnings: number;
    premiumRate: number;
    maxPremium: number;
  };

  /** RRSP annual dollar limit — ITA s.146(5) */
  rrspMaxContribution: number;

  // Capital Gains — ITA s.38
  capitalGains: {
    /** First-tier (or flat) inclusion rate */
    inclusionRateLow: number;
    /**
     * High-tier inclusion rate above the threshold.
     * Null for years before the two-tier system (2022, 2023).
     */
    inclusionRateHigh: number | null;
    /**
     * Net gain threshold between low and high tier.
     * Null for years before the two-tier system (2022, 2023).
     */
    threshold: number | null;
  };

  // Alternative Minimum Tax — ITA s.127.5
  amt: {
    /** Flat AMT rate (15% pre-2024; 20.5% from 2024 per Budget 2024) */
    rate: number;
    /** Basic exemption (was $40,000 pre-2024; $173,205 from 2024) */
    exemption: number;
  };

  /** OAS clawback threshold — ITA s.180.2 */
  oasClawbackThreshold: number;
}

// ============================================================
// 2024 CONSTANTS
// Sources: CRA T4032 (2024), Budget 2024, Finance Canada
// ============================================================

const CONSTANTS_2024: TaxConstants = {
  year: 2024,

  // Federal brackets — indexed ~4.7% from 2023
  federalBrackets: [
    { min: 0,       max: 55867,    rate: 0.15   },
    { min: 55867,   max: 111733,   rate: 0.205  },
    { min: 111733,  max: 154906,   rate: 0.26   },
    { min: 154906,  max: 220000,   rate: 0.29   },
    { min: 220000,  max: Infinity, rate: 0.33   },
  ],
  federalCreditRate: 0.15,
  federalLowestRate: 0.15,

  // Federal BPA — CRA Schedule 1 2024 line 30000
  federalBPA: {
    base:          14156,   // Base BPA (all incomes)
    additional:    1549,    // Additional phased-in amount (clawed back through top bracket)
    max:           15705,   // Full BPA at income ≤ $173,205
    clawbackStart: 173205,  // Start of 29% bracket (2024)
    clawbackEnd:   246752,  // Start of 33% bracket (2024)
  },

  // Ontario brackets — CRA T4032ON (2024) — same thresholds as 2025
  ontarioBrackets: [
    { min: 0,       max: 51446,    rate: 0.0505 },
    { min: 51446,   max: 102894,   rate: 0.0915 },
    { min: 102894,  max: 150000,   rate: 0.1116 },
    { min: 150000,  max: 220000,   rate: 0.1216 },
    { min: 220000,  max: Infinity, rate: 0.1316 },
  ],
  ontarioCreditRate: 0.0505,
  ontarioBPA: 11865,   // ON428 2024 — same as 2025 (Ontario did not index for 2025)

  ontarioSurtax: {
    threshold1: 5654,
    rate1:      0.20,
    threshold2: 7234,
    rate2:      0.36,
  },

  ontarioLowIncomeReduction: {
    baseReduction:  285,
    clawbackStart:  17291,
    clawbackRate:   0.0505,
  },

  // CPP 2024 — max pensionable $68,500; employee rate 5.95%
  cpp: {
    maxPensionableEarnings:      68500,
    basicExemption:              3500,
    employeeRate:                0.0595,
    selfEmployedRate:            0.1190,
    maxEmployeeContribution:     3867.50,   // (68500 − 3500) × 5.95%
    maxSelfEmployedContribution: 7735.00,
  },

  // CPP2 2024 — first year of second additional plan
  cpp2: {
    secondCeiling:               73200,     // YAMPE 2024
    rate:                        0.04,
    selfEmployedRate:            0.08,
    maxEmployeeContribution:     188.00,    // (73200 − 68500) × 4%
    maxSelfEmployedContribution: 376.00,
  },

  // EI 2024 — max insurable $63,200; rate 1.66%
  ei: {
    maxInsurableEarnings: 63200,
    premiumRate:          0.0166,
    maxPremium:           1049.12,          // 63200 × 1.66%
  },

  rrspMaxContribution: 31560,

  // Capital gains 2024 — two-tier system from June 25, 2024 (Budget 2024)
  capitalGains: {
    inclusionRateLow:  0.50,
    inclusionRateHigh: 0.6667,
    threshold:         250000,
  },

  // AMT 2024 — reformed per Budget 2024 (first year at new rates)
  amt: {
    rate:      0.205,
    exemption: 173205,
  },

  oasClawbackThreshold: 90997,
};

// ============================================================
// 2023 CONSTANTS
// Sources: CRA T4032 (2023), CRA Schedule 1 (2023)
// ============================================================

const CONSTANTS_2023: TaxConstants = {
  year: 2023,

  // Federal brackets — indexed ~6.3% from 2022 (high-inflation year)
  federalBrackets: [
    { min: 0,       max: 53359,    rate: 0.15   },
    { min: 53359,   max: 106717,   rate: 0.205  },
    { min: 106717,  max: 165430,   rate: 0.26   },
    { min: 165430,  max: 235675,   rate: 0.29   },
    { min: 235675,  max: Infinity, rate: 0.33   },
  ],
  federalCreditRate: 0.15,
  federalLowestRate: 0.15,

  // Federal BPA — ITA s.118(1)(c); $15,000 target reached in 2023
  federalBPA: {
    base:          13521,   // Base BPA
    additional:    1479,    // Enhanced top-up (clawed back through top bracket)
    max:           15000,   // Full BPA (confirmed CRA line 30000 for 2023)
    clawbackStart: 165430,  // Start of 29% bracket (2023)
    clawbackEnd:   235675,  // Start of 33% bracket (2023)
  },

  // Ontario brackets — CRA T4032ON (2023)
  ontarioBrackets: [
    { min: 0,       max: 49231,    rate: 0.0505 },
    { min: 49231,   max: 98463,    rate: 0.0915 },
    { min: 98463,   max: 150000,   rate: 0.1116 },
    { min: 150000,  max: 220000,   rate: 0.1216 },
    { min: 220000,  max: Infinity, rate: 0.1316 },
  ],
  ontarioCreditRate: 0.0505,
  ontarioBPA: 11141,   // ON428 2023

  ontarioSurtax: {
    threshold1: 5315,
    rate1:      0.20,
    threshold2: 6802,
    rate2:      0.36,
  },

  ontarioLowIncomeReduction: {
    baseReduction:  268,
    clawbackStart:  16773,
    clawbackRate:   0.0505,
  },

  // CPP 2023 — max pensionable $66,600; employee rate 5.95%
  cpp: {
    maxPensionableEarnings:      66600,
    basicExemption:              3500,
    employeeRate:                0.0595,
    selfEmployedRate:            0.1190,
    maxEmployeeContribution:     3754.45,   // (66600 − 3500) × 5.95%
    maxSelfEmployedContribution: 7508.90,
  },

  // CPP2 did not exist in 2023
  cpp2: null,

  // EI 2023 — max insurable $61,500; rate 1.63%
  ei: {
    maxInsurableEarnings: 61500,
    premiumRate:          0.0163,
    maxPremium:           1002.45,          // 61500 × 1.63%
  },

  rrspMaxContribution: 30780,

  // Capital gains 2023 — flat 50% inclusion rate (pre-Budget 2024)
  capitalGains: {
    inclusionRateLow:  0.50,
    inclusionRateHigh: null,
    threshold:         null,
  },

  // AMT 2023 — old system (15% rate, $40,000 exemption)
  amt: {
    rate:      0.15,
    exemption: 40000,
  },

  oasClawbackThreshold: 86912,
};

// ============================================================
// 2022 CONSTANTS
// Sources: CRA T4032 (2022), CRA Schedule 1 (2022)
// ============================================================

const CONSTANTS_2022: TaxConstants = {
  year: 2022,

  // Federal brackets — CRA T4032 (2022)
  federalBrackets: [
    { min: 0,       max: 50197,    rate: 0.15   },
    { min: 50197,   max: 100392,   rate: 0.205  },
    { min: 100392,  max: 155625,   rate: 0.26   },
    { min: 155625,  max: 221708,   rate: 0.29   },
    { min: 221708,  max: Infinity, rate: 0.33   },
  ],
  federalCreditRate: 0.15,
  federalLowestRate: 0.15,

  // Federal BPA — phased-in to $14,398 for 2022
  federalBPA: {
    base:          12719,   // Base BPA
    additional:    1679,    // Enhanced top-up
    max:           14398,   // Full BPA at income ≤ $155,625
    clawbackStart: 155625,  // Start of 29% bracket (2022)
    clawbackEnd:   221708,  // Start of 33% bracket (2022)
  },

  // Ontario brackets — CRA T4032ON (2022)
  ontarioBrackets: [
    { min: 0,       max: 46226,    rate: 0.0505 },
    { min: 46226,   max: 92454,    rate: 0.0915 },
    { min: 92454,   max: 150000,   rate: 0.1116 },
    { min: 150000,  max: 220000,   rate: 0.1216 },
    { min: 220000,  max: Infinity, rate: 0.1316 },
  ],
  ontarioCreditRate: 0.0505,
  ontarioBPA: 10783,   // ON428 2022

  ontarioSurtax: {
    threshold1: 4991,
    rate1:      0.20,
    threshold2: 6387,
    rate2:      0.36,
  },

  ontarioLowIncomeReduction: {
    baseReduction:  251,
    clawbackStart:  15714,
    clawbackRate:   0.0505,
  },

  // CPP 2022 — max pensionable $64,900; employee rate 5.70%
  cpp: {
    maxPensionableEarnings:      64900,
    basicExemption:              3500,
    employeeRate:                0.0570,
    selfEmployedRate:            0.1140,
    maxEmployeeContribution:     3499.80,   // (64900 − 3500) × 5.70%
    maxSelfEmployedContribution: 6999.60,
  },

  // CPP2 did not exist in 2022
  cpp2: null,

  // EI 2022 — max insurable $60,300; rate 1.58%
  ei: {
    maxInsurableEarnings: 60300,
    premiumRate:          0.0158,
    maxPremium:           952.74,           // 60300 × 1.58%
  },

  rrspMaxContribution: 29210,

  // Capital gains 2022 — flat 50% inclusion rate
  capitalGains: {
    inclusionRateLow:  0.50,
    inclusionRateHigh: null,
    threshold:         null,
  },

  // AMT 2022 — old system
  amt: {
    rate:      0.15,
    exemption: 40000,
  },

  oasClawbackThreshold: 81761,
};

// ============================================================
// LOOKUP MAP & ACCESSOR
// ============================================================

const CONSTANTS_BY_YEAR: Record<number, TaxConstants> = {
  2022: CONSTANTS_2022,
  2023: CONSTANTS_2023,
  2024: CONSTANTS_2024,
};

/**
 * Returns the TaxConstants for a given tax year.
 *
 * For the current year (2025), use the main constants.ts exports directly.
 * For 2022–2024 historical lookups (pension calculations, prior-year assessments,
 * RRSP contribution room verification, etc.), use this function.
 *
 * @throws {Error} if the requested year is not in the historical map
 */
export function getConstantsForYear(year: number): TaxConstants {
  const constants = CONSTANTS_BY_YEAR[year];
  if (constants == null) {
    throw new Error(
      `No historical tax constants for year ${year}. ` +
      `Available years: ${Object.keys(CONSTANTS_BY_YEAR).join(', ')}. ` +
      `For 2025 (current year), use constants.ts directly.`
    );
  }
  return constants;
}

export { CONSTANTS_BY_YEAR };
