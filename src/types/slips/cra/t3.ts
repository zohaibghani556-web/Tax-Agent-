// AUTO-GENERATED — DO NOT HAND-EDIT
// Source XSD: scripts/cra-xsds/t3.xsd (CRA v1.26.3)
// Regenerate: npm run gen:slip-types
//
// This file provides the XSD-faithful representation of the CRA T3 slip.
// The app-layer types (box14, box16 etc.) live in src/lib/tax-engine/types.ts.
// Use XSD_BOX_MAP_T3 from box-mappings.ts to translate between layers.

import { z } from 'zod/v4';


/** T3 monetary amounts */
export interface CraXsd_T3AmountType {
  /** Box 21 — Total capital gains (see prd_2/prd_3 for Budget 2024 split) (box21) — xsd:cgamt */
  cgamt?: number;
  /** Box 22 — Actual eligible dividends (box22) — xsd:actl_elg_dvamt */
  actl_elg_dvamt?: number;
  /** Box 32 — Actual non-eligible (other) dividends (box32) — xsd:actl_dvnd_amt */
  actl_dvnd_amt?: number;
  /** Box 26 — Other income (box26) — xsd:oth_incamt */
  oth_incamt?: number;
  /** Box 30 — Capital gains eligible for deduction (box30) — xsd:elg_dedn_cgamt */
  elg_dedn_cgamt?: number;
  /** Box 23 — Taxable eligible dividends (box23) — xsd:tx_elg_dvnd_pamt */
  tx_elg_dvnd_pamt?: number;
  /** Box 33 — Taxable other (non-eligible) dividends (box33) — xsd:tx_dvnd_amt */
  tx_dvnd_amt?: number;
  /** Box 24 — Enhanced dividend tax credit (eligible) (box24) — xsd:enhn_dvtc_amt */
  enhn_dvtc_amt?: number;
  /** Box 39 — Dividend tax credit (non-eligible) (box39) — xsd:dvnd_tx_cr_amt */
  dvnd_tx_cr_amt?: number;
  /** Box 21A — Capital gains Period 2 (Jan 1 – Jun 24, 2024, 50% inclusion rate) (box21A) — xsd:prd_2_cgamt */
  prd_2_cgamt?: number;
  /** Box 21B — Capital gains Period 3 (Jun 25 – Dec 31, 2024, 66.67% inclusion rate) (box21B) — xsd:prd_3_cgamt */
  prd_3_cgamt?: number;
  /** Box 21C — Eligible capital gains Period 2 (box21C) — xsd:prd_2_elg_cgamt */
  prd_2_elg_cgamt?: number;
  /** Box 21D — Eligible capital gains Period 3 (box21D) — xsd:prd_3_elg_cgamt */
  prd_3_elg_cgamt?: number;
  /** Box 21E — Insurance segregated fund Period 2 (box21E) — xsd:prd_2_insu_clamt */
  prd_2_insu_clamt?: number;
  /** Box 21F — Insurance segregated fund Period 3 (box21F) — xsd:prd_3_insu_clamt */
  prd_3_insu_clamt?: number;
}

export const CraXsd_T3AmountTypeSchema = z.object({
  cgamt: z.number().optional(),
  actl_elg_dvamt: z.number().optional(),
  actl_dvnd_amt: z.number().optional(),
  oth_incamt: z.number().optional(),
  elg_dedn_cgamt: z.number().optional(),
  tx_elg_dvnd_pamt: z.number().optional(),
  tx_dvnd_amt: z.number().optional(),
  enhn_dvtc_amt: z.number().optional(),
  dvnd_tx_cr_amt: z.number().optional(),
  prd_2_cgamt: z.number().optional(),
  prd_3_cgamt: z.number().optional(),
  prd_2_elg_cgamt: z.number().optional(),
  prd_3_elg_cgamt: z.number().optional(),
  prd_2_insu_clamt: z.number().optional(),
  prd_3_insu_clamt: z.number().optional(),
});
export type CraXsd_T3AmountTypeInferred = z.infer<typeof CraXsd_T3AmountTypeSchema>;

/** T3 Other Information section — optional coded fields */
export interface CraXsd_OtherT3InformationType {
  /** Box 31 — Pension and lump-sum payments (box31) — xsd:pens_lsp_amt */
  pens_lsp_amt?: number;
  /** Box 34 — Foreign business income (box34) — xsd:fgn_bus_incamt */
  fgn_bus_incamt?: number;
  /** Box 25 — Foreign non-business income (box25) — xsd:fgn_nbus_incamt */
  fgn_nbus_incamt?: number;
  /** Box 31B — Eligible pension income (eligible for pension income splitting) (box31B) — xsd:elg_pens_incamt */
  elg_pens_incamt?: number;
  /** Box 36 — Foreign business income tax paid (box36) — xsd:fgn_bus_tx_amt */
  fgn_bus_tx_amt?: number;
  /** Box 37 — Foreign non-business income tax paid (box37) — xsd:fgn_tx_amt */
  fgn_tx_amt?: number;
  /** Box 41 — Death benefits (box41) — xsd:dth_ben_amt */
  dth_ben_amt?: number;
  /** Box 42 — Insurance segregated funds (box42) — xsd:insu_fnd_clamt */
  insu_fnd_clamt?: number;
  /** Box 43 — Part XII.2 tax credit (box43) — xsd:XII_2_tx_cr_amt */
  XII_2_tx_cr_amt?: number;
  /** Box 44 — Investment expense (box44) — xsd:invs_cost_examt */
  invs_cost_examt?: number;
  /** Box 45 — Investment tax credit (box45) — xsd:itc_amt */
  itc_amt?: number;
  /** Box 46 — Other credits (box46) — xsd:oth_cr_amt */
  oth_cr_amt?: number;
  /** Box 26B — Amount resulting from ACB reduction (box26B) — xsd:amt_rslt_acb_amt */
  amt_rslt_acb_amt?: number;
  /** Box 47 — Amounts eligible for pension transfer (box47) — xsd:pens_trnsf_amt */
  pens_trnsf_amt?: number;
  /** Box 48 — Retirement allowances (box48) — xsd:rtir_alwnc_amt */
  rtir_alwnc_amt?: number;
  /** Box 49 — Charitable donations (box49) — xsd:chrty_dons_amt */
  chrty_dons_amt?: number;
  /** Box 21G — Capital gains on dispositions — before June 25, 2024 (box21G) — xsd:cg_disp_bef_jun_amt */
  cg_disp_bef_jun_amt?: number;
  /** Box 21H — Capital gains on dispositions — after June 25, 2024 (box21H) — xsd:cg_disp_after_jun_amt */
  cg_disp_after_jun_amt?: number;
  /** Box 21I — QFFP dispositions — before June 25, 2024 (box21I) — xsd:cg_disp_qffp_bef_jun_amt */
  cg_disp_qffp_bef_jun_amt?: number;
  /** Box 21J — QFFP dispositions — after June 25, 2024 (box21J) — xsd:cg_disp_qffp_after_jun_amt */
  cg_disp_qffp_after_jun_amt?: number;
  /** Box 21K — QSBCS dispositions — before June 25, 2024 (box21K) — xsd:cg_disp_qsbcs_bef_jun_amt */
  cg_disp_qsbcs_bef_jun_amt?: number;
  /** Box 21L — QSBCS dispositions — after June 25, 2024 (box21L) — xsd:cg_disp_qsbcs_after_jun_amt */
  cg_disp_qsbcs_after_jun_amt?: number;
  /** Box 21M — Insurance segregated funds — before June 25, 2024 (box21M) — xsd:ins_seg_bef_jun_amt */
  ins_seg_bef_jun_amt?: number;
  /** Box 21N — Insurance segregated funds — after June 25, 2024 (box21N) — xsd:ins_seg_after_jun_amt */
  ins_seg_after_jun_amt?: number;
}

export const CraXsd_OtherT3InformationTypeSchema = z.object({
  pens_lsp_amt: z.number().optional(),
  fgn_bus_incamt: z.number().optional(),
  fgn_nbus_incamt: z.number().optional(),
  elg_pens_incamt: z.number().optional(),
  fgn_bus_tx_amt: z.number().optional(),
  fgn_tx_amt: z.number().optional(),
  dth_ben_amt: z.number().optional(),
  insu_fnd_clamt: z.number().optional(),
  XII_2_tx_cr_amt: z.number().optional(),
  invs_cost_examt: z.number().optional(),
  itc_amt: z.number().optional(),
  oth_cr_amt: z.number().optional(),
  amt_rslt_acb_amt: z.number().optional(),
  pens_trnsf_amt: z.number().optional(),
  rtir_alwnc_amt: z.number().optional(),
  chrty_dons_amt: z.number().optional(),
  cg_disp_bef_jun_amt: z.number().optional(),
  cg_disp_after_jun_amt: z.number().optional(),
  cg_disp_qffp_bef_jun_amt: z.number().optional(),
  cg_disp_qffp_after_jun_amt: z.number().optional(),
  cg_disp_qsbcs_bef_jun_amt: z.number().optional(),
  cg_disp_qsbcs_after_jun_amt: z.number().optional(),
  ins_seg_bef_jun_amt: z.number().optional(),
  ins_seg_after_jun_amt: z.number().optional(),
});
export type CraXsd_OtherT3InformationTypeInferred = z.infer<typeof CraXsd_OtherT3InformationTypeSchema>;

/** T3 — Statement of Trust Income Allocations and Designations */
export interface CraXsd_T3SlipType {
  /** Beneficiary name — xsd:BNFY_NM */
  BNFY_NM?: Record<string, unknown>;
  /** Second beneficiary name — xsd:SEC_BNFY_NM */
  SEC_BNFY_NM?: Record<string, unknown>;
  /** Enterprise beneficiary name — xsd:ENTPRS_BNFY_NM */
  ENTPRS_BNFY_NM?: Record<string, unknown>;
  /** Beneficiary address — xsd:BNFY_ADDR */
  BNFY_ADDR?: Record<string, unknown>;
  /** Social Insurance Number — xsd:sin */
  sin: string;
  /** Business number — xsd:bn */
  bn: string;
  /** Beneficiary trust account number — xsd:bnfy_tr_acct_nbr */
  bnfy_tr_acct_nbr: string;
  /** Trust account number — xsd:tr_acct_nbr */
  tr_acct_nbr: string;
  /** Report type code — xsd:rpt_tcd */
  rpt_tcd: 'A' | 'M' | 'O' | 'C';
  /** Beneficiary code (1–5) — xsd:bnfy_cd */
  bnfy_cd: '1' | '2' | '3' | '4' | '5';
  /** Investment tax credit type code — xsd:itc_cd */
  itc_cd?: string;
  /** T3 monetary amounts — xsd:T3_AMT */
  T3_AMT?: CraXsd_T3AmountType;
  /** Other Information section — up to 6 coded boxes — xsd:OTH_INFO */
  OTH_INFO?: CraXsd_OtherT3InformationType;
}

export const CraXsd_T3SlipTypeSchema = z.object({
  BNFY_NM: z.record(z.string(), z.unknown()).optional(),
  SEC_BNFY_NM: z.record(z.string(), z.unknown()).optional(),
  ENTPRS_BNFY_NM: z.record(z.string(), z.unknown()).optional(),
  BNFY_ADDR: z.record(z.string(), z.unknown()).optional(),
  sin: z.string().regex(/^\d{1,9}$/),
  bn: z.string(),
  bnfy_tr_acct_nbr: z.string(),
  tr_acct_nbr: z.string(),
  rpt_tcd: z.enum(['A', 'M', 'O', 'C']),
  bnfy_cd: z.enum(['1', '2', '3', '4', '5']),
  itc_cd: z.string().max(2).optional(),
  T3_AMT: CraXsd_T3AmountTypeSchema.optional(),
  OTH_INFO: CraXsd_OtherT3InformationTypeSchema.optional(),
});
export type CraXsd_T3SlipTypeInferred = z.infer<typeof CraXsd_T3SlipTypeSchema>;