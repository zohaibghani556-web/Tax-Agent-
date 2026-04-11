import { describe, it, expect } from 'vitest';
import {
  calculateNetBusinessIncome,
  calculateHomeOfficeExpense,
  calculateVehicleExpense,
  calculateSelfEmployedCPP,
  calculateSelfEmployment,
} from './self-employment';
import type { BusinessIncome, HomeOfficeExpense, VehicleExpense } from '../types';

// Helper: rounds to nearest cent
function cent(n: number) { return Math.round(n * 100) / 100; }

function makeBusinessIncome(overrides: Partial<BusinessIncome> = {}): BusinessIncome {
  return {
    businessName: 'Test Biz',
    businessType: 'sole-proprietorship',
    industryCode: '541',
    grossIncome: 0,
    expenses: {
      advertising: 0, meals: 0, insurance: 0, interest: 0,
      officeExpenses: 0, supplies: 0, legalAccounting: 0,
      travel: 0, telephone: 0, utilities: 0, rent: 0,
      propertyTaxes: 0, salariesWages: 0, capitalCostAllowance: 0,
      otherExpenses: 0,
    },
    netIncome: 0,
    ...overrides,
  };
}

// ── calculateHomeOfficeExpense ────────────────────────────────────────────────

describe('calculateHomeOfficeExpense', () => {
  it('simplified: $2/day × days worked at home', () => {
    const h: HomeOfficeExpense = { method: 'simplified', daysWorkedAtHome: 100 };
    expect(calculateHomeOfficeExpense(h)).toBe(200);
  });

  it('simplified: caps at 250 days ($500)', () => {
    const h: HomeOfficeExpense = { method: 'simplified', daysWorkedAtHome: 300 };
    expect(calculateHomeOfficeExpense(h)).toBe(500);
  });

  it('simplified: zero days → zero deduction', () => {
    const h: HomeOfficeExpense = { method: 'simplified', daysWorkedAtHome: 0 };
    expect(calculateHomeOfficeExpense(h)).toBe(0);
  });

  it('detailed: 20% business use of $12,000 home costs = $2,400', () => {
    const h: HomeOfficeExpense = {
      method: 'detailed',
      totalSquareFeet: 1000,
      officeSquareFeet: 200,  // 20%
      rent: 12000,
    };
    expect(calculateHomeOfficeExpense(h)).toBe(2400);
  });

  it('detailed: zero total sq ft → zero deduction', () => {
    const h: HomeOfficeExpense = {
      method: 'detailed',
      totalSquareFeet: 0,
      officeSquareFeet: 100,
    };
    expect(calculateHomeOfficeExpense(h)).toBe(0);
  });

  it('detailed: combines all expense types correctly', () => {
    const h: HomeOfficeExpense = {
      method: 'detailed',
      totalSquareFeet: 2000,
      officeSquareFeet: 500,   // 25%
      rent: 8000,
      utilities: 2400,
      insurance: 1200,
      propertyTax: 3600,
      mortgageInterest: 6000,
      maintenance: 800,
    };
    // Total = 22,000; 25% = 5,500
    expect(calculateHomeOfficeExpense(h)).toBe(5500);
  });
});

// ── calculateVehicleExpense ───────────────────────────────────────────────────

describe('calculateVehicleExpense', () => {
  const vehicle: VehicleExpense = {
    totalKm: 20000,
    businessKm: 12000,   // 60%
    fuel: 3000,
    insurance: 1200,
    maintenance: 600,
    license: 100,
    leasePayments: 5000,
    capitalCostAllowance: 0,
    businessUsePercentage: 60,
    deductibleAmount: 0,
  };

  it('actual cost × business%: 60% of $9,900 = $5,940', () => {
    expect(calculateVehicleExpense(vehicle)).toBe(5940);
  });

  it('uses pre-calculated deductibleAmount if non-zero', () => {
    const v = { ...vehicle, deductibleAmount: 4500 };
    expect(calculateVehicleExpense(v)).toBe(4500);
  });

  it('zero total km → zero deduction', () => {
    const v = { ...vehicle, totalKm: 0, deductibleAmount: 0 };
    expect(calculateVehicleExpense(v)).toBe(0);
  });
});

// ── calculateNetBusinessIncome ────────────────────────────────────────────────

describe('calculateNetBusinessIncome', () => {
  it('simple case: gross 80000, no expenses → net 80000', () => {
    const biz = makeBusinessIncome({ grossIncome: 80000 });
    expect(calculateNetBusinessIncome(biz)).toBe(80000);
  });

  it('meals at 50% only — $600 meals → $300 deductible', () => {
    const biz = makeBusinessIncome({
      grossIncome: 50000,
      expenses: {
        advertising: 0, meals: 600, insurance: 0, interest: 0,
        officeExpenses: 0, supplies: 0, legalAccounting: 0,
        travel: 0, telephone: 0, utilities: 0, rent: 0,
        propertyTaxes: 0, salariesWages: 0, capitalCostAllowance: 0,
        otherExpenses: 0,
      },
    });
    expect(calculateNetBusinessIncome(biz)).toBe(49700);  // 50,000 − 300
  });

  it('full expense set deducted', () => {
    const biz = makeBusinessIncome({
      grossIncome: 100000,
      expenses: {
        advertising: 2000, meals: 1000, insurance: 1500, interest: 500,
        officeExpenses: 800, supplies: 400, legalAccounting: 1200,
        travel: 2000, telephone: 1200, utilities: 600, rent: 12000,
        propertyTaxes: 0, salariesWages: 20000, capitalCostAllowance: 5000,
        otherExpenses: 1000,
      },
    });
    // meals: 500 (50%); all others full
    const expected = cent(100000 - (2000 + 500 + 1500 + 500 + 800 + 400 + 1200 + 2000 + 1200 + 600 + 12000 + 0 + 20000 + 5000 + 1000));
    expect(calculateNetBusinessIncome(biz)).toBe(expected);
  });

  it('loss scenario: expenses exceed revenue', () => {
    const biz = makeBusinessIncome({
      grossIncome: 10000,
      expenses: {
        advertising: 0, meals: 0, insurance: 0, interest: 0,
        officeExpenses: 0, supplies: 0, legalAccounting: 0,
        travel: 0, telephone: 0, utilities: 0, rent: 15000,
        propertyTaxes: 0, salariesWages: 0, capitalCostAllowance: 0,
        otherExpenses: 0,
      },
    });
    expect(calculateNetBusinessIncome(biz)).toBe(-5000);
  });

  it('includes home office and vehicle deductions', () => {
    const biz = makeBusinessIncome({
      grossIncome: 60000,
      homeOffice: { method: 'simplified', daysWorkedAtHome: 100 },  // $200
      vehicle: {
        totalKm: 10000, businessKm: 5000,  // 50%
        fuel: 2000, insurance: 0, maintenance: 0,
        license: 0, leasePayments: 0, capitalCostAllowance: 0,
        businessUsePercentage: 50, deductibleAmount: 0,
      },  // $1,000
    });
    // 60000 − 200 (home) − 1000 (vehicle) = 58800
    expect(calculateNetBusinessIncome(biz)).toBe(58800);
  });
});

// ── calculateSelfEmployedCPP ──────────────────────────────────────────────────

describe('calculateSelfEmployedCPP', () => {
  it('zero net income → all zeros', () => {
    const result = calculateSelfEmployedCPP(0);
    expect(result.cpp1Total).toBe(0);
    expect(result.cpp2Total).toBe(0);
  });

  it('income at basic exemption ($3,500) → no CPP', () => {
    const result = calculateSelfEmployedCPP(3500);
    expect(result.cpp1Total).toBe(0);
  });

  it('income below CPP1 ceiling: $50,000', () => {
    // CPP1 base = 50,000 − 3,500 = 46,500
    // Each half = 46,500 × 5.95% = 2,766.75
    const result = calculateSelfEmployedCPP(50000);
    expect(result.cpp1EmployeeHalf).toBe(cent(46500 * 0.0595));
    expect(result.cpp1EmployerHalf).toBe(cent(46500 * 0.0595));
    expect(result.cpp1Total).toBe(cent(2 * 46500 * 0.0595));
    expect(result.cpp2Total).toBe(0);
  });

  it('income exactly at CPP1 ceiling ($71,300) → max CPP1, zero CPP2', () => {
    const result = calculateSelfEmployedCPP(71300);
    // Max CPP1: (71300 − 3500) × 5.95% = 67800 × 5.95% = 4034.10 per half
    expect(result.cpp1EmployeeHalf).toBe(4034.10);
    expect(result.cpp1EmployerHalf).toBe(4034.10);
    expect(result.cpp2Total).toBe(0);
  });

  it('income between CPP1 and CPP2 ceiling: $75,000', () => {
    // CPP1: max (67800 × 5.95% each) = 4034.10 each
    // CPP2 base = 75000 − 71300 = 3700; each half = 3700 × 4% = 148
    const result = calculateSelfEmployedCPP(75000);
    expect(result.cpp1EmployeeHalf).toBe(4034.10);
    expect(result.cpp2EmployeeHalf).toBe(cent(3700 * 0.04));
    expect(result.cpp2EmployerHalf).toBe(cent(3700 * 0.04));
    expect(result.cpp2Total).toBe(cent(2 * 3700 * 0.04));
  });

  it('income above CPP2 ceiling ($81,200) → max both CPP1 and CPP2', () => {
    // CPP2 max base = 81200 − 71300 = 9900
    const result = calculateSelfEmployedCPP(100000);
    expect(result.cpp1EmployeeHalf).toBe(4034.10);
    expect(result.cpp2EmployeeHalf).toBe(cent(9900 * 0.04));
    expect(result.cpp2Total).toBe(cent(2 * 9900 * 0.04));
  });

  it('employee and employer halves are equal', () => {
    const result = calculateSelfEmployedCPP(65000);
    expect(result.cpp1EmployeeHalf).toBe(result.cpp1EmployerHalf);
    expect(result.cpp2EmployeeHalf).toBe(result.cpp2EmployerHalf);
  });
});

// ── calculateSelfEmployment ───────────────────────────────────────────────────

describe('calculateSelfEmployment', () => {
  it('empty array → all zeros', () => {
    const result = calculateSelfEmployment([]);
    expect(result.netBusinessIncome).toBe(0);
    expect(result.allowableLoss).toBe(0);
    expect(result.cpp1Total).toBe(0);
  });

  it('single profitable business', () => {
    const biz = makeBusinessIncome({
      grossIncome: 100000,
      expenses: {
        advertising: 0, meals: 0, insurance: 0, interest: 0,
        officeExpenses: 0, supplies: 0, legalAccounting: 0,
        travel: 0, telephone: 0, utilities: 0, rent: 20000,
        propertyTaxes: 0, salariesWages: 0, capitalCostAllowance: 0,
        otherExpenses: 0,
      },
    });
    const result = calculateSelfEmployment([biz]);
    expect(result.grossIncome).toBe(100000);
    expect(result.netBusinessIncome).toBe(80000);
    expect(result.allowableLoss).toBe(0);
    expect(result.cpp1Total).toBeGreaterThan(0);
  });

  it('loss business → allowableLoss set, no CPP', () => {
    const biz = makeBusinessIncome({
      grossIncome: 5000,
      expenses: {
        advertising: 0, meals: 0, insurance: 0, interest: 0,
        officeExpenses: 0, supplies: 0, legalAccounting: 0,
        travel: 0, telephone: 0, utilities: 0, rent: 10000,
        propertyTaxes: 0, salariesWages: 0, capitalCostAllowance: 0,
        otherExpenses: 0,
      },
    });
    const result = calculateSelfEmployment([biz]);
    expect(result.netBusinessIncome).toBe(0);
    expect(result.allowableLoss).toBe(5000);
    expect(result.cpp1Total).toBe(0);
  });

  it('multiple businesses: profit offsets loss, CPP on net', () => {
    const profitable = makeBusinessIncome({ grossIncome: 80000 });
    const losing = makeBusinessIncome({
      grossIncome: 5000,
      expenses: {
        advertising: 0, meals: 0, insurance: 0, interest: 0,
        officeExpenses: 0, supplies: 0, legalAccounting: 0,
        travel: 0, telephone: 0, utilities: 0, rent: 10000,
        propertyTaxes: 0, salariesWages: 0, capitalCostAllowance: 0,
        otherExpenses: 0,
      },
    });
    const result = calculateSelfEmployment([profitable, losing]);
    expect(result.netBusinessIncome).toBe(75000);
    expect(result.allowableLoss).toBe(0);
  });

  it('CPP capped at annual maximum for high income', () => {
    const biz = makeBusinessIncome({ grossIncome: 200000 });
    const result = calculateSelfEmployment([biz]);
    // Max CPP1 each half = (71300 - 3500) × 5.95% = 4034.10
    expect(result.cpp1EmployeeHalf).toBe(4034.10);
    expect(result.cpp1EmployerHalf).toBe(4034.10);
    // Max CPP2 each half = (81200 - 71300) × 4% = 396.00
    expect(result.cpp2EmployeeHalf).toBe(396.00);
    expect(result.cpp2EmployerHalf).toBe(396.00);
  });

  it('grossIncome and totalExpenses aggregated correctly', () => {
    const biz1 = makeBusinessIncome({ grossIncome: 50000 });
    const biz2 = makeBusinessIncome({
      grossIncome: 30000,
      expenses: {
        advertising: 0, meals: 0, insurance: 0, interest: 0,
        officeExpenses: 0, supplies: 0, legalAccounting: 0,
        travel: 0, telephone: 0, utilities: 0, rent: 5000,
        propertyTaxes: 0, salariesWages: 0, capitalCostAllowance: 0,
        otherExpenses: 0,
      },
    });
    const result = calculateSelfEmployment([biz1, biz2]);
    expect(result.grossIncome).toBe(80000);
    expect(result.totalExpenses).toBe(5000);
    expect(result.netBusinessIncome).toBe(75000);
  });
});
