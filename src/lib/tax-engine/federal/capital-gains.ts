/**
 * Capital gains calculations — ITA s.38–55
 * 2025 tax year: 50% inclusion rate for all individuals (2/3 increase deferred to Jan 1, 2026).
 */

import { CAPITAL_GAINS } from '../constants';
import { roundCRA } from './brackets';
import type { T5008Slip, T3Slip } from '../types';

export interface CapitalGainsResult {
  totalGain: number;
  totalLoss: number;
  netGain: number;
  taxableGain: number;
}

/**
 * Computes capital gains/losses from T5008 and T3 slips.
 *
 * T5008: each disposition — gain/loss = proceeds (box 21) minus ACB (box 20).
 * T3 box 21: trust-allocated capital gains (already net; no corresponding loss box).
 *
 * Losses in excess of gains in the current year cannot be applied here — they are
 * tracked as Allowable Capital Loss carryforwards on Schedule 3 (ITA s.3(b)).
 * Net gain floor is zero; excess losses are returned separately for carryforward.
 *
 * Taxable gain = net gain × 50% inclusion rate (ITA s.38(a)).
 */
export function calculateCapitalGains(
  t5008Slips: T5008Slip[],
  t3Slips: T3Slip[]
): CapitalGainsResult {
  let totalGain = 0;
  let totalLoss = 0;

  // T5008: proceeds of disposition minus ACB gives gain or loss per security
  for (const slip of t5008Slips) {
    const gainOrLoss = roundCRA(slip.box21 - slip.box20);
    if (gainOrLoss >= 0) {
      totalGain = roundCRA(totalGain + gainOrLoss);
    } else {
      totalLoss = roundCRA(totalLoss + Math.abs(gainOrLoss));
    }
  }

  // T3 box 21: trust-allocated capital gains — no paired loss box
  for (const slip of t3Slips) {
    if (slip.box21 > 0) {
      totalGain = roundCRA(totalGain + slip.box21);
    }
  }

  // Net gain cannot be negative for the current year (ITA s.3(b))
  const netGain = Math.max(0, roundCRA(totalGain - totalLoss));
  const taxableGain = roundCRA(netGain * CAPITAL_GAINS.inclusionRate);

  return {
    totalGain: roundCRA(totalGain),
    totalLoss: roundCRA(totalLoss),
    netGain,
    taxableGain,
  };
}
