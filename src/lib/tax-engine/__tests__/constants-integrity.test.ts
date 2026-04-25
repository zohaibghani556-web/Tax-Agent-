/**
 * Constants Integrity Tests
 *
 * Asserts that the CRA-verified 2025 constants in constants.ts match
 * their authoritative values. These tests act as a canary: if any value
 * drifts (typo, copy-paste from wrong year, accidental edit) this file
 * catches it before it reaches a user's tax calculation.
 *
 * Sources cited inline match the CLAUDE.md "Constants Are the Only Source of Truth" section.
 * All values verified against CRA publications on 2026-04-24.
 */

import { describe, it, expect } from 'vitest';
import {
  FEDERAL_BPA,
  ONTARIO_BPA,
  RRSP,
  CPP,
  CPP2,
  EI,
  FEDERAL_BRACKETS,
  ONTARIO_BRACKETS,
  FEDERAL_CREDIT_RATE,
  ONTARIO_CREDIT_RATE,
  CAPITAL_GAINS,
} from '../constants';

describe('constants-integrity — 2025 CRA values', () => {
  // ── Federal Basic Personal Amount (ITA s.118(1)(c)) ──────────────────────
  it('FEDERAL_BPA.max is $16,129 (CRA line 30000, 2025)', () => {
    expect(FEDERAL_BPA.max).toBe(16129);
  });

  it('FEDERAL_BPA.base (minimum) is $14,538', () => {
    expect(FEDERAL_BPA.base).toBe(14538);
  });

  it('FEDERAL_BPA phase-out starts at $177,882 and ends at $253,414', () => {
    expect(FEDERAL_BPA.clawbackStart).toBe(177882);
    expect(FEDERAL_BPA.clawbackEnd).toBe(253414);
  });

  // ── Ontario Basic Personal Amount (Ontario Taxation Act s.8(1)) ──────────
  it('ONTARIO_BPA is $12,747 (CRA T4032ON Jul 2025)', () => {
    expect(ONTARIO_BPA).toBe(12747);
  });

  // ── RRSP dollar limit (ITA s.146(5)) ─────────────────────────────────────
  it('RRSP.maxContribution is $32,490 (2025 annual dollar limit)', () => {
    expect(RRSP.maxContribution).toBe(32490);
  });

  // ── CPP 2025 ─────────────────────────────────────────────────────────────
  it('CPP.maxEmployeeContribution is $4,034.10 ((YMPE $71,300 − $3,500) × 5.95%)', () => {
    expect(CPP.maxEmployeeContribution).toBe(4034.10);
  });

  it('CPP.maxPensionableEarnings (YMPE) is $71,300', () => {
    expect(CPP.maxPensionableEarnings).toBe(71300);
  });

  it('CPP.employeeRate is 5.95%', () => {
    expect(CPP.employeeRate).toBe(0.0595);
  });

  it('CPP math: (YMPE − exemption) × rate = maxContribution', () => {
    const computed = (CPP.maxPensionableEarnings - CPP.basicExemption) * CPP.employeeRate;
    expect(Math.round(computed * 100) / 100).toBe(CPP.maxEmployeeContribution);
  });

  // ── CPP2 2025 ─────────────────────────────────────────────────────────────
  it('CPP2.maxEmployeeContribution is $396.00 ((YAMPE $81,200 − YMPE $71,300) × 4.00%)', () => {
    expect(CPP2.maxEmployeeContribution).toBe(396.00);
  });

  it('CPP2 math: (YAMPE − YMPE) × rate = maxContribution', () => {
    const computed = (CPP2.secondCeiling - CPP.maxPensionableEarnings) * CPP2.rate;
    expect(Math.round(computed * 100) / 100).toBe(CPP2.maxEmployeeContribution);
  });

  // ── EI 2025 ──────────────────────────────────────────────────────────────
  it('EI.maxPremium is $1,077.48 ($65,700 × 1.64%)', () => {
    expect(EI.maxPremium).toBe(1077.48);
  });

  it('EI.maxInsurableEarnings is $65,700', () => {
    expect(EI.maxInsurableEarnings).toBe(65700);
  });

  it('EI.premiumRate is 1.64%', () => {
    expect(EI.premiumRate).toBe(0.0164);
  });

  it('EI math: maxInsurable × premiumRate = maxPremium', () => {
    const computed = EI.maxInsurableEarnings * EI.premiumRate;
    expect(Math.round(computed * 100) / 100).toBe(EI.maxPremium);
  });

  // ── Federal tax credit rate ───────────────────────────────────────────────
  it('FEDERAL_CREDIT_RATE is 14.5% (blended 2025 — Bill C-4)', () => {
    expect(FEDERAL_CREDIT_RATE).toBe(0.145);
  });

  // ── Ontario tax credit rate ───────────────────────────────────────────────
  it('ONTARIO_CREDIT_RATE is 5.05%', () => {
    expect(ONTARIO_CREDIT_RATE).toBe(0.0505);
  });

  // ── Federal brackets — key thresholds ────────────────────────────────────
  it('federal bracket 1 runs to $57,375 at 14.5%', () => {
    expect(FEDERAL_BRACKETS[0].max).toBe(57375);
    expect(FEDERAL_BRACKETS[0].rate).toBe(0.145);
  });

  it('federal bracket 2 runs $57,375–$114,750 at 20.5%', () => {
    expect(FEDERAL_BRACKETS[1].min).toBe(57375);
    expect(FEDERAL_BRACKETS[1].max).toBe(114750);
    expect(FEDERAL_BRACKETS[1].rate).toBe(0.205);
  });

  it('federal bracket 5 (top) starts at $253,414 at 33%', () => {
    expect(FEDERAL_BRACKETS[4].min).toBe(253414);
    expect(FEDERAL_BRACKETS[4].rate).toBe(0.33);
  });

  // ── Ontario brackets — key thresholds ────────────────────────────────────
  it('Ontario bracket 1 runs to $52,886 at 5.05%', () => {
    expect(ONTARIO_BRACKETS[0].max).toBe(52886);
    expect(ONTARIO_BRACKETS[0].rate).toBe(0.0505);
  });

  it('Ontario bracket 2 runs $52,886–$105,775 at 9.15%', () => {
    expect(ONTARIO_BRACKETS[1].min).toBe(52886);
    expect(ONTARIO_BRACKETS[1].max).toBe(105775);
    expect(ONTARIO_BRACKETS[1].rate).toBe(0.0915);
  });

  // ── Capital gains 2025 inclusion rate ────────────────────────────────────
  it('CAPITAL_GAINS.inclusionRateLow is 50% (flat for ALL 2025 gains — two-tier deferred)', () => {
    expect(CAPITAL_GAINS.inclusionRateLow).toBe(0.50);
  });

  it('CAPITAL_GAINS.inclusionRateHigh is also 50% (same rate — no two-tier in 2025)', () => {
    expect(CAPITAL_GAINS.inclusionRateHigh).toBe(0.50);
  });
});
