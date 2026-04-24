// AUTO-GENERATED — DO NOT HAND-EDIT
// Source XSD: scripts/cra-xsds/t5008.xsd (CRA v1.26.3)
// Regenerate: npm run gen:slip-types
//
// This file provides the XSD-faithful representation of the CRA T5008 slip.
// The app-layer types (box14, box16 etc.) live in src/lib/tax-engine/types.ts.
// Use XSD_BOX_MAP_T5008 from box-mappings.ts to translate between layers.

import { z } from 'zod/v4';


/** T5008 monetary amounts */
export interface CraXsd_T5008AmountType {
  /** Box 20 — Proceeds of disposition / fair market value (box20) — xsd:fval_amt */
  fval_amt?: number;
  /** Box 20 — Cost or book value (adjusted cost base) (box20) — xsd:cost_bok_val_amt */
  cost_bok_val_amt?: number;
  /** Box 21 — Net proceeds of disposition (signed — may be negative) (box21) — xsd:dispn_amt */
  dispn_amt?: number;
}

export const CraXsd_T5008AmountTypeSchema = z.object({
  fval_amt: z.number().optional(),
  cost_bok_val_amt: z.number().optional(),
  dispn_amt: z.number().optional(),
});
export type CraXsd_T5008AmountTypeInferred = z.infer<typeof CraXsd_T5008AmountTypeSchema>;

/** T5008 T5008SlipDispositionType */
export interface CraXsd_T5008SlipDispositionType {
  /** Recipient SIN (recipientSIN) — xsd:sin */
  sin: string;
  /** Recipient business number — xsd:slp_rcpnt_bn */
  slp_rcpnt_bn: string;
  /** Recipient trust account number — xsd:rcpnt_tr_acct_nbr */
  rcpnt_tr_acct_nbr: string;
  /** Reporter BZ account number — xsd:bn */
  bn: string;
  /** Recipient postal code — xsd:rcpnt_pstl_cd */
  rcpnt_pstl_cd?: string;
  /** Date of disposition (MM-DD) (dispositionDate) — xsd:DISPN_DT */
  DISPN_DT: Record<string, unknown>;
  /** T5008 monetary amounts — xsd:T5008_AMT */
  T5008_AMT?: CraXsd_T5008AmountType;
  /** Received security type code (e.g. SH, BD, MF) (receivedSecurityTypeCode) — xsd:rcv_scty_tcd */
  rcv_scty_tcd?: string;
  /** Quantity of securities received (box17) — xsd:scty_rcv_cnt */
  scty_rcv_cnt?: number;
  /** CUSIP number of received security (receivedCUSIP) — xsd:rcv_cusip_nbr */
  rcv_cusip_nbr?: string;
  /** CUSIP code type indicator — xsd:rcv_cusip_cd */
  rcv_cusip_cd?: '1' | '2' | '3';
  /** Box 16 — Description of settled/received security (box16) — xsd:id_scty_sttl_txt */
  id_scty_sttl_txt?: string;
  /** Disposed security type code (disposedSecurityTypeCode) — xsd:dsps_scty_tcd */
  dsps_scty_tcd?: string;
  /** Box 17 — Quantity of securities disposed (box17) — xsd:dsps_scty_cnt */
  dsps_scty_cnt?: number;
  /** CUSIP number of disposed security (disposedCUSIP) — xsd:dsps_cusip_nbr */
  dsps_cusip_nbr?: string;
  /** Disposed CUSIP code type indicator — xsd:dsps_cusip_cd */
  dsps_cusip_cd?: '1' | '2' | '3';
  /** Box 16 — Description of disposed security (box16) — xsd:id_scty_dsps_txt */
  id_scty_dsps_txt?: string;
  /** Foreign currency code (3-letter ISO) (foreignCurrencyCode) — xsd:fgn_crcy_cd */
  fgn_crcy_cd?: string;
  /** Report type code — xsd:rpt_tcd */
  rpt_tcd: 'A' | 'M' | 'O' | 'C';
}

export const CraXsd_T5008SlipDispositionTypeSchema = z.object({
  sin: z.string().regex(/^\d{1,9}$/),
  slp_rcpnt_bn: z.string(),
  rcpnt_tr_acct_nbr: z.string(),
  bn: z.string(),
  rcpnt_pstl_cd: z.string().optional(),
  DISPN_DT: z.record(z.string(), z.unknown()),
  T5008_AMT: CraXsd_T5008AmountTypeSchema.optional(),
  rcv_scty_tcd: z.string().max(3).optional(),
  scty_rcv_cnt: z.number().optional(),
  rcv_cusip_nbr: z.string().max(12).optional(),
  rcv_cusip_cd: z.enum(['1', '2', '3']).optional(),
  id_scty_sttl_txt: z.string().max(60).optional(),
  dsps_scty_tcd: z.string().max(3).optional(),
  dsps_scty_cnt: z.number().optional(),
  dsps_cusip_nbr: z.string().max(12).optional(),
  dsps_cusip_cd: z.enum(['1', '2', '3']).optional(),
  id_scty_dsps_txt: z.string().max(60).optional(),
  fgn_crcy_cd: z.string().max(3).optional(),
  rpt_tcd: z.enum(['A', 'M', 'O', 'C']),
});
export type CraXsd_T5008SlipDispositionTypeInferred = z.infer<typeof CraXsd_T5008SlipDispositionTypeSchema>;

/** T5008 T5008SlipIdentificationRecordType */
export interface CraXsd_T5008SlipIdentificationRecordType {
  /** Recipient name — xsd:RCPNT_NM */
  RCPNT_NM?: Record<string, unknown>;
  /** Second recipient name — xsd:SEC_RCPNT_NM */
  SEC_RCPNT_NM?: Record<string, unknown>;
  /** Enterprise name — xsd:ENTPRS_NM */
  ENTPRS_NM?: Record<string, unknown>;
  /** Recipient address — xsd:RCPNT_ADDR */
  RCPNT_ADDR?: Record<string, unknown>;
  /** Recipient SIN (recipientSIN) — xsd:sin */
  sin: string;
  /** Recipient business number — xsd:slp_rcpnt_bn */
  slp_rcpnt_bn: string;
  /** Recipient trust account number — xsd:rcpnt_tr_acct_nbr */
  rcpnt_tr_acct_nbr: string;
  /** Reporter BZ account number — xsd:bn */
  bn: string;
  /** Box 15 — Recipient account number (box15) — xsd:rcpnt_acct_nbr */
  rcpnt_acct_nbr?: string;
  /** Report type code — xsd:rpt_tcd */
  rpt_tcd: 'A' | 'M' | 'O' | 'C';
  /** Box 22 — Recipient type code (1=individual, 2=joint, 3=corporation, 4=trust) (box22) — xsd:rcpnt_tcd */
  rcpnt_tcd: '1' | '2' | '3' | '4';
  /** Number of disposition transactions in this slip (dispositionCount) — xsd:dispn_trans_cnt */
  dispn_trans_cnt: string;
  /** Total settlement amount for all dispositions (totalSettlementAmount) — xsd:sttl_amt */
  sttl_amt: number;
}

export const CraXsd_T5008SlipIdentificationRecordTypeSchema = z.object({
  RCPNT_NM: z.record(z.string(), z.unknown()).optional(),
  SEC_RCPNT_NM: z.record(z.string(), z.unknown()).optional(),
  ENTPRS_NM: z.record(z.string(), z.unknown()).optional(),
  RCPNT_ADDR: z.record(z.string(), z.unknown()).optional(),
  sin: z.string().regex(/^\d{1,9}$/),
  slp_rcpnt_bn: z.string(),
  rcpnt_tr_acct_nbr: z.string(),
  bn: z.string(),
  rcpnt_acct_nbr: z.string().max(12).optional(),
  rpt_tcd: z.enum(['A', 'M', 'O', 'C']),
  rcpnt_tcd: z.enum(['1', '2', '3', '4']),
  dispn_trans_cnt: z.string(),
  sttl_amt: z.number(),
});
export type CraXsd_T5008SlipIdentificationRecordTypeInferred = z.infer<typeof CraXsd_T5008SlipIdentificationRecordTypeSchema>;

/** T5008 — Statement of Securities Transactions */
export interface CraXsd_T5008SlipType {
  /** disp_record — xsd:disp_record */
  disp_record?: CraXsd_T5008SlipDispositionType[];
  /** ident_record — xsd:ident_record */
  ident_record: CraXsd_T5008SlipIdentificationRecordType;
}

export const CraXsd_T5008SlipTypeSchema = z.object({
  disp_record: z.array(CraXsd_T5008SlipDispositionTypeSchema).optional(),
  ident_record: CraXsd_T5008SlipIdentificationRecordTypeSchema,
});
export type CraXsd_T5008SlipTypeInferred = z.infer<typeof CraXsd_T5008SlipTypeSchema>;