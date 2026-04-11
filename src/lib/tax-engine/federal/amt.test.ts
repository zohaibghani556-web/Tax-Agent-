import { describe, it, expect } from 'vitest';
import { calculateAMT, calculateAMTBase } from './amt';
import type { AMTInput } from './amt';

function makeInput(overrides: Partial<AMTInput> = {}): AMTInput {
  return {
    regularTaxableIncome: 100000,
    regularFederalTax: 15000,
    netCapitalGains: 0,
    regularCapitalGainsInclusion: 0,
    stockOptionBenefit: 0,
    stockOptionDeduction: 0,
    totalDonations: 0,
    donationDeductionClaimed: 0,
    lossDeductionsLimited: 0,
    ...overrides,
  };
}

describe('calculateAMTBase', () => {
  it('no adjustments → equals regular taxable income', () => {
    const input = makeInput({ regularTaxableIncome: 200000 });
    expect(calculateAMTBase(input)).toBe(200000);
  });

  it('capital gains add-back: $500k gain, regular inclusion $250k → add back $250k', () => {
    const input = makeInput({
      regularTaxableIncome: 350000,   // includes $250k capital gains inclusion
      netCapitalGains: 500000,
      regularCapitalGainsInclusion: 250000,
    });
    // Add back: 500k - 250k = 250k
    expect(calculateAMTBase(input)).toBe(600000);
  });

  it('stock option deduction add-back', () => {
    const input = makeInput({
      regularTaxableIncome: 200000,   // already reflects 50% deduction at line 24900
      stockOptionDeduction: 50000,    // the deduction claimed
    });
    expect(calculateAMTBase(input)).toBe(250000);
  });

  it('charitable donation 30% add-back', () => {
    const input = makeInput({
      regularTaxableIncome: 300000,
      totalDonations: 100000,
    });
    // Add back 30% of 100k = 30k
    expect(calculateAMTBase(input)).toBe(330000);
  });

  it('loss deduction limitation: 50% add-back', () => {
    const input = makeInput({
      regularTaxableIncome: 150000,
      lossDeductionsLimited: 40000,
    });
    // Add back 50% of 40k = 20k
    expect(calculateAMTBase(input)).toBe(170000);
  });

  it('all adjustments combined', () => {
    const input = makeInput({
      regularTaxableIncome: 400000,
      netCapitalGains: 600000,
      regularCapitalGainsInclusion: 300000,
      stockOptionDeduction: 50000,
      totalDonations: 200000,
      lossDeductionsLimited: 60000,
    });
    // Cap gains add-back: 600k - 300k = 300k
    // Stock options add-back: 50k
    // Donations add-back: 200k × 30% = 60k
    // Loss add-back: 60k × 50% = 30k
    // ATI = 400k + 300k + 50k + 60k + 30k = 840k
    expect(calculateAMTBase(input)).toBe(840000);
  });
});

describe('calculateAMT', () => {
  it('AMT does not apply when regular tax exceeds AMT', () => {
    // Low income, no adjustments → AMT base well below regular
    const input = makeInput({
      regularTaxableIncome: 60000,
      regularFederalTax: 7000,
      // AMT: (60000 − 173205) = negative → amtTax = 0
    });
    const result = calculateAMT(input);
    expect(result.amtApplicable).toBe(false);
    expect(result.amtPayable).toBe(7000);
    expect(result.amtCarryforward).toBe(0);
  });

  it('AMT does not apply when ATI < $173,205 exemption', () => {
    const input = makeInput({
      regularTaxableIncome: 100000,
      regularFederalTax: 12000,
    });
    const result = calculateAMT(input);
    expect(result.amtBaseAfterExemption).toBe(0);
    expect(result.amtTax).toBe(0);
    expect(result.amtApplicable).toBe(false);
    expect(result.amtPayable).toBe(12000);  // Regular tax
  });

  it('AMT applies for high-income earner with large capital gains', () => {
    // Taxable income: $500k (including $250k capital gain at 50%)
    // Net gains: $600k → AMT wants 100%
    const input = makeInput({
      regularTaxableIncome: 500000,
      regularFederalTax: 120000,
      netCapitalGains: 600000,
      regularCapitalGainsInclusion: 300000,  // 50% of 600k in regular
    });
    // ATI = 500k + (600k - 300k) = 800k
    // After exemption: 800k - 173,205 = 626,795
    // AMT tax: 626,795 × 20.5% = 128,492.98
    const result = calculateAMT(input);
    expect(result.adjustedTaxableIncome).toBe(800000);
    expect(result.amtBaseAfterExemption).toBe(626795);
    expect(result.amtTax).toBeCloseTo(128492.98, 1);
    expect(result.amtApplicable).toBe(true);
    expect(result.amtPayable).toBe(result.amtTax);
  });

  it('exact exemption boundary: ATI exactly at $173,205', () => {
    const input = makeInput({
      regularTaxableIncome: 173205,
      regularFederalTax: 5000,
    });
    const result = calculateAMT(input);
    expect(result.amtBaseAfterExemption).toBe(0);
    expect(result.amtTax).toBe(0);
    expect(result.amtApplicable).toBe(false);
  });

  it('amtCarryforward = excess AMT over regular tax', () => {
    const input = makeInput({
      regularTaxableIncome: 600000,
      regularFederalTax: 50000,
      netCapitalGains: 500000,
      regularCapitalGainsInclusion: 250000,
    });
    const result = calculateAMT(input);
    if (result.amtApplicable) {
      expect(result.amtCarryforward).toBeCloseTo(result.amtTax - result.regularFederalTax, 1);
    }
  });

  it('zero income → no AMT', () => {
    const input = makeInput({
      regularTaxableIncome: 0,
      regularFederalTax: 0,
    });
    const result = calculateAMT(input);
    expect(result.amtApplicable).toBe(false);
    expect(result.amtTax).toBe(0);
    expect(result.amtPayable).toBe(0);
  });

  it('high donation scenario — 30% add-back can trigger AMT', () => {
    // $2M donation on $3M income
    const input = makeInput({
      regularTaxableIncome: 800000,
      regularFederalTax: 100000,
      totalDonations: 2000000,
    });
    // Donation add-back: 2M × 30% = 600k
    // ATI = 800k + 600k = 1.4M
    // After exemption: 1.4M - 173,205 = 1,226,795
    // AMT tax: 1,226,795 × 20.5% ≈ 251,493
    const result = calculateAMT(input);
    expect(result.amtApplicable).toBe(true);
    expect(result.amtTax).toBeGreaterThan(result.regularFederalTax);
  });
});
