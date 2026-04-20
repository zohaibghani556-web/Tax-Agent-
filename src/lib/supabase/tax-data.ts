/**
 * TaxAgent.ai — Supabase persistence helpers.
 *
 * All data uses the tax_profiles row as the anchor (profile_id).
 * localStorage stays as the fast read cache; Supabase is the source of truth.
 *
 * Functions silently log errors and return null/[] — never throw to the UI.
 */

import { createClient } from '@/lib/supabase/client';
import type { TaxProfile, TaxCalculationResult, FilingGuide } from '@/lib/tax-engine/types';

// ─── Exported types ──────────────────────────────────────────────────────────

export interface SavedSlip {
  id: string;
  type: string;
  issuerName: string;
  data: Record<string, number | string>;
  enteredAt: string;
}

/**
 * Subset of deductions stored in both localStorage and Supabase.
 * Fields with no DB column (hasSpouseOrCL, volunteerFirefighter, etc.) are
 * persisted in localStorage only — they serve as calculator UX state.
 */
export interface UserDeductions {
  rrspContributions: number;
  rrspContributionRoom: number;
  rentPaid: number;
  propertyTaxPaid: number;
  childcareExpenses: number;
  movingExpenses: number;
  supportPaymentsMade: number;
  instalmentsPaid: number;
  medicalExpenses: number;
  charitableDonations: number;
  studentLoanInterest: number;
  unionDues: number;
  tuitionCarryforward: number;
  digitalNewsSubscription: number;
  homeAccessibilityExpenses: number;
  hasSpouseOrCL: boolean;
  spouseNetIncome: number;
  hasEligibleDependant: boolean;
  eligibleDependantNetIncome: number;
  caregiverForDependant18Plus: boolean;
  caregiverDependantNetIncome: number;
  hasDisabilityCredit: boolean;
  homeBuyersEligible: boolean;
  volunteerFirefighter: boolean;
  searchAndRescue: boolean;
  canadaTrainingCreditRoom: number;
  trainingFeesForCTC: number;
}

// Slip types that satisfy the DB CHECK constraint on tax_slips.slip_type.
// Must stay in sync with: (1) SLIP_FIELDS in slip-fields.ts, (2) the CHECK
// constraint in migration 20260420000001_slip_types_expand.sql, and (3)
// TaxSlip['type'] in tax-engine/types.ts.
// The parity test in tax-data.test.ts fails CI if any type is missing here.
export const SUPPORTED_SLIP_TYPES = new Set([
  'T4', 'T5', 'T5008', 'T3', 'T4A', 'T2202', 'T4E', 'T5007',
  'T4AP', 'T4AOAS', 'T4RSP', 'T4RIF', 'RRSP-Receipt', 'T4FHSA',
]);

// ─── Internal helper: get or create the tax_profiles row ────────────────────

/**
 * All related tables (slips, deductions, calculations, chat) use profile_id
 * as their FK — not user_id directly. This helper lazily creates the profile
 * if it doesn't exist yet.
 */
async function getOrCreateProfileId(
  userId: string,
  taxYear: number,
): Promise<string | null> {
  const supabase = createClient();

  const { data: existing, error: fetchErr } = await supabase
    .from('tax_profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('tax_year', taxYear)
    .maybeSingle();

  if (fetchErr) {
    console.error('[tax-data] profile fetch error:', fetchErr.message);
    return null;
  }
  if (existing) return existing.id as string;

  // No profile yet — create one
  const { data: created, error: createErr } = await supabase
    .from('tax_profiles')
    .insert({ user_id: userId, tax_year: taxYear })
    .select('id')
    .single();

  if (createErr) {
    console.error('[tax-data] profile create error:', createErr.message);
    return null;
  }

  return created.id as string;
}

// ─── Tax Profile ─────────────────────────────────────────────────────────────

export async function upsertTaxProfile(
  userId: string,
  data: Partial<TaxProfile>,
): Promise<void> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, data.taxYear ?? 2025);
  if (!profileId) return;

  const { error } = await supabase
    .from('tax_profiles')
    .update({
      legal_name: data.legalName,
      date_of_birth: data.dateOfBirth,
      marital_status: data.maritalStatus,
      residency_status: data.residencyStatus,
      residency_start_date: data.residencyStartDate,
      dependants: data.dependants,
      assessment_complete: data.assessmentComplete,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  if (error) console.error('[tax-data] upsertTaxProfile error:', error.message);
}

export async function getTaxProfile(userId: string): Promise<TaxProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tax_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('tax_year', 2025)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    userId: data.user_id as string,
    taxYear: data.tax_year as number,
    legalName: (data.legal_name as string | null) ?? '',
    dateOfBirth: (data.date_of_birth as string | null) ?? '',
    maritalStatus: ((data.marital_status as string | null) ?? 'single') as TaxProfile['maritalStatus'],
    province: 'ON',
    residencyStatus: ((data.residency_status as string | null) ?? 'citizen') as TaxProfile['residencyStatus'],
    residencyStartDate: (data.residency_start_date as string | undefined),
    dependants: (data.dependants as TaxProfile['dependants']) ?? [],
    assessmentComplete: (data.assessment_complete as boolean | null) ?? false,
    createdAt: (data.created_at as string | null) ?? '',
    updatedAt: (data.updated_at as string | null) ?? '',
  };
}

// ─── Slips ───────────────────────────────────────────────────────────────────

/**
 * Replaces all slips for this profile in Supabase.
 * Slip types not in the DB CHECK constraint are silently skipped —
 * they remain in localStorage as the primary store.
 */
export async function upsertSlips(
  userId: string,
  taxYear: number,
  slips: SavedSlip[],
): Promise<void> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, taxYear);
  if (!profileId) return;

  // Delete old rows then bulk-insert fresh
  await supabase.from('tax_slips').delete().eq('profile_id', profileId);

  const supported = slips.filter((s) => SUPPORTED_SLIP_TYPES.has(s.type));
  if (supported.length === 0) return;

  const rows = supported.map((s) => ({
    profile_id: profileId,
    slip_type: s.type,
    issuer_name: s.issuerName,
    boxes: s.data,
    source: 'manual',
    verified: true,
    created_at: s.enteredAt,
  }));

  const { error } = await supabase.from('tax_slips').insert(rows);
  if (error) console.error('[tax-data] upsertSlips error:', error.message);
}

export async function getSlips(
  userId: string,
  taxYear: number,
): Promise<SavedSlip[]> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, taxYear);
  if (!profileId) return [];

  const { data, error } = await supabase
    .from('tax_slips')
    .select('id, slip_type, issuer_name, boxes, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return (data as Array<{
    id: string;
    slip_type: string;
    issuer_name: string | null;
    boxes: Record<string, number | string>;
    created_at: string | null;
  }>).map((row) => ({
    id: row.id,
    type: row.slip_type,
    issuerName: row.issuer_name ?? '',
    data: row.boxes ?? {},
    enteredAt: row.created_at ?? new Date().toISOString(),
  }));
}

// ─── Deductions ──────────────────────────────────────────────────────────────

/**
 * Upserts deductions to Supabase. Only columns that exist in the DB are saved;
 * extended fields (hasSpouseOrCL, volunteerFirefighter, etc.) stay in localStorage.
 */
export async function upsertDeductions(
  userId: string,
  taxYear: number,
  deductions: UserDeductions,
): Promise<void> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, taxYear);
  if (!profileId) return;

  const medArr = deductions.medicalExpenses > 0
    ? [{ description: 'Medical expenses', amount: deductions.medicalExpenses, forWhom: 'self' }]
    : [];
  const donArr = deductions.charitableDonations > 0
    ? [{ recipientName: 'Charitable donations', amount: deductions.charitableDonations, type: 'cash', eligibleForProvincial: true }]
    : [];

  const { error } = await supabase
    .from('deductions_credits')
    .upsert(
      {
        profile_id: profileId,
        rrsp_contributions: deductions.rrspContributions,
        rrsp_room: deductions.rrspContributionRoom,
        union_dues: deductions.unionDues,
        childcare_expenses: deductions.childcareExpenses,
        moving_expenses: deductions.movingExpenses,
        support_payments: deductions.supportPaymentsMade,
        student_loan_interest: deductions.studentLoanInterest,
        medical_expenses: medArr,
        donations: donArr,
        tuition_carryforward: deductions.tuitionCarryforward,
        rent_paid: deductions.rentPaid,
        property_tax_paid: deductions.propertyTaxPaid,
        digital_news_subscription: deductions.digitalNewsSubscription,
        has_disability_credit: deductions.hasDisabilityCredit,
        home_buyers_eligible: deductions.homeBuyersEligible,
        home_accessibility_expenses: deductions.homeAccessibilityExpenses,
      },
      { onConflict: 'profile_id' },
    );

  if (error) console.error('[tax-data] upsertDeductions error:', error.message);
}

export async function getDeductions(
  userId: string,
  taxYear: number,
): Promise<UserDeductions | null> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, taxYear);
  if (!profileId) return null;

  const { data, error } = await supabase
    .from('deductions_credits')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error || !data) return null;

  const medArr = Array.isArray(data.medical_expenses)
    ? (data.medical_expenses as Array<{ amount: number }>)
    : [];
  const donArr = Array.isArray(data.donations)
    ? (data.donations as Array<{ amount: number }>)
    : [];

  const medTotal = medArr.reduce((s, e) => s + (e.amount ?? 0), 0);
  const donTotal = donArr.reduce((s, d) => s + (d.amount ?? 0), 0);

  return {
    rrspContributions: Number(data.rrsp_contributions ?? 0),
    rrspContributionRoom: Number(data.rrsp_room ?? 0),
    rentPaid: Number(data.rent_paid ?? 0),
    propertyTaxPaid: Number(data.property_tax_paid ?? 0),
    childcareExpenses: Number(data.childcare_expenses ?? 0),
    movingExpenses: Number(data.moving_expenses ?? 0),
    supportPaymentsMade: Number(data.support_payments ?? 0),
    instalmentsPaid: 0, // no DB column — stays in localStorage
    medicalExpenses: medTotal,
    charitableDonations: donTotal,
    studentLoanInterest: Number(data.student_loan_interest ?? 0),
    unionDues: Number(data.union_dues ?? 0),
    tuitionCarryforward: Number(data.tuition_carryforward ?? 0),
    digitalNewsSubscription: Number(data.digital_news_subscription ?? 0),
    homeAccessibilityExpenses: Number(data.home_accessibility_expenses ?? 0),
    // Fields without DB columns — return zero/false; caller merges with localStorage
    hasSpouseOrCL: false,
    spouseNetIncome: 0,
    hasEligibleDependant: false,
    eligibleDependantNetIncome: 0,
    caregiverForDependant18Plus: false,
    caregiverDependantNetIncome: 0,
    hasDisabilityCredit: Boolean(data.has_disability_credit),
    homeBuyersEligible: Boolean(data.home_buyers_eligible),
    volunteerFirefighter: false,
    searchAndRescue: false,
    canadaTrainingCreditRoom: 0,
    trainingFeesForCTC: 0,
  };
}

// ─── Calculation Results ──────────────────────────────────────────────────────

export async function saveCalculationResult(
  userId: string,
  taxYear: number,
  result: TaxCalculationResult,
): Promise<void> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, taxYear);
  if (!profileId) return;

  const { error } = await supabase.from('tax_calculations').insert({
    profile_id: profileId,
    total_income: result.totalIncome,
    net_income: result.netIncome,
    taxable_income: result.taxableIncome,
    federal_tax: result.netFederalTax,
    ontario_tax: result.ontarioTaxOnIncome,
    ontario_surtax: result.ontarioSurtax,
    ontario_health_premium: result.ontarioHealthPremium,
    total_credits: result.federalNonRefundableCredits + result.ontarioNonRefundableCredits,
    total_deductions: result.totalIncome - result.netIncome,
    tax_deducted: result.totalTaxDeducted,
    balance_owing: result.balanceOwing,
    otb_estimate: result.estimatedOTB,
    gst_credit_estimate: result.estimatedGSTCredit,
    detailed_breakdown: result, // full result stored as JSONB for retrieval
  });

  if (error) console.error('[tax-data] saveCalculationResult error:', error.message);
}

export async function getLatestCalculation(
  userId: string,
  taxYear: number,
): Promise<TaxCalculationResult | null> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, taxYear);
  if (!profileId) return null;

  const { data, error } = await supabase
    .from('tax_calculations')
    .select('detailed_breakdown')
    .eq('profile_id', profileId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.detailed_breakdown) return null;
  return data.detailed_breakdown as TaxCalculationResult;
}

export async function getCalculationHistory(
  userId: string,
  taxYear: number,
): Promise<Array<{ id: string; createdAt: string; result: TaxCalculationResult }>> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, taxYear);
  if (!profileId) return [];

  const { data, error } = await supabase
    .from('tax_calculations')
    .select('id, calculated_at, detailed_breakdown')
    .eq('profile_id', profileId)
    .order('calculated_at', { ascending: false });

  if (error || !data) return [];

  return (
    data as Array<{
      id: string;
      calculated_at: string | null;
      detailed_breakdown: unknown;
    }>
  )
    .filter((row) => row.detailed_breakdown != null)
    .map((row) => ({
      id: row.id,
      createdAt: row.calculated_at ?? new Date().toISOString(),
      result: row.detailed_breakdown as TaxCalculationResult,
    }));
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function saveMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, 2025);
  if (!profileId) return;

  const { error } = await supabase
    .from('chat_messages')
    .insert({ profile_id: profileId, role, content });

  if (error) console.error('[tax-data] saveMessage error:', error.message);
}

export async function getMessages(
  userId: string,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, 2025);
  if (!profileId) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return (data as Array<{ role: 'user' | 'assistant'; content: string }>);
}

export async function clearMessages(userId: string): Promise<void> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, 2025);
  if (!profileId) return;

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('profile_id', profileId);

  if (error) console.error('[tax-data] clearMessages error:', error.message);
}

// ─── Filing Guide ─────────────────────────────────────────────────────────────
// No dedicated filing_guides table — stored in tax_calculations.filing_steps
// on the most recent calculation for this user+year.

export async function saveFilingGuide(
  userId: string,
  taxYear: number,
  guide: FilingGuide,
): Promise<void> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, taxYear);
  if (!profileId) return;

  const { data: calc } = await supabase
    .from('tax_calculations')
    .select('id')
    .eq('profile_id', profileId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!calc) return;

  const { error } = await supabase
    .from('tax_calculations')
    .update({ filing_steps: guide })
    .eq('id', calc.id as string);

  if (error) console.error('[tax-data] saveFilingGuide error:', error.message);
}

export async function getFilingGuide(
  userId: string,
  taxYear: number,
): Promise<FilingGuide | null> {
  const supabase = createClient();
  const profileId = await getOrCreateProfileId(userId, taxYear);
  if (!profileId) return null;

  const { data, error } = await supabase
    .from('tax_calculations')
    .select('filing_steps')
    .eq('profile_id', profileId)
    .not('filing_steps', 'is', null)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.filing_steps) return null;
  return data.filing_steps as FilingGuide;
}
