/**
 * Disability Tax Credit (DTC) — ITA s.118.3
 *
 * A CRA-approved T2201 certificate is required for all DTC claims.
 *
 * Federal base: $9,872 × 15% = $1,480.80 non-refundable credit (2025).
 *
 * Under-18 supplement — ITA s.118.3(1)(b):
 *   Amount: $5,758 × 15%.
 *   Reduced dollar-for-dollar by child care / attendant care expenses claimed
 *   for the disabled person above the $3,302 threshold. Floor: $0.
 *
 * Transfer to supporting person — ITA s.118.3(2)–(3):
 *   Where the claimant's tax payable is insufficient to absorb the full credit,
 *   the unused portion may be transferred to a supporting person (parent, spouse,
 *   grandparent, sibling, aunt, uncle, etc.). The supporting person must be
 *   related and resident in Canada.
 *
 * Ontario DTC — Ontario Taxation Act s.4(6):
 *   Base: $9,286 × 5.05% = $468.94
 *   Child supplement (under 18): $5,416 × 5.05% = $273.51
 *   Ontario does not apply an income-tested clawback to the child supplement.
 */

import {
  FEDERAL_CREDITS,
  ONTARIO_CREDITS,
  FEDERAL_CREDIT_RATE,
  ONTARIO_CREDIT_RATE,
} from '../constants';
import { roundCRA } from './brackets';

// ============================================================
// INTERFACES
// ============================================================

export interface DisabilityTaxCreditInput {
  /** Whether the person holds a CRA-approved T2201 certificate */
  hasDTC: boolean;

  /**
   * Age of the person with disability on December 31 of the tax year.
   * Under-18 supplement applies when ageOnDec31 < 18.
   */
  ageOnDec31: number;

  /**
   * Total child care expenses or attendant care claimed for this person
   * in the same tax year (ITA s.118.3(1)(b)).
   * Reduces the federal under-18 supplement dollar-for-dollar above $3,302.
   */
  childCareAttendantCare: number;

  /**
   * Whether the DTC is transferred to a supporting person because the
   * claimant cannot fully use it against their own tax (ITA s.118.3(2)–(3)).
   */
  transferToSupporter: boolean;
}

export interface DTCResult {
  // Federal amounts (Schedule 1, line 31600)
  /** Base DTC credit amount ($9,872 or $0) — before applying the 15% rate */
  federalBaseAmount: number;
  /** Under-18 supplement credit amount ($0–$5,758, after clawback by child care) */
  federalSupplementAmount: number;
  /** Total federal credit amount (base + supplement) — multiply by 15% for credit value */
  federalTotalCreditAmount: number;
  /** Actual federal credit value = federalTotalCreditAmount × 15% */
  federalCreditValue: number;

  // Ontario amounts (ON428)
  /** Ontario base credit amount ($9,286 or $0) — before applying 5.05% */
  ontarioBaseAmount: number;
  /** Ontario child supplement credit amount ($5,416 if under 18, else $0) */
  ontarioSupplementAmount: number;
  /** Total Ontario credit amount (base + supplement) */
  ontarioTotalCreditAmount: number;
  /** Actual Ontario credit value = ontarioTotalCreditAmount × 5.05% */
  ontarioCreditValue: number;

  /** True when the credit is transferred to a supporting person (ITA s.118.3(2)) */
  isTransferred: boolean;
}

// ============================================================
// COMPONENT CALCULATIONS
// ============================================================

/**
 * Calculates the federal DTC supplement for a person under 18.
 *
 * ITA s.118.3(1)(b): The supplement ($5,758) is reduced dollar-for-dollar
 * by child care expenses / attendant care deductions claimed for the disabled
 * person above a $3,302 threshold. The result cannot be negative.
 */
export function calculateFederalDTCSupplement(childCareAttendantCare: number): number {
  const { supplementUnder18, supplementClawbackThreshold } = FEDERAL_CREDITS.disabilityAmount;
  const excessCare = Math.max(0, roundCRA(childCareAttendantCare - supplementClawbackThreshold));
  return Math.max(0, roundCRA(supplementUnder18 - excessCare));
}

/**
 * Returns the Ontario DTC child supplement for a person under 18.
 * Ontario Taxation Act s.4(6): flat $5,416 — no income-tested clawback.
 */
export function calculateOntarioDTCSupplement(): number {
  return ONTARIO_CREDITS.disabilityAmount.supplementChild;
}

// ============================================================
// MAIN CALCULATION
// ============================================================

/**
 * Calculates the Disability Tax Credit (DTC) for both federal and Ontario.
 *
 * Returns credit amounts (before rate) and credit values (after rate) for
 * both levels of government.
 *
 * The `isTransferred` flag signals that the credit is claimed on the
 * supporting person's return — the engine must route the amounts accordingly.
 */
export function calculateDTC(input: DisabilityTaxCreditInput): DTCResult {
  if (!input.hasDTC) {
    return {
      federalBaseAmount: 0,
      federalSupplementAmount: 0,
      federalTotalCreditAmount: 0,
      federalCreditValue: 0,
      ontarioBaseAmount: 0,
      ontarioSupplementAmount: 0,
      ontarioTotalCreditAmount: 0,
      ontarioCreditValue: 0,
      isTransferred: false,
    };
  }

  const isUnder18 = input.ageOnDec31 < 18;

  // Federal DTC
  const federalBaseAmount = FEDERAL_CREDITS.disabilityAmount.base;
  const federalSupplementAmount = isUnder18
    ? calculateFederalDTCSupplement(input.childCareAttendantCare)
    : 0;
  const federalTotalCreditAmount = roundCRA(federalBaseAmount + federalSupplementAmount);
  const federalCreditValue = roundCRA(federalTotalCreditAmount * FEDERAL_CREDIT_RATE);

  // Ontario DTC
  const ontarioBaseAmount = ONTARIO_CREDITS.disabilityAmount.base;
  const ontarioSupplementAmount = isUnder18 ? calculateOntarioDTCSupplement() : 0;
  const ontarioTotalCreditAmount = roundCRA(ontarioBaseAmount + ontarioSupplementAmount);
  const ontarioCreditValue = roundCRA(ontarioTotalCreditAmount * ONTARIO_CREDIT_RATE);

  return {
    federalBaseAmount,
    federalSupplementAmount,
    federalTotalCreditAmount,
    federalCreditValue,
    ontarioBaseAmount,
    ontarioSupplementAmount,
    ontarioTotalCreditAmount,
    ontarioCreditValue,
    isTransferred: input.transferToSupporter,
  };
}
