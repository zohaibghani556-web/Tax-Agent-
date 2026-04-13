/**
 * Capital gains calculations — ITA s.38–55
 *
 * 2025 inclusion rate: 50% flat (ITA s.38(a)).
 * The proposed two-tier increase (50%/$250k / 66.67% above) was deferred to 2026.
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
 * Applies the 2025 capital gains inclusion rate (50% flat) to a net capital gain.
 * The two-tier increase was deferred to 2026; all gains in 2025 use 50%.
 * Net gain must be ≥ 0 (losses handled separately as carryforwards).
 */
export function applyCapitalGainsInclusionRate(netGain: number): number {
  if (netGain <= 0) return 0;
  return roundCRA(netGain * CAPITAL_GAINS.inclusionRateLow);
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
