import { describe, it, expect } from 'vitest';
import { calculatePrincipalResidenceExemption } from './principal-residence';

describe('calculatePrincipalResidenceExemption', () => {
  it('fully designated every year → fully exempt', () => {
    const result = calculatePrincipalResidenceExemption({
      proceeds: 800000,
      acb: 300000,
      sellingCosts: 20000,
      yearsOwned: 10,
      yearsDesignated: 10,
    });
    // Gain = 800k - 300k - 20k = 480k
    // Exempt fraction = min(1, 11/10) = 1 → fully exempt
    expect(result.totalGain).toBe(480000);
    expect(result.fullyExempt).toBe(true);
    expect(result.taxableGain).toBe(0);
    expect(result.taxableGainInclusion).toBe(0);
    expect(result.isLoss).toBe(false);
  });

  it('never designated → no exemption, full gain taxable', () => {
    const result = calculatePrincipalResidenceExemption({
      proceeds: 600000,
      acb: 200000,
      sellingCosts: 15000,
      yearsOwned: 8,
      yearsDesignated: 0,
    });
    // Gain = 385,000
    // Exempt fraction = 1/8 = 0.125 (always get +1 year)
    expect(result.totalGain).toBe(385000);
    expect(result.fullyExempt).toBe(false);
    expect(result.taxableGain).toBeCloseTo(385000 * (1 - 1 / 8), 1);
    expect(result.isLoss).toBe(false);
  });

  it('partial designation — rented for 3 of 10 years', () => {
    const result = calculatePrincipalResidenceExemption({
      proceeds: 900000,
      acb: 400000,
      sellingCosts: 25000,
      yearsOwned: 10,
      yearsDesignated: 7,   // 3 years rented
    });
    // Gain = 475,000
    // Exempt fraction = (7+1)/10 = 8/10 = 0.80
    // Exempt gain = 475,000 × 0.80 = 380,000
    // Taxable gain = 475,000 × 0.20 = 95,000
    // Inclusion: 95,000 × 50% = 47,500 (under $250k threshold)
    expect(result.totalGain).toBe(475000);
    expect(result.exemptionFraction).toBe('8/10');
    expect(result.exemptGain).toBe(380000);
    expect(result.taxableGain).toBe(95000);
    expect(result.taxableGainInclusion).toBe(47500);
  });

  it('+1 year rule: 1 year owned, 0 designated → still fully exempt', () => {
    // Common scenario: bought and sold in same year while owning another property
    const result = calculatePrincipalResidenceExemption({
      proceeds: 550000,
      acb: 500000,
      sellingCosts: 0,
      yearsOwned: 1,
      yearsDesignated: 0,
    });
    // Exempt fraction = (0+1)/1 = 1 → fully exempt
    expect(result.fullyExempt).toBe(true);
    expect(result.taxableGain).toBe(0);
  });

  it('loss on principal residence → isLoss = true, no deductible loss', () => {
    const result = calculatePrincipalResidenceExemption({
      proceeds: 450000,
      acb: 500000,
      sellingCosts: 15000,
      yearsOwned: 5,
      yearsDesignated: 5,
    });
    // Proceeds - ACB - costs = -65,000
    expect(result.isLoss).toBe(true);
    expect(result.taxableGain).toBe(0);
    expect(result.taxableGainInclusion).toBe(0);
    expect(result.totalGain).toBe(-65000);
  });

  it('large taxable gain uses flat 50% inclusion rate for 2025', () => {
    // CRA reverted to flat 50% for all 2025 T1 returns — two-tier (66.67%) deferred to 2026.
    // Source: canada.ca/en/revenue-agency/.../update-cra-administration-proposed-capital-gains...
    // Verified: 2026-04-24
    const result = calculatePrincipalResidenceExemption({
      proceeds: 2000000,
      acb: 300000,
      sellingCosts: 50000,
      yearsOwned: 10,
      yearsDesignated: 2,
    });
    // Gain = 1,650,000
    // Exempt = (3/10) × 1,650,000 = 495,000
    // Taxable = 1,155,000
    // Inclusion: 1,155,000 × 50% = 577,500 (flat 50% for 2025 — no $250k split)
    expect(result.totalGain).toBe(1650000);
    expect(result.taxableGain).toBe(1155000);
    expect(result.taxableGainInclusion).toBe(577500);
  });

  it('sellingCosts reduce gain correctly', () => {
    const result = calculatePrincipalResidenceExemption({
      proceeds: 500000,
      acb: 400000,
      sellingCosts: 20000,
      yearsOwned: 5,
      yearsDesignated: 5,
    });
    // Gain = 500k - 400k - 20k = 80k → fully exempt
    expect(result.totalGain).toBe(80000);
    expect(result.fullyExempt).toBe(true);
  });

  it('zero selling costs and zero gain → not a loss', () => {
    const result = calculatePrincipalResidenceExemption({
      proceeds: 400000,
      acb: 400000,
      sellingCosts: 0,
      yearsOwned: 3,
      yearsDesignated: 3,
    });
    expect(result.totalGain).toBe(0);
    expect(result.isLoss).toBe(true);  // 0 gain is treated as a loss case (totalGain <= 0)
  });
});
