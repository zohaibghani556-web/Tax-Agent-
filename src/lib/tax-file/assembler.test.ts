/**
 * TaxAgent.ai — Tax File Graph Assembler Tests
 *
 * Tests the read-only graph assembly logic: node/edge construction,
 * status state machine, warning computation, and missing slip detection.
 *
 * Uses a mock Supabase client — no database required.
 */

import { describe, it, expect, vi } from 'vitest';
import { assembleTaxFileGraph } from './assembler';

// ─── Mock Supabase factory ──────────────────────────────────────────────────

type MockQueryResult = { data: unknown; error: null } | { data: null; error: { message: string } };

interface TableMock {
  selectResult?: MockQueryResult;
}

function createMockSupabase(tables: Record<string, TableMock> = {}) {
  const defaultResult: MockQueryResult = { data: null, error: null };

  function makeChain(tableName: string): Record<string, unknown> {
    const tableConfig = tables[tableName];
    const result = tableConfig?.selectResult ?? defaultResult;

    // The chain itself is a thenable that resolves to the result.
    // This matches how the Supabase client works — awaiting a query
    // builder returns { data, error } without calling a terminal method.
    const chain: Record<string, unknown> = {
      then: (resolve: (v: unknown) => void) => resolve(result),
    };

    const self = () => chain;

    chain.select = self;
    chain.eq = self;
    chain.order = self;
    chain.limit = self;
    chain.not = self;
    chain.maybeSingle = self;

    return chain;
  }

  return {
    from: (table: string) => makeChain(table),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  };
}

// ─── Test data factories ────────────────────────────────────────────────────

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    tax_year: 2025,
    legal_name: 'Test User',
    marital_status: 'single',
    residency_status: 'citizen',
    assessment_complete: true,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

function makeSlip(overrides: Record<string, unknown> = {}) {
  return {
    id: 'slip-1',
    slip_type: 'T4',
    issuer_name: 'Acme Corp',
    boxes: { box14: 50000, box22: 8000 },
    source: 'ocr',
    file_hash: 'abc123',
    source_extraction_id: 'ext-1',
    created_at: '2026-02-01T00:00:00Z',
    ...overrides,
  };
}

function makeExtraction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ext-1',
    slip_type_detected: 'T4',
    status: 'success',
    classification_confidence: 0.95,
    file_hash: 'abc123',
    boxes: { box14: 50000, box22: 8000 },
    reviewed_by_user_at: '2026-02-01T12:00:00Z',
    created_at: '2026-02-01T00:00:00Z',
    ...overrides,
  };
}

function makeCalculation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'calc-1',
    total_income: 50000,
    net_income: 45000,
    taxable_income: 45000,
    federal_tax: 5000,
    ontario_tax: 3000,
    balance_owing: -2000,
    tax_deducted: 10000,
    calculated_at: '2026-03-01T00:00:00Z',
    detailed_breakdown: {
      totalIncome: 50000,
      netIncome: 45000,
      taxableIncome: 45000,
      netFederalTax: 5000,
      netOntarioTax: 3000,
      totalTaxPayable: 8000,
      totalTaxDeducted: 10000,
      balanceOwing: -2000,
    },
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('assembleTaxFileGraph', () => {
  it('returns null when no profile exists', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: null, error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    expect(graph).toBeNull();
  });

  it('returns draft status with empty data', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: makeProfile(), error: null } },
      tax_slips: { selectResult: { data: [], error: null } },
      slip_extractions: { selectResult: { data: [], error: null } },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: null, error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: { selectResult: { data: [], error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    expect(graph).not.toBeNull();
    expect(graph!.status).toBe('draft');
    expect(graph!.slips).toHaveLength(0);
    expect(graph!.documents).toHaveLength(0);
    expect(graph!.summary.slipCount).toBe(0);
  });

  it('returns needs_review when unreviewed OCR extractions exist', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: makeProfile(), error: null } },
      tax_slips: { selectResult: { data: [makeSlip()], error: null } },
      slip_extractions: {
        selectResult: {
          data: [makeExtraction({ reviewed_by_user_at: null })],
          error: null,
        },
      },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: makeCalculation(), error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: { selectResult: { data: [], error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    expect(graph!.status).toBe('needs_review');
    expect(graph!.summary.unreviewedExtractionCount).toBe(1);
  });

  it('returns export_ready when all reviewed with calculation and no errors', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: makeProfile(), error: null } },
      tax_slips: { selectResult: { data: [makeSlip()], error: null } },
      slip_extractions: {
        selectResult: { data: [makeExtraction()], error: null },
      },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: makeCalculation(), error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: { selectResult: { data: [], error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    expect(graph!.status).toBe('export_ready');
  });

  it('builds source-of edges for OCR slips', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: makeProfile(), error: null } },
      tax_slips: { selectResult: { data: [makeSlip()], error: null } },
      slip_extractions: { selectResult: { data: [makeExtraction()], error: null } },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: makeCalculation(), error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: { selectResult: { data: [], error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    const sourceOfEdges = graph!.edges.filter((e) => e.type === 'source-of');
    expect(sourceOfEdges).toHaveLength(1);
    expect(sourceOfEdges[0]).toMatchObject({
      type: 'source-of',
      extractionId: 'ext-1',
      slipId: 'slip-1',
    });
  });

  it('builds reviewed-by edges for reviewed extractions', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: makeProfile(), error: null } },
      tax_slips: { selectResult: { data: [makeSlip()], error: null } },
      slip_extractions: { selectResult: { data: [makeExtraction()], error: null } },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: makeCalculation(), error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: { selectResult: { data: [], error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    const reviewedEdges = graph!.edges.filter((e) => e.type === 'reviewed-by');
    expect(reviewedEdges).toHaveLength(1);
  });

  it('generates warning for failed extractions', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: makeProfile(), error: null } },
      tax_slips: { selectResult: { data: [makeSlip()], error: null } },
      slip_extractions: {
        selectResult: {
          data: [makeExtraction({ status: 'extraction_failed', reviewed_by_user_at: null })],
          error: null,
        },
      },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: makeCalculation(), error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: { selectResult: { data: [], error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    const failedWarnings = graph!.warnings.filter((w) => w.code === 'EXTRACTION_FAILED');
    expect(failedWarnings).toHaveLength(1);
    expect(failedWarnings[0].severity).toBe('error');
  });

  it('detects missing slips mentioned in chat', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: makeProfile(), error: null } },
      tax_slips: { selectResult: { data: [makeSlip({ slip_type: 'T4' })], error: null } },
      slip_extractions: { selectResult: { data: [makeExtraction()], error: null } },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: makeCalculation(), error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: {
        selectResult: {
          data: [
            { content: 'Please upload your T5 and T2202 slips for tuition and investment income.' },
          ],
          error: null,
        },
      },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    const missingWarnings = graph!.warnings.filter((w) => w.code === 'MISSING_MENTIONED_SLIP');
    expect(missingWarnings.length).toBeGreaterThanOrEqual(2);
    const types = missingWarnings.map((w) => w.message);
    expect(types.some((m) => m.includes('T5'))).toBe(true);
    expect(types.some((m) => m.includes('T2202'))).toBe(true);
  });

  it('maps profile fields correctly', async () => {
    const supabase = createMockSupabase({
      tax_profiles: {
        selectResult: {
          data: makeProfile({ legal_name: 'Jane Doe', marital_status: 'married' }),
          error: null,
        },
      },
      tax_slips: { selectResult: { data: [], error: null } },
      slip_extractions: { selectResult: { data: [], error: null } },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: null, error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: { selectResult: { data: [], error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    expect(graph!.profile.legalName).toBe('Jane Doe');
    expect(graph!.profile.maritalStatus).toBe('married');
    expect(graph!.profileId).toBe('profile-1');
    expect(graph!.taxYear).toBe(2025);
  });

  it('generates no-calculation warning when slips exist but no calc', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: makeProfile(), error: null } },
      tax_slips: { selectResult: { data: [makeSlip()], error: null } },
      slip_extractions: { selectResult: { data: [makeExtraction()], error: null } },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: null, error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: { selectResult: { data: [], error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    const noCalcWarnings = graph!.warnings.filter((w) => w.code === 'NO_CALCULATION');
    expect(noCalcWarnings).toHaveLength(1);
  });

  it('calculation node maps values correctly', async () => {
    const supabase = createMockSupabase({
      tax_profiles: { selectResult: { data: makeProfile(), error: null } },
      tax_slips: { selectResult: { data: [makeSlip()], error: null } },
      slip_extractions: { selectResult: { data: [makeExtraction()], error: null } },
      slip_corrections: { selectResult: { data: [], error: null } },
      tax_calculations: { selectResult: { data: makeCalculation(), error: null } },
      tax_returns: { selectResult: { data: null, error: null } },
      deductions_credits: { selectResult: { data: null, error: null } },
      chat_messages: { selectResult: { data: [], error: null } },
    });

    const graph = await assembleTaxFileGraph(supabase as never, 'user-1', 2025);
    expect(graph!.calculation).not.toBeNull();
    expect(graph!.calculation!.totalIncome).toBe(50000);
    expect(graph!.calculation!.balanceOwing).toBe(-2000);
    expect(graph!.calculation!.totalTaxDeducted).toBe(10000);
  });
});
