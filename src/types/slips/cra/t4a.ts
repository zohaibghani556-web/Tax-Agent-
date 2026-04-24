// AUTO-GENERATED — DO NOT HAND-EDIT
// Source XSD: scripts/cra-xsds/t4a.xsd (CRA v1.26.3)
// Regenerate: npm run gen:slip-types
//
// This file provides the XSD-faithful representation of the CRA T4A slip.
// The app-layer types (box14, box16 etc.) live in src/lib/tax-engine/types.ts.
// Use XSD_BOX_MAP_T4A from box-mappings.ts to translate between layers.

import { z } from 'zod/v4';


/** T4A monetary amounts */
export interface CraXsd_T4aAmtType {
  /** Box 016 — Pension or superannuation (box016) — xsd:pens_spran_amt */
  pens_spran_amt?: number;
  /** Box 018 — Lump-sum payments (box018) — xsd:lsp_amt */
  lsp_amt?: number;
  /** Box 020 — Self-employed commissions (box020) — xsd:self_empl_cmsn_amt */
  self_empl_cmsn_amt?: number;
  /** Box 022 — Income tax deducted (box022) — xsd:itx_ddct_amt */
  itx_ddct_amt?: number;
  /** Box 024 — Annuities (box024) — xsd:annty_amt */
  annty_amt?: number;
  /** Box 048 — Fees for services (box048) — xsd:fee_or_oth_srvc_amt */
  fee_or_oth_srvc_amt?: number;
}

export const CraXsd_T4aAmtTypeSchema = z.object({
  pens_spran_amt: z.number().optional(),
  lsp_amt: z.number().optional(),
  self_empl_cmsn_amt: z.number().optional(),
  itx_ddct_amt: z.number().optional(),
  annty_amt: z.number().optional(),
  fee_or_oth_srvc_amt: z.number().optional(),
});
export type CraXsd_T4aAmtTypeInferred = z.infer<typeof CraXsd_T4aAmtTypeSchema>;

/** T4A Other Information section — optional coded fields */
export interface CraXsd_T4AOtherInformationType {
  /** Box 066 — Eligible retiring allowances (box066) — xsd:elg_rtir_amt */
  elg_rtir_amt?: number;
  /** Box 067 — Non-eligible retiring allowances (box067) — xsd:nelg_rtir_amt */
  nelg_rtir_amt?: number;
  /** Box 028 — Other income (box028) — xsd:oth_incamt */
  oth_incamt?: number;
  /** Box 150 — Patronage allocations (box150) — xsd:ptrng_aloc_amt */
  ptrng_aloc_amt?: number;
  /** Box 032 — RRSP past service contributions (box032) — xsd:rpp_past_srvc_amt */
  rpp_past_srvc_amt?: number;
  /** Box 052 — Pension adjustment (box052) — xsd:padj_amt */
  padj_amt?: number;
  /** Box 122 — RESP accumulated income payments (box122) — xsd:resp_aip_amt */
  resp_aip_amt?: number;
  /** Box 130 — RESP educational assistance payments (box130) — xsd:resp_educt_ast_amt */
  resp_educt_ast_amt?: number;
  /** Box 046 — Charitable donations (box046) — xsd:chrty_dons_amt */
  chrty_dons_amt?: number;
  /** nr_lsp_trnsf_amt — xsd:nr_lsp_trnsf_amt */
  nr_lsp_trnsf_amt?: number;
  /** Box 104 — Research grants (box104) — xsd:rsch_grnt_amt */
  rsch_grnt_amt?: number;
  /** Box 105 — Scholarships, fellowships, bursaries, artist's grants — ITA s.56(3) (box105) — xsd:brsy_amt */
  brsy_amt?: number;
  /** Box 106 — Death benefits — ITA s.248(1) (box106) — xsd:dth_ben_amt */
  dth_ben_amt?: number;
  /** Box 107 — Wage-loss replacement plan benefits (box107) — xsd:wag_ls_incamt */
  wag_ls_incamt?: number;
  /** Box 114 — Lump-sum RPP — non-eligible portion (box114) — xsd:lsp_rpp_nelg_amt */
  lsp_rpp_nelg_amt?: number;
  /** Box 115 — Non-registered pension plan amounts (box115) — xsd:nrgst_ppln_amt */
  nrgst_ppln_amt?: number;
  /** Box 116 — Lump-sum accrued before 1972 (box116) — xsd:pr_71_acr_lsp_amt */
  pr_71_acr_lsp_amt?: number;
  /** inc_avg_annty_amt — xsd:inc_avg_annty_amt */
  inc_avg_annty_amt?: number;
  /** dpsp_ins_pay_amt — xsd:dpsp_ins_pay_amt */
  dpsp_ins_pay_amt?: number;
  /** med_trvl_amt — xsd:med_trvl_amt */
  med_trvl_amt?: number;
  /** loan_ben_amt — xsd:loan_ben_amt */
  loan_ben_amt?: number;
  /** med_prem_ben_amt — xsd:med_prem_ben_amt */
  med_prem_ben_amt?: number;
  /** Box 119 — Group term life insurance benefits (box119) — xsd:grp_trm_life_amt */
  grp_trm_life_amt?: number;
  /** resp_aip_oth_amt — xsd:resp_aip_oth_amt */
  resp_aip_oth_amt?: number;
  /** ins_rvk_dpsp_amt — xsd:ins_rvk_dpsp_amt */
  ins_rvk_dpsp_amt?: number;
  /** brd_wrk_site_amt — xsd:brd_wrk_site_amt */
  brd_wrk_site_amt?: number;
  /** Box 131 — Disability benefits (box131) — xsd:dsblt_ben_amt */
  dsblt_ben_amt?: number;
  /** cntrbr_prr_pspp_cnamt — xsd:cntrbr_prr_pspp_cnamt */
  cntrbr_prr_pspp_cnamt?: number;
  /** Box 133 — Veterans benefits (box133) — xsd:vtrn_ben_amt */
  vtrn_ben_amt?: number;
  /** tx_dfr_ptrng_dvamt — xsd:tx_dfr_ptrng_dvamt */
  tx_dfr_ptrng_dvamt?: number;
  /** atp_inctv_grnt_amt — xsd:atp_inctv_grnt_amt */
  atp_inctv_grnt_amt?: number;
  /** rdsp_amt — xsd:rdsp_amt */
  rdsp_amt?: number;
  /** Box 138 — Wage Earner Protection Program (box138) — xsd:wag_ptct_pgm_amt */
  wag_ptct_pgm_amt?: number;
  /** var_pens_ben_amt — xsd:var_pens_ben_amt */
  var_pens_ben_amt?: number;
  /** Box 145 — TFSA taxable amounts (box145) — xsd:tfsa_tax_amt */
  tfsa_tax_amt?: number;
  /** rcpnt_pay_prem_phsp_amt — xsd:rcpnt_pay_prem_phsp_amt */
  rcpnt_pay_prem_phsp_amt?: number;
  /** pmmc_isg_amt — xsd:pmmc_isg_amt */
  pmmc_isg_amt?: number;
  /** Box 068 — Indian — eligible retiring allowances (box068) — xsd:indn_elg_rtir_amt */
  indn_elg_rtir_amt?: number;
  /** Box 069 — Indian — non-eligible retiring allowances (box069) — xsd:indn_nelg_rtir_amt */
  indn_nelg_rtir_amt?: number;
  /** Box 070 — Indian — other income exempt under ITA s.87 (box070) — xsd:indn_oth_incamt */
  indn_oth_incamt?: number;
  /** Box 071 — Indian — exempt pension income (box071) — xsd:indn_xmpt_pens_amt */
  indn_xmpt_pens_amt?: number;
  /** Box 072 — Indian — exempt lump-sum payments (box072) — xsd:indn_xmpt_lsp_amt */
  indn_xmpt_lsp_amt?: number;
  /** lbr_adj_ben_aprpt_act_amt — xsd:lbr_adj_ben_aprpt_act_amt */
  lbr_adj_ben_aprpt_act_amt?: number;
  /** subp_qlf_amt — xsd:subp_qlf_amt */
  subp_qlf_amt?: number;
  /** csh_awrd_pze_payr_amt — xsd:csh_awrd_pze_payr_amt */
  csh_awrd_pze_payr_amt?: number;
  /** bkcy_sttl_amt — xsd:bkcy_sttl_amt */
  bkcy_sttl_amt?: number;
  /** lsp_nelg_trnsf_amt — xsd:lsp_nelg_trnsf_amt */
  lsp_nelg_trnsf_amt?: number;
  /** ncntrbr_prr_pspp_cnamt — xsd:ncntrbr_prr_pspp_cnamt */
  ncntrbr_prr_pspp_cnamt?: number;
  /** lsp_dpsp_nelg_amt — xsd:lsp_dpsp_nelg_amt */
  lsp_dpsp_nelg_amt?: number;
  /** lsp_nrgst_pens_amt — xsd:lsp_nrgst_pens_amt */
  lsp_nrgst_pens_amt?: number;
  /** prpp_tx_inc_pamt — xsd:prpp_tx_inc_pamt */
  prpp_tx_inc_pamt?: number;
  /** prpp_txmpt_inc_pamt — xsd:prpp_txmpt_inc_pamt */
  prpp_txmpt_inc_pamt?: number;
  /** Box 151 — Adult Basic Education tuition assistance (box151) — xsd:abe_tuit_ast_amt */
  abe_tuit_ast_amt?: number;
  /** Box 133 — Veterans benefit eligible for pension income splitting (box133) — xsd:vtrn_ben_pens_splt_elg_amt */
  vtrn_ben_pens_splt_elg_amt?: number;
  /** Box 148 — Advanced life deferred annuity (signed — may be negative) (box148) — xsd:alda_amt */
  alda_amt?: number;
  /** prov_trty_emrg_ben_amt — xsd:prov_trty_emrg_ben_amt */
  prov_trty_emrg_ben_amt?: number;
  /** repmt_covid_fncl_asstnc — xsd:repmt_covid_fncl_asstnc */
  repmt_covid_fncl_asstnc?: number;
  /** Box 152 — OAS lump-sum payments (box152) — xsd:oas_lump_sum_pamt */
  oas_lump_sum_pamt?: number;
  /** Box 134 — Post-doctoral fellowship income (box134) — xsd:pst_dctrl_fshp_amt */
  pst_dctrl_fshp_amt?: number;
}

export const CraXsd_T4AOtherInformationTypeSchema = z.object({
  elg_rtir_amt: z.number().optional(),
  nelg_rtir_amt: z.number().optional(),
  oth_incamt: z.number().optional(),
  ptrng_aloc_amt: z.number().optional(),
  rpp_past_srvc_amt: z.number().optional(),
  padj_amt: z.number().optional(),
  resp_aip_amt: z.number().optional(),
  resp_educt_ast_amt: z.number().optional(),
  chrty_dons_amt: z.number().optional(),
  nr_lsp_trnsf_amt: z.number().optional(),
  rsch_grnt_amt: z.number().optional(),
  brsy_amt: z.number().optional(),
  dth_ben_amt: z.number().optional(),
  wag_ls_incamt: z.number().optional(),
  lsp_rpp_nelg_amt: z.number().optional(),
  nrgst_ppln_amt: z.number().optional(),
  pr_71_acr_lsp_amt: z.number().optional(),
  inc_avg_annty_amt: z.number().optional(),
  dpsp_ins_pay_amt: z.number().optional(),
  med_trvl_amt: z.number().optional(),
  loan_ben_amt: z.number().optional(),
  med_prem_ben_amt: z.number().optional(),
  grp_trm_life_amt: z.number().optional(),
  resp_aip_oth_amt: z.number().optional(),
  ins_rvk_dpsp_amt: z.number().optional(),
  brd_wrk_site_amt: z.number().optional(),
  dsblt_ben_amt: z.number().optional(),
  cntrbr_prr_pspp_cnamt: z.number().optional(),
  vtrn_ben_amt: z.number().optional(),
  tx_dfr_ptrng_dvamt: z.number().optional(),
  atp_inctv_grnt_amt: z.number().optional(),
  rdsp_amt: z.number().optional(),
  wag_ptct_pgm_amt: z.number().optional(),
  var_pens_ben_amt: z.number().optional(),
  tfsa_tax_amt: z.number().optional(),
  rcpnt_pay_prem_phsp_amt: z.number().optional(),
  pmmc_isg_amt: z.number().optional(),
  indn_elg_rtir_amt: z.number().optional(),
  indn_nelg_rtir_amt: z.number().optional(),
  indn_oth_incamt: z.number().optional(),
  indn_xmpt_pens_amt: z.number().optional(),
  indn_xmpt_lsp_amt: z.number().optional(),
  lbr_adj_ben_aprpt_act_amt: z.number().optional(),
  subp_qlf_amt: z.number().optional(),
  csh_awrd_pze_payr_amt: z.number().optional(),
  bkcy_sttl_amt: z.number().optional(),
  lsp_nelg_trnsf_amt: z.number().optional(),
  ncntrbr_prr_pspp_cnamt: z.number().optional(),
  lsp_dpsp_nelg_amt: z.number().optional(),
  lsp_nrgst_pens_amt: z.number().optional(),
  prpp_tx_inc_pamt: z.number().optional(),
  prpp_txmpt_inc_pamt: z.number().optional(),
  abe_tuit_ast_amt: z.number().optional(),
  vtrn_ben_pens_splt_elg_amt: z.number().optional(),
  alda_amt: z.number().optional(),
  prov_trty_emrg_ben_amt: z.number().optional(),
  repmt_covid_fncl_asstnc: z.number().optional(),
  oas_lump_sum_pamt: z.number().optional(),
  pst_dctrl_fshp_amt: z.number().optional(),
});
export type CraXsd_T4AOtherInformationTypeInferred = z.infer<typeof CraXsd_T4AOtherInformationTypeSchema>;

/** T4A T4AAdditionalInformationType */
export interface CraXsd_T4AAdditionalInformationType {
  /** Spousal DPSP contribution indicator (addInfoSpousalContrib) — xsd:spp_sps_cntrb_ind */
  spp_sps_cntrb_ind?: '0' | '1';
  /** Spousal contributor SIN (addInfoSpousalSIN) — xsd:spp_sps_cntrbr_sin */
  spp_sps_cntrbr_sin?: string;
}

export const CraXsd_T4AAdditionalInformationTypeSchema = z.object({
  spp_sps_cntrb_ind: z.enum(['0', '1']).optional(),
  spp_sps_cntrbr_sin: z.string().optional(),
});
export type CraXsd_T4AAdditionalInformationTypeInferred = z.infer<typeof CraXsd_T4AAdditionalInformationTypeSchema>;

/** T4A — Statement of Pension, Retirement, Annuity, and Other Income */
export interface CraXsd_T4ASlipType {
  /** Recipient name — xsd:RCPNT_NM */
  RCPNT_NM?: Record<string, unknown>;
  /** Social Insurance Number — xsd:sin */
  sin: string;
  /** Recipient business number — xsd:rcpnt_bn */
  rcpnt_bn: string;
  /** Recipient corporation name — xsd:RCPNT_CORP_NM */
  RCPNT_CORP_NM?: Record<string, unknown>;
  /** Recipient address — xsd:RCPNT_ADDR */
  RCPNT_ADDR?: Record<string, unknown>;
  /** Recipient number (payer-assigned) — xsd:rcpnt_nbr */
  rcpnt_nbr?: string;
  /** Payer business number (RP account) — xsd:bn */
  bn: string;
  /** Payer dental benefits code — xsd:payr_dntl_ben_rpt_cd */
  payr_dntl_ben_rpt_cd?: 1 | 2 | 3 | 4 | 5;
  /** PPIP or DPSP registration number — xsd:ppln_dpsp_rgst_nbr */
  ppln_dpsp_rgst_nbr?: string;
  /** Report type code — xsd:rpt_tcd */
  rpt_tcd: 'A' | 'M' | 'O' | 'C';
  /** T4A main monetary amounts — xsd:T4A_AMT */
  T4A_AMT?: CraXsd_T4aAmtType;
  /** Other Information section — up to 12 coded boxes — xsd:OTH_INFO */
  OTH_INFO?: CraXsd_T4AOtherInformationType;
  /** Additional information (spousal DPSP) — xsd:ADD_INFO */
  ADD_INFO?: CraXsd_T4AAdditionalInformationType;
}

export const CraXsd_T4ASlipTypeSchema = z.object({
  RCPNT_NM: z.record(z.string(), z.unknown()).optional(),
  sin: z.string().regex(/^\d{1,9}$/),
  rcpnt_bn: z.string(),
  RCPNT_CORP_NM: z.record(z.string(), z.unknown()).optional(),
  RCPNT_ADDR: z.record(z.string(), z.unknown()).optional(),
  rcpnt_nbr: z.string().max(20).optional(),
  bn: z.string(),
  payr_dntl_ben_rpt_cd: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  ppln_dpsp_rgst_nbr: z.string().optional(),
  rpt_tcd: z.enum(['A', 'M', 'O', 'C']),
  T4A_AMT: CraXsd_T4aAmtTypeSchema.optional(),
  OTH_INFO: CraXsd_T4AOtherInformationTypeSchema.optional(),
  ADD_INFO: CraXsd_T4AAdditionalInformationTypeSchema.optional(),
});
export type CraXsd_T4ASlipTypeInferred = z.infer<typeof CraXsd_T4ASlipTypeSchema>;