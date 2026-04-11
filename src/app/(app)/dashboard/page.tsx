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
import type { TaxCalculationResult } from '@/lib/tax-engine/types';
import { getLatestCalculation, getSlips } from '@/lib/supabase/tax-data';
import { toast } from 'sonner';

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

/** Glass card used throughout the dark-themed app UI */
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
    <GlassCard className="p-6">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">{label}</p>
      {loading ? (
        <div className="h-8 w-32 rounded-lg mb-1" style={{ background: 'rgba(255,255,255,0.06)', animation: 'pulse 2s infinite' }} />
      ) : (
        <p className={`text-2xl font-bold tabular-nums ${
          highlight === 'emerald' ? 'text-[#10B981]'
          : highlight === 'red' ? 'text-red-400'
          : 'text-white'
        }`}>
          {value}
        </p>
      )}
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </GlassCard>
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
      <div className={`h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold transition-colors ${
        status === 'done' ? 'bg-[#10B981] text-white'
        : status === 'active' ? 'bg-white/15 text-white border border-white/20'
        : 'bg-white/5 text-white/25'
      }`}>
        {status === 'done' ? <Check className="h-4 w-4" /> : step}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${status === 'locked' ? 'text-white/30' : 'text-white/80'}`}>{title}</p>
        <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-colors ${
        status === 'locked' ? 'text-white/10' : 'text-white/30 group-hover:text-white/60'
      }`} />
    </Link>
  );
}

function OnboardingBanner({
  assessmentDone,
  hasSlips,
  hasCalculation,
  onDismiss,
}: {
  assessmentDone: boolean;
  hasSlips: boolean;
  hasCalculation: boolean;
  onDismiss: () => void;
}) {
  const steps = [
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: 'Start your assessment',
      desc: 'Chat with your AI CPA',
      href: '/onboarding',
      done: assessmentDone,
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: 'Upload your slips',
      desc: 'Add T4, T5 and other CRA slips',
      href: '/slips',
      done: hasSlips,
    },
    {
      icon: <Calculator className="h-5 w-5" />,
      title: 'See your tax summary',
      desc: 'Review refund or balance owing',
      href: '/calculator',
      done: hasCalculation,
    },
  ];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-emerald-400">Get started in 3 steps</p>
          <p className="text-xs text-white/40 mt-0.5">Complete each step to file your 2025 return.</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-white/25 hover:text-white/60 transition-colors text-xs leading-none ml-4 mt-0.5"
          aria-label="Dismiss getting started banner"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {steps.map((s, i) => (
          <Link
            key={i}
            href={s.href}
            className="flex-1 flex items-start gap-3 rounded-xl p-3 transition-colors group"
            style={{
              background: s.done ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
              border: s.done ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className={`mt-0.5 flex-shrink-0 ${s.done ? 'text-emerald-400' : 'text-white/30 group-hover:text-white/60 transition-colors'}`}>
              {s.done ? <Check className="h-5 w-5" /> : s.icon}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${s.done ? 'text-emerald-400' : 'text-white/70'}`}>
                {s.done ? '✓ ' : ''}{s.title}
              </p>
              <p className="text-[11px] text-white/35 mt-0.5">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [firstName, setFirstName] = useState('');
  const [userLoading, setUserLoading] = useState(true);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [hasSlips, setHasSlips] = useState(false);
  const [calcResult, setCalcResult] = useState<TaxCalculationResult | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true); // default true to avoid flash

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? '';

      if (data.user) {
        const fullName = (data.user.user_metadata?.full_name as string | undefined) ?? '';
        const email = data.user.email ?? '';
        setFirstName(fullName.split(' ')[0] || email.split('@')[0] || 'there');
      }
      setUserLoading(false);

      // Read local state first
      setAssessmentDone(!!localStorage.getItem('taxagent_assessment_done'));
      setOnboardingDismissed(!!localStorage.getItem('taxagent_onboarding_dismissed'));

      const localSlipsRaw = localStorage.getItem('taxagent_slips');
      let localSlipCount = 0;
      try {
        if (localSlipsRaw) {
          const parsed = JSON.parse(localSlipsRaw) as unknown[];
          localSlipCount = Array.isArray(parsed) ? parsed.length : 0;
          setHasSlips(localSlipCount > 0);
        }
      } catch { /* ignore */ }

      let localCalc: TaxCalculationResult | null = null;
      try {
        const calc = localStorage.getItem('taxagent_calc_result');
        if (calc) {
          localCalc = JSON.parse(calc) as TaxCalculationResult;
          setCalcResult(localCalc);
        }
      } catch { /* ignore */ }

      // Then sync from Supabase for multi-device support
      if (uid) {
        const [dbCalc, dbSlips] = await Promise.all([
          getLatestCalculation(uid, 2025),
          getSlips(uid, 2025),
        ]);

        if (dbSlips.length > localSlipCount) {
          setHasSlips(true);
          localStorage.setItem('taxagent_slips', JSON.stringify(dbSlips));
          toast('Your slips from another device have been loaded.', { icon: '🔄', duration: 3000 });
        }

        if (dbCalc && !localCalc) {
          setCalcResult(dbCalc);
          localStorage.setItem('taxagent_calc_result', JSON.stringify(dbCalc));
          toast('Your latest calculation has been synced.', { icon: '🔄', duration: 3000 });
        }
      }
    }
    init().catch(() => { setUserLoading(false); });
  }, []);

  const hasCalculation = calcResult !== null;

  function dismissOnboarding() {
    localStorage.setItem('taxagent_onboarding_dismissed', '1');
    setOnboardingDismissed(true);
  }

  const showOnboarding = !onboardingDismissed && !hasSlips && !hasCalculation;

  const progressSteps = [assessmentDone, hasSlips, hasCalculation].filter(Boolean).length;
  const progressPct = Math.round((progressSteps / 3) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-sm text-white/40 mb-1">{greeting()},</p>
        <h1 className="text-2xl font-bold text-white">
          {userLoading
            ? <span className="inline-block w-32 h-7 rounded-lg align-middle" style={{ background: 'rgba(255,255,255,0.06)', animation: 'pulse 2s infinite' }} />
            : firstName}
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Your 2025 tax return is{' '}
          <span className="font-semibold text-white">{progressPct}% complete</span>
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full bg-[#10B981] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-white/40 tabular-nums w-10 text-right">{progressPct}%</span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/40">
          <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
          Filing deadline:{' '}
          <span className="font-semibold text-white/60">April 30, 2026</span>
        </div>
      </div>

      {/* ── Getting started banner (first-run, dismissible) ────────── */}
      {showOnboarding && (
        <OnboardingBanner
          assessmentDone={assessmentDone}
          hasSlips={hasSlips}
          hasCalculation={hasCalculation}
          onDismiss={dismissOnboarding}
        />
      )}

      {/* ── Warning for new users ──────────────────────────────────── */}
      {!assessmentDone && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300/80">
            Start your AI assessment to see your estimated refund and filing checklist.
          </p>
        </div>
      )}

      {/* ── Metric cards or empty state ────────────────────────────── */}
      {hasCalculation && calcResult ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Total Income"
            value={formatCad(calcResult.totalIncome)}
            sub="2025 total income"
          />
          <MetricCard
            label="Total Tax Payable"
            value={formatCad(calcResult.totalTaxPayable)}
            sub={`Avg rate: ${(calcResult.averageTaxRate * 100).toFixed(1)}%`}
          />
          <MetricCard
            label={calcResult.balanceOwing < 0 ? 'Estimated Refund' : 'Balance Owing'}
            value={formatCad(Math.abs(calcResult.balanceOwing))}
            sub="Due April 30, 2026"
            highlight={calcResult.balanceOwing < 0 ? 'emerald' : 'red'}
          />
        </div>
      ) : (
        <GlassCard className="px-6 py-10 text-center">
          <Calculator className="mx-auto h-10 w-10 text-white/20 mb-3" />
          <p className="font-semibold text-white/70">No tax calculation yet</p>
          <p className="text-sm text-white/40 mt-1 max-w-xs mx-auto">
            Complete your assessment and upload your slips to see your estimated refund or balance owing.
          </p>
          <Link
            href="/onboarding"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Start assessment
          </Link>
        </GlassCard>
      )}

      {/* ── Filing checklist ───────────────────────────────────────── */}
      <GlassCard className="p-6">
        <h2 className="text-base font-semibold text-white mb-1">Your filing checklist</h2>
        <p className="text-sm text-white/40 mb-4">Complete each step to get your personalized filing guide.</p>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <ChecklistStep
            step={1}
            title="Complete AI assessment"
            subtitle={assessmentDone ? 'Assessment complete' : 'Chat with your AI CPA to map your situation'}
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
            subtitle={hasCalculation ? 'Tax calculated — review your T1 summary' : 'Available after uploading slips'}
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
      </GlassCard>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Quick actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#10B981] px-4 py-3 text-sm font-semibold text-white hover:bg-[#059669] transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            {assessmentDone ? 'Continue' : 'Start assessment'}
          </Link>
          <Link
            href="/slips"
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <FileText className="h-4 w-4" />
            Add a slip
          </Link>
          <Link
            href="/calculator"
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Calculator className="h-4 w-4" />
            Calculator
          </Link>
          <Link
            href="/filing-guide"
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white/30 cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <BookOpen className="h-4 w-4" />
            Filing guide
          </Link>
        </div>
      </div>
    </div>
  );
}
