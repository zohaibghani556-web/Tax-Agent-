/**
 * Edge case tests for TaxAgent.ai tax engine.
 *
 * Tests scenarios that commonly trip up other tax tools:
 * - CPP over-deduction when multiple T4s push totals above the annual maximum
 * - Multiple T4s summed correctly across employers
 * - Newcomer partial-year proration flag
 * - RRSP over-contribution detection and flagging
 * - Capital gains at the flat 50% inclusion rate (2025 — no 2/3 threshold)
 */

import { describe, it, expect } from 'vitest';
import { calculateTaxReturn } from '../../src/lib/tax-engine/engine';
import { CPP, CPP2, EI } from '../../src/lib/tax-engine/constants';
import type {
  TaxProfile,
  TaxSlip,
  DeductionsCreditsInput,
} from '../../src/lib/tax-engine/types';

// ──────────────────────────────────────────────────────────────
// SHARED HELPERS
// ──────────────────────────────────────────────────────────────

const baseProfile = (overrides: Partial<TaxProfile> = {}): TaxProfile => ({
  id: 'test-id',
  userId: 'user-id',
  taxYear: 2025,
  legalName: 'Test User',
  dateOfBirth: '1985-06-15',
  maritalStatus: 'single',
  province: 'ON',
  residencyStatus: 'citizen',
  dependants: [],
  assessmentComplete: false,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const baseDeductions = (overrides: Partial<DeductionsCreditsInput> = {}): DeductionsCreditsInput => ({
  rrspContributions: 0,
  rrspContributionRoom: 10000,
  fhsaContributions: 0,
  unionDues: 0,
  childcareExpenses: 0,
  movingExpenses: 0,
  supportPaymentsMade: 0,
  carryingCharges: 0,
  studentLoanInterest: 0,
  medicalExpenses: [],
  donations: [],
  rentPaid: 0,
  propertyTaxPaid: 0,
  studentResidence: false,
  tuitionCarryforward: 0,
  capitalLossCarryforward: 0,
  nonCapitalLossCarryforward: 0,
  donationCarryforward: 0,
  politicalContributions: 0,
  digitalNewsSubscription: 0,
  hasDisabilityCredit: false,
  homeBuyersEligible: false,
  homeAccessibilityExpenses: 0,
  ...overrides,
});

const makeT4 = (box14: number, box16: number, box16A: number, box18: number, box22: number): TaxSlip => ({
  type: 'T4',
  data: {
    issuerName: 'Test Employer',
    box14,
    box16,
    box16A,
    box17: 0,
    box18,
    box20: 0,
    box22,
    box24: 0,
    box26: 0,
    box40: 0,
    box42: 0,
    box44: 0,
    box45: '1',
    box46: 0,
    box52: 0,
    box85: 0,
  },
});

// ──────────────────────────────────────────────────────────────
// TEST: CPP over-deduction is capped at the annual maximum
// ──────────────────────────────────────────────────────────────

describe('CPP over-deduction', () => {
  it('caps CPP1 credit at the annual maximum when over-deducted', () => {
    // Two employers each deduct the full CPP max — total is 2× the allowed amount
    const slips: TaxSlip[] = [
      makeT4(50000, CPP.maxEmployeeContribution, 0, 500, 8000),
      makeT4(30000, CPP.maxEmployeeContribution, 0, 400, 5000),
    ];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions(),
    );

    // The CPP credit used in tax calc must equal exactly the maximum, not 2×
    // Verify via the edge case flag — the over-deduction amount should be positive
    const cppFlag = result.edgeCaseFlags.find(f => f.code === 'CPP_OVER_DEDUCTED');
    expect(cppFlag).toBeDefined();
    expect(cppFlag!.type).toBe('info');
    expect(cppFlag!.affectedAmount).toBeCloseTo(CPP.maxEmployeeContribution, 1);

    // The tax result must not go negative (capping works)
    expect(result.netFederalTax).toBeGreaterThanOrEqual(0);
    expect(result.netOntarioTax).toBeGreaterThanOrEqual(0);
  });

  it('does NOT flag CPP over-deduction when within the maximum', () => {
    const slips: TaxSlip[] = [
      makeT4(45000, 2000, 0, EI.maxPremium, 7000),
    ];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions(),
    );

    const cppFlag = result.edgeCaseFlags.find(f => f.code === 'CPP_OVER_DEDUCTED');
    expect(cppFlag).toBeUndefined();
  });

  it('caps EI premium credit at the annual maximum', () => {
    // Two T4s, each deducting the full EI max
    const slips: TaxSlip[] = [
      makeT4(40000, 2000, 0, EI.maxPremium, 6000),
      makeT4(30000, 1500, 0, EI.maxPremium, 4000),
    ];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions(),
    );

    const eiFlag = result.edgeCaseFlags.find(f => f.code === 'EI_OVER_DEDUCTED');
    expect(eiFlag).toBeDefined();
    expect(eiFlag!.affectedAmount).toBeCloseTo(EI.maxPremium, 1);
  });
});

// ──────────────────────────────────────────────────────────────
// TEST: Multiple T4s sum correctly
// ──────────────────────────────────────────────────────────────

describe('Multiple T4s', () => {
  it('sums employment income from multiple T4s onto line 10100', () => {
    const slips: TaxSlip[] = [
      makeT4(30000, 1500, 0, 540, 4500),
      makeT4(25000, 1200, 0, 430, 3800),
      makeT4(15000,  800, 0, 246, 2100),
    ];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions(),
    );

    // Employment income line should be the sum of all Box 14 values
    expect(result.lineByLine[10100]).toBeCloseTo(70000, 0);
    expect(result.totalIncome).toBeCloseTo(70000, 0);
  });

  it('flags multiple T4s with an info edge case', () => {
    const slips: TaxSlip[] = [
      makeT4(40000, 2000, 0, 700, 6000),
      makeT4(30000, 1500, 0, 530, 4500),
    ];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions(),
    );

    const multiFlag = result.edgeCaseFlags.find(f => f.code === 'MULTIPLE_T4S');
    expect(multiFlag).toBeDefined();
    expect(multiFlag!.type).toBe('info');
  });

  it('does NOT flag MULTIPLE_T4S for a single T4', () => {
    const slips: TaxSlip[] = [makeT4(60000, 3000, 0, 1000, 9000)];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions(),
    );

    const multiFlag = result.edgeCaseFlags.find(f => f.code === 'MULTIPLE_T4S');
    expect(multiFlag).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// TEST: Newcomer proration is flagged correctly
// ──────────────────────────────────────────────────────────────

describe('Newcomer proration', () => {
  it('generates a NEWCOMER_PRORATION edge case flag for a mid-year arrival', () => {
    // Arrived July 1 — 184 days in Canada in 2025
    const profile = baseProfile({
      residencyStatus: 'newcomer',
      residencyStartDate: '2025-07-01',
    });

    const slips: TaxSlip[] = [makeT4(40000, 2000, 0, 700, 6000)];

    const result = calculateTaxReturn(
      profile,
      slips,
      [],
      [],
      baseDeductions(),
    );

    const flag = result.edgeCaseFlags.find(f => f.code === 'NEWCOMER_PRORATION');
    expect(flag).toBeDefined();
    expect(flag!.type).toBe('info');
    // 184 days from July 1 to Dec 31 inclusive
    expect(flag!.affectedAmount).toBeGreaterThanOrEqual(183);
    expect(flag!.affectedAmount).toBeLessThanOrEqual(185);
  });

  it('does NOT flag proration for a full-year resident', () => {
    const profile = baseProfile({ residencyStatus: 'citizen' });
    const slips: TaxSlip[] = [makeT4(60000, 3000, 0, 1000, 9000)];

    const result = calculateTaxReturn(profile, slips, [], [], baseDeductions());

    const flag = result.edgeCaseFlags.find(f => f.code === 'NEWCOMER_PRORATION');
    expect(flag).toBeUndefined();
  });

  it('does NOT flag proration when residencyStartDate is January 1 (full year)', () => {
    const profile = baseProfile({
      residencyStatus: 'newcomer',
      residencyStartDate: '2025-01-01',
    });
    const slips: TaxSlip[] = [makeT4(60000, 3000, 0, 1000, 9000)];

    const result = calculateTaxReturn(profile, slips, [], [], baseDeductions());

    const flag = result.edgeCaseFlags.find(f => f.code === 'NEWCOMER_PRORATION');
    expect(flag).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// TEST: RRSP over-contribution is flagged
// ──────────────────────────────────────────────────────────────

describe('RRSP over-contribution', () => {
  it('flags an over-contribution when contributions exceed room', () => {
    const slips: TaxSlip[] = [makeT4(60000, 3000, 0, 1000, 9000)];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions({
        rrspContributions: 8000,
        rrspContributionRoom: 5000, // Over by $3,000
      }),
    );

    const flag = result.edgeCaseFlags.find(f => f.code === 'RRSP_OVER_CONTRIBUTION');
    expect(flag).toBeDefined();
    expect(flag!.type).toBe('error');
    expect(flag!.affectedAmount).toBeCloseTo(3000, 0);
    expect(flag!.resolution).toContain('1%');
  });

  it('deducts only the available room despite over-contribution', () => {
    const slips: TaxSlip[] = [makeT4(60000, 3000, 0, 1000, 9000)];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions({
        rrspContributions: 8000,
        rrspContributionRoom: 5000,
      }),
    );

    // Net income must reflect only $5,000 RRSP deduction, not $8,000
    expect(result.lineByLine[20800]).toBeCloseTo(5000, 0);
    expect(result.netIncome).toBeCloseTo(55000, 0); // 60,000 − 5,000
  });

  it('does NOT flag over-contribution when within room', () => {
    const slips: TaxSlip[] = [makeT4(60000, 3000, 0, 1000, 9000)];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions({
        rrspContributions: 5000,
        rrspContributionRoom: 10000,
      }),
    );

    const flag = result.edgeCaseFlags.find(f => f.code === 'RRSP_OVER_CONTRIBUTION');
    expect(flag).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// TEST: Capital gains inclusion rate (2025 — flat 50%)
//   The proposed two-tier increase (>$250k at 66.67%) was deferred to 2026.
//   All 2025 capital gains use 50% inclusion regardless of amount.
// ──────────────────────────────────────────────────────────────

describe('Capital gains inclusion rate', () => {
  it('applies flat 50% for $350,000 gain (two-tier deferred to 2026)', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T5008',
        data: {
          issuerName: 'Brokerage Inc.',
          box15: '3',
          box16: 'STOCK',
          box20: 100000,    // ACB
          box21: 450000,    // Proceeds — gain of $350,000
          box22: 1000,
        },
      },
    ];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions(),
    );

    // Taxable: $350,000 × 50% = $175,000 (flat rate for 2025)
    const taxableGain = result.lineByLine[12700];
    expect(taxableGain).toBeCloseTo(175000, 0);
    expect(result.totalIncome).toBeCloseTo(175000, 0);
  });

  it('applies 50% inclusion for a gain exactly at $250,000 (at the tier boundary)', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T5008',
        data: {
          issuerName: 'Brokerage Inc.',
          box15: '3',
          box16: 'ETF',
          box20: 0,
          box21: 250000,   // ACB = 0, gain = $250,000 exactly
          box22: 100,
        },
      },
    ];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions(),
    );

    // 50% of $250,000 = $125,000 taxable (all in first tier)
    const taxableGain = result.lineByLine[12700];
    expect(taxableGain).toBeCloseTo(125000, 0);
  });

  it('applies 50% inclusion for a small capital gain (well below $250,000 threshold)', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T5008',
        data: {
          issuerName: 'Brokerage Inc.',
          box15: '3',
          box16: 'STOCK',
          box20: 5000,
          box21: 10000,    // Gain = $5,000
          box22: 50,
        },
      },
    ];

    const result = calculateTaxReturn(
      baseProfile(),
      slips,
      [],
      [],
      baseDeductions(),
    );

    // 50% of $5,000 = $2,500 taxable
    const taxableGain = result.lineByLine[12700];
    expect(taxableGain).toBeCloseTo(2500, 0);
  });
});
