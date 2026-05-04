/**
 * TaxAgent.ai — Slip Corrections API
 *
 * POST /api/slips/corrections
 *
 * Called when the user finishes reviewing an extraction. It:
 *   1. Bulk-inserts correction records (field-level diffs) into slip_corrections
 *   2. Marks the extraction as reviewed (reviewed_by_user_at = now())
 *   3. Upserts the corrected slip into tax_slips via the profile helper
 *
 * Body:
 *   {
 *     extractionId: string,
 *     slipType: string,
 *     issuerName: string,
 *     taxYear: number,
 *     correctedBoxes: Record<string, number | string>,
 *     corrections: Array<{ fieldName: string; originalValue: string | null; correctedValue: string }>
 *   }
 *
 * Security:
 *   - Requires valid Supabase JWT
 *   - CSRF token validation
 *   - Rate limited: 60 per user per hour (same as calculate endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateCsrfToken } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { upsertSlipInList } from '@/lib/slips/slip-dedup';
import { validateReviewFieldValues, sanitizeReviewFieldValues } from '@/lib/slips/review-values';
import { SUPPORTED_SLIP_TYPES, type SavedSlip } from '@/lib/supabase/tax-data';

interface CorrectionEntry {
  fieldName: string;
  originalValue: string | null;
  correctedValue: string;
}

interface RequestBody {
  extractionId: string;
  slipType: string;
  issuerName: string;
  taxYear: number;
  correctedBoxes: Record<string, number | string>;
  corrections: CorrectionEntry[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  // --- Auth ---
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- CSRF ---
  if (!validateCsrfToken(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // --- Rate limit ---
  if (!checkRateLimit(`corrections:${user.id}`, 60, 60 * 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // --- Parse body ---
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { extractionId, slipType, issuerName, taxYear, correctedBoxes, corrections } = body;

  if (!extractionId || !UUID_RE.test(extractionId)) {
    return NextResponse.json({ error: 'Invalid extractionId' }, { status: 400 });
  }
  if (typeof slipType !== 'string' || slipType.length === 0) {
    return NextResponse.json({ error: 'slipType required' }, { status: 400 });
  }
  if (!Number.isInteger(taxYear)) {
    return NextResponse.json({ error: 'taxYear required' }, { status: 400 });
  }
  if (!correctedBoxes || typeof correctedBoxes !== 'object') {
    return NextResponse.json({ error: 'correctedBoxes required' }, { status: 400 });
  }

  // --- Server-side required field validation (don't trust client) ---
  // Merge issuerName into boxes for validation (review page sends it separately)
  const issuerKey = slipType === 'T2202' ? 'institutionName' : 'issuerName';
  const boxesForValidation = { ...correctedBoxes };
  if (typeof issuerName === 'string' && issuerName.trim().length > 0) {
    boxesForValidation[issuerKey] = issuerName.trim();
  }
  const fieldIssues = validateReviewFieldValues(slipType, boxesForValidation);
  if (fieldIssues.length > 0) {
    return NextResponse.json(
      {
        error: 'Slip has missing or invalid required fields',
        fieldErrors: fieldIssues,
      },
      { status: 422 },
    );
  }

  // Sanitize values — strip blanks, coerce types, reject garbage
  const sanitizedBoxes = sanitizeReviewFieldValues(slipType, boxesForValidation);

  // Verify this extraction belongs to the caller (RLS double-check)
  const { data: extraction, error: fetchErr } = await supabase
    .from('slip_extractions')
    .select('id, user_id, file_hash')
    .eq('id', extractionId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !extraction) {
    return NextResponse.json({ error: 'Extraction not found' }, { status: 404 });
  }

  // --- 1. Insert corrections ---
  if (Array.isArray(corrections) && corrections.length > 0) {
    const rows = corrections.map((c) => ({
      user_id: user.id,
      extraction_id: extractionId,
      field_name: c.fieldName,
      original_value: c.originalValue ?? null,
      corrected_value: c.correctedValue,
    }));

    const { error: insertErr } = await supabase.from('slip_corrections').insert(rows);
    if (insertErr) {
      log('warn', 'corrections.insert_failed', { reason: insertErr.message });
      // Non-fatal — still proceed with marking reviewed
    }
  }

  // --- 2. Mark extraction reviewed ---
  const reviewedAt = new Date().toISOString();
  const { data: reviewedExtraction, error: updateErr } = await supabase
    .from('slip_extractions')
    .update({ reviewed_by_user_at: reviewedAt })
    .eq('id', extractionId)
    .eq('user_id', user.id)
    .select('id')
    .single();

  if (updateErr || !reviewedExtraction) {
    log('warn', 'corrections.mark_reviewed_failed', {
      extractionId,
      reason: updateErr?.message ?? 'No extraction row updated',
    });
    return NextResponse.json({ error: 'Could not mark extraction reviewed' }, { status: 500 });
  }

  const { data: verifiedReview, error: verifyReviewErr } = await supabase
    .from('slip_extractions')
    .select('id, reviewed_by_user_at')
    .eq('id', extractionId)
    .eq('user_id', user.id)
    .single();

  if (verifyReviewErr || !verifiedReview?.reviewed_by_user_at) {
    log('warn', 'corrections.review_write_not_visible', {
      extractionId,
      reason: verifyReviewErr?.message ?? 'reviewed_by_user_at still null after update',
    });
    return NextResponse.json({ error: 'Could not verify extraction review status' }, { status: 500 });
  }

  // --- 3. Persist reviewed OCR slip in the same server-owned flow ---
  if (!SUPPORTED_SLIP_TYPES.has(slipType)) {
    return NextResponse.json({ error: 'Unsupported slip type' }, { status: 400 });
  }

  const { data: profile, error: profileFetchErr } = await supabase
    .from('tax_profiles')
    .select('id, tax_year')
    .eq('user_id', user.id)
    .eq('tax_year', taxYear)
    .maybeSingle();

  if (profileFetchErr) {
    log('warn', 'corrections.profile_fetch_failed', { reason: profileFetchErr.message });
    return NextResponse.json({ error: 'Could not load tax profile' }, { status: 500 });
  }

  let profileId = profile?.id as string | undefined;
  if (!profileId) {
    const { data: createdProfile, error: profileCreateErr } = await supabase
      .from('tax_profiles')
      .insert({ user_id: user.id, tax_year: taxYear })
      .select('id')
      .single();

    if (profileCreateErr || !createdProfile) {
      log('warn', 'corrections.profile_create_failed', {
        reason: profileCreateErr?.message ?? 'No profile row returned',
      });
      return NextResponse.json({ error: 'Could not create tax profile' }, { status: 500 });
    }
    profileId = createdProfile.id as string;
  }

  const { data: existingRows, error: existingErr } = await supabase
    .from('tax_slips')
    .select('id, slip_type, issuer_name, boxes, created_at, source, file_hash, source_extraction_id')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  if (existingErr) {
    log('warn', 'corrections.tax_slips_fetch_failed', { reason: existingErr.message });
    return NextResponse.json({ error: 'Could not load existing slips' }, { status: 500 });
  }

  const existingSlips: SavedSlip[] = (existingRows ?? []).map((row) => ({
    id: row.id as string,
    type: row.slip_type as string,
    issuerName: (row.issuer_name as string | null) ?? '',
    data: (row.boxes as Record<string, number | string> | null) ?? {},
    enteredAt: (row.created_at as string | null) ?? new Date().toISOString(),
    source: (row.source as string | null) ?? undefined,
    fileHash: (row.file_hash as string | null) ?? null,
    sourceExtractionId: (row.source_extraction_id as string | null) ?? null,
  }));

  const updatedSlips = upsertSlipInList(
    existingSlips,
    slipType,
    typeof issuerName === 'string' ? issuerName : '',
    sanitizedBoxes,
    'ocr',
    {
      fileHash: (extraction.file_hash as string | null) ?? null,
      sourceExtractionId: extractionId,
    },
  ).filter((slip) => SUPPORTED_SLIP_TYPES.has(slip.type));

  const { error: deleteErr } = await supabase
    .from('tax_slips')
    .delete()
    .eq('profile_id', profileId);

  if (deleteErr) {
    log('warn', 'corrections.tax_slips_delete_failed', { reason: deleteErr.message });
    return NextResponse.json({ error: 'Could not replace saved slips' }, { status: 500 });
  }

  if (updatedSlips.length > 0) {
    const rows = updatedSlips.map((slip) => ({
      user_id: user.id,
      profile_id: profileId,
      slip_type: slip.type,
      issuer_name: slip.issuerName,
      boxes: slip.data,
      source: slip.source ?? 'manual',
      verified: true,
      created_at: slip.enteredAt,
      tax_year: taxYear,
      file_hash: slip.fileHash ?? null,
      source_extraction_id: slip.sourceExtractionId ?? null,
    }));

    const { error: insertErr } = await supabase.from('tax_slips').insert(rows);
    if (insertErr) {
      log('warn', 'corrections.tax_slips_insert_failed', { reason: insertErr.message });
      return NextResponse.json({ error: 'Could not save reviewed slip' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, reviewedAt, slips: updatedSlips });
}
