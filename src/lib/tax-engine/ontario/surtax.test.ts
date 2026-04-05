import { describe, it, expect } from 'vitest';
import { calculateOntarioSurtax } from './surtax';

describe('calculateOntarioSurtax', () => {
  it('returns $0 for zero Ontario tax', () => {
    expect(calculateOntarioSurtax(0)).toBe(0);
  });

  // $5,000 basic Ontario tax: below threshold 1 ($6,104) → no surtax
  it('returns $0 when basic Ontario tax is below threshold 1', () => {
    expect(calculateOntarioSurtax(5000)).toBe(0);
  });

  // $6,104 exactly: at threshold 1 → $0 (0 excess above threshold)
  it('returns $0 at exactly threshold 1', () => {
    expect(calculateOntarioSurtax(6104)).toBe(0);
  });

  // $7,000: between thresholds
  // Tier 1: 20% × (7,000 − 6,104) = 20% × 896 = $179.20
  // Tier 2: 36% × max(0, 7,000 − 7,812) = $0
  // Total: $179.20
  it('applies only tier 1 surtax between the two thresholds', () => {
    expect(calculateOntarioSurtax(7000)).toBe(179.20);
  });

  // $7,812 exactly: at threshold 2 → only tier 1 applies
  // Tier 1: 20% × (7,812 − 6,104) = 20% × 1,708 = $341.60
  it('returns only tier 1 at exactly threshold 2', () => {
    expect(calculateOntarioSurtax(7812)).toBe(341.60);
  });

  // $10,000: above both thresholds
  // Tier 1: 20% × (10,000 − 6,104) = 20% × 3,896 = $779.20
  // Tier 2: 36% × (10,000 − 7,812) = 36% × 2,188 = $787.68
  // Total: $1,566.88
  it('applies both tiers additively above threshold 2', () => {
    expect(calculateOntarioSurtax(10000)).toBe(1566.88);
  });
});
