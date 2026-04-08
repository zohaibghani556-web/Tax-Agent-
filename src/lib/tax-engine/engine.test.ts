/**
 * End-to-end integration test for the main tax engine.
 *
 * Scenario: Single person, age 28, Ontario resident all year.
 *   T4:  $72,000 employment income | $3,700 CPP | $1,077 EI | $14,200 tax deducted
 *   T5:  $450 interest | $800 actual eligible dividends | $1,104 taxable eligible dividends
 *   RRSP: $5,000 contribution (room: $15,000)
 *   Rent: $18,000 (for OTB/OEPTC)
 *   Charitable donations: $600
 *   Medical expenses: $1,200
 *
 * Manual calculation summary (corrected for 2025 constants):
 *   Total income (L.15000)  : $73,554.00  (72,000 + 450 + 1,104)
 *   Net income   (L.23600)  : $68,554.00  (73,554 − 5,000 RRSP)
 *   Taxable income (L.26000): $68,554.00
 *
 *   Federal tax on income   : $10,611.07  (IEEE 754: 57,375×14.5% = 8,319.37 + 11,179×20.5% = 2,291.70)
 *   Federal NRCs            :  $3,496.85  (BPA 16,129 + CPP 3,700 + EI 1,077 + Emp 1,433) × 15% + donations 146
 *   Federal DTC             :    $165.82  (1,104 × 15.0198%)
 *   Top-up credit           :    $111.70  (22,339 credit amounts × 0.5%)
 *   Net federal tax         :  $6,836.70
 *
 *   Ontario tax on income   :  $4,163.40  (51,446×5.05% = 2,598.02 + 17,108×9.15% = 1,565.38)
 *   Ontario NRCs            :    $967.53  (ON-BPA 11,865 + CPP 3,700 + EI 1,077 + Emp 1,433) × 5.05% + ON-donations 54.74
 *   Ontario DTC             :    $110.40  (1,104 × 10%)
 *   Ontario LITR            :      $0.00  (income $68,554 >> $18,569 threshold)
 *   Ontario surtax          :      $0.00  (basic Ontario tax $3,085.47 < $5,818 threshold)
 *   Ontario Health Premium  :    $600.00  (taxable income $48,601–$72,000 flat band)
 *   Net Ontario tax         :  $3,685.47
 *
 *   Total tax payable       : $10,522.17
 *   Total tax deducted      : $14,200.00
 *   Balance (refund)        : −$3,677.83
 *
 *   OTB estimate (OEPTC)    :    $737.86  (energy $280 + rent $1,248 − income reduction $790.14)
 */

import { describe, it, expect } from 'vitest';
import { calculateTaxReturn } from './engine';
import type { TaxProfile, TaxSlip, DeductionsCreditsInput } from './types';

// Helper: compare money values to the nearest cent
function cent(actual: number, expected: number, label?: string): void {
  expect(Math.round(actual * 100), label).toBe(Math.round(expected * 100));
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

const profile: TaxProfile = {
  id: 'test-e2e-1',
  userId: 'user-1',
  taxYear: 2025,
  legalName: 'Alex Test',
  dateOfBirth: '1997-07-01',   // age 28 on Dec 31, 2025
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
      box44: 0,
      box45: '1',
      box46: 0,
      box52: 0,
      box85: 0,
    },
  },
  {
    type: 'T5',
    data: {
      issuerName: 'RBC Investments',
      box11: 0,       // No non-eligible dividends
      box12: 0,
      box13: 450,     // Interest from Canadian sources
      box14: 0,
      box18: 0,
      box24: 800,     // Actual eligible dividends
      box25: 1104,    // Taxable eligible dividends (800 × 1.38)
      box26: 0,
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

describe('calculateTaxReturn — single, age 28, T4 + T5, RRSP, rent', () => {
  const result = calculateTaxReturn(profile, slips, [], [], deductions);

  describe('Income lines', () => {
    it('total income (line 15000) = $73,554', () => {
      cent(result.totalIncome, 73554, 'totalIncome');
    });

    it('net income (line 23600) = $68,554 after $5,000 RRSP deduction', () => {
      cent(result.netIncome, 68554, 'netIncome');
    });

    it('taxable income (line 26000) = $68,554 (no further deductions)', () => {
      cent(result.taxableIncome, 68554, 'taxableIncome');
    });
  });

  describe('Federal tax', () => {
    it('federal tax on income = $10,611.07', () => {
      // IEEE 754: 57,375 × 0.145 ≈ 8,319.37 (0.145 is slightly < 0.145 in double)
      // Bracket 2: 11,179 × 0.205 = 2,291.70
      cent(result.federalTaxOnIncome, 10611.07, 'federalTaxOnIncome');
    });

    it('federal non-refundable credits = $3,496.85', () => {
      // (BPA 16,129 + CPP 3,700 + EI 1,077 + Employment 1,433) × 15% + donations 146
      // = 22,339 × 15% + 146 = 3,350.85 + 146 = 3,496.85
      cent(result.federalNonRefundableCredits, 3496.85, 'federalNRC');
    });

    it('federal dividend tax credit = $165.82', () => {
      // 1,104 × 15.0198% = 165.818... → 165.82
      cent(result.federalDividendTaxCredit, 165.82, 'federalDTC');
    });

    it('top-up tax credit = $111.70 (2025 blended-rate adjustment)', () => {
      // 22,339 × (15% − 14.5%) = 22,339 × 0.5% = 111.695 → 111.70
      cent(result.topUpTaxCredit, 111.70, 'topUpCredit');
    });

    it('net federal tax = $6,836.70', () => {
      // 10,611.07 − 3,496.85 − 165.82 − 111.70 = 6,836.70
      cent(result.netFederalTax, 6836.70, 'netFederalTax');
    });
  });

  describe('Ontario tax', () => {
    it('Ontario tax on income = $4,163.40', () => {
      // Bracket 1: 51,446 × 5.05% = 2,598.02
      // Bracket 2: (68,554 − 51,446) × 9.15% = 17,108 × 9.15% = 1,565.38
      cent(result.ontarioTaxOnIncome, 4163.40, 'ontarioTaxOnIncome');
    });

    it('Ontario non-refundable credits = $967.53', () => {
      // (ON-BPA 11,865 + CPP 3,700 + EI 1,077 + Employment 1,433) × 5.05%
      //   + (200 × 5.05% + 400 × 11.16%)
      // = 18,075 × 5.05% + 54.74
      // = 912.79 + 54.74 = 967.53
      cent(result.ontarioNonRefundableCredits, 967.53, 'ontarioNRC');
    });

    it('Ontario dividend tax credit = $110.40', () => {
      // 1,104 × 10% = 110.40
      cent(result.ontarioDividendTaxCredit, 110.40, 'ontarioDTC');
    });

    it('Ontario low-income reduction = $0 (income too high)', () => {
      // clawback = (68,554 − 18,569) × 5.05% = 2,524.24 > $294 base → reduction = $0
      cent(result.ontarioLowIncomeReduction, 0, 'ontarioLIR');
    });

    it('Ontario surtax = $0 (basic tax $3,085.47 < $5,818 threshold)', () => {
      cent(result.ontarioSurtax, 0, 'ontarioSurtax');
    });

    it('Ontario Health Premium = $600 (income in $48,601–$72,000 flat band)', () => {
      // CRA formula: $450 + min($150, 25%×(income−$48,000)); caps at $600 at income $48,600
      // $68,554 is in the flat $600 zone
      cent(result.ontarioHealthPremium, 600, 'ontarioOHP');
    });

    it('net Ontario tax = $3,685.47 (basic $3,085.47 + OHP $600)', () => {
      cent(result.netOntarioTax, 3685.47, 'netOntarioTax');
    });
  });

  describe('Bottom line', () => {
    it('total tax payable = $10,522.17', () => {
      cent(result.totalTaxPayable, 10522.17, 'totalTaxPayable');
    });

    it('total tax deducted = $14,200 (T4 box 22)', () => {
      cent(result.totalTaxDeducted, 14200, 'totalTaxDeducted');
    });

    it('balance = −$3,677.83 (refund)', () => {
      cent(result.balanceOwing, -3677.83, 'balanceOwing');
      expect(result.balanceOwing).toBeLessThan(0); // confirms it is a refund
    });
  });

  describe('OTB estimate', () => {
    it('OTB = $737.86 (OEPTC: energy $280 + rent credit $1,248 − income reduction $790.14)', () => {
      // OSTC = 0 (income $68,554 far exceeds $29,047 reduction threshold)
      // OEPTC base = 280 + min(18,000 × 20%, 1,248) = 280 + 1,248 = 1,528
      // OEPTC reduction = (68,554 − 29,047) × 2% = 790.14
      // OEPTC = max(0, 1,528 − 790.14) = 737.86
      cent(result.estimatedOTB, 737.86, 'estimatedOTB');
    });
  });

  describe('Marginal rates', () => {
    it('marginal federal rate = 20.5% (income in second bracket)', () => {
      expect(result.marginalFederalRate).toBe(0.205);
    });

    it('marginal Ontario rate = 9.15% (income in second Ontario bracket)', () => {
      expect(result.marginalOntarioRate).toBe(0.0915);
    });

    it('combined marginal rate = 29.65%', () => {
      cent(result.combinedMarginalRate, 0.2965, 'combinedMarginal');
    });
  });

  describe('Line-by-line record', () => {
    it('line 10100 (employment income) = $72,000', () => {
      expect(result.lineByLine[10100]).toBe(72000);
    });

    it('line 12000 (eligible dividends) = $1,104', () => {
      expect(result.lineByLine[12000]).toBe(1104);
    });

    it('line 12100 (interest income) = $450', () => {
      expect(result.lineByLine[12100]).toBe(450);
    });

    it('line 15000 (total income) = $73,554', () => {
      expect(result.lineByLine[15000]).toBe(73554);
    });

    it('line 20800 (RRSP deduction) = $5,000', () => {
      expect(result.lineByLine[20800]).toBe(5000);
    });

    it('line 23600 (net income) = $68,554', () => {
      expect(result.lineByLine[23600]).toBe(68554);
    });

    it('line 26000 (taxable income) = $68,554', () => {
      expect(result.lineByLine[26000]).toBe(68554);
    });

    it('line 43700 (tax deducted) = $14,200', () => {
      expect(result.lineByLine[43700]).toBe(14200);
    });
  });

  describe('Warnings', () => {
    it('emits a medical expense info warning (expenses below threshold)', () => {
      // $1,200 medical < threshold of min($2,635, 3% × $68,554 = $2,056.62) = $2,056.62
      const medicalWarning = result.warnings.find(w => w.line === 33099);
      expect(medicalWarning).toBeDefined();
      expect(medicalWarning?.severity).toBe('info');
    });

    it('does not emit an RRSP over-contribution warning', () => {
      const rrspWarning = result.warnings.find(w => w.line === 20800 && w.severity === 'warning');
      expect(rrspWarning).toBeUndefined();
    });
  });
});

// ── Edge case: zero income ─────────────────────────────────────────────────────

describe('calculateTaxReturn — zero income', () => {
  const zeroProfile: TaxProfile = { ...profile, id: 'test-e2e-zero' };
  const zeroDeductions: DeductionsCreditsInput = {
    ...deductions,
    rrspContributions: 0,
    medicalExpenses: [],
    donations: [],
    rentPaid: 0,
  };
  const result = calculateTaxReturn(zeroProfile, [], [], [], zeroDeductions);

  it('total income = $0', () => expect(result.totalIncome).toBe(0));
  it('net income = $0', ()   => expect(result.netIncome).toBe(0));
  it('federal tax = $0', ()  => expect(result.netFederalTax).toBe(0));
  it('Ontario tax = $0', ()  => expect(result.ontarioTaxOnIncome).toBe(0));
  it('OHP = $0', ()          => expect(result.ontarioHealthPremium).toBe(0));
  it('total payable = $0', () => expect(result.totalTaxPayable).toBe(0));
  it('balance = $0', ()      => expect(result.balanceOwing).toBe(0));
});
