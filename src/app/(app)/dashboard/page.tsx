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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
  const [firstName, setFirstName] = useState('');
  const [userLoading, setUserLoading] = useState(true);

  // Fetch real user from Supabase auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const fullName = (data.user.user_metadata?.full_name as string | undefined) ?? '';
        const email = data.user.email ?? '';
        setFirstName(fullName.split(' ')[0] || email.split('@')[0] || 'there');
      }
      setUserLoading(false);
    });
  }, []);

  // New users have no data yet — show a clean empty state with CTAs.
  // Once assessment + slips are saved to Supabase, replace this block
  // with a Supabase query (tax_profiles, tax_slips, tax_calculations tables).
  const assessmentDone = false;
  const hasSlips = false;
  const hasCalculation = false;

  const progressSteps = [assessmentDone, hasSlips, hasCalculation].filter(Boolean).length;
  const progressPct = Math.round((progressSteps / 3) * 100);

  const warnings: string[] = [];
  if (!assessmentDone) warnings.push('Complete your assessment to see your estimated refund or balance owing.');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-[var(--text-muted)] mb-1">{greeting()},</p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {userLoading ? (
            <span className="inline-block w-32 h-7 bg-slate-100 animate-pulse rounded-lg" />
          ) : firstName}
        </h1>
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

      {/* Metric cards — show empty state until user completes assessment */}
      {hasCalculation ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Total Income" value="—" sub="Complete assessment to calculate" />
          <MetricCard label="Estimated Tax" value="—" />
          <MetricCard label="Balance Owing" value="—" sub="Due April 30, 2026" />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <Calculator className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700">No tax calculation yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Complete your assessment and upload your slips to see your estimated refund or balance owing.
          </p>
          <Link
            href="/onboarding"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--emerald)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Start assessment
          </Link>
        </div>
      )}

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
            subtitle={hasSlips ? 'Slips uploaded' : 'Add your T4, T5, and other CRA slips'}
            status={hasSlips ? 'done' : assessmentDone ? 'active' : 'locked'}
            href="/slips"
          />
          <ChecklistStep
            step={3}
            title="Review your calculation"
            subtitle={hasCalculation ? 'Tax calculated — review your T1 summary' : 'Ready when slips are uploaded'}
            status={hasCalculation ? 'done' : hasSlips ? 'active' : 'locked'}
            href="/calculator"
          />
          <ChecklistStep
            step={4}
            title="Get your filing guide"
            subtitle={hasCalculation ? 'Generate your personalized step-by-step guide' : 'Available after calculation'}
            status={hasCalculation ? 'active' : 'locked'}
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
            {assessmentDone ? 'Continue assessment' : 'Start assessment'}
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
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] text-slate-300 px-4 py-3 text-sm font-semibold cursor-not-allowed"
          >
            <BookOpen className="h-4 w-4" />
            Filing guide
          </Link>
        </div>
      </div>
    </div>
  );
}
