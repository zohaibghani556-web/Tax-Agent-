/**
 * TaxAgent.ai — OCR API Route
 *
 * POST /api/ocr
 * Accepts a multipart form upload (PNG, JPG, WebP, or PDF).
 * Sends the document to Claude Vision for structured extraction.
 * Returns { slipType, issuerName, boxes, confidence }
 *
 * Security:
 *   - Requires valid Supabase JWT (cookie-based session)
 *   - Max file size: 10 MB
 *   - Accepted types: image/jpeg, image/png, image/webp, application/pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { routeSlipType } from '@/lib/slips/slip-router';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const OCR_SYSTEM = `You are a Canadian tax slip OCR extractor. Extract all data from the provided image or document.
Return ONLY a valid JSON object — no markdown fences, no explanation — with this exact shape:
{
  "slipType": "<T4|T5|T5008|T3|T4A|T2202|T4E|T5007|unknown>",
  "issuerName": "<employer or institution name, empty string if not visible>",
  "boxes": { "<boxKey>": <value> },
  "confidence": <0.0 to 1.0>
}
Rules:
- Box keys use the exact CRA label: "box14", "box22", "box16A", "box016", "boxA", "boxB", "boxC", etc.
- All numeric boxes must be JavaScript numbers (not strings). Use 0 for blank boxes.
- String boxes: T5008 box15/box16, T4 box45 — keep as string.
- For T2202 use "institutionName" instead of "issuerName" as the top-level key.
- confidence: your estimated extraction accuracy (0.0 = uncertain, 1.0 = certain).`;

interface OcrResponseRaw {
  slipType: string;
  issuerName?: string;
  institutionName?: string;
  boxes: Record<string, number | string>;
  confidence?: number;
}

export interface OcrResult {
  slipType: string;
  issuerName: string;
  boxes: Record<string, number | string>;
  confidence: number;
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
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum 10 MB.' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  // --- Build content block for Claude ---
  // Images use the standard image block; PDFs use the document block (beta).
  type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

  const fileBlock =
    file.type === 'application/pdf'
      ? ({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any) // DocumentBlockParam — available in SDK but not yet in all TS defs
      : ({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type as ImageMediaType,
            data: base64,
          },
        } as Anthropic.Messages.ImageBlockParam);

  // --- Call Claude ---
  try {
    const requestOptions =
      file.type === 'application/pdf'
        ? { headers: { 'anthropic-beta': 'pdfs-2024-09-25' } }
        : undefined;

    const response = await anthropic.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: OCR_SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              fileBlock,
              { type: 'text', text: 'Extract all data from this Canadian tax slip.' },
            ],
          },
        ],
      },
      requestOptions
    );

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Strip any accidental markdown fences before JSON.parse
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'OCR did not return parseable data' },
        { status: 502 }
      );
    }

    let parsed: OcrResponseRaw;
    try {
      parsed = JSON.parse(jsonMatch[0]) as OcrResponseRaw;
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse OCR response' },
        { status: 502 }
      );
    }

    // Cross-validate slip type using pattern matching as a safety net
    const textForRouting = rawText + ' ' + Object.values(parsed.boxes).join(' ');
    const routedType = routeSlipType(textForRouting);
    const slipType = routedType !== 'unknown' ? routedType : parsed.slipType;

    const result: OcrResult = {
      slipType,
      // T2202 reports institutionName; all others use issuerName
      issuerName: parsed.institutionName ?? parsed.issuerName ?? '',
      boxes: parsed.boxes,
      confidence: parsed.confidence ?? 0.8,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[ocr] Claude API error:', err);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 502 });
  }
}
