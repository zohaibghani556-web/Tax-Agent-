/**
 * Tests for client-side slip list deduplication.
 *
 * Covers:
 *   - isLogicalT2202Duplicate: detection of logical T2202 duplicates
 *   - upsertSlipInList: replace vs append behaviour
 */

import { describe, it, expect } from 'vitest';
import { isLogicalT2202Duplicate, upsertSlipInList } from './slip-dedup';
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
});
