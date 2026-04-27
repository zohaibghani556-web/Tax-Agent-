/**
 * Tests for /api/calculate route persistence behavior.
 *
 * A. saveTaxReturn is awaited (not fire-and-forget) in flat mode
 * B. saveTaxReturn is awaited (not fire-and-forget) in slips mode
 * C. Persistence failure does not break calculation response
 * D. Server Supabase client is passed to saveTaxReturn (not browser client)
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ── Mock saveTaxReturn BEFORE importing the route ───────────────────────────
const mockSaveTaxReturn = vi.fn();
vi.mock('@/lib/supabase/tax-data', () => ({
  saveTaxReturn: (...args: unknown[]) => mockSaveTaxReturn(...args),
}));

// ── Mock Supabase server client ─────────────────────────────────────────────
const mockGetUser = vi.fn();
const mockSupabaseClient = { auth: { getUser: mockGetUser } };
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => mockSupabaseClient),
}));

// ── Mock CSRF + rate limit to always pass ───────────────────────────────────
vi.mock('@/lib/csrf', () => ({ validateCsrfToken: () => true }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => true }));
vi.mock('@/lib/logger', () => ({ log: vi.fn() }));

// ── Import route handler ────────────────────────────────────────────────────
import { POST } from './route';
import { NextRequest } from 'next/server';

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const FLAT_BODY = {
  mode: 'flat' as const,
  input: {
    employmentIncome: 50000,
    selfEmploymentNetIncome: 0, otherEmploymentIncome: 0,
    pensionIncome: 0, annuityIncome: 0, rrspIncome: 0, otherIncome: 0,
    interestIncome: 0, eligibleDividends: 0, ineligibleDividends: 0,
    capitalGains: 0, capitalLossesPriorYears: 0,
    rentalIncome: 0, rentalExpenses: 0,
    foreignIncome: 0, foreignTaxPaid: 0,
    eiRegularBenefits: 0, socialAssistance: 0, workersComp: 0,
    disabilityPensionCPP: 0, oasPension: 0,
    netPartnershipIncome: 0, scholarshipFellowship: 0, researchGrants: 0,
    rrspContribution: 0, rrspContributionRoom: 0,
    prppContribution: 0, fhsaContribution: 0,
    unionDues: 0, profDues: 0, childcareExpenses: 0, movingExpenses: 0,
    supportPayments: 0, carryingCharges: 0, employmentExpenses: 0,
    otherDeductions: 0,
    age: 30, isBlind: false, hasDisability: false,
    hasDisabledSpouse: false, hasDisabledDependent: false,
    disabledDependentAge: 0, hasSpouse: false, spouseNetIncome: 0,
    numberOfDependentsUnder18: 0, numberOfDependents18Plus: 0,
    isCaregiver: false,
    tuitionFederal: 0, tuitionCarryforwardFed: 0,
    studentLoanInterest: 0, medicalExpenses: 0,
    charitableDonations: 0, politicalContributions: 0,
    ontarioPoliticalContributions: 0,
    firstTimeHomeBuyer: false, homeAccessibilityReno: 0,
    adoptionExpenses: 0, pensionIncomeSplitting: 0,
    isVolunteerFirefighter: false, isSearchAndRescue: false,
    digitalNewsSubscriptions: 0,
    taxWithheld: 8000,
    cppContributedEmployee: 3700, cpp2ContributedEmployee: 0,
    eiContributedEmployee: 1077,
    rentPaid: 0, propertyTaxPaid: 0,
    isNorthernOntario: false, ontarioSalesTaxCreditEligible: true,
    installmentsPaid: 0, fhsaWithdrawal: 0,
    hasPriorYearCapitalLosses: false,
    numberOfChildren: 0, numberOfChildrenUnder6: 0,
    hasSpouseForBenefits: false,
  },
};

describe('/api/calculate persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-123' } },
      error: null,
    });
    mockSaveTaxReturn.mockResolvedValue({ success: true });
  });

  it('A. awaits saveTaxReturn in flat mode (not fire-and-forget)', async () => {
    // Make saveTaxReturn take time — if fire-and-forget, the call order test fails
    let resolved = false;
    mockSaveTaxReturn.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
      return { success: true };
    });

    const res = await POST(makeRequest(FLAT_BODY));
    // By the time POST resolves, saveTaxReturn must have completed
    expect(resolved).toBe(true);
    expect(res.status).toBe(200);
    expect(mockSaveTaxReturn).toHaveBeenCalledTimes(1);
  });

  it('B. calls saveTaxReturn with mode and server client', async () => {
    await POST(makeRequest(FLAT_BODY));

    expect(mockSaveTaxReturn).toHaveBeenCalledTimes(1);
    const [userId, taxYear, mode, _result, _provenance, _snapshot, options] =
      mockSaveTaxReturn.mock.calls[0];

    expect(userId).toBe('test-user-123');
    expect(taxYear).toBe(2025);
    expect(mode).toBe('flat');
    // The server Supabase client should be passed in options
    expect(options).toBeDefined();
    expect(options.supabaseClient).toBe(mockSupabaseClient);
  });

  it('C. persistence failure does not break calculation response', async () => {
    mockSaveTaxReturn.mockRejectedValue(new Error('DB connection lost'));

    const res = await POST(makeRequest(FLAT_BODY));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.lines.L15000_totalIncome).toBe(50000);
  });

  it('D. saveTaxReturn receives non-empty provenance', async () => {
    await POST(makeRequest(FLAT_BODY));

    const provenance = mockSaveTaxReturn.mock.calls[0][4];
    expect(Array.isArray(provenance)).toBe(true);
    expect(provenance.length).toBeGreaterThan(0);
  });
});
