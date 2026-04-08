import { describe, it, expect } from 'vitest';
import {
  calculateBPA,
  calculateAgeCredit,
  calculateCPPCredit,
  calculateEICredit,
  calculateCanadaEmploymentCredit,
  calculatePensionIncomeCredit,
  calculateMedicalExpenseCredit,
  calculateDonationCredit,
  calculateTuitionCredit,
  calculateStudentLoanInterestCredit,
  calculateDisabilityCredit,
  calculateTotalFederalCredits,
} from './credits';

// ============================================================
// Basic Personal Amount
// ============================================================

describe('calculateBPA', () => {
  it('returns full $16,129 when income is below clawback range', () => {
    expect(calculateBPA(50_000)).toBe(16_129);
  });

  it('returns base $14,538 when income is at or above $253,414', () => {
    expect(calculateBPA(300_000)).toBe(14_538);
    expect(calculateBPA(253_414)).toBe(14_538);
  });

  it('pro-rates the additional amount at $200,000 (within clawback range)', () => {
    const bpa = calculateBPA(200_000);
    expect(bpa).toBeGreaterThan(14_538);
    expect(bpa).toBeLessThan(16_129);
    // excess = 22118, range = 75532 → 22118*1591/75532 = 465.89 → BPA = 16129 - 465.89 = 15663.11
    expect(bpa).toBe(15_663.11);
  });

  it('returns full amount at the exact clawback start threshold ($177,882)', () => {
    expect(calculateBPA(177_882)).toBe(16_129);
  });

  it('returns zero income scenario — full BPA', () => {
    expect(calculateBPA(0)).toBe(16_129);
  });
});

// ============================================================
// Age Credit — 2025 max is $8,790 (source: CRA T4032)
// ============================================================

describe('calculateAgeCredit', () => {
  it('returns full $8,790 for someone born 1955-06-15 with $30,000 income', () => {
    // Age 70 on Dec 31, 2025; income below clawback start of $44,325
    expect(calculateAgeCredit(30_000, '1955-06-15')).toBe(8_790);
  });

  it('reduces the age credit for $80,000 income (born 1955-06-15)', () => {
    // reduction = roundCRA((80000 - 44325) * 0.15) = roundCRA(5351.25) = 5351.25
    // credit = 8790 - 5351.25 = 3438.75
    expect(calculateAgeCredit(80_000, '1955-06-15')).toBe(3_438.75);
  });

  it('returns 0 for someone born in 1990 (under 65 in 2025)', () => {
    expect(calculateAgeCredit(30_000, '1990-01-01')).toBe(0);
  });

  it('returns 0 when reduction exceeds the max amount (very high income)', () => {
    // 8790 / 0.15 + 44325 = 103,325 income eliminates the credit
    expect(calculateAgeCredit(120_000, '1955-06-15')).toBe(0);
  });

  it('qualifies someone who turns exactly 65 on Dec 31, 2025', () => {
    expect(calculateAgeCredit(0, '1960-12-31')).toBe(8_790);
  });

  it('does not qualify someone turning 64 on Dec 31, 2025 (born 1961-12-31)', () => {
    expect(calculateAgeCredit(30_000, '1961-12-31')).toBe(0);
  });
});

// ============================================================
// CPP / EI credits (pass-through amounts)
// ============================================================

describe('calculateCPPCredit', () => {
  it('returns the contribution amount unchanged', () => {
    expect(calculateCPPCredit(3_354)).toBe(3_354);
    expect(calculateCPPCredit(0)).toBe(0);
    expect(calculateCPPCredit(4_034.10)).toBe(4_034.10);
  });
});

describe('calculateEICredit', () => {
  it('returns the premium amount unchanged', () => {
    expect(calculateEICredit(1_077)).toBe(1_077);
    expect(calculateEICredit(0)).toBe(0);
  });
});

// ============================================================
// Canada Employment Credit — 2025 amount is $1,433
// ============================================================

describe('calculateCanadaEmploymentCredit', () => {
  it('returns $1,433 when employed', () => {
    expect(calculateCanadaEmploymentCredit(true)).toBe(1_433);
  });

  it('returns 0 when not employed', () => {
    expect(calculateCanadaEmploymentCredit(false)).toBe(0);
  });
});

// ============================================================
// Pension Income Credit
// ============================================================

describe('calculatePensionIncomeCredit', () => {
  it('returns the lesser of pension income or $2,000', () => {
    expect(calculatePensionIncomeCredit(1_500)).toBe(1_500);
    expect(calculatePensionIncomeCredit(2_000)).toBe(2_000);
    expect(calculatePensionIncomeCredit(5_000)).toBe(2_000);
  });

  it('returns 0 for zero pension income', () => {
    expect(calculatePensionIncomeCredit(0)).toBe(0);
  });
});

// ============================================================
// Medical Expense Credit — 2025 threshold is $2,635
// ============================================================

describe('calculateMedicalExpenseCredit', () => {
  it('eligible = $5,000 - min($2,635, 3% of $60,000) = $5,000 - $1,800 = $3,200', () => {
    // 3% of 60000 = 1800 < 2635, so threshold = 1800
    expect(calculateMedicalExpenseCredit(5_000, 60_000)).toBe(3_200);
  });

  it('uses the $2,635 flat threshold when 3% of income exceeds it', () => {
    // 3% of 120000 = 3600 > 2635, so threshold = 2635
    expect(calculateMedicalExpenseCredit(5_000, 120_000)).toBe(2_365);
  });

  it('returns 0 when expenses do not exceed the threshold', () => {
    // 3% of 65000 = 1950; 800 < 1950 → eligible = 0
    expect(calculateMedicalExpenseCredit(800, 65_000)).toBe(0);
  });

  it('returns 0 for zero medical expenses', () => {
    expect(calculateMedicalExpenseCredit(0, 50_000)).toBe(0);
  });
});

// ============================================================
// Donation Credit (tiered — returns actual credit value)
// ============================================================

describe('calculateDonationCredit', () => {
  it('$1,000 donation on $80,000 income → (200 × 15%) + (800 × 29%) = $262', () => {
    expect(calculateDonationCredit(1_000, 80_000)).toBe(262);
  });

  it('$1,000 donation on $300,000 income → (200 × 15%) + (800 × 33%) = $294', () => {
    expect(calculateDonationCredit(1_000, 300_000)).toBe(294);
  });

  it('donation ≤ $200 uses only the 15% tier', () => {
    expect(calculateDonationCredit(150, 50_000)).toBe(22.5);
  });

  it('returns 0 for zero donations', () => {
    expect(calculateDonationCredit(0, 80_000)).toBe(0);
  });

  it('applies 33% on $200+ amount exactly at the top-bracket threshold', () => {
    expect(calculateDonationCredit(1_000, 253_415)).toBe(294);
  });
});

// ============================================================
// Tuition Credit
// ============================================================

describe('calculateTuitionCredit', () => {
  it('returns current year + carryforward', () => {
    expect(calculateTuitionCredit(3_000, 1_500)).toBe(4_500);
  });

  it('returns current year amount when no carryforward', () => {
    expect(calculateTuitionCredit(6_000, 0)).toBe(6_000);
  });

  it('returns carryforward only when no current year tuition', () => {
    expect(calculateTuitionCredit(0, 2_000)).toBe(2_000);
  });
});

// ============================================================
// Student Loan Interest
// ============================================================

describe('calculateStudentLoanInterestCredit', () => {
  it('returns interest paid unchanged', () => {
    expect(calculateStudentLoanInterestCredit(450)).toBe(450);
    expect(calculateStudentLoanInterestCredit(0)).toBe(0);
  });
});

// ============================================================
// Disability Tax Credit
// ============================================================

describe('calculateDisabilityCredit', () => {
  it('returns $9,872 for eligible individual', () => {
    expect(calculateDisabilityCredit(true)).toBe(9_872);
  });

  it('returns 0 when not eligible', () => {
    expect(calculateDisabilityCredit(false)).toBe(0);
  });
});

// ============================================================
// Integration: calculateTotalFederalCredits
// ============================================================

describe('calculateTotalFederalCredits', () => {
  it('computes correct totals for an employed person at $65,000 income', () => {
    // Profile: employed, born 1985-03-15 (age 40 — no age credit)
    // CPP $3,354 | EI $1,077 | medical $800 | donations $500 | no tuition/disability
    const result = calculateTotalFederalCredits({
      netIncome: 65_000,
      taxableIncome: 65_000,
      dateOfBirth: '1985-03-15',
      hasEmploymentIncome: true,
      cppContributions: 3_354,
      eiPremiums: 1_077,
      eligiblePensionIncome: 0,
      totalMedicalExpenses: 800,
      totalDonations: 500,
      tuitionAmount: 0,
      tuitionCarryforward: 0,
      studentLoanInterest: 0,
      hasDisability: false,
    });

    // BPA: 16129 (income 65000 < 177882)
    expect(result.creditAmounts.bpa).toBe(16_129);

    // Age: 0 (born 1985)
    expect(result.creditAmounts.ageAmount).toBe(0);

    // CPP / EI pass-through
    expect(result.creditAmounts.cppAmount).toBe(3_354);
    expect(result.creditAmounts.eiAmount).toBe(1_077);

    // Employment credit — 2025 amount is $1,433
    expect(result.creditAmounts.employmentAmount).toBe(1_433);

    // Medical: threshold = min(2635, 65000×0.03=1950) = 1950; 800 < 1950 → 0
    expect(result.creditAmounts.medicalAmount).toBe(0);

    // totalCreditAmount = 16129 + 0 + 3354 + 1077 + 1433 + 0 + 0 + 0 + 0 + 0 = 21993
    expect(result.totalCreditAmount).toBe(21_993);

    // Donation credit: (200×0.15) + (300×0.29) = 30 + 87 = 117
    expect(result.donationCreditValue).toBe(117);

    // totalCreditValue = 21993 × 0.15 + 117 = 3298.95 + 117 = 3415.95
    expect(result.totalCreditValue).toBe(3_415.95);
  });

  it('includes age credit and disability for a senior with disability', () => {
    // Born 1955-01-01 (70 in 2025), income $40,000 (below age clawback start $44,325)
    const result = calculateTotalFederalCredits({
      netIncome: 40_000,
      taxableIncome: 40_000,
      dateOfBirth: '1955-01-01',
      hasEmploymentIncome: false,
      cppContributions: 0,
      eiPremiums: 0,
      eligiblePensionIncome: 1_200,
      totalMedicalExpenses: 3_000,
      totalDonations: 0,
      tuitionAmount: 0,
      tuitionCarryforward: 0,
      studentLoanInterest: 0,
      hasDisability: true,
    });

    // Age credit: 8790 (income 40000 < 44325)
    expect(result.creditAmounts.ageAmount).toBe(8_790);

    // Pension: min(1200, 2000) = 1200
    expect(result.creditAmounts.pensionAmount).toBe(1_200);

    // Medical: threshold = min(2635, 40000×0.03=1200) = 1200; 3000 - 1200 = 1800
    expect(result.creditAmounts.medicalAmount).toBe(1_800);

    // Disability: 9872
    expect(result.creditAmounts.disabilityAmount).toBe(9_872);

    // No donation credit
    expect(result.donationCreditValue).toBe(0);
  });

  it('correctly handles BPA clawback in the aggregate for high-income filer', () => {
    const result = calculateTotalFederalCredits({
      netIncome: 300_000,
      taxableIncome: 300_000,
      dateOfBirth: '1980-06-01',
      hasEmploymentIncome: true,
      cppContributions: 4_034.10,
      eiPremiums: 1_077.48,
      eligiblePensionIncome: 0,
      totalMedicalExpenses: 0,
      totalDonations: 10_000,
      tuitionAmount: 0,
      tuitionCarryforward: 0,
      studentLoanInterest: 0,
      hasDisability: false,
    });

    // BPA: base $14,538 (income >= 253,414)
    expect(result.creditAmounts.bpa).toBe(14_538);

    // Donation: (200×0.15) + (9800×0.33) = 30 + 3234 = 3264
    expect(result.donationCreditValue).toBe(3_264);
  });
});
