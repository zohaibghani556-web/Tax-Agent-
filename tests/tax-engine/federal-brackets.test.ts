import { describe, it, expect } from 'vitest';
import {
  calculateTaxOnIncome,
  calculateFederalTaxOnIncome,
  getMarginalRate,
  getAverageTaxRate,
} from '@/lib/tax-engine/federal/brackets';
import { FEDERAL_BRACKETS } from '@/lib/tax-engine/constants';

describe('calculateFederalTaxOnIncome', () => {
  it('returns $0 for $0 income', () => {
    expect(calculateFederalTaxOnIncome(0)).toBe(0);
  });

  it('returns $4,350.00 for $30,000 income (single bracket)', () => {
    // $30,000 × 14.5% = $4,350.00
    expect(calculateFederalTaxOnIncome(30_000)).toBe(4_350.00);
  });

  it('returns $8,319.38 for $57,375 income (top of first bracket)', () => {
    // $57,375 × 14.5% = $8,319.375 → CRA rounds to $8,319.38
    expect(calculateFederalTaxOnIncome(57_375)).toBe(8_319.38);
  });

  it('returns $8,857.51 for $60,000 income (spans two brackets)', () => {
    // First bracket:  $57,375 × 14.5% = $8,319.38 (rounded)
    // Second bracket: $2,625  × 20.5% = $538.13   (rounded from $538.125)
    // Total: $8,857.51
    expect(calculateFederalTaxOnIncome(60_000)).toBe(8_857.51);
  });

  it('returns $20,081.26 for $114,750 income (top of second bracket)', () => {
    // First bracket:  $57,375 × 14.5% = $8,319.38  (rounded)
    // Second bracket: $57,375 × 20.5% = $11,761.88 (rounded from $11,761.875)
    // Total: $20,081.26
    expect(calculateFederalTaxOnIncome(114_750)).toBe(20_081.26);
  });

  it('returns correct tax for $300,000 income (all 5 brackets used)', () => {
    // Bracket 1: $57,375   × 14.5% = $8,319.38
    // Bracket 2: $57,375   × 20.5% = $11,761.88
    // Bracket 3: $63,132   × 26.0% = $16,414.32
    // Bracket 4: $75,532   × 29.0% = $21,904.28
    // Bracket 5: $46,586   × 33.0% = $15,373.38
    // Total: $73,773.24
    expect(calculateFederalTaxOnIncome(300_000)).toBe(73_773.24);
  });
});

describe('calculateTaxOnIncome (generic brackets)', () => {
  it('handles negative income as zero tax', () => {
    expect(calculateTaxOnIncome(-1000, FEDERAL_BRACKETS)).toBe(0);
  });

  it('handles income exactly at a bracket boundary', () => {
    // $114,750 is the exact top of the second bracket
    const result = calculateTaxOnIncome(114_750, FEDERAL_BRACKETS);
    expect(result).toBe(20_081.26);
  });
});

describe('getMarginalRate', () => {
  it('returns 14.5% for $50,000 (first bracket)', () => {
    expect(getMarginalRate(50_000, FEDERAL_BRACKETS)).toBe(0.145);
  });

  it('returns 20.5% for $100,000 (second bracket)', () => {
    expect(getMarginalRate(100_000, FEDERAL_BRACKETS)).toBe(0.205);
  });

  it('returns 26% for $150,000 (third bracket)', () => {
    expect(getMarginalRate(150_000, FEDERAL_BRACKETS)).toBe(0.26);
  });

  it('returns 29% for $200,000 (fourth bracket)', () => {
    expect(getMarginalRate(200_000, FEDERAL_BRACKETS)).toBe(0.29);
  });

  it('returns 33% for $260,000 (fifth bracket)', () => {
    expect(getMarginalRate(260_000, FEDERAL_BRACKETS)).toBe(0.33);
  });

  it('returns first bracket rate for $0 income', () => {
    expect(getMarginalRate(0, FEDERAL_BRACKETS)).toBe(0.145);
  });
});

describe('getAverageTaxRate', () => {
  it('returns 0 for zero income', () => {
    expect(getAverageTaxRate(0, 0)).toBe(0);
  });

  it('returns 14.5% for income entirely in first bracket', () => {
    const tax = calculateFederalTaxOnIncome(30_000);
    // $4,350 / $30,000 = 14.5%
    expect(getAverageTaxRate(30_000, tax)).toBe(14.5);
  });

  it('returns a rate lower than marginal rate for multi-bracket income', () => {
    const income = 100_000;
    const tax = calculateFederalTaxOnIncome(income);
    const avgRate = getAverageTaxRate(income, tax);
    const marginalRate = getMarginalRate(income, FEDERAL_BRACKETS) * 100;
    expect(avgRate).toBeLessThan(marginalRate);
  });
});
