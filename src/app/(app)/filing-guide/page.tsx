'use client';

/**
 * Filing Guide — personalized, step-by-step T1 filing instructions.
 *
 * Calls /api/filing-guide with the user's profile + calculation result,
 * which in turn calls Claude to generate a structured FilingGuide.
 * Each step has a checkbox, form reference, CRA line number, and the exact
 * value to enter.
 *
 * TODO: replace DEMO_* with Supabase data; cache generated guide per (userId, taxYear).
 */

import { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckSquare,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Square,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { FilingGuide, TaxCalculationResult } from '@/lib/tax-engine/types';
import { getFilingGuide, saveFilingGuide } from '@/lib/supabase/tax-data';
import { addCsrfHeader } from '@/lib/csrf-client';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FilingGuidePage() {
  const [calcResult, setCalcResult] = useState<TaxCalculationResult | null>(null);
  const [guide, setGuide] = useState<FilingGuide | null>(null);
  const [generating, setGenerating] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [guideGeneratedAt, setGuideGeneratedAt] = useState<Date | null>(null);

  useEffect(() => { document.title = 'Filing Guide — TaxAgent.ai'; }, []);

  // Get real user name from auth + load calc result + cached guide
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? '';
      setUserId(uid);
      if (data.user) {
        const name = (data.user.user_metadata?.full_name as string | undefined)
          ?? data.user.email?.split('@')[0]
          ?? 'You';
        setUserName(name);
      }

      // Load calculation result
      const raw = localStorage.getItem('taxagent_calc_result');
      if (raw) {
        try { setCalcResult(JSON.parse(raw) as TaxCalculationResult); } catch { /* ignore */ }
      }

      // Load cached filing guide from Supabase
      if (uid) {
        const cached = await getFilingGuide(uid, 2025);
        if (cached) {
          setGuide(cached);
          setGuideGeneratedAt(new Date());
        }
      }
    }
    init().catch(() => { /* ignore */ });
  }, []);

  // Build a minimal profile for the filing guide API using the user's real auth data.
  // Once Supabase tax_profiles table exists, replace this with a DB query.
  const profile = {
    legalName: userName || 'Taxpayer',
    taxYear: 2025,
    province: 'ON' as const,
    residencyStatus: 'citizen' as const,
    maritalStatus: 'single' as const,
    dependants: [] as never[],
  };

  async function generateGuide() {
    if (!calcResult) return;
    setGenerating(true);
    setError(null);
    setGuide(null);
    setChecked(new Set());
    try {
      const res = await fetch('/api/filing-guide', addCsrfHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, result: calcResult }),
      }));
      if (!res.ok) throw new Error('Guide generation failed');
      const generated = await res.json() as FilingGuide;
      setGuide(generated);
      setGuideGeneratedAt(new Date());
      // Cache in Supabase
      if (userId) {
        saveFilingGuide(userId, 2025, generated).catch(() => { /* ignore */ });
      }
    } catch {
      setError('Could not generate your filing guide. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function toggleStep(n: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  const totalSteps = guide?.steps.length ?? 0;
  const completedSteps = checked.size;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#10B981]" />
            Filing Guide
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Personalized T1 instructions for {profile.legalName} · 2025 tax year
          </p>
        </div>
        {guide && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={generateGuide}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors disabled:opacity-40"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── Pre-generate: no calc yet ─────────────────────────────── */}
      {!guide && !generating && !calcResult && (
        <div
          className="flex flex-col items-center gap-5 rounded-2xl px-6 py-12 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}
        >
          <BookOpen className="h-10 w-10 text-white/20" />
          <div className="space-y-1">
            <p className="font-semibold text-white/70">Complete your assessment first</p>
            <p className="text-sm text-white/40 max-w-xs">
              We need your tax data to generate a personalized filing guide.
            </p>
          </div>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-full bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors"
          >
            Start assessment
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* ── Ready to generate ─────────────────────────────────────── */}
      {!guide && !generating && calcResult && (
        <div
          className="flex flex-col items-center gap-5 rounded-2xl px-6 py-12 text-center"
          style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <BookOpen className="h-10 w-10 text-[#10B981]/60" />
          <div className="space-y-1">
            <p className="font-semibold text-white/80">Generate your personalized filing guide</p>
            <p className="text-sm text-white/40 max-w-xs">
              Claude will read your tax data and write step-by-step instructions with exact form references and dollar amounts.
            </p>
          </div>
          <button
            onClick={generateGuide}
            disabled={calcLoading}
            className="inline-flex items-center gap-2 rounded-full bg-[#10B981] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors disabled:opacity-40"
          >
            {calcLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            {calcLoading ? 'Preparing…' : 'Generate My Filing Guide'}
          </button>
          <p className="text-xs text-white/30">
            Based on your{' '}
            <span className="font-medium text-white/50">
              {calcResult.balanceOwing < 0
                ? `${formatCad(Math.abs(calcResult.balanceOwing))} refund`
                : `${formatCad(calcResult.balanceOwing)} balance owing`}
            </span>{' '}
            calculation
          </p>
        </div>
      )}

      {/* ── Generating spinner ─────────────────────────────────────── */}
      {generating && (
        <div
          className="flex flex-col items-center gap-4 rounded-2xl px-6 py-12"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Loader2 className="h-8 w-8 text-[#10B981] animate-spin" />
          <p className="text-sm font-medium text-white/70">Generating your personalized guide…</p>
          <p className="text-xs text-white/30">Claude is reading your tax data</p>
        </div>
      )}

      {/* ── Guide ─────────────────────────────────────────────────── */}
      {guide && !generating && (
        <>
          {/* Profile summary */}
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <p className="text-sm text-white/80 leading-relaxed">{guide.profileSummary}</p>
          </div>

          {/* Required forms */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4" />
              Required Forms
            </p>
            <div className="flex flex-wrap gap-2">
              {guide.requiredForms.map((form) => (
                <span
                  key={form}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-[#10B981]"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  {form}
                </span>
              ))}
            </div>
          </div>

          {/* Steps progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50 font-medium">
                {completedSteps} of {totalSteps} steps complete
              </span>
              <span className="text-white/30 tabular-nums">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full bg-[#10B981] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {guide.steps.map((step) => {
              const done = checked.has(step.stepNumber);
              return (
                <div
                  key={step.stepNumber}
                  className="rounded-2xl px-5 py-4 transition-colors"
                  style={{
                    background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)',
                    border: done ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleStep(step.stepNumber)}
                      className="shrink-0 mt-0.5 focus-visible:outline-none"
                      aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {done
                        ? <CheckSquare className="h-5 w-5 text-[#10B981]" />
                        : <Square className="h-5 w-5 text-white/25" />}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${done ? 'line-through text-white/30' : 'text-white/80'}`}>
                          {step.stepNumber}. {step.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {step.formReference && (
                            <span className="text-[10px] font-semibold text-white/40 bg-white/8 rounded px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              {step.formReference}
                            </span>
                          )}
                          {step.lineReference && (
                            <span className="text-[10px] font-semibold text-white/40 rounded px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              L{step.lineReference}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm ${done ? 'text-white/30' : 'text-white/55'}`}>
                        {step.description}
                      </p>
                      {step.value !== undefined && step.value !== 0 && (
                        <div
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                          style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.2)' }}
                        >
                          <span className="text-xs text-white/40">Enter:</span>
                          <span className="text-sm font-bold text-[#10B981] tabular-nums">
                            {formatCad(step.value)}
                          </span>
                        </div>
                      )}
                      {step.tip && (
                        <p className="text-xs text-white/30 italic">{step.tip}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CRA My Account link */}
          <div
            className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <div>
              <p className="text-sm font-semibold text-blue-300">Ready to file?</p>
              <p className="text-xs text-blue-400/70 mt-0.5">
                Log in to CRA My Account to file your return, view carryforwards, and sign up for direct deposit.
              </p>
            </div>
            <a
              href="https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              CRA My Account
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Documents to keep */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-sm font-semibold text-white/60 mb-3">Documents to Keep (6 years)</p>
            <div className="space-y-1.5">
              {guide.documentsToKeep.map((doc, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-white/50">
                  <ChevronRight className="h-3.5 w-3.5 text-white/25 shrink-0 mt-0.5" />
                  {doc}
                </div>
              ))}
            </div>
          </div>

          {/* Important dates */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-sm font-semibold text-white/60 mb-3">Important Dates</p>
            <div className="space-y-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {guide.importantDates.map((d, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-xs font-semibold text-[#10B981] tabular-nums shrink-0 w-28">
                    {d.date}
                  </span>
                  <span className="text-sm text-white/50">{d.description}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/25 text-center">
            This guide is generated by AI based on your 2025 tax data. It is for informational
            purposes only. Always review your return before filing.
          </p>
        </>
      )}
    </main>
  );
}
