import { describe, it, expect } from 'vitest';
import {
  calculateRentalPropertyIncome,
  calculateRentalCCA,
  calculateRentalIncome,
} from './rental-income';
import type { RentalIncome } from '../types';

function makeProperty(overrides: Partial<RentalIncome> = {}): RentalIncome {
  return {
    propertyAddress: '123 Main St',
    ownershipPercentage: 100,
    grossRent: 0,
    expenses: {
      advertising: 0, insurance: 0, interest: 0, maintenance: 0,
      managementFees: 0, officeExpenses: 0, legalAccounting: 0,
      propertyTaxes: 0, utilities: 0, capitalCostAllowance: 0, other: 0,
    },
    netIncome: 0,
    ...overrides,
  };
}

describe('calculateRentalPropertyIncome', () => {
  it('no expenses → net equals gross rent', () => {
    const prop = makeProperty({ grossRent: 24000 });
    const result = calculateRentalPropertyIncome(prop);
    expect(result.grossRent).toBe(24000);
    expect(result.netRentalIncome).toBe(24000);
    expect(result.totalExpenses).toBe(0);
  });

  it('full expenses deducted — 100% ownership', () => {
    const prop = makeProperty({
      grossRent: 36000,
      expenses: {
        advertising: 500,
        insurance: 1200,
        interest: 8000,
        maintenance: 2000,
        managementFees: 1800,
        officeExpenses: 0,
        legalAccounting: 400,
        propertyTaxes: 4800,
        utilities: 0,
        capitalCostAllowance: 0,
        other: 300,
      },
    });
    const result = calculateRentalPropertyIncome(prop);
    const expectedExpenses = 500 + 1200 + 8000 + 2000 + 1800 + 400 + 4800 + 300;  // = 19000
    expect(result.grossRent).toBe(36000);
    expect(result.totalExpenses).toBe(expectedExpenses);
    expect(result.netRentalIncome).toBe(36000 - expectedExpenses);
  });

  it('50% ownership: income and expenses halved', () => {
    const prop = makeProperty({
      grossRent: 24000,
      ownershipPercentage: 50,
      expenses: {
        advertising: 0, insurance: 0, interest: 6000, maintenance: 0,
        managementFees: 0, officeExpenses: 0, legalAccounting: 0,
        propertyTaxes: 2000, utilities: 0, capitalCostAllowance: 0, other: 0,
      },
    });
    const result = calculateRentalPropertyIncome(prop);
    expect(result.grossRent).toBe(12000);      // 24000 × 50%
    expect(result.totalExpenses).toBe(4000);   // (6000 + 2000) × 50%
    expect(result.netRentalIncome).toBe(8000);
  });

  it('CCA tracked separately and included in total expenses', () => {
    const prop = makeProperty({
      grossRent: 20000,
      expenses: {
        advertising: 0, insurance: 0, interest: 0, maintenance: 0,
        managementFees: 0, officeExpenses: 0, legalAccounting: 0,
        propertyTaxes: 0, utilities: 0, capitalCostAllowance: 5000, other: 0,
      },
    });
    const result = calculateRentalPropertyIncome(prop);
    expect(result.ccaClaimed).toBe(5000);
    expect(result.totalExpenses).toBe(5000);
    expect(result.netRentalIncome).toBe(15000);
  });
});

describe('calculateRentalCCA', () => {
  it('4% of building UCC', () => {
    expect(calculateRentalCCA(500000)).toBe(20000);
  });

  it('zero UCC → zero CCA', () => {
    expect(calculateRentalCCA(0)).toBe(0);
  });

  it('rounds to nearest cent', () => {
    expect(calculateRentalCCA(100001)).toBe(4000.04);
  });
});

describe('calculateRentalIncome', () => {
  it('empty array → all zeros', () => {
    const result = calculateRentalIncome([]);
    expect(result.netRentalIncome).toBe(0);
    expect(result.rentalLoss).toBe(0);
    expect(result.grossRent).toBe(0);
  });

  it('single profitable property', () => {
    const prop = makeProperty({
      grossRent: 30000,
      expenses: {
        advertising: 0, insurance: 600, interest: 5000, maintenance: 1000,
        managementFees: 0, officeExpenses: 0, legalAccounting: 0,
        propertyTaxes: 3000, utilities: 0, capitalCostAllowance: 0, other: 0,
      },
    });
    const result = calculateRentalIncome([prop]);
    expect(result.netRentalIncome).toBe(20400);
    expect(result.rentalLoss).toBe(0);
  });

  it('rental loss scenario', () => {
    const prop = makeProperty({
      grossRent: 12000,
      expenses: {
        advertising: 0, insurance: 1000, interest: 15000, maintenance: 0,
        managementFees: 0, officeExpenses: 0, legalAccounting: 0,
        propertyTaxes: 2000, utilities: 0, capitalCostAllowance: 0, other: 0,
      },
    });
    const result = calculateRentalIncome([prop]);
    expect(result.netRentalIncome).toBe(0);
    expect(result.rentalLoss).toBe(6000);  // 12000 − 18000 = −6000
  });

  it('multiple properties: aggregates gross rent and expenses', () => {
    const p1 = makeProperty({ grossRent: 24000 });
    const p2 = makeProperty({
      grossRent: 18000,
      expenses: {
        advertising: 0, insurance: 0, interest: 6000, maintenance: 0,
        managementFees: 0, officeExpenses: 0, legalAccounting: 0,
        propertyTaxes: 2000, utilities: 0, capitalCostAllowance: 0, other: 0,
      },
    });
    const result = calculateRentalIncome([p1, p2]);
    expect(result.grossRent).toBe(42000);
    expect(result.netRentalIncome).toBe(34000);  // 24000 + (18000 − 8000) = 34000
  });

  it('ccaOptional is always true', () => {
    const result = calculateRentalIncome([makeProperty({ grossRent: 12000 })]);
    expect(result.ccaOptional).toBe(true);
  });
});
