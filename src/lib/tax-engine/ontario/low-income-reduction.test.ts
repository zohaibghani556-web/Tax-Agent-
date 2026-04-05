import { describe, it, expect } from 'vitest';
import { calculateLowIncomeReduction } from './low-income-reduction';
import { calculateOntarioTaxOnIncome } from './brackets';

describe('calculateLowIncomeReduction', () => {
  it('returns $0 when both tax and income are zero', () => {
    expect(calculateLowIncomeReduction(0, 0)).toBe(0);
  });

  // $15,000 taxable income: below clawback threshold ($18,569), full $294 applies
  // Basic Ontario tax: 15,000 × 5.05% = $757.50 (well above $294)
  it('applies the full $294 reduction when income is below the clawback threshold', () => {
    const ontarioTax = calculateOntarioTaxOnIncome(15000);
    expect(calculateLowIncomeReduction(ontarioTax, 15000)).toBe(294);
  });

  // $18,569 exactly (clawback threshold): no clawback → full $294
  it('applies full $294 reduction at exactly the clawback threshold', () => {
    const ontarioTax = calculateOntarioTaxOnIncome(18569);
    expect(calculateLowIncomeReduction(ontarioTax, 18569)).toBe(294);
  });

  // $24,388 income: clawback eliminates the full reduction
  // clawback = (24,388 − 18,569) × 5.05% = 5,819 × 5.05% = $293.86
  // reduction = max(0, 294 − 293.86) = $0.14
  it('partially claws back the reduction for mid-range income', () => {
    const ontarioTax = calculateOntarioTaxOnIncome(24388);
    const reduction = calculateLowIncomeReduction(ontarioTax, 24388);
    // clawback ≈ 293.86, leaving ≈ $0.14 — just above zero
    expect(reduction).toBeGreaterThan(0);
    expect(reduction).toBeLessThan(294);
  });

  // Income above full clawback point (~$24,396): reduction reaches $0
  // $294 / 5.05% = $5,821.78 above $18,569 → $24,390.78
  it('returns $0 when clawback fully eliminates the reduction', () => {
    const ontarioTax = calculateOntarioTaxOnIncome(50000);
    expect(calculateLowIncomeReduction(ontarioTax, 50000)).toBe(0);
  });

  // Cannot reduce tax below zero: if Ontario tax < reduction, cap at Ontario tax
  it('caps the reduction at the basic Ontario tax (no negative tax)', () => {
    // Very small tax amount (e.g., $100 of Ontario tax) vs $294 reduction
    expect(calculateLowIncomeReduction(100, 15000)).toBe(100);
  });
});
