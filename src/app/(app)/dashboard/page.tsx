'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  Check,
  ChevronRight,
  FileText,
  MessageSquare,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  DEMO_BUSINESS,
  DEMO_DEDUCTIONS,
  DEMO_PROFILE,
  DEMO_RENTAL,
  DEMO_SLIPS,
} from '@/lib/demo-data';
import type { TaxCalculationResult } from '@/lib/tax-engine/types';

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function MetricCard({
  label,
  value,
  sub,
  highlight,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'emerald' | 'red';
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--border)]">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">{label}</p>
      {loading ? (
        <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg mb-1" />
      ) : (
        <p className={`text-2xl font-bold tabular-nums ${highlight === 'emerald' ? 'text-[var(--emerald)]' : highlight === 'red' ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
          {value}
        </p>
      )}
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
  );
}

type StepStatus = 'done' | 'active' | 'locked';

function ChecklistStep({
  step,
  title,
  subtitle,
  status,
  href,
}: {
  step: number;
  title: string;
  subtitle: string;
  status: StepStatus;
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 py-4 group">
      <div className={`h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold transition-colors
        ${status === 'done' ? 'bg-[var(--emerald)] text-white' :
          status === 'active' ? 'bg-[var(--navy)] text-white' :
          'bg-slate-100 text-[var(--text-muted)]'}`}
      >
        {status === 'done' ? <Check className="h-4 w-4" /> : step}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${status === 'locked' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
          {title}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-colors ${status === 'locked' ? 'text-slate-200' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}`} />
    </Link>
  );
}

export default function DashboardPage() {
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profile = DEMO_PROFILE;
  const slips = DEMO_SLIPS;
  const firstName = profile.legalName.split(' ')[0];
  const slipCount = slips.length;
  const assessmentDone = profile.assessmentComplete;
  const hasSlips = slipCount > 0;

  const progressSteps = [assessmentDone, hasSlips, !!result].filter(Boolean).length;
  const progressPct = Math.round((progressSteps / 3) * 100);

  useEffect(() => {
    fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: DEMO_PROFILE,
        slips: DEMO_SLIPS,
        business: DEMO_BUSINESS,
        rental: DEMO_RENTAL,
        deductions: DEMO_DEDUCTIONS,
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setResult)
      .catch(() => setError('Could not compute estimate. Check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  const isRefund = result && result.balanceOwing < 0;
  const warnings: string[] = [];
  if (!assessmentDone) warnings.push('Your tax assessment is incomplete — some credits may be missed.');
  if (result?.warnings?.length) result.warnings.forEach((w) => warnings.push(w.message));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-[var(--text-muted)] mb-1">{greeting()},</p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{firstName}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Your 2025 tax return is{' '}
          <span className="font-semibold text-[var(--text-primary)]">{progressPct}% complete</span>
        </p>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--emerald)] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-[var(--text-muted)] tabular-nums w-10 text-right">{progressPct}%</span>
        </div>

        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
          Filing deadline: <span className="font-semibold text-[var(--text-secondary)]">April 30, 2026</span>
        </div>
      </div>

      {/* Warning banners */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((msg, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{msg}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Income"
          value={loading ? '' : result ? formatCad(result.totalIncome) : '—'}
          sub="Employment + investment income"
          loading={loading}
        />
        <MetricCard
          label="Estimated Tax"
          value={loading ? '' : result ? formatCad(result.totalTaxPayable) : '—'}
          sub={result ? `${(result.averageTaxRate * 100).toFixed(1)}% avg · ${(result.combinedMarginalRate * 100).toFixed(1)}% marginal` : undefined}
          loading={loading}
        />
        <MetricCard
          label={isRefund ? 'Estimated Refund' : 'Balance Owing'}
          value={loading ? '' : result ? formatCad(Math.abs(result.balanceOwing)) : '—'}
          sub={isRefund ? "You're getting money back 🎉" : result ? 'Due April 30, 2026' : undefined}
          highlight={isRefund ? 'emerald' : result ? 'red' : undefined}
          loading={loading}
        />
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Your filing checklist</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Complete each step to get your personalized filing guide.</p>
        <div className="divide-y divide-[var(--border)]">
          <ChecklistStep
            step={1}
            title="Complete AI assessment"
            subtitle={assessmentDone ? 'Assessment complete' : 'Tell us about your income and deductions'}
            status={assessmentDone ? 'done' : 'active'}
            href="/onboarding"
          />
          <ChecklistStep
            step={2}
            title="Upload your slips"
            subtitle={hasSlips ? `${slipCount} slip${slipCount !== 1 ? 's' : ''} uploaded` : 'Add your T4, T5, and other CRA slips'}
            status={hasSlips ? 'done' : assessmentDone ? 'active' : 'locked'}
            href="/slips"
          />
          <ChecklistStep
            step={3}
            title="Review your calculation"
            subtitle={result ? 'Tax calculated — review your T1 summary' : 'Ready when slips are uploaded'}
            status={result ? 'done' : hasSlips ? 'active' : 'locked'}
            href="/calculator"
          />
          <ChecklistStep
            step={4}
            title="Get your filing guide"
            subtitle={result ? 'Generate your personalized step-by-step guide' : 'Available after calculation'}
            status={result ? 'active' : 'locked'}
            href="/filing-guide"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--emerald)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Continue assessment
          </Link>
          <Link
            href="/slips"
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--navy)] text-[var(--navy)] px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Add a slip
          </Link>
          <Link
            href="/calculator"
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <Calculator className="h-4 w-4" />
            View calculator
          </Link>
          <Link
            href="/filing-guide"
            className={`flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold transition-colors ${result ? 'text-[var(--text-secondary)] hover:bg-slate-50' : 'text-slate-300 cursor-not-allowed'}`}
          >
            <BookOpen className="h-4 w-4" />
            Filing guide
          </Link>
        </div>
      </div>

      {/* Slip inventory */}
      {hasSlips && (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Your tax slips ({slipCount})
            </h2>
            <Link href="/slips" className="text-sm text-[var(--emerald)] font-medium hover:underline">
              Manage
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50">
                  <th className="py-3 px-6 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Issuer</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {slips.map((slip, i) => {
                  const slipData = 'data' in slip ? (slip.data as unknown as Record<string, unknown>) : null;
                  const issuer = slipData && 'issuerName' in slipData ? String(slipData.issuerName) : '—';
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-6">
                        <span className="inline-flex items-center rounded-full bg-[var(--navy)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--navy)]">
                          {slip.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] truncate max-w-[160px]">{issuer}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--emerald)]">
                          <Check className="h-3 w-3" /> Uploaded
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-[var(--border)]">
            <Link href="/slips" className="text-sm text-[var(--emerald)] font-medium hover:underline flex items-center gap-1">
              + Add slip
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
