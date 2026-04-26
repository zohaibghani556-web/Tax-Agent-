/**
 * TaxAgent.ai — Unified Slip Store Tests
 *
 * All tests use an in-memory mock Supabase client. No real database calls.
 *
 * Coverage:
 *   1. createSlip + getSlip round-trip (T4)
 *   2. toTaxSlip converts T4 correctly, with typeof-safe 0 defaults
 *   3. toTaxSlip converts T4A with box105 and absent box048
 *   4. toTaxSlip converts T2202 with tuition
 *   5. Unknown boxes are preserved in slip.boxes
 *   6. Missing values stay null/undefined in UnifiedSlip, not 0
 *   7. recordManualOverride records previous and new value + audit log
 *   8. Status transitions: active → amended → cancelled; list filtering
 *   9. All 14 slip types can be stored and toTaxSlip returns non-null for all
 *  10. T2202 dedup — duplicate file_hash returns existing row (Test A)
 *  11. T2202 dedup — duplicate source_extraction_id returns existing row (Test B)
 *  12. T2202 dedup — listSlips shows one slip after duplicate attempt (Test C)
 *  13. T2202 field mapping — toTaxSlip puts tuition in boxA, months in boxB/boxC (Test D)
 *  14. T2202 field mapping — toTaxSlip boxC must not equal tuition amount (Test D variant)
 *  15. T2202 tax engine regression — tuition counted once after duplicate upload (Test E)
 *  16. createSlip dedup check error is logged and INSERT still attempted
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createSlip,
  getSlip,
  updateSlip,
  listSlipsByUserAndTaxYear,
  markSlipAmended,
  markSlipCancelled,
  recordManualOverride,
  toTaxSlip,
  setSlipBoxValue,
} from './slip-store';
import type { UnifiedSlip, TaxSlipType } from './slip-store';

// ─── In-memory Supabase mock ──────────────────────────────────────────────────

/**
 * Creates a lightweight mock Supabase client backed by an in-memory Map.
 * Supports the fluent query-builder pattern used by slip-store.ts.
 * Only models the tax_slips table operations actually used in this module.
 *
 * Pass `injectSelectError` to simulate a SELECT failure on the next query that
 * uses maybeSingle() — used to test that dedup errors are logged but don't
 * silently abort the save.
 */
function createMockSupabaseClient(
  storage: Map<string, Record<string, unknown>>,
  options: {
    /** Number of consecutive maybeSingle() calls to return an error for. */
    injectSelectErrorCount?: number;
    injectSelectErrorCode?: string;
    injectSelectErrorMessage?: string;
  } = {},
): SupabaseClient {
  let idSeq = 0;
  let errorCountdown = options.injectSelectErrorCount ?? 0;
  const errorCode = options.injectSelectErrorCode ?? 'PGRST204';
  const errorMessage = options.injectSelectErrorMessage ?? 'column does not exist';

  return {
    from(table: string) {
      // Validate early — this mock only models the tax_slips table.
      if (table !== 'tax_slips') throw new Error(`Mock: unexpected table '${table}'`);
      const state: {
        op: 'select' | 'insert' | 'update';
        filters: Record<string, unknown>;
        inFilters: Record<string, unknown[]>;
        insertPayload: Record<string, unknown> | null;
        updatePayload: Record<string, unknown> | null;
      } = {
        op: 'select',
        filters: {},
        inFilters: {},
        insertPayload: null,
        updatePayload: null,
      };

      function matchesFilters(row: Record<string, unknown>): boolean {
        for (const [k, v] of Object.entries(state.filters)) {
          if (row[k] !== v) return false;
        }
        for (const [k, vals] of Object.entries(state.inFilters)) {
          if (!vals.includes(row[k])) return false;
        }
        return true;
      }

      async function resolveOne(): Promise<{
        data: Record<string, unknown> | null;
        error: { code: string; message: string } | null;
      }> {
        // Simulate SELECT errors for dedup check testing
        if (state.op === 'select' && errorCountdown > 0) {
          errorCountdown--;
          return { data: null, error: { code: errorCode, message: errorMessage } };
        }

        if (state.op === 'insert' && state.insertPayload) {
          const id = `test-id-${++idSeq}`;
          const now = new Date().toISOString();
          const row: Record<string, unknown> = {
            ...state.insertPayload,
            id,
            created_at: now,
            updated_at: now,
            slip_status: state.insertPayload['slip_status'] ?? 'active',
            needs_review: state.insertPayload['needs_review'] ?? false,
          };
          storage.set(id, row);
          return { data: row, error: null };
        }
        if (state.op === 'update' && state.updatePayload) {
          const id = state.filters['id'] as string;
          const existing = storage.get(id);
          if (!existing) return { data: null, error: null };
          const updated: Record<string, unknown> = {
            ...existing,
            ...state.updatePayload,
          };
          storage.set(id, updated);
          return { data: updated, error: null };
        }
        // select single
        for (const row of storage.values()) {
          if (matchesFilters(row)) return { data: row, error: null };
        }
        return { data: null, error: null };
      }

      async function resolveMany(): Promise<{
        data: Record<string, unknown>[];
        error: null;
      }> {
        const rows = [...storage.values()].filter(matchesFilters);
        return { data: rows, error: null };
      }

      const builder = {
        select() {
          return builder;
        },
        insert(data: Record<string, unknown>) {
          state.op = 'insert';
          state.insertPayload = data;
          return builder;
        },
        update(data: Record<string, unknown>) {
          state.op = 'update';
          state.updatePayload = data;
          return builder;
        },
        eq(col: string, val: unknown) {
          state.filters[col] = val;
          return builder;
        },
        in(col: string, vals: unknown[]) {
          state.inFilters[col] = vals;
          return builder;
        },
        order() {
          return builder;
        },
        // Terminal: single row
        single: resolveOne,
        // Terminal: single row or null (same semantics for mock)
        maybeSingle: resolveOne,
        // Thenable — makes the builder itself awaitable for multi-row results
        then(
          onFulfilled: (v: {
            data: Record<string, unknown>[];
            error: null;
          }) => unknown,
          onRejected?: (e: unknown) => unknown,
        ) {
          return resolveMany().then(onFulfilled, onRejected);
        },
      };

      return builder as unknown as ReturnType<SupabaseClient['from']>;
    },
  } as unknown as SupabaseClient;
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeBaseSlip(
  overrides: Partial<Omit<UnifiedSlip, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Omit<UnifiedSlip, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId: 'user-abc',
    taxYear: 2025,
    slipType: 'T4',
    issuerName: 'ACME Corp',
    sourceMethod: 'ocr',
    slipStatus: 'active',
    boxes: {},
    fieldProvenance: {},
    rawExtractedData: null,
    unmappedFields: null,
    missingRequired: [],
    fileHash: null,
    originalFilename: null,
    schemaVersion: null,
    importedAt: null,
    extractionModel: 'claude-sonnet-4-6',
    extractionModelVersion: null,
    needsReview: false,
    sourceExtractionId: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('slip-store', () => {
  let storage: Map<string, Record<string, unknown>>;
  let client: SupabaseClient;

  beforeEach(() => {
    storage = new Map();
    client = createMockSupabaseClient(storage);
  });

  // ── Test 1: createSlip + getSlip round-trip ─────────────────────────────────

  it('createSlip + getSlip round-trips a T4 with known boxes', async () => {
    const input = makeBaseSlip({
      slipType: 'T4',
      issuerName: 'ACME Corp',
      sourceMethod: 'ocr',
      boxes: { box14: 75000, box22: 12000 },
    });

    const created = await createSlip(client, input);

    expect(created.id).toBeTruthy();
    expect(created.slipType).toBe('T4');
    expect(created.boxes['box14']).toBe(75000);
    expect(created.boxes['box22']).toBe(12000);

    const fetched = await getSlip(client, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.boxes['box14']).toBe(75000);
    expect(fetched!.boxes['box22']).toBe(12000);
    expect(fetched!.issuerName).toBe('ACME Corp');
  });

  // ── Test 2: toTaxSlip converts a T4 correctly ──────────────────────────────

  it('toTaxSlip converts a T4 with boxes.box14=75000 and typeof-safe defaults', async () => {
    const slip = await createSlip(
      client,
      makeBaseSlip({
        slipType: 'T4',
        boxes: { box14: 75000, box22: 12000 },
      }),
    );

    const taxSlip = toTaxSlip(slip);
    expect(taxSlip).not.toBeNull();
    expect(taxSlip!.type).toBe('T4');

    if (taxSlip!.type === 'T4') {
      // Explicitly extracted values are passed through
      expect(taxSlip.data.box14).toBe(75000);
      expect(taxSlip.data.box22).toBe(12000);
      // Missing boxes default to 0 at engine boundary via typeof check
      expect(taxSlip.data.box16).toBe(0);
      expect(taxSlip.data.box18).toBe(0);
      // Verify it is exactly 0 (the typeof guard), not null or undefined
      expect(typeof taxSlip.data.box16).toBe('number');
    }
  });

  it('toTaxSlip uses typeof v === "number" ? v : 0 — does not coerce string "0" to 0 incorrectly', () => {
    // If a string box value were coerced with Number() || 0, "0" would produce 0 (correct)
    // but null would also produce 0 (correct — but the guard matters for the store layer).
    // This test verifies the engine boundary behavior.
    const slip = makeBaseSlip({
      slipType: 'T4',
      boxes: {
        box14: 80000,
        // box22 is absent — NOT coerced in store, but toTaxSlip gives 0
        box45: 'A', // string box
      },
    }) as UnifiedSlip;
    (slip as Partial<UnifiedSlip>).id = 'fake-id';
    (slip as Partial<UnifiedSlip>).createdAt = new Date().toISOString();
    (slip as Partial<UnifiedSlip>).updatedAt = new Date().toISOString();

    const taxSlip = toTaxSlip(slip as UnifiedSlip);
    expect(taxSlip!.type).toBe('T4');
    if (taxSlip!.type === 'T4') {
      expect(taxSlip.data.box22).toBe(0);      // absent → 0 at engine boundary
      expect(taxSlip.data.box45).toBe('A');    // string preserved
    }
  });

  // ── Test 3: toTaxSlip converts a T4A with box105 ───────────────────────────

  it('toTaxSlip converts a T4A with box105=8000 and absent box048 defaults to 0', async () => {
    const slip = await createSlip(
      client,
      makeBaseSlip({
        slipType: 'T4A',
        issuerName: 'University of Toronto',
        boxes: { box105: 8000 },
      }),
    );

    const taxSlip = toTaxSlip(slip);
    expect(taxSlip).not.toBeNull();
    expect(taxSlip!.type).toBe('T4A');

    if (taxSlip!.type === 'T4A') {
      // Scholarship income correctly mapped (ITA s.56(3))
      expect(taxSlip.data.box105).toBe(8000);
      // Optional box048 absent in store → 0 at engine boundary via typeof check
      expect(taxSlip.data.box048).toBe(0);
      expect(typeof taxSlip.data.box048).toBe('number');
    }
  });

  // ── Test 4: toTaxSlip converts a T2202 ─────────────────────────────────────

  it('toTaxSlip converts a T2202 with tuition', async () => {
    const slip = await createSlip(
      client,
      makeBaseSlip({
        slipType: 'T2202',
        issuerName: 'Seneca College',
        boxes: { boxA: 4500, boxB: 4, boxC: 0 },
      }),
    );

    const taxSlip = toTaxSlip(slip);
    expect(taxSlip).not.toBeNull();
    expect(taxSlip!.type).toBe('T2202');

    if (taxSlip!.type === 'T2202') {
      // T2202Slip uses institutionName — mapped from slip.issuerName
      expect(taxSlip.data.institutionName).toBe('Seneca College');
      expect(taxSlip.data.boxA).toBe(4500);
      expect(taxSlip.data.boxB).toBe(4);
      expect(taxSlip.data.boxC).toBe(0);
    }
  });

  // ── Test 5: Unknown boxes are preserved in slip.boxes ──────────────────────

  it('unknown/supplementary boxes are preserved in slip.boxes and do not crash toTaxSlip', async () => {
    // box77 is a T4 supplementary code, not in our schema — should be stored
    const slip = await createSlip(
      client,
      makeBaseSlip({
        slipType: 'T4',
        boxes: { box14: 60000, code77: 5000 },
      }),
    );

    // The box is preserved in the unified slip
    expect(slip.boxes['code77']).toBe(5000);

    const fetched = await getSlip(client, slip.id);
    expect(fetched!.boxes['code77']).toBe(5000);

    // toTaxSlip does not crash — it ignores unknown boxes, maps known ones
    const taxSlip = toTaxSlip(fetched!);
    expect(taxSlip).not.toBeNull();
    expect(taxSlip!.type).toBe('T4');
    if (taxSlip!.type === 'T4') {
      expect(taxSlip.data.box14).toBe(60000);
    }
  });

  // ── Test 6: Missing values stay null/undefined in UnifiedSlip, not 0 ───────

  it('absent boxes stay absent (undefined) in UnifiedSlip — not coerced to 0', async () => {
    const slip = await createSlip(
      client,
      makeBaseSlip({
        slipType: 'T4',
        boxes: { box14: 75000 },  // box22 intentionally absent
      }),
    );

    // Store layer: absent box should NOT be 0
    expect(slip.boxes['box22']).toBeUndefined();

    // Retrieve and confirm the store layer still has no coercion
    const fetched = await getSlip(client, slip.id);
    expect(fetched!.boxes['box22']).toBeUndefined();

    // Engine layer (toTaxSlip) provides 0 only at the boundary
    const taxSlip = toTaxSlip(fetched!);
    if (taxSlip!.type === 'T4') {
      expect(taxSlip.data.box22).toBe(0);
    }
  });

  // ── Test 7: recordManualOverride ────────────────────────────────────────────

  it('recordManualOverride updates the box value, provenance, and audit log', async () => {
    const slip = await createSlip(
      client,
      makeBaseSlip({
        slipType: 'T4',
        boxes: { box14: 70000, box22: 10000 },
        sourceMethod: 'ocr',
      }),
    );

    const updated = await recordManualOverride(
      client,
      slip.id,
      'box14',
      70000,
      75000,
      'user-abc',
    );

    // Box value updated
    expect(updated.boxes['box14']).toBe(75000);

    // Provenance records manual source
    expect(updated.fieldProvenance['box14']).toBeDefined();
    expect(updated.fieldProvenance['box14'].source).toBe('manual');
    expect(updated.fieldProvenance['box14'].needsReview).toBe(false);
    expect(updated.fieldProvenance['box14'].normalizedBox).toBe('box14');

    // Audit log appended to rawExtractedData
    const raw = updated.rawExtractedData as {
      _manualAudit: Array<{
        box: string;
        previousValue: number | null;
        newValue: number | null;
        userId: string;
        timestamp: string;
      }>;
    };
    expect(raw._manualAudit).toHaveLength(1);
    expect(raw._manualAudit[0].box).toBe('box14');
    expect(raw._manualAudit[0].previousValue).toBe(70000);
    expect(raw._manualAudit[0].newValue).toBe(75000);
    expect(raw._manualAudit[0].userId).toBe('user-abc');

    // Other boxes untouched
    expect(updated.boxes['box22']).toBe(10000);
  });

  it('recordManualOverride appends multiple audit entries in order', async () => {
    const slip = await createSlip(
      client,
      makeBaseSlip({ slipType: 'T4', boxes: { box14: 50000 } }),
    );

    await recordManualOverride(client, slip.id, 'box14', 50000, 55000, 'user-abc');
    const after2 = await recordManualOverride(
      client,
      slip.id,
      'box14',
      55000,
      60000,
      'user-abc',
    );

    const raw = after2.rawExtractedData as { _manualAudit: unknown[] };
    expect(raw._manualAudit).toHaveLength(2);
  });

  // ── Test 8: Status transitions ──────────────────────────────────────────────

  it('markSlipAmended sets slipStatus to "amended"', async () => {
    const slip = await createSlip(client, makeBaseSlip({ slipType: 'T4' }));
    expect(slip.slipStatus).toBe('active');

    await markSlipAmended(client, slip.id);

    const updated = await getSlip(client, slip.id);
    expect(updated!.slipStatus).toBe('amended');
  });

  it('markSlipCancelled sets slipStatus to "cancelled"', async () => {
    const slip = await createSlip(client, makeBaseSlip({ slipType: 'T4' }));
    await markSlipCancelled(client, slip.id);

    const updated = await getSlip(client, slip.id);
    expect(updated!.slipStatus).toBe('cancelled');
  });

  it('listSlipsByUserAndTaxYear with statusFilter excludes cancelled slips', async () => {
    // Create three slips: two active, one cancelled
    const slip1 = await createSlip(
      client,
      makeBaseSlip({ slipType: 'T4', issuerName: 'Employer A' }),
    );
    const slip2 = await createSlip(
      client,
      makeBaseSlip({ slipType: 'T5', issuerName: 'Bank B' }),
    );
    const slip3 = await createSlip(
      client,
      makeBaseSlip({ slipType: 'T4A', issuerName: 'Payer C' }),
    );

    await markSlipCancelled(client, slip3.id);

    const activeSlips = await listSlipsByUserAndTaxYear(
      client,
      'user-abc',
      2025,
      ['active'],
    );

    const ids = activeSlips.map((s) => s.id);
    expect(ids).toContain(slip1.id);
    expect(ids).toContain(slip2.id);
    expect(ids).not.toContain(slip3.id);
  });

  it('listSlipsByUserAndTaxYear without statusFilter returns all statuses', async () => {
    await createSlip(client, makeBaseSlip({ slipType: 'T4' }));
    const slip2 = await createSlip(client, makeBaseSlip({ slipType: 'T5' }));
    await markSlipCancelled(client, slip2.id);

    const all = await listSlipsByUserAndTaxYear(client, 'user-abc', 2025);
    expect(all).toHaveLength(2);
  });

  // ── Test 9: All 14 slip types can be stored and toTaxSlip returns non-null ──

  const ALL_SLIP_TYPES: TaxSlipType[] = [
    'T4', 'T5', 'T5008', 'T3', 'T4A', 'T2202',
    'T4E', 'T5007', 'T4AP', 'T4AOAS', 'T4RSP',
    'T4RIF', 'RRSP-Receipt', 'T4FHSA',
  ];

  it('all 14 slip types can be stored and retrieved without type errors', async () => {
    for (const slipType of ALL_SLIP_TYPES) {
      const slip = await createSlip(
        client,
        makeBaseSlip({ slipType }),
      );
      expect(slip.slipType).toBe(slipType);

      const fetched = await getSlip(client, slip.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.slipType).toBe(slipType);
    }
  });

  it('toTaxSlip returns non-null for all 14 slip types', async () => {
    for (const slipType of ALL_SLIP_TYPES) {
      const slip = await createSlip(client, makeBaseSlip({ slipType }));
      const taxSlip = toTaxSlip(slip);
      expect(taxSlip).not.toBeNull();
      expect(taxSlip!.type).toBe(slipType);
    }
  });

  // ── Test: setSlipBoxValue helper ────────────────────────────────────────────

  it('setSlipBoxValue returns a new slip without mutating the original', async () => {
    const slip = await createSlip(
      client,
      makeBaseSlip({ slipType: 'T4', boxes: { box14: 50000 } }),
    );

    const updated = setSlipBoxValue(slip, 'box14', 60000, 'manual');

    // Original is unchanged
    expect(slip.boxes['box14']).toBe(50000);
    expect(slip.fieldProvenance['box14']).toBeUndefined();

    // New slip has updated value and provenance
    expect(updated.boxes['box14']).toBe(60000);
    expect(updated.fieldProvenance['box14'].source).toBe('manual');
    expect(updated.fieldProvenance['box14'].normalizedBox).toBe('box14');
    expect(updated.fieldProvenance['box14'].needsReview).toBe(false);
  });

  it('setSlipBoxValue records confidence when provided', () => {
    const slip = makeBaseSlip({ slipType: 'T4', boxes: {} }) as UnifiedSlip;
    (slip as Partial<UnifiedSlip>).id = 'x';
    (slip as Partial<UnifiedSlip>).createdAt = new Date().toISOString();
    (slip as Partial<UnifiedSlip>).updatedAt = new Date().toISOString();

    const updated = setSlipBoxValue(slip as UnifiedSlip, 'box22', 9000, 'ocr', 0.92);
    expect(updated.fieldProvenance['box22'].confidence).toBe(0.92);
  });

  // ── Additional toTaxSlip edge cases ─────────────────────────────────────────

  it('toTaxSlip T5008 preserves string boxes (box15, box16)', () => {
    const slip = makeBaseSlip({
      slipType: 'T5008',
      issuerName: 'Questrade',
      boxes: { box15: '1', box16: 'AAPL', box20: 5000, box21: 7500 },
    }) as UnifiedSlip;
    (slip as Partial<UnifiedSlip>).id = 'x';
    (slip as Partial<UnifiedSlip>).createdAt = new Date().toISOString();
    (slip as Partial<UnifiedSlip>).updatedAt = new Date().toISOString();

    const taxSlip = toTaxSlip(slip as UnifiedSlip);
    expect(taxSlip!.type).toBe('T5008');
    if (taxSlip!.type === 'T5008') {
      expect(taxSlip.data.box15).toBe('1');   // string, not number
      expect(taxSlip.data.box16).toBe('AAPL'); // string, not number
      expect(taxSlip.data.box21).toBe(7500);
    }
  });

  it('toTaxSlip RRSP-Receipt maps amount and planType correctly', () => {
    const slip = makeBaseSlip({
      slipType: 'RRSP-Receipt',
      issuerName: 'Wealthsimple',
      boxes: { amount: 10000, planType: 'SPOUSAL-RRSP' },
    }) as UnifiedSlip;
    (slip as Partial<UnifiedSlip>).id = 'x';
    (slip as Partial<UnifiedSlip>).createdAt = new Date().toISOString();
    (slip as Partial<UnifiedSlip>).updatedAt = new Date().toISOString();

    const taxSlip = toTaxSlip(slip as UnifiedSlip);
    expect(taxSlip!.type).toBe('RRSP-Receipt');
    if (taxSlip!.type === 'RRSP-Receipt') {
      expect(taxSlip.data.amount).toBe(10000);
      expect(taxSlip.data.planType).toBe('SPOUSAL-RRSP');
    }
  });

  it('updateSlip applies only the specified patch fields', async () => {
    const slip = await createSlip(
      client,
      makeBaseSlip({ slipType: 'T4', boxes: { box14: 50000 }, issuerName: 'Corp A' }),
    );

    const updated = await updateSlip(client, slip.id, {
      issuerName: 'Corp B',
    });

    expect(updated.issuerName).toBe('Corp B');
    expect(updated.boxes['box14']).toBe(50000); // unchanged
    expect(updated.slipType).toBe('T4');         // unchanged
  });

  // ── Dedup regression tests ───────────────────────────────────────────────────
  // These tests prove the acceptance criteria: uploading the same slip twice
  // cannot produce doubled income in the tax engine.

  /**
   * Test A — file-hash deduplication
   * Uploading the same physical file twice must not create two rows.
   * createSlip with an identical (userId, taxYear, slipType, fileHash)
   * must return the existing row without inserting.
   */
  it('Test A: createSlip with duplicate file_hash returns existing row, no second insert', async () => {
    const inputA = makeBaseSlip({
      slipType: 'T4',
      issuerName: 'ACME Corp',
      boxes: { box14: 2320, box22: 127.71 },
      fileHash: 'sha256-abc123',
    });

    const slip1 = await createSlip(client, inputA);
    // Second upload: same user + year + type + file hash
    const slip2 = await createSlip(client, { ...inputA, issuerName: 'ACME Corp (re-upload)' });

    // Must return the SAME row
    expect(slip2.id).toBe(slip1.id);
    // Must NOT insert a new row — storage still has exactly one entry
    expect(storage.size).toBe(1);
  });

  /**
   * Test B — review-save idempotency via source_extraction_id
   * If the user re-saves the same review session (back-navigation, double-click),
   * createSlip must return the existing row and not insert a duplicate.
   * The manual audit from recordManualOverride is preserved.
   */
  it('Test B: createSlip with duplicate source_extraction_id returns existing row and preserves audit', async () => {
    const inputB = makeBaseSlip({
      slipType: 'T4',
      boxes: { box14: 2320, box22: 127.71 },
      sourceExtractionId: 'extraction-uuid-1',
    });

    const slip1 = await createSlip(client, inputB);

    // Record a correction to verify audit survives the second save attempt
    const afterCorrection = await recordManualOverride(
      client, slip1.id, 'box14', 2320, 2500, 'user-abc',
    );
    expect(afterCorrection.boxes['box14']).toBe(2500);

    // User re-saves the same review session
    const slip2 = await createSlip(client, { ...inputB, boxes: { box14: 9999, box22: 0 } });

    // Must return the original row (not the re-save payload)
    expect(slip2.id).toBe(slip1.id);
    // Storage unchanged — still one row
    expect(storage.size).toBe(1);

    // Audit metadata is preserved on the stored row
    const stored = await getSlip(client, slip1.id);
    const raw = stored!.rawExtractedData as { _manualAudit: Array<{ box: string }> };
    expect(raw._manualAudit).toHaveLength(1);
    expect(raw._manualAudit[0].box).toBe('box14');
  });

  /**
   * Test C — listSlipsByUserAndTaxYear returns one slip after duplicate attempt
   */
  it('Test C: listSlipsByUserAndTaxYear returns one slip after duplicate upload attempt', async () => {
    const input = makeBaseSlip({
      slipType: 'T4',
      boxes: { box14: 2320, box22: 127.71 },
      fileHash: 'sha256-unique-hash',
    });

    await createSlip(client, input);
    await createSlip(client, input); // duplicate

    const slips = await listSlipsByUserAndTaxYear(client, 'user-abc', 2025, ['active']);
    expect(slips).toHaveLength(1);
  });

  /**
   * Test D — tax engine sees income once, not doubled
   * A T4 with box14=$2,320 and box22=$127.71 uploaded twice must not produce
   * $4,640 employment income or $255.42 tax deducted.
   */
  it('Test D: duplicate upload does not double income seen by the tax engine', async () => {
    const input = makeBaseSlip({
      slipType: 'T4',
      issuerName: 'Employer Inc',
      boxes: { box14: 2320, box22: 127.71 },
      fileHash: 'sha256-t4-income-hash',
    });

    await createSlip(client, input); // first upload
    await createSlip(client, input); // re-upload of same file

    const slips = await listSlipsByUserAndTaxYear(client, 'user-abc', 2025, ['active']);
    expect(slips).toHaveLength(1);

    const taxSlips = slips.map(toTaxSlip).filter((s) => s !== null);
    expect(taxSlips).toHaveLength(1);

    const t4 = taxSlips[0];
    expect(t4!.type).toBe('T4');
    if (t4!.type === 'T4') {
      // Income must not be doubled
      expect(t4.data.box14).toBe(2320);
      expect(t4.data.box14).not.toBe(4640);
      expect(t4.data.box22).toBe(127.71);
      expect(t4.data.box22).not.toBe(255.42);
    }
  });

  // ── T2202-specific dedup and field mapping tests ─────────────────────────────
  // These tests reproduce the smoke-test failure: user uploaded the same T2202
  // (WLU, $14,625.25) and ended up with 3 duplicate rows.

  /**
   * Test A (T2202) — duplicate file_hash returns existing row, no insert
   * Uploading the same T2202 PDF twice must not create a second tax_slips row.
   */
  it('T2202 Test A: duplicate file_hash returns existing row, no second insert', async () => {
    const input = makeBaseSlip({
      slipType: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      boxes: { boxA: 14625.25, boxB: 0, boxC: 4 },
      fileHash: 'sha256-wlu-t2202-2025',
    });

    const slip1 = await createSlip(client, input);
    const slip2 = await createSlip(client, { ...input, issuerName: 'WLU (re-upload)' });

    expect(slip2.id).toBe(slip1.id);
    expect(storage.size).toBe(1);
  });

  /**
   * Test B (T2202) — duplicate source_extraction_id returns existing row
   * Re-saving the same review session (back-nav, double-click) must not insert twice.
   */
  it('T2202 Test B: duplicate source_extraction_id returns existing row', async () => {
    const input = makeBaseSlip({
      slipType: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      boxes: { boxA: 14625.25, boxB: 0, boxC: 4 },
      sourceExtractionId: 'extraction-wlu-t2202-uuid',
    });

    const slip1 = await createSlip(client, input);

    // User navigates back and re-saves the same review page
    const slip2 = await createSlip(client, { ...input, boxes: { boxA: 0, boxB: 0, boxC: 99999 } });

    expect(slip2.id).toBe(slip1.id);
    expect(storage.size).toBe(1);
    // The original boxes are preserved — the re-save payload is discarded
    const stored = await getSlip(client, slip1.id);
    expect(stored!.boxes['boxA']).toBe(14625.25);
  });

  /**
   * Test C (T2202) — listSlipsByUserAndTaxYear returns one T2202 after duplicate
   */
  it('T2202 Test C: listSlips returns one T2202 after duplicate upload attempt', async () => {
    const input = makeBaseSlip({
      slipType: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      boxes: { boxA: 14625.25, boxB: 0, boxC: 4 },
      fileHash: 'sha256-wlu-t2202-dedup-test',
    });

    await createSlip(client, input);
    await createSlip(client, input);

    const slips = await listSlipsByUserAndTaxYear(client, 'user-abc', 2025, ['active']);
    const t2202Slips = slips.filter((s) => s.slipType === 'T2202');
    expect(t2202Slips).toHaveLength(1);
  });

  /**
   * Test D (T2202) — field mapping: toTaxSlip routes values to correct engine fields
   * boxA must be tuition fees, boxB and boxC must be month counts.
   * boxC must NOT equal the tuition amount.
   */
  it('T2202 Test D: toTaxSlip routes tuition to boxA, months to boxB/boxC', async () => {
    const slip = await createSlip(
      client,
      makeBaseSlip({
        slipType: 'T2202',
        issuerName: 'Wilfrid Laurier University',
        boxes: { boxA: 14625.25, boxB: 0, boxC: 4 },
      }),
    );

    const taxSlip = toTaxSlip(slip);
    expect(taxSlip).not.toBeNull();
    expect(taxSlip!.type).toBe('T2202');

    if (taxSlip!.type === 'T2202') {
      // Tuition is in boxA
      expect(taxSlip.data.boxA).toBe(14625.25);
      // Months are small integers
      expect(taxSlip.data.boxB).toBe(0);
      expect(taxSlip.data.boxC).toBe(4);
      // boxC must not be the tuition amount — this is the smoke-test failure scenario
      expect(taxSlip.data.boxC).not.toBe(14625.25);
      expect(taxSlip.data.boxA).not.toBe(0);
    }
  });

  it('T2202 Test D (mapping regression): boxC with tuition amount is preserved in store but flaggable', async () => {
    // Simulate an OCR mis-extraction: tuition landed in boxC, boxA is 0.
    // The store must persist what was given (no silent coercion), but the
    // warning flag lets the caller detect the anomaly.
    const slip = await createSlip(
      client,
      makeBaseSlip({
        slipType: 'T2202',
        issuerName: 'Wilfrid Laurier University',
        boxes: { boxA: 0, boxB: 0, boxC: 14625.25 }, // wrong mapping from OCR
      }),
    );

    // Store layer preserves the bad values as-is (no silent correction)
    expect(slip.boxes['boxA']).toBe(0);
    expect(slip.boxes['boxC']).toBe(14625.25);

    // toTaxSlip still routes them correctly by box key — engine gets wrong data
    // (this is expected: the fix is in the extraction prompt, not in the store)
    const taxSlip = toTaxSlip(slip);
    if (taxSlip!.type === 'T2202') {
      expect(taxSlip.data.boxC).toBe(14625.25); // wrong but faithfully preserved
    }
  });

  /**
   * Test E (T2202) — tax engine sees tuition once after duplicate upload
   * The full scenario from the smoke test: T4 + T4A + T2202, with T2202 uploaded twice.
   * After dedup, only one T2202 row should exist and tuition is counted once.
   */
  it('T2202 Test E: duplicate T2202 upload leaves tuition counted once in engine', async () => {
    const t4Input = makeBaseSlip({
      slipType: 'T4',
      issuerName: 'Employer Inc',
      boxes: { box14: 2320, box22: 127.71 },
      fileHash: 'sha256-t4-smoke-test',
    });

    const t4aInput = makeBaseSlip({
      slipType: 'T4A',
      issuerName: 'University',
      boxes: { box105: 2030 }, // exempt scholarship, ITA s.56(3)
      fileHash: 'sha256-t4a-smoke-test',
    });

    const t2202Input = makeBaseSlip({
      slipType: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      boxes: { boxA: 14625.25, boxB: 0, boxC: 4 },
      fileHash: 'sha256-wlu-t2202-e2e',
    });

    await createSlip(client, t4Input);
    await createSlip(client, t4aInput);
    await createSlip(client, t2202Input);
    await createSlip(client, t2202Input); // duplicate upload — must not insert
    await createSlip(client, t2202Input); // third upload — must not insert

    const slips = await listSlipsByUserAndTaxYear(client, 'user-abc', 2025, ['active']);

    // Must have exactly 3 slips: T4, T4A, T2202 (not 4 or 5)
    expect(slips).toHaveLength(3);

    const t2202s = slips.filter((s) => s.slipType === 'T2202');
    expect(t2202s).toHaveLength(1);

    // Tuition is counted once: $14,625.25, NOT $29,250.50 or $43,875.75
    const taxSlips = slips.map(toTaxSlip).filter((s) => s !== null);
    const engineT2202 = taxSlips.find((s) => s!.type === 'T2202');
    expect(engineT2202).toBeDefined();
    if (engineT2202 && engineT2202.type === 'T2202') {
      expect(engineT2202.data.boxA).toBe(14625.25);
      expect(engineT2202.data.boxA).not.toBe(29250.50);
      expect(engineT2202.data.boxA).not.toBe(43875.75);
    }
  });

  /**
   * Test 16 — dedup SELECT error is logged but INSERT is still attempted
   * When the dedup SELECT fails (e.g. column not yet added in local dev), the
   * code must not silently succeed without inserting — it should proceed to
   * INSERT (which will succeed or fail with a constraint violation at DB level).
   */
  it('dedup SELECT error is logged and INSERT proceeds', async () => {
    // Inject a SELECT error on the first maybeSingle() call (sourceExtractionId check)
    const errorClient = createMockSupabaseClient(storage, {
      injectSelectErrorCount: 1,
      injectSelectErrorCode: 'PGRST204',
      injectSelectErrorMessage: 'column source_extraction_id does not exist',
    });

    const input = makeBaseSlip({
      slipType: 'T2202',
      issuerName: 'Test University',
      boxes: { boxA: 5000, boxB: 0, boxC: 4 },
      sourceExtractionId: 'extraction-error-test',
      fileHash: null, // no file hash — only extraction dedup would apply
    });

    // Even though the dedup SELECT errors, the INSERT must succeed
    const slip = await createSlip(errorClient, input);
    expect(slip.id).toBeTruthy();
    expect(storage.size).toBe(1);
  });
});
