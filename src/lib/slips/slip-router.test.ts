/**
 * Tests for src/lib/slips/slip-router.ts
 *
 * routeSlipType() is the regex-based slip type detector used to cross-validate
 * Claude's OCR output. Correctness matters: a misrouted slip type causes the
 * wrong box fields to be surfaced in the UI and the wrong engine path to run.
 *
 * Coverage: all 14 supported slip types + unknown + ordering edge cases.
 */

import { describe, it, expect } from 'vitest';
import { routeSlipType } from './slip-router';

// ── Positive matches — representative OCR text for each type ─────────────────

describe('routeSlipType — positive identification', () => {
  it('identifies T4A(P) from canonical header', () => {
    expect(routeSlipType('T4A(P) Statement of Canada Pension Plan Benefits 2025')).toBe('T4AP');
  });

  it('identifies T4A(P) from natural-language OCR', () => {
    expect(routeSlipType('Canada Pension Plan Benefits — Employee Contributions')).toBe('T4AP');
  });

  it('identifies T4A(OAS) from canonical header', () => {
    expect(routeSlipType('T4A(OAS) Statement of Old Age Security 2025')).toBe('T4AOAS');
  });

  it('identifies T4A(OAS) from natural-language OCR', () => {
    expect(routeSlipType('Statement of Old Age Security Pension — Service Canada')).toBe('T4AOAS');
  });

  it('identifies T4FHSA from canonical header', () => {
    expect(routeSlipType('T4FHSA First Home Savings Account Activity 2025')).toBe('T4FHSA');
  });

  it('identifies T4FHSA from natural-language OCR', () => {
    expect(routeSlipType('Statement of First Home Savings Account')).toBe('T4FHSA');
  });

  it('identifies RRSP-Receipt from contribution receipt', () => {
    expect(routeSlipType('RRSP Contribution Receipt — TD Canada Trust')).toBe('RRSP-Receipt');
  });

  it('identifies RRSP-Receipt from full name', () => {
    expect(routeSlipType('Registered Retirement Savings Plan Contribution — Wealthsimple')).toBe('RRSP-Receipt');
  });

  it('identifies T4RSP from canonical header', () => {
    expect(routeSlipType('T4RSP Statement of RRSP Income 2025')).toBe('T4RSP');
  });

  it('identifies T4RIF from canonical header', () => {
    expect(routeSlipType('T4RIF Statement of Income from a Registered Retirement Income Fund')).toBe('T4RIF');
  });

  it('identifies T4A from canonical header', () => {
    expect(routeSlipType('T4A Statement of Pension, Retirement, Annuity, and Other Income')).toBe('T4A');
  });

  it('identifies T4E from canonical header', () => {
    expect(routeSlipType('T4E Statement of Employment Insurance and Other Benefits')).toBe('T4E');
  });

  it('identifies T4 (employment) from canonical header', () => {
    expect(routeSlipType('T4 Statement of Remuneration Paid 2025')).toBe('T4');
  });

  it('identifies T5008 from canonical header', () => {
    expect(routeSlipType('T5008 Statement of Securities Transactions — RBC Direct Investing')).toBe('T5008');
  });

  it('identifies T5007 from canonical header', () => {
    expect(routeSlipType('T5007 Statement of Benefits — Ontario Works')).toBe('T5007');
  });

  it('identifies T5 from canonical header', () => {
    expect(routeSlipType('T5 Statement of Investment Income — Scotiabank')).toBe('T5');
  });

  it('identifies T3 from canonical header', () => {
    expect(routeSlipType('T3 Statement of Trust Income Allocations and Designations')).toBe('T3');
  });

  it('identifies T2202 from canonical header', () => {
    expect(routeSlipType('T2202 Tuition and Enrolment Certificate — University of Toronto')).toBe('T2202');
  });
});

// ── Unknown fallback ──────────────────────────────────────────────────────────

describe('routeSlipType — unknown fallback', () => {
  it('returns "unknown" for unrecognised text', () => {
    expect(routeSlipType('Invoice #12345 from Acme Corp')).toBe('unknown');
  });

  it('returns "unknown" for empty string', () => {
    expect(routeSlipType('')).toBe('unknown');
  });

  it('returns "unknown" for a generic word that appears in many contexts', () => {
    expect(routeSlipType('income statement')).toBe('unknown');
  });
});

// ── Ordering edge cases — most-specific must win ──────────────────────────────

describe('routeSlipType — ordering priority', () => {
  it('T4A(P) wins over T4A when both appear in the text', () => {
    // Real OCR sometimes contains "T4A(P)" embedded in a line with "T4A"
    expect(routeSlipType('T4A(P) - T4A Canada Pension Plan Benefits')).toBe('T4AP');
  });

  it('T4A(OAS) wins over T4A for OAS slips', () => {
    expect(routeSlipType('T4A(OAS) Old Age Security')).toBe('T4AOAS');
  });

  it('T4RSP wins over T4 for RRSP income slips', () => {
    expect(routeSlipType('T4RSP Statement of RRSP Income')).toBe('T4RSP');
  });

  it('T4RIF wins over T4 for RRIF income slips', () => {
    expect(routeSlipType('T4RIF Statement of Income from a RRIF 2025')).toBe('T4RIF');
  });

  it('T4FHSA wins over T4A for FHSA slips', () => {
    expect(routeSlipType('T4FHSA Statement of First Home Savings Account Activity')).toBe('T4FHSA');
  });

  it('T5008 does not match T5 alone', () => {
    expect(routeSlipType('T5008 Securities Transactions')).toBe('T5008');
    expect(routeSlipType('T5 Statement of Investment Income')).toBe('T5');
  });

  it('case-insensitive matching — lowercase OCR text', () => {
    expect(routeSlipType('t4 statement of remuneration paid')).toBe('T4');
    expect(routeSlipType('t4a(p) canada pension plan benefits')).toBe('T4AP');
    expect(routeSlipType('t5 statement of investment income')).toBe('T5');
  });
});
