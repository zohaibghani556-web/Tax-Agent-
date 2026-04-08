/**
 * Capital gains calculations — ITA s.38–55
 *
 * 2025 inclusion rates (two-tier per Budget 2024):
 *   First $250,000 net gains: 50% inclusion (ITA s.38(a))
 *   Above $250,000 net gains: 66.67% inclusion
 *
 * Losses in excess of current-year gains are carried forward (ITA s.3(b)).
 * LCGE for qualifying small business shares: $1,250,000 (ITA s.110.6).
 * Principal residence: fully exempt when designated (ITA s.40(2)(b)).
 */

import { CAPITAL_GAINS } from '../constants';
import { roundCRA } from './brackets';
import type { T5008Slip, T3Slip } from '../types';

export interface CapitalGainsResult {
  totalGain:   number;
  totalLoss:   number;
  netGain:     number;
  taxableGain: number;
}

/**
 * Applies the 2025 two-tier inclusion rate to a net capital gain.
 * First $250,000: 50% inclusion.
 * Above $250,000: 66.67% inclusion.
 * Net gain must be ≥ 0 (losses handled separately as carryforwards).
 */
export function applyCapitalGainsInclusionRate(netGain: number): number {
  if (netGain <= 0) return 0;

  const { inclusionRateLow, inclusionRateHigh, threshold } = CAPITAL_GAINS;

  if (netGain <= threshold) {
    return roundCRA(netGain * inclusionRateLow);
  }

  const lowPortion  = roundCRA(threshold * inclusionRateLow);
  const highPortion = roundCRA((netGain - threshold) * inclusionRateHigh);
  return roundCRA(lowPortion + highPortion);
}

/**
 * Computes capital gains/losses from T5008 and T3 slips.
 *
 * T5008: each disposition — gain/loss = proceeds (box 21) minus ACB (box 20).
 * T3 box 21: trust-allocated capital gains (already net; no paired loss box).
 *
 * The two-tier inclusion rate is applied to the net gain for the year.
 * Excess losses are tracked separately for carryforward on Schedule 3.
 */
export function calculateCapitalGains(
  t5008Slips: T5008Slip[],
  t3Slips: T3Slip[]
): CapitalGainsResult {
  let totalGain = 0;
  let totalLoss = 0;

  for (const slip of t5008Slips) {
    const gainOrLoss = roundCRA(slip.box21 - slip.box20);
    if (gainOrLoss >= 0) {
      totalGain = roundCRA(totalGain + gainOrLoss);
    } else {
      totalLoss = roundCRA(totalLoss + Math.abs(gainOrLoss));
    }
  }

  for (const slip of t3Slips) {
    if (slip.box21 > 0) {
      totalGain = roundCRA(totalGain + slip.box21);
    }
  }

  // Net gain cannot be negative for the current year (ITA s.3(b))
  const netGain = Math.max(0, roundCRA(totalGain - totalLoss));
  const taxableGain = applyCapitalGainsInclusionRate(netGain);

  return {
    totalGain: roundCRA(totalGain),
    totalLoss: roundCRA(totalLoss),
    netGain,
    taxableGain,
  };
}
