/**
 * TaxAgent.ai — Calculate API Route
 *
 * POST /api/calculate
 * Accepts { profile, slips, business, rental, deductions } and returns
 * a TaxCalculationResult by running the deterministic tax engine.
 *
 * Security:
 *   - Requires valid Supabase JWT (Authorization header or cookie)
 *   - Rate limited: 30 calculations per user per minute
 *   - No PII logged — errors are generic
 *
 * TODO: validate profile.userId === auth user id once profiles are persisted
 *       to Supabase (tax_profiles table with RLS).
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateTaxReturn } from '@/lib/tax-engine/engine';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
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
  // --- Auth ---
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Rate limit: 30 calculations per user per minute ---
  if (!checkRateLimit(`calc:${user.id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  // --- Parse body ---
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

  // --- Validate tax year ---
  if (body.profile.taxYear !== 2025) {
    return NextResponse.json(
      { error: 'Only tax year 2025 is supported' },
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
    // Log error without PII — err.message is from our own engine
    console.error('[calculate] Engine error:', (err as Error).message);
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 });
  }
}
