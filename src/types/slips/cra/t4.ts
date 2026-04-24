// AUTO-GENERATED — DO NOT HAND-EDIT
// Source XSD: scripts/cra-xsds/t4.xsd (CRA v1.26.3)
// Regenerate: npm run gen:slip-types
//
// This file provides the XSD-faithful representation of the CRA T4 slip.
// The app-layer types (box14, box16 etc.) live in src/lib/tax-engine/types.ts.
// Use XSD_BOX_MAP_T4 from box-mappings.ts to translate between layers.

import { z } from 'zod/v4';


/** T4 monetary amounts */
export interface CraXsd_T4AmtType {
  /** Box 14 — Employment income (ITA s.5–7) (box14) — xsd:empt_incamt */
  empt_incamt?: number;
  /** Box 16 — Employee CPP contributions (box16) — xsd:cpp_cntrb_amt */
  cpp_cntrb_amt?: number;
  /** Box 16A — Employee CPP2 (second additional) contributions (box16A) — xsd:cppe_cntrb_amt */
  cppe_cntrb_amt?: number;
  /** Box 17 — Employee QPP contributions (box17) — xsd:qpp_cntrb_amt */
  qpp_cntrb_amt?: number;
  /** Box 17A — Employee QPP2 contributions (box17A) — xsd:qppe_cntrb_amt */
  qppe_cntrb_amt?: number;
  /** Box 18 — Employee EI premiums (box18) — xsd:empe_eip_amt */
  empe_eip_amt?: number;
  /** Box 20 — RPP contributions (box20) — xsd:rpp_cntrb_amt */
  rpp_cntrb_amt?: number;
  /** Box 22 — Income tax deducted (box22) — xsd:itx_ddct_amt */
  itx_ddct_amt?: number;
  /** Box 24 — EI insurable earnings (box24) — xsd:ei_insu_ern_amt */
  ei_insu_ern_amt: number;
  /** Box 26 — CPP/QPP pensionable earnings (box26) — xsd:cpp_qpp_ern_amt */
  cpp_qpp_ern_amt: number;
  /** Box 44 — Union dues (box44) — xsd:unn_dues_amt */
  unn_dues_amt?: number;
  /** Box 46 — Charitable donations (box46) — xsd:chrty_dons_amt */
  chrty_dons_amt?: number;
  /** Box 52 — Pension adjustment (box52) — xsd:padj_amt */
  padj_amt?: number;
  /** Box 55 — PPIP employee premiums (box55) — xsd:prov_pip_amt */
  prov_pip_amt?: number;
  /** Box 56 — PPIP insurable earnings (box56) — xsd:prov_insu_ern_amt */
  prov_insu_ern_amt?: number;
}

export const CraXsd_T4AmtTypeSchema = z.object({
  empt_incamt: z.number().optional(),
  cpp_cntrb_amt: z.number().optional(),
  cppe_cntrb_amt: z.number().optional(),
  qpp_cntrb_amt: z.number().optional(),
  qppe_cntrb_amt: z.number().optional(),
  empe_eip_amt: z.number().optional(),
  rpp_cntrb_amt: z.number().optional(),
  itx_ddct_amt: z.number().optional(),
  ei_insu_ern_amt: z.number(),
  cpp_qpp_ern_amt: z.number(),
  unn_dues_amt: z.number().optional(),
  chrty_dons_amt: z.number().optional(),
  padj_amt: z.number().optional(),
  prov_pip_amt: z.number().optional(),
  prov_insu_ern_amt: z.number().optional(),
});
export type CraXsd_T4AmtTypeInferred = z.infer<typeof CraXsd_T4AmtTypeSchema>;

/** T4 Other Information section — optional coded fields */
export interface CraXsd_OtherInformationType {
  /** Code 30 — Board and lodging (code30) — xsd:hm_brd_lodg_amt */
  hm_brd_lodg_amt?: number;
  /** Code 32 — Travel to a special work site (code32) — xsd:spcl_wrk_site_amt */
  spcl_wrk_site_amt?: number;
  /** Code 33 — Prescribed zone travel assistance (code33) — xsd:prscb_zn_trvl_amt */
  prscb_zn_trvl_amt?: number;
  /** Code 34 — Medical travel assistance (code34) — xsd:med_trvl_amt */
  med_trvl_amt?: number;
  /** Code 34 — Personal use of employer's automobile (code34) — xsd:prsnl_vhcl_amt */
  prsnl_vhcl_amt?: number;
  /** Code 34 — Reasonable per-km vehicle allowance (code34) — xsd:rsn_per_km_amt */
  rsn_per_km_amt?: number;
  /** Code 36 — Interest-free or low-interest loans (code36) — xsd:low_int_loan_amt */
  low_int_loan_amt?: number;
  /** Code 37 — Employee home-relocation loan deduction (code37) — xsd:empe_hm_loan_amt */
  empe_hm_loan_amt?: number;
  /** Code 38 — Security options benefits (before June 25, 2024) (code38) — xsd:stok_opt_ben_amt */
  stok_opt_ben_amt?: number;
  /** Code 38 — Security options benefit where deferral election filed (code38) — xsd:sob_a00_feb_amt */
  sob_a00_feb_amt?: number;
  /** Code 39 — Security options deduction s.110(1)(d) (code39) — xsd:shr_opt_d_ben_amt */
  shr_opt_d_ben_amt?: number;
  /** Code 39 — Security options deduction s.110(1)(d) with deferral (code39) — xsd:sod_d_a00_feb_amt */
  sod_d_a00_feb_amt?: number;
  /** Code 40 — Other taxable allowances and benefits (code40) — xsd:oth_tx_ben_amt */
  oth_tx_ben_amt?: number;
  /** Code 41 — Security options deduction s.110(1)(d.1) (code41) — xsd:shr_opt_d1_ben_amt */
  shr_opt_d1_ben_amt?: number;
  /** Code 41 — Security options deduction s.110(1)(d.1) with deferral (code41) — xsd:sod_d1_a00_feb_amt */
  sod_d1_a00_feb_amt?: number;
  /** Code 42 — Employment commissions (code42) — xsd:empt_cmsn_amt */
  empt_cmsn_amt?: number;
  /** Code 43 — Canadian Forces personnel and police deduction (code43) — xsd:cfppa_amt */
  cfppa_amt?: number;
  /** Code 53 — Deferred security options benefit (code53) — xsd:dfr_sob_amt */
  dfr_sob_amt?: number;
  /** Code 66 — Eligible retiring allowances (code66) — xsd:elg_rtir_amt */
  elg_rtir_amt?: number;
  /** Code 67 — Non-eligible retiring allowances (code67) — xsd:nelg_rtir_amt */
  nelg_rtir_amt?: number;
  /** Code 68 — Indian — eligible retiring allowances (code68) — xsd:indn_elg_rtir_amt */
  indn_elg_rtir_amt?: number;
  /** Code 69 — Indian — non-eligible retiring allowances (code69) — xsd:indn_nelg_rtir_amt */
  indn_nelg_rtir_amt?: number;
  /** Code 43 — Municipal officer's expense allowance (code43) — xsd:mun_ofcr_examt */
  mun_ofcr_examt?: number;
  /** Code 71 — Indian employment income — ITA s.81 exempt (code71) — xsd:indn_empe_amt */
  indn_empe_amt?: number;
  /** Code 77 — Wage-loss replacement plan income (code77) — xsd:oc_incamt */
  oc_incamt?: number;
  /** Code 78 — Days employed in Canada (non-residents) (code78) — xsd:oc_dy_cnt */
  oc_dy_cnt?: number;
  /** Code 86 — Security options — shares sold/donated by contributor (code86) — xsd:pr_90_cntrbr_amt */
  pr_90_cntrbr_amt?: number;
  /** Code 87 — Security options — shares sold/donated by non-contributor (code87) — xsd:pr_90_ncntrbr_amt */
  pr_90_ncntrbr_amt?: number;
  /** Code 84 — Employer reimbursement by employee (code84) — xsd:cmpn_rpay_empr_amt */
  cmpn_rpay_empr_amt?: number;
  /** Code 79 — Fishers — gross earnings (code79) — xsd:fish_gro_ern_amt */
  fish_gro_ern_amt?: number;
  /** Code 80 — Fishers — net partnership amount (code80) — xsd:fish_net_ptnr_amt */
  fish_net_ptnr_amt?: number;
  /** Code 81 — Fishers — shareperson amount (code81) — xsd:fish_shr_prsn_amt */
  fish_shr_prsn_amt?: number;
  /** Code 82 — Placement or employment agency workers (code82) — xsd:plcmt_emp_agcy_amt */
  plcmt_emp_agcy_amt?: number;
  /** Code 83 — Taxi and other passenger-carrying vehicle drivers (code83) — xsd:drvr_taxis_oth_amt */
  drvr_taxis_oth_amt?: number;
  /** Code 85 — Barbers and hairdressers (code85) — xsd:brbr_hrdrssr_amt */
  brbr_hrdrssr_amt?: number;
  /** Code 84 — Public transit pass (historical) (code84) — xsd:pub_trnst_pass_amt */
  pub_trnst_pass_amt?: number;
  /** Code 85 — Employee-paid premiums for health plan — ITA s.20(1)(q) (code85) — xsd:epaid_hlth_pln_amt */
  epaid_hlth_pln_amt?: number;
  /** Code 86 — Security options used to satisfy cash-out right (code86) — xsd:stok_opt_csh_out_eamt */
  stok_opt_csh_out_eamt?: number;
  /** Code 87 — Volunteer emergency workers exempt amount (code87) — xsd:vlntr_emergencyworker_xmpt_amt */
  vlntr_emergencyworker_xmpt_amt?: number;
  /** Code 89 — Indian — tax-exempt self-employment income (code89) — xsd:indn_txmpt_sei_amt */
  indn_txmpt_sei_amt?: number;
  /** Code 77 — Leave support top-up (signed — may be negative) (code77) — xsd:lv_supp_top_up_amt */
  lv_supp_top_up_amt?: number;
  /** Code 57 — Employment income — COVID-19 subsidy period 1 (code57) — xsd:empt_inc_amt_covid_prd1 */
  empt_inc_amt_covid_prd1?: number;
  /** Code 58 — Employment income — COVID-19 subsidy period 2 (code58) — xsd:empt_inc_amt_covid_prd2 */
  empt_inc_amt_covid_prd2?: number;
  /** Code 59 — Employment income — COVID-19 subsidy period 3 (code59) — xsd:empt_inc_amt_covid_prd3 */
  empt_inc_amt_covid_prd3?: number;
  /** Code 60 — Employment income — COVID-19 subsidy period 4 (code60) — xsd:empt_inc_amt_covid_prd4 */
  empt_inc_amt_covid_prd4?: number;
  /** Code 90 — Indian — tax-exempt RPP contributions (code90) — xsd:indn_xmpt_rpp_amt */
  indn_xmpt_rpp_amt?: number;
  /** Code 91 — Indian — tax-exempt union dues (code91) — xsd:indn_xmpt_unn_amt */
  indn_xmpt_unn_amt?: number;
  /** Code 38 — Security options benefits (after June 25, 2024) (code38) — xsd:sob_after_jun2024_amt */
  sob_after_jun2024_amt?: number;
  /** Code 39 — Security options deduction s.110(1)(d) after June 25, 2024 (code39) — xsd:sod_d_after_jun2024_amt */
  sod_d_after_jun2024_amt?: number;
  /** Code 41 — Security options deduction s.110(1)(d.1) after June 25, 2024 (code41) — xsd:sod_d1_after_jun2024_amt */
  sod_d1_after_jun2024_amt?: number;
}

export const CraXsd_OtherInformationTypeSchema = z.object({
  hm_brd_lodg_amt: z.number().optional(),
  spcl_wrk_site_amt: z.number().optional(),
  prscb_zn_trvl_amt: z.number().optional(),
  med_trvl_amt: z.number().optional(),
  prsnl_vhcl_amt: z.number().optional(),
  rsn_per_km_amt: z.number().optional(),
  low_int_loan_amt: z.number().optional(),
  empe_hm_loan_amt: z.number().optional(),
  stok_opt_ben_amt: z.number().optional(),
  sob_a00_feb_amt: z.number().optional(),
  shr_opt_d_ben_amt: z.number().optional(),
  sod_d_a00_feb_amt: z.number().optional(),
  oth_tx_ben_amt: z.number().optional(),
  shr_opt_d1_ben_amt: z.number().optional(),
  sod_d1_a00_feb_amt: z.number().optional(),
  empt_cmsn_amt: z.number().optional(),
  cfppa_amt: z.number().optional(),
  dfr_sob_amt: z.number().optional(),
  elg_rtir_amt: z.number().optional(),
  nelg_rtir_amt: z.number().optional(),
  indn_elg_rtir_amt: z.number().optional(),
  indn_nelg_rtir_amt: z.number().optional(),
  mun_ofcr_examt: z.number().optional(),
  indn_empe_amt: z.number().optional(),
  oc_incamt: z.number().optional(),
  oc_dy_cnt: z.number().int().min(1).max(366).optional(),
  pr_90_cntrbr_amt: z.number().optional(),
  pr_90_ncntrbr_amt: z.number().optional(),
  cmpn_rpay_empr_amt: z.number().optional(),
  fish_gro_ern_amt: z.number().optional(),
  fish_net_ptnr_amt: z.number().optional(),
  fish_shr_prsn_amt: z.number().optional(),
  plcmt_emp_agcy_amt: z.number().optional(),
  drvr_taxis_oth_amt: z.number().optional(),
  brbr_hrdrssr_amt: z.number().optional(),
  pub_trnst_pass_amt: z.number().optional(),
  epaid_hlth_pln_amt: z.number().optional(),
  stok_opt_csh_out_eamt: z.number().optional(),
  vlntr_emergencyworker_xmpt_amt: z.number().optional(),
  indn_txmpt_sei_amt: z.number().optional(),
  lv_supp_top_up_amt: z.number().optional(),
  empt_inc_amt_covid_prd1: z.number().optional(),
  empt_inc_amt_covid_prd2: z.number().optional(),
  empt_inc_amt_covid_prd3: z.number().optional(),
  empt_inc_amt_covid_prd4: z.number().optional(),
  indn_xmpt_rpp_amt: z.number().optional(),
  indn_xmpt_unn_amt: z.number().optional(),
  sob_after_jun2024_amt: z.number().optional(),
  sod_d_after_jun2024_amt: z.number().optional(),
  sod_d1_after_jun2024_amt: z.number().optional(),
});
export type CraXsd_OtherInformationTypeInferred = z.infer<typeof CraXsd_OtherInformationTypeSchema>;

/** T4 — Statement of Remuneration Paid */
export interface CraXsd_T4SlipType {
  /** Employee name — xsd:EMPE_NM */
  EMPE_NM: Record<string, unknown>;
  /** Employee address — xsd:EMPE_ADDR */
  EMPE_ADDR?: Record<string, unknown>;
  /** Social Insurance Number (Box 12) (box12) — xsd:sin */
  sin: string;
  /** Employee number (employer-assigned) — xsd:empe_nbr */
  empe_nbr?: string;
  /** Employer business number (RP account) — xsd:bn */
  bn: string;
  /** RPP or DPSP registration number — xsd:rpp_dpsp_rgst_nbr */
  rpp_dpsp_rgst_nbr?: string;
  /** CPP/QPP exempt — 0=not exempt, 1=exempt (Box 28) (box28) — xsd:cpp_qpp_xmpt_cd */
  cpp_qpp_xmpt_cd: '0' | '1';
  /** EI exempt — 0=not exempt, 1=exempt (Box 29) (box29) — xsd:ei_xmpt_cd */
  ei_xmpt_cd: '0' | '1';
  /** Provincial parental insurance plan exempt — xsd:prov_pip_xmpt_cd */
  prov_pip_xmpt_cd?: '0' | '1';
  /** Employment code (Box 29) (box29) — xsd:empt_cd */
  empt_cd?: 11 | 12 | 13 | 14 | 15 | 16 | 17;
  /** Report type code: A=original, M=amended, O=cancelled, C=added — xsd:rpt_tcd */
  rpt_tcd: 'A' | 'M' | 'O' | 'C';
  /** Province of employment (Box 10) (box10) — xsd:empt_prov_cd */
  empt_prov_cd: string;
  /** Employer dental benefits code 1–5 (Box 45) (box45) — xsd:empr_dntl_ben_rpt_cd */
  empr_dntl_ben_rpt_cd?: 1 | 2 | 3 | 4 | 5;
  /** T4 monetary amounts — xsd:T4_AMT */
  T4_AMT?: CraXsd_T4AmtType;
  /** Other Information section — up to 6 coded boxes — xsd:OTH_INFO */
  OTH_INFO?: CraXsd_OtherInformationType;
}

export const CraXsd_T4SlipTypeSchema = z.object({
  EMPE_NM: z.record(z.string(), z.unknown()),
  EMPE_ADDR: z.record(z.string(), z.unknown()).optional(),
  sin: z.string().regex(/^\d{1,9}$/),
  empe_nbr: z.string().max(20).optional(),
  bn: z.string(),
  rpp_dpsp_rgst_nbr: z.string().optional(),
  cpp_qpp_xmpt_cd: z.enum(['0', '1']),
  ei_xmpt_cd: z.enum(['0', '1']),
  prov_pip_xmpt_cd: z.enum(['0', '1']).optional(),
  empt_cd: z.number().int().min(11).max(17).optional(),
  rpt_tcd: z.enum(['A', 'M', 'O', 'C']),
  empt_prov_cd: z.string(),
  empr_dntl_ben_rpt_cd: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  T4_AMT: CraXsd_T4AmtTypeSchema.optional(),
  OTH_INFO: CraXsd_OtherInformationTypeSchema.optional(),
});
export type CraXsd_T4SlipTypeInferred = z.infer<typeof CraXsd_T4SlipTypeSchema>;