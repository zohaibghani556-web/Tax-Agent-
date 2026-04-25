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
  if (!correctedBoxes || typeof correctedBoxes !== 'object') {
    return NextResponse.json({ error: 'correctedBoxes required' }, { status: 400 });
  }

  // Verify this extraction belongs to the caller (RLS double-check)
  const { data: extraction, error: fetchErr } = await supabase
    .from('slip_extractions')
    .select('id, user_id')
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
  const { error: updateErr } = await supabase
    .from('slip_extractions')
    .update({ reviewed_by_user_at: new Date().toISOString() })
    .eq('id', extractionId);

  if (updateErr) {
    log('warn', 'corrections.mark_reviewed_failed', { reason: updateErr.message });
  }

  // --- 3. Upsert corrected slip into tax_slips via tax_profiles ---
  // Get or create the tax_profiles row for this user + year
  const { data: profileRow } = await supabase
    .from('tax_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('tax_year', taxYear ?? 2025)
    .maybeSingle();

  let profileId = profileRow?.id as string | undefined;
  if (!profileId) {
    const { data: created } = await supabase
      .from('tax_profiles')
      .insert({ user_id: user.id, tax_year: taxYear ?? 2025 })
      .select('id')
      .single();
    profileId = created?.id as string | undefined;
  }

  if (profileId) {
    const { error: slipErr } = await supabase.from('tax_slips').upsert(
      {
        profile_id: profileId,
        slip_type: slipType,
        issuer_name: issuerName ?? '',
        slip_data: correctedBoxes,
        tax_year: taxYear ?? 2025,
        source: 'ocr_reviewed',
      },
      { onConflict: 'profile_id,slip_type,issuer_name' },
    );

    if (slipErr) {
      log('warn', 'corrections.slip_upsert_failed', { reason: slipErr.message });
    }
  }

  return NextResponse.json({ ok: true });
}
