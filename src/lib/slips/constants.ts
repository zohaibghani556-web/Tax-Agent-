/**
 * TaxAgent.ai — Slip Extraction Constants
 *
 * Central list of all slip types that the system supports for extraction.
 * This constant is used by the pipeline, schemas, and UI to determine
 * which slip types are fully implemented.
 */

import type { ExtractableSlipType } from '../extraction/types';

/**
 * All slip types that have a complete extraction schema and validation logic.
 * This list must be kept in sync with:
 *   - The `ExtractableSlipType` union in `../extraction/types.ts`
 *   - The `TaxSlip` union in `../tax-engine/types.ts`
 *   - The Zod schemas in `../slips/schemas.ts`
 *   - The pattern‑matching rules in `./slip-router.ts`
 */
export const SUPPORTED_SLIP_TYPES: readonly ExtractableSlipType[] = [
  't4',
  't4a',
  't5',
  't3',
  't2202',
  't5008',
  't4e',
  't5007',
  't4ap',
  't4aoas',
  't4rsp',
  't4rif',
  'rrsp_receipt',
  't4fhsa',
] as const;

/**
 * Human‑readable labels for each supported slip type.
 */
export const SLIP_TYPE_LABELS: Record<ExtractableSlipType, string> = {
  t4: 'T4 – Statement of Remuneration Paid',
  t4a: 'T4A – Statement of Pension, Retirement, Annuity and Other Income',
  t5: 'T5 – Statement of Investment Income',
  t3: 'T3 – Statement of Trust Income Allocations and Designations',
  t2202: 'T2202 – Tuition and Enrolment Certificate',
  t5008: 'T5008 – Statement of Securities Transactions',
  t4e: 'T4E – Statement of Employment Insurance and Other Benefits',
  t5007: 'T5007 – Statement of Benefits',
  t4ap: 'T4A(P) – Statement of Canada Pension Plan Benefits',
  t4aoas: 'T4A(OAS) – Statement of Old Age Security',
  t4rsp: 'T4RSP – Statement of RRSP Income',
  t4rif: 'T4RIF – Statement of Income from a Registered Retirement Income Fund',
  rrsp_receipt: 'RRSP Receipt – Contribution Receipt',
  t4fhsa: 'T4FHSA – Statement of First Home Savings Account Activity',
};
