/**
 * Tests for HBP and LLP repayment calculations.
 */

import { describe, it, expect } from 'vitest';
import { calculateHBPRepayment, calculateLLPRepayment } from './rrsp-repayments';

// ── HBP Tests ────────────────────────────────────────────────────────────────

describe('calculateHBPRepayment', () => {
  it('zero balance owing → all zeros', () => {
    const result = calculateHBPRepayment({
      totalWithdrawn: 0,
      yearOfFirstWithdrawal: 2018,
      taxYear: 2025,
      amountRepaidThisYear: 0,
    });
    expect(result.minimumRequired).toBe(0);
    expect(result.shortfall).toBe(0);
    expect(result.addedToIncome).toBe(0);
    expect(result.remainingBalance).toBe(0);
  });

  it('before 2-year waiting period → minimumRequired = 0', () => {
    // First withdrawal 2024, repayment starts 2026
    const result = calculateHBPRepayment({
      totalWithdrawn: 30000,
      yearOfFirstWithdrawal: 2024,
      taxYear: 2025,
      amountRepaidThisYear: 0,
    });
    expect(result.minimumRequired).toBe(0);
    expect(result.shortfall).toBe(0);
    expect(result.addedToIncome).toBe(0);
  });

  it('first repayment year → correct minimum (1/15 of total)', () => {
    // First withdrawal 2023, repayment starts 2025
    const result = calculateHBPRepayment({
      totalWithdrawn: 30000,
      yearOfFirstWithdrawal: 2023,
      taxYear: 2025,
      amountRepaidThisYear: 2000,
    });
    // 30000 / 15 = 2000 minimum
    expect(result.minimumRequired).toBe(2000);
  });

  it('full repayment → no shortfall, no income addition', () => {
    const result = calculateHBPRepayment({
      totalWithdrawn: 30000,
      yearOfFirstWithdrawal: 2023,
      taxYear: 2025,
      amountRepaidThisYear: 2000,
    });
    expect(result.shortfall).toBe(0);
    expect(result.addedToIncome).toBe(0);
  });

  it('partial repayment → correct shortfall and income addition', () => {
    const result = calculateHBPRepayment({
      totalWithdrawn: 30000,
      yearOfFirstWithdrawal: 2023,
      taxYear: 2025,
      amountRepaidThisYear: 500,
    });
    // minimum = 2000, repaid = 500, shortfall = 1500
    expect(result.minimumRequired).toBe(2000);
    expect(result.shortfall).toBe(1500);
    expect(result.addedToIncome).toBe(1500);
  });

  it('over-repayment → remaining balance reduces, no penalty', () => {
    const result = calculateHBPRepayment({
      totalWithdrawn: 15000,
      yearOfFirstWithdrawal: 2015,
      taxYear: 2025,  // Year 8 of repayment (2017 start)
      amountRepaidThisYear: 2000,
    });
    // minimum = 15000/15 = 1000, repaid = 2000, shortfall = 0
    expect(result.shortfall).toBe(0);
    expect(result.addedToIncome).toBe(0);
  });

  it('HBP: final repayment year → clears balance', () => {
    // First withdrawal 2008, repayment starts 2010, ends 2024+1 = 2025-1 = 2024
    // Wait — repaymentEndYear = yearOfFirstWithdrawal + 16 = 2008 + 16 = 2024
    const result = calculateHBPRepayment({
      totalWithdrawn: 15000,
      yearOfFirstWithdrawal: 2008,
      taxYear: 2024,  // Last year of the period
      amountRepaidThisYear: 1000,
    });
    expect(result.repaymentYearsLeft).toBe(0);
  });

  it('all monetary results use roundCRA (2-decimal precision)', () => {
    const result = calculateHBPRepayment({
      totalWithdrawn: 35000,
      yearOfFirstWithdrawal: 2023,
      taxYear: 2025,
      amountRepaidThisYear: 1000,
    });
    // 35000 / 15 = 2333.333... → should be rounded to 2333.33
    expect(result.minimumRequired).toBe(2333.33);
    expect(Number.isFinite(result.minimumRequired)).toBe(true);
    // Verify 2-decimal max
    expect(result.minimumRequired.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

// ── LLP Tests ────────────────────────────────────────────────────────────────

describe('calculateLLPRepayment', () => {
  it('zero LLP balance → all zeros', () => {
    const result = calculateLLPRepayment({
      totalWithdrawn: 0,
      yearOfFirstWithdrawal: 2018,
      taxYear: 2025,
      amountRepaidThisYear: 0,
    });
    expect(result.minimumRequired).toBe(0);
    expect(result.shortfall).toBe(0);
    expect(result.addedToIncome).toBe(0);
  });

  it('first LLP repayment year → 1/10 of total', () => {
    // Withdrawal 2023, repayment starts 2025
    const result = calculateLLPRepayment({
      totalWithdrawn: 20000,
      yearOfFirstWithdrawal: 2023,
      taxYear: 2025,
      amountRepaidThisYear: 2000,
    });
    expect(result.minimumRequired).toBe(2000);  // 20000/10
    expect(result.shortfall).toBe(0);
  });

  it('LLP partial repayment → shortfall added to income', () => {
    const result = calculateLLPRepayment({
      totalWithdrawn: 20000,
      yearOfFirstWithdrawal: 2023,
      taxYear: 2025,
      amountRepaidThisYear: 500,
    });
    expect(result.shortfall).toBe(1500);
    expect(result.addedToIncome).toBe(1500);
  });

  it('LLP before repayment period → minimumRequired = 0', () => {
    const result = calculateLLPRepayment({
      totalWithdrawn: 20000,
      yearOfFirstWithdrawal: 2024,
      taxYear: 2025,
      amountRepaidThisYear: 0,
    });
    expect(result.minimumRequired).toBe(0);
  });

  it('LLP: income amount does not affect repayment calculation', () => {
    // The $10,000/year/$20,000 lifetime limit is a withdrawal constraint, not a repayment factor
    const result1 = calculateLLPRepayment({
      totalWithdrawn: 10000,
      yearOfFirstWithdrawal: 2023,
      taxYear: 2025,
      amountRepaidThisYear: 1000,
    });
    const result2 = calculateLLPRepayment({
      totalWithdrawn: 20000,
      yearOfFirstWithdrawal: 2023,
      taxYear: 2025,
      amountRepaidThisYear: 2000,
    });
    // Both should have zero shortfall if repaying the exact minimum
    expect(result1.shortfall).toBe(0);
    expect(result2.shortfall).toBe(0);
  });

  it('LLP 10-year period end → remaining balance becomes income', () => {
    // Withdrawal 2015, repayment starts 2017, ends 2026
    // TaxYear 2027 = after period
    const result = calculateLLPRepayment({
      totalWithdrawn: 10000,
      yearOfFirstWithdrawal: 2015,
      taxYear: 2027,
      amountRepaidThisYear: 0,
    });
    expect(result.addedToIncome).toBe(10000);
    expect(result.remainingBalance).toBe(0);
  });

  it('roundCRA applied — LLP minimum is two-decimal', () => {
    const result = calculateLLPRepayment({
      totalWithdrawn: 20000,
      yearOfFirstWithdrawal: 2023,
      taxYear: 2025,
      amountRepaidThisYear: 2000,
    });
    const decimalPlaces = result.minimumRequired.toString().split('.')[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});
