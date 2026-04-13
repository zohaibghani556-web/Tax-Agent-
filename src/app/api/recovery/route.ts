/**
 * TaxAgent.ai — Retroactive Recovery API Route
 *
 * POST /api/recovery
 * Accepts a multipart form with:
 *   - file: PNG, JPG, WebP, or PDF of a CRA Notice of Assessment
 *   - hasSpouseOrDependant: "true" | "false" (optional, defaults to "false")
 *   - ageOnDec31: number string (optional — taxpayer's age on Dec 31 of the assessed year)
 *
 * Returns:
 *   { opportunities: RecoveryOpportunity[], totalRecoverable: number, noa: ParsedNOA }
 *
 * Security:
 *   - Requires valid Supabase JWT (cookie-based session)
 *   - CSRF token validation
 *   - Max file size: 10 MB
 *   - Rate limit: 10 recovery scans per user per hour
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrfToken } from '@/lib/csrf';
import { log } from '@/lib/logger';
import { parseNOA } from '@/lib/recovery/noa-parser';
import { analyzeReturn, totalRecoverable } from '@/lib/recovery/recovery-engine';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── CSRF ──────────────────────────────────────────────────────────────────
  if (!validateCsrfToken(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // ── Rate limit: 10 scans per user per hour ────────────────────────────────
  if (!checkRateLimit(`recovery:${user.id}`, 10, 60 * 60_000)) {
    return NextResponse.json(
      { error: 'Rate limit reached. You can scan up to 10 NOAs per hour.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }

  // ── Parse multipart form ──────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart request' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PNG, JPG, WebP, or PDF.' },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum 10 MB.' }, { status: 400 });
  }

  // ── Optional context fields ───────────────────────────────────────────────
  const hasSpouseOrDependant =
    formData.get('hasSpouseOrDependant') === 'true';

  const ageRaw = formData.get('ageOnDec31');
  const ageOnDec31 = ageRaw != null && ageRaw !== '' ? parseInt(String(ageRaw), 10) : undefined;

  // ── Parse the NOA via Claude ──────────────────────────────────────────────
  let noa;
  try {
    const buffer = await file.arrayBuffer();
    noa = await parseNOA(buffer, file.type);
  } catch (err) {
    log('error', 'recovery.noa_parse_error', { message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to read the Notice of Assessment' }, { status: 502 });
  }

  // Reject if we couldn't extract any income information
  if (noa.taxYear === 0 || (noa.line15000 === -1 && noa.line23600 === -1)) {
    return NextResponse.json(
      { error: 'Could not extract income data from this document. Please upload a clearer image.' },
      { status: 422 },
    );
  }

  // ── Run recovery analysis ─────────────────────────────────────────────────
  const opportunities = analyzeReturn(noa, {
    hasSpouseOrDependant,
    ageOnDec31: Number.isFinite(ageOnDec31) ? ageOnDec31 : undefined,
  });

  const recoverableTotal = totalRecoverable(opportunities);

  // ── Persist to Supabase ───────────────────────────────────────────────────
  try {
    const { error: insertError } = await supabase
      .from('recovery_scans')
      .insert({
        user_id:           user.id,
        tax_year:          noa.taxYear,
        noa_data:          noa,
        opportunities:     opportunities,
        total_recoverable: recoverableTotal,
      });

    if (insertError) {
      // Log but don't fail the response — the user still gets their results
      log('error', 'recovery.supabase_insert_error', { message: insertError.message });
    }
  } catch (err) {
    log('error', 'recovery.supabase_error', { message: (err as Error).message });
  }

  return NextResponse.json({
    opportunities,
    totalRecoverable: recoverableTotal,
    noa,
  });
}
