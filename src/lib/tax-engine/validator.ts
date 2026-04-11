/**
 * TaxAgent.ai — Tax Return Completeness Validator
 *
 * Validates a T1 return for completeness and consistency before filing.
 * Produces a list of issues (errors and warnings) and a completion percentage.
 *
 * Errors (severity: 'error') = things that will prevent filing or cause CRA assessment.
 * Warnings (severity: 'warning') = things to review but not necessarily blocking.
 *
 * This module is PURE logic — no I/O, no side effects, deterministic.
 * It does not calculate tax amounts; it validates the inputs.
 */

import { RRSP, CPP, EI } from './constants';
import type { TaxProfile, DeductionsCreditsInput, TaxSlip } from './types';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  code: string;                 // Machine-readable code
  message: string;              // Plain-language description for the user
  field?: string;               // Which field/section this relates to
  suggestion?: string;          // Recommended action
}

export interface ValidationResult {
  completionPct: number;        // 0–100, represents how "complete" the return looks
  issues: ValidationIssue[];
  errors: ValidationIssue[];    // Subset: severity === 'error'
  warnings: ValidationIssue[];  // Subset: severity === 'warning'
  isFileable: boolean;          // True if no blocking errors
}

// ── Internal helper ──────────────────────────────────────────────────────────

function issue(
  severity: IssueSeverity,
  code: string,
  message: string,
  field?: string,
  suggestion?: string
): ValidationIssue {
  return { severity, code, message, field, suggestion };
}

// ── Completeness scoring ─────────────────────────────────────────────────────

/**
 * Weights for completeness scoring.
 * Each key represents a "section" with a max point value.
 * Points are awarded if the section has data.
 */
const SECTION_WEIGHTS = {
  profile:     20,   // Personal info: name, DOB, marital status, province
  slips:       25,   // At least one tax slip uploaded
  rrsp:        10,   // RRSP deduction section filled (if applicable)
  deductions:  20,   // Deductions section reviewed
  credits:     15,   // Credits section reviewed
  ontario:     10,   // Ontario-specific fields (rent/property tax)
};

const MAX_SCORE = Object.values(SECTION_WEIGHTS).reduce((a, b) => a + b, 0);

// ── Main validator ───────────────────────────────────────────────────────────

/**
 * Validates the T1 return for completeness and correctness.
 *
 * @param profile  Taxpayer profile (personal info, dependants)
 * @param slips    Uploaded tax slips
 * @param deductions  Deductions and credits input
 */
export function validateTaxReturn(
  profile: Partial<TaxProfile> | null | undefined,
  slips: TaxSlip[],
  deductions: Partial<DeductionsCreditsInput> | null | undefined
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // ── Profile checks ────────────────────────────────────────────────────────
  if (!profile?.legalName?.trim()) {
    issues.push(issue('error', 'MISSING_NAME',
      'Legal name is required for your T1 return.',
      'legalName',
      'Enter your full legal name as it appears on your government-issued ID.'));
  }

  if (!profile?.dateOfBirth) {
    issues.push(issue('error', 'MISSING_DOB',
      'Date of birth is required to calculate age-related credits (Age Amount, Seniors credits).',
      'dateOfBirth',
      'Enter your date of birth in your profile settings.'));
  }

  if (!profile?.maritalStatus) {
    issues.push(issue('error', 'MISSING_MARITAL_STATUS',
      'Marital status as of December 31, 2025 is required.',
      'maritalStatus',
      'Update your marital status in your profile.'));
  }

  // Spouse income check for spousal credit
  if ((profile?.maritalStatus === 'married' || profile?.maritalStatus === 'common-law')
    && deductions?.hasSpouseOrCL
    && (deductions?.spouseNetIncome === undefined || deductions.spouseNetIncome < 0)) {
    issues.push(issue('warning', 'MISSING_SPOUSE_INCOME',
      'Spouse/common-law partner net income is needed to calculate the spousal amount credit.',
      'spouseNetIncome',
      'Enter your spouse\'s estimated 2025 net income (line 23600 from their return).'));
  }

  // ── Slip checks ───────────────────────────────────────────────────────────
  if (slips.length === 0) {
    issues.push(issue('warning', 'NO_SLIPS',
      'No tax slips have been uploaded. Most Canadians have at least a T4 from their employer.',
      'slips',
      'Upload your T4, T5, or other tax slips to ensure complete reporting.'));
  }

  // Check for T4 slips — most employed Canadians should have one
  const hasT4 = slips.some(s => s.type === 'T4');
  const hasOtherIncome = slips.some(s => ['T5', 'T3', 'T5008', 'T4A', 'T4RSP', 'T4RIF'].includes(s.type));
  if (!hasT4 && !hasOtherIncome && slips.length === 0) {
    issues.push(issue('warning', 'LIKELY_MISSING_T4',
      'Most employees receive a T4 slip from their employer by end of February.',
      'slips',
      'Check your email, employer portal, or CRA My Account for your T4.'));
  }

  // ── RRSP checks ───────────────────────────────────────────────────────────
  const rrspContribs = deductions?.rrspContributions ?? 0;
  const rrspRoom     = deductions?.rrspContributionRoom ?? 0;

  if (rrspContribs > 0 && rrspRoom === 0) {
    issues.push(issue('warning', 'RRSP_ROOM_NOT_ENTERED',
      'You entered RRSP contributions but no contribution room. Over-contributions attract a 1% monthly penalty.',
      'rrspContributionRoom',
      'Find your 2024 RRSP deduction limit on your 2024 Notice of Assessment (line A on the RRSP section).'));
  }

  if (rrspContribs > 0 && rrspRoom > 0 && rrspContribs > rrspRoom + 2000) {
    // CRA allows a $2,000 over-contribution buffer
    issues.push(issue('error', 'RRSP_OVER_CONTRIBUTION',
      `RRSP over-contribution detected: $${(rrspContribs - rrspRoom - 2000).toFixed(2)} above the $2,000 buffer. ` +
      'CRA charges 1% per month on excess contributions. A T1-OVP return is required.',
      'rrspContributions',
      'Withdraw the excess RRSP contributions and file a T1-OVP for each month the excess existed.'));
  }

  if (rrspContribs > RRSP.maxContribution) {
    issues.push(issue('warning', 'RRSP_EXCEEDS_DOLLAR_LIMIT',
      `RRSP contributions of $${rrspContribs.toFixed(2)} exceed the 2025 annual dollar limit of $${RRSP.maxContribution.toFixed(2)}.`,
      'rrspContributions',
      'Verify your 2025 RRSP contribution limit from your 2024 Notice of Assessment. The dollar limit is $32,490 but your room may be higher based on prior-year earned income.'));
  }

  // ── CPP/EI plausibility checks (from T4 slips) ────────────────────────────
  const t4Slips = slips.filter(s => s.type === 'T4').map(s => s.data as {
    box14: number; box16: number; box18: number;
  });

  let totalCPPDeducted = 0;
  let totalEIDeducted  = 0;
  let totalEmploymentIncome = 0;

  for (const t4 of t4Slips) {
    totalCPPDeducted += t4.box16 ?? 0;
    totalEIDeducted  += t4.box18 ?? 0;
    totalEmploymentIncome += t4.box14 ?? 0;
  }

  if (totalCPPDeducted > CPP.maxEmployeeContribution + 10) {
    issues.push(issue('warning', 'CPP_POSSIBLE_OVER_DEDUCTION',
      `CPP deducted ($${totalCPPDeducted.toFixed(2)}) may exceed the 2025 annual maximum ` +
      `($${CPP.maxEmployeeContribution.toFixed(2)}). You may be entitled to a CPP refund (line 44800).`,
      'cpp',
      'If you worked for multiple employers, over-deduction is common. The engine will calculate any refund automatically.'));
  }

  if (totalEIDeducted > EI.maxPremium + 10) {
    issues.push(issue('warning', 'EI_POSSIBLE_OVER_DEDUCTION',
      `EI premiums deducted ($${totalEIDeducted.toFixed(2)}) may exceed the 2025 annual maximum ` +
      `($${EI.maxPremium.toFixed(2)}). You may be entitled to an EI refund (line 45000).`,
      'ei',
      'Over-deduction occurs when you work multiple jobs. The engine will calculate any refund.'));
  }

  // ── Foreign income checks — enhanced T1135 trigger (ITA s.233.3) ─────────
  const hasT5 = slips.some(s => s.type === 'T5');
  if (hasT5) {
    // Aggregate all foreign income from T5 box 14 (other income from foreign sources)
    const totalForeignIncome = slips
      .filter(s => s.type === 'T5')
      .reduce((sum, s) => sum + ((s.data as { box14?: number }).box14 ?? 0), 0);

    const t5HasForeignIncome = totalForeignIncome > 0;

    if (t5HasForeignIncome) {
      if (totalForeignIncome > 100000) {
        // Above $100,000 aggregate threshold → T1135 required (ITA s.233.3)
        issues.push(issue('error', 'T1135_REQUIRED',
          'Your foreign income suggests total foreign property may exceed CAD $100,000. ' +
          'T1135 (Foreign Income Verification Statement) is required by April 30, 2026 — ' +
          'same deadline as your T1. Penalties: $25/day, minimum $100, maximum $2,500 (ITA s.233.3).',
          'foreignIncome',
          'Complete and file T1135 (Foreign Income Verification Statement) reporting all foreign property with a cost over CAD $100,000.'));
      } else {
        issues.push(issue('warning', 'FOREIGN_INCOME_DETECTED',
          'Foreign income detected on a T5 slip. If your total foreign property cost exceeds CAD $100,000, you must file T1135 (Foreign Income Verification).',
          'foreignIncome',
          'Review all foreign assets, bank accounts, and investments. File T1135 by April 30, 2026 if required.'));
      }
    }
  }

  // ── Medical expense checks ────────────────────────────────────────────────
  const medExpenses = deductions?.medicalExpenses ?? [];
  const totalMedical = Array.isArray(medExpenses)
    ? medExpenses.reduce((sum, e) => sum + e.amount, 0)
    : 0;

  if (totalMedical > 50000) {
    issues.push(issue('warning', 'HIGH_MEDICAL_EXPENSES',
      `Medical expenses of $${totalMedical.toFixed(2)} are unusually high. Ensure all expenses are for CRA-eligible medical services.`,
      'medicalExpenses',
      'Review CRA\'s list of eligible medical expenses at canada.ca/medical-expenses.'));
  }

  // ── Charitable donation checks ────────────────────────────────────────────
  const donations = deductions?.donations ?? [];
  const totalDonations = Array.isArray(donations)
    ? donations.reduce((sum, d) => sum + d.amount, 0)
    : 0;

  const netIncomeEstimate = totalEmploymentIncome;  // rough proxy
  if (netIncomeEstimate > 0 && totalDonations > netIncomeEstimate * 0.75) {
    issues.push(issue('warning', 'DONATIONS_EXCEED_75_PCT',
      'Charitable donations exceed 75% of estimated net income — the CRA maximum claim for the year.',
      'donations',
      'The excess can be carried forward up to 5 years. Do not claim more than 75% of net income.'));
  }

  // ── Dependant consistency checks ─────────────────────────────────────────
  if (deductions?.hasEligibleDependant && deductions?.hasSpouseOrCL) {
    issues.push(issue('error', 'ELIGIBLE_DEPENDANT_WITH_SPOUSE',
      'The eligible dependant amount (line 30400) cannot be claimed if you are claiming the spouse/common-law partner amount (line 30300).',
      'eligibleDependant',
      'Claim either the spouse amount or the eligible dependant amount — not both.'));
  }

  // ── Ontario-specific completeness ─────────────────────────────────────────
  const rentPaid     = deductions?.rentPaid ?? 0;
  const propertyTax  = deductions?.propertyTaxPaid ?? 0;
  const isRenter     = rentPaid > 0;
  const isOwner      = propertyTax > 0;

  if (!isRenter && !isOwner) {
    issues.push(issue('warning', 'ONTARIO_OTB_INCOMPLETE',
      'Ontario Trillium Benefit (OTB) requires either annual rent paid or property tax paid for the OEPTC credit.',
      'ontario',
      'If you rented in 2025, enter annual rent paid. If you own your home, enter 2025 property taxes paid.'));
  }

  if (isRenter && isOwner) {
    issues.push(issue('warning', 'BOTH_RENT_AND_PROPERTY_TAX',
      'Both rent paid and property tax paid are entered. For OTB, you should claim one or the other for each address.',
      'ontario',
      'Verify — you may have both if you moved between a rental and owned property during 2025. Prorate if needed.'));
  }

  // ── Completeness scoring ──────────────────────────────────────────────────
  let score = 0;

  // Profile (20 pts)
  const profileComplete =
    !!profile?.legalName?.trim() &&
    !!profile?.dateOfBirth &&
    !!profile?.maritalStatus;
  if (profileComplete) score += SECTION_WEIGHTS.profile;
  else score += SECTION_WEIGHTS.profile * (profileComplete ? 1 : 0.5);

  // Slips (25 pts)
  if (slips.length > 0) score += SECTION_WEIGHTS.slips;

  // RRSP (10 pts): either no RRSP or RRSP with room entered
  if (rrspContribs === 0 || (rrspContribs > 0 && rrspRoom > 0)) {
    score += SECTION_WEIGHTS.rrsp;
  } else {
    score += SECTION_WEIGHTS.rrsp * 0.5;
  }

  // Deductions (20 pts): any non-zero deduction or medical/donations
  const hasDeductions =
    (deductions?.rrspContributions ?? 0) > 0 ||
    (deductions?.unionDues ?? 0) > 0 ||
    (deductions?.childcareExpenses ?? 0) > 0 ||
    Array.isArray(deductions?.medicalExpenses) && deductions.medicalExpenses.length > 0 ||
    Array.isArray(deductions?.donations) && deductions.donations.length > 0;
  score += hasDeductions ? SECTION_WEIGHTS.deductions : SECTION_WEIGHTS.deductions * 0.6;

  // Credits (15 pts): any credit-related field reviewed
  const hasCredits =
    deductions?.hasDisabilityCredit === true ||
    deductions?.homeBuyersEligible === true ||
    (deductions?.homeAccessibilityExpenses ?? 0) > 0 ||
    (deductions?.digitalNewsSubscription ?? 0) > 0 ||
    (deductions?.canadaTrainingCreditRoom ?? 0) > 0;
  score += hasCredits ? SECTION_WEIGHTS.credits : SECTION_WEIGHTS.credits * 0.5;

  // Ontario (10 pts): rent or property tax entered
  if (isRenter || isOwner) score += SECTION_WEIGHTS.ontario;
  else score += SECTION_WEIGHTS.ontario * 0.3;

  const completionPct = Math.round(Math.min(100, (score / MAX_SCORE) * 100));

  const errors   = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const isFileable = errors.length === 0;

  return { completionPct, issues, errors, warnings, isFileable };
}
