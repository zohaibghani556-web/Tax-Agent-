import { describe, it, expect } from 'vitest';
import {
  calculateFederalDTCSupplement,
  calculateOntarioDTCSupplement,
  calculateDTC,
} from './disability';
import {
  FEDERAL_CREDITS,
  ONTARIO_CREDITS,
  FEDERAL_CREDIT_RATE,
  ONTARIO_CREDIT_RATE,
} from '../constants';

function roundCRA(n: number): number { return Math.round(n * 100) / 100; }

// ── calculateFederalDTCSupplement ────────────────────────────────────────────

describe('calculateFederalDTCSupplement', () => {
  it('zero child care → full supplement ($5,758)', () => {
    expect(calculateFederalDTCSupplement(0)).toBe(
      FEDERAL_CREDITS.disabilityAmount.supplementUnder18,
    );
  });

  it('child care below threshold ($2,000 < $3,302) → full supplement', () => {
    expect(calculateFederalDTCSupplement(2000)).toBe(
      FEDERAL_CREDITS.disabilityAmount.supplementUnder18,
    );
  });

  it('child care exactly at threshold ($3,302) → full supplement (no reduction yet)', () => {
    expect(calculateFederalDTCSupplement(3302)).toBe(
      FEDERAL_CREDITS.disabilityAmount.supplementUnder18,
    );
  });

  it('child care $1,000 above threshold → supplement reduced by $1,000', () => {
    // $4,302 claimed: excess = 4302 − 3302 = 1000; supplement = 5758 − 1000 = 4758
    expect(calculateFederalDTCSupplement(4302)).toBe(
      roundCRA(FEDERAL_CREDITS.disabilityAmount.supplementUnder18 - 1000),
    );
  });

  it('child care exhausts supplement → supplement is $0', () => {
    // Need threshold + supplement = 3302 + 5758 = 9060 to fully eliminate
    expect(calculateFederalDTCSupplement(9060)).toBe(0);
  });

  it('child care far above ceiling → floor at $0, never negative', () => {
    expect(calculateFederalDTCSupplement(50000)).toBe(0);
  });
});

// ── calculateOntarioDTCSupplement ────────────────────────────────────────────

describe('calculateOntarioDTCSupplement', () => {
  it('returns the Ontario child supplement amount ($5,416)', () => {
    expect(calculateOntarioDTCSupplement()).toBe(
      ONTARIO_CREDITS.disabilityAmount.supplementChild,
    );
  });
});

// ── calculateDTC — no DTC ────────────────────────────────────────────────────

describe('calculateDTC — hasDTC: false', () => {
  it('all amounts are zero and isTransferred is false', () => {
    const r = calculateDTC({
      hasDTC: false,
      ageOnDec31: 40,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    expect(r.federalBaseAmount).toBe(0);
    expect(r.federalSupplementAmount).toBe(0);
    expect(r.federalTotalCreditAmount).toBe(0);
    expect(r.federalCreditValue).toBe(0);
    expect(r.ontarioBaseAmount).toBe(0);
    expect(r.ontarioSupplementAmount).toBe(0);
    expect(r.ontarioTotalCreditAmount).toBe(0);
    expect(r.ontarioCreditValue).toBe(0);
    expect(r.isTransferred).toBe(false);
  });
});

// ── calculateDTC — adult claimant ────────────────────────────────────────────

describe('calculateDTC — adult (18+)', () => {
  it('federal: base amount only ($9,872), no supplement', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 38,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    expect(r.federalBaseAmount).toBe(FEDERAL_CREDITS.disabilityAmount.base);
    expect(r.federalSupplementAmount).toBe(0);
    expect(r.federalTotalCreditAmount).toBe(FEDERAL_CREDITS.disabilityAmount.base);
  });

  it('federal credit value = $9,872 × 15% = $1,480.80', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 55,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    expect(r.federalCreditValue).toBe(roundCRA(FEDERAL_CREDITS.disabilityAmount.base * FEDERAL_CREDIT_RATE));
  });

  it('Ontario: base amount only ($9,286), no supplement', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 45,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    expect(r.ontarioBaseAmount).toBe(ONTARIO_CREDITS.disabilityAmount.base);
    expect(r.ontarioSupplementAmount).toBe(0);
    expect(r.ontarioCreditValue).toBe(roundCRA(ONTARIO_CREDITS.disabilityAmount.base * ONTARIO_CREDIT_RATE));
  });

  it('age exactly 18 → no supplement (boundary check)', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 18,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    expect(r.federalSupplementAmount).toBe(0);
    expect(r.ontarioSupplementAmount).toBe(0);
  });
});

// ── calculateDTC — under-18 claimant ─────────────────────────────────────────

describe('calculateDTC — under 18', () => {
  it('child (10), no child care → base + full supplement both jurisdictions', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 10,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    expect(r.federalSupplementAmount).toBe(FEDERAL_CREDITS.disabilityAmount.supplementUnder18);
    expect(r.federalTotalCreditAmount).toBe(
      roundCRA(FEDERAL_CREDITS.disabilityAmount.base + FEDERAL_CREDITS.disabilityAmount.supplementUnder18),
    );
    expect(r.ontarioSupplementAmount).toBe(ONTARIO_CREDITS.disabilityAmount.supplementChild);
    expect(r.ontarioTotalCreditAmount).toBe(
      roundCRA(ONTARIO_CREDITS.disabilityAmount.base + ONTARIO_CREDITS.disabilityAmount.supplementChild),
    );
  });

  it('age exactly 17 → qualifies for supplement', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 17,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    expect(r.federalSupplementAmount).toBe(FEDERAL_CREDITS.disabilityAmount.supplementUnder18);
    expect(r.ontarioSupplementAmount).toBeGreaterThan(0);
  });

  it('child with child care $5,000 → federal supplement reduced, Ontario supplement unchanged', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 8,
      childCareAttendantCare: 5000,
      transferToSupporter: false,
    });
    // Federal: excess = 5000 − 3302 = 1698; supplement = 5758 − 1698 = 4060
    expect(r.federalSupplementAmount).toBe(roundCRA(5758 - (5000 - 3302)));
    // Ontario supplement is not clawed back
    expect(r.ontarioSupplementAmount).toBe(ONTARIO_CREDITS.disabilityAmount.supplementChild);
  });

  it('very large child care claim → federal supplement $0, Ontario supplement unaffected', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 6,
      childCareAttendantCare: 20000,
      transferToSupporter: false,
    });
    expect(r.federalSupplementAmount).toBe(0);
    expect(r.federalBaseAmount).toBe(FEDERAL_CREDITS.disabilityAmount.base);  // base not affected
    expect(r.ontarioSupplementAmount).toBe(ONTARIO_CREDITS.disabilityAmount.supplementChild);
  });
});

// ── calculateDTC — transfer to supporting person ──────────────────────────────

describe('calculateDTC — transfer', () => {
  it('transferToSupporter: true sets isTransferred flag', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 10,
      childCareAttendantCare: 0,
      transferToSupporter: true,
    });
    expect(r.isTransferred).toBe(true);
  });

  it('hasDTC: false with transferToSupporter: true → isTransferred is false (no credit to transfer)', () => {
    const r = calculateDTC({
      hasDTC: false,
      ageOnDec31: 10,
      childCareAttendantCare: 0,
      transferToSupporter: true,
    });
    expect(r.isTransferred).toBe(false);
  });

  it('transferred credit has same values as non-transferred — routing is caller responsibility', () => {
    const withTransfer = calculateDTC({
      hasDTC: true,
      ageOnDec31: 12,
      childCareAttendantCare: 0,
      transferToSupporter: true,
    });
    const noTransfer = calculateDTC({
      hasDTC: true,
      ageOnDec31: 12,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    expect(withTransfer.federalCreditValue).toBe(noTransfer.federalCreditValue);
    expect(withTransfer.ontarioCreditValue).toBe(noTransfer.ontarioCreditValue);
    expect(withTransfer.federalTotalCreditAmount).toBe(noTransfer.federalTotalCreditAmount);
  });
});

// ── calculateDTC — partial supplement (spot-check arithmetic) ────────────────

describe('calculateDTC — arithmetic spot-check', () => {
  it('adult combined federal + Ontario credit values', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 55,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    // Federal: 9872 × 14.5% = 1431.44 (FEDERAL_CREDIT_RATE is 14.5% for 2025)
    // Source: CRA T1 2025 (5006-r-25e.txt) | Verified: 2026-04-24
    expect(r.federalCreditValue).toBeCloseTo(1431.44, 2);
    // Ontario: 9286 × 5.05% = 468.94
    expect(r.ontarioCreditValue).toBeCloseTo(468.94, 2);
  });

  it('child under 18, no child care: federal credit value = (9872 + 5758) × 14.5%', () => {
    const r = calculateDTC({
      hasDTC: true,
      ageOnDec31: 10,
      childCareAttendantCare: 0,
      transferToSupporter: false,
    });
    // FEDERAL_CREDIT_RATE is 14.5% for 2025 (not 15%)
    expect(r.federalCreditValue).toBe(roundCRA((9872 + 5758) * 0.145));
  });
});
