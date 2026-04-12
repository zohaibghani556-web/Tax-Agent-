/**
 * Federal income aggregation — ITA s.3–4, s.9
 * Computes CRA lines 15000 (Total Income), 23600 (Net Income), 26000 (Taxable Income).
 */

import { RRSP } from '../constants';
import { roundCRA } from './brackets';
import { calculateCapitalGains } from './capital-gains';
import { calculateMovingExpenses } from './moving-expenses';
import type {
  TaxSlip,
  BusinessIncome,
  RentalIncome,
  DeductionsCreditsInput,
} from '../types';

// ============================================================
// LINE 15000 — TOTAL INCOME
// ============================================================

/**
 * Aggregates total income from all slip sources, business income, and rental income.
 * Returns CRA line 15000.
 *
 * Slip contributions:
 *   T4  box 14  — Employment income (line 10100)
 *   T5  box 13  — Interest from Canadian sources (line 12100)
 *   T5  box 25  — Taxable eligible dividends (already grossed up, line 12000)
 *   T5  box 11  — Taxable non-eligible dividends (already grossed up, line 12010)
 *   T5008       — Capital gains/losses (ITA s.38; taxable portion at 50%, line 12700)
 *   T3  box 49  — Interest income
 *   T3  box 23  — Taxable eligible dividends
 *   T3  box 32  — Taxable non-eligible dividends
 *   T3  box 21  — Capital gains (trust-allocated, flows into Schedule 3)
 *   T3  box 26  — Other income
 *   T4A  box 016 — Pension/superannuation (line 11500)
 *   T4A  box 028 — Other income (line 13000)
 *   T4A  box 105 — Scholarships/bursaries (full-time: exempt; partial not handled here)
 *   T4AP box 16  — CPP retirement/disability pension (line 11400)
 *   T4AOAS box 18 — OAS pension (line 11300); box 21 (GIS supplements) excluded
 *   T4RSP box 22 — RRSP withdrawal income (line 12900)
 *   T4RIF box 16 — RRIF withdrawal income (line 13000)
 *   T4E  box 14  — EI benefits (line 11900)
 *   T5007 box 10 — Social assistance (included in income but often offset by deductions)
 *   RRSP-Receipt — contribution receipt, produces deduction not income (handled in deductions)
 */
export interface TotalIncomeResult {
  totalIncome: number;
  socialAssistanceIncome: number;  // Needed for line 25000 offset in calculateNetIncome
}

export function aggregateTotalIncome(
  slips: TaxSlip[],
  business: BusinessIncome[],
  rental: RentalIncome[]
): TotalIncomeResult {
  let employment = 0;
  let interest = 0;
  let eligibleDividends = 0;
  let nonEligibleDividends = 0;
  const t5008Slips = [];
  const t3Slips = [];
  let pension = 0;
  let otherIncome = 0;
  let scholarships = 0;
  let ei = 0;
  let socialAssistance = 0;
  let taxableCapGainsDividends = 0;  // T5 box18 capital gains dividends at 50% inclusion

  for (const slip of slips) {
    switch (slip.type) {
      case 'T4':
        // box14 = employment income; box40 = other taxable allowances; box42 = commissions
        employment = roundCRA(employment + slip.data.box14 + slip.data.box40 + slip.data.box42);
        break;

      case 'T5':
        interest = roundCRA(interest + slip.data.box13);
        eligibleDividends = roundCRA(eligibleDividends + slip.data.box25);
        nonEligibleDividends = roundCRA(nonEligibleDividends + slip.data.box11);
        // box14 = other income; box18 = capital gains dividends (Schedule 3 / capital gains stream)
        otherIncome = roundCRA(otherIncome + slip.data.box14);
        taxableCapGainsDividends = roundCRA(taxableCapGainsDividends + roundCRA(slip.data.box18 * 0.50));
        break;

      case 'T5008':
        // Collected for capital gains calc; cast to satisfy TS (TaxSlip union already typed)
        t5008Slips.push(slip.data);
        break;

      case 'T3':
        interest = roundCRA(interest + slip.data.box49);
        eligibleDividends = roundCRA(eligibleDividends + slip.data.box23);
        nonEligibleDividends = roundCRA(nonEligibleDividends + slip.data.box32);
        otherIncome = roundCRA(otherIncome + slip.data.box26);
        // T3 box 21 capital gains fed into Schedule 3 via calculateCapitalGains
        t3Slips.push(slip.data);
        break;

      case 'T4A':
        pension = roundCRA(pension + slip.data.box016);
        // box018 = lump-sum payments (retiring allowance, death benefits, etc.) → line 13000
        // box024 = annuities → line 11500 (treated as pension-equivalent for credit purposes)
        // box028 = other income → line 13000
        otherIncome = roundCRA(otherIncome + slip.data.box018 + slip.data.box024 + slip.data.box028);
        // Scholarships for full-time students are exempt (ITA s.56(3)).
        // The scholarship exemption is handled here conservatively: full inclusion.
        // The exemption is applied as a deduction when the student status is known.
        scholarships = roundCRA(scholarships + slip.data.box105);
        break;

      case 'T4FHSA':
        // Non-qualifying FHSA withdrawals are taxable → line 12905 (other income)
        // Qualifying withdrawals (used for eligible home purchase) are tax-free — box14 = 0.
        otherIncome = roundCRA(otherIncome + slip.data.box14);
        break;

      case 'T4E':
        ei = roundCRA(ei + slip.data.box14);
        break;

      case 'T5007':
        // Social assistance is included in income (line 14500) but an offsetting
        // deduction at line 25000 reduces net income — handled in calculateNetIncome.
        socialAssistance = roundCRA(socialAssistance + slip.data.box10);
        break;

      case 'T4AP':
        // CPP retirement/disability/survivor pension → line 11400
        // Also qualifies for pension income credit for all ages (ITA s.118(3)(b))
        pension = roundCRA(pension + slip.data.box16 + slip.data.box20);
        break;

      case 'T4AOAS':
        // OAS → line 11300; GIS supplements (box21) are NOT taxable income
        otherIncome = roundCRA(otherIncome + slip.data.box18);
        break;

      case 'T4RSP':
        // RRSP withdrawal → line 12900 (fully taxable)
        otherIncome = roundCRA(otherIncome + slip.data.box22);
        break;

      case 'T4RIF':
        // RRIF mandatory withdrawal → line 13000
        otherIncome = roundCRA(otherIncome + slip.data.box16);
        break;

      case 'T2202':
      case 'RRSP-Receipt':
        // T2202 → credits only (handled in engine.ts)
        // RRSP-Receipt → deduction only (handled in engine.ts via deductions input)
        break;
    }
  }

  // Capital gains from T5008 and T3 at 50% inclusion (ITA s.38(a))
  const cgResult = calculateCapitalGains(t5008Slips, t3Slips);
  const taxableCapitalGains = cgResult.taxableGain;

  // Business net income (line 13500–14300)
  const businessNet = business.reduce(
    (sum, b) => roundCRA(sum + b.netIncome),
    0
  );

  // Rental net income (line 12600)
  const rentalNet = rental.reduce(
    (sum, r) => roundCRA(sum + r.netIncome),
    0
  );

  const total = roundCRA(
    employment +
    interest +
    eligibleDividends +
    nonEligibleDividends +
    taxableCapitalGains +
    taxableCapGainsDividends +
    pension +
    otherIncome +
    scholarships +
    ei +
    socialAssistance +
    businessNet +
    rentalNet
  );

  return {
    totalIncome: Math.max(0, total),
    socialAssistanceIncome: socialAssistance,
  };
}

// ============================================================
// LINE 23600 — NET INCOME
// ============================================================

/**
 * Applies allowable deductions to arrive at net income (CRA line 23600).
 *
 * Deductions applied (ITA s.60–63):
 *   RRSP contributions — capped at contribution room (ITA s.146(5))
 *   FHSA contributions — treated as fully deductible up to annual/lifetime limits
 *   Union/professional dues — T4 box 44 or receipts (ITA s.8(1)(i))
 *   Childcare expenses — ITA s.63
 *   Moving expenses — ITA s.62
 *   Support payments made — ITA s.60(b)
 *   Carrying charges / interest on investments — ITA s.20(1)(c)
 *   CPP contributions on self-employment income — ITA s.60(e)
 *   Non-capital loss carryforward — ITA s.111(1)(a) (applied to net income floor)
 *   Other deductions — catch-all
 *
 * Result cannot go below $0.
 */
export function calculateNetIncome(
  totalIncome: number,
  deductions: DeductionsCreditsInput,
  socialAssistanceIncome: number = 0,
): number {
  // RRSP deduction capped at: lesser of contributions, available room, and annual max.
  // If rrspContributionRoom is 0 (not entered), use the annual maximum as the room —
  // we cannot deny the deduction just because the user didn't enter their NOA room.
  // The annual cap (RRSP.maxContribution) always applies regardless.
  const roomToUse = deductions.rrspContributionRoom > 0
    ? deductions.rrspContributionRoom
    : RRSP.maxContribution;
  const rrspDeduction = Math.min(deductions.rrspContributions, roomToUse, RRSP.maxContribution);

  // Social assistance (line 14500) and workers' comp are included in total income
  // but fully offset by a deduction at line 25000 (ITA s.110(1)(f)) so they never
  // increase net income. This preserves eligibility for income-tested benefits.
  const socialAssistanceOffset = socialAssistanceIncome;

  // ITA s.62: if detailed moving expense input is provided, compute the
  // income-limited deduction automatically; otherwise use the raw field.
  const movingExpensesDeduction = deductions.movingExpensesDetail != null
    ? calculateMovingExpenses(deductions.movingExpensesDetail).currentYearDeduction
    : (deductions.movingExpenses ?? 0);

  const totalDeductions = roundCRA(
    rrspDeduction +
    (deductions.fhsaContributions ?? 0) +
    (deductions.unionDues ?? 0) +
    (deductions.childcareExpenses ?? 0) +
    movingExpensesDeduction +
    (deductions.supportPaymentsMade ?? 0) +
    (deductions.carryingCharges ?? 0) +
    (deductions.studentLoanInterest ?? 0) +
    (deductions.nonCapitalLossCarryforward ?? 0) +
    (deductions.disabilitySupportsDeduction ?? 0) +
    (deductions.pensionSplitDeducted ?? 0) +
    socialAssistanceOffset
  );

  return Math.max(0, roundCRA(totalIncome - totalDeductions));
}

// ============================================================
// LINE 26000 — TAXABLE INCOME
// ============================================================

/**
 * Applies further deductions to net income to arrive at taxable income (CRA line 26000).
 *
 * Deductions applied (ITA s.110–111):
 *   Capital gains deduction (LCGE for QSBC/farm/fishing) — ITA s.110.6
 *   Capital loss carryforward — ITA s.111(1)(b) (allowable capital losses from prior years)
 *   Northern residents deductions — ITA s.110.7 (not modeled in detail here)
 *
 * Result cannot go below $0.
 */
export function calculateTaxableIncome(
  netIncome: number,
  deductions: DeductionsCreditsInput
): number {
  const capitalGainsDeduction = deductions.capitalLossCarryforward ?? 0;

  const furtherDeductions = roundCRA(capitalGainsDeduction);

  return Math.max(0, roundCRA(netIncome - furtherDeductions));
}
