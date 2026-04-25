/**
 * Ontario bracket tests — 2025 thresholds: $52,886 / $105,775.
 * Source: CRA T4032ON Jul 2025 | Verified: 2026-04-24
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

  // $50,000: fully within bracket 1 (5.05%), below $52,886 ceiling
  // 50,000 × 5.05% = $2,525.00
  it('taxes $50,000 income in the first bracket only', () => {
    expect(calculateOntarioTaxOnIncome(50000)).toBe(2525.00);
  });

  // Exact bracket 1 ceiling ($52,886): 52,886 × 5.05% = $2,670.74 (rounded)
  // 52886 × 0.0505 = 2670.743 → roundCRA = $2,670.74
  it('taxes income at the bracket 1 ceiling ($52,886)', () => {
    expect(calculateOntarioTaxOnIncome(52886)).toBe(2670.74);
  });

  // $120,000: spans brackets 1, 2, and part of 3
  // Bracket 1: 52,886 × 5.05%               = $2,670.74
  // Bracket 2: (105,775 − 52,886) × 9.15%   = 52,889 × 9.15% = $4,839.34 (52889×0.0915=4839.3435→4839.34)
  // Bracket 3: (120,000 − 105,775) × 11.16% = 14,225 × 11.16% = $1,587.51 (14225×0.1116=1587.51)
  // Total: $9,097.59
  it('taxes $120,000 income across brackets 1–3', () => {
    expect(calculateOntarioTaxOnIncome(120000)).toBe(9097.59);
  });

  // $250,000: spans all five brackets
  // Bracket 1: 52,886 x 5.05%              = $2,670.74  (52886 x 0.0505 = 2670.743)
  // Bracket 2: 52,889 x 9.15%              = $4,839.34  (52889 x 0.0915 = 4839.3435)
  // Bracket 3: 44,225 x 11.16%             = $4,935.51  (44225 x 0.1116 = 4935.51)
  // Bracket 4: 70,000 x 12.16%             = $8,512.00
  // Bracket 5: 30,000 x 13.16%             = $3,948.00
  // Total: $24,905.59
  it('taxes $250,000 income across all five brackets', () => {
    expect(calculateOntarioTaxOnIncome(250000)).toBe(24905.59);
  });
});
