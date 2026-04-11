/**
 * Foreign Tax Credit — T2209 (Federal) and T2036 (Ontario)
 * ITA s.126 — credit for foreign income taxes paid to prevent double taxation.
 *
 * Federal credit = lesser of:
 *   (a) Foreign income / Net income × Federal tax payable (before foreign tax credit)
 *   (b) Foreign taxes paid on that income
 *
 * Ontario credit mirrors the federal calculation at Ontario tax rates:
 *   Ontario credit = lesser of:
 *   (a) Foreign income / Net income × Basic Ontario tax (before Ontario FTC)
 *   (b) Unused foreign taxes after federal credit
 *
 * For simplicity (most common case — non-business income):
 *   - Foreign income = US dividends, foreign employment, foreign interest
 *   - The credit cannot exceed the Canadian tax on that income
 *   - Unused foreign taxes cannot be carried forward in this model (complex FAPI rules)
 *
 * Note: If foreign assets exceed CAD $100,000, T1135 (Foreign Income Verification)
 * must be filed. This is flagged as a warning but not calculated here.
 */

import { roundCRA } from './brackets';

export interface ForeignTaxCreditInput {
  foreignIncome: number;          // Total foreign income before any deductions
  foreignTaxesPaid: number;       // Taxes withheld or paid to foreign jurisdiction
  netIncome: number;              // CRA line 23600 (used for ratio calculation)
  federalTaxBeforeCredit: number; // Net federal tax before applying this credit
  ontarioTaxBeforeCredit: number; // Basic Ontario tax before applying this credit
}

export interface ForeignTaxCreditResult {
  federalForeignTaxCredit: number;   // T2209 — reduces federal tax payable
  ontarioForeignTaxCredit: number;   // T2036 — reduces Ontario tax payable
  unusedForeignTax: number;          // Foreign taxes not credited (may generate T2209 carryback/forward)
  t1135Required: boolean;            // True if foreign assets > $100,000
}

/**
 * Calculates federal and Ontario foreign tax credits.
 *
 * Federal FTC (T2209, line 40500):
 *   Capped at (foreignIncome / netIncome) × federalTaxBeforeCredit
 *   Cannot exceed foreign taxes paid.
 *
 * Ontario FTC (T2036, ON428 line):
 *   Applied to Ontario tax after the federal credit has been applied.
 *   Uses the same income ratio but against basic Ontario tax.
 */
export function calculateForeignTaxCredit(input: ForeignTaxCreditInput): ForeignTaxCreditResult {
  const {
    foreignIncome,
    foreignTaxesPaid,
    netIncome,
    federalTaxBeforeCredit,
    ontarioTaxBeforeCredit,
  } = input;

  if (foreignIncome <= 0 || foreignTaxesPaid <= 0 || netIncome <= 0) {
    return {
      federalForeignTaxCredit: 0,
      ontarioForeignTaxCredit: 0,
      unusedForeignTax: 0,
      t1135Required: false,
    };
  }

  // Income ratio: foreign income as a fraction of total net income
  const incomeRatio = Math.min(1, foreignIncome / netIncome);

  // Federal FTC: lesser of (ratio × federal tax) or foreign taxes paid
  const federalTaxOnForeignIncome = roundCRA(federalTaxBeforeCredit * incomeRatio);
  const federalForeignTaxCredit   = roundCRA(Math.min(federalTaxOnForeignIncome, foreignTaxesPaid));

  // Ontario FTC: applies to remaining unused foreign taxes after federal credit
  const remainingForeignTax = roundCRA(foreignTaxesPaid - federalForeignTaxCredit);
  const ontarioTaxOnForeignIncome = roundCRA(ontarioTaxBeforeCredit * incomeRatio);
  const ontarioForeignTaxCredit   = roundCRA(Math.min(ontarioTaxOnForeignIncome, remainingForeignTax));

  const unusedForeignTax = roundCRA(remainingForeignTax - ontarioForeignTaxCredit);

  // T1135 required if foreign assets exceed $100,000 CAD (tracked via foreignIncome as proxy)
  // Note: this is a rough flag — actual T1135 threshold is based on cost of foreign assets,
  // not just income. The validator handles this more precisely.
  const t1135Required = foreignIncome > 100000;

  return {
    federalForeignTaxCredit,
    ontarioForeignTaxCredit,
    unusedForeignTax,
    t1135Required,
  };
}
