#!/usr/bin/env tsx
/**
 * @fileoverview CRA XSD → TypeScript/Zod generator (v1.26.3)
 *
 * Reads CRA slip XSDs from /scripts/cra-xsds/ and emits:
 *   /src/types/slips/cra/{slip}.ts    — CraXsd_* interfaces + Zod schemas
 *   /src/types/slips/cra/box-mappings.ts — XSD field → app box key maps
 *
 * Run: npm run gen:slip-types
 *
 * DO NOT hand-edit anything in /src/types/slips/cra/.
 * Annual update: drop new XSDs in /scripts/cra-xsds/, re-run this script.
 */

import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';

const XSD_DIR = path.resolve(__dirname, 'cra-xsds');
const OUT_DIR = path.resolve(__dirname, '../src/types/slips/cra');

// ─── XSD primitive → TypeScript type ─────────────────────────────────────────

const XSD_TO_TS: Record<string, string> = {
  // Decimal amounts: stored as "NNNNN.NN" strings in CRA XML, numbers in TypeScript
  decimal6Type: 'number', decimal7Type: 'number', decimal9Type: 'number',
  decimal10Type: 'number', decimal11Type: 'number', decimal12Type: 'number',
  decimal13Type: 'number', decimal15Type: 'number', decimal17Type: 'number',
  signedDecimal9Type: 'number', signedDecimal11Type: 'number',
  signedDecimal13Type: 'number', signedDecimal15Type: 'number',
  signedDecimal17Type: 'number', decimal9fraction4Type: 'number',
  // T2202 namespaced amount types
  Decimal13AmountType: 'number', positiveDecimal11Type: 'number',
  positiveDecimal15AmountType: 'number',
  // Integer / count types
  ZeroToTwelveCountType: 'number', dayJulianType: 'number',
  int2Type: 'string', int3Type: 'string', int4Type: 'string',
  int5Type: 'string', int7Type: 'string', int8Type: 'string',
  int9Type: 'string', int11Type: 'string',
  numeric1Type: 'string', numeric2Type: 'string', numeric3Type: 'string',
  numeric4Type: 'string', numeric6Type: 'string', numeric7Type: 'string',
  numeric8Type: 'string', numeric9Type: 'string',
  // Identifier types
  sinType: 'string', 'ccms:SINType': 'string',
  bnType: 'string', bnRPType: 'string', bnRZType: 'string',
  bnRPRZType: 'string', BNRZType: 'string', bnRootType: 'string',
  trustType: 'string', bn9AccntNbr15: 'string',
  ccraType: 'string', ccraType2: 'string', ccraType3: 'string', ccraType4: 'string',
  finType: 'string', nrType: 'string',
  // String types
  char3AlphaType: 'string', char12Type: 'string', char20Type: 'string',
  char60Type: 'string', char100Type: 'string', char2000Type: 'string',
  char2ANType: 'string',
  alphaNumeric3Type: 'string', alphaNumeric8Type: 'string',
  alphaNumericSpace12Type: 'string',
  Length1to20TextType: 'string',
  // Date / year types
  yearType: 'string', YYMMType: 'string', pcType: 'string',
  // Geographic
  provinceType: 'string', countryType: 'string',
  // Enums / coded indicators
  'indicator0-1Type': "'0' | '1'",
  'indicator1-3Type': "'1' | '2' | '3'",
  'indicator1-4Type': "'1' | '2' | '3' | '4'",
  'indicator1-5Type': "'1' | '2' | '3' | '4' | '5'",
  'indicator1-6Type': "'1' | '2' | '3' | '4' | '5' | '6'",
  dentalCodeType: '1 | 2 | 3 | 4 | 5',
  slipDataType: "'A' | 'M' | 'O' | 'C'",
  otherDataType: "'A' | 'M' | 'O'",
  'range11to17Type': '11 | 12 | 13 | 14 | 15 | 16 | 17',
  OneToFiveCodeType: '1 | 2 | 3 | 4 | 5',
  OneToSixCodeType: '1 | 2 | 3 | 4 | 5 | 6',
  indicatorYesNoType: "'Y' | 'N'",
};

const XSD_TO_ZOD: Record<string, string> = {
  decimal6Type: 'z.number()', decimal7Type: 'z.number()', decimal9Type: 'z.number()',
  decimal10Type: 'z.number()', decimal11Type: 'z.number()', decimal12Type: 'z.number()',
  decimal13Type: 'z.number()', decimal15Type: 'z.number()', decimal17Type: 'z.number()',
  signedDecimal9Type: 'z.number()', signedDecimal11Type: 'z.number()',
  signedDecimal13Type: 'z.number()', signedDecimal15Type: 'z.number()',
  signedDecimal17Type: 'z.number()', decimal9fraction4Type: 'z.number()',
  Decimal13AmountType: 'z.number()', positiveDecimal11Type: 'z.number()',
  positiveDecimal15AmountType: 'z.number()',
  ZeroToTwelveCountType: 'z.number().int().min(0).max(12)',
  dayJulianType: 'z.number().int().min(1).max(366)',
  int2Type: 'z.string()', int3Type: 'z.string()', int4Type: 'z.string()',
  int5Type: 'z.string()', int7Type: 'z.string()', int8Type: 'z.string()',
  int9Type: 'z.string()', int11Type: 'z.string()',
  numeric1Type: 'z.string()', numeric2Type: 'z.string()', numeric3Type: 'z.string()',
  numeric4Type: 'z.string()', numeric6Type: 'z.string()', numeric7Type: 'z.string()',
  numeric8Type: 'z.string()', numeric9Type: 'z.string()',
  sinType: "z.string().regex(/^\\d{1,9}$/)",
  'ccms:SINType': 'z.string().length(9)',
  bnType: 'z.string()', bnRPType: 'z.string()', bnRZType: 'z.string()',
  bnRPRZType: 'z.string()', BNRZType: 'z.string()', bnRootType: 'z.string()',
  trustType: 'z.string()', bn9AccntNbr15: 'z.string()',
  ccraType: 'z.string()', ccraType2: 'z.string()',
  ccraType3: 'z.string()', ccraType4: 'z.string()',
  finType: 'z.string()', nrType: 'z.string()',
  char3AlphaType: 'z.string().max(3)', char12Type: 'z.string().max(12)',
  char20Type: 'z.string().max(20)', char60Type: 'z.string().max(60)',
  char100Type: 'z.string().max(100)', char2000Type: 'z.string().max(2000)',
  char2ANType: 'z.string().max(2)',
  alphaNumeric3Type: 'z.string().max(3)', alphaNumeric8Type: 'z.string().max(8)',
  alphaNumericSpace12Type: 'z.string().max(12)',
  Length1to20TextType: 'z.string().max(20)',
  yearType: 'z.string()', YYMMType: 'z.string()', pcType: 'z.string()',
  provinceType: 'z.string()', countryType: 'z.string()',
  'indicator0-1Type': "z.enum(['0', '1'])",
  'indicator1-3Type': "z.enum(['1', '2', '3'])",
  'indicator1-4Type': "z.enum(['1', '2', '3', '4'])",
  'indicator1-5Type': "z.enum(['1', '2', '3', '4', '5'])",
  'indicator1-6Type': "z.enum(['1', '2', '3', '4', '5', '6'])",
  dentalCodeType: 'z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])',
  slipDataType: "z.enum(['A', 'M', 'O', 'C'])",
  otherDataType: "z.enum(['A', 'M', 'O'])",
  'range11to17Type': 'z.number().int().min(11).max(17)',
  OneToFiveCodeType: 'z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])',
  OneToSixCodeType: 'z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)])',
  indicatorYesNoType: "z.enum(['Y', 'N'])",
};

// ─── Box-number mappings (XSD field name → app box key) ──────────────────────
// Source: CRA T4/T4A/T5/T5008/T3/T2202 RC guides + existing types.ts

/** T4 — Statement of Remuneration Paid */
const T4_BOX_MAP: Record<string, string> = {
  // T4SlipType top-level
  sin:                    'box12',  // SIN (Box 12)
  empt_prov_cd:           'box10',  // Province of employment
  cpp_qpp_xmpt_cd:        'box28',  // CPP/QPP exempt indicator
  ei_xmpt_cd:             'box29',  // EI exempt indicator
  empt_cd:                'box29',  // Employment code (same field on slip)
  empr_dntl_ben_rpt_cd:   'box45',  // Employer dental benefits code
  // T4AmtType
  empt_incamt:            'box14',  // Employment income — ITA s.5
  cpp_cntrb_amt:          'box16',  // Employee CPP contributions
  cppe_cntrb_amt:         'box16A', // Employee CPP2 enhanced contributions
  qpp_cntrb_amt:          'box17',  // Employee QPP contributions
  qppe_cntrb_amt:         'box17A', // Employee QPP2 contributions
  empe_eip_amt:           'box18',  // Employee EI premiums
  rpp_cntrb_amt:          'box20',  // RPP contributions
  itx_ddct_amt:           'box22',  // Income tax deducted
  ei_insu_ern_amt:        'box24',  // EI insurable earnings
  cpp_qpp_ern_amt:        'box26',  // CPP/QPP pensionable earnings
  unn_dues_amt:           'box44',  // Union dues
  chrty_dons_amt:         'box46',  // Charitable donations
  padj_amt:               'box52',  // Pension adjustment
  prov_pip_amt:           'box55',  // Provincial parental insurance plan (PPIP) premiums
  prov_insu_ern_amt:      'box56',  // PPIP insurable earnings
  // OtherInfoGroup — "Other Information" section codes
  hm_brd_lodg_amt:        'code30', // Board and lodging
  spcl_wrk_site_amt:      'code32', // Travel to a special work site
  prscb_zn_trvl_amt:      'code33', // Prescribed zone travel assistance
  med_trvl_amt:           'code34', // Medical travel assistance
  prsnl_vhcl_amt:         'code34', // Personal use of employer's automobile
  rsn_per_km_amt:         'code34', // Reasonable per-km vehicle allowance
  low_int_loan_amt:       'code36', // Interest-free or low-interest loans
  empe_hm_loan_amt:       'code37', // Employee home-relocation loan deduction
  stok_opt_ben_amt:       'code38', // Security options benefits (before June 25, 2024)
  sob_after_jun2024_amt:  'code38', // Security options benefits (after June 25, 2024)
  sob_a00_feb_amt:        'code38', // Security options benefits with deferral election
  shr_opt_d_ben_amt:      'code39', // Security options deductions — ITA s.110(1)(d)
  sod_d_after_jun2024_amt:'code39', // Security options deductions s.110(1)(d) after June 2024
  sod_d_a00_feb_amt:      'code39', // Security options deductions s.110(1)(d) with deferral
  oth_tx_ben_amt:         'code40', // Other taxable allowances and benefits
  shr_opt_d1_ben_amt:     'code41', // Security options deductions — ITA s.110(1)(d.1)
  sod_d1_after_jun2024_amt:'code41',// Security options deductions s.110(1)(d.1) after June 2024
  sod_d1_a00_feb_amt:     'code41', // Security options deductions s.110(1)(d.1) with deferral
  empt_cmsn_amt:          'code42', // Employment commissions
  cfppa_amt:              'code43', // Canadian Forces personnel and police deduction
  dfr_sob_amt:            'code53', // Deferred stock options benefit
  elg_rtir_amt:           'code66', // Eligible retiring allowances
  nelg_rtir_amt:          'code67', // Non-eligible retiring allowances
  indn_elg_rtir_amt:      'code68', // Indian — eligible retiring allowances
  indn_nelg_rtir_amt:     'code69', // Indian — non-eligible retiring allowances
  mun_ofcr_examt:         'code43', // Municipal officer's expense allowance
  indn_empe_amt:          'code71', // Indian employment income — exempt under ITA s.81
  oc_incamt:              'code77', // Wage-loss replacement plan income
  oc_dy_cnt:              'code78', // Days in Canada — non-residents
  fish_gro_ern_amt:       'code79', // Fishers — gross earnings
  fish_net_ptnr_amt:      'code80', // Fishers — net partnership amount
  fish_shr_prsn_amt:      'code81', // Fishers — shareperson amount
  plcmt_emp_agcy_amt:     'code82', // Placement or employment agency workers
  drvr_taxis_oth_amt:     'code83', // Taxi and other passenger-carrying vehicle drivers
  cmpn_rpay_empr_amt:     'code84', // Employer reimbursement of employee expenses
  brbr_hrdrssr_amt:       'code85', // Barbers and hairdressers
  pub_trnst_pass_amt:     'code84', // Public transit pass (historical)
  epaid_hlth_pln_amt:     'code85', // Employee-paid health plan premiums — ITA s.20(1)(q)
  pr_90_cntrbr_amt:       'code86', // Security options — shares sold or donated by contributor
  pr_90_ncntrbr_amt:      'code87', // Security options — shares sold or donated by non-contributor
  stok_opt_csh_out_eamt:  'code86', // Security options used to satisfy cash-out right
  vlntr_emergencyworker_xmpt_amt: 'code87', // Volunteer emergency workers exempt amount
  indn_txmpt_sei_amt:     'code89', // Indian — tax-exempt self-employment income
  empt_inc_amt_covid_prd1:'code57', // Employment income — COVID-19 subsidy period 1
  empt_inc_amt_covid_prd2:'code58', // Employment income — COVID-19 subsidy period 2
  empt_inc_amt_covid_prd3:'code59', // Employment income — COVID-19 subsidy period 3
  empt_inc_amt_covid_prd4:'code60', // Employment income — COVID-19 subsidy period 4
  indn_xmpt_rpp_amt:      'code90', // Indian — tax-exempt RPP contributions
  indn_xmpt_unn_amt:      'code91', // Indian — tax-exempt union dues
  lv_supp_top_up_amt:     'code77', // Leave support top-up
};

/** T4A — Statement of Pension, Retirement, Annuity, and Other Income */
const T4A_BOX_MAP: Record<string, string> = {
  // T4aAmtType — main amounts
  pens_spran_amt:           'box016', // Pension or superannuation
  lsp_amt:                  'box018', // Lump-sum payments
  self_empl_cmsn_amt:       'box020', // Self-employed commissions
  itx_ddct_amt:             'box022', // Income tax deducted
  annty_amt:                'box024', // Annuities
  fee_or_oth_srvc_amt:      'box048', // Fees for services
  // T4AOtherInfoGroup — Other Information section
  elg_rtir_amt:             'box066', // Eligible retiring allowances
  nelg_rtir_amt:            'box067', // Non-eligible retiring allowances
  oth_incamt:               'box028', // Other income
  ptrng_aloc_amt:           'box150', // Patronage allocations
  rpp_past_srvc_amt:        'box032', // RRSP contributions — past service
  padj_amt:                 'box052', // Pension adjustment
  resp_aip_amt:             'box122', // RESP accumulated income payments
  resp_educt_ast_amt:       'box130', // RESP educational assistance payments
  chrty_dons_amt:           'box046', // Charitable donations
  rsch_grnt_amt:            'box104', // Research grants
  brsy_amt:                 'box105', // Scholarships, fellowships, bursaries — ITA s.56(3)
  dth_ben_amt:              'box106', // Death benefits — ITA s.248(1)
  wag_ls_incamt:            'box107', // Wage-loss replacement plan benefits
  lsp_rpp_nelg_amt:         'box114', // Lump sum — RPP non-eligible portion
  nrgst_ppln_amt:           'box115', // Non-registered pension plan amounts
  pr_71_acr_lsp_amt:        'box116', // Lump-sum amounts accrued prior to 1972
  grp_trm_life_amt:         'box119', // Group term life insurance benefits
  dsblt_ben_amt:            'box131', // Disability benefits
  vtrn_ben_amt:             'box133', // Veterans benefits
  wag_ptct_pgm_amt:         'box138', // Wage Earner Protection Program
  tfsa_tax_amt:             'box145', // TFSA taxable amounts
  indn_elg_rtir_amt:        'box068', // Indian — eligible retiring allowances
  indn_nelg_rtir_amt:       'box069', // Indian — non-eligible retiring allowances
  indn_oth_incamt:          'box070', // Indian — other income exempt under ITA s.87
  indn_xmpt_pens_amt:       'box071', // Indian — exempt pension income
  indn_xmpt_lsp_amt:        'box072', // Indian — exempt lump-sum payments
  vtrn_ben_pens_splt_elg_amt:'box133',// Veterans benefit eligible for pension splitting
  alda_amt:                 'box148', // Advanced life deferred annuity amount
  oas_lump_sum_pamt:        'box152', // OAS lump-sum payments
  pst_dctrl_fshp_amt:       'box134', // Post-doctoral fellowship income
  abe_tuit_ast_amt:         'box151', // Adult Basic Education tuition assistance
  // Additional Info section
  spp_sps_cntrb_ind:        'addInfoSpousalContrib',
  spp_sps_cntrbr_sin:       'addInfoSpousalSIN',
};

/** T5 — Statement of Investment Income */
const T5_BOX_MAP: Record<string, string> = {
  sin:              'box12',  // Recipient SIN
  // T5AmountType
  actl_elg_dvamt:   'box24',  // Actual eligible dividends
  actl_dvnd_amt:    'box12',  // Actual non-eligible dividends (Box 12 on the slip; note: SIN is also field "sin")
  tx_elg_dvnd_pamt: 'box25',  // Taxable eligible dividends
  tx_dvnd_amt:      'box11',  // Taxable non-eligible dividends
  enhn_dvtc_amt:    'box26',  // Dividend tax credit — eligible dividends
  dvnd_tx_cr_amt:   'box12B', // Dividend tax credit — non-eligible dividends
  cdn_int_amt:      'box13',  // Interest from Canadian sources
  oth_cdn_incamt:   'box14',  // Other income from Canadian sources
  fgn_incamt:       'box15',  // Foreign income
  fgn_tx_pay_amt:   'box16',  // Foreign tax paid
  cdn_royl_amt:     'box17',  // Royalties from Canadian sources
  cgain_dvnd_amt:   'box18',  // Capital gains dividends
  acr_annty_amt:    'box19',  // Accrued income — annuities
  rsrc_alwnc_amt:   'box20',  // Resource allowance
  cgain_dvnd_1_amt: 'box18A', // Capital gains dividends — type 1
  cgain_dvnd_2_amt: 'box18B', // Capital gains dividends — type 2
  lk_nt_acr_intamt: 'box19B', // Locked-in account accrued interest
  // Budget 2024: separate capital gains dividend reporting Jan–Jun 2024
  cgain_dvnd_jan_to_jun_2024: 'box18C', // Capital gains dividends Jan 1 – Jun 24, 2024
};

/** T5008 — Statement of Securities Transactions */
const T5008_BOX_MAP: Record<string, string> = {
  // T5008SlipDispositionType
  sin:              'recipientSIN', // Recipient SIN
  DISPN_DT:         'dispositionDate', // Date of disposition
  // T5008AmountType
  fval_amt:         'box20',  // Proceeds of disposition / fair market value
  cost_bok_val_amt: 'box20',  // Cost or book value (ACB)
  dispn_amt:        'box21',  // Proceeds of disposition (signed)
  // Other disposition fields
  rcv_scty_tcd:     'receivedSecurityTypeCode',
  scty_rcv_cnt:     'box17',  // Quantity of securities received
  rcv_cusip_nbr:    'receivedCUSIP',
  id_scty_sttl_txt: 'box16',  // Security description (settled/received)
  dsps_scty_tcd:    'disposedSecurityTypeCode',
  dsps_scty_cnt:    'box17',  // Quantity disposed
  dsps_cusip_nbr:   'disposedCUSIP',
  id_scty_dsps_txt: 'box16',  // Security description (disposed)
  fgn_crcy_cd:      'foreignCurrencyCode',
  // Identification record
  rcpnt_acct_nbr:   'box15',  // Recipient account number
  rcpnt_tcd:        'box22',  // Recipient type code
  dispn_trans_cnt:  'dispositionCount',
  sttl_amt:         'totalSettlementAmount',
};

/** T3 — Statement of Trust Income Allocations and Designations */
const T3_BOX_MAP: Record<string, string> = {
  // T3AmountType
  cgamt:                  'box21',  // Total capital gains (2025: both periods combined)
  actl_elg_dvamt:         'box22',  // Actual eligible dividends
  actl_dvnd_amt:          'box32',  // Actual other (non-eligible) dividends
  oth_incamt:             'box26',  // Other income
  elg_dedn_cgamt:         'box30',  // Capital gains eligible for deduction
  tx_elg_dvnd_pamt:       'box23',  // Taxable eligible dividends
  tx_dvnd_amt:            'box33',  // Taxable other dividends
  enhn_dvtc_amt:          'box24',  // Enhanced dividend tax credit (eligible)
  dvnd_tx_cr_amt:         'box39',  // Dividend tax credit (non-eligible)
  // Budget 2024 two-tier capital gains: Period 2 = Jan 1–Jun 24, Period 3 = Jun 25–Dec 31
  prd_2_cgamt:            'box21A', // Capital gains — Period 2 (pre-June 25, 2024 inclusion rate 50%)
  prd_3_cgamt:            'box21B', // Capital gains — Period 3 (post-June 25, 2024 inclusion rate 66.67%)
  prd_2_elg_cgamt:        'box21C', // Eligible capital gains — Period 2
  prd_3_elg_cgamt:        'box21D', // Eligible capital gains — Period 3
  prd_2_insu_clamt:       'box21E', // Insurance segregated fund — Period 2
  prd_3_insu_clamt:       'box21F', // Insurance segregated fund — Period 3
  // OtherT3InfoGroup
  pens_lsp_amt:           'box31',  // Pension and lump-sum payments
  fgn_bus_incamt:         'box34',  // Foreign business income
  fgn_nbus_incamt:        'box25',  // Foreign non-business income
  elg_pens_incamt:        'box31B', // Eligible pension income (for splitting)
  fgn_bus_tx_amt:         'box36',  // Foreign business income tax paid
  fgn_tx_amt:             'box37',  // Foreign non-business income tax paid
  dth_ben_amt:            'box41',  // Death benefits
  insu_fnd_clamt:         'box42',  // Insurance segregated funds
  XII_2_tx_cr_amt:        'box43',  // Part XII.2 tax credit
  invs_cost_examt:        'box44',  // Investment expense
  itc_amt:                'box45',  // Investment tax credit
  oth_cr_amt:             'box46',  // Other credits
  amt_rslt_acb_amt:       'box26B', // Amount resulting from ACB reduction
  pens_trnsf_amt:         'box47',  // Amounts eligible for pension transfer
  rtir_alwnc_amt:         'box48',  // Retirement allowances
  chrty_dons_amt:         'box49',  // Charitable donations
  // Budget 2024 two-tier capital gains — Other Info group (same periods as above)
  cg_disp_bef_jun_amt:    'box21G', // Capital gains on dispositions — before June 25, 2024
  cg_disp_after_jun_amt:  'box21H', // Capital gains on dispositions — after June 25, 2024
  cg_disp_qffp_bef_jun_amt:  'box21I',// Capital gains on QFFP dispositions — before June 25, 2024
  cg_disp_qffp_after_jun_amt:'box21J',// Capital gains on QFFP dispositions — after June 25, 2024
  cg_disp_qsbcs_bef_jun_amt: 'box21K',// Capital gains on QSBCS dispositions — before June 25, 2024
  cg_disp_qsbcs_after_jun_amt:'box21L',// Capital gains on QSBCS dispositions — after June 25, 2024
  ins_seg_bef_jun_amt:    'box21M', // Insurance segregated funds — before June 25, 2024
  ins_seg_after_jun_amt:  'box21N', // Insurance segregated funds — after June 25, 2024
};

/** T2202 — Tuition and Enrolment Certificate */
const T2202_BOX_MAP: Record<string, string> = {
  TotalEligibleTuitionFeeAmount:   'boxA',  // Eligible tuition fees
  TotalPartTimeStudentMonthCount:  'boxB',  // Part-time months enrolled
  TotalFullTimeStudentMonthCount:  'boxC',  // Full-time months enrolled
  // SchoolSessionType fields
  EligibleTuitionFeeAmount:        'sessionBoxA',  // Session tuition fees
  PartTimeStudentMonthCount:       'sessionBoxB',  // Session part-time months
  FullTimeStudentMonthCount:       'sessionBoxC',  // Session full-time months
  StartYearMonth:                  'sessionStart', // YYMM
  EndYearMonth:                    'sessionEnd',   // YYMM
};

// ─── Human-readable field descriptions ────────────────────────────────────────

const FIELD_DESC: Record<string, Record<string, string>> = {
  T4: {
    EMPE_NM: 'Employee name',
    EMPE_ADDR: 'Employee address',
    sin: 'Social Insurance Number (Box 12)',
    empe_nbr: 'Employee number (employer-assigned)',
    bn: 'Employer business number (RP account)',
    rpp_dpsp_rgst_nbr: 'RPP or DPSP registration number',
    cpp_qpp_xmpt_cd: 'CPP/QPP exempt — 0=not exempt, 1=exempt (Box 28)',
    ei_xmpt_cd: 'EI exempt — 0=not exempt, 1=exempt (Box 29)',
    prov_pip_xmpt_cd: 'Provincial parental insurance plan exempt',
    empt_cd: 'Employment code (Box 29)',
    rpt_tcd: 'Report type code: A=original, M=amended, O=cancelled, C=added',
    empt_prov_cd: 'Province of employment (Box 10)',
    empr_dntl_ben_rpt_cd: 'Employer dental benefits code 1–5 (Box 45)',
    T4_AMT: 'T4 monetary amounts',
    OTH_INFO: 'Other Information section — up to 6 coded boxes',
    // T4AmtType
    empt_incamt: 'Box 14 — Employment income (ITA s.5–7)',
    cpp_cntrb_amt: 'Box 16 — Employee CPP contributions',
    cppe_cntrb_amt: 'Box 16A — Employee CPP2 (second additional) contributions',
    qpp_cntrb_amt: 'Box 17 — Employee QPP contributions',
    qppe_cntrb_amt: 'Box 17A — Employee QPP2 contributions',
    empe_eip_amt: 'Box 18 — Employee EI premiums',
    rpp_cntrb_amt: 'Box 20 — RPP contributions',
    itx_ddct_amt: 'Box 22 — Income tax deducted',
    ei_insu_ern_amt: 'Box 24 — EI insurable earnings',
    cpp_qpp_ern_amt: 'Box 26 — CPP/QPP pensionable earnings',
    unn_dues_amt: 'Box 44 — Union dues',
    chrty_dons_amt: 'Box 46 — Charitable donations',
    padj_amt: 'Box 52 — Pension adjustment',
    prov_pip_amt: 'Box 55 — PPIP employee premiums',
    prov_insu_ern_amt: 'Box 56 — PPIP insurable earnings',
    // OtherInfo
    hm_brd_lodg_amt: 'Code 30 — Board and lodging',
    spcl_wrk_site_amt: 'Code 32 — Travel to a special work site',
    prscb_zn_trvl_amt: 'Code 33 — Prescribed zone travel assistance',
    med_trvl_amt: 'Code 34 — Medical travel assistance',
    prsnl_vhcl_amt: 'Code 34 — Personal use of employer\'s automobile',
    rsn_per_km_amt: 'Code 34 — Reasonable per-km vehicle allowance',
    low_int_loan_amt: 'Code 36 — Interest-free or low-interest loans',
    empe_hm_loan_amt: 'Code 37 — Employee home-relocation loan deduction',
    stok_opt_ben_amt: 'Code 38 — Security options benefits (before June 25, 2024)',
    sob_after_jun2024_amt: 'Code 38 — Security options benefits (after June 25, 2024)',
    sob_a00_feb_amt: 'Code 38 — Security options benefit where deferral election filed',
    shr_opt_d_ben_amt: 'Code 39 — Security options deduction s.110(1)(d)',
    sod_d_after_jun2024_amt: 'Code 39 — Security options deduction s.110(1)(d) after June 25, 2024',
    sod_d_a00_feb_amt: 'Code 39 — Security options deduction s.110(1)(d) with deferral',
    oth_tx_ben_amt: 'Code 40 — Other taxable allowances and benefits',
    shr_opt_d1_ben_amt: 'Code 41 — Security options deduction s.110(1)(d.1)',
    sod_d1_after_jun2024_amt: 'Code 41 — Security options deduction s.110(1)(d.1) after June 25, 2024',
    sod_d1_a00_feb_amt: 'Code 41 — Security options deduction s.110(1)(d.1) with deferral',
    empt_cmsn_amt: 'Code 42 — Employment commissions',
    cfppa_amt: 'Code 43 — Canadian Forces personnel and police deduction',
    dfr_sob_amt: 'Code 53 — Deferred security options benefit',
    elg_rtir_amt: 'Code 66 — Eligible retiring allowances',
    nelg_rtir_amt: 'Code 67 — Non-eligible retiring allowances',
    indn_elg_rtir_amt: 'Code 68 — Indian — eligible retiring allowances',
    indn_nelg_rtir_amt: 'Code 69 — Indian — non-eligible retiring allowances',
    mun_ofcr_examt: 'Code 43 — Municipal officer\'s expense allowance',
    indn_empe_amt: 'Code 71 — Indian employment income — ITA s.81 exempt',
    oc_incamt: 'Code 77 — Wage-loss replacement plan income',
    oc_dy_cnt: 'Code 78 — Days employed in Canada (non-residents)',
    fish_gro_ern_amt: 'Code 79 — Fishers — gross earnings',
    fish_net_ptnr_amt: 'Code 80 — Fishers — net partnership amount',
    fish_shr_prsn_amt: 'Code 81 — Fishers — shareperson amount',
    plcmt_emp_agcy_amt: 'Code 82 — Placement or employment agency workers',
    drvr_taxis_oth_amt: 'Code 83 — Taxi and other passenger-carrying vehicle drivers',
    cmpn_rpay_empr_amt: 'Code 84 — Employer reimbursement by employee',
    brbr_hrdrssr_amt: 'Code 85 — Barbers and hairdressers',
    pub_trnst_pass_amt: 'Code 84 — Public transit pass (historical)',
    epaid_hlth_pln_amt: 'Code 85 — Employee-paid premiums for health plan — ITA s.20(1)(q)',
    pr_90_cntrbr_amt: 'Code 86 — Security options — shares sold/donated by contributor',
    pr_90_ncntrbr_amt: 'Code 87 — Security options — shares sold/donated by non-contributor',
    stok_opt_csh_out_eamt: 'Code 86 — Security options used to satisfy cash-out right',
    vlntr_emergencyworker_xmpt_amt: 'Code 87 — Volunteer emergency workers exempt amount',
    indn_txmpt_sei_amt: 'Code 89 — Indian — tax-exempt self-employment income',
    empt_inc_amt_covid_prd1: 'Code 57 — Employment income — COVID-19 subsidy period 1',
    empt_inc_amt_covid_prd2: 'Code 58 — Employment income — COVID-19 subsidy period 2',
    empt_inc_amt_covid_prd3: 'Code 59 — Employment income — COVID-19 subsidy period 3',
    empt_inc_amt_covid_prd4: 'Code 60 — Employment income — COVID-19 subsidy period 4',
    indn_xmpt_rpp_amt: 'Code 90 — Indian — tax-exempt RPP contributions',
    indn_xmpt_unn_amt: 'Code 91 — Indian — tax-exempt union dues',
    lv_supp_top_up_amt: 'Code 77 — Leave support top-up (signed — may be negative)',
  },
  T4A: {
    RCPNT_NM: 'Recipient name',
    sin: 'Social Insurance Number',
    rcpnt_bn: 'Recipient business number',
    RCPNT_CORP_NM: 'Recipient corporation name',
    RCPNT_ADDR: 'Recipient address',
    rcpnt_nbr: 'Recipient number (payer-assigned)',
    bn: 'Payer business number (RP account)',
    payr_dntl_ben_rpt_cd: 'Payer dental benefits code',
    ppln_dpsp_rgst_nbr: 'PPIP or DPSP registration number',
    rpt_tcd: 'Report type code',
    T4A_AMT: 'T4A main monetary amounts',
    OTH_INFO: 'Other Information section — up to 12 coded boxes',
    ADD_INFO: 'Additional information (spousal DPSP)',
    pens_spran_amt: 'Box 016 — Pension or superannuation',
    lsp_amt: 'Box 018 — Lump-sum payments',
    self_empl_cmsn_amt: 'Box 020 — Self-employed commissions',
    itx_ddct_amt: 'Box 022 — Income tax deducted',
    annty_amt: 'Box 024 — Annuities',
    fee_or_oth_srvc_amt: 'Box 048 — Fees for services',
    elg_rtir_amt: 'Box 066 — Eligible retiring allowances',
    nelg_rtir_amt: 'Box 067 — Non-eligible retiring allowances',
    oth_incamt: 'Box 028 — Other income',
    ptrng_aloc_amt: 'Box 150 — Patronage allocations',
    rpp_past_srvc_amt: 'Box 032 — RRSP past service contributions',
    padj_amt: 'Box 052 — Pension adjustment',
    resp_aip_amt: 'Box 122 — RESP accumulated income payments',
    resp_educt_ast_amt: 'Box 130 — RESP educational assistance payments',
    chrty_dons_amt: 'Box 046 — Charitable donations',
    rsch_grnt_amt: 'Box 104 — Research grants',
    brsy_amt: 'Box 105 — Scholarships, fellowships, bursaries, artist\'s grants — ITA s.56(3)',
    dth_ben_amt: 'Box 106 — Death benefits — ITA s.248(1)',
    wag_ls_incamt: 'Box 107 — Wage-loss replacement plan benefits',
    lsp_rpp_nelg_amt: 'Box 114 — Lump-sum RPP — non-eligible portion',
    nrgst_ppln_amt: 'Box 115 — Non-registered pension plan amounts',
    pr_71_acr_lsp_amt: 'Box 116 — Lump-sum accrued before 1972',
    grp_trm_life_amt: 'Box 119 — Group term life insurance benefits',
    dsblt_ben_amt: 'Box 131 — Disability benefits',
    vtrn_ben_amt: 'Box 133 — Veterans benefits',
    wag_ptct_pgm_amt: 'Box 138 — Wage Earner Protection Program',
    tfsa_tax_amt: 'Box 145 — TFSA taxable amounts',
    alda_amt: 'Box 148 — Advanced life deferred annuity (signed — may be negative)',
    oas_lump_sum_pamt: 'Box 152 — OAS lump-sum payments',
    pst_dctrl_fshp_amt: 'Box 134 — Post-doctoral fellowship income',
    abe_tuit_ast_amt: 'Box 151 — Adult Basic Education tuition assistance',
    vtrn_ben_pens_splt_elg_amt: 'Box 133 — Veterans benefit eligible for pension income splitting',
    indn_elg_rtir_amt: 'Box 068 — Indian — eligible retiring allowances',
    indn_nelg_rtir_amt: 'Box 069 — Indian — non-eligible retiring allowances',
    indn_oth_incamt: 'Box 070 — Indian — other income exempt under ITA s.87',
    indn_xmpt_pens_amt: 'Box 071 — Indian — exempt pension income',
    indn_xmpt_lsp_amt: 'Box 072 — Indian — exempt lump-sum payments',
    spp_sps_cntrb_ind: 'Spousal DPSP contribution indicator',
    spp_sps_cntrbr_sin: 'Spousal contributor SIN',
  },
  T5: {
    RCPNT_NM: 'Recipient name',
    SEC_RCPNT_NM: 'Second recipient name',
    sin: 'Social Insurance Number',
    slp_rcpnt_bn: 'Recipient business or trust number',
    rcpnt_tr_acct_nbr: 'Recipient trust account number',
    BUS_NM: 'Business name',
    RCPNT_ADDR: 'Recipient address',
    bn: 'Payer business or FIN number',
    rcpnt_fi_br_nbr: 'Financial institution branch number',
    rcpnt_fi_acct_nbr: 'Financial institution account number',
    rpt_tcd: 'Report type code',
    rcpnt_tcd: 'Recipient type code (1–5)',
    fgn_crcy_ind: 'Foreign currency code (if amounts in foreign currency)',
    T5_AMT: 'T5 monetary amounts',
    actl_elg_dvamt: 'Box 24 — Actual eligible dividends',
    actl_dvnd_amt: 'Box 12 — Actual non-eligible dividends',
    tx_elg_dvnd_pamt: 'Box 25 — Taxable eligible dividends',
    tx_dvnd_amt: 'Box 11 — Taxable non-eligible dividends',
    enhn_dvtc_amt: 'Box 26 — Dividend tax credit for eligible dividends',
    dvnd_tx_cr_amt: 'Dividend tax credit for non-eligible dividends',
    cdn_int_amt: 'Box 13 — Interest from Canadian sources',
    oth_cdn_incamt: 'Box 14 — Other income from Canadian sources',
    fgn_incamt: 'Box 15 — Foreign income',
    fgn_tx_pay_amt: 'Box 16 — Foreign tax paid',
    cdn_royl_amt: 'Box 17 — Royalties from Canadian sources',
    cgain_dvnd_amt: 'Box 18 — Capital gains dividends',
    acr_annty_amt: 'Box 19 — Accrued income from annuities',
    rsrc_alwnc_amt: 'Box 20 — Resource allowance',
    cgain_dvnd_1_amt: 'Capital gains dividends — type 1',
    cgain_dvnd_2_amt: 'Capital gains dividends — type 2',
    lk_nt_acr_intamt: 'Locked-in account accrued interest',
    cgain_dvnd_jan_to_jun_2024: 'Capital gains dividends — Jan 1 to Jun 24, 2024 (Budget 2024 rate change)',
  },
  T5008: {
    sin: 'Recipient SIN',
    slp_rcpnt_bn: 'Recipient business number',
    rcpnt_tr_acct_nbr: 'Recipient trust account number',
    bn: 'Reporter BZ account number',
    rcpnt_pstl_cd: 'Recipient postal code',
    DISPN_DT: 'Date of disposition (MM-DD)',
    T5008_AMT: 'T5008 monetary amounts',
    rcv_scty_tcd: 'Received security type code (e.g. SH, BD, MF)',
    scty_rcv_cnt: 'Quantity of securities received',
    rcv_cusip_nbr: 'CUSIP number of received security',
    rcv_cusip_cd: 'CUSIP code type indicator',
    id_scty_sttl_txt: 'Box 16 — Description of settled/received security',
    dsps_scty_tcd: 'Disposed security type code',
    dsps_scty_cnt: 'Box 17 — Quantity of securities disposed',
    dsps_cusip_nbr: 'CUSIP number of disposed security',
    dsps_cusip_cd: 'Disposed CUSIP code type indicator',
    id_scty_dsps_txt: 'Box 16 — Description of disposed security',
    fgn_crcy_cd: 'Foreign currency code (3-letter ISO)',
    rpt_tcd: 'Report type code',
    fval_amt: 'Box 20 — Proceeds of disposition / fair market value',
    cost_bok_val_amt: 'Box 20 — Cost or book value (adjusted cost base)',
    dispn_amt: 'Box 21 — Net proceeds of disposition (signed — may be negative)',
    RCPNT_NM: 'Recipient name',
    SEC_RCPNT_NM: 'Second recipient name',
    ENTPRS_NM: 'Enterprise name',
    RCPNT_ADDR: 'Recipient address',
    rcpnt_acct_nbr: 'Box 15 — Recipient account number',
    rcpnt_tcd: 'Box 22 — Recipient type code (1=individual, 2=joint, 3=corporation, 4=trust)',
    dispn_trans_cnt: 'Number of disposition transactions in this slip',
    sttl_amt: 'Total settlement amount for all dispositions',
  },
  T3: {
    BNFY_NM: 'Beneficiary name',
    SEC_BNFY_NM: 'Second beneficiary name',
    ENTPRS_BNFY_NM: 'Enterprise beneficiary name',
    BNFY_ADDR: 'Beneficiary address',
    sin: 'Social Insurance Number',
    bn: 'Business number',
    bnfy_tr_acct_nbr: 'Beneficiary trust account number',
    tr_acct_nbr: 'Trust account number',
    rpt_tcd: 'Report type code',
    bnfy_cd: 'Beneficiary code (1–5)',
    itc_cd: 'Investment tax credit type code',
    T3_AMT: 'T3 monetary amounts',
    OTH_INFO: 'Other Information section — up to 6 coded boxes',
    cgamt: 'Box 21 — Total capital gains (see prd_2/prd_3 for Budget 2024 split)',
    actl_elg_dvamt: 'Box 22 — Actual eligible dividends',
    actl_dvnd_amt: 'Box 32 — Actual non-eligible (other) dividends',
    oth_incamt: 'Box 26 — Other income',
    elg_dedn_cgamt: 'Box 30 — Capital gains eligible for deduction',
    tx_elg_dvnd_pamt: 'Box 23 — Taxable eligible dividends',
    tx_dvnd_amt: 'Box 33 — Taxable other (non-eligible) dividends',
    enhn_dvtc_amt: 'Box 24 — Enhanced dividend tax credit (eligible)',
    dvnd_tx_cr_amt: 'Box 39 — Dividend tax credit (non-eligible)',
    // Budget 2024: CRA split capital gains into two periods for the inclusion rate change
    prd_2_cgamt: 'Box 21A — Capital gains Period 2 (Jan 1 – Jun 24, 2024, 50% inclusion rate)',
    prd_3_cgamt: 'Box 21B — Capital gains Period 3 (Jun 25 – Dec 31, 2024, 66.67% inclusion rate)',
    prd_2_elg_cgamt: 'Box 21C — Eligible capital gains Period 2',
    prd_3_elg_cgamt: 'Box 21D — Eligible capital gains Period 3',
    prd_2_insu_clamt: 'Box 21E — Insurance segregated fund Period 2',
    prd_3_insu_clamt: 'Box 21F — Insurance segregated fund Period 3',
    // OtherInfo
    pens_lsp_amt: 'Box 31 — Pension and lump-sum payments',
    fgn_bus_incamt: 'Box 34 — Foreign business income',
    fgn_nbus_incamt: 'Box 25 — Foreign non-business income',
    elg_pens_incamt: 'Box 31B — Eligible pension income (eligible for pension income splitting)',
    fgn_bus_tx_amt: 'Box 36 — Foreign business income tax paid',
    fgn_tx_amt: 'Box 37 — Foreign non-business income tax paid',
    dth_ben_amt: 'Box 41 — Death benefits',
    insu_fnd_clamt: 'Box 42 — Insurance segregated funds',
    XII_2_tx_cr_amt: 'Box 43 — Part XII.2 tax credit',
    invs_cost_examt: 'Box 44 — Investment expense',
    itc_amt: 'Box 45 — Investment tax credit',
    oth_cr_amt: 'Box 46 — Other credits',
    amt_rslt_acb_amt: 'Box 26B — Amount resulting from ACB reduction',
    pens_trnsf_amt: 'Box 47 — Amounts eligible for pension transfer',
    rtir_alwnc_amt: 'Box 48 — Retirement allowances',
    chrty_dons_amt: 'Box 49 — Charitable donations',
    // Budget 2024 OtherInfo capital gains split
    cg_disp_bef_jun_amt: 'Box 21G — Capital gains on dispositions — before June 25, 2024',
    cg_disp_after_jun_amt: 'Box 21H — Capital gains on dispositions — after June 25, 2024',
    cg_disp_qffp_bef_jun_amt: 'Box 21I — QFFP dispositions — before June 25, 2024',
    cg_disp_qffp_after_jun_amt: 'Box 21J — QFFP dispositions — after June 25, 2024',
    cg_disp_qsbcs_bef_jun_amt: 'Box 21K — QSBCS dispositions — before June 25, 2024',
    cg_disp_qsbcs_after_jun_amt: 'Box 21L — QSBCS dispositions — after June 25, 2024',
    ins_seg_bef_jun_amt: 'Box 21M — Insurance segregated funds — before June 25, 2024',
    ins_seg_after_jun_amt: 'Box 21N — Insurance segregated funds — after June 25, 2024',
  },
  T2202: {
    SlipReportTypeCode: 'Report type code',
    FilerAccountNumber: 'Filer BZ account number',
    PostSecondaryEducationalSchoolProgramName: 'School program name',
    PostSecondaryEducationalSchoolTypeCode: 'School type (1=university, 2=college, 3=other, 4=certified, 5=flying school)',
    FlyingSchoolClubCourseTypeCode: 'Flying school course type (required if school type = 5)',
    StudentName: 'Student name',
    SocialInsuranceNumber: 'Student Social Insurance Number',
    StudentNumber: 'Student number (institution-assigned)',
    StudentAddress: 'Student address',
    SchoolSession: 'Academic session (1–4 sessions per slip)',
    TotalEligibleTuitionFeeAmount: 'Box A — Total eligible tuition fees',
    TotalPartTimeStudentMonthCount: 'Box B — Total part-time months enrolled',
    TotalFullTimeStudentMonthCount: 'Box C — Total full-time months enrolled',
    StartYearMonth: 'Session start year-month (YYMM)',
    EndYearMonth: 'Session end year-month (YYMM)',
    EligibleTuitionFeeAmount: 'Session eligible tuition fees',
    PartTimeStudentMonthCount: 'Session part-time months',
    FullTimeStudentMonthCount: 'Session full-time months',
  },
};

// ─── XSD parser ───────────────────────────────────────────────────────────────

const ARRAY_TAGS = new Set([
  'xsd:element', 'xsd:complexType', 'xsd:simpleType',
  'xsd:group', 'xsd:enumeration', 'xsd:import', 'xsd:include',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name: string) => ARRAY_TAGS.has(name),
});

interface XsdElement {
  '@_name'?: string;
  '@_ref'?: string;
  '@_type'?: string;
  '@_minOccurs'?: string;
  '@_maxOccurs'?: string;
  'xsd:unique'?: unknown;
}

interface XsdComplexType {
  '@_name': string;
  'xsd:all'?: { 'xsd:element'?: XsdElement[] };
  'xsd:sequence'?: {
    'xsd:element'?: XsdElement[];
    'xsd:group'?: Array<{ '@_ref': string; '@_minOccurs'?: string; '@_maxOccurs'?: string }>;
  };
}

interface XsdGroup {
  '@_name': string;
  'xsd:choice'?: { 'xsd:element'?: XsdElement[] };
}

interface XsdSchema {
  'xsd:schema': {
    'xsd:complexType'?: XsdComplexType[];
    'xsd:group'?: XsdGroup[];
  };
}

function parseXsd(filePath: string): XsdSchema {
  const content = fs.readFileSync(filePath, 'latin1'); // handles ISO-8859-1
  return parser.parse(content) as XsdSchema;
}

// ─── Intermediate representation ─────────────────────────────────────────────

interface FieldIR {
  xmlName: string;
  tsType: string;       // TypeScript type string
  zodExpr: string;      // Zod expression
  optional: boolean;
  isNestedType: boolean;   // true = refers to a complexType (not a primitive)
  isArray?: boolean;
  description: string;
  boxKey: string;       // app layer box key or empty string
}

interface TypeIR {
  xmlName: string;
  tsInterfaceName: string;
  fields: FieldIR[];
  /** true = xsd:choice group (all fields optional regardless of minOccurs) */
  isChoice: boolean;
  doc: string;
}

function resolveType(
  xsdType: string,
  localTypeNames: Set<string>,
): { ts: string; zod: string; isNested: boolean } {
  if (xsdType in XSD_TO_TS) {
    return { ts: XSD_TO_TS[xsdType], zod: XSD_TO_ZOD[xsdType] ?? 'z.unknown()', isNested: false };
  }
  // Type defined within this same XSD file — reference the generated interface
  if (localTypeNames.has(xsdType)) {
    return {
      ts: `CraXsd_${xsdType}`,
      zod: `CraXsd_${xsdType}Schema`,
      isNested: true,
    };
  }
  // Cross-XSD external type (NameType, CanadaAddressType, etc. from complex.xsd)
  // Treat as an opaque object — we don't validate address/name structures
  return {
    ts: 'Record<string, unknown>',
    zod: 'z.record(z.string(), z.unknown())',
    isNested: false,
  };
}

function elementToField(
  el: XsdElement,
  descMap: Record<string, string>,
  boxMap: Record<string, string>,
  localTypeNames: Set<string>,
  forceOptional = false,
): FieldIR | null {
  const name = el['@_name'] ?? el['@_ref'];
  if (!name) return null;

  const xsdType = el['@_type'] ?? (el['@_ref'] ? 'char100Type' : 'unknown');
  const optional = forceOptional || (el['@_minOccurs'] === '0');
  const isArray = el['@_maxOccurs'] === 'unbounded' || Number(el['@_maxOccurs'] ?? 1) > 1;
  const { ts, zod, isNested } = resolveType(xsdType, localTypeNames);

  let tsType = ts;
  let zodExpr = zod;
  if (isArray) {
    tsType = `${ts}[]`;
    zodExpr = `z.array(${zod})`;
  }

  return {
    xmlName: name,
    tsType,
    zodExpr,
    optional,
    isNestedType: isNested,
    isArray,
    description: descMap[name] ?? name,
    boxKey: boxMap[name] ?? '',
  };
}

// ─── TypeScript emitter ───────────────────────────────────────────────────────

function emitInterface(ir: TypeIR): string {
  const lines: string[] = [];

  lines.push(`/** ${ir.doc} */`);
  lines.push(`export interface ${ir.tsInterfaceName} {`);

  for (const f of ir.fields) {
    const optional = ir.isChoice ? true : f.optional;
    const optMark = optional ? '?' : '';
    const boxPart = f.boxKey ? ` (${f.boxKey})` : '';
    lines.push(`  /** ${f.description}${boxPart} — xsd:${f.xmlName} */`);
    lines.push(`  ${f.xmlName}${optMark}: ${f.tsType};`);
  }

  lines.push('}');
  return lines.join('\n');
}

function emitZodSchema(ir: TypeIR): string {
  const lines: string[] = [];
  const schemaName = ir.tsInterfaceName + 'Schema';

  lines.push(`export const ${schemaName} = z.object({`);

  for (const f of ir.fields) {
    const optional = ir.isChoice ? true : f.optional;
    const zodExpr = optional ? `${f.zodExpr}.optional()` : f.zodExpr;
    lines.push(`  ${f.xmlName}: ${zodExpr},`);
  }

  lines.push('});');
  lines.push(`export type ${ir.tsInterfaceName}Inferred = z.infer<typeof ${schemaName}>;`);
  return lines.join('\n');
}

// ─── Per-slip generation ──────────────────────────────────────────────────────

type SlipSpec = {
  xsdFile: string;
  outFile: string;
  slipName: string;       // e.g. "T4"
  slipTitle: string;      // human title
  slipTypeName: string;   // e.g. "T4SlipType"
  amtTypeName?: string;   // e.g. "T4AmtType"
  otherInfoTypeName?: string; // e.g. "OtherInformationType"
  otherGroupName?: string;    // e.g. "OtherInfoGroup"
  additionalTypes?: string[]; // extra complexTypes to include
  boxMap: Record<string, string>;
  descMap: Record<string, string>;
};

const SLIP_SPECS: SlipSpec[] = [
  {
    xsdFile: 't4.xsd',
    outFile: 't4.ts',
    slipName: 'T4',
    slipTitle: 'T4 — Statement of Remuneration Paid',
    slipTypeName: 'T4SlipType',
    amtTypeName: 'T4AmtType',
    otherInfoTypeName: 'OtherInformationType',
    otherGroupName: 'OtherInfoGroup',
    boxMap: T4_BOX_MAP,
    descMap: FIELD_DESC['T4'],
  },
  {
    xsdFile: 't4a.xsd',
    outFile: 't4a.ts',
    slipName: 'T4A',
    slipTitle: 'T4A — Statement of Pension, Retirement, Annuity, and Other Income',
    slipTypeName: 'T4ASlipType',
    amtTypeName: 'T4aAmtType',
    otherInfoTypeName: 'T4AOtherInformationType',
    otherGroupName: 'T4AOtherInfoGroup',
    additionalTypes: ['T4AAdditionalInformationType'],
    boxMap: T4A_BOX_MAP,
    descMap: FIELD_DESC['T4A'],
  },
  {
    xsdFile: 't5.xsd',
    outFile: 't5.ts',
    slipName: 'T5',
    slipTitle: 'T5 — Statement of Investment Income',
    slipTypeName: 'T5SlipType',
    amtTypeName: 'T5AmountType',
    boxMap: T5_BOX_MAP,
    descMap: FIELD_DESC['T5'],
  },
  {
    xsdFile: 't5008.xsd',
    outFile: 't5008.ts',
    slipName: 'T5008',
    slipTitle: 'T5008 — Statement of Securities Transactions',
    slipTypeName: 'T5008SlipType',
    amtTypeName: 'T5008AmountType',
    // Disposition sub-type (references AmountType) must come before SlipType
    additionalTypes: ['T5008SlipDispositionType', 'T5008SlipIdentificationRecordType'],
    boxMap: T5008_BOX_MAP,
    descMap: FIELD_DESC['T5008'],
  },
  {
    xsdFile: 't3.xsd',
    outFile: 't3.ts',
    slipName: 'T3',
    slipTitle: 'T3 — Statement of Trust Income Allocations and Designations',
    slipTypeName: 'T3SlipType',
    amtTypeName: 'T3AmountType',
    otherInfoTypeName: 'OtherT3InformationType',
    otherGroupName: 'OtherT3InfoGroup',
    boxMap: T3_BOX_MAP,
    descMap: FIELD_DESC['T3'],
  },
  {
    xsdFile: 't2202.xsd',
    outFile: 't2202.ts',
    slipName: 'T2202',
    slipTitle: 'T2202 — Tuition and Enrolment Certificate',
    slipTypeName: 'T2202SlipType',
    additionalTypes: ['SchoolSessionType'],
    boxMap: T2202_BOX_MAP,
    descMap: FIELD_DESC['T2202'],
  },
];

// ─── Element ref resolution table (for xsd:element ref="..." in T2202) ───────

const ELEMENT_REF_TYPES: Record<string, string> = {
  SlipReportTypeCode: 'slipDataType',
  SummaryReportTypeCode: 'otherDataType',
  TaxationYear: 'yearType',
  TotalSlipCount: 'int7Type',
  SocialInsuranceNumber: 'ccms:SINType',
};

function resolveRefType(refName: string): string {
  return ELEMENT_REF_TYPES[refName] ?? 'char100Type';
}

// ─── Main generator ───────────────────────────────────────────────────────────

function generateSlipFile(spec: SlipSpec): string {
  const xsdPath = path.join(XSD_DIR, spec.xsdFile);
  const parsed = parseXsd(xsdPath);
  const schema = parsed['xsd:schema'];

  // Build lookup maps from parsed XSD
  const complexTypeMap = new Map<string, XsdComplexType>();
  const groupMap = new Map<string, XsdGroup>();

  for (const ct of schema['xsd:complexType'] ?? []) {
    if (ct['@_name']) complexTypeMap.set(ct['@_name'], ct);
  }
  for (const g of schema['xsd:group'] ?? []) {
    if (g['@_name']) groupMap.set(g['@_name'], g);
  }

  // Collect all local type names so cross-XSD refs fall back to Record<string, unknown>
  const localTypeNames = new Set<string>(complexTypeMap.keys());

  // Build TypeIR for a given XSD complexType name
  function buildTypeIR(typeName: string, doc: string, isChoice = false): TypeIR {
    const ct = complexTypeMap.get(typeName);
    if (!ct) {
      return { xmlName: typeName, tsInterfaceName: `CraXsd_${typeName}`, fields: [], isChoice, doc };
    }

    const fields: FieldIR[] = [];
    const elements: XsdElement[] =
      ct['xsd:all']?.['xsd:element'] ??
      ct['xsd:sequence']?.['xsd:element'] ?? [];

    for (const el of elements) {
      if (el['@_ref'] && !el['@_type']) {
        const resolvedType = resolveRefType(el['@_ref']);
        const withType = { ...el, '@_name': el['@_ref'], '@_type': resolvedType };
        const field = elementToField(withType, spec.descMap, spec.boxMap, localTypeNames, isChoice);
        if (field) fields.push(field);
        continue;
      }
      const field = elementToField(el, spec.descMap, spec.boxMap, localTypeNames, isChoice);
      if (field) fields.push(field);
    }

    // Handle xsd:sequence with xsd:group ref (OtherInfo pattern)
    const groupRefs = ct['xsd:sequence']?.['xsd:group'];
    if (groupRefs) {
      const refs = Array.isArray(groupRefs) ? groupRefs : [groupRefs];
      for (const groupRef of refs) {
        const refName = groupRef['@_ref'];
        if (!refName) continue;
        const group = groupMap.get(refName);
        if (!group?.['xsd:choice']?.['xsd:element']) continue;
        for (const el of group['xsd:choice']['xsd:element']) {
          const field = elementToField(el, spec.descMap, spec.boxMap, localTypeNames, true);
          if (field) fields.push(field);
        }
      }
    }

    return { xmlName: typeName, tsInterfaceName: `CraXsd_${typeName}`, fields, isChoice, doc };
  }

  // Emit order: sub-types first, main slip type last — prevents forward-reference
  // errors in Zod schemas (each schema must be defined before it's referenced).
  const typeIRs: TypeIR[] = [];

  // 1. Amount sub-type
  if (spec.amtTypeName) {
    typeIRs.push(buildTypeIR(spec.amtTypeName, `${spec.slipName} monetary amounts`));
  }

  // 2. OtherInfo (choice = all fields optional)
  if (spec.otherInfoTypeName && spec.otherGroupName) {
    typeIRs.push(buildTypeIR(
      spec.otherInfoTypeName,
      `${spec.slipName} Other Information section — optional coded fields`,
      true,
    ));
  }

  // 3. Additional types (SchoolSessionType, T5008SlipIdentificationRecordType, etc.)
  for (const extra of spec.additionalTypes ?? []) {
    typeIRs.push(buildTypeIR(extra, `${spec.slipName} ${extra}`));
  }

  // 4. Main slip type — last so all referenced schemas already exist
  typeIRs.push(buildTypeIR(spec.slipTypeName, spec.slipTitle));

  // ─── Emit the file ──────────────────────────────────────────────────────────

  const HEADER = `// AUTO-GENERATED — DO NOT HAND-EDIT
// Source XSD: scripts/cra-xsds/${spec.xsdFile} (CRA v1.26.3)
// Regenerate: npm run gen:slip-types
//
// This file provides the XSD-faithful representation of the CRA ${spec.slipName} slip.
// The app-layer types (box14, box16 etc.) live in src/lib/tax-engine/types.ts.
// Use XSD_BOX_MAP_${spec.slipName} from box-mappings.ts to translate between layers.

import { z } from 'zod/v4';
`;

  const bodies = typeIRs.map(ir => {
    return [emitInterface(ir), '', emitZodSchema(ir)].join('\n');
  });

  return [HEADER, ...bodies].join('\n\n');
}

// ─── box-mappings.ts generator ────────────────────────────────────────────────

function generateBoxMappings(): string {
  const lines = [
    `// AUTO-GENERATED — DO NOT HAND-EDIT`,
    `// Source: scripts/generate-slip-types.ts`,
    `// Regenerate: npm run gen:slip-types`,
    `//`,
    `// Maps CRA XSD internal field names → app-layer box keys used in types.ts.`,
    `// Used by /api/ocr to translate CRA XML field names to app types.`,
    ``,
  ];

  const allMaps: Array<{ name: string; map: Record<string, string> }> = [
    { name: 'T4',    map: T4_BOX_MAP    },
    { name: 'T4A',   map: T4A_BOX_MAP   },
    { name: 'T5',    map: T5_BOX_MAP    },
    { name: 'T5008', map: T5008_BOX_MAP },
    { name: 'T3',    map: T3_BOX_MAP    },
    { name: 'T2202', map: T2202_BOX_MAP },
  ];

  for (const { name, map } of allMaps) {
    lines.push(`/** XSD field name → app box key for the ${name} slip */`);
    lines.push(`export const XSD_BOX_MAP_${name}: Record<string, string> = {`);
    for (const [xsdField, boxKey] of Object.entries(map)) {
      lines.push(`  ${xsdField}: '${boxKey}',`);
    }
    lines.push(`};`);
    lines.push('');
  }

  // Convenience: unified lookup
  lines.push('/** Unified lookup: XSD_BOX_MAP[slipType][xsdFieldName] → appBoxKey */');
  lines.push('export const XSD_BOX_MAP: Record<string, Record<string, string>> = {');
  for (const { name } of allMaps) {
    lines.push(`  ${name}: XSD_BOX_MAP_${name},`);
  }
  lines.push('};');

  return lines.join('\n');
}

// ─── index.ts generator ───────────────────────────────────────────────────────

function generateIndex(): string {
  return [
    `// AUTO-GENERATED — DO NOT HAND-EDIT`,
    `// Regenerate: npm run gen:slip-types`,
    ``,
    `// CRA XSD-faithful types (additive — do not replace app types)`,
    `export * from './t4';`,
    `export * from './t4a';`,
    `export * from './t5';`,
    `export * from './t5008';`,
    `export * from './t3';`,
    `export * from './t2202';`,
    `export * from './box-mappings';`,
  ].join('\n');
}

// ─── Run ──────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log('Generating CRA XSD → TypeScript types...\n');

  for (const spec of SLIP_SPECS) {
    process.stdout.write(`  ${spec.slipName}... `);
    const content = generateSlipFile(spec);
    fs.writeFileSync(path.join(OUT_DIR, spec.outFile), content, 'utf8');
    console.log('✓');
  }

  process.stdout.write('  box-mappings.ts... ');
  fs.writeFileSync(path.join(OUT_DIR, 'box-mappings.ts'), generateBoxMappings(), 'utf8');
  console.log('✓');

  process.stdout.write('  index.ts... ');
  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), generateIndex(), 'utf8');
  console.log('✓');

  console.log(`\nOutput: ${OUT_DIR}`);
  console.log('Done.');
}

main();
