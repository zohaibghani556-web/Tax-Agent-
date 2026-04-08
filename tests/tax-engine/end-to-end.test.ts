/**
 * End-to-end integration test — complete tax return, no dividends scenario.
 *
 * Scenario: Single person, age 28 (born 1997-03-15), Ontario resident all year, citizen.
 *
 *   T4:   $72,000 employment income | $3,700 CPP | $1,077 EI
 *         $14,200 tax deducted | $500 union dues (box 44)
 *   T5:   $450 interest income only (no dividends)
 *   RRSP: $5,000 contribution
 *   Union dues deduction: $500 (from T4 box 44)
 *   Charitable donations: $600
 *   Medical expenses: $1,200
 *   Rent paid: $18,000 (for OTB/OEPTC)
 *
 * Expected values (manual calculation):
 *   Total income  (L.15000)  : $72,450  (72,000 + 450)
 *   Net income    (L.23600)  : $66,950  (72,450 − 5,000 RRSP − 500 union dues)
 *   Taxable income (L.26000) : $66,950  (no further deductions)
 *
 *   Federal tax on income    : ~$10,282
 *   Federal non-refundable credits: ~$3,487 (same credit amounts as no-dividend case)
 *   Federal dividend tax credit: $0 (no dividends)
 *   Net federal tax          : ~$6,600–$6,800
 *
 *   Ontario tax on income    : ~$3,958
 *   Ontario NRCs             : ~$1,009
 *   Ontario DTC              : $0
 *   Ontario surtax           : $0 (basic ON tax < $6,104 threshold)
 *   Ontario Health Premium   : $900 (taxable income $48,600–$72,000 band)
 *   Net Ontario tax          : ~$3,849
 *
 *   Total tax payable        : ~$10,500
 *   Total tax deducted       : $14,200
 *   Balance                  : ~−$3,700 (refund — negative value)
 */

import { describe, it, expect } from 'vitest';
import { calculateTaxReturn } from '../../src/lib/tax-engine/engine';
import type { TaxProfile, TaxSlip, DeductionsCreditsInput } from '../../src/lib/tax-engine/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const profile: TaxProfile = {
  id: 'test-e2e-nodiv-1',
  userId: 'user-2',
  taxYear: 2025,
  legalName: 'Jordan Test',
  dateOfBirth: '1997-03-15',   // age 28 on Dec 31, 2025
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
      box14: 72000,   // Employment income
      box16: 3700,    // CPP contributions
      box16A: 0,
      box17: 0,
      box18: 1077,    // EI premiums
      box20: 0,
      box22: 14200,   // Income tax deducted
      box24: 72000,
      box26: 72000,
      box40: 0,
      box42: 0,
      box44: 500,     // Union dues
      box45: '1',
      box46: 0,
      box52: 0,
      box85: 0,
    },
  },
  {
    type: 'T5',
    data: {
      issuerName: 'TD Bank',
      box11: 0,   // No non-eligible dividends
      box12: 0,
      box13: 450, // Interest from Canadian sources
      box14: 0,
      box18: 0,
      box24: 0,   // No eligible dividends
      box25: 0,
      box26: 0,
    },
  },
];

const deductions: DeductionsCreditsInput = {
  rrspContributions: 5000,
  rrspContributionRoom: 15000,
  fhsaContributions: 0,
  unionDues: 500,         // Matches T4 box 44
  childcareExpenses: 0,
  movingExpenses: 0,
  supportPaymentsMade: 0,
  carryingCharges: 0,
  studentLoanInterest: 0,

  medicalExpenses: [{ description: 'Dental', amount: 1200, forWhom: 'self' }],
  donations: [{ recipientName: 'Red Cross', amount: 600, type: 'cash', eligibleForProvincial: true }],

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('end-to-end: single, age 28, T4 + T5 interest only, RRSP + union dues', () => {
  const result = calculateTaxReturn(profile, slips, [], [], deductions);

  describe('1. Total income', () => {
    it('total income = $72,450 (employment $72,000 + interest $450)', () => {
      expect(result.totalIncome).toBe(72450);
    });
  });

  describe('2. Net income', () => {
    it('net income = $66,950 (72,450 − $5,000 RRSP − $500 union dues)', () => {
      expect(result.netIncome).toBe(66950);
    });
  });

  describe('3. Taxable income', () => {
    it('taxable income = $66,950 (equals net income — no further deductions)', () => {
      expect(result.taxableIncome).toBe(66950);
    });
  });

  describe('4. Federal tax after credits', () => {
    it('net federal tax is in the $6,000–$8,000 range', () => {
      expect(result.netFederalTax).toBeGreaterThanOrEqual(6000);
      expect(result.netFederalTax).toBeLessThanOrEqual(8000);
    });

    it('federal dividend tax credit = $0 (no dividends)', () => {
      expect(result.federalDividendTaxCredit).toBe(0);
    });

    it('federal tax on income is positive', () => {
      expect(result.federalTaxOnIncome).toBeGreaterThan(0);
    });
  });

  describe('5. Ontario tax + surtax + health premium', () => {
    it('Ontario tax on income is positive', () => {
      expect(result.ontarioTaxOnIncome).toBeGreaterThan(0);
    });

    it('Ontario surtax = $0 (basic ON tax well below $5,818 threshold)', () => {
      expect(result.ontarioSurtax).toBe(0);
    });

    it('Ontario Health Premium = $600 (taxable income $48,601–$72,000 flat band)', () => {
      expect(result.ontarioHealthPremium).toBe(600);
    });

    it('Ontario dividend tax credit = $0 (no dividends)', () => {
      expect(result.ontarioDividendTaxCredit).toBe(0);
    });

    it('net Ontario tax is in the $3,400–$4,000 range', () => {
      expect(result.netOntarioTax).toBeGreaterThanOrEqual(3400);
      expect(result.netOntarioTax).toBeLessThanOrEqual(4000);
    });
  });

  describe('6. Balance', () => {
    it('total tax deducted at source = $14,200', () => {
      expect(result.totalTaxDeducted).toBe(14200);
    });

    it('balance owing is negative — taxpayer receives a refund', () => {
      expect(result.balanceOwing).toBeLessThan(0);
    });

    it('refund is in the $3,200–$4,500 range (given $14,200 withheld on ~$67K taxable income)', () => {
      expect(result.balanceOwing).toBeLessThanOrEqual(-3200);
      expect(result.balanceOwing).toBeGreaterThanOrEqual(-4500);
    });
  });
});
