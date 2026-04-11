import { describe, it, expect } from 'vitest';
import { calculateStockOptionsDeduction } from './stock-options';

describe('calculateStockOptionsDeduction', () => {
  it('zero benefit → all zeros', () => {
    const result = calculateStockOptionsDeduction({ stockOptionBenefit: 0, deductionEligible: true });
    expect(result.deduction).toBe(0);
    expect(result.netTaxableBenefit).toBe(0);
    expect(result.amtAddBack).toBe(0);
  });

  it('eligible: 50% deduction applied', () => {
    const result = calculateStockOptionsDeduction({ stockOptionBenefit: 100000, deductionEligible: true });
    expect(result.deduction).toBe(50000);
    expect(result.netTaxableBenefit).toBe(50000);
    expect(result.effectiveTaxRate).toBe('capital-gains');
  });

  it('not eligible: no deduction, full benefit taxed as employment income', () => {
    const result = calculateStockOptionsDeduction({ stockOptionBenefit: 80000, deductionEligible: false });
    expect(result.deduction).toBe(0);
    expect(result.netTaxableBenefit).toBe(80000);
    expect(result.effectiveTaxRate).toBe('employment');
  });

  it('AMT add-back equals the deduction claimed', () => {
    const result = calculateStockOptionsDeduction({ stockOptionBenefit: 200000, deductionEligible: true });
    expect(result.amtAddBack).toBe(100000);
  });

  it('AMT add-back is zero when not eligible (no deduction was claimed)', () => {
    const result = calculateStockOptionsDeduction({ stockOptionBenefit: 60000, deductionEligible: false });
    expect(result.amtAddBack).toBe(0);
  });

  it('odd benefit rounds to nearest cent', () => {
    const result = calculateStockOptionsDeduction({ stockOptionBenefit: 10001, deductionEligible: true });
    expect(result.deduction).toBe(5000.50);
    expect(result.netTaxableBenefit).toBe(5000.50);
  });

  it('small benefit — $1,000 eligible', () => {
    const result = calculateStockOptionsDeduction({ stockOptionBenefit: 1000, deductionEligible: true });
    expect(result.deduction).toBe(500);
    expect(result.stockOptionBenefit).toBe(1000);
  });

  it('negative benefit is treated as zero (should not occur in practice)', () => {
    const result = calculateStockOptionsDeduction({ stockOptionBenefit: -5000, deductionEligible: true });
    expect(result.deduction).toBe(0);
    expect(result.netTaxableBenefit).toBe(0);
  });
});
