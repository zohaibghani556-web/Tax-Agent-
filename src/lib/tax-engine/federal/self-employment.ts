/**
 * T2125 — Statement of Business or Professional Activities
 * Calculates net business income and CPP contributions for self-employed individuals.
 *
 * ITA s.9 — net income from a business or property
 * ITA s.67.1 — 50% limit on meals and entertainment
 * ITA s.34.2 — home office deduction (business-use-of-home)
 * CPP Act s.8-12 — contributions on self-employment earnings
 */

import { CPP, CPP2 } from '../constants';
import { roundCRA } from './brackets';
import type { BusinessIncome, HomeOfficeExpense, VehicleExpense } from '../types';

export interface SelfEmploymentResult {
  grossIncome: number;
  totalExpenses: number;
  netBusinessIncome: number;   // Positive → line 13500
  allowableLoss: number;       // Positive means there is a loss (deductible against other income)

  // CPP on self-employment earnings — CPP Act s.8(1)(d)
  cpp1EmployeeHalf: number;    // Employee half → NRC amount at line 31000
  cpp1EmployerHalf: number;    // Employer half → deduction at line 22200
  cpp1Total: number;           // Both halves combined
  cpp2EmployeeHalf: number;    // CPP2 employee half → NRC amount at line 30900
  cpp2EmployerHalf: number;    // CPP2 employer half → deduction at line 22215
  cpp2Total: number;
}

// ── Home Office ─────────────────────────────────────────────────────────────

/**
 * Calculates allowable home-office deduction.
 *
 * Simplified method (T2200 not required): $2/day for days worked at home, max $500.
 * Detailed method: business-use percentage × actual home expenses.
 * Cannot create or increase a business loss — but that is enforced at the business level.
 */
export function calculateHomeOfficeExpense(homeOffice: HomeOfficeExpense): number {
  if (homeOffice.method === 'simplified') {
    // $2/day, max 250 days = $500 (CRA flat-rate method)
    const days = Math.min(homeOffice.daysWorkedAtHome ?? 0, 250);
    return roundCRA(days * 2);
  }

  // Detailed method: pro-rate by area fraction
  const totalSqFt = homeOffice.totalSquareFeet ?? 0;
  const officeSqFt = homeOffice.officeSquareFeet ?? 0;
  if (totalSqFt <= 0 || officeSqFt <= 0) return 0;

  const businessPct = officeSqFt / totalSqFt;
  const totalHomeExpenses = roundCRA(
    (homeOffice.rent ?? 0) +
    (homeOffice.utilities ?? 0) +
    (homeOffice.insurance ?? 0) +
    (homeOffice.propertyTax ?? 0) +
    (homeOffice.mortgageInterest ?? 0) +
    (homeOffice.maintenance ?? 0)
  );
  return roundCRA(totalHomeExpenses * businessPct);
}

// ── Vehicle ─────────────────────────────────────────────────────────────────

/**
 * Calculates allowable vehicle expense based on business-use percentage.
 * If deductibleAmount is pre-calculated (non-zero), it is used directly.
 * Otherwise, actual costs × (businessKm / totalKm) is applied.
 */
export function calculateVehicleExpense(vehicle: VehicleExpense): number {
  // Pre-calculated amount takes precedence (e.g. set by UI from CRA rate method)
  if (vehicle.deductibleAmount > 0) return roundCRA(vehicle.deductibleAmount);

  const totalKm = vehicle.totalKm;
  if (totalKm <= 0) return 0;

  const businessPct = vehicle.businessKm / totalKm;
  const actualCosts = roundCRA(
    vehicle.fuel +
    vehicle.insurance +
    vehicle.maintenance +
    vehicle.license +
    vehicle.leasePayments +
    vehicle.capitalCostAllowance
  );
  return roundCRA(actualCosts * businessPct);
}

// ── Net Business Income ──────────────────────────────────────────────────────

/**
 * Calculates net income from a single business activity.
 * Meals are deductible at 50% only — ITA s.67.1.
 * All other listed expenses are fully deductible if incurred to earn income.
 */
export function calculateNetBusinessIncome(business: BusinessIncome): number {
  const { grossIncome, expenses, homeOffice, vehicle } = business;

  const allowableExpenses = roundCRA(
    expenses.advertising +
    roundCRA(expenses.meals * 0.50) +   // ITA s.67.1 — 50% meals limit
    expenses.insurance +
    expenses.interest +
    expenses.officeExpenses +
    expenses.supplies +
    expenses.legalAccounting +
    expenses.travel +
    expenses.telephone +
    expenses.utilities +
    expenses.rent +
    expenses.propertyTaxes +
    expenses.salariesWages +
    expenses.capitalCostAllowance +
    expenses.otherExpenses
  );

  const homeOfficeAmt = homeOffice ? calculateHomeOfficeExpense(homeOffice) : 0;
  const vehicleAmt    = vehicle    ? calculateVehicleExpense(vehicle)       : 0;

  const totalExpenses = roundCRA(allowableExpenses + homeOfficeAmt + vehicleAmt);
  return roundCRA(grossIncome - totalExpenses);
}

// ── CPP on Self-Employment Earnings ─────────────────────────────────────────

/**
 * Calculates CPP1 and CPP2 contributions for self-employed individuals.
 *
 * A self-employed person pays both the employee AND employer halves of CPP.
 *   CPP1: 5.95% (employee) + 5.95% (employer) = 11.90% total on ($71,300 − $3,500)
 *   CPP2: 4.00% (employee) + 4.00% (employer) = 8.00% total on ($81,200 − $71,300)
 *
 * The employer half is deductible at line 22200.
 * The employee half is a non-refundable credit amount at line 31000 (CPP1) / 30900 (CPP2).
 *
 * Reference: CPP Act s.8(1)(d); ITA s.118.7; CRA T4002 Guide
 */
export function calculateSelfEmployedCPP(netBusinessIncome: number): {
  cpp1EmployeeHalf: number;
  cpp1EmployerHalf: number;
  cpp1Total: number;
  cpp2EmployeeHalf: number;
  cpp2EmployerHalf: number;
  cpp2Total: number;
} {
  if (netBusinessIncome <= CPP.basicExemption) {
    return {
      cpp1EmployeeHalf: 0, cpp1EmployerHalf: 0, cpp1Total: 0,
      cpp2EmployeeHalf: 0, cpp2EmployerHalf: 0, cpp2Total: 0,
    };
  }

  // CPP1 earnings: income − $3,500 basic exemption, capped at $71,300 − $3,500 = $67,800
  const cpp1Base = Math.min(
    roundCRA(netBusinessIncome - CPP.basicExemption),
    roundCRA(CPP.maxPensionableEarnings - CPP.basicExemption)
  );
  const cpp1EmployeeHalf = roundCRA(cpp1Base * CPP.employeeRate);
  const cpp1EmployerHalf = roundCRA(cpp1Base * CPP.employeeRate);
  const cpp1Total        = roundCRA(cpp1EmployeeHalf + cpp1EmployerHalf);

  // CPP2 earnings: income above $71,300, capped at $81,200 − $71,300 = $9,900
  const cpp2Base = Math.max(
    0,
    Math.min(
      roundCRA(netBusinessIncome - CPP.maxPensionableEarnings),
      roundCRA(CPP2.secondCeiling - CPP.maxPensionableEarnings)
    )
  );
  const cpp2EmployeeHalf = roundCRA(cpp2Base * CPP2.rate);
  const cpp2EmployerHalf = roundCRA(cpp2Base * CPP2.rate);
  const cpp2Total        = roundCRA(cpp2EmployeeHalf + cpp2EmployerHalf);

  return {
    cpp1EmployeeHalf,
    cpp1EmployerHalf,
    cpp1Total,
    cpp2EmployeeHalf,
    cpp2EmployerHalf,
    cpp2Total,
  };
}

// ── Main Aggregator ──────────────────────────────────────────────────────────

/**
 * Aggregates all business activities into a single SelfEmploymentResult.
 * Net losses from individual businesses are allowed against other income (ITA s.3(d)).
 * CPP is calculated on aggregate net business income (only if positive).
 */
export function calculateSelfEmployment(businesses: BusinessIncome[]): SelfEmploymentResult {
  if (businesses.length === 0) {
    return {
      grossIncome: 0, totalExpenses: 0,
      netBusinessIncome: 0, allowableLoss: 0,
      cpp1EmployeeHalf: 0, cpp1EmployerHalf: 0, cpp1Total: 0,
      cpp2EmployeeHalf: 0, cpp2EmployerHalf: 0, cpp2Total: 0,
    };
  }

  let grossIncome  = 0;
  let totalExpenses = 0;
  let totalNet     = 0;

  for (const biz of businesses) {
    const net = calculateNetBusinessIncome(biz);
    grossIncome   = roundCRA(grossIncome + biz.grossIncome);
    totalExpenses = roundCRA(totalExpenses + roundCRA(biz.grossIncome - net));
    totalNet      = roundCRA(totalNet + net);
  }

  const netBusinessIncome = Math.max(0, totalNet);
  const allowableLoss     = Math.max(0, -totalNet);

  const cpp = calculateSelfEmployedCPP(netBusinessIncome);

  return {
    grossIncome,
    totalExpenses,
    netBusinessIncome,
    allowableLoss,
    ...cpp,
  };
}
