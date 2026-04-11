import { describe, it, expect } from 'vitest';
import { validateTaxReturn } from './validator';
import type { TaxProfile, TaxSlip, DeductionsCreditsInput } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<TaxProfile> = {}): Partial<TaxProfile> {
  return {
    legalName: 'Jane Doe',
    dateOfBirth: '1985-06-15',
    maritalStatus: 'single',
    province: 'ON',
    ...overrides,
  };
}

function makeDeductions(overrides: Partial<DeductionsCreditsInput> = {}): Partial<DeductionsCreditsInput> {
  return {
    rrspContributions: 0,
    rrspContributionRoom: 0,
    medicalExpenses: [],
    donations: [],
    rentPaid: 0,
    propertyTaxPaid: 0,
    hasSpouseOrCL: false,
    hasEligibleDependant: false,
    ...overrides,
  };
}

function makeT4(box14 = 60000, box16 = 3000, box18 = 800, box22 = 10000): TaxSlip {
  return {
    type: 'T4',
    data: {
      issuerName: 'Employer Inc.',
      box14, box16, box16A: 0, box17: 0,
      box18, box20: 0, box22,
      box24: box14, box26: box14,
      box40: 0, box42: 0, box44: 0,
      box45: '0', box46: 0, box52: 0, box85: 0,
    },
  };
}

// ── Basic completeness ────────────────────────────────────────────────────────

describe('validateTaxReturn — profile checks', () => {
  it('error when legal name is missing', () => {
    const result = validateTaxReturn(makeProfile({ legalName: '' }), [], makeDeductions());
    const err = result.errors.find(e => e.code === 'MISSING_NAME');
    expect(err).toBeDefined();
  });

  it('error when date of birth is missing', () => {
    const result = validateTaxReturn(makeProfile({ dateOfBirth: undefined }), [], makeDeductions());
    const err = result.errors.find(e => e.code === 'MISSING_DOB');
    expect(err).toBeDefined();
  });

  it('error when marital status is missing', () => {
    const result = validateTaxReturn(makeProfile({ maritalStatus: undefined as unknown as 'single' }), [], makeDeductions());
    const err = result.errors.find(e => e.code === 'MISSING_MARITAL_STATUS');
    expect(err).toBeDefined();
  });

  it('no profile errors for a complete profile', () => {
    const result = validateTaxReturn(makeProfile(), [makeT4()], makeDeductions({ rentPaid: 12000 }));
    const profileErrors = result.errors.filter(e =>
      ['MISSING_NAME', 'MISSING_DOB', 'MISSING_MARITAL_STATUS'].includes(e.code)
    );
    expect(profileErrors).toHaveLength(0);
  });
});

// ── Slip checks ───────────────────────────────────────────────────────────────

describe('validateTaxReturn — slip checks', () => {
  it('warning when no slips uploaded', () => {
    const result = validateTaxReturn(makeProfile(), [], makeDeductions());
    const warn = result.warnings.find(w => w.code === 'NO_SLIPS');
    expect(warn).toBeDefined();
  });

  it('no NO_SLIPS warning when slips are present', () => {
    const result = validateTaxReturn(makeProfile(), [makeT4()], makeDeductions({ rentPaid: 1000 }));
    const warn = result.warnings.find(w => w.code === 'NO_SLIPS');
    expect(warn).toBeUndefined();
  });
});

// ── RRSP checks ───────────────────────────────────────────────────────────────

describe('validateTaxReturn — RRSP checks', () => {
  it('warning when RRSP contributions entered without room', () => {
    const result = validateTaxReturn(
      makeProfile(), [makeT4()],
      makeDeductions({ rrspContributions: 10000, rrspContributionRoom: 0, rentPaid: 12000 })
    );
    const warn = result.warnings.find(w => w.code === 'RRSP_ROOM_NOT_ENTERED');
    expect(warn).toBeDefined();
  });

  it('error when RRSP contributions exceed room + $2,000 buffer', () => {
    const result = validateTaxReturn(
      makeProfile(), [makeT4()],
      makeDeductions({ rrspContributions: 20000, rrspContributionRoom: 10000, rentPaid: 12000 })
    );
    // 20000 > 10000 + 2000 = 12000 → over-contribution of 8000
    const err = result.errors.find(e => e.code === 'RRSP_OVER_CONTRIBUTION');
    expect(err).toBeDefined();
  });

  it('no RRSP error when contributions are within room + buffer', () => {
    const result = validateTaxReturn(
      makeProfile(), [makeT4()],
      makeDeductions({ rrspContributions: 10000, rrspContributionRoom: 10000, rentPaid: 12000 })
    );
    const err = result.errors.find(e => e.code === 'RRSP_OVER_CONTRIBUTION');
    expect(err).toBeUndefined();
  });

  it('no RRSP error when no contributions made', () => {
    const result = validateTaxReturn(makeProfile(), [makeT4()], makeDeductions({ rentPaid: 12000 }));
    const rrsIssues = result.issues.filter(i => i.code.startsWith('RRSP'));
    expect(rrsIssues).toHaveLength(0);
  });
});

// ── CPP/EI over-deduction checks ──────────────────────────────────────────────

describe('validateTaxReturn — CPP/EI checks', () => {
  it('warning when CPP deducted exceeds annual max', () => {
    const overT4 = makeT4(80000, 5000, 1000);  // box16 = 5000 > max (4034.10)
    const result = validateTaxReturn(makeProfile(), [overT4], makeDeductions({ rentPaid: 12000 }));
    const warn = result.warnings.find(w => w.code === 'CPP_POSSIBLE_OVER_DEDUCTION');
    expect(warn).toBeDefined();
  });

  it('warning when EI deducted exceeds annual max', () => {
    const overT4 = makeT4(80000, 3000, 2000);  // box18 = 2000 > max (1077.48)
    const result = validateTaxReturn(makeProfile(), [overT4], makeDeductions({ rentPaid: 12000 }));
    const warn = result.warnings.find(w => w.code === 'EI_POSSIBLE_OVER_DEDUCTION');
    expect(warn).toBeDefined();
  });

  it('no CPP warning when within normal limits', () => {
    const normalT4 = makeT4(60000, 3000, 900);
    const result = validateTaxReturn(makeProfile(), [normalT4], makeDeductions({ rentPaid: 12000 }));
    const warn = result.warnings.find(w => w.code === 'CPP_POSSIBLE_OVER_DEDUCTION');
    expect(warn).toBeUndefined();
  });
});

// ── Dependant consistency ─────────────────────────────────────────────────────

describe('validateTaxReturn — dependant errors', () => {
  it('error when both spouse amount and eligible dependant are claimed', () => {
    const result = validateTaxReturn(
      makeProfile({ maritalStatus: 'married' }),
      [makeT4()],
      makeDeductions({
        hasSpouseOrCL: true,
        spouseNetIncome: 15000,
        hasEligibleDependant: true,
        rentPaid: 12000,
      })
    );
    const err = result.errors.find(e => e.code === 'ELIGIBLE_DEPENDANT_WITH_SPOUSE');
    expect(err).toBeDefined();
  });
});

// ── Ontario OTB check ─────────────────────────────────────────────────────────

describe('validateTaxReturn — Ontario OTB', () => {
  it('warning when neither rent nor property tax entered', () => {
    const result = validateTaxReturn(
      makeProfile(), [makeT4()],
      makeDeductions({ rentPaid: 0, propertyTaxPaid: 0 })
    );
    const warn = result.warnings.find(w => w.code === 'ONTARIO_OTB_INCOMPLETE');
    expect(warn).toBeDefined();
  });

  it('no OTB warning when rent is entered', () => {
    const result = validateTaxReturn(
      makeProfile(), [makeT4()],
      makeDeductions({ rentPaid: 18000 })
    );
    const warn = result.warnings.find(w => w.code === 'ONTARIO_OTB_INCOMPLETE');
    expect(warn).toBeUndefined();
  });
});

// ── Completion percentage ─────────────────────────────────────────────────────

describe('validateTaxReturn — completionPct', () => {
  it('minimal data → low completion percentage', () => {
    const result = validateTaxReturn(null, [], null);
    expect(result.completionPct).toBeLessThan(50);
  });

  it('complete data → high completion percentage', () => {
    const result = validateTaxReturn(
      makeProfile(),
      [makeT4()],
      makeDeductions({
        rrspContributions: 5000,
        rrspContributionRoom: 20000,
        medicalExpenses: [{ description: 'Dental', amount: 1200, forWhom: 'self' }],
        rentPaid: 18000,
      })
    );
    expect(result.completionPct).toBeGreaterThan(60);
  });

  it('completion is between 0 and 100', () => {
    const result = validateTaxReturn(makeProfile(), [makeT4()], makeDeductions({ rentPaid: 12000 }));
    expect(result.completionPct).toBeGreaterThanOrEqual(0);
    expect(result.completionPct).toBeLessThanOrEqual(100);
  });
});

// ── isFileable flag ───────────────────────────────────────────────────────────

describe('validateTaxReturn — isFileable', () => {
  it('not fileable when there are errors', () => {
    const result = validateTaxReturn(makeProfile({ legalName: '' }), [], null);
    expect(result.isFileable).toBe(false);
  });

  it('fileable with warnings only', () => {
    // No errors: complete profile, at least one slip, rent paid
    // Only warning: OTB (if no rent/property), but we add rent to avoid that
    const result = validateTaxReturn(
      makeProfile(),
      [makeT4()],
      makeDeductions({ rentPaid: 12000 })
    );
    expect(result.isFileable).toBe(true);
  });
});
