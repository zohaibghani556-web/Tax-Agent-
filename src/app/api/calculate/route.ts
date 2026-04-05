/**
 * TaxAgent.ai — Calculate API Route
 *
 * POST /api/calculate
 * Accepts { profile, slips, business, rental, deductions } and returns
 * a TaxCalculationResult by running the deterministic tax engine.
 *
 * No auth required — calculations contain no PII; results are ephemeral.
 * TODO: require Supabase JWT and persist results to tax_calculations table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateTaxReturn } from '@/lib/tax-engine/engine';
import type {
  TaxProfile,
  TaxSlip,
  BusinessIncome,
  RentalIncome,
  DeductionsCreditsInput,
} from '@/lib/tax-engine/types';

interface CalculateRequest {
  profile: TaxProfile;
  slips: TaxSlip[];
  business?: BusinessIncome[];
  rental?: RentalIncome[];
  deductions: DeductionsCreditsInput;
}

export async function POST(req: NextRequest) {
  let body: CalculateRequest;

  try {
    body = (await req.json()) as CalculateRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.profile || !body.slips || !body.deductions) {
    return NextResponse.json(
      { error: 'profile, slips, and deductions are required' },
      { status: 400 },
    );
  }

  try {
    const result = calculateTaxReturn(
      body.profile,
      body.slips,
      body.business ?? [],
      body.rental ?? [],
      body.deductions,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error('[calculate] Engine error:', err);
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
