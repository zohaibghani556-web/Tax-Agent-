import { describe, it, expect } from 'vitest';
import {
  calculateMovingExpenses,
  passes40kmTest,
} from './moving-expenses';
import type { MovingExpensesInput } from '../types';

// Default eligible input — 50 km reduction, expenses well under income limit
function makeInput(overrides: Partial<MovingExpensesInput> = {}): MovingExpensesInput {
  return {
    movingCosts: 0,
    travelCosts: 0,
    temporaryLiving: 0,
    sellingCosts: 0,
    legalFeesPurchase: 0,
    leaseCancellationPenalty: 0,
    vacantHomeMaintenance: 0,
    incomeAtNewLocation: 50000,
    priorYearCarryforward: 0,
    distanceOldHomeToNewWork: 100,
    distanceNewHomeToNewWork: 50,   // 50 km closer → passes 40 km test
    ...overrides,
  };
}

// ── 40 km Test ───────────────────────────────────────────────────────────────

describe('passes40kmTest', () => {
  it('exactly 40 km closer → passes (boundary)', () => {
    expect(passes40kmTest(90, 50)).toBe(true);
  });

  it('39 km closer → fails (below threshold)', () => {
    expect(passes40kmTest(89, 50)).toBe(false);
  });

  it('100 km closer → passes', () => {
    expect(passes40kmTest(150, 50)).toBe(true);
  });

  it('new home farther from work → fails', () => {
    expect(passes40kmTest(50, 100)).toBe(false);
  });

  it('no change in distance → fails', () => {
    expect(passes40kmTest(50, 50)).toBe(false);
  });
});

// ── Ineligible — 40 km test failure ─────────────────────────────────────────

describe('calculateMovingExpenses — ineligible (40 km test)', () => {
  it('returns eligible=false and all zeros when only 30 km closer', () => {
    const r = calculateMovingExpenses(makeInput({
      distanceOldHomeToNewWork: 80,
      distanceNewHomeToNewWork: 50,   // 30 km closer — fails
      movingCosts: 5000,
    }));
    expect(r.eligible).toBe(false);
    expect(r.totalEligibleExpenses).toBe(0);
    expect(r.currentYearDeduction).toBe(0);
    expect(r.carryforwardToNextYear).toBe(0);
  });

  it('39.5 km closer → ineligible (fractional distance below 40 km)', () => {
    const r = calculateMovingExpenses(makeInput({
      distanceOldHomeToNewWork: 89.5,
      distanceNewHomeToNewWork: 50,
      movingCosts: 3000,
    }));
    expect(r.eligible).toBe(false);
  });
});

// ── Full deduction — expenses below income limit ──────────────────────────────

describe('calculateMovingExpenses — full deduction', () => {
  it('moving costs only, well under income limit', () => {
    const r = calculateMovingExpenses(makeInput({ movingCosts: 3000 }));
    expect(r.eligible).toBe(true);
    expect(r.totalEligibleExpenses).toBe(3000);
    expect(r.currentYearDeduction).toBe(3000);
    expect(r.carryforwardToNextYear).toBe(0);
  });

  it('multiple expense categories summed correctly', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 3000,
      travelCosts: 500,
      temporaryLiving: 1000,
      incomeAtNewLocation: 50000,
    }));
    expect(r.totalEligibleExpenses).toBe(4500);
    expect(r.currentYearDeduction).toBe(4500);
    expect(r.carryforwardToNextYear).toBe(0);
  });

  it('expenses exactly equal to income limit → full deduction, zero carryforward', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 10000,
      incomeAtNewLocation: 10000,
    }));
    expect(r.currentYearDeduction).toBe(10000);
    expect(r.carryforwardToNextYear).toBe(0);
  });
});

// ── Partial deduction — income cap applies ───────────────────────────────────

describe('calculateMovingExpenses — partial deduction + carryforward', () => {
  it('expenses exceed income at new location → capped, excess carried forward', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 8000,
      sellingCosts: 5000,
      incomeAtNewLocation: 10000,
    }));
    expect(r.totalEligibleExpenses).toBe(13000);
    expect(r.currentYearDeduction).toBe(10000);
    expect(r.carryforwardToNextYear).toBe(3000);
  });

  it('zero income at new location → entire expense amount carries forward', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 6000,
      incomeAtNewLocation: 0,
    }));
    expect(r.totalEligibleExpenses).toBe(6000);
    expect(r.currentYearDeduction).toBe(0);
    expect(r.carryforwardToNextYear).toBe(6000);
  });

  it('small income at new location → proportional deduction and carryforward', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 5000,
      sellingCosts: 3000,
      incomeAtNewLocation: 4000,
    }));
    expect(r.currentYearDeduction).toBe(4000);
    expect(r.carryforwardToNextYear).toBe(4000);
  });
});

// ── Prior year carryforward ──────────────────────────────────────────────────

describe('calculateMovingExpenses — prior year carryforward', () => {
  it('carryforward added to current expenses before income cap applied', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 3000,
      priorYearCarryforward: 4000,
      incomeAtNewLocation: 5000,
    }));
    expect(r.totalEligibleExpenses).toBe(7000);
    expect(r.currentYearDeduction).toBe(5000);
    expect(r.carryforwardToNextYear).toBe(2000);
  });

  it('carryforward alone (no current expenses) deductible against new location income', () => {
    const r = calculateMovingExpenses(makeInput({
      priorYearCarryforward: 2500,
      incomeAtNewLocation: 40000,
    }));
    expect(r.totalEligibleExpenses).toBe(2500);
    expect(r.currentYearDeduction).toBe(2500);
    expect(r.carryforwardToNextYear).toBe(0);
  });

  it('carryforward fully absorbed when income limit is large', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 1000,
      priorYearCarryforward: 8000,
      incomeAtNewLocation: 100000,
    }));
    expect(r.currentYearDeduction).toBe(9000);
    expect(r.carryforwardToNextYear).toBe(0);
  });
});

// ── All seven expense categories ─────────────────────────────────────────────

describe('calculateMovingExpenses — all expense categories', () => {
  it('sums all seven ITA s.62(3) categories correctly', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts:              2000,   // s.62(3)(a)
      travelCosts:               400,   // s.62(3)(e) travel
      temporaryLiving:           800,   // s.62(3)(e) temporary living (≤15 days)
      sellingCosts:             5000,   // s.62(3)(b)
      legalFeesPurchase:        1500,   // s.62(3)(c)
      leaseCancellationPenalty:  600,   // s.62(3)(d)
      vacantHomeMaintenance:    1200,   // s.62(3)(f)
      incomeAtNewLocation:    100000,
    }));
    expect(r.totalEligibleExpenses).toBe(11500);
    expect(r.currentYearDeduction).toBe(11500);
    expect(r.carryforwardToNextYear).toBe(0);
  });
});

// ── Boundary — exactly 40 km ─────────────────────────────────────────────────

describe('calculateMovingExpenses — 40 km boundary', () => {
  it('exactly 40 km closer → eligible, deduction applies normally', () => {
    const r = calculateMovingExpenses(makeInput({
      distanceOldHomeToNewWork: 90,
      distanceNewHomeToNewWork: 50,   // exactly 40 km closer
      movingCosts: 3000,
    }));
    expect(r.eligible).toBe(true);
    expect(r.currentYearDeduction).toBe(3000);
  });

  it('39 km closer → ineligible, no deduction', () => {
    const r = calculateMovingExpenses(makeInput({
      distanceOldHomeToNewWork: 89,
      distanceNewHomeToNewWork: 50,   // 39 km closer
      movingCosts: 3000,
    }));
    expect(r.eligible).toBe(false);
    expect(r.currentYearDeduction).toBe(0);
  });
});

// ── Rounding ─────────────────────────────────────────────────────────────────

describe('calculateMovingExpenses — CRA rounding', () => {
  it('cent-level expense values are rounded to nearest cent', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 1234.56,
      travelCosts:  789.44,       // sum = exactly 2024.00
      incomeAtNewLocation: 50000,
    }));
    expect(r.totalEligibleExpenses).toBe(2024.00);
    expect(r.currentYearDeduction).toBe(2024.00);
    expect(r.carryforwardToNextYear).toBe(0);
  });
});

// ── Negative guard ────────────────────────────────────────────────────────────

describe('calculateMovingExpenses — negative value guards', () => {
  it('negative temporaryLiving treated as zero (guard against invalid input)', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 2000,
      temporaryLiving: -500,   // should not reduce total
    }));
    expect(r.totalEligibleExpenses).toBe(2000);
  });

  it('negative priorYearCarryforward treated as zero', () => {
    const r = calculateMovingExpenses(makeInput({
      movingCosts: 1000,
      priorYearCarryforward: -200,
    }));
    expect(r.totalEligibleExpenses).toBe(1000);
  });
});
