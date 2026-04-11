import { describe, it, expect } from 'vitest';
import { calculateForeignTaxCredit } from './foreign-tax-credit';

describe('calculateForeignTaxCredit', () => {
  it('zero foreign income → all zeros', () => {
    const result = calculateForeignTaxCredit({
      foreignIncome: 0,
      foreignTaxesPaid: 0,
      netIncome: 80000,
      federalTaxBeforeCredit: 10000,
      ontarioTaxBeforeCredit: 5000,
    });
    expect(result.federalForeignTaxCredit).toBe(0);
    expect(result.ontarioForeignTaxCredit).toBe(0);
  });

  it('federal credit capped at Canadian tax on foreign income', () => {
    // $20k foreign income, $5k foreign taxes, but Canadian federal tax on $20k/(80k net) × $10k = $2,500
    const result = calculateForeignTaxCredit({
      foreignIncome: 20000,
      foreignTaxesPaid: 5000,      // foreign taxes exceed Canadian tax
      netIncome: 80000,
      federalTaxBeforeCredit: 10000,
      ontarioTaxBeforeCredit: 5000,
    });
    // Federal: min(10000 × 20/80, 5000) = min(2500, 5000) = 2500
    expect(result.federalForeignTaxCredit).toBe(2500);
    // Ontario: remaining = 5000-2500=2500; min(5000 × 20/80, 2500) = min(1250, 2500) = 1250
    expect(result.ontarioForeignTaxCredit).toBe(1250);
  });

  it('federal credit capped at foreign taxes paid when they are less than Canadian tax', () => {
    // $30k foreign income (50% of 60k net), $1k foreign taxes, Canadian federal = $15k
    const result = calculateForeignTaxCredit({
      foreignIncome: 30000,
      foreignTaxesPaid: 1000,       // small withholding
      netIncome: 60000,
      federalTaxBeforeCredit: 15000,
      ontarioTaxBeforeCredit: 7000,
    });
    // Federal: min(15000 × 0.5, 1000) = min(7500, 1000) = 1000
    expect(result.federalForeignTaxCredit).toBe(1000);
    // Ontario: remaining = 0
    expect(result.ontarioForeignTaxCredit).toBe(0);
    expect(result.unusedForeignTax).toBe(0);
  });

  it('foreign income equals net income → ratio = 1, full Canadian tax as ceiling', () => {
    const result = calculateForeignTaxCredit({
      foreignIncome: 50000,
      foreignTaxesPaid: 8000,
      netIncome: 50000,
      federalTaxBeforeCredit: 8000,
      ontarioTaxBeforeCredit: 4000,
    });
    // Ratio = 1; federal min(8000, 8000) = 8000
    expect(result.federalForeignTaxCredit).toBe(8000);
    // Ontario: remaining = 0; credit = 0
    expect(result.ontarioForeignTaxCredit).toBe(0);
  });

  it('unused foreign tax when foreign taxes exceed combined Canadian tax ceiling', () => {
    const result = calculateForeignTaxCredit({
      foreignIncome: 10000,
      foreignTaxesPaid: 5000,
      netIncome: 40000,
      federalTaxBeforeCredit: 5000,
      ontarioTaxBeforeCredit: 2500,
    });
    // Ratio = 10000/40000 = 0.25
    // Federal: min(5000 × 0.25, 5000) = 1250
    // Ontario: remaining = 3750; min(2500 × 0.25, 3750) = 625
    // Unused = 3750 - 625 = 3125
    expect(result.federalForeignTaxCredit).toBe(1250);
    expect(result.ontarioForeignTaxCredit).toBe(625);
    expect(result.unusedForeignTax).toBe(3125);
  });

  it('zero net income → all zeros (avoid division by zero)', () => {
    const result = calculateForeignTaxCredit({
      foreignIncome: 5000,
      foreignTaxesPaid: 500,
      netIncome: 0,
      federalTaxBeforeCredit: 0,
      ontarioTaxBeforeCredit: 0,
    });
    expect(result.federalForeignTaxCredit).toBe(0);
    expect(result.ontarioForeignTaxCredit).toBe(0);
  });

  it('t1135Required false when foreign income ≤ $100,000', () => {
    const result = calculateForeignTaxCredit({
      foreignIncome: 50000,
      foreignTaxesPaid: 1000,
      netIncome: 100000,
      federalTaxBeforeCredit: 5000,
      ontarioTaxBeforeCredit: 2000,
    });
    expect(result.t1135Required).toBe(false);
  });

  it('t1135Required true when foreign income > $100,000', () => {
    const result = calculateForeignTaxCredit({
      foreignIncome: 150000,
      foreignTaxesPaid: 20000,
      netIncome: 300000,
      federalTaxBeforeCredit: 50000,
      ontarioTaxBeforeCredit: 25000,
    });
    expect(result.t1135Required).toBe(true);
  });
});
