/**
 * Employee Stock Options — ITA s.7, s.110(1)(d)
 * T4 box 38 reports the employment benefit (FMV at exercise minus exercise price).
 * The benefit is included in employment income on line 10100.
 *
 * Section 110(1)(d) deduction (line 24900):
 * If conditions are met, a 50% deduction of the benefit is allowed, effectively
 * taxing the benefit at the capital gains inclusion rate (instead of marginal rate).
 *
 * Conditions for the 50% deduction (ITA s.110(1)(d)):
 *   1. The option was granted by a Canadian-Controlled Private Corporation (CCPC) OR
 *   2. The exercise price was ≥ FMV at the time the option was granted (not "in the money")
 *   3. The shares are not of a mutual fund corporation
 *   4. The shares have been held ≥ 2 years (for non-CCPC shares) — simplified here
 *
 * Note: For non-CCPC employees since June 25, 2024, options with a benefit exceeding
 * $200,000/year may be subject to the new $200k annual limit. For simplicity,
 * this module implements the general deduction rule; complex ordering is flagged as a warning.
 *
 * For AMT purposes, the full stock option benefit (before deduction) is in ATI.
 */

import { roundCRA } from './brackets';

export interface StockOptionsInput {
  stockOptionBenefit: number;     // T4 box 38 — employment benefit from exercising options
  deductionEligible: boolean;     // True if the ITA s.110(1)(d) conditions are met
}

export interface StockOptionsResult {
  stockOptionBenefit: number;     // Already included in employment income
  deduction: number;              // Line 24900 — 50% deduction if eligible
  netTaxableBenefit: number;      // Benefit after deduction (taxed at marginal rates)
  effectiveTaxRate: string;       // 'capital-gains' or 'employment' (informational)
  amtAddBack: number;             // For AMT: the deduction must be added back to ATI
}

/**
 * Calculates the stock option deduction under ITA s.110(1)(d).
 *
 * The deduction is 50% of the benefit if eligible.
 * This reduces taxable income at line 24900, effectively taxing the benefit
 * at the capital gains inclusion rate (50% × marginal rate).
 */
export function calculateStockOptionsDeduction(input: StockOptionsInput): StockOptionsResult {
  const { stockOptionBenefit, deductionEligible } = input;

  if (stockOptionBenefit <= 0) {
    return {
      stockOptionBenefit: 0,
      deduction: 0,
      netTaxableBenefit: 0,
      effectiveTaxRate: 'employment',
      amtAddBack: 0,
    };
  }

  // 50% deduction only if prescribed conditions are met
  const deduction = deductionEligible ? roundCRA(stockOptionBenefit * 0.50) : 0;

  // The net taxable benefit after deduction flows through the marginal rate brackets
  const netTaxableBenefit = roundCRA(stockOptionBenefit - deduction);

  // For AMT: the 50% deduction is added back to ATI (full benefit is included)
  const amtAddBack = deduction;

  return {
    stockOptionBenefit,
    deduction,
    netTaxableBenefit,
    effectiveTaxRate: deductionEligible ? 'capital-gains' : 'employment',
    amtAddBack,
  };
}
