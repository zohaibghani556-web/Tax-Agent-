// AUTO-GENERATED — DO NOT HAND-EDIT
// Source XSD: scripts/cra-xsds/t5.xsd (CRA v1.26.3)
// Regenerate: npm run gen:slip-types
//
// This file provides the XSD-faithful representation of the CRA T5 slip.
// The app-layer types (box14, box16 etc.) live in src/lib/tax-engine/types.ts.
// Use XSD_BOX_MAP_T5 from box-mappings.ts to translate between layers.

import { z } from 'zod/v4';


/** T5 monetary amounts */
export interface CraXsd_T5AmountType {
  /** Box 24 — Actual eligible dividends (box24) — xsd:actl_elg_dvamt */
  actl_elg_dvamt?: number;
  /** Box 12 — Actual non-eligible dividends (box12) — xsd:actl_dvnd_amt */
  actl_dvnd_amt?: number;
  /** Box 25 — Taxable eligible dividends (box25) — xsd:tx_elg_dvnd_pamt */
  tx_elg_dvnd_pamt?: number;
  /** Box 11 — Taxable non-eligible dividends (box11) — xsd:tx_dvnd_amt */
  tx_dvnd_amt?: number;
  /** Box 26 — Dividend tax credit for eligible dividends (box26) — xsd:enhn_dvtc_amt */
  enhn_dvtc_amt?: number;
  /** Dividend tax credit for non-eligible dividends (box12B) — xsd:dvnd_tx_cr_amt */
  dvnd_tx_cr_amt?: number;
  /** Box 13 — Interest from Canadian sources (box13) — xsd:cdn_int_amt */
  cdn_int_amt?: number;
  /** Box 14 — Other income from Canadian sources (box14) — xsd:oth_cdn_incamt */
  oth_cdn_incamt?: number;
  /** Box 15 — Foreign income (box15) — xsd:fgn_incamt */
  fgn_incamt?: number;
  /** Box 16 — Foreign tax paid (box16) — xsd:fgn_tx_pay_amt */
  fgn_tx_pay_amt?: number;
  /** Box 17 — Royalties from Canadian sources (box17) — xsd:cdn_royl_amt */
  cdn_royl_amt?: number;
  /** Box 18 — Capital gains dividends (box18) — xsd:cgain_dvnd_amt */
  cgain_dvnd_amt?: number;
  /** Box 19 — Accrued income from annuities (box19) — xsd:acr_annty_amt */
  acr_annty_amt?: number;
  /** Box 20 — Resource allowance (box20) — xsd:rsrc_alwnc_amt */
  rsrc_alwnc_amt?: number;
  /** Capital gains dividends — type 1 (box18A) — xsd:cgain_dvnd_1_amt */
  cgain_dvnd_1_amt?: number;
  /** Capital gains dividends — type 2 (box18B) — xsd:cgain_dvnd_2_amt */
  cgain_dvnd_2_amt?: number;
  /** Locked-in account accrued interest (box19B) — xsd:lk_nt_acr_intamt */
  lk_nt_acr_intamt?: number;
  /** Capital gains dividends — Jan 1 to Jun 24, 2024 (Budget 2024 rate change) (box18C) — xsd:cgain_dvnd_jan_to_jun_2024 */
  cgain_dvnd_jan_to_jun_2024?: number;
}

export const CraXsd_T5AmountTypeSchema = z.object({
  actl_elg_dvamt: z.number().optional(),
  actl_dvnd_amt: z.number().optional(),
  tx_elg_dvnd_pamt: z.number().optional(),
  tx_dvnd_amt: z.number().optional(),
  enhn_dvtc_amt: z.number().optional(),
  dvnd_tx_cr_amt: z.number().optional(),
  cdn_int_amt: z.number().optional(),
  oth_cdn_incamt: z.number().optional(),
  fgn_incamt: z.number().optional(),
  fgn_tx_pay_amt: z.number().optional(),
  cdn_royl_amt: z.number().optional(),
  cgain_dvnd_amt: z.number().optional(),
  acr_annty_amt: z.number().optional(),
  rsrc_alwnc_amt: z.number().optional(),
  cgain_dvnd_1_amt: z.number().optional(),
  cgain_dvnd_2_amt: z.number().optional(),
  lk_nt_acr_intamt: z.number().optional(),
  cgain_dvnd_jan_to_jun_2024: z.number().optional(),
});
export type CraXsd_T5AmountTypeInferred = z.infer<typeof CraXsd_T5AmountTypeSchema>;

/** T5 — Statement of Investment Income */
export interface CraXsd_T5SlipType {
  /** Recipient name — xsd:RCPNT_NM */
  RCPNT_NM?: Record<string, unknown>;
  /** Second recipient name — xsd:SEC_RCPNT_NM */
  SEC_RCPNT_NM?: Record<string, unknown>;
  /** Social Insurance Number (box12) — xsd:sin */
  sin: string;
  /** Recipient business or trust number — xsd:slp_rcpnt_bn */
  slp_rcpnt_bn: string;
  /** Recipient trust account number — xsd:rcpnt_tr_acct_nbr */
  rcpnt_tr_acct_nbr: string;
  /** Business name — xsd:BUS_NM */
  BUS_NM?: Record<string, unknown>;
  /** Recipient address — xsd:RCPNT_ADDR */
  RCPNT_ADDR?: Record<string, unknown>;
  /** Payer business or FIN number — xsd:bn */
  bn: string;
  /** Financial institution branch number — xsd:rcpnt_fi_br_nbr */
  rcpnt_fi_br_nbr: string;
  /** Financial institution account number — xsd:rcpnt_fi_acct_nbr */
  rcpnt_fi_acct_nbr: string;
  /** Report type code — xsd:rpt_tcd */
  rpt_tcd: 'A' | 'M' | 'O' | 'C';
  /** Recipient type code (1–5) — xsd:rcpnt_tcd */
  rcpnt_tcd: '1' | '2' | '3' | '4' | '5';
  /** Foreign currency code (if amounts in foreign currency) — xsd:fgn_crcy_ind */
  fgn_crcy_ind?: string;
  /** T5 monetary amounts — xsd:T5_AMT */
  T5_AMT?: CraXsd_T5AmountType;
}

export const CraXsd_T5SlipTypeSchema = z.object({
  RCPNT_NM: z.record(z.string(), z.unknown()).optional(),
  SEC_RCPNT_NM: z.record(z.string(), z.unknown()).optional(),
  sin: z.string().regex(/^\d{1,9}$/),
  slp_rcpnt_bn: z.string(),
  rcpnt_tr_acct_nbr: z.string(),
  BUS_NM: z.record(z.string(), z.unknown()).optional(),
  RCPNT_ADDR: z.record(z.string(), z.unknown()).optional(),
  bn: z.string(),
  rcpnt_fi_br_nbr: z.string().max(8),
  rcpnt_fi_acct_nbr: z.string().max(12),
  rpt_tcd: z.enum(['A', 'M', 'O', 'C']),
  rcpnt_tcd: z.enum(['1', '2', '3', '4', '5']),
  fgn_crcy_ind: z.string().max(3).optional(),
  T5_AMT: CraXsd_T5AmountTypeSchema.optional(),
});
export type CraXsd_T5SlipTypeInferred = z.infer<typeof CraXsd_T5SlipTypeSchema>;