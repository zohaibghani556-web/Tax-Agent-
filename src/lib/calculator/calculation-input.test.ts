import { describe, expect, it } from 'vitest';
import { calculateTaxReturn } from '@/lib/tax-engine/engine';
import type { TaxProfile } from '@/lib/tax-engine/types';
import type { SavedSlip } from '@/lib/supabase/tax-data';
import {
  DEFAULT_CALCULATOR_USER_DEDUCTIONS,
  buildCalculatorDeductions,
  buildCalculatorProfile,
  savedSlipToTaxSlip,
  savedSlipsToTaxSlips,
} from './calculation-input';

describe('calculator calculation input assembly', () => {
  it('passes RRSP contribution room through to the engine input', () => {
    const deductions = buildCalculatorDeductions({
      ...DEFAULT_CALCULATOR_USER_DEDUCTIONS,
      rrspContributions: 10000,
      rrspContributionRoom: 3000,
    });

    expect(deductions.rrspContributions).toBe(10000);
    expect(deductions.rrspContributionRoom).toBe(3000);
  });

  it('normalizes scalar calculator fields into engine deductions', () => {
    const deductions = buildCalculatorDeductions({
      ...DEFAULT_CALCULATOR_USER_DEDUCTIONS,
      medicalExpenses: 1200,
      charitableDonations: 250,
      hasSpouseOrCL: true,
      spouseNetIncome: 500,
      canadaTrainingCreditRoom: 1000,
      trainingFeesForCTC: 700,
    });

    expect(deductions.medicalExpenses).toEqual([
      { description: 'Medical expenses', amount: 1200, forWhom: 'self' },
    ]);
    expect(deductions.donations).toEqual([
      {
        recipientName: 'Charitable donations',
        amount: 250,
        type: 'cash',
        eligibleForProvincial: true,
      },
    ]);
    expect(deductions.hasSpouseOrCL).toBe(true);
    expect(deductions.spouseNetIncome).toBe(500);
    expect(deductions.canadaTrainingCreditRoom).toBe(1000);
    expect(deductions.trainingFeesForCTC).toBe(700);
  });

  it('uses the persisted tax profile instead of hardcoded calculator defaults', () => {
    const taxProfile: TaxProfile = {
      id: 'profile-1',
      userId: 'user-1',
      taxYear: 2025,
      legalName: 'Persisted Taxpayer',
      dateOfBirth: '1955-04-10',
      maritalStatus: 'married',
      province: 'ON',
      residencyStatus: 'newcomer',
      residencyStartDate: '2025-07-01',
      dependants: [
        {
          name: 'Dependant',
          dateOfBirth: '2015-01-01',
          relationship: 'child',
          netIncome: 0,
          hasDisability: false,
          inFullTimeCare: false,
        },
      ],
      assessmentComplete: true,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
    };

    const profile = buildCalculatorProfile({
      userId: 'user-1',
      profileName: 'Auth Name',
      taxProfile,
      assessmentComplete: false,
      now: '2026-04-28T00:00:00.000Z',
    });

    expect(profile).toMatchObject({
      id: 'profile-1',
      userId: 'user-1',
      legalName: 'Persisted Taxpayer',
      dateOfBirth: '1955-04-10',
      maritalStatus: 'married',
      residencyStatus: 'newcomer',
      residencyStartDate: '2025-07-01',
      assessmentComplete: true,
    });
    expect(profile.dependants).toHaveLength(1);
  });

  it('falls back to safe local profile defaults when no tax profile exists', () => {
    const profile = buildCalculatorProfile({
      userId: '',
      profileName: '',
      taxProfile: null,
      assessmentComplete: false,
      now: '2026-04-28T00:00:00.000Z',
    });

    expect(profile).toMatchObject({
      id: 'local-user',
      userId: 'local-user',
      taxYear: 2025,
      legalName: 'Taxpayer',
      dateOfBirth: '1990-01-01',
      maritalStatus: 'single',
      province: 'ON',
    });
  });

  it('maps canonical SavedSlip T4 boxes to the slip engine shape', () => {
    const slip = savedSlipToTaxSlip({
      id: 'slip-1',
      type: 'T4',
      issuerName: 'Employer',
      data: {
        box14: 50000,
        box16: 3200,
        box16A: 110,
        box18: 900,
        box22: 7500,
        box44: 250,
        box45: '1',
      },
      enteredAt: '2026-04-28T00:00:00.000Z',
    });

    expect(slip?.type).toBe('T4');
    if (slip?.type !== 'T4') throw new Error('expected T4');
    expect(slip.data).toMatchObject({
      issuerName: 'Employer',
      box14: 50000,
      box16: 3200,
      box16A: 110,
      box18: 900,
      box22: 7500,
      box44: 250,
      box45: '1',
    });
    expect(slip.data.box40).toBe(0);
  });

  it('maps canonical T2202 tuition into boxA and months into boxB/boxC', () => {
    const slip = savedSlipToTaxSlip({
      id: 'slip-1',
      type: 'T2202',
      issuerName: 'University',
      data: { boxA: 14625.25, boxB: 0, boxC: 8 },
      enteredAt: '2026-04-28T00:00:00.000Z',
    });

    expect(slip?.type).toBe('T2202');
    if (slip?.type !== 'T2202') throw new Error('expected T2202');
    expect(slip.data).toEqual({
      institutionName: 'University',
      boxA: 14625.25,
      boxB: 0,
      boxC: 8,
    });
  });

  it('feeds the smoke-test T4/T4A/T2202 path into the deterministic slip engine', () => {
    const profile = buildCalculatorProfile({
      userId: 'user-1',
      profileName: 'Taxpayer',
      taxProfile: {
        id: 'profile-1',
        userId: 'user-1',
        taxYear: 2025,
        legalName: 'Taxpayer',
        dateOfBirth: '2000-01-01',
        maritalStatus: 'single',
        province: 'ON',
        residencyStatus: 'citizen',
        dependants: [],
        assessmentComplete: true,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
      assessmentComplete: true,
    });
    const slips: SavedSlip[] = [
      {
        id: 't4',
        type: 'T4',
        issuerName: 'Employer',
        data: { box14: 2320, box22: 127.71 },
        enteredAt: '2026-04-28T00:00:00.000Z',
      },
      {
        id: 't4a',
        type: 'T4A',
        issuerName: 'University',
        data: { box105: 2030 },
        enteredAt: '2026-04-28T00:00:00.000Z',
      },
      {
        id: 't2202',
        type: 'T2202',
        issuerName: 'University',
        data: { boxA: 14625.25, boxB: 0, boxC: 8 },
        enteredAt: '2026-04-28T00:00:00.000Z',
      },
    ];

    const result = calculateTaxReturn(
      profile,
      savedSlipsToTaxSlips(slips),
      [],
      [],
      buildCalculatorDeductions(DEFAULT_CALCULATOR_USER_DEDUCTIONS),
    );

    expect(result.balanceOwing).toBeCloseTo(-127.71, 2);
    expect(result.lineByLine[32300]).toBeCloseTo(14625.25, 2);
  });
});
