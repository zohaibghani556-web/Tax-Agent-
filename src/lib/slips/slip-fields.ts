/**
 * CRA slip field definitions — shared by SlipUpload (post-OCR edit form)
 * and ManualEntryForm (direct entry tabs).
 *
 * Each entry maps a slip type to its form fields with CRA box labels.
 */

export interface SlipFieldDef {
  key: string;
  /** Human-readable label with CRA box reference */
  label: string;
  valueType: 'number' | 'text';
  required: boolean;
  placeholder?: string;
}

export const SLIP_FIELDS: Record<string, SlipFieldDef[]> = {
  T4: [
    { key: 'issuerName', label: 'Employer Name', valueType: 'text', required: true },
    { key: 'box14', label: 'Box 14 — Employment Income', valueType: 'number', required: true },
    { key: 'box16', label: 'Box 16 — Employee CPP Contributions', valueType: 'number', required: false },
    { key: 'box16A', label: 'Box 16A — Employee CPP2 Contributions', valueType: 'number', required: false },
    { key: 'box18', label: 'Box 18 — Employee EI Premiums', valueType: 'number', required: false },
    { key: 'box20', label: 'Box 20 — RPP Contributions', valueType: 'number', required: false },
    { key: 'box22', label: 'Box 22 — Income Tax Deducted', valueType: 'number', required: false },
    { key: 'box24', label: 'Box 24 — EI Insurable Earnings', valueType: 'number', required: false },
    { key: 'box26', label: 'Box 26 — CPP/QPP Pensionable Earnings', valueType: 'number', required: false },
    { key: 'box40', label: 'Box 40 — Other Taxable Allowances & Benefits', valueType: 'number', required: false },
    { key: 'box42', label: 'Box 42 — Employment Commissions', valueType: 'number', required: false },
    { key: 'box44', label: 'Box 44 — Union Dues', valueType: 'number', required: false },
    { key: 'box45', label: 'Box 45 — Dental Benefits Code (1–5)', valueType: 'text', required: false, placeholder: '1' },
    { key: 'box46', label: 'Box 46 — Charitable Donations', valueType: 'number', required: false },
    { key: 'box52', label: 'Box 52 — Pension Adjustment', valueType: 'number', required: false },
    { key: 'box85', label: 'Box 85 — Employee-Paid Private Health Premiums (ON)', valueType: 'number', required: false },
  ],
  T5: [
    { key: 'issuerName', label: 'Financial Institution Name', valueType: 'text', required: true },
    { key: 'box11', label: 'Box 11 — Taxable Dividends (Non-Eligible)', valueType: 'number', required: false },
    { key: 'box12', label: 'Box 12 — Actual Dividends (Non-Eligible)', valueType: 'number', required: false },
    { key: 'box13', label: 'Box 13 — Interest from Canadian Sources', valueType: 'number', required: false },
    { key: 'box14', label: 'Box 14 — Other Income from Canadian Sources', valueType: 'number', required: false },
    { key: 'box18', label: 'Box 18 — Capital Gains Dividends', valueType: 'number', required: false },
    { key: 'box24', label: 'Box 24 — Actual Eligible Dividends', valueType: 'number', required: false },
    { key: 'box25', label: 'Box 25 — Taxable Eligible Dividends', valueType: 'number', required: false },
    { key: 'box26', label: 'Box 26 — Dividend Tax Credit (Eligible)', valueType: 'number', required: false },
  ],
  T5008: [
    { key: 'issuerName', label: 'Broker / Financial Institution Name', valueType: 'text', required: true },
    { key: 'box15', label: 'Box 15 — Type of Income Code', valueType: 'text', required: false, placeholder: 'e.g. 1' },
    { key: 'box16', label: 'Box 16 — Security Description', valueType: 'text', required: false, placeholder: 'e.g. AAPL' },
    { key: 'box20', label: 'Box 20 — Cost or Book Value (ACB)', valueType: 'number', required: false },
    { key: 'box21', label: 'Box 21 — Proceeds of Disposition', valueType: 'number', required: true },
    { key: 'box22', label: 'Box 22 — Quantity', valueType: 'number', required: false },
  ],
  T3: [
    { key: 'issuerName', label: 'Trust / Fund Name', valueType: 'text', required: true },
    { key: 'box21', label: 'Box 21 — Capital Gains', valueType: 'number', required: false },
    { key: 'box22', label: 'Box 22 — Actual Eligible Dividends', valueType: 'number', required: false },
    { key: 'box23', label: 'Box 23 — Taxable Eligible Dividends', valueType: 'number', required: false },
    { key: 'box26', label: 'Box 26 — Other Income', valueType: 'number', required: false },
    { key: 'box32', label: 'Box 32 — Taxable Other Dividends', valueType: 'number', required: false },
    { key: 'box49', label: 'Box 49 — Interest', valueType: 'number', required: false },
    { key: 'box50', label: 'Box 50 — Other Investment Income', valueType: 'number', required: false },
  ],
  T4A: [
    { key: 'issuerName', label: 'Payer Name', valueType: 'text', required: true },
    { key: 'box016', label: 'Box 016 — Pension or Superannuation', valueType: 'number', required: false },
    { key: 'box018', label: 'Box 018 — Lump-Sum Payments', valueType: 'number', required: false },
    { key: 'box020', label: 'Box 020 — Self-Employed Commissions', valueType: 'number', required: false },
    { key: 'box022', label: 'Box 022 — Income Tax Deducted', valueType: 'number', required: false },
    { key: 'box024', label: 'Box 024 — Annuities', valueType: 'number', required: false },
    { key: 'box028', label: 'Box 028 — Other Income', valueType: 'number', required: false },
    { key: 'box105', label: 'Box 105 — Scholarships / Bursaries / Fellowships', valueType: 'number', required: false },
    { key: 'box135', label: 'Box 135 — RESP Accumulated Income', valueType: 'number', required: false },
  ],
  T2202: [
    { key: 'institutionName', label: 'Educational Institution Name', valueType: 'text', required: true },
    { key: 'boxA', label: 'Box A — Eligible Tuition Fees', valueType: 'number', required: true },
    { key: 'boxB', label: 'Box B — Part-Time Months Enrolled', valueType: 'number', required: false, placeholder: '0' },
    { key: 'boxC', label: 'Box C — Full-Time Months Enrolled', valueType: 'number', required: false, placeholder: '0' },
  ],
  T4E: [
    { key: 'box14', label: 'Box 14 — Total EI Benefits Paid', valueType: 'number', required: true },
    { key: 'box22', label: 'Box 22 — Income Tax Deducted', valueType: 'number', required: false },
  ],
  T5007: [
    { key: 'box10', label: 'Box 10 — Social Assistance Payments', valueType: 'number', required: true },
  ],
  T4AP: [
    { key: 'issuerName', label: 'Payer (usually "Service Canada")', valueType: 'text', required: false },
    { key: 'box16', label: 'Box 16 — CPP Retirement/Disability Pension', valueType: 'number', required: true },
    { key: 'box20', label: 'Box 20 — CPP Death Benefit (rare)', valueType: 'number', required: false },
    { key: 'box22', label: 'Box 22 — Income Tax Deducted', valueType: 'number', required: false },
  ],
  'T4AOAS': [
    { key: 'issuerName', label: 'Payer (usually "Service Canada")', valueType: 'text', required: false },
    { key: 'box18', label: 'Box 18 — OAS Pension', valueType: 'number', required: true },
    { key: 'box21', label: 'Box 21 — Net Supplements (GIS — not taxable, do not include in income)', valueType: 'number', required: false },
    { key: 'box22', label: 'Box 22 — Income Tax Deducted', valueType: 'number', required: false },
  ],
  T4RSP: [
    { key: 'issuerName', label: 'Financial Institution Name', valueType: 'text', required: true },
    { key: 'box22', label: 'Box 22 — Total RRSP Income (Amount Withdrawn)', valueType: 'number', required: true },
    { key: 'box30', label: 'Box 30 — Income Tax Deducted', valueType: 'number', required: false },
  ],
  T4RIF: [
    { key: 'issuerName', label: 'Financial Institution Name', valueType: 'text', required: true },
    { key: 'box16', label: 'Box 16 — Taxable RRIF Amounts', valueType: 'number', required: true },
    { key: 'box30', label: 'Box 30 — Income Tax Deducted', valueType: 'number', required: false },
  ],
  'RRSP-Receipt': [
    { key: 'issuerName', label: 'Financial Institution (e.g. TD, Wealthsimple)', valueType: 'text', required: true },
    { key: 'amount', label: 'Contribution Amount', valueType: 'number', required: true },
    { key: 'planType', label: 'Plan Type (RRSP or SPOUSAL-RRSP)', valueType: 'text', required: false, placeholder: 'RRSP' },
  ],

  T4FHSA: [
    { key: 'issuerName', label: 'Financial Institution', valueType: 'text', required: true },
    { key: 'box14', label: 'Box 14 — Taxable FHSA Income (non-qualifying withdrawals)', valueType: 'number', required: false },
    { key: 'box22', label: 'Box 22 — Income Tax Deducted', valueType: 'number', required: false },
    { key: 'box24', label: 'Box 24 — FHSA Contributions (for deduction verification)', valueType: 'number', required: false },
  ],
};

export const SLIP_TYPE_LABELS: Record<string, string> = {
  T4: 'T4 — Employment Income',
  T5: 'T5 — Investment Income',
  T5008: 'T5008 — Securities Transactions',
  T3: 'T3 — Trust Income',
  T4A: 'T4A — Pension & Other Income',
  T2202: 'T2202 — Tuition Certificate',
  T4E: 'T4E — Employment Insurance Benefits',
  T5007: 'T5007 — Social Assistance',
  T4AP: 'T4A(P) — CPP Pension Benefits',
  'T4AOAS': 'T4A(OAS) — Old Age Security',
  T4RSP: 'T4RSP — RRSP Income (Withdrawal)',
  T4RIF: 'T4RIF — RRIF Income',
  'RRSP-Receipt': 'RRSP Contribution Receipt',
  T4FHSA: 'T4FHSA — First Home Savings Account',
};

/** Key box to surface as the "primary amount" in the slip list. */
export const SLIP_PRIMARY_BOX: Record<string, { key: string; label: string }> = {
  T4: { key: 'box14', label: 'Employment income' },
  T5: { key: 'box13', label: 'Interest income' },
  T5008: { key: 'box21', label: 'Proceeds' },
  T3: { key: 'box26', label: 'Other income' },
  T4A: { key: 'box016', label: 'Pension income' },
  T2202: { key: 'boxA', label: 'Tuition fees' },
  T4E: { key: 'box14', label: 'EI benefits' },
  T5007: { key: 'box10', label: 'Social assistance' },
  T4AP: { key: 'box16', label: 'CPP pension' },
  'T4AOAS': { key: 'box18', label: 'OAS pension' },
  T4RSP: { key: 'box22', label: 'RRSP withdrawal' },
  T4RIF: { key: 'box16', label: 'RRIF income' },
  'RRSP-Receipt': { key: 'amount', label: 'RRSP contribution' },
  T4FHSA: { key: 'box24', label: 'FHSA contributions' },
};

/** Build a zero-filled values object for a given slip type. */
export function getEmptySlipValues(slipType: string): Record<string, number | string> {
  const fields = SLIP_FIELDS[slipType] ?? [];
  return Object.fromEntries(
    fields.map((f) => [f.key, f.valueType === 'number' ? 0 : ''])
  );
}

/** Merge OCR-extracted boxes into the zero-filled values for a slip type. */
export function mergeOcrValues(
  slipType: string,
  ocrBoxes: Record<string, number | string>
): Record<string, number | string> {
  const base = getEmptySlipValues(slipType);
  for (const [k, v] of Object.entries(ocrBoxes)) {
    if (k in base) {
      base[k] = v;
    }
  }
  return base;
}
