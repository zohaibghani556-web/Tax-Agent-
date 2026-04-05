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
 * TODO: require Supabase JWT; cache guide per (userId, taxYear).
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { TaxCalculationResult, TaxProfile, FilingGuide } from '@/lib/tax-engine/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface FilingGuideRequest {
  profile: Partial<TaxProfile>;
  result: TaxCalculationResult;
}

export async function POST(req: NextRequest) {
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

  const refundOrBalance =
    result.balanceOwing < 0
      ? `Refund of $${Math.abs(result.balanceOwing).toFixed(2)}`
      : `Balance owing of $${result.balanceOwing.toFixed(2)}`;

  const prompt = `You are a Canadian tax expert helping an Ontario resident file their 2025 T1 General return (deadline: April 30, 2026).

TAXPAYER PROFILE:
- Name: ${profile.legalName ?? 'Taxpayer'}
- Marital status: ${profile.maritalStatus ?? 'single'}
- Residency: ${profile.residencyStatus ?? 'citizen'}
- Dependants: ${profile.dependants?.length ?? 0}

PRE-CALCULATED AMOUNTS (from deterministic engine — do NOT recalculate):
- Line 15000 — Total income: $${result.totalIncome.toFixed(2)}
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

Generate a personalized, step-by-step T1 filing guide with 8–12 practical steps. Each step must reference the specific CRA form and line number, and include the exact dollar value where applicable.

Return ONLY valid JSON with no markdown fences, matching this structure exactly:
{
  "profileSummary": "1–2 sentence plain-language summary of this taxpayer's situation",
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
      console.error('[filing-guide] No JSON in response:', raw.slice(0, 200));
      return NextResponse.json({ error: 'Failed to extract guide from AI response' }, { status: 500 });
    }

    const guide = JSON.parse(jsonMatch[0]) as FilingGuide;
    return NextResponse.json(guide);
  } catch (err) {
    console.error('[filing-guide] Error:', err);
    return NextResponse.json({ error: 'Failed to generate guide' }, { status: 502 });
  }
}
