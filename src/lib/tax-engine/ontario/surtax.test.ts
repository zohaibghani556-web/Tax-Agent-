/**
 * Ontario surtax tests — thresholds updated to 2025 values.
 * Source: CRA T4032ON Jan 2025 + EY Ontario budget 2025-26.
 * Threshold 1: $5,818 (20%), Threshold 2: $7,446 (additional 36%).
 */
import { describe, it, expect } from 'vitest';
import { calculateOntarioSurtax } from './surtax';

describe('calculateOntarioSurtax', () => {
  it('returns $0 for zero Ontario tax', () => {
    expect(calculateOntarioSurtax(0)).toBe(0);
  });

  // $5,000 basic Ontario tax: below threshold 1 ($5,818) → no surtax
  it('returns $0 when basic Ontario tax is below threshold 1 ($5,818)', () => {
    expect(calculateOntarioSurtax(5000)).toBe(0);
  });

  // $5,818 exactly: at threshold 1 → $0 (0 excess above threshold)
  it('returns $0 at exactly threshold 1 ($5,818)', () => {
    expect(calculateOntarioSurtax(5818)).toBe(0);
  });

  // $7,000: between thresholds
  // Tier 1: 20% × (7,000 − 5,818) = 20% × 1,182 = $236.40
  // Tier 2: 36% × max(0, 7,000 − 7,446) = $0
  // Total: $236.40
  it('applies only tier 1 surtax between the two thresholds', () => {
    expect(calculateOntarioSurtax(7000)).toBe(236.40);
  });

  // $7,446 exactly: at threshold 2 → only tier 1 applies
  // Tier 1: 20% × (7,446 − 5,818) = 20% × 1,628 = $325.60
  it('returns only tier 1 at exactly threshold 2 ($7,446)', () => {
    expect(calculateOntarioSurtax(7446)).toBe(325.60);
  });

  // $10,000: above both thresholds (matches the prompt example)
  // Tier 1: 20% × (10,000 − 5,818) = 20% × 4,182 = $836.40
  // Tier 2: 36% × (10,000 − 7,446) = 36% × 2,554 = $919.44
  // Total: $1,755.84
  it('applies both tiers additively above threshold 2', () => {
    expect(calculateOntarioSurtax(10000)).toBe(1755.84);
  });
});
