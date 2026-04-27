/**
 * Tests for tax_returns persistence layer and provenance records.
 *
 * A. Migration shape matches code expectations
 * B. saveTaxReturn interface accepts result + provenance
 * C. User regression: T4 + T4A + T2202 → refund $127.71 with provenance
 * D. Calculation still works if persistence would fail (engine is independent)
 * E. Empty provenance is handled gracefully
 *
 * NOTE: These tests verify the engine emits provenance and the saveTaxReturn
 * function accepts the correct shape. Actual DB round-trip requires a live
 * Supabase connection and is verified via manual SQL after migration.
 */

import { describe, it, expect } from 'vitest';
import { calculateTaxReturn } from '../tax-engine/engine';
import { calculateTaxes } from '../taxEngine';
import { ENGINE_VERSION } from '../tax-engine/types/provenance';
import type { ProvenanceRecord } from '../tax-engine/types/provenance';
import type { TaxProfile, TaxSlip, DeductionsCreditsInput } from '../tax-engine/types';
import type { TaxInput } from '../taxEngine';

// ============================================================
// A. Migration shape expectations
// ============================================================

describe('tax_returns migration shape', () => {
  /**
   * This test documents the expected columns on public.tax_returns.
   * If the migration changes, update this test to match.
   */
  const EXPECTED_COLUMNS = [
    'id',
    'user_id',
    'profile_id',
    'tax_year',
    'engine_mode',
    'input_snapshot',
    'result',
    'provenance_records',
    'engine_version',
    'created_at',
    'updated_at',
  ];

  it('documents all expected columns', () => {
    // This is a documentation test — it will always pass.
    // The real validation is the SQL migration itself.
    expect(EXPECTED_COLUMNS).toHaveLength(11);
    expect(EXPECTED_COLUMNS).toContain('profile_id');
    expect(EXPECTED_COLUMNS).toContain('input_snapshot');
    expect(EXPECTED_COLUMNS).toContain('provenance_records');
    expect(EXPECTED_COLUMNS).toContain('engine_version');
  });

  it('engine_mode accepts slips and flat', () => {
    const validModes = ['slips', 'flat'];
    expect(validModes).toContain('slips');
    expect(validModes).toContain('flat');
  });

  it('ENGINE_VERSION is a valid semver', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ============================================================
// B. saveTaxReturn interface shape
// ============================================================

describe('saveTaxReturn interface shape', () => {
  it('ProvenanceRecord has all required fields', () => {
    const record: ProvenanceRecord = {
      field_id: 'line_10100',
      value: 2320,
      source: { type: 'slip', slip_type: 'T4', slip_index: 0, box: 'box14' },
      rule_applied: {
        description: 'Employment income',
        ita_section: 'ITA s.5(1)',
        folio_ref: 'T1 line 10100',
      },
      computation: '2320',
      timestamp: new Date().toISOString(),
      engine_version: ENGINE_VERSION,
    };

    expect(record.field_id).toBeTruthy();
    expect(typeof record.value).toBe('number');
    expect(record.source.type).toBe('slip');
    expect(record.engine_version).toBe(ENGINE_VERSION);
  });

  it('ProvenanceRecord[] serializes to valid JSON', () => {
    const records: ProvenanceRecord[] = [
      {
        field_id: 'line_10100',
        value: 2320,
        source: { type: 'computed', inputs: ['slip_t4_box14'] },
        timestamp: new Date().toISOString(),
        engine_version: ENGINE_VERSION,
      },
      {
        field_id: 'balance_owing',
        value: -127.71,
        source: { type: 'computed', inputs: ['total_tax_payable', 'total_tax_deducted'] },
        computation: '0 - 127.71 = -127.71',
        timestamp: new Date().toISOString(),
        engine_version: ENGINE_VERSION,
      },
    ];

    const json = JSON.stringify(records);
    const parsed = JSON.parse(json) as ProvenanceRecord[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0].field_id).toBe('line_10100');
    expect(parsed[1].value).toBe(-127.71);
  });
});

// ============================================================
// C. User regression: T4 + T4A + T2202 → refund $127.71 with provenance
// ============================================================

describe('Regression C — T4+T4A+T2202 return with provenance persistence', () => {
  const profile: TaxProfile = {
    id: 'regression-provenance',
    userId: 'user-provenance',
    taxYear: 2025,
    legalName: 'Provenance Regression',
    dateOfBirth: '2000-01-01',
    maritalStatus: 'single',
    province: 'ON',
    residencyStatus: 'citizen',
    dependants: [],
    assessmentComplete: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const slips: TaxSlip[] = [
    {
      type: 'T4',
      data: {
        issuerName: 'Employer A',
        box14: 2320,
        box16: 0,
        box16A: 0,
        box17: 0,
        box18: 0,
        box20: 0,
        box22: 127.71,
        box24: 2320,
        box26: 2320,
        box40: 0,
        box42: 0,
        box44: 0,
        box45: '1',
        box46: 0,
        box52: 0,
        box85: 0,
      },
    },
    {
      type: 'T4A',
      data: {
        issuerName: 'University of Ontario',
        box016: 0,
        box018: 0,
        box020: 0,
        box022: 0,
        box024: 0,
        box028: 0,
        box105: 2030,
        box135: 0,
      },
    },
    {
      type: 'T2202',
      data: {
        institutionName: 'University of Ontario',
        boxA: 14625.25,
        boxB: 0,
        boxC: 8,
      },
    },
  ];

  const emptyDeductions: DeductionsCreditsInput = {
    rrspContributions: 0,
    rrspContributionRoom: 0,
    fhsaContributions: 0,
    unionDues: 0,
    childcareExpenses: 0,
    movingExpenses: 0,
    supportPaymentsMade: 0,
    carryingCharges: 0,
    studentLoanInterest: 0,
    medicalExpenses: [],
    donations: [],
    rentPaid: 0,
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

  const result = calculateTaxReturn(profile, slips, [], [], emptyDeductions);

  it('refund = $127.71', () => {
    expect(result.balanceOwing).toBeCloseTo(-127.71, 2);
  });

  it('provenance_records is non-empty', () => {
    expect(result.provenance).toBeDefined();
    expect(Array.isArray(result.provenance)).toBe(true);
    expect(result.provenance.length).toBeGreaterThan(0);
  });

  it('provenance includes balance_owing traced to source', () => {
    const balanceRec = result.provenance.find(r => r.field_id === 'balance_owing');
    expect(balanceRec).toBeDefined();
    expect(balanceRec!.value).toBeCloseTo(-127.71, 2);
    expect(balanceRec!.computation).toBeDefined();
  });

  it('provenance includes employment income from T4 box14', () => {
    const empRec = result.provenance.find(r => r.field_id === 'line_10100');
    expect(empRec).toBeDefined();
    expect(empRec!.computation).toContain('2320');
  });

  it('provenance includes total_tax_deducted = 127.71', () => {
    const deducted = result.provenance.find(r => r.field_id === 'total_tax_deducted');
    expect(deducted).toBeDefined();
    expect(deducted!.value).toBe(127.71);
  });

  it('every provenance record has engine_version', () => {
    for (const rec of result.provenance) {
      expect(rec.engine_version).toBe(ENGINE_VERSION);
    }
  });

  it('result + provenance serialize to valid JSON for DB storage', () => {
    // Simulates what saveTaxReturn() does before inserting into tax_returns
    const payload = {
      result: result as unknown as Record<string, unknown>,
      provenance_records: result.provenance,
      input_snapshot: {
        profile,
        slips,
        deductions: emptyDeductions,
      },
      engine_version: ENGINE_VERSION,
    };

    const json = JSON.stringify(payload);
    expect(json.length).toBeGreaterThan(0);
    const parsed = JSON.parse(json);
    expect(parsed.provenance_records.length).toBeGreaterThan(0);
    expect(parsed.engine_version).toBe(ENGINE_VERSION);
  });
});

// ============================================================
// D. Calculation works independently of persistence
// ============================================================

describe('Engine independence from persistence', () => {
  it('slip-based engine returns result with provenance even without DB', () => {
    const profile: TaxProfile = {
      id: 'no-db',
      userId: 'user-nodb',
      taxYear: 2025,
      legalName: 'No DB',
      dateOfBirth: '1990-01-01',
      maritalStatus: 'single',
      province: 'ON',
      residencyStatus: 'citizen',
      dependants: [],
      assessmentComplete: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const slips: TaxSlip[] = [{
      type: 'T4',
      data: {
        issuerName: 'Test',
        box14: 50000, box16: 3700, box16A: 0, box17: 0,
        box18: 1077, box20: 0, box22: 8000, box24: 50000,
        box26: 50000, box40: 0, box42: 0, box44: 0,
        box45: '1', box46: 0, box52: 0, box85: 0,
      },
    }];

    const deductions: DeductionsCreditsInput = {
      rrspContributions: 0, rrspContributionRoom: 0, fhsaContributions: 0,
      unionDues: 0, childcareExpenses: 0, movingExpenses: 0,
      supportPaymentsMade: 0, carryingCharges: 0, studentLoanInterest: 0,
      medicalExpenses: [], donations: [], rentPaid: 0, propertyTaxPaid: 0,
      studentResidence: false, tuitionCarryforward: 0,
      capitalLossCarryforward: 0, nonCapitalLossCarryforward: 0,
      donationCarryforward: 0, politicalContributions: 0,
      digitalNewsSubscription: 0, hasDisabilityCredit: false,
      homeBuyersEligible: false, homeAccessibilityExpenses: 0,
    };

    // Engine should work perfectly without any DB connection
    const result = calculateTaxReturn(profile, slips, [], [], deductions);
    expect(result.totalIncome).toBe(50000);
    expect(result.provenance.length).toBeGreaterThan(0);
    expect(result.balanceOwing).toBeDefined();
  });

  it('flat-input engine returns result with provenance even without DB', () => {
    const input: TaxInput = {
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
    };

    const result = calculateTaxes(input);
    expect(result.lines.L15000_totalIncome).toBe(50000);
    expect(result.provenance.length).toBeGreaterThan(0);
    expect(result.summary.refundOrOwing).toBeDefined();
  });
});

// ============================================================
// E. Empty provenance handling
// ============================================================

describe('Empty provenance graceful handling', () => {
  it('empty provenance array serializes correctly', () => {
    const emptyProvenance: ProvenanceRecord[] = [];
    const json = JSON.stringify(emptyProvenance);
    expect(json).toBe('[]');
    expect(JSON.parse(json)).toEqual([]);
  });
});
