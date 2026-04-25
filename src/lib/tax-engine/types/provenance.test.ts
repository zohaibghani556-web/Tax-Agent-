/**
 * Provenance layer tests.
 *
 * 1. Unit tests for ProvenanceCollector and ProvenanceRecordBuilder
 * 2. Integration: engine.ts emits provenance for every major T1 line
 * 3. Integration: taxEngine.ts emits provenance for every major T1 line
 * 4. Every provenance record has correct structure, matching value, and computation
 */

import { describe, it, expect } from 'vitest';
import {
  ProvenanceCollector,
  ProvenanceRecord,
  ENGINE_VERSION,
} from './provenance';
import { calculateTaxReturn } from '../engine';
import { calculateTaxes } from '../../taxEngine';
import type { TaxProfile, TaxSlip, DeductionsCreditsInput } from '../types';
import type { TaxInput } from '../../taxEngine';

// ============================================================
// UNIT TESTS: ProvenanceCollector
// ============================================================

describe('ProvenanceCollector', () => {
  it('starts empty', () => {
    const c = new ProvenanceCollector();
    expect(c.size).toBe(0);
    expect(c.toArray()).toEqual([]);
  });

  it('collects records via the builder', () => {
    const c = new ProvenanceCollector();
    c.record('line_10100', 72000)
      .input('employmentIncome')
      .rule('Employment income', 'ITA s.5(1)', 'T1 line 10100')
      .computation('72000')
      .emit();

    expect(c.size).toBe(1);
    const r = c.toArray()[0];
    expect(r.field_id).toBe('line_10100');
    expect(r.value).toBe(72000);
    expect(r.source).toEqual({ type: 'user_input', input_id: 'employmentIncome' });
    expect(r.rule_applied?.ita_section).toBe('ITA s.5(1)');
    expect(r.rule_applied?.folio_ref).toBe('T1 line 10100');
    expect(r.computation).toBe('72000');
    expect(r.engine_version).toBe(ENGINE_VERSION);
    expect(r.timestamp).toBeDefined();
  });

  it('supports slip source shorthand', () => {
    const c = new ProvenanceCollector();
    c.record('line_10100', 50000)
      .slip('T4', 0, 'box14')
      .emit();

    const r = c.toArray()[0];
    expect(r.source).toEqual({ type: 'slip', slip_type: 'T4', slip_index: 0, box: 'box14' });
  });

  it('supports computed source shorthand', () => {
    const c = new ProvenanceCollector();
    c.record('line_15000', 100000)
      .computed('line_10100', 'line_12100')
      .emit();

    const r = c.toArray()[0];
    expect(r.source).toEqual({ type: 'computed', inputs: ['line_10100', 'line_12100'] });
  });

  it('supports carryforward source shorthand', () => {
    const c = new ProvenanceCollector();
    c.record('tuition_carryforward', 5000)
      .carryforward(2024, 'tuition_unused')
      .emit();

    const r = c.toArray()[0];
    expect(r.source).toEqual({ type: 'carryforward', prior_year: 2024, field_id: 'tuition_unused' });
  });

  it('toMap() returns field_id keyed map', () => {
    const c = new ProvenanceCollector();
    c.record('a', 1).emit();
    c.record('b', 2).emit();

    const map = c.toMap();
    expect(map.get('a')?.value).toBe(1);
    expect(map.get('b')?.value).toBe(2);
    expect(map.size).toBe(2);
  });

  it('allows chaining emit() calls', () => {
    const c = new ProvenanceCollector();
    c.record('a', 1).emit()
     .record('b', 2).emit();

    expect(c.size).toBe(2);
  });
});

// ============================================================
// INTEGRATION: engine.ts (slip-based) provenance
// ============================================================

describe('engine.ts provenance', () => {
  const profile: TaxProfile = {
    id: 'prov-test-1',
    userId: 'user-1',
    taxYear: 2025,
    legalName: 'Provenance Test',
    dateOfBirth: '1997-07-01',
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
        issuerName: 'Acme Corp',
        box14: 72000, box16: 3700, box16A: 0, box17: 0,
        box18: 1077, box20: 0, box22: 14200, box24: 72000,
        box26: 72000, box40: 0, box42: 0, box44: 0,
        box45: '1', box46: 0, box52: 0, box85: 0,
      },
    },
    {
      type: 'T5',
      data: {
        issuerName: 'Big Bank',
        box11: 0, box12: 0, box13: 450, box14: 0,
        box18: 0, box24: 800, box25: 1104, box26: 0,
      },
    },
  ];

  const deductions: DeductionsCreditsInput = {
    rrspContributions: 5000,
    rrspContributionRoom: 15000,
    fhsaContributions: 0,
    unionDues: 0,
    childcareExpenses: 0,
    movingExpenses: 0,
    supportPaymentsMade: 0,
    carryingCharges: 0,
    studentLoanInterest: 0,
    medicalExpenses: [{ description: 'dental', amount: 1200, forWhom: 'self' }],
    donations: [{ recipientName: 'Charity', amount: 600, type: 'cash', eligibleForProvincial: true }],
    rentPaid: 18000,
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

  const result = calculateTaxReturn(profile, slips, [], [], deductions);

  it('emits provenance records', () => {
    expect(result.provenance).toBeDefined();
    expect(result.provenance.length).toBeGreaterThan(0);
  });

  // List of expected provenance field_ids from engine.ts
  const expectedFields = [
    'line_10100',
    'line_15000',
    'line_23600',
    'line_26000',
    'federal_gross_tax',
    'federal_nrc',
    'federal_dtc_dividend',
    'federal_topup_credit',
    'net_federal_tax',
    'ontario_gross_tax',
    'ontario_nrc',
    'ontario_dtc_dividend',
    'ontario_litr',
    'ontario_surtax',
    'ontario_health_premium',
    'net_ontario_tax',
    'total_tax_payable',
    'total_tax_deducted',
    'cwb',
    'rmes',
    'ctc',
    'cpp_ei_overdeduction',
    'balance_owing',
  ];

  it.each(expectedFields)('emits provenance for %s', (fieldId) => {
    const rec = result.provenance.find(r => r.field_id === fieldId);
    expect(rec, `missing provenance for ${fieldId}`).toBeDefined();
  });

  it('provenance records have correct structure', () => {
    for (const rec of result.provenance) {
      expect(rec.field_id).toBeTruthy();
      expect(typeof rec.value).toBe('number');
      expect(rec.source).toBeDefined();
      expect(rec.source.type).toMatch(/^(slip|user_input|carryforward|computed)$/);
      expect(rec.timestamp).toBeTruthy();
      expect(rec.engine_version).toBe(ENGINE_VERSION);
    }
  });

  it('provenance values match engine output', () => {
    const map = new Map(result.provenance.map(r => [r.field_id, r]));

    expect(map.get('line_15000')?.value).toBe(result.totalIncome);
    expect(map.get('line_23600')?.value).toBe(result.netIncome);
    expect(map.get('line_26000')?.value).toBe(result.taxableIncome);
    expect(map.get('federal_gross_tax')?.value).toBe(result.federalTaxOnIncome);
    expect(map.get('federal_nrc')?.value).toBe(result.federalNonRefundableCredits);
    expect(map.get('federal_dtc_dividend')?.value).toBe(result.federalDividendTaxCredit);
    expect(map.get('federal_topup_credit')?.value).toBe(result.topUpTaxCredit);
    expect(map.get('net_federal_tax')?.value).toBe(result.netFederalTax);
    expect(map.get('ontario_gross_tax')?.value).toBe(result.ontarioTaxOnIncome);
    expect(map.get('ontario_nrc')?.value).toBe(result.ontarioNonRefundableCredits);
    expect(map.get('ontario_surtax')?.value).toBe(result.ontarioSurtax);
    expect(map.get('ontario_health_premium')?.value).toBe(result.ontarioHealthPremium);
    expect(map.get('net_ontario_tax')?.value).toBe(result.netOntarioTax);
    expect(map.get('total_tax_payable')?.value).toBe(result.totalTaxPayable);
    expect(map.get('total_tax_deducted')?.value).toBe(result.totalTaxDeducted);
    expect(map.get('balance_owing')?.value).toBe(result.balanceOwing);
  });

  it('employment income provenance traces to T4 slip', () => {
    const rec = result.provenance.find(r => r.field_id === 'line_10100');
    expect(rec?.source.type).toBe('computed');
    expect(rec?.rule_applied?.ita_section).toBe('ITA s.5(1)');
    expect(rec?.computation).toContain('72000');
  });

  it('federal gross tax shows ITA s.117', () => {
    const rec = result.provenance.find(r => r.field_id === 'federal_gross_tax');
    expect(rec?.rule_applied?.ita_section).toBe('ITA s.117');
    expect(rec?.source.type).toBe('computed');
  });

  it('balance_owing computation shows the math', () => {
    const rec = result.provenance.find(r => r.field_id === 'balance_owing');
    expect(rec?.computation).toBeDefined();
    expect(rec?.computation).toContain(String(result.totalTaxPayable));
    expect(rec?.computation).toContain(String(result.totalTaxDeducted));
  });
});

// ============================================================
// INTEGRATION: taxEngine.ts (flat-input) provenance
// ============================================================

describe('taxEngine.ts provenance', () => {
  const input: TaxInput = {
    employmentIncome: 85000,
    selfEmploymentNetIncome: 0,
    otherEmploymentIncome: 0,
    pensionIncome: 0,
    annuityIncome: 0,
    rrspIncome: 0,
    otherIncome: 0,
    interestIncome: 1200,
    eligibleDividends: 500,
    ineligibleDividends: 0,
    capitalGains: 0,
    capitalLossesPriorYears: 0,
    rentalIncome: 0,
    rentalExpenses: 0,
    foreignIncome: 0,
    foreignTaxPaid: 0,
    eiRegularBenefits: 0,
    socialAssistance: 0,
    workersComp: 0,
    disabilityPensionCPP: 0,
    oasPension: 0,
    netPartnershipIncome: 0,
    scholarshipFellowship: 0,
    researchGrants: 0,

    rrspContribution: 6000,
    rrspContributionRoom: 15000,
    prppContribution: 0,
    fhsaContribution: 0,
    unionDues: 0,
    profDues: 0,
    childcareExpenses: 0,
    movingExpenses: 0,
    supportPayments: 0,
    carryingCharges: 0,
    employmentExpenses: 0,
    otherDeductions: 0,

    age: 35,
    isBlind: false,
    hasDisability: false,
    hasDisabledSpouse: false,
    hasDisabledDependent: false,
    disabledDependentAge: 0,
    hasSpouse: false,
    spouseNetIncome: 0,
    numberOfDependentsUnder18: 0,
    numberOfDependents18Plus: 0,
    isCaregiver: false,
    tuitionFederal: 0,
    tuitionCarryforwardFed: 0,
    studentLoanInterest: 0,
    medicalExpenses: 0,
    charitableDonations: 0,
    politicalContributions: 0,
    ontarioPoliticalContributions: 0,
    firstTimeHomeBuyer: false,
    homeAccessibilityReno: 0,
    adoptionExpenses: 0,
    pensionIncomeSplitting: 0,
    isVolunteerFirefighter: false,
    isSearchAndRescue: false,
    digitalNewsSubscriptions: 0,

    taxWithheld: 18000,
    cppContributedEmployee: 4034.10,
    cpp2ContributedEmployee: 0,
    eiContributedEmployee: 1077.48,

    rentPaid: 0,
    propertyTaxPaid: 3500,
    isNorthernOntario: false,
    ontarioSalesTaxCreditEligible: true,

    installmentsPaid: 0,
    fhsaWithdrawal: 0,
    hasPriorYearCapitalLosses: false,
    numberOfChildren: 0,
    numberOfChildrenUnder6: 0,
    hasSpouseForBenefits: false,
  };

  const result = calculateTaxes(input);

  it('emits provenance records', () => {
    expect(result.provenance).toBeDefined();
    expect(result.provenance.length).toBeGreaterThan(0);
  });

  const expectedFields = [
    'line_10100',
    'line_12100',
    'line_15000',
    'line_20800',
    'line_23600',
    'line_26000',
    'federal_gross_tax',
    'federal_nrc',
    'federal_dtc_dividend',
    'net_federal_tax',
    'ontario_gross_tax',
    'ontario_nrc',
    'ontario_surtax',
    'ontario_health_premium',
    'net_ontario_tax',
    'total_tax_payable',
    'total_tax_deducted',
    'balance_owing',
  ];

  it.each(expectedFields)('emits provenance for %s', (fieldId) => {
    const rec = result.provenance.find(r => r.field_id === fieldId);
    expect(rec, `missing provenance for ${fieldId}`).toBeDefined();
  });

  it('provenance records have correct structure', () => {
    for (const rec of result.provenance) {
      expect(rec.field_id).toBeTruthy();
      expect(typeof rec.value).toBe('number');
      expect(rec.source).toBeDefined();
      expect(rec.timestamp).toBeTruthy();
      expect(rec.engine_version).toBe(ENGINE_VERSION);
    }
  });

  it('provenance values match breakdown output', () => {
    const map = new Map(result.provenance.map(r => [r.field_id, r]));

    expect(map.get('line_10100')?.value).toBe(result.lines.L10100_employment);
    expect(map.get('line_12100')?.value).toBe(result.lines.L12100_interest);
    expect(map.get('line_15000')?.value).toBe(result.lines.L15000_totalIncome);
    expect(map.get('line_20800')?.value).toBe(result.lines.L20800_rrspDeduction);
    expect(map.get('line_23600')?.value).toBe(result.lines.L23600_netIncome);
    expect(map.get('line_26000')?.value).toBe(result.lines.L26000_taxableIncome);
    expect(map.get('federal_gross_tax')?.value).toBe(result.federal.grossTax);
    expect(map.get('total_tax_payable')?.value).toBe(result.summary.totalTaxPayable);
  });

  it('employment income provenance uses user_input source', () => {
    const rec = result.provenance.find(r => r.field_id === 'line_10100');
    expect(rec?.source).toEqual({ type: 'user_input', input_id: 'employmentIncome' });
  });

  it('RRSP deduction shows capping computation', () => {
    const rec = result.provenance.find(r => r.field_id === 'line_20800');
    expect(rec?.computation).toContain('6000');
    expect(rec?.rule_applied?.ita_section).toBe('ITA s.60(i)');
  });

  it('total income shows computed source with all input lines', () => {
    const rec = result.provenance.find(r => r.field_id === 'line_15000');
    expect(rec?.source.type).toBe('computed');
    if (rec?.source.type === 'computed') {
      expect(rec.source.inputs).toContain('line_10100');
      expect(rec.source.inputs).toContain('line_12100');
    }
  });
});
