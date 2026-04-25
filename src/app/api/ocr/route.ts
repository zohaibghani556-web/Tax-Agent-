/**
 * TaxAgent.ai — OCR API Route (v2 — Structured Extraction Pipeline)
 *
 * POST /api/ocr
 * Accepts a multipart form upload (PNG, JPG, WebP, or PDF).
 * Runs the 3-stage extraction pipeline:
 *   Stage 1: Haiku classifies the slip type
 *   Stage 2: Sonnet extracts fields using structured outputs
 *   Stage 3: Zod validates and flags low-confidence fields
 *
 * Optional form field: slipType (string) — user-selected slip type to skip
 * classification. Valid values: t4, t4a, t5, t3, t2202, t5008, t4e, t5007,
 * t4ap, t4aoas, t4rsp, t4rif, rrsp_receipt, t4fhsa.
 *
 * Returns: { status, slipType, issuerName, taxYear, boxes, summary,
 *            confidence, flags, extractionId }
 *
 * Security:
 *   - Requires valid Supabase JWT (cookie-based session)
 *   - CSRF token validation
 *   - Rate limited: 20 uploads per user per hour
 *   - Max file size: 10 MB
 *   - Accepted types: image/jpeg, image/png, image/webp, application/pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrfToken } from '@/lib/csrf';
import { log } from '@/lib/logger';
import { extractSlip } from '@/lib/extraction';
import { isExtractable } from '@/lib/extraction/schemas';
import type { ExtractableSlipType, PipelineResult } from '@/lib/extraction/types';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

/**
 * Shape returned to the client — never includes raw model responses.
 * Also exported as OcrResult for backward compatibility with SlipUpload component.
 */
export interface OcrResult {
  slipType: string;
  issuerName: string;
  taxYear: number;
  boxes: Record<string, number | string> | null;
  summary: string;
  confidence: number;
  lowConfidenceFields: string[];
  // v2 additions
  status: PipelineResult['status'];
  flags: Array<{ field: string; reason: string; message: string }>;
  extractionId: string | null;
}

interface OcrApiResponse {
  status: PipelineResult['status'];
  slipType: string;
  issuerName: string;
  taxYear: number;
  boxes: Record<string, number | string> | null;
  summary: string;
  confidence: number;
  flags: Array<{
    field: string;
    reason: string;
    message: string;
  }>;
  extractionId: string | null;
}

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

  // --- CSRF validation ---
  if (!validateCsrfToken(req)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // --- Rate limit: 20 OCR uploads per user per hour ---
  if (!checkRateLimit(`ocr:${user.id}`, 20, 60 * 60_000)) {
    return NextResponse.json(
      { error: 'OCR limit reached. You can upload up to 20 documents per hour.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }

  // --- Parse multipart ---
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

  // --- Optional manual slip type ---
  const manualSlipTypeRaw = formData.get('slipType');
  let manualSlipType: ExtractableSlipType | undefined;
  if (typeof manualSlipTypeRaw === 'string' && manualSlipTypeRaw.length > 0) {
    if (!isExtractable(manualSlipTypeRaw)) {
      return NextResponse.json(
        { error: `Invalid slip type: ${manualSlipTypeRaw}` },
        { status: 400 },
      );
    }
    manualSlipType = manualSlipTypeRaw as ExtractableSlipType;
  }

  // --- Upload to Supabase Storage ---
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
  const storagePath = `slips/${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, Buffer.from(buffer), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    log('warn', 'ocr.storage_upload_failed', { reason: uploadError.message });
    // Non-fatal — continue with extraction even if storage fails.
    // The document is still in memory as base64.
  }

  // --- Run extraction pipeline ---
  let result: PipelineResult;
  try {
    result = await extractSlip({
      base64,
      mediaType: file.type,
      manualSlipType,
    });
  } catch (err) {
    log('error', 'ocr.pipeline_error', { message: (err as Error).message });
    return NextResponse.json(
      { error: 'Failed to process document. Please try again.' },
      { status: 502 },
    );
  }

  // --- Persist extraction to Supabase ---
  let extractionId: string | null = null;
  try {
    const { data: insertData, error: insertError } = await supabase
      .from('slip_extractions')
      .insert({
        user_id: user.id,
        document_storage_path: storagePath,
        slip_type_detected: result.slipType,
        classification_confidence: result.classification.confidence,
        status: result.status,
        extraction_result: result.extraction,
        boxes: result.boxes,
        raw_model_response: result.rawModelResponses,
        validation_errors: result.validation?.flags ?? [],
        usage_tokens: result.usage,
      })
      .select('id')
      .single();

    if (insertError) {
      log('warn', 'ocr.persist_failed', { reason: insertError.message });
    } else {
      extractionId = insertData.id;
    }
  } catch (err) {
    // Non-fatal — extraction still succeeded even if persistence fails
    log('warn', 'ocr.persist_error', { message: (err as Error).message });
  }

  // --- Build client response (no raw model responses) ---
  const flags = (result.validation?.flags ?? []).map((f) => ({
    field: f.field,
    reason: f.reason,
    message: f.message,
  }));

  // lowConfidenceFields: backward compat with SlipUpload component
  const lowConfidenceFields = flags
    .filter((f) => f.reason === 'low_confidence')
    .map((f) => f.field);

  const response: OcrApiResponse = {
    status: result.status,
    slipType: result.slipType,
    issuerName: result.issuerName,
    taxYear: result.taxYear,
    boxes: result.boxes,
    summary: result.summary,
    confidence: result.classification.confidence,
    flags,
    extractionId,
  };

  // OcrResult shape (superset of OcrApiResponse + backward compat fields)
  const clientResponse: OcrResult = {
    ...response,
    lowConfidenceFields,
  };

  return NextResponse.json(clientResponse);
}
