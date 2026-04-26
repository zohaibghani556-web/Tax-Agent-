/**
 * Tests for client-side slip list deduplication.
 *
 * Covers:
 *   - isLogicalT2202Duplicate: detection of logical T2202 duplicates
 *   - upsertSlipInList: replace vs append behaviour
 *   - dedupeSlipList: full-list normalization (safety net before DB writes)
 *
 * Smoke test regression tests (WLU T2202, April 2026):
 *   Test A: two identical T2202 slips → dedupeSlipList returns one
 *   Test B: dedupeSlipList called by upsertSlips → only one T2202 persisted
 *   Test C: preserved slip fields (source, enteredAt) survive dedup
 *   Test D: localStorage + Supabase duplicates merged → one slip
 *   Test E: add same T2202 twice via upsertSlipInList → one slip (card shows 1)
 */

import { describe, it, expect } from 'vitest';
import { isLogicalT2202Duplicate, upsertSlipInList, dedupeSlipList } from './slip-dedup';
import type { SavedSlip } from '@/lib/supabase/tax-data';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeT2202 = (
  overrides: Partial<SavedSlip> & { boxA?: number; boxB?: number; boxC?: number } = {},
): SavedSlip => {
  const { boxA = 14625.25, boxB = 0, boxC = 8, ...rest } = overrides;
  return {
    id: crypto.randomUUID(),
    type: 'T2202',
    issuerName: 'Wilfrid Laurier University',
    data: { boxA, boxB, boxC },
    enteredAt: new Date().toISOString(),
    ...rest,
  };
};

// ── isLogicalT2202Duplicate ───────────────────────────────────────────────────

describe('isLogicalT2202Duplicate', () => {
  it('returns false for non-T2202 types', () => {
    const existing: SavedSlip = { ...makeT2202(), type: 'T4' };
    expect(isLogicalT2202Duplicate(existing, 'T4', 'Employer', { box14: 50000 })).toBe(false);
  });

  it('returns false when existing is T4 and new is T2202', () => {
    const existing: SavedSlip = { ...makeT2202(), type: 'T4' };
    expect(isLogicalT2202Duplicate(existing, 'T2202', 'WLU', { boxA: 14625.25 })).toBe(false);
  });

  it('detects duplicate with same institution name (case-insensitive)', () => {
    const existing = makeT2202({ issuerName: 'Wilfrid Laurier University' });
    expect(
      isLogicalT2202Duplicate(existing, 'T2202', 'wilfrid laurier university', { boxA: 14625.25, boxB: 0, boxC: 8 }),
    ).toBe(true);
  });

  it('detects duplicate with same institution name (trimmed whitespace)', () => {
    const existing = makeT2202({ issuerName: '  WLU  ' });
    expect(
      isLogicalT2202Duplicate(existing, 'T2202', 'wlu', { boxA: 14625.25 }),
    ).toBe(true);
  });

  it('returns false when institution names differ', () => {
    const existing = makeT2202({ issuerName: 'Wilfrid Laurier University' });
    expect(
      isLogicalT2202Duplicate(existing, 'T2202', 'University of Waterloo', { boxA: 14625.25 }),
    ).toBe(false);
  });

  it('returns false when tuition amounts differ', () => {
    const existing = makeT2202({ boxA: 14625.25 });
    expect(
      isLogicalT2202Duplicate(existing, 'T2202', 'Wilfrid Laurier University', { boxA: 9000 }),
    ).toBe(false);
  });

  it('is a match when both boxA values are 0 (no tuition discriminator)', () => {
    const existing = makeT2202({ boxA: 0 });
    expect(
      isLogicalT2202Duplicate(existing, 'T2202', 'Wilfrid Laurier University', { boxA: 0 }),
    ).toBe(true);
  });

  it('is a match when existing issuerName is blank (name check skipped)', () => {
    const existing = makeT2202({ issuerName: '' });
    expect(
      isLogicalT2202Duplicate(existing, 'T2202', 'WLU', { boxA: 14625.25 }),
    ).toBe(true);
  });
});

// ── upsertSlipInList ──────────────────────────────────────────────────────────

describe('upsertSlipInList', () => {
  it('appends a T2202 when the list is empty', () => {
    const result = upsertSlipInList([], 'T2202', 'WLU', { boxA: 14625.25, boxB: 0, boxC: 8 });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('T2202');
    expect(result[0].data['boxA']).toBe(14625.25);
  });

  it('replaces an existing T2202 with matching institution and tuition', () => {
    const existing = makeT2202();
    const list = [existing];

    const updated = upsertSlipInList(list, 'T2202', 'Wilfrid Laurier University', {
      boxA: 14625.25,
      boxB: 0,
      boxC: 8,
    });

    expect(updated).toHaveLength(1); // no append
    expect(updated[0].id).toBe(existing.id); // same DB row
    expect(updated[0].issuerName).toBe('Wilfrid Laurier University');
  });

  it('appends a second T2202 when institution names differ (two schools)', () => {
    const wlu = makeT2202({ issuerName: 'Wilfrid Laurier University' });
    const list = [wlu];

    const updated = upsertSlipInList(list, 'T2202', 'University of Waterloo', {
      boxA: 8000,
      boxB: 0,
      boxC: 4,
    });

    expect(updated).toHaveLength(2);
  });

  it('appends a second T2202 when tuition amounts differ', () => {
    const existing = makeT2202({ boxA: 14625.25 });
    const list = [existing];

    const updated = upsertSlipInList(list, 'T2202', 'Wilfrid Laurier University', {
      boxA: 9000,
      boxB: 0,
      boxC: 4,
    });

    expect(updated).toHaveLength(2);
  });

  it('editing a T2202 replaces it in-place (does not create a duplicate)', () => {
    const original = makeT2202({ boxA: 14625.25, boxC: 8 });
    const list = [original];

    // Simulate: user edits the slip — changes boxC from 8 to 7.
    const updated = upsertSlipInList(list, 'T2202', original.issuerName, {
      boxA: 14625.25,
      boxB: 0,
      boxC: 7,
    });

    expect(updated).toHaveLength(1); // still one slip
    expect(updated[0].id).toBe(original.id); // same row
    expect(updated[0].data['boxC']).toBe(7); // updated value
  });

  it('non-T2202 slips are always appended (multiple T4s allowed)', () => {
    const t4a: SavedSlip = {
      id: crypto.randomUUID(),
      type: 'T4',
      issuerName: 'Employer A',
      data: { box14: 50000, box22: 8000 },
      enteredAt: new Date().toISOString(),
    };
    const list = [t4a];

    const updated = upsertSlipInList(list, 'T4', 'Employer B', { box14: 30000, box22: 4000 });
    expect(updated).toHaveLength(2);
  });

  it('source is attached to newly appended slip', () => {
    const result = upsertSlipInList([], 'T2202', 'WLU', { boxA: 14625.25, boxB: 1, boxC: 10 }, 'ocr');
    expect(result[0].source).toBe('ocr');
  });

  it('source defaults to manual when omitted', () => {
    const result = upsertSlipInList([], 'T2202', 'WLU', { boxA: 14625.25 });
    expect(result[0].source).toBe('manual');
  });

  it('source on existing slip is updated when a new source is provided', () => {
    const existing = makeT2202({ id: 'x' });
    const result = upsertSlipInList([existing], 'T2202', existing.issuerName, { boxA: 14625.25, boxB: 0, boxC: 8 }, 'ocr');
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('ocr');
  });
});

// ── dedupeSlipList ────────────────────────────────────────────────────────────

describe('dedupeSlipList', () => {
  // ── Test A: smoke test regression (WLU T2202, April 2026) ─────────────────
  it('[Test A] two identical WLU T2202 slips → returns one slip', () => {
    const slip1: SavedSlip = {
      id: 'a',
      type: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      data: { boxA: 14625.25, boxB: 1, boxC: 10, institutionName: 'Wilfrid Laurier University' },
      enteredAt: '2026-04-26T14:34:20.345Z',
    };
    const slip2: SavedSlip = {
      id: 'b',
      type: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      data: { boxA: 14625.25, boxB: 1, boxC: 10, institutionName: 'Wilfrid Laurier University' },
      enteredAt: '2026-04-26T14:34:42.562Z',
    };

    const result = dedupeSlipList([slip1, slip2]);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('T2202');
    expect(result[0].issuerName).toBe('Wilfrid Laurier University');
    expect(result[0].data['boxA']).toBe(14625.25);
    // Keeps the later slip (slip2 has the later enteredAt).
    expect(result[0].id).toBe('b');
  });

  // ── Test B: upsertSlips() safety net — dedupeSlipList prevents DB duplicates ──
  it('[Test B] dedupeSlipList called on list before upsertSlips() write → one T2202 persisted', () => {
    // This test exercises the pure function that upsertSlips() calls internally.
    const dup1 = makeT2202({ id: 'dup1', boxA: 14625.25, boxB: 1, boxC: 10 });
    const dup2 = makeT2202({ id: 'dup2', boxA: 14625.25, boxB: 1, boxC: 10 });

    const deduped = dedupeSlipList([dup1, dup2]);

    // upsertSlips() will only insert one row.
    expect(deduped).toHaveLength(1);
    expect(deduped[0].data['boxA']).toBe(14625.25);
  });

  // ── Test C: source and enteredAt survive dedup ─────────────────────────────
  it('[Test C] preserved slip retains source=ocr after dedup', () => {
    const ocrSlip: SavedSlip = {
      id: 'ocr-slip',
      type: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      data: { boxA: 14625.25, boxB: 1, boxC: 10 },
      enteredAt: '2026-04-26T14:34:42.562Z',
      source: 'ocr',
    };
    const manualSlip: SavedSlip = {
      id: 'manual-slip',
      type: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      data: { boxA: 14625.25, boxB: 1, boxC: 10 },
      enteredAt: '2026-04-26T14:34:20.345Z',
      source: 'manual',
    };

    // ocrSlip has a later enteredAt → preferred.
    const result = dedupeSlipList([manualSlip, ocrSlip]);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('ocr');
  });

  // ── Test D: localStorage + Supabase duplicates merged → one slip ───────────
  it('[Test D] Supabase slip + localStorage duplicate → combined dedup shows one T2202', () => {
    const supabaseSlip: SavedSlip = {
      id: 'supabase-row',
      type: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      data: { boxA: 14625.25, boxB: 1, boxC: 10 },
      enteredAt: '2026-04-26T14:34:20.345Z',
    };
    const localStorageSlip: SavedSlip = {
      id: 'localstorage-row',
      type: 'T2202',
      issuerName: 'Wilfrid Laurier University',
      data: { boxA: 14625.25, boxB: 1, boxC: 10 },
      enteredAt: '2026-04-26T14:34:42.562Z',
    };

    // Simulates: both sources loaded and merged before setState.
    const merged = dedupeSlipList([supabaseSlip, localStorageSlip]);
    expect(merged).toHaveLength(1);
  });

  // ── Test E: add same T2202 twice through handler → card shows 1 slip ───────
  it('[Test E] adding the same T2202 twice via upsertSlipInList results in one slip entry', () => {
    const empty: SavedSlip[] = [];
    const data = { boxA: 14625.25, boxB: 1, boxC: 10, institutionName: 'Wilfrid Laurier University' };

    // First add (e.g., user uploads T2202 the first time).
    const afterFirst = upsertSlipInList(empty, 'T2202', 'Wilfrid Laurier University', data, 'ocr');
    expect(afterFirst).toHaveLength(1); // T2202 card shows 1 slip entered.

    // Second add (user uploads the same T2202 again).
    const afterSecond = upsertSlipInList(afterFirst, 'T2202', 'Wilfrid Laurier University', data, 'ocr');
    expect(afterSecond).toHaveLength(1); // Still 1 slip — no duplicate appended.
    expect(afterSecond[0].id).toBe(afterFirst[0].id); // Same DB row preserved.
  });

  it('non-T2202 slips are untouched (two T4s from different employers kept)', () => {
    const t4a: SavedSlip = {
      id: 'e1',
      type: 'T4',
      issuerName: 'Employer A',
      data: { box14: 50000 },
      enteredAt: new Date().toISOString(),
    };
    const t4b: SavedSlip = {
      id: 'e2',
      type: 'T4',
      issuerName: 'Employer A', // same employer, allowed
      data: { box14: 50000 },
      enteredAt: new Date().toISOString(),
    };

    expect(dedupeSlipList([t4a, t4b])).toHaveLength(2);
  });

  it('prefers slip with fileHash over one without', () => {
    const withHash: SavedSlip = {
      id: 'with-hash',
      type: 'T2202',
      issuerName: 'WLU',
      data: { boxA: 14625.25 },
      enteredAt: '2026-04-01T00:00:00Z', // earlier
      fileHash: 'abc123',
    };
    const withoutHash: SavedSlip = {
      id: 'no-hash',
      type: 'T2202',
      issuerName: 'WLU',
      data: { boxA: 14625.25 },
      enteredAt: '2026-04-02T00:00:00Z', // later but no hash
      fileHash: null,
    };

    // withHash wins even though it's older.
    const result = dedupeSlipList([withoutHash, withHash]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('with-hash');
  });

  it('two different schools are kept as separate slips', () => {
    const wlu = makeT2202({ issuerName: 'Wilfrid Laurier University', boxA: 14625.25 });
    const uow = makeT2202({ issuerName: 'University of Waterloo', boxA: 8000 });

    expect(dedupeSlipList([wlu, uow])).toHaveLength(2);
  });

  it('empty list returns empty list', () => {
    expect(dedupeSlipList([])).toEqual([]);
  });

  it('single slip returned unchanged', () => {
    const slip = makeT2202();
    const result = dedupeSlipList([slip]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(slip.id);
  });
});

// ── Stage 4: OCR metadata propagation through upsertSlipInList ──────────────

describe('upsertSlipInList — OCR metadata (fileHash / sourceExtractionId)', () => {
  it('appended OCR slip carries fileHash and sourceExtractionId', () => {
    const meta = { fileHash: 'abc123', sourceExtractionId: 'ext-001' };
    const result = upsertSlipInList([], 'T4', 'Employer', { box14: 50000 }, 'ocr', meta);

    expect(result).toHaveLength(1);
    expect(result[0].fileHash).toBe('abc123');
    expect(result[0].sourceExtractionId).toBe('ext-001');
    expect(result[0].source).toBe('ocr');
  });

  it('manual entry with no meta gets null fileHash and sourceExtractionId', () => {
    const result = upsertSlipInList([], 'T4', 'Employer', { box14: 50000 });

    expect(result).toHaveLength(1);
    expect(result[0].fileHash).toBeNull();
    expect(result[0].sourceExtractionId).toBeNull();
    expect(result[0].source).toBe('manual');
  });

  it('replacing a T2202 duplicate updates fileHash and sourceExtractionId', () => {
    const existing = makeT2202({ id: 'orig' });
    expect(existing.fileHash).toBeUndefined(); // no hash on the original

    const meta = { fileHash: 'def456', sourceExtractionId: 'ext-002' };
    const result = upsertSlipInList(
      [existing], 'T2202', existing.issuerName,
      { boxA: 14625.25, boxB: 0, boxC: 8 }, 'ocr', meta,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('orig');
    expect(result[0].fileHash).toBe('def456');
    expect(result[0].sourceExtractionId).toBe('ext-002');
  });

  it('replacing without meta preserves existing fileHash', () => {
    const existing: SavedSlip = {
      ...makeT2202({ id: 'orig' }),
      fileHash: 'keep-me',
      sourceExtractionId: 'ext-keep',
    };

    // Re-upload same T2202 without meta (e.g. manual edit).
    const result = upsertSlipInList(
      [existing], 'T2202', existing.issuerName,
      { boxA: 14625.25, boxB: 0, boxC: 8 },
    );

    expect(result).toHaveLength(1);
    expect(result[0].fileHash).toBe('keep-me');
    expect(result[0].sourceExtractionId).toBe('ext-keep');
  });

  it('uploading same T2202 twice with meta produces one slip with non-null metadata', () => {
    const data = { boxA: 14625.25, boxB: 1, boxC: 10 };
    const meta = { fileHash: 'same-hash', sourceExtractionId: 'ext-same' };

    const after1 = upsertSlipInList([], 'T2202', 'WLU', data, 'ocr', meta);
    expect(after1).toHaveLength(1);

    const after2 = upsertSlipInList(after1, 'T2202', 'WLU', data, 'ocr', meta);
    expect(after2).toHaveLength(1);
    expect(after2[0].fileHash).toBe('same-hash');
    expect(after2[0].sourceExtractionId).toBe('ext-same');
  });
});
