/**
 * Ontario surtax tests — 2025 values.
 * Source: CRA T4032ON Jul 2025 | Verified: 2026-04-24
 * Threshold 1: $5,710 (20% surtax), Threshold 2: $7,307 (additional 36% surtax).
 */
import { describe, it, expect } from 'vitest';
import { calculateOntarioSurtax } from './surtax';

describe('calculateOntarioSurtax', () => {
  it('returns $0 for zero Ontario tax', () => {
    expect(calculateOntarioSurtax(0)).toBe(0);
  });

  // $5,000 basic Ontario tax: below threshold 1 ($5,710) → no surtax
  it('returns $0 when basic Ontario tax is below threshold 1 ($5,710)', () => {
    expect(calculateOntarioSurtax(5000)).toBe(0);
  });

  // $5,710 exactly: at threshold 1 → $0 (0 excess above threshold)
  it('returns $0 at exactly threshold 1 ($5,710)', () => {
    expect(calculateOntarioSurtax(5710)).toBe(0);
  });

  // $7,000: between thresholds
  // Tier 1: 20% × (7,000 − 5,710) = 20% × 1,290 = $258.00
  // Tier 2: 36% × max(0, 7,000 − 7,307) = $0
  // Total: $258.00
  it('applies only tier 1 surtax between the two thresholds', () => {
    expect(calculateOntarioSurtax(7000)).toBe(258.00);
  });

  // $7,307 exactly: at threshold 2 → only tier 1 applies
  // Tier 1: 20% × (7,307 − 5,710) = 20% × 1,597 = $319.40
  it('returns only tier 1 at exactly threshold 2 ($7,307)', () => {
    expect(calculateOntarioSurtax(7307)).toBe(319.40);
  });

  // $10,000: above both thresholds
  // Tier 1: 20% × (10,000 − 5,710) = 20% × 4,290 = $858.00
  // Tier 2: 36% × (10,000 − 7,307) = 36% × 2,693 = $969.48
  // Total: $1,827.48
  it('applies both tiers additively above threshold 2', () => {
    expect(calculateOntarioSurtax(10000)).toBe(1827.48);
  });
});
