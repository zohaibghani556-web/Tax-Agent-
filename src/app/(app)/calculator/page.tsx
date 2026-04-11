'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, Download, RefreshCw,
  XCircle, AlertTriangle, FileText, Settings2, CheckCircle2,
} from 'lucide-react';
import { WhatIfEngine } from '@/components/calculator/WhatIfEngine';
import { CreditFinder } from '@/components/calculator/CreditFinder';
import { TaxOptimizer } from '@/components/calculator/TaxOptimizer';
import { createClient } from '@/lib/supabase/client';
import { validateTaxReturn } from '@/lib/tax-engine/validator';
import { calculateInstalments } from '@/lib/tax-engine/federal/instalments';
import { optimizePensionSplit } from '@/lib/tax-engine/federal/pension-split-optimizer';
import type { TaxProfile, TaxSlip, DeductionsCreditsInput, TaxCalculationResult } from '@/lib/tax-engine/types';
import type { ValidationResult } from '@/lib/tax-engine/validator';
import { addCsrfHeader } from '@/lib/csrf-client';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCad(n: number, d = 2): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    maximumFractionDigits: d, minimumFractionDigits: d,
  }).format(n);
}

function pct(n: number) { return `${(n * 100).toFixed(2)}%`; }

function makeDeductions(overrides: Partial<DeductionsCreditsInput> = {}): DeductionsCreditsInput {
  return {
    rrspContributions: 0,
    rrspContributionRoom: 0,
    fhsaContributions: 0,
    unionDues: 0,
    childcareExpenses: 0,
    movingExpenses: 0,
    supportPaymentsMade: 0,
    carryingCharges: 0,
    studentLoanInterest: 0,
    medicalExpenses: [],
    donations: [],
    rentPaid: 0,
    propertyTaxPaid: 0,
    studentResidence: false,
    tuitionCarryforward: 0,
    capitalLossCarryforward: 0,
    nonCapitalLossCarryforward: 0,
    donationCarryforward: 0,
    politicalContributions: 0,
    digitalNewsSubscription: 0,
    hasDisabilityCredit: false,
    homeBuyersEligible: false,
    homeAccessibilityExpenses: 0,
    ...overrides,
  };
}

interface SavedSlip {
  id: string;
  type: string;
  issuerName: string;
  data: Record<string, number | string>;
  enteredAt: string;
}

function savedToTaxSlip(s: SavedSlip): TaxSlip {
  return { type: s.type, data: { issuerName: s.issuerName, ...s.data } } as TaxSlip;
}

interface UserDeductions {
  // Deductions (reduce taxable income)
  rrspContributions: number;
  rrspContributionRoom: number;
  rentPaid: number;
  propertyTaxPaid: number;
  childcareExpenses: number;
  movingExpenses: number;
  supportPaymentsMade: number;
  instalmentsPaid: number;
  // Credits (reduce tax payable)
  medicalExpenses: number;
  charitableDonations: number;
  studentLoanInterest: number;
  unionDues: number;
  tuitionCarryforward: number;
  digitalNewsSubscription: number;
  homeAccessibilityExpenses: number;
  // Personal situation
  hasSpouseOrCL: boolean;
  spouseNetIncome: number;
  hasEligibleDependant: boolean;
  eligibleDependantNetIncome: number;
  caregiverForDependant18Plus: boolean;
  caregiverDependantNetIncome: number;
  // One-tap toggles
  hasDisabilityCredit: boolean;
  homeBuyersEligible: boolean;
  volunteerFirefighter: boolean;
  searchAndRescue: boolean;
  // Canada Training Credit
  canadaTrainingCreditRoom: number;
  trainingFeesForCTC: number;
}

const DEFAULT_USER_DEDUCTIONS: UserDeductions = {
  rrspContributions: 0,
  rrspContributionRoom: 0,
  rentPaid: 0,
  propertyTaxPaid: 0,
  childcareExpenses: 0,
  movingExpenses: 0,
  supportPaymentsMade: 0,
  instalmentsPaid: 0,
  medicalExpenses: 0,
  charitableDonations: 0,
  studentLoanInterest: 0,
  unionDues: 0,
  tuitionCarryforward: 0,
  digitalNewsSubscription: 0,
  homeAccessibilityExpenses: 0,
  hasSpouseOrCL: false,
  spouseNetIncome: 0,
  hasEligibleDependant: false,
  eligibleDependantNetIncome: 0,
  caregiverForDependant18Plus: false,
  caregiverDependantNetIncome: 0,
  hasDisabilityCredit: false,
  homeBuyersEligible: false,
  volunteerFirefighter: false,
  searchAndRescue: false,
  canadaTrainingCreditRoom: 0,
  trainingFeesForCTC: 0,
};

// ── Components ────────────────────────────────────────────────────────────────

interface LineItem {
  label: string;
  line?: number;
  amount: number;
  indent?: boolean;
  faint?: boolean;
}

function Section({
  title, total, totalLabel, totalLine, lines, defaultOpen = false,
}: {
  title: string; total: number; totalLabel: string;
  totalLine?: number; lines: LineItem[]; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${title} — ${open ? 'collapse' : 'expand'}`}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-semibold text-sm text-white/80">{title}</span>
          {!open && <span className="text-sm tabular-nums text-white/50">{formatCad(total)}</span>}
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-white/30" />
          : <ChevronDown className="h-4 w-4 text-white/30" />}
      </button>
      {open && (
        <>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {lines.map((item, i) => (
              <div
                key={i}
                className={`flex items-baseline justify-between px-5 py-2.5 ${item.indent ? 'pl-8' : ''}`}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-baseline gap-2">
                  {item.line && <span className="text-xs text-white/25 tabular-nums w-12">L{item.line}</span>}
                  <span className={`text-sm ${item.faint ? 'text-white/25' : 'text-white/55'}`}>{item.label}</span>
                </div>
                <span className={`text-sm tabular-nums shrink-0 ml-4 ${item.faint ? 'text-white/25' : 'text-white/55'}`}>
                  {formatCad(item.amount)}
                </span>
              </div>
            ))}
          </div>
          <div
            className="flex items-baseline justify-between px-5 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-baseline gap-2">
              {totalLine && <span className="text-xs text-white/30 w-12">L{totalLine}</span>}
              <span className="text-sm font-semibold text-white/80">{totalLabel}</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-white">{formatCad(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-14 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />;
}

// ── ValidatorPanel ────────────────────────────────────────────────────────────

function ValidatorPanel({ validation }: { validation: ValidationResult }) {
  const [open, setOpen] = useState(false);
  const { completionPct, errors, warnings, isFileable } = validation;
  const issueCount = errors.length + warnings.length;

  const barColour =
    completionPct >= 80 ? '#10B981'
    : completionPct >= 50 ? '#F59E0B'
    : '#EF4444';

  return (
    <div className="mb-4 rounded-xl overflow-hidden print:hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Status bar row */}
      <div className="px-5 py-3 flex items-center gap-4">
        {/* Completion label + % */}
        <div className="flex items-center gap-2 shrink-0">
          {isFileable
            ? <CheckCircle2 className="h-4 w-4" style={{ color: barColour }} />
            : <XCircle className="h-4 w-4 text-red-400" />}
          <span className="text-xs font-semibold" style={{ color: barColour }}>
            {completionPct}% complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%`, background: barColour }}
            role="progressbar"
            aria-valuenow={completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Return completion percentage"
          />
        </div>

        {/* Issue toggle */}
        {issueCount > 0 && (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 text-xs shrink-0 transition-colors hover:opacity-80"
            style={{ color: errors.length > 0 ? '#FCA5A5' : '#FCD34D' }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {issueCount} issue{issueCount !== 1 ? 's' : ''}
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {issueCount === 0 && (
          <span className="text-xs text-white/25 shrink-0">No issues</span>
        )}
      </div>

      {/* Collapsible issues panel */}
      {open && issueCount > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="divide-y divide-white/5">
          {[...errors, ...warnings].map((issue, i) => (
            <div key={i} className={`px-5 py-3 flex gap-3 ${issue.severity === 'error' ? 'bg-red-500/5' : 'bg-amber-500/5'}`}>
              <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
              <div className="min-w-0">
                <p className={`text-xs font-medium ${issue.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`}>
                  {issue.message}
                </p>
                {issue.suggestion && (
                  <p className="text-[10px] text-white/35 mt-0.5 leading-snug">{issue.suggestion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ text }: { text: string }) {
  return (
    <div className="flex gap-2 pt-2">
      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
      <p className="text-xs text-white/50 leading-snug">{text}</p>
    </div>
  );
}

/** Simple number input styled for the dark theme */
function DeductionField({
  label, hint, value, onChange, prefix = '$',
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-white/60">{label}</label>
      <p className="text-[10px] text-white/30 leading-snug">{hint}</p>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <span className="text-xs text-white/40">{prefix}</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value || ''}
          placeholder="0"
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent text-sm text-white tabular-nums focus:outline-none placeholder-white/20"
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<Date | null>(null);
  const [savedSlips, setSavedSlips] = useState<SavedSlip[]>([]);
  const [profileName, setProfileName] = useState('');
  const [userId, setUserId] = useState('');
  const [userDeductions, setUserDeductions] = useState<UserDeductions>(DEFAULT_USER_DEDUCTIONS);
  const [deductionsOpen, setDeductionsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const initialLoad = useRef(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = (data.user.user_metadata?.full_name as string | undefined)
          ?? data.user.email?.split('@')[0]
          ?? 'Taxpayer';
        setProfileName(name);
        setUserId(data.user.id);
      }
    });

    const rawSlips = localStorage.getItem('taxagent_slips');
    if (rawSlips) {
      try { setSavedSlips(JSON.parse(rawSlips) as SavedSlip[]); } catch { /* ignore */ }
    }

    const rawDeductions = localStorage.getItem('taxagent_deductions');
    if (rawDeductions) {
      try { setUserDeductions(JSON.parse(rawDeductions) as UserDeductions); } catch { /* ignore */ }
    }

    const prevResult = localStorage.getItem('taxagent_calc_result');
    if (prevResult) {
      try {
        setResult(JSON.parse(prevResult) as TaxCalculationResult);
        setCalculatedAt(new Date());
      } catch { /* ignore */ }
    }
  }, []);

  // Persist deductions whenever they change
  useEffect(() => {
    if (initialLoad.current) { initialLoad.current = false; return; }
    localStorage.setItem('taxagent_deductions', JSON.stringify(userDeductions));
  }, [userDeductions]);

  function updateDeduction<K extends keyof UserDeductions>(key: K, value: UserDeductions[K]) {
    setUserDeductions((prev) => ({ ...prev, [key]: value }));
  }

  function buildDeductions(): DeductionsCreditsInput {
    return makeDeductions({
      rrspContributions: userDeductions.rrspContributions,
      rentPaid: userDeductions.rentPaid,
      propertyTaxPaid: userDeductions.propertyTaxPaid,
      childcareExpenses: userDeductions.childcareExpenses,
      movingExpenses: userDeductions.movingExpenses,
      supportPaymentsMade: userDeductions.supportPaymentsMade,
      instalmentsPaid: userDeductions.instalmentsPaid,
      medicalExpenses: userDeductions.medicalExpenses > 0
        ? [{ description: 'Medical expenses', amount: userDeductions.medicalExpenses, forWhom: 'self' as const }]
        : [],
      donations: userDeductions.charitableDonations > 0
        ? [{ recipientName: 'Charitable donations', amount: userDeductions.charitableDonations, type: 'cash' as const, eligibleForProvincial: true }]
        : [],
      studentLoanInterest: userDeductions.studentLoanInterest,
      unionDues: userDeductions.unionDues,
      tuitionCarryforward: userDeductions.tuitionCarryforward,
      digitalNewsSubscription: userDeductions.digitalNewsSubscription,
      homeAccessibilityExpenses: userDeductions.homeAccessibilityExpenses,
      hasSpouseOrCL: userDeductions.hasSpouseOrCL,
      spouseNetIncome: userDeductions.spouseNetIncome,
      hasEligibleDependant: userDeductions.hasEligibleDependant,
      eligibleDependantNetIncome: userDeductions.eligibleDependantNetIncome,
      caregiverForDependant18Plus: userDeductions.caregiverForDependant18Plus,
      caregiverDependantNetIncome: userDeductions.caregiverDependantNetIncome,
      hasDisabilityCredit: userDeductions.hasDisabilityCredit,
      homeBuyersEligible: userDeductions.homeBuyersEligible,
      volunteerFirefighter: userDeductions.volunteerFirefighter,
      searchAndRescue: userDeductions.searchAndRescue,
      canadaTrainingCreditRoom: userDeductions.canadaTrainingCreditRoom,
      trainingFeesForCTC: userDeductions.trainingFeesForCTC,
    });
  }

  async function runCalc() {
    setLoading(true);
    setError(null);

    const profile: TaxProfile = {
      id: userId || 'local-user',
      userId: userId || 'local-user',
      taxYear: 2025,
      legalName: profileName || 'Taxpayer',
      dateOfBirth: '1990-01-01',
      maritalStatus: 'single',
      province: 'ON',
      residencyStatus: 'citizen',
      dependants: [],
      assessmentComplete: !!localStorage.getItem('taxagent_assessment_done'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const slips: TaxSlip[] = savedSlips.map(savedToTaxSlip);

    try {
      const res = await fetch('/api/calculate', addCsrfHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          slips,
          business: [],
          rental: [],
          deductions: buildDeductions(),
        }),
      }));
      if (!res.ok) throw new Error();
      const data = await res.json() as TaxCalculationResult;
      setResult(data);
      setCalculatedAt(new Date());
      localStorage.setItem('taxagent_calc_result', JSON.stringify(data));
    } catch {
      setError('Calculation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-calculate when slips + userId are ready
  useEffect(() => {
    if (savedSlips.length > 0 && userId) runCalc();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSlips, userId]);

  const isRefund = result && result.balanceOwing < 0;
  const hasSlips = savedSlips.length > 0;

  // Compute validation result reactively whenever slips or deductions change
  const validation = useMemo(
    () => validateTaxReturn(currentProfile, savedSlips.map(savedToTaxSlip), buildDeductions()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedSlips, userDeductions, profileName]
  );

  const currentProfile: TaxProfile = {
    id: userId || 'local',
    userId: userId || 'local',
    taxYear: 2025,
    legalName: profileName,
    dateOfBirth: '1990-01-01',
    maritalStatus: 'single',
    province: 'ON',
    residencyStatus: 'citizen',
    dependants: [],
    assessmentComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Calculator</h1>
          <p className="text-sm text-white/40 mt-1">
            2025 Ontario T1 Summary · {profileName || 'Your Name'}
            {calculatedAt && (
              <span className="ml-2 text-white/25">
                · Updated {calculatedAt.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={runCalc}
            disabled={loading || !hasSlips}
            aria-label="Recalculate tax return"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 min-h-[44px]"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Calculating…' : 'Recalculate'}
          </button>
          <button
            onClick={() => window.print()}
            aria-label="Save as PDF"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px]"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* ── Return Completeness Validator ────────────────────────────────────── */}
      <ValidatorPanel validation={validation} />

      {/* ── Deductions & Credits panel ────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => setDeductionsOpen(!deductionsOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[#10B981]" />
            <span className="text-sm font-semibold text-white/80">Deductions & Credits</span>
            <span className="text-xs text-white/40">— enter these to maximize your refund</span>
          </div>
          {deductionsOpen
            ? <ChevronUp className="h-4 w-4 text-white/30" />
            : <ChevronDown className="h-4 w-4 text-white/30" />}
        </button>
        {deductionsOpen && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="p-5 space-y-6">
            <p className="text-xs text-white/40">
              Enter everything that applies to you. Even small amounts add up — these are things your slips don&apos;t automatically report.
            </p>

            {/* Section: Deductions */}
            <div>
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Deductions — reduce your taxable income</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <DeductionField label="RRSP Contributions" hint="Contributions made Jan 1, 2025 – Mar 3, 2026. Dollar-for-dollar income reduction." value={userDeductions.rrspContributions} onChange={(v) => updateDeduction('rrspContributions', v)} />
                  {userDeductions.rrspContributions > 32490 && (
                    <p className="text-xs text-amber-400">⚠ Exceeds 2025 dollar limit ($32,490). Verify your NOA.</p>
                  )}
                  {userDeductions.rrspContributionRoom > 0 && userDeductions.rrspContributions > userDeductions.rrspContributionRoom + 2000 && (
                    <p className="text-xs text-red-400">⚠ Over-contribution detected. CRA charges 1%/month on the excess.</p>
                  )}
                </div>
                <DeductionField label="Childcare Expenses" hint="Daycare, babysitter, day camp for children under 16. Max $8,000/child under 7, $5,000 for older." value={userDeductions.childcareExpenses} onChange={(v) => updateDeduction('childcareExpenses', v)} />
                <DeductionField label="Moving Expenses" hint="If you moved 40+ km closer to a new job or school. Gas, movers, temporary housing all count." value={userDeductions.movingExpenses} onChange={(v) => updateDeduction('movingExpenses', v)} />
                <DeductionField label="Support Payments Made" hint="Spousal or child support paid under a court order or written agreement (must be periodic, not lump-sum)." value={userDeductions.supportPaymentsMade} onChange={(v) => updateDeduction('supportPaymentsMade', v)} />
                <DeductionField label="Tax Instalments Paid" hint="Quarterly instalment payments you sent CRA during 2025 (from your instalment remittance slips)." value={userDeductions.instalmentsPaid} onChange={(v) => updateDeduction('instalmentsPaid', v)} />
              </div>
            </div>

            {/* Section: Ontario Trillium / Housing */}
            <div>
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Housing — Ontario Trillium Benefit</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <DeductionField label="Annual Rent Paid" hint="Total rent paid in 2025. 20% is treated as property tax — worth up to $1,248/yr in OTB for renters." value={userDeductions.rentPaid} onChange={(v) => updateDeduction('rentPaid', v)} />
                  {userDeductions.rentPaid > 36000 && (
                    <p className="text-xs text-amber-400">⚠ Seems high — confirm this is annual rent, not monthly.</p>
                  )}
                </div>
                <DeductionField label="Property Tax Paid" hint="Municipal property tax paid in 2025 if you own your home. Drives the Ontario Energy & Property Tax Credit." value={userDeductions.propertyTaxPaid} onChange={(v) => updateDeduction('propertyTaxPaid', v)} />
                <DeductionField label="Home Accessibility Expenses" hint="Renovations for a senior 65+ or DTC holder to improve mobility/safety. Max $20,000 (15% credit = up to $3,000)." value={userDeductions.homeAccessibilityExpenses} onChange={(v) => updateDeduction('homeAccessibilityExpenses', v)} />
              </div>
            </div>

            {/* Section: Credits */}
            <div>
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Credits — reduce your tax payable</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <DeductionField label="Medical Expenses" hint="Prescriptions, dental, glasses, physio, hearing aids, medical devices. Only the amount above $2,759 or 3% of income generates a credit." value={userDeductions.medicalExpenses} onChange={(v) => updateDeduction('medicalExpenses', v)} />
                <DeductionField label="Charitable Donations" hint="Donations to registered Canadian charities. First $200 → 15% credit. Above $200 → 29–33% credit. Worth combining with spouse." value={userDeductions.charitableDonations} onChange={(v) => updateDeduction('charitableDonations', v)} />
                <DeductionField label="Student Loan Interest" hint="Interest paid on Government of Canada or provincial student loans only (not bank loans or lines of credit)." value={userDeductions.studentLoanInterest} onChange={(v) => updateDeduction('studentLoanInterest', v)} />
                <DeductionField label="Union / Professional Dues" hint="If not already on your T4 box 44 — annual membership fees to professional organizations or trade unions." value={userDeductions.unionDues} onChange={(v) => updateDeduction('unionDues', v)} />
                <DeductionField label="Unused Tuition (Prior Years)" hint="Tuition credits you couldn't use in prior years — from your 2024 Notice of Assessment line 32000." value={userDeductions.tuitionCarryforward} onChange={(v) => updateDeduction('tuitionCarryforward', v)} />
                <DeductionField label="Digital News Subscriptions" hint="Qualifying Canadian digital news outlet subscriptions (e.g. Globe, Star, Postmedia). Max $500 claim, generates 15% credit." value={userDeductions.digitalNewsSubscription} onChange={(v) => updateDeduction('digitalNewsSubscription', v)} />
              </div>
            </div>

            {/* Section: Canada Training Credit */}
            <div>
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Canada Training Credit — refundable, 50% of training fees</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DeductionField label="CTC Room (from 2024 NOA)" hint="Your Canada Training Credit room carried forward — found on line 45375 of your 2024 Notice of Assessment. Builds at $250/year." value={userDeductions.canadaTrainingCreditRoom} onChange={(v) => updateDeduction('canadaTrainingCreditRoom', v)} />
                <DeductionField label="Eligible Training Fees Paid in 2025" hint="Tuition or professional training fees paid to an eligible institution in 2025 (from T2202 or receipt). Credit = 50% of fees, capped at your room." value={userDeductions.trainingFeesForCTC} onChange={(v) => updateDeduction('trainingFeesForCTC', v)} />
              </div>
            </div>

            {/* Section: Personal Situation */}
            <div>
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Personal Situation — spouse, dependants, caregiving</p>
              <div className="space-y-4">
                {/* Spouse / CL toggle */}
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="hasSpouseOrCL" checked={userDeductions.hasSpouseOrCL} onChange={(e) => updateDeduction('hasSpouseOrCL', e.target.checked)} className="mt-1 h-4 w-4 accent-[#10B981]" />
                  <div className="flex-1">
                    <label htmlFor="hasSpouseOrCL" className="text-xs font-semibold text-white/60 cursor-pointer">I have a spouse or common-law partner</label>
                    <p className="text-[10px] text-white/30 mt-0.5">You may be able to claim a spouse amount credit if their net income is less than $16,129.</p>
                    {userDeductions.hasSpouseOrCL && (
                      <div className="mt-2 max-w-xs">
                        <DeductionField label="Spouse/Partner Net Income (line 23600)" hint="Their 2025 net income from their return. If zero (not working), enter 0." value={userDeductions.spouseNetIncome} onChange={(v) => updateDeduction('spouseNetIncome', v)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Eligible dependant toggle */}
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="hasEligibleDependant" checked={userDeductions.hasEligibleDependant} onChange={(e) => updateDeduction('hasEligibleDependant', e.target.checked)} className="mt-1 h-4 w-4 accent-[#10B981]" />
                  <div className="flex-1">
                    <label htmlFor="hasEligibleDependant" className="text-xs font-semibold text-white/60 cursor-pointer">I support an eligible dependant (single parent)</label>
                    <p className="text-[10px] text-white/30 mt-0.5">Single parents can claim one child or other dependant — worth up to $16,129 × 15% = $2,419 in federal credit.</p>
                    {userDeductions.hasEligibleDependant && !userDeductions.hasSpouseOrCL && (
                      <div className="mt-2 max-w-xs">
                        <DeductionField label="Dependant Net Income" hint="Their 2025 net income. Usually $0 for young children." value={userDeductions.eligibleDependantNetIncome} onChange={(v) => updateDeduction('eligibleDependantNetIncome', v)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Caregiver toggle */}
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="caregiverForDependant18Plus" checked={userDeductions.caregiverForDependant18Plus} onChange={(e) => updateDeduction('caregiverForDependant18Plus', e.target.checked)} className="mt-1 h-4 w-4 accent-[#10B981]" />
                  <div className="flex-1">
                    <label htmlFor="caregiverForDependant18Plus" className="text-xs font-semibold text-white/60 cursor-pointer">I am the caregiver for an infirm adult (18+) — parent, sibling, adult child</label>
                    <p className="text-[10px] text-white/30 mt-0.5">Canada Caregiver Amount: up to $7,999 (reduced by their net income above $18,783). Requires a physical or mental infirmity.</p>
                    {userDeductions.caregiverForDependant18Plus && (
                      <div className="mt-2 max-w-xs">
                        <DeductionField label="Dependant Net Income" hint="Their 2025 net income. The $7,999 credit reduces dollar-for-dollar above $18,783." value={userDeductions.caregiverDependantNetIncome} onChange={(v) => updateDeduction('caregiverDependantNetIncome', v)} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Toggles */}
            <div>
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Other Credits</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'hasDisabilityCredit' as const, label: 'I have an approved Disability Tax Credit (T2201 on file with CRA)', hint: '$9,872 amount × 15% = $1,481 federal credit.' },
                  { key: 'homeBuyersEligible' as const, label: 'I purchased my first home in 2025', hint: '$10,000 Home Buyers\' Amount → $1,500 non-refundable credit (line 31270).' },
                  { key: 'volunteerFirefighter' as const, label: 'I performed 200+ hours of volunteer firefighting in 2025', hint: '$3,000 amount × 15% = $450 credit (line 31240). Cannot overlap with search & rescue hours.' },
                  { key: 'searchAndRescue' as const, label: 'I performed 200+ hours of search and rescue volunteering in 2025', hint: '$3,000 amount × 15% = $450 credit (line 31255).' },
                ].map(({ key, label, hint }) => (
                  <div key={key} className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input type="checkbox" id={key} checked={userDeductions[key] as boolean} onChange={(e) => updateDeduction(key, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#10B981]" />
                    <div>
                      <label htmlFor={key} className="text-xs font-semibold text-white/60 cursor-pointer leading-snug">{label}</label>
                      <p className="text-[10px] text-white/30 mt-0.5">{hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={runCalc}
              disabled={loading || !hasSlips}
              className="flex items-center gap-2 rounded-full bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Calculating…' : 'Recalculate with these deductions'}
            </button>
          </div>
        )}
      </div>

      {/* No slips state */}
      {!hasSlips && !loading && (
        <div
          className="rounded-2xl p-10 text-center mb-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <FileText className="mx-auto h-10 w-10 mb-3 text-white/20" />
          <p className="font-semibold text-white/70">No slips added yet</p>
          <p className="text-sm text-white/40 mt-1 max-w-xs mx-auto">
            Upload your T4 and other CRA slips to calculate your 2025 taxes.
          </p>
          <a
            href="/slips"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors"
          >
            <FileText className="h-4 w-4" />
            Add your slips
          </a>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 print:hidden">
          <XCircle className="h-4 w-4 text-red-400 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Warnings */}
      {result?.warnings?.length ? (
        <div className="space-y-2 mb-6">
          {result.warnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              w.severity === 'error'
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-amber-500/30 bg-amber-500/10'
            }`}>
              <AlertTriangle className={`h-4 w-4 mt-0.5 ${w.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
              <p className={`text-sm ${w.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`}>{w.message}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Two-column layout */}
      {(result || (loading && hasSlips)) && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT — T1 summary (65%) */}
          <div className="flex-[65] min-w-0 space-y-3">
            {loading && !result && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {result && (
              <>
                <Section
                  title="Income" total={result.totalIncome}
                  totalLabel="Total Income" totalLine={15000} defaultOpen
                  lines={[
                    { label: 'Employment income', line: 10100, amount: result.lineByLine[10100] ?? 0 },
                    { label: 'EI benefits received', line: 11900, amount: result.lineByLine[11900] ?? 0 },
                    { label: 'Interest and investment income', line: 12100, amount: result.lineByLine[12100] ?? 0 },
                    { label: 'Taxable eligible dividends', line: 12000, amount: result.lineByLine[12000] ?? 0 },
                    { label: 'Other taxable dividends', line: 12010, amount: result.lineByLine[12010] ?? 0 },
                    { label: 'Pension / other income', line: 11500, amount: result.lineByLine[11500] ?? 0 },
                  ].filter((l) => l.amount !== 0)}
                />

                <Section
                  title="Deductions" total={result.totalIncome - result.netIncome}
                  totalLabel="Total Deductions"
                  lines={[
                    { label: 'RRSP/PRPP deduction', line: 20800, amount: result.lineByLine[20800] ?? userDeductions.rrspContributions },
                    { label: 'Union, professional dues', amount: userDeductions.unionDues },
                  ].filter((l) => l.amount > 0)}
                />

                {/* Net Income */}
                <div
                  className="flex items-baseline justify-between rounded-xl px-5 py-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-white/30">L23600</span>
                    <span className="font-semibold text-sm text-white/80">Net Income</span>
                  </div>
                  <span className="font-bold tabular-nums text-white">{formatCad(result.netIncome)}</span>
                </div>

                {/* Taxable Income */}
                <div
                  className="flex items-baseline justify-between rounded-xl px-5 py-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-white/30">L26000</span>
                    <span className="font-semibold text-sm text-white/80">Taxable Income</span>
                  </div>
                  <span className="font-bold tabular-nums text-white">{formatCad(result.taxableIncome)}</span>
                </div>

                <Section
                  title="Federal Tax (Schedule 1)" total={result.netFederalTax}
                  totalLabel="Net Federal Tax"
                  lines={[
                    { label: 'Federal tax on income', amount: result.federalTaxOnIncome },
                    { label: 'Less: non-refundable credits', amount: -result.federalNonRefundableCredits, indent: true },
                    { label: 'Less: dividend tax credit', amount: -result.federalDividendTaxCredit, indent: true, faint: result.federalDividendTaxCredit === 0 },
                    { label: 'Less: top-up credit (2025)', amount: -result.topUpTaxCredit, indent: true, faint: result.topUpTaxCredit === 0 },
                  ].filter((l) => !l.faint || l.amount !== 0)}
                />

                <Section
                  title="Ontario Tax (ON428 + ON-BEN)" total={result.netOntarioTax}
                  totalLabel="Net Ontario Tax"
                  lines={[
                    { label: 'Ontario tax on income', amount: result.ontarioTaxOnIncome },
                    { label: 'Less: non-refundable credits', amount: -result.ontarioNonRefundableCredits, indent: true },
                    { label: 'Less: dividend tax credit', amount: -result.ontarioDividendTaxCredit, indent: true, faint: result.ontarioDividendTaxCredit === 0 },
                    { label: 'Less: low-income reduction', amount: -result.ontarioLowIncomeReduction, indent: true, faint: result.ontarioLowIncomeReduction === 0 },
                    { label: 'Ontario surtax', amount: result.ontarioSurtax, faint: result.ontarioSurtax === 0 },
                    { label: 'Ontario Health Premium', amount: result.ontarioHealthPremium },
                  ].filter((l) => !l.faint || l.amount !== 0)}
                />

                {/* OTB */}
                {result.estimatedOTB > 0 && (
                  <div
                    className="flex items-start justify-between rounded-xl px-5 py-4"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#10B981]">Ontario Trillium Benefit (ON-BEN)</p>
                      <p className="text-xs text-[#10B981]/60 mt-0.5">Estimated annual benefit from renting — paid monthly starting July 2026</p>
                    </div>
                    <span className="font-bold tabular-nums text-[#10B981] text-sm shrink-0 ml-4">{formatCad(result.estimatedOTB)} / yr</span>
                  </div>
                )}

                {/* Result card */}
                <div className={`rounded-2xl p-6 ${isRefund ? 'bg-[#10B981]' : 'bg-red-500'}`}>
                  <p className="text-sm font-semibold text-white/80 mb-1">{isRefund ? 'Your estimated refund' : 'Amount owing'}</p>
                  <p className="text-4xl sm:text-5xl font-black tabular-nums text-white mb-2">
                    {formatCad(Math.abs(result.balanceOwing))}
                  </p>
                  <p className="text-sm text-white/70 mb-4">Based on your uploaded slips and entered deductions</p>
                  <div className="flex items-center justify-between text-sm text-white/80 border-t border-white/20 pt-4">
                    <span>Total tax payable: {formatCad(result.totalTaxPayable)}</span>
                    <span>Tax deducted: {formatCad(result.totalTaxDeducted)}</span>
                  </div>
                </div>

                {/* Rate cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Marginal Rate', value: pct(result.combinedMarginalRate), sub: 'Combined fed + ON' },
                    { label: 'Average Rate', value: pct(result.averageTaxRate), sub: 'Of taxable income' },
                    { label: 'Federal Bracket', value: pct(result.marginalFederalRate), sub: '2025 blended' },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="rounded-xl p-4 text-center"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <p className="text-xs text-white/40 mb-1">{r.label}</p>
                      <p className="text-xl font-bold text-white tabular-nums">{r.value}</p>
                      <p className="text-xs text-white/30 mt-0.5">{r.sub}</p>
                    </div>
                  ))}
                </div>

                {/* 5B — Instalment Warning Card */}
                {result.balanceOwing > 0 && (() => {
                  const inst = calculateInstalments({
                    currentYearBalanceOwing: result.balanceOwing,
                    priorYearBalanceOwing: 0,
                    twoYearsAgoBalanceOwing: 0,
                  });
                  if (result.balanceOwing > 3000) {
                    return (
                      <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-amber-300">2026 Instalment Reminder</p>
                            <p className="text-xs text-amber-300/70 mt-1 leading-snug">
                              Your balance owing is {formatCad(result.balanceOwing)}. If your 2024 balance was also over $3,000, CRA will require quarterly instalments of approximately{' '}
                              <span className="font-semibold text-amber-300">{formatCad(inst.priorYearMethodQuarterly)}</span> each, due March 15, June 15, September 15, and December 15, 2026.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 5C — Pension Split Opportunity */}
                {(result.lineByLine[11500] ?? 0) > 0 && userDeductions.hasSpouseOrCL && (() => {
                  const splitResult = optimizePensionSplit({
                    transferorTaxableIncome: result.taxableIncome,
                    recipientTaxableIncome: userDeductions.spouseNetIncome ?? 0,
                    eligiblePensionIncome: result.lineByLine[11500] ?? 0,
                  });
                  if (splitResult.taxSaving > 50) {
                    return (
                      <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <p className="text-xs font-semibold text-emerald-300 mb-1">Pension Split Opportunity</p>
                        <p className="text-xs text-emerald-300/70 leading-snug">
                          Splitting {formatCad(splitResult.optimalSplitAmount)} of your pension income with your spouse could save your household{' '}
                          <span className="font-semibold text-emerald-300">{formatCad(splitResult.taxSaving)}</span> in combined taxes.
                          Optimal split: {splitResult.optimalSplitPct}% ({formatCad(splitResult.optimalSplitAmount)}).
                          File Form T1032 with both returns.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 5D — Year-Round Tax Planning */}
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <button
                    onClick={() => setPlanOpen(!planOpen)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                    aria-expanded={planOpen}
                  >
                    <span className="text-xs font-semibold text-white/70">2026 Tax Planning — Act on these now</span>
                    {planOpen ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
                  </button>
                  {planOpen && (
                    <div className="px-5 pb-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <PlanCard text="RRSP deadline is March 3, 2026. Contributing to your 2025 RRSP room before then reduces your 2025 taxable income." />
                      {result.balanceOwing > 0 && (
                        <PlanCard text={`Avoid interest: your balance of ${formatCad(result.balanceOwing)} is due April 30, 2026. CRA charges compound daily interest after that date at the prescribed rate + 2%.`} />
                      )}
                      {result.marginalFederalRate >= 0.26 && (
                        <PlanCard text={`You're in the ${pct(result.combinedMarginalRate)} combined bracket. Consider maximizing TFSA contributions ($7,000 for 2025) for tax-free growth — gains never affect your marginal rate.`} />
                      )}
                      {result.canadaWorkersCredit > 0 && (
                        <PlanCard text={`You received the Canada Workers Benefit (${formatCad(result.canadaWorkersCredit)}). Ensure you file on time — advances are paid quarterly but the final calculation is on your return.`} />
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT — tools (35%) */}
          <div className="flex-[35] min-w-0 space-y-4 print:hidden">
            {result && (
              <>
                <WhatIfEngine result={result} deductions={buildDeductions()} />
                <CreditFinder result={result} deductions={buildDeductions()} profile={currentProfile} />
                <TaxOptimizer
                  result={result}
                  currentRrspContributions={userDeductions.rrspContributions}
                  currentRrspRoom={userDeductions.rrspContributionRoom || 0}
                  fhsaRoom={8000}
                  netIncome={result.netIncome}
                />
              </>
            )}
            {loading && !result && (
              <div className="space-y-4">
                <div className="h-48 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-64 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            )}
          </div>
        </div>
      )}

      <p className="hidden print:block text-xs text-slate-400 text-center pt-4 mt-6">
        TaxAgent.ai · 2025 Ontario T1 Estimate · {new Date().toLocaleDateString('en-CA')} · This is an estimate only.
      </p>
    </div>
  );
}
