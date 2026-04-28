/**
 * TaxAgent.ai — Client-side slip list deduplication helpers.
 *
 * The in-memory slip list used by My Slips must not accumulate duplicates when
 * the user re-submits the same slip. Strong OCR lineage signals are used for
 * all slip types; T2202 also has a narrow logical duplicate rule because the
 * historical bug created duplicates before OCR metadata was reliable.
 *
 * Pure functions — no side effects, no Supabase calls. DB-level dedup is
 * handled by the unique indexes in 20260427000001_align_tax_slips_to_live.sql
 * and the app-layer guard in dedupeSlipList() (called inside upsertSlips()).
 */

import type { SavedSlip } from '@/lib/supabase/tax-data';

/**
 * Returns true when `candidate` is an exact duplicate of the slip being added.
 *
 * Strong identity signals only:
 *   1. Same row id.
 *   2. Same source_extraction_id.
 *   3. Same slip type and file_hash.
 *
 * This intentionally does not collapse two manual T4s that happen to have the
 * same issuer and box values. That case should be reviewed or warned about,
 * not silently deduplicated.
 */
export function isExactSlipDuplicate(
  candidate: SavedSlip,
  type: string,
  meta?: { id?: string | null; fileHash?: string | null; sourceExtractionId?: string | null },
): boolean {
  if (meta?.id && candidate.id === meta.id) return true;
  if (
    meta?.sourceExtractionId
    && candidate.sourceExtractionId
    && candidate.sourceExtractionId === meta.sourceExtractionId
  ) {
    return true;
  }
  if (
    meta?.fileHash
    && candidate.fileHash
    && candidate.type === type
    && candidate.fileHash === meta.fileHash
  ) {
    return true;
  }
  return false;
}

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
 * Non-T2202 slips always return false — they are only deduplicated by the
 * strong identity signals in isExactSlipDuplicate().
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
 *
 * The optional `source` parameter records how the slip was ingested
 * ('ocr' for uploaded images/PDFs, 'manual' for keyboard entry).
 */
export function upsertSlipInList(
  slips: SavedSlip[],
  type: string,
  issuerName: string,
  data: Record<string, number | string>,
  source?: string,
  meta?: { fileHash?: string | null; sourceExtractionId?: string | null },
): SavedSlip[] {
  const dupIdx = slips.findIndex((s) =>
    isExactSlipDuplicate(s, type, meta)
    || isLogicalT2202Duplicate(s, type, issuerName, data),
  );

  if (dupIdx !== -1) {
    // Replace: preserve id and enteredAt so the Supabase row is updated.
    // Carry source forward (prefer the incoming source if provided).
    return slips.map((s, i) =>
      i === dupIdx ? {
        ...s,
        issuerName,
        data,
        source: source ?? s.source ?? 'manual',
        fileHash: meta?.fileHash ?? s.fileHash ?? null,
        sourceExtractionId: meta?.sourceExtractionId ?? s.sourceExtractionId ?? null,
      } : s,
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
      source: source ?? 'manual',
      fileHash: meta?.fileHash ?? null,
      sourceExtractionId: meta?.sourceExtractionId ?? null,
    },
  ];
}

// ── dedupeSlipList ────────────────────────────────────────────────────────────

/**
 * Scan a full slip list and collapse duplicates to a single row, keeping the
 * most complete version.
 *
 * All slip types are deduplicated on strong identity signals: same row id,
 * same sourceExtractionId, or same slip type + fileHash. T2202 also gets the
 * historical logical duplicate rule above. Non-T2202 manual rows without OCR
 * metadata are left unchanged because multiple T4s can be legitimate.
 *
 * This is the safety net called inside upsertSlips() before every DB write,
 * and during page init when loading from Supabase or localStorage. Any
 * duplicates that slipped through the per-add guard are caught here.
 *
 * "Most complete" preference order:
 *   1. Prefer a slip with fileHash (OCR upload → more authoritative source).
 *   2. Prefer a slip with sourceExtractionId (traceable OCR session).
 *   3. Prefer the slip with the later enteredAt (most recent edit wins).
 */
export function dedupeSlipList(slips: SavedSlip[]): SavedSlip[] {
  const result: SavedSlip[] = [];

  for (const candidate of slips) {
    const existingIdx = result.findIndex((s) =>
      isExactSlipDuplicate(s, candidate.type, {
        id: candidate.id,
        fileHash: candidate.fileHash,
        sourceExtractionId: candidate.sourceExtractionId,
      })
      || isLogicalT2202Duplicate(s, candidate.type, candidate.issuerName, candidate.data),
    );

    if (existingIdx === -1) {
      result.push(candidate);
    } else {
      // Merge: pick the better base, then backfill metadata from the loser
      // so OCR lineage (fileHash, sourceExtractionId) is never silently dropped.
      const existing = result[existingIdx];
      const base = _preferIncoming(candidate, existing) ? candidate : existing;
      const other = base === candidate ? existing : candidate;
      result[existingIdx] = {
        ...base,
        fileHash: base.fileHash ?? other.fileHash ?? null,
        sourceExtractionId: base.sourceExtractionId ?? other.sourceExtractionId ?? null,
        source: base.source === 'ocr' || other.source === 'ocr'
          ? 'ocr'
          : base.source ?? other.source ?? 'manual',
      };
    }
  }

  return result;
}

/** Returns true when `incoming` is a better representation than `existing`. */
function _preferIncoming(incoming: SavedSlip, existing: SavedSlip): boolean {
  // fileHash → slip came from a real document; always prefer it.
  if (incoming.fileHash && !existing.fileHash) return true;
  if (existing.fileHash && !incoming.fileHash) return false;
  // sourceExtractionId → traceable OCR session.
  if (incoming.sourceExtractionId && !existing.sourceExtractionId) return true;
  if (existing.sourceExtractionId && !incoming.sourceExtractionId) return false;
  // Fall back to recency.
  return incoming.enteredAt > existing.enteredAt;
}
