'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronUp, Download, RefreshCw,
  XCircle, AlertTriangle, FileText, Settings2,
} from 'lucide-react';
import { WhatIfEngine } from '@/components/calculator/WhatIfEngine';
import { CreditFinder } from '@/components/calculator/CreditFinder';
import { createClient } from '@/lib/supabase/client';
import type { TaxProfile, TaxSlip, DeductionsCreditsInput, TaxCalculationResult } from '@/lib/tax-engine/types';

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

// Deductions the user can enter manually (things not on slips)
interface UserDeductions {
  rrspContributions: number;
  rentPaid: number;           // annual rent — drives OTB/OEPTC (worth hundreds)
  propertyTaxPaid: number;
  medicalExpenses: number;    // total medical (drugs, dental, vision)
  charitableDonations: number;
  studentLoanInterest: number;
  unionDues: number;          // if not already on T4 box 44
  tuitionCarryforward: number;
}

const DEFAULT_USER_DEDUCTIONS: UserDeductions = {
  rrspContributions: 0,
  rentPaid: 0,
  propertyTaxPaid: 0,
  medicalExpenses: 0,
  charitableDonations: 0,
  studentLoanInterest: 0,
  unionDues: 0,
  tuitionCarryforward: 0,
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
      medicalExpenses: userDeductions.medicalExpenses > 0
        ? [{ description: 'Medical expenses', amount: userDeductions.medicalExpenses, forWhom: 'self' as const }]
        : [],
      donations: userDeductions.charitableDonations > 0
        ? [{ recipientName: 'Charitable donations', amount: userDeductions.charitableDonations, type: 'cash' as const, eligibleForProvincial: true }]
        : [],
      studentLoanInterest: userDeductions.studentLoanInterest,
      unionDues: userDeductions.unionDues,
      tuitionCarryforward: userDeductions.tuitionCarryforward,
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
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          slips,
          business: [],
          rental: [],
          deductions: buildDeductions(),
        }),
      });
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
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Calculating…' : 'Recalculate'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>

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
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="p-5">
            <p className="text-xs text-white/40 mb-5">
              These are things <strong className="text-white/60">not on your slips</strong> that reduce your taxes.
              Enter what applies to you — even small amounts add up.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <DeductionField
                label="RRSP Contributions"
                hint="Contributions made Jan 1, 2025 – Mar 3, 2026. Reduces your taxable income dollar-for-dollar."
                value={userDeductions.rrspContributions}
                onChange={(v) => updateDeduction('rrspContributions', v)}
              />
              <DeductionField
                label="Annual Rent Paid"
                hint="Total rent paid in 2025 (all 12 months). Used to calculate the Ontario Trillium Benefit — worth up to $1,248/year for renters."
                value={userDeductions.rentPaid}
                onChange={(v) => updateDeduction('rentPaid', v)}
              />
              <DeductionField
                label="Property Tax Paid"
                hint="If you own your home, enter the property tax you paid in 2025. Also used for the Ontario Trillium Benefit."
                value={userDeductions.propertyTaxPaid}
                onChange={(v) => updateDeduction('propertyTaxPaid', v)}
              />
              <DeductionField
                label="Medical Expenses"
                hint="Total out-of-pocket medical costs (prescriptions, dental, glasses, physio). Only the amount above $2,759 or 3% of your income generates a credit."
                value={userDeductions.medicalExpenses}
                onChange={(v) => updateDeduction('medicalExpenses', v)}
              />
              <DeductionField
                label="Charitable Donations"
                hint="Total donations to registered Canadian charities. First $200 generates a 15% credit; amounts above that generate a 29–33% credit."
                value={userDeductions.charitableDonations}
                onChange={(v) => updateDeduction('charitableDonations', v)}
              />
              <DeductionField
                label="Student Loan Interest"
                hint="Interest paid on Government of Canada student loans only (not bank loans). Generates a 15% non-refundable credit."
                value={userDeductions.studentLoanInterest}
                onChange={(v) => updateDeduction('studentLoanInterest', v)}
              />
              <DeductionField
                label="Union / Professional Dues"
                hint="If your union dues aren't already on your T4 box 44, enter the amount from your receipt here."
                value={userDeductions.unionDues}
                onChange={(v) => updateDeduction('unionDues', v)}
              />
              <DeductionField
                label="Unused Tuition (Prior Years)"
                hint="If you had unused tuition credits from years before 2025, enter the amount from your 2024 Notice of Assessment (line 32000)."
                value={userDeductions.tuitionCarryforward}
                onChange={(v) => updateDeduction('tuitionCarryforward', v)}
              />
            </div>
            <button
              onClick={runCalc}
              disabled={loading || !hasSlips}
              className="mt-5 flex items-center gap-2 rounded-full bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors disabled:opacity-40"
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
        <div className="flex gap-6 items-start">
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
                  <p className="text-5xl font-black tabular-nums text-white mb-2">
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
              </>
            )}
          </div>

          {/* RIGHT — tools (35%) */}
          <div className="flex-[35] min-w-0 space-y-4 print:hidden">
            {result && (
              <>
                <WhatIfEngine result={result} deductions={buildDeductions()} />
                <CreditFinder result={result} deductions={buildDeductions()} profile={currentProfile} />
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
