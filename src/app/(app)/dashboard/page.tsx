'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Calculator,
  Check,
  ChevronRight,
  Clock,
  FileText,
  MessageSquare,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { TaxCalculationResult } from '@/lib/tax-engine/types';
import { getLatestCalculation, getSlips, getCalculationHistory } from '@/lib/supabase/tax-data';
import { toast } from 'sonner';
import { TaxCalendarCard } from '@/components/dashboard/TaxCalendarCard';
import { CompletionRing } from '@/components/dashboard/CompletionRing';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCAD(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function daysUntilDeadline(): number {
  const deadline = new Date('2026-04-30T23:59:59');
  return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86_400_000));
}

function countCredits(r: TaxCalculationResult): number {
  // Count non-zero refundable credits + 2 baseline (BPA + ON-BPA always apply)
  const refundable = [
    r.canadaWorkersCredit,
    r.canadaTrainingCredit,
    r.refundableMedicalSupplement,
    r.ontarioSeniorsHomeCredit,
    r.cppEiOverdeductionRefund,
    r.estimatedOTB,
    r.estimatedGSTCredit,
  ].filter((v) => v > 0).length;
  return Math.max(2, refundable + 3); // +3 for BPA, ON-BPA, CPP/EI credit (almost always non-zero)
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

type MetricTone = 'emerald' | 'amber' | 'white';

const TONE_CLASS: Record<MetricTone, string> = {
  emerald: 'text-emerald-400',
  amber:   'text-amber-400',
  white:   'text-white',
};

function MetricCard({
  label,
  value,
  delta,
  tone = 'white',
  loading,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: MetricTone;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 backdrop-blur-xl">
      <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-2">
        {label}
      </p>
      {loading ? (
        <div
          className="h-8 w-24 rounded-lg mb-1"
          style={{ background: 'rgba(255,255,255,0.06)', animation: 'pulse 2s infinite' }}
        />
      ) : (
        <p
          className={`text-[28px] font-bold tabular-nums leading-none ${TONE_CLASS[tone]}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          {value}
        </p>
      )}
      {delta && <p className="text-[12px] text-white/45 mt-1.5">{delta}</p>}
    </div>
  );
}

// ─── ChecklistItem ────────────────────────────────────────────────────────────

function ChecklistItem({
  done,
  title,
  sub,
  href,
  action,
}: {
  done: boolean;
  title: string;
  sub: string;
  href: string;
  action?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
      {/* Done indicator */}
      <div
        className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center flex-shrink-0 ${
          done
            ? 'bg-emerald-500/20 border border-emerald-500/40'
            : 'border border-white/15'
        }`}
      >
        {done && <Check className="w-3 h-3 text-emerald-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-[14px] font-medium ${
            done ? 'text-white/50 line-through' : 'text-white'
          }`}
        >
          {title}
        </p>
        <p className="text-[12px] text-white/45 mt-0.5">{sub}</p>
      </div>

      {!done && action && (
        <Link
          href={href}
          className="text-[12px] font-semibold text-emerald-400 hover:text-emerald-300 whitespace-nowrap transition-colors"
        >
          {action} →
        </Link>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [firstName, setFirstName]             = useState('');
  const [userLoading, setUserLoading]         = useState(true);
  const [assessmentDone, setAssessmentDone]   = useState(false);
  const [hasSlips, setHasSlips]               = useState(false);
  const [slipCount, setSlipCount]             = useState(0);
  const [calcResult, setCalcResult]           = useState<TaxCalculationResult | null>(null);
  const [hasFilingGuide, setHasFilingGuide]   = useState(false);
  const [historyEntries, setHistoryEntries]   = useState<
    Array<{ id: string; createdAt: string; result: TaxCalculationResult }>
  >([]);

  useEffect(() => { document.title = 'Dashboard — TaxAgent.ai'; }, []);

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

      setAssessmentDone(!!localStorage.getItem('taxagent_assessment_done'));
      setHasFilingGuide(!!localStorage.getItem('taxagent_filing_guide_generated'));

      const localSlipsRaw = localStorage.getItem('taxagent_slips');
      let localSlipCount = 0;
      try {
        if (localSlipsRaw) {
          const parsed = JSON.parse(localSlipsRaw) as unknown[];
          localSlipCount = Array.isArray(parsed) ? parsed.length : 0;
          setSlipCount(localSlipCount);
          setHasSlips(localSlipCount > 0);
        }
      } catch { /* ignore */ }

      let localCalc: TaxCalculationResult | null = null;
      try {
        const raw = localStorage.getItem('taxagent_calc_result');
        if (raw) {
          localCalc = JSON.parse(raw) as TaxCalculationResult;
          setCalcResult(localCalc);
        }
      } catch { /* ignore */ }

      if (uid) {
        const [dbCalc, dbSlips] = await Promise.all([
          getLatestCalculation(uid, 2025),
          getSlips(uid, 2025),
        ]);

        if (dbSlips.length > localSlipCount) {
          setSlipCount(dbSlips.length);
          setHasSlips(true);
          localStorage.setItem('taxagent_slips', JSON.stringify(dbSlips));
          toast('Your slips from another device have been loaded.', { icon: '🔄', duration: 3000 });
        }

        if (dbCalc && !localCalc) {
          setCalcResult(dbCalc);
          localStorage.setItem('taxagent_calc_result', JSON.stringify(dbCalc));
          toast('Your latest calculation has been synced.', { icon: '🔄', duration: 3000 });
        }

        const history = await getCalculationHistory(uid, 2025);
        setHistoryEntries(history.slice(0, 3));
      }
    }
    init().catch(() => { setUserLoading(false); });
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────

  const hasCalculation = calcResult !== null;
  const progressSteps  = [assessmentDone, hasSlips, hasCalculation, hasFilingGuide].filter(Boolean).length;
  const progressPct    = Math.round((progressSteps / 4) * 100);
  const daysLeft       = daysUntilDeadline();

  // Refund metric
  let refundValue: string;
  let refundDelta: string;
  let refundTone: MetricTone;
  if (hasCalculation && calcResult) {
    const isRefund = calcResult.balanceOwing <= 0;
    refundValue = (isRefund ? '+' : '-') + fmtCAD(Math.abs(calcResult.balanceOwing));
    refundDelta = isRefund
      ? `Avg rate ${(calcResult.averageTaxRate * 100).toFixed(1)}%`
      : `Avg rate ${(calcResult.averageTaxRate * 100).toFixed(1)}%`;
    refundTone = isRefund ? 'emerald' : 'amber';
  } else {
    refundValue = '—';
    refundDelta = 'Complete assessment to estimate';
    refundTone = 'white';
  }

  const creditsCount = hasCalculation && calcResult ? countCredits(calcResult) : undefined;

  // Checklist items (ordered)
  const checklistItems = [
    {
      done: true,
      title: 'Account created',
      sub: 'Ontario · 2025 tax return',
      href: '/settings',
    },
    {
      done: assessmentDone,
      title: 'AI assessment',
      sub: assessmentDone
        ? 'Complete — your situation has been reviewed'
        : 'Chat with your AI CPA to understand your tax situation',
      href: '/onboarding',
      action: assessmentDone ? undefined : (assessmentDone ? 'Resume' : 'Start'),
    },
    {
      done: hasSlips,
      title: 'Upload your tax slips',
      sub: hasSlips
        ? `${slipCount} slip${slipCount !== 1 ? 's' : ''} uploaded · add more any time`
        : 'T4, T5, T2202 · photograph or drag in PDF',
      href: '/slips',
      action: hasSlips ? undefined : 'Upload',
    },
    {
      done: hasCalculation,
      title: 'Review your tax summary',
      sub: hasCalculation && calcResult
        ? `${calcResult.balanceOwing <= 0 ? fmtCAD(Math.abs(calcResult.balanceOwing)) + ' refund' : fmtCAD(calcResult.balanceOwing) + ' owing'} estimated`
        : 'See your estimated refund or balance owing',
      href: '/calculator',
      action: hasCalculation ? undefined : 'Calculate',
    },
    {
      done: hasFilingGuide,
      title: 'Get your filing guide',
      sub: hasFilingGuide
        ? 'Personalized step-by-step filing instructions ready'
        : 'AI-generated line-by-line guide for your CRA return',
      href: '/filing-guide',
      action: hasFilingGuide ? undefined : (hasCalculation ? 'Generate' : undefined),
    },
    {
      done: false,
      title: 'File with CRA',
      sub: 'NETFILE submission · deadline April 30, 2026',
      href: '#',
    },
  ];
  const doneCount = checklistItems.filter((c) => c.done).length;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">

      {/* ── Greeting row ─────────────────────────────────────────── */}
      <p className="text-[12px] text-white/40 font-mono mb-1">
        {todayLabel()} · 2025 Tax Return
      </p>
      <h1
        className="text-white font-bold text-[30px] md:text-[32px] mb-1"
        style={{ letterSpacing: '-0.02em' }}
      >
        Good {timeGreeting()},{' '}
        {userLoading ? (
          <span
            className="inline-block w-28 h-8 rounded-lg align-middle"
            style={{ background: 'rgba(255,255,255,0.06)', animation: 'pulse 2s infinite' }}
          />
        ) : (
          firstName
        )}
        .
      </h1>
      <p className="text-white/55 text-[15px] mb-8">
        Your return is{' '}
        <span className="text-emerald-400 font-semibold">{progressPct}% complete</span>.{' '}
        {progressPct < 100
          ? 'Keep going — deadline is April 30.'
          : 'Your return is ready to file.'}
      </p>

      {/* ── 3-col grid ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        {/* Col 1 — ring + CTA */}
        <div className="lg:col-span-1 rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-xl flex flex-col items-center justify-center gap-5">
          <CompletionRing
            assessmentDone={assessmentDone}
            hasSlips={hasSlips}
            hasCalculation={hasCalculation}
            hasFilingGuide={hasFilingGuide}
            ringOnly
          />
          <Link
            href="/onboarding"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[13px] px-5 py-2.5 rounded-full transition-colors shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
          >
            {assessmentDone ? 'Continue →' : 'Start assessment →'}
          </Link>
        </div>

        {/* Cols 2-3 — 2×2 metric grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-5">
          <MetricCard
            label="Estimated refund"
            value={refundValue}
            delta={refundDelta}
            tone={refundTone}
            loading={userLoading && !hasCalculation}
          />
          <MetricCard
            label="Slips uploaded"
            value={hasSlips ? String(slipCount) : '0'}
            delta={hasSlips ? `${slipCount} slip${slipCount !== 1 ? 's' : ''} on file` : 'None yet · add your T4 first'}
            tone="white"
          />
          <MetricCard
            label="Credits found"
            value={creditsCount != null ? String(creditsCount) : '—'}
            delta={creditsCount != null ? 'GST/HST, OTB, BPA + more' : 'Complete your return to see'}
            tone="white"
          />
          <MetricCard
            label="Days to deadline"
            value={String(daysLeft)}
            delta="Filing closes Apr 30"
            tone={daysLeft <= 14 ? 'amber' : 'white'}
          />
        </div>
      </div>

      {/* ── Filing checklist ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-white font-bold text-[18px]"
            style={{ letterSpacing: '-0.01em' }}
          >
            Filing checklist
          </h2>
          <span className="text-[12px] text-white/40">
            {doneCount} of {checklistItems.length} complete
          </span>
        </div>
        <div className="space-y-2">
          {checklistItems.map((item, i) => (
            <ChecklistItem key={i} {...item} />
          ))}
        </div>
      </div>

      {/* ── Recent calculations ───────────────────────────────────── */}
      {historyEntries.length > 0 && (
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/40" />
              <h2 className="text-base font-semibold text-white">Recent calculations</h2>
            </div>
            <Link href="/history" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {historyEntries.map((entry, i) => {
              const isRefund = entry.result.balanceOwing < 0;
              const amount   = Math.abs(entry.result.balanceOwing);
              const date     = new Date(entry.createdAt);
              return (
                <Link
                  key={entry.id}
                  href="/history"
                  className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-colors group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                        isRefund ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                      }`}
                    >
                      {isRefund
                        ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        : <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                      }
                    </div>
                    <div>
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          isRefund ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {isRefund ? '+' : '-'}{fmtCAD(amount)}
                      </span>
                      {i === 0 && (
                        <span className="ml-2 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 rounded-full px-1.5 py-0.5">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-white/30 tabular-nums">
                    {date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tax calendar ─────────────────────────────────────────── */}
      <div className="mb-6">
        <TaxCalendarCard />
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-[0.15em] mb-3">
          Quick actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-colors"
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
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              hasCalculation ? 'text-white/70 hover:text-white' : 'text-white/25 pointer-events-none'
            }`}
            style={{
              background: hasCalculation ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: hasCalculation ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)',
            }}
            aria-disabled={!hasCalculation}
          >
            <BookOpen className="h-4 w-4" />
            Filing guide
          </Link>
        </div>
      </div>
    </div>
  );
}
