import { describe, it, expect } from 'vitest';
import { optimizePensionSplit } from './pension-split-optimizer';
import type { PensionSplitInput } from './pension-split-optimizer';

function cent(n: number) { return Math.round(n * 100) / 100; }

function makeInput(overrides: Partial<PensionSplitInput> = {}): PensionSplitInput {
  return {
    transferorTaxableIncome: 120000,
    recipientTaxableIncome: 30000,
    eligiblePensionIncome: 40000,
    ...overrides,
  };
}

describe('optimizePensionSplit', () => {
  it('zero pension income → no split, zero saving', () => {
    const result = optimizePensionSplit(makeInput({ eligiblePensionIncome: 0 }));
    expect(result.optimalSplitPct).toBe(0);
    expect(result.optimalSplitAmount).toBe(0);
    expect(result.taxSaving).toBe(0);
  });

  it('always produces exactly 51 breakdown entries (0% to 50%)', () => {
    const result = optimizePensionSplit(makeInput());
    expect(result.breakdown).toHaveLength(51);
    expect(result.breakdown[0].splitPct).toBe(0);
    expect(result.breakdown[50].splitPct).toBe(50);
  });

  it('optimal split is between 0 and 50 percent', () => {
    const result = optimizePensionSplit(makeInput());
    expect(result.optimalSplitPct).toBeGreaterThanOrEqual(0);
    expect(result.optimalSplitPct).toBeLessThanOrEqual(50);
  });

  it('max transfer is 50% of eligible pension income', () => {
    const result = optimizePensionSplit(makeInput({ eligiblePensionIncome: 20000 }));
    // At 50% split: splitAmount = 20000 × 50% = 10000
    expect(result.breakdown[50].splitAmount).toBe(10000);
  });

  it('tax saving is positive when transferor is in higher bracket', () => {
    // Transferor at $120k (26% bracket), recipient at $30k (14.5% bracket)
    // Splitting should reduce combined tax
    const result = optimizePensionSplit(makeInput({
      transferorTaxableIncome: 120000,
      recipientTaxableIncome: 30000,
      eligiblePensionIncome: 40000,
    }));
    expect(result.taxSaving).toBeGreaterThan(0);
    expect(result.optimalTax).toBeLessThan(result.noSplitTax);
  });

  it('equal incomes → no benefit from splitting (or minimal)', () => {
    const result = optimizePensionSplit(makeInput({
      transferorTaxableIncome: 80000,
      recipientTaxableIncome: 80000,
      eligiblePensionIncome: 20000,
    }));
    // When incomes are equal, splitting redistributes but doesn't save
    expect(result.taxSaving).toBeLessThanOrEqual(0.01);  // essentially zero
  });

  it('combined tax at optimal split is less than or equal to no-split', () => {
    const result = optimizePensionSplit(makeInput());
    expect(result.optimalTax).toBeLessThanOrEqual(result.noSplitTax);
  });

  it('breakdown at pct=0 matches noSplitTax', () => {
    const result = optimizePensionSplit(makeInput());
    expect(result.breakdown[0].combinedTax).toBe(result.noSplitTax);
  });

  it('breakdown entry at optimalSplitPct matches optimalTax', () => {
    const result = optimizePensionSplit(makeInput());
    const entry = result.breakdown[result.optimalSplitPct];
    expect(entry.combinedTax).toBe(result.optimalTax);
    expect(entry.splitAmount).toBe(result.optimalSplitAmount);
  });

  it('high-income transferor — substantial saving expected', () => {
    // Transferor at $250k (top bracket), recipient at $0
    const result = optimizePensionSplit(makeInput({
      transferorTaxableIncome: 250000,
      recipientTaxableIncome: 0,
      eligiblePensionIncome: 80000,
    }));
    // Should show meaningful tax saving
    expect(result.taxSaving).toBeGreaterThan(500);
    expect(result.optimalSplitPct).toBeGreaterThan(0);
  });

  it('all split amounts in breakdown are capped at 50% of eligible pension', () => {
    const result = optimizePensionSplit(makeInput({ eligiblePensionIncome: 60000 }));
    const maxTransfer = 30000;
    for (const entry of result.breakdown) {
      expect(entry.splitAmount).toBeLessThanOrEqual(maxTransfer);
    }
  });

  it('transferor income decreases monotonically as split% increases', () => {
    const result = optimizePensionSplit(makeInput({
      transferorTaxableIncome: 150000,
      recipientTaxableIncome: 20000,
      eligiblePensionIncome: 50000,
    }));
    // Each successive entry: transferor tax should not increase as more is split
    for (let i = 1; i < result.breakdown.length; i++) {
      expect(result.breakdown[i].transferorTax).toBeLessThanOrEqual(result.breakdown[i - 1].transferorTax + 0.01);
    }
  });
});
