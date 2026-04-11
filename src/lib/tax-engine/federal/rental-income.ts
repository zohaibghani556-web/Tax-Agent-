/**
 * T776 — Statement of Real Estate Rentals
 * Calculates net rental income (or loss) from one or more rental properties.
 *
 * ITA s.9 — income from property
 * ITA s.18(1)(a) — expenses must be incurred to earn income
 * ITA s.20(1)(a) — capital cost allowance (CCA)
 * ITA s.13(1) — recapture on sale (CCA creates recapture risk — flagged as optional)
 * Rental loss is fully deductible against other income (unlike allowable business investment loss).
 * CCA cannot be claimed to create or increase a rental loss — ITA s.1100(11) ITReg.
 *
 * Line 12600 — Net rental income (or loss).
 */

import { roundCRA } from './brackets';
import type { RentalIncome } from '../types';

export interface RentalIncomeResult {
  grossRent: number;
  totalExpenses: number;
  netRentalIncome: number;   // Positive → line 12600 income
  rentalLoss: number;        // Positive means a loss; deductible against other income
  ccaOptional: boolean;      // CCA is optional — triggers recapture risk on sale
  ccaClaimed: number;        // Amount of CCA included in totalExpenses
}

/**
 * CCA Class 1 (4% declining balance) applies to the building value only (not land).
 * CCA CANNOT be used to create or increase a rental loss per ITA s.1100(11) ITReg.
 * This flag is returned so the UI can warn the user before electing CCA.
 */
const CCA_CLASS_1_RATE = 0.04;   // 4% declining balance, buildings (CRA CCA class 1)

/**
 * Calculates allowable expenses for a single rental property.
 * The ownership percentage is applied to both income and all expenses.
 *
 * Note on CCA: included in expenses.capitalCostAllowance as passed in,
 * but the caller should ensure CCA is not creating or increasing a loss.
 */
export function calculateRentalPropertyIncome(property: RentalIncome): {
  grossRent: number;
  totalExpenses: number;
  netRentalIncome: number;
  ccaClaimed: number;
} {
  const ownershipPct = property.ownershipPercentage / 100;

  // All rental income attributable to ownership share
  const grossRent = roundCRA(property.grossRent * ownershipPct);

  const { expenses } = property;

  // All allowable rental expenses (CRA T776 Part 2)
  const allowableExpenses = roundCRA(
    expenses.advertising +
    expenses.insurance +
    expenses.interest +           // Mortgage interest only (not principal) — ITA s.20(1)(c)
    expenses.maintenance +
    expenses.managementFees +
    expenses.officeExpenses +
    expenses.legalAccounting +
    expenses.propertyTaxes +
    expenses.utilities +
    expenses.other
  );

  // CCA is tracked separately — optional, creates recapture risk
  const ccaClaimed = roundCRA(expenses.capitalCostAllowance * ownershipPct);

  // Apply ownership percentage to shared expenses
  const proRatedExpenses = roundCRA(allowableExpenses * ownershipPct);
  const totalExpenses    = roundCRA(proRatedExpenses + ccaClaimed);

  const netRentalIncome = roundCRA(grossRent - totalExpenses);
  return { grossRent, totalExpenses, netRentalIncome, ccaClaimed };
}

/**
 * Calculates optional CCA (Class 1 — 4% declining balance) on building value.
 * Returns the maximum CCA claimable. Caller must ensure it does not create a loss.
 * ITA s.20(1)(a); CCA Class 1 per Schedule II of Income Tax Regulations.
 *
 * @param buildingUCC Undepreciated Capital Cost of the building (not land)
 */
export function calculateRentalCCA(buildingUCC: number): number {
  return roundCRA(buildingUCC * CCA_CLASS_1_RATE);
}

/**
 * Aggregates all rental properties into a single RentalIncomeResult.
 * Multiple properties are combined; aggregate net is reported on line 12600.
 */
export function calculateRentalIncome(properties: RentalIncome[]): RentalIncomeResult {
  if (properties.length === 0) {
    return {
      grossRent: 0, totalExpenses: 0,
      netRentalIncome: 0, rentalLoss: 0,
      ccaOptional: true, ccaClaimed: 0,
    };
  }

  let totalGrossRent  = 0;
  let totalExpenses   = 0;
  let totalNet        = 0;
  let totalCCAClaimed = 0;

  for (const property of properties) {
    const calc = calculateRentalPropertyIncome(property);
    totalGrossRent  = roundCRA(totalGrossRent  + calc.grossRent);
    totalExpenses   = roundCRA(totalExpenses   + calc.totalExpenses);
    totalNet        = roundCRA(totalNet        + calc.netRentalIncome);
    totalCCAClaimed = roundCRA(totalCCAClaimed + calc.ccaClaimed);
  }

  const netRentalIncome = Math.max(0, totalNet);
  const rentalLoss      = Math.max(0, -totalNet);

  return {
    grossRent:        totalGrossRent,
    totalExpenses,
    netRentalIncome,
    rentalLoss,
    ccaOptional:      true,   // Always flag — CCA triggers recapture on eventual sale
    ccaClaimed:       totalCCAClaimed,
  };
}
