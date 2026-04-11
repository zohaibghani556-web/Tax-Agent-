/**
 * TaxAgent.ai — Public Estimate API
 *
 * POST /api/estimate  (no auth required)
 * Body: { employmentIncome, taxWithheld, rrspContributions?, rentPaid? }
 *
 * Runs the deterministic tax engine with a synthetic single-Ontario-resident
 * profile and returns a rough refund/owing estimate. No PII stored.
 *
 * Rate limit: 5 requests per IP per minute (in-memory; sufficient for public use).
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateTaxReturn } from '@/lib/tax-engine/engine';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import type { TaxProfile, TaxSlip, DeductionsCreditsInput } from '@/lib/tax-engine/types';

// Minimal fixed profile for the public estimator (ITA: Ontario resident, age 36)
const ESTIMATE_PROFILE: TaxProfile = {
  id: 'estimate',
  userId: 'estimate',
  taxYear: 2025,
  legalName: 'Estimator',
  dateOfBirth: '1990-01-01',
  maritalStatus: 'single',
  province: 'ON',
  residencyStatus: 'citizen',
  dependants: [],
  assessmentComplete: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function makeDeductions(
  rrspContributions: number,
  rentPaid: number,
): DeductionsCreditsInput {
  return {
    rrspContributions,
    rrspContributionRoom: 32490, // maximum allowed for 2025
    fhsaContributions: 0,
    unionDues: 0,
    childcareExpenses: 0,
    movingExpenses: 0,
    supportPaymentsMade: 0,
    carryingCharges: 0,
    studentLoanInterest: 0,
    medicalExpenses: [],
    donations: [],
    rentPaid,
    propertyTaxPaid: 0,
    studentResidence: false,
    tuitionCarryforward: 0,
    capitalLossCarryforward: 0,
    nonCapitalLossCarryforward: 0,
    donationCarryforward: 0,
    politicalContributions: 0,
    digitalNewsSubscription: 0,
    hasDisabilityCredit: false,
    homeBuyersEligible: false,
    homeAccessibilityExpenses: 0,
  };
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 requests per IP per minute
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`estimate:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — try again in a minute.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    employmentIncome,
    taxWithheld,
    rrspContributions = 0,
    rentPaid = 0,
  } = body as Record<string, unknown>;

  // Validate required fields
  if (typeof employmentIncome !== 'number' || employmentIncome < 0 || employmentIncome > 10_000_000) {
    return NextResponse.json({ error: 'Invalid employmentIncome' }, { status: 400 });
  }
  if (typeof taxWithheld !== 'number' || taxWithheld < 0 || taxWithheld > 10_000_000) {
    return NextResponse.json({ error: 'Invalid taxWithheld' }, { status: 400 });
  }
  const rrsp = typeof rrspContributions === 'number' ? Math.max(0, rrspContributions) : 0;
  const rent = typeof rentPaid === 'number' ? Math.max(0, rentPaid) : 0;

  // Construct a synthetic T4 slip
  const slips: TaxSlip[] = [
    {
      type: 'T4',
      data: {
        issuerName: 'Employer',
        box14: employmentIncome,
        box16: 0,
        box16A: 0,
        box17: 0,
        box18: 0,
        box20: 0,
        box22: taxWithheld,
        box24: 0,
        box26: 0,
        box40: 0,
        box42: 0,
        box44: 0,
        box45: '0',
        box46: 0,
        box52: 0,
        box85: 0,
      },
    },
  ];

  try {
    const result = calculateTaxReturn(
      ESTIMATE_PROFILE,
      slips,
      [],
      [],
      makeDeductions(rrsp, rent),
    );

    // Log only the fact of a request (no amounts — no PII)
    log('info', 'estimate_request', { ip: ip.slice(0, 8) + '***' });

    const isRefund = result.balanceOwing < 0;
    return NextResponse.json({
      estimatedRefund: isRefund ? Math.abs(result.balanceOwing) : 0,
      estimatedOwing: isRefund ? 0 : result.balanceOwing,
      marginalRate: result.combinedMarginalRate,
      isRefund,
    });
  } catch (err: unknown) {
    log('error', 'estimate_error', { message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Could not calculate estimate. Please try again.' }, { status: 500 });
  }
}
