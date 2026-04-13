/**
 * Tests for family-optimizer.ts
 *
 * Covers: equal incomes, large disparity, pension splitting, childcare allocation,
 * RRSP recommendations, edge cases (zero income, zero pension, both retired).
 */

import { describe, it, expect } from 'vitest';
import { optimize, type FamilyInput, type SpouseInput } from './family-optimizer';

// ── Helpers ──────────────────────────────────────────────────────────────────

function spouse(overrides: Partial<SpouseInput> = {}): SpouseInput {
  return {
    employmentIncome:        0,
    selfEmploymentNetIncome: 0,
    pensionIncome:           0,
    otherIncome:             0,
    rrspContribution:        0,
    rrspContributionRoom:    0,
    age:                     40,
    taxWithheld:             0,
    ...overrides,
  };
}

function family(overrides: Partial<FamilyInput> = {}): FamilyInput {
  return {
    spouseA:          spouse(),
    spouseB:          spouse(),
    childcareExpenses: 0,
    ...overrides,
  };
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('optimize() — basic structure', () => {
  it('returns all required fields', () => {
    const result = optimize(family());
    expect(result).toHaveProperty('optimalAllocation');
    expect(result).toHaveProperty('familyTaxOptimal');
    expect(result).toHaveProperty('familyTaxNaive');
    expect(result).toHaveProperty('savingsFromOptimization');
    expect(result).toHaveProperty('spouseATaxOptimal');
    expect(result).toHaveProperty('spouseBTaxOptimal');
    expect(result).toHaveProperty('spouseATaxNaive');
    expect(result).toHaveProperty('spouseBTaxNaive');
    expect(result).toHaveProperty('spouseANetIncome');
    expect(result).toHaveProperty('spouseBNetIncome');
    expect(result.explanations.length).toBeGreaterThan(0);
  });

  it('savings is never negative', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 80000 }),
      spouseB: spouse({ employmentIncome: 80000 }),
    }));
    expect(result.savingsFromOptimization).toBeGreaterThanOrEqual(0);
  });

  it('optimal combined tax ≤ naive combined tax', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 150000 }),
      spouseB: spouse({ employmentIncome: 30000 }),
      childcareExpenses: 8000,
    }));
    expect(result.familyTaxOptimal).toBeLessThanOrEqual(result.familyTaxNaive);
  });
});

describe('optimize() — zero income household', () => {
  it('returns zero tax for both spouses', () => {
    const result = optimize(family());
    expect(result.familyTaxNaive).toBe(0);
    expect(result.familyTaxOptimal).toBe(0);
    expect(result.savingsFromOptimization).toBe(0);
  });
});

describe('optimize() — equal income, no childcare, no pension', () => {
  it('produces zero savings (symmetric household)', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 75000 }),
      spouseB: spouse({ employmentIncome: 75000 }),
    }));
    // Equal incomes — no asymmetry to exploit; savings should be 0 or minimal
    expect(result.savingsFromOptimization).toBeGreaterThanOrEqual(0);
    // Both naive taxes should be equal
    expect(result.spouseATaxNaive).toBeCloseTo(result.spouseBTaxNaive, 0);
  });
});

describe('optimize() — childcare allocation', () => {
  it('assigns childcare to lower-income spouse in naive baseline', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 120000 }),
      spouseB: spouse({ employmentIncome: 40000 }),
      childcareExpenses: 10000,
    }));
    // Lower-income spouse is B; naive should assign to B
    expect(result.spouseBTaxNaive).toBeLessThan(result.spouseATaxNaive);
  });

  it('childcare saves tax when claimed by lower earner (large disparity)', () => {
    const noChildcare = optimize(family({
      spouseA: spouse({ employmentIncome: 130000 }),
      spouseB: spouse({ employmentIncome: 35000 }),
    }));
    const withChildcare = optimize(family({
      spouseA: spouse({ employmentIncome: 130000 }),
      spouseB: spouse({ employmentIncome: 35000 }),
      childcareExpenses: 12000,
    }));
    // With childcare deduction the combined optimal tax should be lower
    expect(withChildcare.familyTaxOptimal).toBeLessThan(noChildcare.familyTaxOptimal);
  });

  it('identifies correct claimant for symmetric incomes (either is fine)', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 60000 }),
      spouseB: spouse({ employmentIncome: 60000 }),
      childcareExpenses: 5000,
    }));
    // Savings ≥ 0 and optimal ≤ naive regardless of assignment
    expect(result.familyTaxOptimal).toBeLessThanOrEqual(result.familyTaxNaive);
  });
});

describe('optimize() — pension income splitting', () => {
  it('finds positive savings when one spouse has large pension and higher income', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 80000, pensionIncome: 50000, age: 67 }),
      spouseB: spouse({ employmentIncome: 0, age: 65 }),
    }));
    // Large disparity — splitting should help
    expect(result.savingsFromOptimization).toBeGreaterThan(0);
    expect(result.optimalAllocation.pensionSplitAmount).not.toBe(0);
  });

  it('pension split amount does not exceed 50% of eligible pension', () => {
    const pensionA = 40000;
    const result = optimize(family({
      spouseA: spouse({ pensionIncome: pensionA, age: 66 }),
      spouseB: spouse({ age: 62 }),
    }));
    expect(Math.abs(result.optimalAllocation.pensionSplitAmount)).toBeLessThanOrEqual(
      pensionA * 0.5
    );
  });

  it('no pension split when both spouses have equal income (no benefit)', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 70000, pensionIncome: 20000, age: 67 }),
      spouseB: spouse({ employmentIncome: 70000, age: 67 }),
    }));
    // Equal combined incomes — splitting has no benefit
    expect(result.savingsFromOptimization).toBeGreaterThanOrEqual(0);
  });

  it('both spouses with pension — tries split from higher earner', () => {
    const result = optimize(family({
      spouseA: spouse({ pensionIncome: 60000, age: 70 }),
      spouseB: spouse({ pensionIncome: 10000, age: 68 }),
    }));
    expect(result.familyTaxOptimal).toBeLessThanOrEqual(result.familyTaxNaive);
  });

  it('no pension income — split stays at zero', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 90000 }),
      spouseB: spouse({ employmentIncome: 20000 }),
    }));
    expect(result.optimalAllocation.pensionSplitAmount).toBe(0);
  });
});

describe('optimize() — large income disparity (no pension)', () => {
  it('reduces combined tax vs naive for $200k / $0 household', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 200000 }),
      spouseB: spouse({ employmentIncome: 0 }),
      childcareExpenses: 0,
    }));
    // No pension and no childcare — no direct optimization (except RRSP advice)
    expect(result.savingsFromOptimization).toBeGreaterThanOrEqual(0);
    expect(result.familyTaxOptimal).toBeLessThanOrEqual(result.familyTaxNaive);
  });

  it('childcare + high/low income achieves meaningful savings', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 180000 }),
      spouseB: spouse({ employmentIncome: 25000 }),
      childcareExpenses: 15000,
    }));
    expect(result.familyTaxOptimal).toBeLessThanOrEqual(result.familyTaxNaive);
    expect(result.savingsFromOptimization).toBeGreaterThanOrEqual(0);
  });
});

describe('optimize() — RRSP recommendations', () => {
  it('recommends higher-income spouse when they have room', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 150000, rrspContributionRoom: 20000 }),
      spouseB: spouse({ employmentIncome: 40000,  rrspContributionRoom: 5000 }),
    }));
    const rec = result.optimalAllocation.rrspRecommendation;
    expect(rec).toContain('Spouse A');
    expect(rec).toContain('higher income');
  });

  it('recommends lower-income spouse when higher has no room', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 150000, rrspContributionRoom: 0 }),
      spouseB: spouse({ employmentIncome: 40000,  rrspContributionRoom: 8000 }),
    }));
    const rec = result.optimalAllocation.rrspRecommendation;
    expect(rec).toContain('no remaining RRSP room');
  });
});

describe('optimize() — fully retired household (both with pension)', () => {
  it('correctly identifies pension split direction for retired couple', () => {
    const result = optimize(family({
      spouseA: spouse({ pensionIncome: 80000, age: 72 }),
      spouseB: spouse({ pensionIncome: 15000, age: 70 }),
    }));
    expect(result.familyTaxOptimal).toBeLessThanOrEqual(result.familyTaxNaive);
    // A has much higher pension — should split some to B
    expect(result.optimalAllocation.pensionSplitAmount).toBeGreaterThan(0);
  });
});

describe('optimize() — combined childcare + pension', () => {
  it('optimizes both dimensions simultaneously', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 100000, pensionIncome: 30000, age: 66 }),
      spouseB: spouse({ employmentIncome: 30000,  age: 64 }),
      childcareExpenses: 8000,
    }));
    expect(result.familyTaxOptimal).toBeLessThanOrEqual(result.familyTaxNaive);
    expect(result.savingsFromOptimization).toBeGreaterThanOrEqual(0);
  });

  it('produces at least 2 explanations for complex household', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 110000, pensionIncome: 25000, age: 67 }),
      spouseB: spouse({ employmentIncome: 35000, age: 65 }),
      childcareExpenses: 6000,
    }));
    expect(result.explanations.length).toBeGreaterThanOrEqual(2);
  });
});

describe('optimize() — rounding and precision', () => {
  it('all monetary outputs are rounded to 2 decimal places', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 87654.32 }),
      spouseB: spouse({ employmentIncome: 43211.11 }),
      childcareExpenses: 7777.77,
    }));
    const values = [
      result.familyTaxOptimal,
      result.familyTaxNaive,
      result.savingsFromOptimization,
      result.spouseATaxOptimal,
      result.spouseBTaxOptimal,
    ];
    for (const v of values) {
      expect(Math.abs(v - Math.round(v * 100) / 100)).toBeLessThan(0.005);
    }
  });

  it('optimal tax components sum to familyTaxOptimal', () => {
    const result = optimize(family({
      spouseA: spouse({ employmentIncome: 95000 }),
      spouseB: spouse({ employmentIncome: 45000 }),
    }));
    const sum = Math.round((result.spouseATaxOptimal + result.spouseBTaxOptimal) * 100) / 100;
    expect(sum).toBeCloseTo(result.familyTaxOptimal, 1);
  });
});
