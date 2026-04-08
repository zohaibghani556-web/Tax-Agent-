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
import { checkRateLimit } from '@/lib/rate-limit';
import { routeSlipType } from '@/lib/slips/slip-router';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const OCR_SYSTEM = `You are a Canadian tax document specialist. Your job is to read Canadian tax slips and extract all the financial data a CPA needs to file a T1 tax return.

Return ONLY valid JSON — no markdown, no explanation — with this exact shape:
{
  "slipType": "<see types below>",
  "issuerName": "<employer, institution, or payer name — empty string if not visible>",
  "taxYear": <number, e.g. 2025>,
  "boxes": { "<boxKey>": <value> },
  "summary": "<one plain-English sentence summarizing the key financial figures>",
  "confidence": <0.0 to 1.0>,
  "lowConfidenceFields": ["<boxKey>", ...]
}

SLIP TYPES AND EXTRACTION RULES:

T4 — Statement of Remuneration Paid (from your employer):
  Extract: box14 (employment income — main salary), box16 (CPP employee contributions),
  box16A (CPP2 contributions, often 0), box18 (EI premiums),
  box20 (RPP pension plan contributions), box22 (income tax deducted — very important),
  box44 (union dues, if present), box52 (pension adjustment, if present),
  box85 (employee health premiums, if present)
  Summary example: "Employment income of $72,400 from Rogers Communications, with $14,280 income tax withheld."

T4A — Statement of Pension, Retirement, Annuity and Other Income:
  Extract: box016 (pension/superannuation), box018 (lump-sum), box020 (self-employed commissions),
  box022 (income tax deducted), box024 (annuities), box028 (other income), box105 (scholarships/bursaries), box135 (RESP income)
  Summary example: "Pension income of $24,000 from Sun Life, with $3,600 tax withheld."

T4AP — Statement of Canada Pension Plan Benefits (CPP):
  Use slipType "T4AP". Issued by Service Canada.
  Extract: box16 (CPP retirement/disability pension amount), box20 (death benefit — usually 0), box22 (income tax deducted)
  Summary example: "CPP retirement pension of $8,400, with $840 tax withheld."

T4AOAS — Statement of Old Age Security:
  Use slipType "T4AOAS". Issued by Service Canada.
  Extract: box18 (OAS pension — the main taxable amount), box21 (GIS net supplements — NOT taxable, include but note separately), box22 (income tax deducted)
  Summary example: "Old Age Security pension of $7,200 for 2025, with $0 tax withheld."

T4RSP — Statement of RRSP Income (withdrawal from RRSP):
  Use slipType "T4RSP".
  Extract: box22 (total RRSP income withdrawn — fully taxable), box30 (income tax deducted at source)
  Summary example: "RRSP withdrawal of $10,000 from TD, with $2,000 income tax withheld."

T4RIF — Statement of Income from a Registered Retirement Income Fund:
  Use slipType "T4RIF".
  Extract: box16 (taxable RRIF amounts), box30 (income tax deducted)
  Summary example: "RRIF withdrawal of $15,000 from RBC, with $1,500 tax withheld."

T5 — Statement of Investment Income (from bank or investment firm):
  Extract: box11 (taxable non-eligible dividends), box12 (actual non-eligible dividends),
  box13 (interest from Canadian sources — most common), box14 (other income),
  box24 (actual eligible dividends), box25 (taxable eligible dividends), box26 (eligible dividend tax credit)
  Summary example: "Interest income of $420 and eligible dividends of $600 from TD Bank."

T5008 — Statement of Securities Transactions (investments sold):
  Extract: box15 (type code, as string), box16 (security description, as string),
  box20 (cost/ACB — what you paid), box21 (proceeds — what you sold it for), box22 (quantity)
  Summary example: "Sale of AAPL for $8,500 (cost $6,200), resulting in a capital gain of $2,300."

T3 — Statement of Trust Income Allocations:
  Extract: box21 (capital gains), box22 (actual eligible dividends), box23 (taxable eligible dividends),
  box26 (other income), box32 (taxable non-eligible dividends), box49 (interest), box50 (other investment income)
  Summary example: "Trust income from BMO Mutual Funds: $380 interest, $120 dividends."

T2202 — Tuition and Enrolment Certificate (from your school):
  Use "institutionName" instead of "issuerName" for the top-level key.
  Extract: boxA (eligible tuition fees — the dollar amount of tuition paid this year),
  boxB (number of months enrolled PART-TIME), boxC (number of months enrolled FULL-TIME)
  These values generate the tuition tax credit — boxA is the most important number.
  Summary example: "Tuition of $6,200 at University of Toronto — 8 months full-time (Sept 2024–Apr 2025)."

T4E — Statement of Employment Insurance and Other Benefits:
  Extract: box14 (total EI benefits received), box22 (income tax deducted)
  Summary example: "Employment Insurance benefits of $8,400 received, with $840 tax withheld."

T5007 — Statement of Benefits (social assistance):
  Extract: box10 (social assistance payments)
  Summary example: "Social assistance payments of $12,000 received in 2025."

RRSP-Receipt — RRSP Contribution Receipt (from bank or investment firm):
  Use slipType "RRSP-Receipt". This is a contribution receipt, not a CRA slip.
  Extract: amount (total RRSP contribution — the most important number),
  planType ("RRSP" or "SPOUSAL-RRSP"), dateOfContribution (YYYY-MM-DD if visible)
  Summary example: "RRSP contribution of $5,000 to RBC on Jan 15, 2025. This reduces your taxable income."

GENERAL RULES:
- Box keys use exact CRA labels: "box14", "box22", "box16A", "box016", "boxA", "boxB", "boxC", "amount", etc.
- All numeric fields must be JavaScript numbers (not strings). Use 0 for any blank or missing boxes.
- String fields: T5008 box15/box16, T4 box45, planType, dateOfContribution — keep as strings.
- confidence: 1.0 = every number is clear and certain; 0.7 = some fields estimated; 0.4 = many fields unclear
- lowConfidenceFields: list any box keys where the value was hard to read or estimated
- taxYear: the calendar year printed on the slip. Default to 2025 if not visible.
- summary: one plain sentence that a non-expert can understand. Always mention the key dollar amounts.`;

interface OcrResponseRaw {
  slipType: string;
  issuerName?: string;
  institutionName?: string;
  taxYear?: number;
  boxes: Record<string, number | string>;
  summary?: string;
  confidence?: number;
  lowConfidenceFields?: string[];
}

export interface OcrResult {
  slipType: string;
  issuerName: string;
  taxYear: number;
  boxes: Record<string, number | string>;
  summary: string;
  confidence: number;
  lowConfidenceFields: string[];
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
      taxYear: parsed.taxYear ?? 2025,
      boxes: parsed.boxes,
      summary: parsed.summary ?? '',
      confidence: parsed.confidence ?? 0.8,
      lowConfidenceFields: parsed.lowConfidenceFields ?? [],
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[ocr] Claude API error:', err);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 502 });
  }
}
