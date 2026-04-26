/**
 * Tests for T2202 box validation (ITA s.118.5).
 *
 * Covers:
 *   - valid values (no errors)
 *   - boxB > 12 warning
 *   - boxC > 12 warning (generic)
 *   - boxC > 12 + boxA = 0 → tuition-in-wrong-box warning
 *   - the exact production data that caused corrupt rows
 */

import { describe, it, expect } from 'vitest';
import { validateT2202Boxes } from './t2202-validation';

describe('validateT2202Boxes', () => {
  // ── Valid cases ────────────────────────────────────────────────────────────

  it('accepts a valid boxA dollar amount with boxC month count', () => {
    const { errors } = validateT2202Boxes(14625.25, 0, 8);
    expect(errors).toEqual({});
  });

  it('accepts boxC = 12 (maximum valid full-time month count)', () => {
    const { errors } = validateT2202Boxes(5000, 0, 12);
    expect(errors['boxC']).toBeUndefined();
  });

  it('accepts boxB = 12 (maximum valid part-time month count)', () => {
    const { errors } = validateT2202Boxes(2000, 12, 0);
    expect(errors['boxB']).toBeUndefined();
  });

  it('accepts undefined boxes without errors', () => {
    const { errors } = validateT2202Boxes(undefined, undefined, undefined);
    expect(errors).toEqual({});
  });

  it('accepts boxA = 0 with no month anomaly when boxC is valid', () => {
    const { errors, likelyTuitionInWrongBox } = validateT2202Boxes(0, 0, 8);
    expect(errors).toEqual({});
    expect(likelyTuitionInWrongBox).toBe(false);
  });

  // ── Box B violations ──────────────────────────────────────────────────────

  it('warns when boxB is 13 (one over the limit)', () => {
    const { errors } = validateT2202Boxes(5000, 13, 0);
    expect(errors['boxB']).toContain('months');
  });

  it('warns when boxB contains a large dollar amount', () => {
    const { errors } = validateT2202Boxes(5000, 4500, 0);
    expect(errors['boxB']).toContain('months');
  });

  // ── Box C violations ──────────────────────────────────────────────────────

  it('warns when boxC is 14 and boxA is set (generic month warning)', () => {
    const { errors, likelyTuitionInWrongBox } = validateT2202Boxes(5000, 0, 14);
    expect(errors['boxC']).toContain('months');
    expect(likelyTuitionInWrongBox).toBe(false);
  });

  // ── Tuition-in-wrong-box detection ───────────────────────────────────────

  it('fires likelyTuitionInWrongBox when boxC > 12 and boxA = 0', () => {
    const { errors, likelyTuitionInWrongBox } = validateT2202Boxes(0, 0, 14625.25);
    expect(likelyTuitionInWrongBox).toBe(true);
    expect(errors['boxC']).toContain('Box A');
  });

  it('does NOT fire likelyTuitionInWrongBox when boxA is already set', () => {
    const { likelyTuitionInWrongBox } = validateT2202Boxes(14625.25, 0, 14625.25);
    expect(likelyTuitionInWrongBox).toBe(false);
  });

  it('still returns a boxC error even when boxA is set', () => {
    const { errors } = validateT2202Boxes(14625.25, 0, 14625.25);
    expect(errors['boxC']).toBeTruthy();
    // Message should NOT suggest Box A when boxA already has a value
    expect(errors['boxC']).not.toContain('Box A');
  });

  // ── Production regression: the corrupt rows that prompted this fix ────────

  it('catches the exact corrupt row: boxC = 14625.25 with boxA = 0', () => {
    // Reproduces the production bug: two T2202 rows had tuition ($14,625.25)
    // stored in boxC instead of boxA. The engine used boxA for tuition, so
    // the credit was silently zeroed out.
    const { errors, likelyTuitionInWrongBox } = validateT2202Boxes(0, 0, 14625.25);

    expect(likelyTuitionInWrongBox).toBe(true);
    expect(errors['boxC']).toBeTruthy();
    expect(errors['boxC']).toContain('Box A');
  });

  it('does not flag boxC = 14625.25 as wrong-box when boxA = 14625.25 (correct entry)', () => {
    // The user correctly entered tuition in boxA and months in boxC is still wrong
    // (> 12), but it is not the tuition-in-wrong-box pattern.
    const { likelyTuitionInWrongBox } = validateT2202Boxes(14625.25, 0, 14625.25);
    expect(likelyTuitionInWrongBox).toBe(false);
  });
});
