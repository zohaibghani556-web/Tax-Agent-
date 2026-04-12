import { describe, it, expect } from 'vitest';
import { getConstantsForYear, CONSTANTS_BY_YEAR } from './constants-by-year';

// ── getConstantsForYear — error handling ─────────────────────────────────────

describe('getConstantsForYear — invalid year', () => {
  it('throws for a year not in the map (e.g. 2020)', () => {
    expect(() => getConstantsForYear(2020)).toThrow();
  });

  it('throws for 2025 (use constants.ts directly for current year)', () => {
    expect(() => getConstantsForYear(2025)).toThrow();
  });

  it('error message names available years', () => {
    try {
      getConstantsForYear(2019);
      expect.fail('expected throw');
    } catch (e: unknown) {
      expect((e as Error).message).toMatch('Available years');
    }
  });
});

// ── 2024 — Federal BPA (task-specified: $15,705) ─────────────────────────────

describe('getConstantsForYear(2024) — federal BPA', () => {
  it('federal BPA max = $15,705 (CRA Schedule 1 2024 line 30000)', () => {
    const c = getConstantsForYear(2024);
    expect(c.federalBPA.max).toBe(15705);
  });

  it('federal BPA base + additional = max', () => {
    const c = getConstantsForYear(2024);
    expect(c.federalBPA.base + c.federalBPA.additional).toBe(c.federalBPA.max);
  });

  it('federal BPA additional ($1,549) claws back starting at 29% bracket ($173,205)', () => {
    const c = getConstantsForYear(2024);
    expect(c.federalBPA.additional).toBe(1549);
    expect(c.federalBPA.clawbackStart).toBe(173205);
  });
});

// ── 2023 — Federal BPA (task-specified: $15,000) ─────────────────────────────

describe('getConstantsForYear(2023) — federal BPA', () => {
  it('federal BPA max = $15,000 (CRA Schedule 1 2023 line 30000)', () => {
    const c = getConstantsForYear(2023);
    expect(c.federalBPA.max).toBe(15000);
  });

  it('federal BPA base + additional = $15,000', () => {
    const c = getConstantsForYear(2023);
    expect(c.federalBPA.base + c.federalBPA.additional).toBe(15000);
  });
});

// ── 2022 — Federal BPA ($14,398) ─────────────────────────────────────────────

describe('getConstantsForYear(2022) — federal BPA', () => {
  it('federal BPA max = $14,398', () => {
    const c = getConstantsForYear(2022);
    expect(c.federalBPA.max).toBe(14398);
  });
});

// ── Ontario BPA by year ───────────────────────────────────────────────────────

describe('Ontario BPA — historical values', () => {
  it('2024 Ontario BPA = $11,865', () => {
    expect(getConstantsForYear(2024).ontarioBPA).toBe(11865);
  });

  it('2023 Ontario BPA = $11,141', () => {
    expect(getConstantsForYear(2023).ontarioBPA).toBe(11141);
  });

  it('2022 Ontario BPA = $10,783', () => {
    expect(getConstantsForYear(2022).ontarioBPA).toBe(10783);
  });

  it('Ontario BPA increases year over year (2022 < 2023 < 2024)', () => {
    const bpa22 = getConstantsForYear(2022).ontarioBPA;
    const bpa23 = getConstantsForYear(2023).ontarioBPA;
    const bpa24 = getConstantsForYear(2024).ontarioBPA;
    expect(bpa22).toBeLessThan(bpa23);
    expect(bpa23).toBeLessThan(bpa24);
  });
});

// ── CPP/EI maximums ───────────────────────────────────────────────────────────

describe('CPP maximums by year', () => {
  it('2024 max employee CPP contribution = $3,867.50', () => {
    expect(getConstantsForYear(2024).cpp.maxEmployeeContribution).toBe(3867.50);
  });

  it('2023 max employee CPP contribution = $3,754.45', () => {
    expect(getConstantsForYear(2023).cpp.maxEmployeeContribution).toBe(3754.45);
  });

  it('2022 max employee CPP contribution = $3,499.80', () => {
    expect(getConstantsForYear(2022).cpp.maxEmployeeContribution).toBe(3499.80);
  });

  it('CPP max pensionable earnings increases each year', () => {
    const e22 = getConstantsForYear(2022).cpp.maxPensionableEarnings;
    const e23 = getConstantsForYear(2023).cpp.maxPensionableEarnings;
    const e24 = getConstantsForYear(2024).cpp.maxPensionableEarnings;
    expect(e22).toBeLessThan(e23);
    expect(e23).toBeLessThan(e24);
  });
});

describe('CPP2 by year', () => {
  it('2024 CPP2 exists (first year)', () => {
    expect(getConstantsForYear(2024).cpp2).not.toBeNull();
    expect(getConstantsForYear(2024).cpp2?.maxEmployeeContribution).toBe(188.00);
  });

  it('2023 CPP2 is null (did not exist)', () => {
    expect(getConstantsForYear(2023).cpp2).toBeNull();
  });

  it('2022 CPP2 is null (did not exist)', () => {
    expect(getConstantsForYear(2022).cpp2).toBeNull();
  });
});

describe('EI maximums by year', () => {
  it('2024 max EI premium = $1,049.12', () => {
    expect(getConstantsForYear(2024).ei.maxPremium).toBe(1049.12);
  });

  it('2023 max EI premium = $1,002.45', () => {
    expect(getConstantsForYear(2023).ei.maxPremium).toBe(1002.45);
  });

  it('2022 max EI premium = $952.74', () => {
    expect(getConstantsForYear(2022).ei.maxPremium).toBe(952.74);
  });

  it('max insurable earnings increase year over year', () => {
    expect(getConstantsForYear(2022).ei.maxInsurableEarnings)
      .toBeLessThan(getConstantsForYear(2023).ei.maxInsurableEarnings);
    expect(getConstantsForYear(2023).ei.maxInsurableEarnings)
      .toBeLessThan(getConstantsForYear(2024).ei.maxInsurableEarnings);
  });
});

// ── Capital gains inclusion rates ─────────────────────────────────────────────

describe('Capital gains — inclusion rate by year', () => {
  it('2024: two-tier system (50% low, 66.67% high, $250,000 threshold)', () => {
    const cg = getConstantsForYear(2024).capitalGains;
    expect(cg.inclusionRateLow).toBe(0.50);
    expect(cg.inclusionRateHigh).toBe(0.6667);
    expect(cg.threshold).toBe(250000);
  });

  it('2023: flat 50% inclusion rate, no second tier', () => {
    const cg = getConstantsForYear(2023).capitalGains;
    expect(cg.inclusionRateLow).toBe(0.50);
    expect(cg.inclusionRateHigh).toBeNull();
    expect(cg.threshold).toBeNull();
  });

  it('2022: flat 50% inclusion rate, no second tier', () => {
    const cg = getConstantsForYear(2022).capitalGains;
    expect(cg.inclusionRateLow).toBe(0.50);
    expect(cg.inclusionRateHigh).toBeNull();
  });
});

// ── AMT — pre/post Budget 2024 reform ────────────────────────────────────────

describe('AMT — historical rates', () => {
  it('2024: reformed AMT — 20.5% rate, $173,205 exemption (Budget 2024)', () => {
    const amt = getConstantsForYear(2024).amt;
    expect(amt.rate).toBe(0.205);
    expect(amt.exemption).toBe(173205);
  });

  it('2023: old AMT — 15% rate, $40,000 exemption', () => {
    const amt = getConstantsForYear(2023).amt;
    expect(amt.rate).toBe(0.15);
    expect(amt.exemption).toBe(40000);
  });

  it('2022: old AMT — 15% rate, $40,000 exemption', () => {
    const amt = getConstantsForYear(2022).amt;
    expect(amt.rate).toBe(0.15);
    expect(amt.exemption).toBe(40000);
  });
});

// ── RRSP limits ───────────────────────────────────────────────────────────────

describe('RRSP max contribution by year', () => {
  it('2024: $31,560', () => {
    expect(getConstantsForYear(2024).rrspMaxContribution).toBe(31560);
  });

  it('2023: $30,780', () => {
    expect(getConstantsForYear(2023).rrspMaxContribution).toBe(30780);
  });

  it('2022: $29,210', () => {
    expect(getConstantsForYear(2022).rrspMaxContribution).toBe(29210);
  });

  it('RRSP limit increases year over year', () => {
    expect(getConstantsForYear(2022).rrspMaxContribution)
      .toBeLessThan(getConstantsForYear(2023).rrspMaxContribution);
    expect(getConstantsForYear(2023).rrspMaxContribution)
      .toBeLessThan(getConstantsForYear(2024).rrspMaxContribution);
  });
});

// ── Federal brackets — spot checks ───────────────────────────────────────────

describe('Federal brackets — structure and ordering', () => {
  for (const year of [2022, 2023, 2024] as const) {
    it(`${year}: five brackets, all rates set, ascending by min`, () => {
      const brackets = getConstantsForYear(year).federalBrackets;
      expect(brackets).toHaveLength(5);
      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i].min).toBeGreaterThan(brackets[i - 1].min);
      }
    });
  }

  it('2024 first bracket max = $55,867', () => {
    expect(getConstantsForYear(2024).federalBrackets[0].max).toBe(55867);
  });

  it('2023 first bracket max = $53,359', () => {
    expect(getConstantsForYear(2023).federalBrackets[0].max).toBe(53359);
  });

  it('2022 first bracket max = $50,197', () => {
    expect(getConstantsForYear(2022).federalBrackets[0].max).toBe(50197);
  });
});

// ── CONSTANTS_BY_YEAR export ──────────────────────────────────────────────────

describe('CONSTANTS_BY_YEAR map', () => {
  it('contains entries for 2022, 2023, 2024', () => {
    expect(Object.keys(CONSTANTS_BY_YEAR).map(Number).sort()).toEqual([2022, 2023, 2024]);
  });

  it('each entry year field matches the map key', () => {
    for (const [key, val] of Object.entries(CONSTANTS_BY_YEAR)) {
      expect(val.year).toBe(Number(key));
    }
  });
});
