import { describe, it, expect } from 'vitest';
import { calculateOntarioHealthPremium } from './health-premium';

describe('calculateOntarioHealthPremium', () => {
  it('returns $0 for zero income', () => {
    expect(calculateOntarioHealthPremium(0)).toBe(0);
  });

  // $18,000: below $20,000 threshold → no premium
  it('returns $0 for income below $20,000', () => {
    expect(calculateOntarioHealthPremium(18000)).toBe(0);
  });

  // $20,000 exactly: in the 0–$20,000 bracket (income <= max: 20000 ≤ 20000) → $0
  it('returns $0 at exactly $20,000', () => {
    expect(calculateOntarioHealthPremium(20000)).toBe(0);
  });

  // $30,000: in the $25,000–$36,000 bracket (base $300, rate 6%)
  // premium = $300 + 6% × ($30,000 − $25,000) = $300 + $300 = $600
  it('applies $300 base + 6% rate for $30,000 income', () => {
    expect(calculateOntarioHealthPremium(30000)).toBe(600);
  });

  // $60,000: in the $48,600–$72,000 flat bracket → $900
  it('returns $900 for $60,000 income (flat bracket)', () => {
    expect(calculateOntarioHealthPremium(60000)).toBe(900);
  });

  // $210,000: in the $200,600+ flat bracket → $900 (maximum premium)
  it('returns $900 for $210,000 income (premium capped at $900)', () => {
    expect(calculateOntarioHealthPremium(210000)).toBe(900);
  });

  // $1,000,000: well beyond all brackets → still $900
  it('returns $900 for very high income', () => {
    expect(calculateOntarioHealthPremium(1000000)).toBe(900);
  });
});
