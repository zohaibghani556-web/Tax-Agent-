'use client';

import { useState, useMemo } from 'react';
import {
  Users, TrendingDown, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Info, Sparkles,
} from 'lucide-react';
import { optimize, type SpouseInput, type FamilyInput, type FamilyOptimization } from '@/lib/tax-engine/family-optimizer';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  prefix = '$',
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-white/50 font-medium uppercase tracking-wider">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">{prefix}</span>
        )}
        <input
          type="number"
          min="0"
          value={value || ''}
          onChange={e => onChange(Number(e.target.value) || 0)}
          placeholder="0"
          className="w-full rounded-xl py-2.5 text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-white/20"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            paddingLeft: prefix ? '1.75rem' : '0.75rem',
            paddingRight: '0.75rem',
          }}
        />
      </div>
      {hint && <p className="text-xs text-white/30">{hint}</p>}
    </div>
  );
}

function SpouseForm({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: SpouseInput;
  onChange: (v: SpouseInput) => void;
}) {
  const set = (field: keyof SpouseInput, v: number) =>
    onChange({ ...value, [field]: v });

  return (
    <GlassCard className="p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: color }}
        >
          {label.slice(-1)}
        </div>
        <h3 className="text-white font-semibold text-base">{label}</h3>
      </div>

      {/* Income */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-medium">Income</p>
        <div className="flex flex-col gap-3">
          <InputField
            label="Employment income"
            value={value.employmentIncome}
            onChange={v => set('employmentIncome', v)}
            hint="T4 Box 14"
          />
          <InputField
            label="Self-employment net"
            value={value.selfEmploymentNetIncome}
            onChange={v => set('selfEmploymentNetIncome', v)}
            hint="T2125 net profit"
          />
          <InputField
            label="Eligible pension"
            value={value.pensionIncome}
            onChange={v => set('pensionIncome', v)}
            hint="T4A Box 016, T4RIF — eligible for splitting"
          />
          <InputField
            label="Other income"
            value={value.otherIncome}
            onChange={v => set('otherIncome', v)}
            hint="Interest, dividends, capital gains, other"
          />
        </div>
      </div>

      {/* Deductions */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-medium">RRSP</p>
        <div className="flex flex-col gap-3">
          <InputField
            label="RRSP contribution this year"
            value={value.rrspContribution}
            onChange={v => set('rrspContribution', v)}
          />
          <InputField
            label="RRSP contribution room"
            value={value.rrspContributionRoom}
            onChange={v => set('rrspContributionRoom', v)}
            hint="From prior-year NOA"
          />
        </div>
      </div>

      {/* Other */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-medium">Other</p>
        <div className="flex flex-col gap-3">
          <InputField
            label="Age on Dec 31, 2025"
            value={value.age}
            onChange={v => set('age', v)}
            prefix=""
          />
          <InputField
            label="Tax withheld at source"
            value={value.taxWithheld}
            onChange={v => set('taxWithheld', v)}
            hint="T4 Box 22, T4A Box 22, etc."
          />
        </div>
      </div>
    </GlassCard>
  );
}

// ── Results panel ─────────────────────────────────────────────────────────────

function ResultsPanel({ result, ccExpenses }: { result: FamilyOptimization; ccExpenses: number }) {
  const [showExplanations, setShowExplanations] = useState(true);
  const hasSavings = result.savingsFromOptimization > 0;

  const splitAmt = result.optimalAllocation.pensionSplitAmount;
  const splitFrom = splitAmt > 0 ? 'Spouse A' : splitAmt < 0 ? 'Spouse B' : null;
  const splitTo   = splitAmt > 0 ? 'Spouse B' : splitAmt < 0 ? 'Spouse A' : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Savings banner */}
      <GlassCard className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white/50 text-sm mb-1">Household tax savings</p>
            <p
              className="text-4xl font-bold"
              style={{ color: hasSavings ? '#4ade80' : '#ffffff' }}
            >
              {fmt(result.savingsFromOptimization)}
            </p>
            <p className="text-white/40 text-xs mt-1">
              vs. filing independently without optimization
            </p>
          </div>
          {hasSavings ? (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}
            >
              <TrendingDown className="w-4 h-4" />
              Optimized
            </div>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Already optimal
            </div>
          )}
        </div>

        {/* Before / After */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <p className="text-xs text-white/40 mb-1">Naive combined tax</p>
            <p className="text-white font-semibold text-lg">{fmt(result.familyTaxNaive)}</p>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ background: 'rgba(74,222,128,0.08)' }}
          >
            <p className="text-xs text-white/40 mb-1">Optimal combined tax</p>
            <p className="font-semibold text-lg" style={{ color: '#4ade80' }}>
              {fmt(result.familyTaxOptimal)}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Per-spouse breakdown */}
      <GlassCard className="p-6">
        <h4 className="text-white font-semibold mb-4">Per-spouse breakdown</h4>
        <div className="space-y-3">
          {[
            {
              label: 'Spouse A',
              color: '#818cf8',
              netIncome: result.spouseANetIncome,
              taxNaive: result.spouseATaxNaive,
              taxOptimal: result.spouseATaxOptimal,
            },
            {
              label: 'Spouse B',
              color: '#34d399',
              netIncome: result.spouseBNetIncome,
              taxNaive: result.spouseBTaxNaive,
              taxOptimal: result.spouseBTaxOptimal,
            },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-white font-medium text-sm">{s.label}</span>
                <span className="text-white/40 text-xs ml-auto">
                  Net income: {fmt(s.netIncome)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-white/40">Without optimization</p>
                  <p className="text-white text-sm font-medium">{fmt(s.taxNaive)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Optimal</p>
                  <p className="text-sm font-medium" style={{ color: s.color }}>
                    {fmt(s.taxOptimal)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* What each spouse should claim */}
      <GlassCard className="p-6">
        <h4 className="text-white font-semibold mb-4">Optimal filing instructions</h4>
        <div className="space-y-3">
          {/* Childcare */}
          {ccExpenses > 0 && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
              <div>
                <p className="text-white text-sm font-medium">Childcare — {fmt(ccExpenses)}</p>
                <p className="text-white/50 text-xs mt-0.5">
                  Claimed by{' '}
                  <span className="text-white font-semibold">
                    {result.optimalAllocation.childcareClaimedBy === 'A' ? 'Spouse A' : 'Spouse B'}
                  </span>{' '}
                  on line 21400 (CRA rule: lower-income spouse, ITA s.63)
                </p>
              </div>
            </div>
          )}

          {/* Pension split */}
          {splitFrom && splitTo && splitAmt !== 0 && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
              <div>
                <p className="text-white text-sm font-medium">
                  Pension split — {fmt(Math.abs(splitAmt))} from {splitFrom} to {splitTo}
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  File Form T1032 (Joint Election to Split Pension Income). {splitFrom} deducts on
                  line 21000; {splitTo} includes on line 11600.
                </p>
              </div>
            </div>
          )}

          {/* RRSP */}
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
            <div>
              <p className="text-white text-sm font-medium">RRSP strategy</p>
              <p className="text-white/50 text-xs mt-0.5">
                {result.optimalAllocation.rrspRecommendation}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Explanations */}
      <GlassCard className="p-6">
        <button
          onClick={() => setShowExplanations(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h4 className="text-white font-semibold">Why these numbers?</h4>
          </div>
          {showExplanations ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        {showExplanations && (
          <div className="mt-4 space-y-3">
            {result.explanations.map((ex, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                  style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc' }}
                >
                  {i + 1}
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{ex}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* CRA disclaimer */}
      <div
        className="flex items-start gap-3 rounded-xl p-4"
        style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
        <p className="text-yellow-200/70 text-xs leading-relaxed">
          This optimizer minimises combined 2025 Ontario tax based on the inputs provided.
          Pension splitting requires Form T1032 filed by both spouses. Childcare eligibility
          depends on CRA-qualified expenses and child ages (ITA s.63). Consult a CPA for
          complex situations.
        </p>
      </div>
    </div>
  );
}

// ── Default spouse ────────────────────────────────────────────────────────────

function defaultSpouse(): SpouseInput {
  return {
    employmentIncome:        0,
    selfEmploymentNetIncome: 0,
    pensionIncome:           0,
    otherIncome:             0,
    rrspContribution:        0,
    rrspContributionRoom:    0,
    age:                     40,
    taxWithheld:             0,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FamilyPage() {
  const [spouseA, setSpouseA] = useState<SpouseInput>(defaultSpouse);
  const [spouseB, setSpouseB] = useState<SpouseInput>(defaultSpouse);
  const [childcareExpenses, setChildcareExpenses] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  const result = useMemo<FamilyOptimization | null>(() => {
    if (!hasRun) return null;
    const input: FamilyInput = { spouseA, spouseB, childcareExpenses };
    try {
      return optimize(input);
    } catch {
      return null;
    }
  }, [hasRun, spouseA, spouseB, childcareExpenses]);

  // Re-run automatically when inputs change after first run
  const liveResult = useMemo<FamilyOptimization | null>(() => {
    if (!hasRun) return null;
    const input: FamilyInput = { spouseA, spouseB, childcareExpenses };
    try {
      return optimize(input);
    } catch {
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spouseA, spouseB, childcareExpenses, hasRun]);

  const displayResult = liveResult ?? result;

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #0a0a14 50%, #0f0f1a 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #818cf8, #34d399)' }}
            >
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Family Tax Optimizer</h1>
              <p className="text-white/50 text-sm">
                Find the optimal allocation of deductions between spouses to minimise combined household tax
              </p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              'Childcare allocation (ITA s.63)',
              'Pension splitting (ITA s.60.03)',
              'Spousal RRSP strategy',
              '2025 Ontario rates',
            ].map(tag => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Shared household inputs */}
        <GlassCard className="p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Household expenses</h3>
          <div className="max-w-xs">
            <InputField
              label="Total childcare expenses"
              value={childcareExpenses}
              onChange={setChildcareExpenses}
              hint="Total eligible childcare — optimizer decides who claims it"
            />
          </div>
        </GlassCard>

        {/* Two-column spouse inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <SpouseForm
            label="Spouse A"
            color="#818cf8"
            value={spouseA}
            onChange={setSpouseA}
          />
          <SpouseForm
            label="Spouse B"
            color="#34d399"
            value={spouseB}
            onChange={setSpouseB}
          />
        </div>

        {/* Run button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setHasRun(true)}
            className="px-8 py-3 rounded-2xl font-semibold text-white text-base transition-all"
            style={{
              background: 'linear-gradient(135deg, #818cf8, #34d399)',
              boxShadow: '0 0 24px rgba(129,140,248,0.3)',
            }}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Optimize household tax
            </span>
          </button>
        </div>

        {/* Results */}
        {displayResult && (
          <ResultsPanel result={displayResult} ccExpenses={childcareExpenses} />
        )}
      </div>
    </div>
  );
}
