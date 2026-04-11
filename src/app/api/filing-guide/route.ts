/**
 * TaxAgent.ai — Filing Guide API Route
 *
 * POST /api/filing-guide
 * Accepts { profile, result } and calls Claude to generate a personalized,
 * step-by-step T1 filing guide as a structured FilingGuide JSON object.
 *
 * AI is only used for natural-language generation of instructions — all
 * dollar values come from the deterministic engine result passed in.
 *
 * Security:
 *   - Requires valid Supabase JWT
 *   - Rate limited: 5 guide generations per user per hour
 *   - User-supplied strings are sanitized before prompt interpolation
 *     to prevent prompt injection (ITA s.150 is not a hacking tool)
 *
 * TODO: cache generated guide in Supabase filing_guides table (user_id, tax_year).
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrfToken } from '@/lib/csrf';
import { log } from '@/lib/logger';
import type { TaxCalculationResult, TaxProfile, FilingGuide } from '@/lib/tax-engine/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Allowed enum values (validated server-side) ──────────────────────────────

const VALID_MARITAL = new Set([
  'single', 'married', 'common-law', 'separated', 'divorced', 'widowed',
]);
const VALID_RESIDENCY = new Set([
  'citizen', 'permanent-resident', 'deemed-resident', 'newcomer', 'non-resident',
]);

/**
 * Strip control characters and newlines from a user-supplied string before
 * interpolating into a prompt. Prevents prompt injection attacks where an
 * attacker could inject new instructions via profile fields.
 */
function sanitize(value: string | undefined | null, maxLen = 80): string {
  if (!value) return '';
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // strip control chars including \n \r \t
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

interface FilingGuideRequest {
  profile: Partial<TaxProfile>;
  result: TaxCalculationResult;
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

  // --- Rate limit: 5 guide generations per user per hour ---
  if (!checkRateLimit(`guide:${user.id}`, 5, 60 * 60_000)) {
    return NextResponse.json(
      { error: 'Guide generation limit reached. Try again in an hour.' },
      { status: 429, headers: { 'Retry-After': '3600' } },
    );
  }

  // --- Parse body ---
  let body: FilingGuideRequest;
  try {
    body = (await req.json()) as FilingGuideRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { profile, result } = body;
  if (!result) {
    return NextResponse.json({ error: 'result is required' }, { status: 400 });
  }

  // --- Sanitize and validate all user-supplied strings used in prompt ---
  // Only allow known-safe enum values for maritalStatus and residencyStatus.
  // Free-text fields (legalName) are sanitized to strip injection vectors.
  const safeName = sanitize(profile.legalName) || 'Taxpayer';
  const safeMarital = VALID_MARITAL.has(profile.maritalStatus ?? '')
    ? profile.maritalStatus!
    : 'unknown';
  const safeResidency = VALID_RESIDENCY.has(profile.residencyStatus ?? '')
    ? profile.residencyStatus!
    : 'unknown';
  const safeDependants = Math.max(0, Math.min(20, profile.dependants?.length ?? 0));

  const refundOrBalance =
    result.balanceOwing < 0
      ? `Refund of $${Math.abs(result.balanceOwing).toFixed(2)}`
      : `Balance owing of $${result.balanceOwing.toFixed(2)}`;

  // Determine which additional forms are needed based on the calculation result
  const additionalForms: string[] = [];
  const hasRentalIncome      = (result.lineByLine?.[12600] ?? 0) > 0;
  const hasSelfEmployment    = (result.lineByLine?.[13500] ?? 0) > 0;
  const hasCapGains          = (result.lineByLine?.[12700] ?? 0) > 0;
  const hasForeignIncome     = (result.lineByLine?.[13000] ?? 0) > 0;
  const hasStockOptions      = (result.lineByLine?.[24900] ?? 0) > 0;
  const instalmentWarning    = result.warnings?.some(w => w.message?.toLowerCase().includes('instalment'));
  const amtWarning           = result.edgeCaseFlags?.some(f => f.code === 'AMT_TRIGGERED');

  if (hasSelfEmployment)  additionalForms.push('T2125 (Statement of Business or Professional Activities)');
  if (hasRentalIncome)    additionalForms.push('T776 (Statement of Real Estate Rentals)');
  if (hasCapGains)        additionalForms.push('Schedule 3 (Capital Gains or Losses)');
  if (hasStockOptions)    additionalForms.push('Line 24900 (Stock Option Deduction)');
  if (hasForeignIncome)   additionalForms.push('T2209 (Federal Foreign Tax Credit)', 'T2036 (Ontario Foreign Tax Credit)');
  if (amtWarning)         additionalForms.push('Form T691 (Alternative Minimum Tax)');

  const selfEmployedNote = hasSelfEmployment
    ? `\n- SELF-EMPLOYMENT (T2125): Filing deadline is June 16, 2026 (extra 47 days), but any BALANCE OWING must still be paid by April 30, 2026. Failure to pay by April 30 incurs daily compound interest at the prescribed rate + 2%. The T2125 must include: gross revenue, all allowable business expenses (home office, vehicle at business-use %, meals at 50%), and net business income at line 13500. CPP self-employment contributions must be calculated: both employee (5.95%) and employer (5.95%) halves on net earnings above the $3,500 exemption up to $71,300. The employer half is deductible at line 22200; the employee half is a non-refundable credit at line 31000.`
    : '';

  const rentalNote = hasRentalIncome
    ? `\n- RENTAL INCOME (T776): Report on line 12600. CCA (Capital Cost Allowance) is optional — Class 1 at 4% declining balance on building value — but claiming CCA creates "recapture" income on eventual sale. If CCA was claimed in prior years, recapture is mandatory on sale. Rental losses are fully deductible against other income.`
    : '';

  const foreignTaxNote = hasForeignIncome
    ? `\n- FOREIGN TAX CREDIT (T2209/T2036): Foreign income (interest, dividends, employment) must be converted to CAD and reported. Foreign taxes already withheld generate a credit: federal credit at line 40500 (T2209), provincial credit on ON428. Credit = lesser of (foreign income / net income × Canadian tax) or foreign taxes paid. If total foreign property cost exceeds CAD $100,000, T1135 (Foreign Income Verification) must also be filed by April 30, 2026.`
    : '';

  const amtNote = amtWarning
    ? `\n- ALTERNATIVE MINIMUM TAX (Form T691, line 40600): AMT applies at 20.5% on adjusted income (100% capital gains, no stock option deduction, 30% of donations added back) above the $173,205 exemption. If AMT exceeds regular federal tax, the excess is payable for 2025 but can be credited against regular tax for the next 7 years (line 40425 in future years).`
    : '';

  const stockOptionNote = hasStockOptions
    ? `\n- STOCK OPTIONS (line 24900): The employment benefit from T4 box 38 is already included in employment income (line 10100). If the option conditions are met (exercise price ≥ FMV at grant, or CCPC shares), a 50% deduction applies at line 24900, effectively taxing the benefit like capital gains. The full pre-deduction benefit is included in the AMT base (ATI).`
    : '';

  const instalmentNote = instalmentWarning
    ? `\n- INSTALMENT PAYMENTS (2026): Based on this return's balance owing, quarterly instalments may be required for 2026. Due dates: March 15, June 15, September 15, December 15, 2026. The safest method is the prior-year method: pay 25% of this year's balance owing each quarter. Set up CRA My Account reminders. Failure to pay sufficient instalments triggers compound interest at the prescribed rate + 4%.`
    : '';

  const prompt = `You are a Canadian tax expert helping an Ontario resident file their 2025 T1 General return (deadline: April 30, 2026).

TAXPAYER PROFILE:
- Name: ${safeName}
- Marital status: ${safeMarital}
- Residency: ${safeResidency}
- Dependants: ${safeDependants}

PRE-CALCULATED AMOUNTS (from deterministic engine — do NOT recalculate):
- Line 10100 — Employment income: $${(result.lineByLine?.[10100] ?? 0).toFixed(2)}
- Line 12600 — Net rental income: $${(result.lineByLine?.[12600] ?? 0).toFixed(2)}
- Line 13500 — Net business income: $${(result.lineByLine?.[13500] ?? 0).toFixed(2)}
- Line 15000 — Total income: $${result.totalIncome.toFixed(2)}
- Line 20800 — RRSP deduction: $${(result.lineByLine?.[20800] ?? 0).toFixed(2)}
- Line 22200 — CPP self-employed deduction: $${(result.lineByLine?.[22200] ?? 0).toFixed(2)}
- Line 23600 — Net income: $${result.netIncome.toFixed(2)}
- Line 26000 — Taxable income: $${result.taxableIncome.toFixed(2)}
- Federal tax on income: $${result.federalTaxOnIncome.toFixed(2)}
- Federal non-refundable credits: $${result.federalNonRefundableCredits.toFixed(2)}
- Net federal tax: $${result.netFederalTax.toFixed(2)}
- Ontario tax on income: $${result.ontarioTaxOnIncome.toFixed(2)}
- Ontario non-refundable credits: $${result.ontarioNonRefundableCredits.toFixed(2)}
- Ontario surtax: $${result.ontarioSurtax.toFixed(2)}
- Ontario health premium: $${result.ontarioHealthPremium.toFixed(2)}
- Net Ontario tax: $${result.netOntarioTax.toFixed(2)}
- Total tax payable: $${result.totalTaxPayable.toFixed(2)}
- Total tax deducted at source: $${result.totalTaxDeducted.toFixed(2)}
- OUTCOME: ${refundOrBalance}
- Estimated Ontario Trillium Benefit: $${result.estimatedOTB.toFixed(2)} (paid starting Jul 2026)

ADDITIONAL FILING REQUIREMENTS FOR THIS TAXPAYER:${selfEmployedNote}${rentalNote}${foreignTaxNote}${stockOptionNote}${amtNote}${instalmentNote}
${additionalForms.length > 0 ? `\nAdditional forms required: ${additionalForms.join(', ')}` : ''}

IMPORTANT LINE NUMBER REFERENCE (include relevant ones in steps):
- Line 10100: Employment income (T4 box 14)
- Line 12600: Net rental income (T776)
- Line 13500: Net business income (T2125)
- Line 12700: Taxable capital gains (Schedule 3)
- Line 15000: Total income
- Line 20800: RRSP deduction
- Line 22200: CPP self-employed deduction (employer half — line 22200)
- Line 22215: CPP2 self-employed deduction
- Line 23600: Net income
- Line 24900: Security options deduction
- Line 26000: Taxable income
- Line 30000–33500: Non-refundable credits (Schedule 1)
- Line 40500: Federal foreign tax credit (T2209)
- Line 40600: AMT payable (Form T691)
- Line 43700: Total tax deducted at source
- Line 47600: Tax instalments paid
- Line 48400: Refund
- Line 48500: Balance owing

Generate a personalized, step-by-step T1 filing guide with 8-14 practical steps. Include steps for any of: T2125 self-employment, T776 rental, T2091 principal residence, T2209 foreign tax credit, AMT calculation, stock option deduction, instalment obligations — only if relevant to this taxpayer. Each step must reference the specific CRA form and line number, and include the exact dollar value where applicable.

Return ONLY valid JSON with no markdown fences, matching this structure exactly:
{
  "profileSummary": "1-2 sentence plain-language summary of this taxpayer's situation",
  "requiredForms": ["T1 General", "Schedule 1", "ON428"],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Short action title",
      "description": "What to do and why, in plain language",
      "formReference": "T1 General",
      "lineReference": 15000,
      "value": 85000.00,
      "tip": "Optional helpful context or CRA note"
    }
  ],
  "documentsToKeep": ["T4 slip from employer (keep 6 years)", "RRSP contribution receipt"],
  "importantDates": [
    { "date": "March 3, 2026", "description": "RRSP contribution deadline for 2025 tax year" },
    { "date": "April 30, 2026", "description": "T1 filing and payment deadline" }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';

    // Claude may wrap in code fences despite instruction — strip them
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log('error', 'filing_guide.no_json_in_response');
      return NextResponse.json({ error: 'Failed to extract guide from AI response' }, { status: 500 });
    }

    const guide = JSON.parse(jsonMatch[0]) as FilingGuide;
    return NextResponse.json(guide);
  } catch (err) {
    log('error', 'filing_guide.error', { message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to generate guide' }, { status: 502 });
  }
}
