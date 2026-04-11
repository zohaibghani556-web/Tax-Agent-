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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import type { FilingGuide, TaxCalculationResult } from '@/lib/tax-engine/types';
import { getFilingGuide, saveFilingGuide } from '@/lib/supabase/tax-data';

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
      const res = await fetch('/api/filing-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, result: calcResult }),
      });
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
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Filing Guide
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Personalized T1 instructions for {profile.legalName} · 2025 tax year
          </p>
        </div>
        {guide && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={generateGuide}
              disabled={generating}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Pre-generate state ────────────────────────────────────── */}
      {!guide && !generating && !calcResult && (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-5 text-center">
            <BookOpen className="h-10 w-10 text-slate-300" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-700">Complete your assessment first</p>
              <p className="text-sm text-slate-400 max-w-xs">
                We need your tax data to generate a personalized filing guide. Complete your
                assessment to get started.
              </p>
            </div>
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-full bg-[#1A2744] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A2744]/90 transition-colors"
            >
              Start assessment
              <ChevronRight className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      )}

      {/* ── Ready to generate ─────────────────────────────────────── */}
      {!guide && !generating && calcResult && (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-5 text-center">
            <BookOpen className="h-10 w-10 text-slate-300" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-700">
                Generate your personalized filing guide
              </p>
              <p className="text-sm text-slate-400 max-w-xs">
                Claude will read your tax data and write step-by-step instructions with exact
                form references and dollar amounts.
              </p>
            </div>
            <Button
              onClick={generateGuide}
              disabled={calcLoading}
              className="bg-[#1A2744] hover:bg-[#1A2744]/90 gap-2"
            >
              {calcLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing…
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  Generate My Filing Guide
                </>
              )}
            </Button>
            <p className="text-xs text-slate-400">
              Based on your{' '}
              <span className="font-medium">
                {calcResult.balanceOwing < 0
                  ? `${formatCad(Math.abs(calcResult.balanceOwing))} refund`
                  : `${formatCad(calcResult.balanceOwing)} balance owing`}
              </span>{' '}
              calculation
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Generating spinner ─────────────────────────────────────── */}
      {generating && (
        <Card>
          <CardContent className="pt-12 pb-12 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 text-[#1A2744] animate-spin" />
            <p className="text-sm font-medium text-slate-600">
              Generating your personalized guide…
            </p>
            <p className="text-xs text-slate-400">Claude is reading your tax data</p>
          </CardContent>
        </Card>
      )}

      {/* ── Guide ─────────────────────────────────────────────────── */}
      {guide && !generating && (
        <>
          {/* Profile summary */}
          <Card className="bg-[#1A2744] text-white">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm leading-relaxed">{guide.profileSummary}</p>
            </CardContent>
          </Card>

          {/* Required forms */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700 font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Required Forms
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex flex-wrap gap-2">
              {guide.requiredForms.map((form) => (
                <Badge
                  key={form}
                  variant="secondary"
                  className="bg-[#1A2744]/10 text-[#1A2744] font-medium"
                >
                  {form}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {/* Steps progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">
                {completedSteps} of {totalSteps} steps complete
              </span>
              <span className="text-slate-400">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {guide.steps.map((step) => {
              const done = checked.has(step.stepNumber);
              return (
                <Card
                  key={step.stepNumber}
                  className={`transition-colors ${done ? 'bg-emerald-50 border-emerald-200' : ''}`}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleStep(step.stepNumber)}
                        className="shrink-0 mt-0.5 focus-visible:outline-none"
                        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {done ? (
                          <CheckSquare className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-300" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Step header */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p
                            className={`text-sm font-semibold ${
                              done ? 'line-through text-slate-400' : 'text-[#1A2744]'
                            }`}
                          >
                            {step.stepNumber}. {step.title}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {step.formReference && (
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 text-slate-600 font-normal text-xs"
                              >
                                {step.formReference}
                              </Badge>
                            )}
                            {step.lineReference && (
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 text-slate-600 font-normal text-xs"
                              >
                                L{step.lineReference}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p
                          className={`text-sm ${
                            done ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {step.description}
                        </p>

                        {/* Value to enter */}
                        {step.value !== undefined && step.value !== 0 && (
                          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#1A2744]/5 border border-[#1A2744]/10 px-3 py-1.5">
                            <span className="text-xs text-slate-500">Enter:</span>
                            <span className="text-sm font-bold text-[#1A2744] tabular-nums">
                              {formatCad(step.value)}
                            </span>
                          </div>
                        )}

                        {/* Tip */}
                        {step.tip && (
                          <p className="text-xs text-slate-400 italic">{step.tip}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CRA My Account link */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-800">Ready to file?</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Log in to CRA My Account to file your return, view carryforwards, and
                  sign up for direct deposit.
                </p>
              </div>
              <a
                href="https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button size="sm" className="bg-blue-700 hover:bg-blue-800 gap-1.5 text-white">
                  CRA My Account
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Documents to keep */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700 font-semibold">
                Documents to Keep (6 years)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              {guide.documentsToKeep.map((doc, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  {doc}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Important dates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700 font-semibold">
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-slate-100">
              {guide.importantDates.map((d, i) => (
                <div key={i} className="flex items-start gap-4 py-2.5">
                  <span className="text-xs font-semibold text-[#1A2744] tabular-nums shrink-0 w-28">
                    {d.date}
                  </span>
                  <span className="text-sm text-slate-600">{d.description}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          <p className="text-xs text-slate-400 text-center">
            This guide is generated by AI based on your 2025 tax data. It is for informational
            purposes only. Always review your return before filing.
          </p>
        </>
      )}
    </main>
  );
}
