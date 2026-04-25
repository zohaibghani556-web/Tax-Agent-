/**
 * Ontario Health Premium tests — 2025 CRA formula.
 * Source: CRA T4032ON Jul 2025 | Verified: 2026-04-24
 *
 * Key tier boundaries (all use "lesser of max or rate × excess" formula):
 *   Tier 1 ($20,001–$36,000): caps at $300 when income reaches $25,000 (6% × $5,000 = $300)
 *   Tier 2 ($36,001–$48,000): adds up to $150, caps at $450 when income reaches $38,500
 *   Tier 3 ($48,001–$72,000): adds up to $150, caps at $600 when income reaches $48,600
 *   Tier 4 ($72,001–$200,000): adds up to $150, caps at $750 when income reaches $72,600
 *   Tier 5 ($200,001+):        adds up to $150, caps at $900 when income reaches $200,600
 */
import { describe, it, expect } from 'vitest';
import { calculateOntarioHealthPremium } from './health-premium';

describe('calculateOntarioHealthPremium', () => {
  it('returns $0 for zero income', () => {
    expect(calculateOntarioHealthPremium(0)).toBe(0);
  });

  it('returns $0 for income below $20,000', () => {
    expect(calculateOntarioHealthPremium(18000)).toBe(0);
  });

  it('returns $0 at exactly $20,000', () => {
    expect(calculateOntarioHealthPremium(20000)).toBe(0);
  });

  // $22,500: 6% × ($22,500 − $20,000) = 6% × $2,500 = $150 (below $300 cap)
  it('returns $150 at $22,500 (partial tier 1)', () => {
    expect(calculateOntarioHealthPremium(22500)).toBe(150);
  });

  // $25,000: 6% × ($25,000 − $20,000) = $300 (cap reached)
  it('returns $300 at $25,000 (tier 1 cap reached)', () => {
    expect(calculateOntarioHealthPremium(25000)).toBe(300);
  });

  // $30,000: 6% × ($30,000 − $20,000) = $600, but lesser of ($300, $600) = $300
  it('returns $300 for $30,000 income (capped at tier 1 max)', () => {
    expect(calculateOntarioHealthPremium(30000)).toBe(300);
  });

  // $38,500: $300 + 6% × ($38,500 − $36,000) = $300 + $150 = $450 (tier 2 cap)
  it('returns $450 at $38,500 (tier 2 cap reached)', () => {
    expect(calculateOntarioHealthPremium(38500)).toBe(450);
  });

  // $48,600: $450 + 25% × ($48,600 − $48,000) = $450 + $150 = $600 (tier 3 cap)
  it('returns $600 at $48,600 (tier 3 cap reached)', () => {
    expect(calculateOntarioHealthPremium(48600)).toBe(600);
  });

  // $60,000: in $48,601–$72,000 flat range → $600
  it('returns $600 for $60,000 income (tier 3 flat zone)', () => {
    expect(calculateOntarioHealthPremium(60000)).toBe(600);
  });

  // $72,600: $600 + 25% × ($72,600 − $72,000) = $600 + $150 = $750 (tier 4 cap reached)
  it('returns $750 at $72,600 (tier 4 cap reached)', () => {
    expect(calculateOntarioHealthPremium(72600)).toBe(750);
  });

  // $73,200: still in tier 4 flat zone ($72,600–$200,000) → $750
  it('returns $750 at $73,200 (tier 4 flat zone)', () => {
    expect(calculateOntarioHealthPremium(73200)).toBe(750);
  });

  // $150,000: in tier 4 flat zone → $750
  it('returns $750 for $150,000 income (tier 4 flat zone)', () => {
    expect(calculateOntarioHealthPremium(150000)).toBe(750);
  });

  // $200,600: $750 + 25% × ($200,600 − $200,000) = $750 + $150 = $900 (tier 5 cap reached)
  it('returns $900 at $200,600 (tier 5 cap reached)', () => {
    expect(calculateOntarioHealthPremium(200600)).toBe(900);
  });

  // $210,000: above tier 5 cap → flat $900
  it('returns $900 for $210,000 income (above tier 5 cap)', () => {
    expect(calculateOntarioHealthPremium(210000)).toBe(900);
  });

  it('returns $900 for very high income', () => {
    expect(calculateOntarioHealthPremium(1000000)).toBe(900);
  });
});
