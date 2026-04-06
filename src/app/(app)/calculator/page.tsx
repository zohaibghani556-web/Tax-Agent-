'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Download, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import { WhatIfEngine } from '@/components/calculator/WhatIfEngine';
import { CreditFinder } from '@/components/calculator/CreditFinder';
import {
  DEMO_BUSINESS,
  DEMO_DEDUCTIONS,
  DEMO_PROFILE,
  DEMO_RENTAL,
  DEMO_SLIPS,
} from '@/lib/demo-data';
import type { TaxCalculationResult } from '@/lib/tax-engine/types';

function formatCad(n: number, d = 2): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    maximumFractionDigits: d, minimumFractionDigits: d,
  }).format(n);
}

function pct(n: number) { return `${(n * 100).toFixed(2)}%`; }

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
    <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-semibold text-sm text-[var(--text-primary)]">{title}</span>
          {!open && <span className="text-sm tabular-nums text-[var(--text-secondary)]">{formatCad(total)}</span>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <>
          <div className="border-t border-[var(--border)]">
            {lines.map((item, i) => (
              <div
                key={i}
                className={`flex items-baseline justify-between px-5 py-2.5 border-b border-slate-50 last:border-0 ${item.indent ? 'pl-8' : ''}`}
              >
                <div className="flex items-baseline gap-2">
                  {item.line && <span className="text-xs text-[var(--text-muted)] tabular-nums w-12">L{item.line}</span>}
                  <span className={`text-sm ${item.faint ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{item.label}</span>
                </div>
                <span className={`text-sm tabular-nums shrink-0 ml-4 ${item.faint ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
                  {formatCad(item.amount)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between px-5 py-3 bg-slate-50 border-t border-[var(--border)]">
            <div className="flex items-baseline gap-2">
              {totalLine && <span className="text-xs text-[var(--text-muted)] w-12">L{totalLine}</span>}
              <span className="text-sm font-semibold text-[var(--text-primary)]">{totalLabel}</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{formatCad(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-14 bg-slate-100 animate-pulse rounded-xl" />;
}

export default function CalculatorPage() {
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<Date | null>(null);

  const profile = DEMO_PROFILE;
  const deductions = DEMO_DEDUCTIONS;

  async function runCalc() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: DEMO_PROFILE, slips: DEMO_SLIPS,
          business: DEMO_BUSINESS, rental: DEMO_RENTAL, deductions: DEMO_DEDUCTIONS,
        }),
      });
      if (!res.ok) throw new Error();
      setResult(await res.json());
      setCalculatedAt(new Date());
    } catch {
      setError('Calculation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runCalc(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isRefund = result && result.balanceOwing < 0;

  return (
    <div className="px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tax Calculator</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            2025 Ontario T1 Summary · {profile.legalName}
            {calculatedAt && (
              <span className="ml-2 text-[var(--text-muted)]">
                · Updated {calculatedAt.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={runCalc}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Calculating…' : 'Recalculate'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6 print:hidden">
          <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Warnings */}
      {result?.warnings?.length ? (
        <div className="space-y-2 mb-6">
          {result.warnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${w.severity === 'error' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
              <AlertTriangle className={`h-4 w-4 mt-0.5 ${w.severity === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
              <p className={`text-sm ${w.severity === 'error' ? 'text-red-700' : 'text-amber-800'}`}>{w.message}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Two-column layout */}
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
                  { label: 'Interest and investment income', line: 12100, amount: result.lineByLine[12100] ?? 0 },
                  { label: 'Taxable eligible dividends', line: 12000, amount: result.lineByLine[12000] ?? 0 },
                  { label: 'Other taxable dividends', line: 12010, amount: result.lineByLine[12010] ?? 0 },
                ].filter((l) => l.amount !== 0)}
              />

              <Section
                title="Deductions" total={result.totalIncome - result.netIncome}
                totalLabel="Total Deductions"
                lines={[
                  { label: 'RRSP/PRPP deduction', line: 20800, amount: result.lineByLine[20800] ?? deductions.rrspContributions },
                  { label: 'Union, professional dues', amount: deductions.unionDues },
                  { label: 'Child care expenses', amount: deductions.childcareExpenses },
                  { label: 'Moving expenses', amount: deductions.movingExpenses },
                ].filter((l) => l.amount > 0)}
              />

              {/* Net Income row */}
              <div className="flex items-baseline justify-between bg-white rounded-xl border border-[var(--border)] px-5 py-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-[var(--text-muted)]">L23600</span>
                  <span className="font-semibold text-sm text-[var(--text-primary)]">Net Income</span>
                </div>
                <span className="font-bold tabular-nums text-[var(--text-primary)]">{formatCad(result.netIncome)}</span>
              </div>

              {/* Taxable Income row */}
              <div className="flex items-baseline justify-between bg-white rounded-xl border border-[var(--border)] px-5 py-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-[var(--text-muted)]">L26000</span>
                  <span className="font-semibold text-sm text-[var(--text-primary)]">Taxable Income</span>
                </div>
                <span className="font-bold tabular-nums text-[var(--text-primary)]">{formatCad(result.taxableIncome)}</span>
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
                <div className="flex items-start justify-between bg-[var(--emerald-tint)] rounded-xl border border-emerald-200 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Ontario Trillium Benefit (ON-BEN)</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Estimated annual benefit, paid monthly starting July 2026</p>
                  </div>
                  <span className="font-bold tabular-nums text-emerald-700 text-sm shrink-0 ml-4">{formatCad(result.estimatedOTB)} / yr</span>
                </div>
              )}

              {/* Result card — PROMINENT */}
              <div className={`rounded-2xl p-6 ${isRefund ? 'bg-[var(--emerald)]' : 'bg-red-500'}`}>
                <p className="text-sm font-semibold text-white/80 mb-1">{isRefund ? 'Your estimated refund' : 'Amount owing'}</p>
                <p className="text-5xl font-black tabular-nums text-white mb-2">
                  {formatCad(Math.abs(result.balanceOwing))}
                </p>
                <p className="text-sm text-white/70 mb-4">Based on your current information</p>
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
                  <div key={r.label} className="bg-white rounded-xl border border-[var(--border)] p-4 text-center">
                    <p className="text-xs text-[var(--text-muted)] mb-1">{r.label}</p>
                    <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{r.value}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{r.sub}</p>
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
              <WhatIfEngine result={result} deductions={deductions} />
              <CreditFinder result={result} deductions={deductions} profile={profile} />
            </>
          )}
          {loading && !result && (
            <div className="space-y-4">
              <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-64 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          )}
        </div>
      </div>

      {/* Print footer */}
      <p className="hidden print:block text-xs text-slate-400 text-center pt-4 mt-6">
        TaxAgent.ai · 2025 Ontario T1 Estimate · {new Date().toLocaleDateString('en-CA')} · This is an estimate only.
      </p>
    </div>
  );
}
