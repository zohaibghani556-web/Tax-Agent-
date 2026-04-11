/**
 * CRA Quarterly Instalment Payments — ITA s.156, s.156.1
 *
 * Instalments are required when the net tax owing exceeds $3,000 in the
 * current year AND in either of the two immediately preceding years.
 * For Ontario, the provincial threshold is also $3,000 (combined federal + provincial).
 *
 * For 2026 instalments (based on 2025 return), due dates are:
 *   March 15, June 15, September 15, December 15, 2026.
 *
 * Three instalment methods (ITA s.156(1)):
 *   (a) Prior-year method   — pay 1/4 of the PRIOR year's net tax each quarter
 *   (b) Current-year method — pay 1/4 of the CURRENT year's estimated net tax
 *   (c) No-calculation method — CRA sends instalment reminders based on 2 years prior
 *
 * For the no-calculation method (ITA s.156.1):
 *   March + June instalments = 1/4 of net tax from 2 years ago (2024 net tax)
 *   Sept + December instalments = (prior year net tax − March − June payments) / 2
 *
 * CRA's instalment interest rate is 2% above the prescribed rate, charged if
 * instalments are insufficient. This module calculates the amounts; interest is not computed.
 *
 * Reference: CRA T7B, Guide T4002, CRA General Income Tax and Benefit Guide.
 */

import { roundCRA } from './brackets';

export interface InstalmentInput {
  /** Net tax owing on the 2025 T1 (current year being filed) — line 48500 if positive */
  currentYearBalanceOwing: number;

  /** Net tax owing from the prior year (2024 T1) — used for prior-year method */
  priorYearBalanceOwing: number;

  /** Net tax owing from two years ago (2023 T1) — used for no-calculation method */
  twoYearsAgoBalanceOwing: number;
}

export interface InstalmentResult {
  /**
   * True when CRA will require 2026 instalments based on the 2025 balance owing.
   * Requirement: balance owing > $3,000 in 2025 AND in at least one of 2024 or 2023.
   */
  instalmentRequired: boolean;

  /** Prior-year method: each of the 4 quarterly payments (ITA s.156(1)(a)) */
  priorYearMethodQuarterly: number;
  priorYearMethodAnnual: number;

  /** Current-year method: each of the 4 quarterly payments (ITA s.156(1)(b)) */
  currentYearMethodQuarterly: number;
  currentYearMethodAnnual: number;

  /** No-calculation method instalment amounts (ITA s.156.1) */
  noCalcMethod: {
    marchPayment: number;   // Q1 (same as June) = twoYearsAgo / 4
    junePayment: number;    // Q2 = twoYearsAgo / 4
    septPayment: number;    // Q3 = (priorYear - march - june) / 2
    decPayment: number;     // Q4 = (priorYear - march - june) / 2
  };

  /**
   * Recommended method: the one that minimizes total 2026 instalments.
   * The taxpayer should choose the method that results in the lowest amount,
   * but must not under-pay relative to the safe harbour (prior-year method).
   */
  recommendedMethod: 'prior-year' | 'current-year' | 'no-calculation';
  recommendedQuarterly: number;

  /** CRA instalment due dates for 2026 */
  dueDates: string[];

  /** Plain-language warning message for display in the calculator UI */
  warningMessage: string | null;
}

/** CRA minimum balance owing threshold to trigger instalment requirement — ITA s.156.1 */
const INSTALMENT_THRESHOLD = 3000;

/**
 * Calculates CRA instalment payment amounts for the following tax year
 * based on the current return's balance owing and prior-year data.
 *
 * The prior-year method is the safest: it guarantees no instalment interest
 * regardless of the current year's actual income.
 *
 * @param input Current and prior-year balance owing amounts
 */
export function calculateInstalments(input: InstalmentInput): InstalmentResult {
  const {
    currentYearBalanceOwing,
    priorYearBalanceOwing,
    twoYearsAgoBalanceOwing,
  } = input;

  // ITA s.156.1: instalments required only if balance owing > $3,000 in the
  // current year AND in at least one of the prior two years.
  const currentExceedsThreshold  = currentYearBalanceOwing  > INSTALMENT_THRESHOLD;
  const priorExceedsThreshold    = priorYearBalanceOwing    > INSTALMENT_THRESHOLD;
  const twoYearsAgoExceedsThreshold = twoYearsAgoBalanceOwing > INSTALMENT_THRESHOLD;

  const instalmentRequired =
    currentExceedsThreshold && (priorExceedsThreshold || twoYearsAgoExceedsThreshold);

  // ── Prior-year method (ITA s.156(1)(a)) ─────────────────────────────────────
  // Pay 25% of prior year's net tax owing each quarter.
  // This is the "safe harbour" method — no instalment interest if paid on time.
  const priorYearMethodAnnual    = roundCRA(Math.max(0, priorYearBalanceOwing));
  const priorYearMethodQuarterly = roundCRA(priorYearMethodAnnual / 4);

  // ── Current-year method (ITA s.156(1)(b)) ────────────────────────────────────
  // Pay 25% of the current (2025) year's estimated net tax each quarter.
  // Accurate if income is lower in the current year, but risky if too low.
  const currentYearMethodAnnual    = roundCRA(Math.max(0, currentYearBalanceOwing));
  const currentYearMethodQuarterly = roundCRA(currentYearMethodAnnual / 4);

  // ── No-calculation method (ITA s.156.1) ──────────────────────────────────────
  // CRA-calculated: first two instalments based on 2 years ago; last two adjusted.
  const marchPayment = roundCRA(Math.max(0, twoYearsAgoBalanceOwing) / 4);
  const junePayment  = marchPayment;
  const remainingAfterFirstHalf = roundCRA(Math.max(0, priorYearBalanceOwing) - marchPayment - junePayment);
  const septPayment  = roundCRA(remainingAfterFirstHalf / 2);
  const decPayment   = septPayment;

  // ── Recommended method ────────────────────────────────────────────────────────
  // Choose the method with the lowest quarterly payment.
  // NOTE: For safety, the prior-year method eliminates instalment interest risk.
  const noCalcAnnual = roundCRA(marchPayment + junePayment + septPayment + decPayment);
  const methods: { method: 'prior-year' | 'current-year' | 'no-calculation'; annual: number }[] = [
    { method: 'prior-year',    annual: priorYearMethodAnnual    },
    { method: 'current-year',  annual: currentYearMethodAnnual  },
    { method: 'no-calculation', annual: noCalcAnnual            },
  ];

  let recommended = methods[0];
  for (const m of methods) {
    if (m.annual < recommended.annual) recommended = m;
  }

  const recommendedQuarterly =
    recommended.method === 'no-calculation'
      ? marchPayment  // All 4 are equal in the simplified case
      : roundCRA(recommended.annual / 4);

  // ── Warning message ───────────────────────────────────────────────────────────
  let warningMessage: string | null = null;
  if (instalmentRequired) {
    warningMessage =
      `Based on your 2025 return, you may be required to make 2026 instalment payments ` +
      `of approximately ${formatCad(priorYearMethodQuarterly)} per quarter ` +
      `(prior-year method — due March 15, June 15, September 15, and December 15, 2026). ` +
      `Set up a CRA My Account reminder so you don't miss the first payment on March 15.`;
  } else if (currentExceedsThreshold) {
    warningMessage =
      `Your 2025 balance owing exceeds $3,000. If your 2024 balance owing was also ` +
      `over $3,000, CRA will require quarterly instalment payments in 2026.`;
  }

  return {
    instalmentRequired,
    priorYearMethodQuarterly,
    priorYearMethodAnnual,
    currentYearMethodQuarterly,
    currentYearMethodAnnual,
    noCalcMethod: { marchPayment, junePayment, septPayment, decPayment },
    recommendedMethod: recommended.method,
    recommendedQuarterly,
    dueDates: [
      '2026-03-15',
      '2026-06-15',
      '2026-09-15',
      '2026-12-15',
    ],
    warningMessage,
  };
}

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    maximumFractionDigits: 2, minimumFractionDigits: 2,
  }).format(n);
}
