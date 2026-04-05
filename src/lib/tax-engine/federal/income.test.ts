/**
 * Integration tests for income aggregation, capital gains, and dividend calculations.
 * Uses realistic multi-slip scenarios to validate CRA lines 15000, 23600, 26000.
 */

import { describe, it, expect } from 'vitest';
import { aggregateTotalIncome, calculateNetIncome, calculateTaxableIncome } from './income';
import { calculateCapitalGains } from './capital-gains';
import { calculateDividendIncome } from './dividends';
import type {
  TaxSlip,
  BusinessIncome,
  RentalIncome,
  DeductionsCreditsInput,
  T5008Slip,
  T3Slip,
} from '../types';

// ============================================================
// Helpers
// ============================================================

function emptyDeductions(): DeductionsCreditsInput {
  return {
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
}

// ============================================================
// aggregateTotalIncome
// ============================================================

describe('aggregateTotalIncome', () => {
  it('zero income — no slips', () => {
    expect(aggregateTotalIncome([], [], [])).toBe(0);
  });

  it('single T4 — employment income only', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T4',
        data: {
          issuerName: 'Acme Corp',
          box14: 75000, box16: 3537.30, box16A: 0, box17: 0,
          box18: 1053.48, box20: 0, box22: 15000, box24: 65700,
          box26: 71300, box40: 0, box42: 0, box44: 500,
          box45: '1', box46: 0, box52: 0, box85: 0,
        },
      },
    ];
    expect(aggregateTotalIncome(slips, [], [])).toBe(75000);
  });

  it('T4 + T5 interest + T5 dividends (eligible and non-eligible)', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T4',
        data: {
          issuerName: 'Corp A',
          box14: 60000, box16: 0, box16A: 0, box17: 0,
          box18: 0, box20: 0, box22: 12000, box24: 0,
          box26: 0, box40: 0, box42: 0, box44: 0,
          box45: '1', box46: 0, box52: 0, box85: 0,
        },
      },
      {
        type: 'T5',
        data: {
          issuerName: 'Big Bank',
          box11: 230,    // Non-eligible taxable (grossed up)
          box12: 200,    // Actual
          box13: 1500,   // Interest
          box14: 0,
          box18: 0,
          box24: 1000,   // Actual eligible dividends
          box25: 1380,   // Taxable eligible dividends (grossed up 38%)
          box26: 207,    // DTC
        },
      },
    ];

    // Expected: 60000 + 1500 + 1380 + 230 = 63110
    expect(aggregateTotalIncome(slips, [], [])).toBe(63110);
  });

  it('T5008 capital gains — net gain at 50% inclusion', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T5008',
        data: {
          issuerName: 'TD Waterhouse',
          box15: '3',
          box16: 'XYZ Corp',
          box20: 10000,  // ACB
          box21: 15000,  // Proceeds
          box22: 100,
        },
      },
    ];
    // Gain = 5000, taxable = 2500
    expect(aggregateTotalIncome(slips, [], [])).toBe(2500);
  });

  it('T5008 capital loss — no taxable gain', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T5008',
        data: {
          issuerName: 'TD Waterhouse',
          box15: '3',
          box16: 'XYZ Corp',
          box20: 20000,
          box21: 12000,
          box22: 200,
        },
      },
    ];
    // Loss = 8000; net gain floors at 0
    expect(aggregateTotalIncome(slips, [], [])).toBe(0);
  });

  it('T5008 mixed gain and loss — net gain at 50% inclusion', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T5008',
        data: { issuerName: 'A', box15: '3', box16: 'Stock A', box20: 5000, box21: 8000, box22: 50 },
      },
      {
        type: 'T5008',
        data: { issuerName: 'B', box15: '3', box16: 'Stock B', box20: 4000, box21: 2000, box22: 30 },
      },
    ];
    // Gain 3000, Loss 2000, Net 1000, Taxable 500
    expect(aggregateTotalIncome(slips, [], [])).toBe(500);
  });

  it('T3 slip — interest, eligible dividends, non-eligible dividends, other, capital gains', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T3',
        data: {
          issuerName: 'Mutual Fund A',
          box21: 800,   // Capital gains
          box22: 200,   // Actual eligible dividends
          box23: 276,   // Taxable eligible dividends
          box26: 150,   // Other income
          box32: 115,   // Taxable non-eligible dividends
          box49: 500,   // Interest
          box50: 0,
        },
      },
    ];
    // interest 500 + eligible div 276 + non-eligible 115 + other 150 + cap gain T3 800×50% = 400
    // Total: 500 + 276 + 115 + 150 + 400 = 1441
    expect(aggregateTotalIncome(slips, [], [])).toBe(1441);
  });

  it('T4A — pension, other income, scholarships', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T4A',
        data: {
          issuerName: 'Pension Corp',
          box016: 24000,
          box018: 0,
          box020: 0,
          box022: 4800,
          box024: 0,
          box028: 1500,
          box105: 3000,
          box135: 0,
        },
      },
    ];
    // 24000 + 1500 + 3000 = 28500
    expect(aggregateTotalIncome(slips, [], [])).toBe(28500);
  });

  it('T4E — EI benefits', () => {
    const slips: TaxSlip[] = [
      { type: 'T4E', data: { box14: 8500, box22: 850 } },
    ];
    expect(aggregateTotalIncome(slips, [], [])).toBe(8500);
  });

  it('T5007 — social assistance included in income', () => {
    const slips: TaxSlip[] = [
      { type: 'T5007', data: { box10: 7200 } },
    ];
    expect(aggregateTotalIncome(slips, [], [])).toBe(7200);
  });

  it('business income — net self-employment income', () => {
    const business: BusinessIncome[] = [
      {
        businessName: 'Freelance Dev',
        businessType: 'professional',
        industryCode: '541514',
        grossIncome: 90000,
        expenses: {
          advertising: 0, meals: 0, insurance: 0, interest: 0,
          officeExpenses: 2000, supplies: 500, legalAccounting: 1500,
          travel: 0, telephone: 600, utilities: 0, rent: 0,
          propertyTaxes: 0, salariesWages: 0, capitalCostAllowance: 0,
          otherExpenses: 0,
        },
        netIncome: 85400,
      },
    ];
    expect(aggregateTotalIncome([], business, [])).toBe(85400);
  });

  it('rental income — net', () => {
    const rental: RentalIncome[] = [
      {
        propertyAddress: '123 Main St',
        ownershipPercentage: 100,
        grossRent: 24000,
        expenses: {
          advertising: 0, insurance: 1200, interest: 8000,
          maintenance: 2000, managementFees: 0, officeExpenses: 0,
          legalAccounting: 0, propertyTaxes: 3000, utilities: 0,
          capitalCostAllowance: 0, other: 0,
        },
        netIncome: 9800,
      },
    ];
    expect(aggregateTotalIncome([], [], rental)).toBe(9800);
  });

  it('full realistic scenario — T4 + T5 + T5008 + T3 + business', () => {
    const slips: TaxSlip[] = [
      {
        type: 'T4',
        data: {
          issuerName: 'Corp A',
          box14: 80000, box16: 3800, box16A: 0, box17: 0,
          box18: 1077.48, box20: 0, box22: 16000, box24: 65700,
          box26: 71300, box40: 0, box42: 0, box44: 600,
          box45: '1', box46: 0, box52: 0, box85: 0,
        },
      },
      {
        type: 'T5',
        data: {
          issuerName: 'Big Bank',
          box11: 345,
          box12: 300,
          box13: 2500,
          box14: 0,
          box18: 0,
          box24: 1000,
          box25: 1380,
          box26: 207,
        },
      },
      {
        type: 'T5008',
        data: { issuerName: 'Broker', box15: '3', box16: 'ETF', box20: 12000, box21: 18000, box22: 200 },
      },
      {
        type: 'T3',
        data: {
          issuerName: 'Fund B',
          box21: 0, box22: 0, box23: 0, box26: 200, box32: 0, box49: 300, box50: 0,
        },
      },
    ];
    const business: BusinessIncome[] = [
      {
        businessName: 'Consulting Inc',
        businessType: 'professional',
        industryCode: '541',
        grossIncome: 30000,
        expenses: {
          advertising: 0, meals: 0, insurance: 0, interest: 0,
          officeExpenses: 0, supplies: 0, legalAccounting: 0,
          travel: 0, telephone: 0, utilities: 0, rent: 0,
          propertyTaxes: 0, salariesWages: 0, capitalCostAllowance: 0,
          otherExpenses: 5000,
        },
        netIncome: 25000,
      },
    ];

    // employment: 80000
    // interest: 2500 + 300 = 2800
    // eligible div: 1380
    // non-eligible div: 345
    // cap gain: (18000-12000)×50% = 3000
    // T3 other: 200
    // business: 25000
    // Total: 80000 + 2800 + 1380 + 345 + 3000 + 200 + 25000 = 112725
    expect(aggregateTotalIncome(slips, business, [])).toBe(112725);
  });
});

// ============================================================
// calculateNetIncome
// ============================================================

describe('calculateNetIncome', () => {
  it('no deductions — net equals total', () => {
    expect(calculateNetIncome(70000, emptyDeductions())).toBe(70000);
  });

  it('RRSP deduction capped at room', () => {
    const d = { ...emptyDeductions(), rrspContributions: 15000, rrspContributionRoom: 10000 };
    expect(calculateNetIncome(70000, d)).toBe(60000);
  });

  it('RRSP deduction capped at annual max (32490)', () => {
    const d = {
      ...emptyDeductions(),
      rrspContributions: 50000,
      rrspContributionRoom: 50000,
    };
    // capped at RRSP.maxContribution = 32490
    expect(calculateNetIncome(100000, d)).toBe(67510);
  });

  it('union dues + childcare + carrying charges', () => {
    const d = {
      ...emptyDeductions(),
      unionDues: 600,
      childcareExpenses: 8000,
      carryingCharges: 300,
    };
    expect(calculateNetIncome(60000, d)).toBe(51100);
  });

  it('net income cannot go below zero', () => {
    const d = {
      ...emptyDeductions(),
      rrspContributions: 200000,
      rrspContributionRoom: 200000,
      unionDues: 5000,
    };
    expect(calculateNetIncome(10000, d)).toBe(0);
  });

  it('moving expenses', () => {
    const d = { ...emptyDeductions(), movingExpenses: 3500 };
    expect(calculateNetIncome(55000, d)).toBe(51500);
  });

  it('support payments', () => {
    const d = { ...emptyDeductions(), supportPaymentsMade: 12000 };
    expect(calculateNetIncome(75000, d)).toBe(63000);
  });
});

// ============================================================
// calculateTaxableIncome
// ============================================================

describe('calculateTaxableIncome', () => {
  it('no deductions — taxable equals net', () => {
    expect(calculateTaxableIncome(65000, emptyDeductions())).toBe(65000);
  });

  it('capital loss carryforward reduces taxable income', () => {
    const d = { ...emptyDeductions(), capitalLossCarryforward: 5000 };
    expect(calculateTaxableIncome(65000, d)).toBe(60000);
  });

  it('taxable income cannot go below zero', () => {
    const d = { ...emptyDeductions(), capitalLossCarryforward: 200000 };
    expect(calculateTaxableIncome(50000, d)).toBe(0);
  });

  it('zero net income returns zero', () => {
    expect(calculateTaxableIncome(0, emptyDeductions())).toBe(0);
  });
});

// ============================================================
// calculateCapitalGains
// ============================================================

describe('calculateCapitalGains', () => {
  it('no slips — all zeros', () => {
    const result = calculateCapitalGains([], []);
    expect(result).toEqual({ totalGain: 0, totalLoss: 0, netGain: 0, taxableGain: 0 });
  });

  it('single T5008 gain', () => {
    const t5008: T5008Slip[] = [
      { issuerName: 'Broker', box15: '3', box16: 'Stock', box20: 5000, box21: 9000, box22: 100 },
    ];
    const result = calculateCapitalGains(t5008, []);
    expect(result.totalGain).toBe(4000);
    expect(result.totalLoss).toBe(0);
    expect(result.netGain).toBe(4000);
    expect(result.taxableGain).toBe(2000);
  });

  it('single T5008 loss — taxable gain is zero', () => {
    const t5008: T5008Slip[] = [
      { issuerName: 'Broker', box15: '3', box16: 'Stock', box20: 10000, box21: 7000, box22: 100 },
    ];
    const result = calculateCapitalGains(t5008, []);
    expect(result.totalLoss).toBe(3000);
    expect(result.netGain).toBe(0);
    expect(result.taxableGain).toBe(0);
  });

  it('T3 capital gains add to total gain', () => {
    const t3: T3Slip[] = [
      { issuerName: 'Fund', box21: 2000, box22: 0, box23: 0, box26: 0, box32: 0, box49: 0, box50: 0 },
    ];
    const result = calculateCapitalGains([], t3);
    expect(result.totalGain).toBe(2000);
    expect(result.taxableGain).toBe(1000);
  });

  it('T5008 gain partially offset by T5008 loss, T3 adds more gain', () => {
    const t5008: T5008Slip[] = [
      { issuerName: 'A', box15: '3', box16: 'Gain stock', box20: 8000, box21: 13000, box22: 50 },
      { issuerName: 'B', box15: '3', box16: 'Loss stock', box20: 6000, box21: 3000, box22: 30 },
    ];
    const t3: T3Slip[] = [
      { issuerName: 'Fund', box21: 1200, box22: 0, box23: 0, box26: 0, box32: 0, box49: 0, box50: 0 },
    ];
    const result = calculateCapitalGains(t5008, t3);
    // T5008 gains: 5000, T5008 losses: 3000, T3 gains: 1200
    // totalGain = 5000 + 1200 = 6200, totalLoss = 3000, netGain = 3200, taxable = 1600
    expect(result.totalGain).toBe(6200);
    expect(result.totalLoss).toBe(3000);
    expect(result.netGain).toBe(3200);
    expect(result.taxableGain).toBe(1600);
  });

  it('rounding — fractional proceeds/ACB', () => {
    const t5008: T5008Slip[] = [
      { issuerName: 'X', box15: '3', box16: 'ETF', box20: 1333.33, box21: 2000.00, box22: 10 },
    ];
    const result = calculateCapitalGains(t5008, []);
    // gain = 666.67, taxable = 333.34 (Math.round(666.67 * 0.5 * 100)/100)
    expect(result.totalGain).toBe(666.67);
    expect(result.taxableGain).toBe(333.34);
  });
});

// ============================================================
// calculateDividendIncome
// ============================================================

describe('calculateDividendIncome', () => {
  it('no slips — all zeros', () => {
    const result = calculateDividendIncome([], []);
    expect(result.eligibleTaxable).toBe(0);
    expect(result.nonEligibleTaxable).toBe(0);
    expect(result.federalDTC).toBe(0);
    expect(result.ontarioDTC).toBe(0);
  });

  it('single T5 — eligible dividends only', () => {
    // Actual eligible: $1000 × 1.38 = $1380 taxable
    const result = calculateDividendIncome(
      [{ issuerName: 'Bank', box11: 0, box12: 0, box13: 0, box14: 0, box18: 0, box24: 1000, box25: 1380, box26: 207 }],
      []
    );
    expect(result.eligibleTaxable).toBe(1380);
    expect(result.nonEligibleTaxable).toBe(0);
    // Federal DTC: 1380 × 0.150187 = 207.26 (rounded)
    expect(result.federalDTC).toBe(207.26);
    // Ontario DTC: 1380 × 0.10 = 138
    expect(result.ontarioDTC).toBe(138);
  });

  it('single T5 — non-eligible dividends only', () => {
    // Actual non-eligible: $200 × 1.15 = $230 taxable
    const result = calculateDividendIncome(
      [{ issuerName: 'Credit Union', box11: 230, box12: 200, box13: 0, box14: 0, box18: 0, box24: 0, box25: 0, box26: 0 }],
      []
    );
    expect(result.nonEligibleTaxable).toBe(230);
    // Federal DTC: 230 × 0.090301 = 20.77
    expect(result.federalNonEligibleDTC).toBe(20.77);
    // Ontario DTC: 230 × 0.028571 = 6.57
    expect(result.ontarioNonEligibleDTC).toBe(6.57);
  });

  it('T5 with both eligible and non-eligible dividends', () => {
    const result = calculateDividendIncome(
      [{
        issuerName: 'Mixed',
        box11: 460,    // Non-eligible taxable
        box12: 400,    // Actual non-eligible
        box13: 0,
        box14: 0,
        box18: 0,
        box24: 2000,   // Actual eligible
        box25: 2760,   // Taxable eligible (2000 × 1.38)
        box26: 414,
      }],
      []
    );
    expect(result.eligibleTaxable).toBe(2760);
    expect(result.nonEligibleTaxable).toBe(460);
    // Federal DTC eligible: 2760 × 0.150187 ≈ 414.52
    expect(result.federalDTC).toBe(414.52);
    // Federal DTC non-eligible: 460 × 0.090301 ≈ 41.54
    expect(result.federalNonEligibleDTC).toBe(41.54);
    // Ontario DTC eligible: 2760 × 0.10 = 276
    expect(result.ontarioDTC).toBe(276);
    // Ontario DTC non-eligible: 460 × 0.028571 ≈ 13.14
    expect(result.ontarioNonEligibleDTC).toBe(13.14);
  });

  it('T3 eligible and non-eligible dividends', () => {
    const result = calculateDividendIncome(
      [],
      [{
        issuerName: 'Mutual Fund',
        box21: 0,
        box22: 500,   // Actual eligible
        box23: 690,   // Taxable eligible (500 × 1.38)
        box26: 0,
        box32: 115,   // Taxable non-eligible (100 × 1.15)
        box49: 0,
        box50: 0,
      }]
    );
    expect(result.eligibleTaxable).toBe(690);
    expect(result.nonEligibleTaxable).toBe(115);
    // Federal DTC eligible: 690 × 0.150187 ≈ 103.63
    expect(result.federalDTC).toBe(103.63);
    // Ontario DTC eligible: 690 × 0.10 = 69
    expect(result.ontarioDTC).toBe(69);
  });

  it('multiple T5 slips — aggregation', () => {
    const result = calculateDividendIncome(
      [
        { issuerName: 'Bank A', box11: 0, box12: 0, box13: 0, box14: 0, box18: 0, box24: 500, box25: 690, box26: 103.63 },
        { issuerName: 'Bank B', box11: 0, box12: 0, box13: 0, box14: 0, box18: 0, box24: 500, box25: 690, box26: 103.63 },
      ],
      []
    );
    expect(result.eligibleTaxable).toBe(1380);
    // Federal DTC: 1380 × 0.150187 = 207.26
    expect(result.federalDTC).toBe(207.26);
    expect(result.ontarioDTC).toBe(138);
  });

  it('T5 + T3 combined', () => {
    const result = calculateDividendIncome(
      [{ issuerName: 'Bank', box11: 115, box12: 100, box13: 0, box14: 0, box18: 0, box24: 1000, box25: 1380, box26: 207 }],
      [{ issuerName: 'Fund', box21: 0, box22: 200, box23: 276, box26: 0, box32: 57.50, box49: 0, box50: 0 }]
    );
    expect(result.eligibleTaxable).toBe(1656);       // 1380 + 276
    expect(result.nonEligibleTaxable).toBe(172.50);  // 115 + 57.50
  });
});
