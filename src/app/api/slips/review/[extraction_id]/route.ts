/**
 * TaxAgent.ai — Slip Review API
 *
 * GET /api/slips/review/[extraction_id]
 *
 * Returns the extraction record plus a short-lived signed URL for the
 * source document so the review UI can render it side-by-side.
 *
 * Security:
 *   - Requires valid Supabase JWT
 *   - RLS on slip_extractions ensures the row belongs to the caller
 *   - Signed URL expires in 10 minutes (review session only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

const SIGNED_URL_EXPIRY_SECONDS = 600; // 10 minutes

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ extraction_id: string }> },
) {
  const { extraction_id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // UUID format guard
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(extraction_id)) {
    return NextResponse.json({ error: 'Invalid extraction ID' }, { status: 400 });
  }

  // Fetch extraction — RLS enforces ownership
  const { data: extraction, error: fetchError } = await supabase
    .from('slip_extractions')
    .select(
      'id, slip_type_detected, classification_confidence, status, boxes, validation_errors, created_at, reviewed_by_user_at, document_storage_path, file_hash',
    )
    .eq('id', extraction_id)
    .single();

  if (fetchError || !extraction) {
    log('warn', 'slip_review.not_found', { extraction_id, reason: fetchError?.message });
    return NextResponse.json({ error: 'Extraction not found' }, { status: 404 });
  }

  // Generate a signed URL for the source document
  let documentUrl: string | null = null;
  let documentType: 'image' | 'pdf' = 'image';

  const storagePath = extraction.document_storage_path as string;
  if (storagePath) {
    const { data: signedData, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

    if (signError) {
      log('warn', 'slip_review.signed_url_failed', { reason: signError.message });
    } else {
      documentUrl = signedData.signedUrl;
      documentType = storagePath.endsWith('.pdf') ? 'pdf' : 'image';
    }
  }

  // Map validation_errors → flags array for the client
  const rawFlags = (extraction.validation_errors as Array<{
    field: string;
    reason: string;
    message: string;
  }>) ?? [];

  return NextResponse.json({
    id: extraction.id,
    slipType: extraction.slip_type_detected,
    confidence: extraction.classification_confidence,
    status: extraction.status,
    boxes: extraction.boxes ?? {},
    flags: rawFlags,
    lowConfidenceFields: rawFlags
      .filter((f) => f.reason === 'low_confidence')
      .map((f) => f.field),
    reviewedAt: extraction.reviewed_by_user_at,
    createdAt: extraction.created_at,
    documentUrl,
    documentType,
    fileHash: (extraction.file_hash as string | null) ?? null,
  });
}
