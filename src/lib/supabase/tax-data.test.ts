/**
 * Regression test: SUPPORTED_SLIP_TYPES parity
 *
 * Verifies that every slip type defined in SLIP_FIELDS (the application's
 * source of truth for what the parser and engine handle) is also present
 * in SUPPORTED_SLIP_TYPES (what the DB persistence layer will actually save).
 *
 * If this test fails, a slip type is being parsed by OCR, processed by the
 * engine, but silently dropped before it reaches the database.
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { TaxCalculationResult } from '@/lib/tax-engine/types';
import {
  SUPPORTED_SLIP_TYPES,
  getLatestCalculation,
  saveCalculationResult,
  saveMessage,
  upsertDeductions,
  upsertSlips,
} from './tax-data';
import type { SavedSlip, UserDeductions } from './tax-data';
import { SLIP_FIELDS } from '../slips/slip-fields';

type MockOperation = {
  table: string;
  op: 'select' | 'insert' | 'upsert' | 'delete';
  payload?: unknown;
  filters: Record<string, unknown>;
};

const mockState = vi.hoisted(() => ({
  operations: [] as MockOperation[],
  createClient: vi.fn(),
  latestCalculationRow: null as { detailed_breakdown: TaxCalculationResult; user_id: null; tax_year: null } | null,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: mockState.createClient,
}));

function createMockSupabaseClient() {
  return {
    from(table: string) {
      const state: MockOperation = {
        table,
        op: 'select',
        filters: {},
      };

      function resolve() {
        mockState.operations.push({ ...state, filters: { ...state.filters } });

        if (table === 'tax_profiles' && state.op === 'select') {
          return Promise.resolve({
            data: { id: 'profile-1', tax_year: state.filters['tax_year'] },
            error: null,
          });
        }

        if (table === 'tax_profiles' && state.op === 'insert') {
          const payload = state.payload as { tax_year?: number };
          return Promise.resolve({ data: { id: 'profile-1', tax_year: payload.tax_year }, error: null });
        }

        if (table === 'tax_calculations' && state.op === 'select') {
          return Promise.resolve({ data: mockState.latestCalculationRow, error: null });
        }

        return Promise.resolve({ data: null, error: null });
      }

      const builder = {
        select() {
          state.op = 'select';
          return builder;
        },
        insert(payload: unknown) {
          state.op = 'insert';
          state.payload = payload;
          return builder;
        },
        upsert(payload: unknown) {
          state.op = 'upsert';
          state.payload = payload;
          return builder;
        },
        delete() {
          state.op = 'delete';
          return builder;
        },
        eq(column: string, value: unknown) {
          state.filters[column] = value;
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        maybeSingle: resolve,
        single: resolve,
        then(
          onFulfilled: (value: Awaited<ReturnType<typeof resolve>>) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          return resolve().then(onFulfilled, onRejected);
        },
      };

      return builder;
    },
  };
}

function fullDeductions(overrides: Partial<UserDeductions> = {}): UserDeductions {
  return {
    rrspContributions: 1000,
    rrspContributionRoom: 5000,
    rentPaid: 12000,
    propertyTaxPaid: 0,
    childcareExpenses: 0,
    movingExpenses: 0,
    supportPaymentsMade: 0,
    instalmentsPaid: 0,
    medicalExpenses: 0,
    charitableDonations: 0,
    studentLoanInterest: 0,
    unionDues: 0,
    tuitionCarryforward: 0,
    digitalNewsSubscription: 0,
    homeAccessibilityExpenses: 0,
    hasSpouseOrCL: false,
    spouseNetIncome: 0,
    hasEligibleDependant: false,
    eligibleDependantNetIncome: 0,
    caregiverForDependant18Plus: false,
    caregiverDependantNetIncome: 0,
    hasDisabilityCredit: false,
    homeBuyersEligible: false,
    volunteerFirefighter: false,
    searchAndRescue: false,
    canadaTrainingCreditRoom: 0,
    trainingFeesForCTC: 0,
    ...overrides,
  };
}

function calculationResult(overrides: Partial<TaxCalculationResult> = {}): TaxCalculationResult {
  return {
    totalIncome: 50000,
    netIncome: 49000,
    taxableIncome: 49000,
    netFederalTax: 4500,
    ontarioTaxOnIncome: 2200,
    ontarioSurtax: 0,
    ontarioHealthPremium: 450,
    federalNonRefundableCredits: 2500,
    ontarioNonRefundableCredits: 900,
    totalTaxDeducted: 6500,
    balanceOwing: 650,
    estimatedOTB: 0,
    estimatedGSTCredit: 0,
    ...overrides,
  } as TaxCalculationResult;
}

beforeEach(() => {
  mockState.operations = [];
  mockState.latestCalculationRow = null;
  mockState.createClient.mockReturnValue(createMockSupabaseClient());
});

describe('SUPPORTED_SLIP_TYPES parity with SLIP_FIELDS', () => {
  it('contains every slip type defined in SLIP_FIELDS', () => {
    const engineTypes = Object.keys(SLIP_FIELDS);
    const missing = engineTypes.filter((t) => !SUPPORTED_SLIP_TYPES.has(t));

    expect(missing, [
      'The following slip types are parsed by the OCR pipeline and supported',
      'by the engine, but will be silently dropped on save because they are',
      'missing from SUPPORTED_SLIP_TYPES:',
      ...missing.map((t) => `  • ${t}`),
      '',
      'Add them to SUPPORTED_SLIP_TYPES in tax-data.ts AND update the DB',
      'CHECK constraint via a new migration in supabase/migrations/.',
    ].join('\n')).toEqual([]);
  });

  it('does not contain slip types that SLIP_FIELDS does not know about', () => {
    // Forward-parity: no phantom types in the allowlist that aren't real slips.
    const engineTypes = new Set(Object.keys(SLIP_FIELDS));
    const phantoms = [...SUPPORTED_SLIP_TYPES].filter((t) => !engineTypes.has(t));

    expect(phantoms, [
      'The following types are in SUPPORTED_SLIP_TYPES but have no fields',
      'defined in SLIP_FIELDS — they cannot be rendered or edited in the UI:',
      ...phantoms.map((t) => `  • ${t}`),
    ].join('\n')).toEqual([]);
  });
});

describe('Stage 6F write-path alignment', () => {
  it('saveCalculationResult writes user_id and tax_year without changing the stored calculation payload', async () => {
    const result = calculationResult({ balanceOwing: -127.71 });

    await saveCalculationResult('user-1', 2025, result);

    const insert = mockState.operations.find(
      (op) => op.table === 'tax_calculations' && op.op === 'insert',
    );
    expect(insert).toBeDefined();
    expect(insert!.payload).toMatchObject({
      user_id: 'user-1',
      profile_id: 'profile-1',
      tax_year: 2025,
      balance_owing: -127.71,
      detailed_breakdown: result,
    });
  });

  it('saveMessage writes the resolved profile tax_year for chat_messages', async () => {
    await saveMessage('user-1', 'assistant', 'Next question', 2026);

    const insert = mockState.operations.find(
      (op) => op.table === 'chat_messages' && op.op === 'insert',
    );
    expect(insert).toBeDefined();
    expect(insert!.payload).toMatchObject({
      user_id: 'user-1',
      profile_id: 'profile-1',
      tax_year: 2026,
      role: 'assistant',
      content: 'Next question',
    });
  });

  it('upsertDeductions writes user_id and tax_year for deductions_credits', async () => {
    await upsertDeductions('user-1', 2025, fullDeductions());

    const upsert = mockState.operations.find(
      (op) => op.table === 'deductions_credits' && op.op === 'upsert',
    );
    expect(upsert).toBeDefined();
    expect(upsert!.payload).toMatchObject({
      user_id: 'user-1',
      profile_id: 'profile-1',
      tax_year: 2025,
      rrsp_contributions: 1000,
      rent_paid: 12000,
    });
  });

  it('upsertSlips writes user_id for future tax_slips saves while keeping profile_id canonical', async () => {
    const slips: SavedSlip[] = [
      {
        id: 'slip-1',
        type: 'T4',
        issuerName: 'Employer',
        data: { box14: 50000 },
        enteredAt: '2026-04-29T00:00:00.000Z',
      },
    ];

    await upsertSlips('user-1', 2025, slips);

    const insert = mockState.operations.find(
      (op) => op.table === 'tax_slips' && op.op === 'insert',
    );
    expect(insert).toBeDefined();
    expect(insert!.payload).toEqual([
      expect.objectContaining({
        user_id: 'user-1',
        profile_id: 'profile-1',
        tax_year: 2025,
        slip_type: 'T4',
      }),
    ]);
  });

  it('nullable legacy columns remain compatible with existing calculation read paths', async () => {
    const result = calculationResult();
    mockState.latestCalculationRow = {
      user_id: null,
      tax_year: null,
      detailed_breakdown: result,
    };

    await expect(getLatestCalculation('user-1', 2025)).resolves.toBe(result);
  });
});
