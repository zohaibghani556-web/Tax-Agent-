import { describe, it, expect } from 'vitest';
import { calculateInstalments } from './instalments';
import type { InstalmentInput } from './instalments';

function cent(n: number) { return Math.round(n * 100) / 100; }

function makeInput(overrides: Partial<InstalmentInput> = {}): InstalmentInput {
  return {
    currentYearBalanceOwing: 0,
    priorYearBalanceOwing: 0,
    twoYearsAgoBalanceOwing: 0,
    ...overrides,
  };
}

// ── Instalment requirement test ───────────────────────────────────────────────

describe('instalment requirement threshold', () => {
  it('no instalment required when all years below $3,000', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 2000,
      priorYearBalanceOwing: 1500,
      twoYearsAgoBalanceOwing: 500,
    }));
    expect(result.instalmentRequired).toBe(false);
  });

  it('no instalment when current year is below $3,000 even if prior years exceed', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 2500,
      priorYearBalanceOwing: 5000,
      twoYearsAgoBalanceOwing: 4000,
    }));
    expect(result.instalmentRequired).toBe(false);
  });

  it('instalment required: current > $3,000 AND prior year > $3,000', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 4000,
      priorYearBalanceOwing: 3500,
      twoYearsAgoBalanceOwing: 0,
    }));
    expect(result.instalmentRequired).toBe(true);
  });

  it('instalment required: current > $3,000 AND two-years-ago > $3,000', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 5000,
      priorYearBalanceOwing: 0,
      twoYearsAgoBalanceOwing: 4000,
    }));
    expect(result.instalmentRequired).toBe(true);
  });

  it('boundary: exactly $3,000 does NOT trigger requirement (must exceed)', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 3000,
      priorYearBalanceOwing: 3000,
      twoYearsAgoBalanceOwing: 3000,
    }));
    expect(result.instalmentRequired).toBe(false);
  });

  it('just above threshold: $3,001 triggers requirement', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 3001,
      priorYearBalanceOwing: 3001,
      twoYearsAgoBalanceOwing: 0,
    }));
    expect(result.instalmentRequired).toBe(true);
  });
});

// ── Prior-year method ─────────────────────────────────────────────────────────

describe('prior-year method calculations', () => {
  it('prior-year method: $8,000 prior → $2,000 quarterly', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 10000,
      priorYearBalanceOwing: 8000,
    }));
    expect(result.priorYearMethodQuarterly).toBe(2000);
    expect(result.priorYearMethodAnnual).toBe(8000);
  });

  it('prior-year method rounds to nearest cent', () => {
    // $10,001 / 4 = $2,500.25
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 5000,
      priorYearBalanceOwing: 10001,
      twoYearsAgoBalanceOwing: 4000,
    }));
    expect(result.priorYearMethodQuarterly).toBe(cent(10001 / 4));
  });

  it('prior-year method is zero when prior balance owing is zero or negative', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 6000,
      priorYearBalanceOwing: -500,  // refund last year
    }));
    expect(result.priorYearMethodQuarterly).toBe(0);
    expect(result.priorYearMethodAnnual).toBe(0);
  });
});

// ── Current-year method ───────────────────────────────────────────────────────

describe('current-year method calculations', () => {
  it('current-year method: $12,000 current → $3,000 quarterly', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 12000,
      priorYearBalanceOwing: 8000,
      twoYearsAgoBalanceOwing: 4000,
    }));
    expect(result.currentYearMethodQuarterly).toBe(3000);
    expect(result.currentYearMethodAnnual).toBe(12000);
  });
});

// ── No-calculation method ─────────────────────────────────────────────────────

describe('no-calculation method calculations', () => {
  it('no-calc method: first two payments = two-years-ago / 4', () => {
    // 2 years ago: $6,000 → Q1 = Q2 = $1,500
    // Prior year: $8,000 → remaining = 8000 - 1500 - 1500 = 5000 → Q3 = Q4 = $2,500
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 5000,
      priorYearBalanceOwing: 8000,
      twoYearsAgoBalanceOwing: 6000,
    }));
    expect(result.noCalcMethod.marchPayment).toBe(1500);
    expect(result.noCalcMethod.junePayment).toBe(1500);
    expect(result.noCalcMethod.septPayment).toBe(2500);
    expect(result.noCalcMethod.decPayment).toBe(2500);
  });

  it('no-calc method march and june are always equal', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 4000,
      priorYearBalanceOwing: 5000,
      twoYearsAgoBalanceOwing: 3200,
    }));
    expect(result.noCalcMethod.marchPayment).toBe(result.noCalcMethod.junePayment);
    expect(result.noCalcMethod.septPayment).toBe(result.noCalcMethod.decPayment);
  });

  it('no-calc method: zero prior years → all payments zero', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 5000,
      priorYearBalanceOwing: 0,
      twoYearsAgoBalanceOwing: 0,
    }));
    expect(result.noCalcMethod.marchPayment).toBe(0);
    expect(result.noCalcMethod.septPayment).toBe(0);
  });
});

// ── Recommended method ────────────────────────────────────────────────────────

describe('recommended method selection', () => {
  it('recommends current-year method when income drops significantly', () => {
    // Current year lower → current-year method is cheapest
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 3500,
      priorYearBalanceOwing: 12000,
      twoYearsAgoBalanceOwing: 10000,
    }));
    expect(result.recommendedMethod).toBe('current-year');
    expect(result.recommendedQuarterly).toBe(cent(3500 / 4));
  });

  it('recommends prior-year method when current income rises sharply', () => {
    // Current year is high; prior year was low → prior-year is cheaper
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 20000,
      priorYearBalanceOwing: 3200,
      twoYearsAgoBalanceOwing: 3100,
    }));
    expect(result.recommendedMethod).toBe('prior-year');
  });
});

// ── Due dates ─────────────────────────────────────────────────────────────────

describe('due dates', () => {
  it('returns exactly 4 quarterly due dates for 2026', () => {
    const result = calculateInstalments(makeInput());
    expect(result.dueDates).toHaveLength(4);
    expect(result.dueDates).toContain('2026-03-15');
    expect(result.dueDates).toContain('2026-06-15');
    expect(result.dueDates).toContain('2026-09-15');
    expect(result.dueDates).toContain('2026-12-15');
  });
});

// ── Warning message ───────────────────────────────────────────────────────────

describe('warning messages', () => {
  it('produces a warning message when instalments are required', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 5000,
      priorYearBalanceOwing: 4000,
      twoYearsAgoBalanceOwing: 0,
    }));
    expect(result.instalmentRequired).toBe(true);
    expect(result.warningMessage).not.toBeNull();
    expect(result.warningMessage).toContain('2026 instalment payments');
  });

  it('no warning when instalments not required', () => {
    const result = calculateInstalments(makeInput({
      currentYearBalanceOwing: 500,
      priorYearBalanceOwing: 100,
      twoYearsAgoBalanceOwing: 0,
    }));
    expect(result.instalmentRequired).toBe(false);
    // warningMessage may be null or a soft advisory — must not claim "required"
    if (result.warningMessage) {
      expect(result.warningMessage).not.toContain('required');
    }
  });
});
