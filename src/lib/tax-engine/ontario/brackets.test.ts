import { describe, it, expect } from 'vitest';
import { calculateOntarioTaxOnIncome } from './brackets';

describe('calculateOntarioTaxOnIncome', () => {
  it('returns $0 for zero income', () => {
    expect(calculateOntarioTaxOnIncome(0)).toBe(0);
  });

  it('returns $0 for negative income', () => {
    expect(calculateOntarioTaxOnIncome(-1000)).toBe(0);
  });

  // $50,000: fully within bracket 1 (5.05%)
  // 50,000 × 5.05% = $2,525.00
  it('taxes $50,000 income in the first bracket only', () => {
    expect(calculateOntarioTaxOnIncome(50000)).toBe(2525.00);
  });

  // Exact bracket 1 ceiling ($52,886): 52,886 × 5.05% = $2,670.74
  it('taxes income at the bracket 1 ceiling ($52,886)', () => {
    expect(calculateOntarioTaxOnIncome(52886)).toBe(2670.74);
  });

  // $120,000: spans brackets 1, 2, and part of 3
  // Bracket 1: 52,886 × 5.05% = $2,670.74
  // Bracket 2: (105,775 − 52,886) × 9.15% = 52,889 × 9.15% = $4,839.34
  // Bracket 3: (120,000 − 105,775) × 11.16% = 14,225 × 11.16% = $1,587.51
  // Total: $9,097.59
  it('taxes $120,000 income across brackets 1–3', () => {
    expect(calculateOntarioTaxOnIncome(120000)).toBe(9097.59);
  });

  // $250,000: spans all five brackets
  // Bracket 1: 52,886 × 5.05%   = $2,670.74
  // Bracket 2: 52,889 × 9.15%   = $4,839.34
  // Bracket 3: 44,225 × 11.16%  = $4,935.51
  // Bracket 4: 70,000 × 12.16%  = $8,512.00
  // Bracket 5: 30,000 × 13.16%  = $3,948.00
  // Total: $24,905.59
  it('taxes $250,000 income across all five brackets', () => {
    expect(calculateOntarioTaxOnIncome(250000)).toBe(24905.59);
  });
});
