/**
 * TaxAgent.ai — Client-side slip list deduplication helpers.
 *
 * The in-memory slip list used by My Slips must not accumulate logical
 * duplicates when the user re-submits the same slip (e.g. edits and saves
 * the existing T2202 rather than adding a new one). These helpers detect
 * logical duplicates so the caller can replace rather than append.
 *
 * Pure functions — no side effects, no Supabase calls. DB-level dedup is
 * handled by the unique indexes in 20260427000001_align_tax_slips_to_live.sql.
 */

import type { SavedSlip } from '@/lib/supabase/tax-data';

/**
 * Returns true when `candidate` is a logical duplicate of the slip being
 * added (identified by type, issuerName, and data).
 *
 * Two T2202 slips are considered duplicates when they share:
 *   1. The same slip type (T2202).
 *   2. Matching institution names after normalization (case-insensitive, trimmed).
 *      If either name is blank the name check is skipped — a blank institution
 *      is treated as a potential match so we don't silently duplicate a slip
 *      that was saved without a name.
 *   3. Identical boxA (tuition) values when both are non-zero.
 *      If either is zero the amount check is skipped.
 *
 * Non-T2202 slips always return false — other slip types allow multiple rows
 * (e.g. two T4s from two employers at the same company).
 */
export function isLogicalT2202Duplicate(
  candidate: SavedSlip,
  type: string,
  issuerName: string,
  data: Record<string, number | string>,
): boolean {
  if (type !== 'T2202' || candidate.type !== 'T2202') return false;

  const normCandidate = (candidate.issuerName ?? '').trim().toLowerCase();
  const normNew = issuerName.trim().toLowerCase();

  // Two different schools → different slips.
  if (normCandidate && normNew && normCandidate !== normNew) return false;

  const existingBoxA =
    typeof candidate.data['boxA'] === 'number' ? candidate.data['boxA'] : 0;
  const newBoxA =
    typeof data['boxA'] === 'number' ? data['boxA'] : 0;

  // Two different tuition amounts → different slips (e.g. two semesters at
  // different fee totals, which the user explicitly entered separately).
  if (existingBoxA > 0 && newBoxA > 0 && existingBoxA !== newBoxA) return false;

  return true;
}

/**
 * Given the current slip list and a newly submitted slip, returns the updated
 * list with duplicates replaced rather than appended.
 *
 * If a logical duplicate is found, the existing slip's data is replaced in-place
 * (preserving its id and enteredAt so the DB row is updated, not re-inserted).
 * If no duplicate is found, the new slip is appended.
 */
export function upsertSlipInList(
  slips: SavedSlip[],
  type: string,
  issuerName: string,
  data: Record<string, number | string>,
): SavedSlip[] {
  const dupIdx = slips.findIndex((s) =>
    isLogicalT2202Duplicate(s, type, issuerName, data),
  );

  if (dupIdx !== -1) {
    // Replace: preserve id and enteredAt so the Supabase row is updated.
    return slips.map((s, i) =>
      i === dupIdx ? { ...s, issuerName, data } : s,
    );
  }

  // Append: genuinely new slip.
  return [
    ...slips,
    {
      id: crypto.randomUUID(),
      type,
      issuerName,
      data,
      enteredAt: new Date().toISOString(),
    },
  ];
}
