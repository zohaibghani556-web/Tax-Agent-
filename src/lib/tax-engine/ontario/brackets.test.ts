/**
 * Ontario bracket tests updated for 2025 thresholds: $51,446 / $102,894.
 * Source: CRA T4032ON, effective Jan 1 2025.
 */
import { describe, it, expect } from 'vitest';
import { calculateOntarioTaxOnIncome } from './brackets';

describe('calculateOntarioTaxOnIncome', () => {
  it('returns $0 for zero income', () => {
    expect(calculateOntarioTaxOnIncome(0)).toBe(0);
  });

  it('returns $0 for negative income', () => {
    expect(calculateOntarioTaxOnIncome(-1000)).toBe(0);
  });

  // $50,000: fully within bracket 1 (5.05%), below new $51,446 ceiling
  // 50,000 × 5.05% = $2,525.00
  it('taxes $50,000 income in the first bracket only', () => {
    expect(calculateOntarioTaxOnIncome(50000)).toBe(2525.00);
  });

  // Exact bracket 1 ceiling ($51,446): 51,446 × 5.05% = $2,598.02
  it('taxes income at the bracket 1 ceiling ($51,446)', () => {
    expect(calculateOntarioTaxOnIncome(51446)).toBe(2598.02);
  });

  // $120,000: spans brackets 1, 2, and part of 3
  // Bracket 1: 51,446 × 5.05%               = $2,598.02
  // Bracket 2: (102,894 − 51,446) × 9.15%   = 51,448 × 9.15% = $4,707.49
  // Bracket 3: (120,000 − 102,894) × 11.16% = 17,106 × 11.16% = $1,909.03
  // Total: $9,214.54
  it('taxes $120,000 income across brackets 1–3', () => {
    expect(calculateOntarioTaxOnIncome(120000)).toBe(9214.54);
  });

  // $250,000: spans all five brackets
  // Bracket 1: 51,446 × 5.05%               = $2,598.02
  // Bracket 2: 51,448 × 9.15%               = $4,707.49
  // Bracket 3: (150,000 − 102,894) × 11.16% = 47,106 × 11.16% = $5,257.03
  // Bracket 4: 70,000 × 12.16%              = $8,512.00
  // Bracket 5: 30,000 × 13.16%              = $3,948.00
  // Total: $25,022.54
  it('taxes $250,000 income across all five brackets', () => {
    expect(calculateOntarioTaxOnIncome(250000)).toBe(25022.54);
  });
});
