/**
 * TaxAgent.ai — Notice of Assessment (NOA) Parser
 *
 * Uses Claude Vision to extract key T1 line items from a CRA Notice of Assessment.
 * The NOA is the annual assessment document mailed after filing; it shows assessed
 * income, net income, taxable income, total payable, and the refund/balance.
 *
 * Not all lines appear on every NOA — only lines with non-zero amounts are typically
 * printed. We default missing lines to -1 (not present) vs 0 (filed as zero) so the
 * recovery engine can distinguish "not claimed" from "claimed $0".
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================================
// TYPES
// ============================================================

/**
 * Key T1 line items extracted from a Notice of Assessment.
 * Fields are -1 when the line was not visible on the NOA (not printed = not claimed / not applicable).
 * Fields are 0 when the line was printed with a zero value.
 */
export interface ParsedNOA {
  /** Tax year being assessed (e.g. 2022, 2023) */
  taxYear: number;

  /** Taxpayer name as shown on the NOA */
  taxpayerName: string;

  // ── Income lines ─────────────────────────────────────────────────────────
  /** Line 10100 — Employment income */
  line10100: number;
  /** Line 11300 — Old age security pension */
  line11300: number;
  /** Line 11400 — CPP/QPP benefits */
  line11400: number;
  /** Line 11500 — Other pension/superannuation */
  line11500: number;
  /** Line 13000 — RRSP/RRIF income */
  line13000: number;
  /** Line 15000 — Total income */
  line15000: number;
  /** Line 20800 — RRSP deduction claimed */
  line20800: number;
  /** Line 23600 — Net income (after deductions) */
  line23600: number;
  /** Line 26000 — Taxable income */
  line26000: number;

  // ── Tax / payable ─────────────────────────────────────────────────────────
  /** Line 42000 — Net federal tax */
  line42000: number;
  /** Line 43500 — Total payable */
  line43500: number;
  /**
   * Line 44000 — Amount of refund (positive = refund, negative = balance owing).
   * The NOA may show this as "Refund" or "Balance owing" — we normalize to signed.
   */
  line44000: number;

  // ── Key credits — -1 means line not printed (not claimed) ─────────────────
  /** Line 30100 — Age amount (65+) */
  line30100: number;
  /** Line 33099 — Medical expenses claimed */
  line33099: number;
  /** Line 45300 — Canada Workers Benefit (CWB) */
  line45300: number;
  /** Line 47600 — Income tax instalments paid */
  line47600: number;

  // ── Carryforwards (shown on NOA or attached summary) ──────────────────────
  /** Available RRSP deduction room for the NEXT year (printed on most NOAs) */
  rrspRoomNextYear: number;
  /** Unused tuition / education carry-forward available for future years */
  tuitionCarryforward: number;

  /** Raw confidence: 0.0 – 1.0 */
  confidence: number;
  /** Fields Claude flagged as uncertain */
  lowConfidenceFields: string[];
}

// ============================================================
// CLAUDE EXTRACTION PROMPT
// ============================================================

const NOA_SYSTEM = `You are a Canadian tax expert reading a CRA Notice of Assessment (NOA).
Extract the following fields and return ONLY valid JSON — no markdown, no explanation.

RULES:
- Use -1 for any line that is NOT printed on the document (absent = not claimed).
- Use 0 only for lines explicitly printed with a zero dollar value.
- line44000: positive = refund amount, negative = balance owing amount. Check carefully.
- taxYear: the TAX YEAR being assessed (e.g. for a 2022 NOA mailed in 2023, return 2022).
- rrspRoomNextYear: the RRSP contribution room shown for the FOLLOWING year (printed near bottom).
- tuitionCarryforward: any unused tuition/education credit carryforward shown.
- taxpayerName: the name printed on the NOA, or empty string if not visible.
- confidence: 1.0 if all key numbers are crystal clear; 0.7 if some were estimated; 0.4 if document was hard to read.
- lowConfidenceFields: array of field names where values were unclear or estimated.

Return this exact JSON shape:
{
  "taxYear": 0,
  "taxpayerName": "",
  "line10100": -1,
  "line11300": -1,
  "line11400": -1,
  "line11500": -1,
  "line13000": -1,
  "line15000": -1,
  "line20800": -1,
  "line23600": -1,
  "line26000": -1,
  "line42000": -1,
  "line43500": -1,
  "line44000": -1,
  "line30100": -1,
  "line33099": -1,
  "line45300": -1,
  "line47600": -1,
  "rrspRoomNextYear": -1,
  "tuitionCarryforward": -1,
  "confidence": 0.8,
  "lowConfidenceFields": []
}`;

// ============================================================
// PARSER
// ============================================================

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Parses a CRA Notice of Assessment using Claude Vision.
 * Accepts a buffer of image or PDF bytes plus the MIME type.
 *
 * @throws if Claude returns unparseable JSON
 */
export async function parseNOA(
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<ParsedNOA> {
  const base64 = Buffer.from(fileBuffer).toString('base64');

  const fileBlock =
    mimeType === 'application/pdf'
      ? ({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
      : ({
          type: 'image',
          source: { type: 'base64', media_type: mimeType as ImageMediaType, data: base64 },
        } as Anthropic.Messages.ImageBlockParam);

  const requestOptions =
    mimeType === 'application/pdf'
      ? { headers: { 'anthropic-beta': 'pdfs-2024-09-25' } }
      : undefined;

  const response = await anthropic.messages.create(
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: NOA_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            { type: 'text', text: 'Extract all fields from this CRA Notice of Assessment.' },
          ],
        },
      ],
    },
    requestOptions,
  );

  const rawText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('NOA parser: Claude did not return parseable JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]) as ParsedNOA;
  return parsed;
}
