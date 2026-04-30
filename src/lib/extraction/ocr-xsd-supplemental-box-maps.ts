/**
 * Report-only CRA XSD field name -> app box key mappings for supported slips
 * that are not yet emitted by the generated CRA slip type pipeline.
 *
 * These maps are only used by the offline OCR/XSD inventory report. They do
 * not validate production uploads and do not change extraction behavior.
 */
export const SUPPLEMENTAL_OCR_XSD_BOX_MAP: Record<string, Record<string, string>> = {
  T4E: {
    ben_pay_amt: 'box14',
    itx_ddct_amt: 'box22',
  },
  T5007: {
    scl_ast_amt: 'box10',
    wrkr_cmpn_ben_amt: 'box10',
  },
  T4AP: {
    rtir_ben_amt: 'box16',
    dsblt_ben_amt: 'box16',
    dth_ben_amt: 'box20',
    itx_ddct_amt: 'box22',
  },
  T4AOAS: {
    gro_pens_pay_amt: 'box18',
    net_supp_amt: 'box21',
    itx_ddct_amt: 'box22',
  },
  T4RSP: {
    wdrw_pay_amt: 'box20',
    tx_ddct_amt: 'box22',
  },
  T4RIF: {
    tx_amt: 'box16',
    tx_ddct_amt: 'box30',
  },
  'RRSP-Receipt': {
    rrsp_pyr_amt: 'amount',
    rrsp_cyr_amt: 'amount',
    sps_cntrb_ind: 'planType',
  },
  T4FHSA: {
    TaxableWithdrawalAmount: 'box14',
    TotalTaxableWithdrawalAmount: 'box14',
    IncomeTaxDeductedAmount: 'box22',
    TotalIncomeTaxDeductedAmount: 'box22',
    ContributionAmount: 'box24',
    TotalContributionAmount: 'box24',
  },
};
