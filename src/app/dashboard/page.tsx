'use client';

/**
 * Dashboard — overview of the user's tax situation.
 * Shows profile summary, slip inventory, calculation status, and action shortcuts.
 *
 * TODO: replace DEMO_* constants with Supabase queries keyed by session userId.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  FileText,
  MessageSquare,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  DEMO_BUSINESS,
  DEMO_DEDUCTIONS,
  DEMO_PROFILE,
  DEMO_RENTAL,
  DEMO_SLIPS,
} from '@/lib/demo-data';
import type { TaxCalculationResult } from '@/lib/tax-engine/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCad(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, '-');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'green' | 'red' | 'neutral';
}) {
  const valueClass =
    highlight === 'green'
      ? 'text-emerald-600'
      : highlight === 'red'
        ? 'text-red-600'
        : 'text-[#1A2744]';

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StatusRow({
  label,
  done,
  href,
  cta,
}: {
  label: string;
  done: boolean;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-slate-300 shrink-0" />
      )}
      <span className={`flex-1 text-sm ${done ? 'text-slate-700' : 'text-slate-400'}`}>
        {label}
      </span>
      {!done && (
        <Link href={href}>
          <Button variant="outline" size="sm" className="text-xs h-7 px-3">
            {cta}
          </Button>
        </Link>
      )}
      {done && (
        <Link href={href}>
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-slate-400">
            Edit <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </Link>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: replace DEMO_* with real data from Supabase (tax_profiles, tax_slips tables)
  const profile = DEMO_PROFILE;
  const slips = DEMO_SLIPS;

  useEffect(() => {
    async function runCalc() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: DEMO_PROFILE,
            slips: DEMO_SLIPS,
            business: DEMO_BUSINESS,
            rental: DEMO_RENTAL,
            deductions: DEMO_DEDUCTIONS,
          }),
        });
        if (!res.ok) throw new Error('Calculation failed');
        setResult(await res.json());
      } catch {
        setError('Could not compute tax estimate. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    }
    runCalc();
  }, []);

  const slipCount = slips.length;
  const hasSlips = slipCount > 0;
  const assessmentComplete = profile.assessmentComplete;
  const calculationReady = assessmentComplete && hasSlips;

  const warnings: string[] = [];
  if (!assessmentComplete) warnings.push('Your tax assessment is incomplete. Complete the chat assessment to ensure all income sources are captured.');
  if (!hasSlips) warnings.push('No slips entered yet. Add your T4, T5, and other slips to get an accurate calculation.');
  if (result?.warnings?.length) {
    result.warnings.forEach((w) => warnings.push(w.message));
  }

  const progressSteps = [assessmentComplete, hasSlips, !!result].filter(Boolean).length;
  const progressPct = Math.round((progressSteps / 3) * 100);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A2744]">
            Welcome back, {profile.legalName.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            2025 Ontario Tax Return · Filing deadline April 30, 2026
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-[#1A2744]/10 text-[#1A2744] font-semibold text-xs shrink-0"
        >
          Tax Year 2025
        </Badge>
      </div>

      {/* ── Warning banners ────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((msg, i) => (
            <Alert key={i} className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">{msg}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* ── Metrics ───────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['Total Income', 'Estimated Tax', 'Refund / Balance'].map((label) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                <div className="h-8 w-28 bg-slate-100 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {result && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Total Income"
            value={formatCad(result.totalIncome)}
            sub="Line 15000"
          />
          <MetricCard
            label="Estimated Tax"
            value={formatCad(result.totalTaxPayable)}
            sub={`${(result.averageTaxRate * 100).toFixed(1)}% avg · ${(result.combinedMarginalRate * 100).toFixed(1)}% marginal`}
          />
          <MetricCard
            label={result.balanceOwing < 0 ? 'Estimated Refund' : 'Balance Owing'}
            value={formatCad(Math.abs(result.balanceOwing))}
            sub={result.balanceOwing < 0 ? 'Estimated — file to claim' : 'Due April 30, 2026'}
            highlight={result.balanceOwing < 0 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* ── Progress ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-700 font-semibold">Filing Progress</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={progressPct} className="h-2 flex-1" />
            <span className="text-xs text-slate-400 tabular-nums w-8 text-right">
              {progressPct}%
            </span>
          </div>
          <Separator />
          <StatusRow
            label="Tax assessment complete"
            done={assessmentComplete}
            href="/onboarding"
            cta="Start Assessment"
          />
          <Separator className="my-0" />
          <StatusRow
            label={`${slipCount} slip${slipCount !== 1 ? 's' : ''} entered`}
            done={hasSlips}
            href="/slips"
            cta="Add Slips"
          />
          <Separator className="my-0" />
          <StatusRow
            label="Tax calculated"
            done={!!result}
            href="/calculator"
            cta="Calculate"
          />
        </CardContent>
      </Card>

      {/* ── Profile summary ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-700 font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-slate-400 text-xs">Name</dt>
              <dd className="font-medium text-slate-800">{profile.legalName}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs">Status</dt>
              <dd className="font-medium text-slate-800">{capitalize(profile.maritalStatus)}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs">Province</dt>
              <dd className="font-medium text-slate-800">Ontario</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs">Residency</dt>
              <dd className="font-medium text-slate-800">{capitalize(profile.residencyStatus)}</dd>
            </div>
            {result && (
              <>
                <div>
                  <dt className="text-slate-400 text-xs">Marginal Rate</dt>
                  <dd className="font-medium text-slate-800">
                    {(result.combinedMarginalRate * 100).toFixed(2)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs">Est. OTB (2026)</dt>
                  <dd className="font-medium text-slate-800">{formatCad(result.estimatedOTB)}/yr</dd>
                </div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* ── Action buttons ────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/onboarding" className="contents">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2 text-[#1A2744] border-[#1A2744]/20 hover:bg-[#1A2744]/5"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs font-medium">Assessment</span>
            </Button>
          </Link>
          <Link href="/slips" className="contents">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2 text-[#1A2744] border-[#1A2744]/20 hover:bg-[#1A2744]/5"
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs font-medium">Add Slips</span>
            </Button>
          </Link>
          <Link href="/calculator" className="contents">
            <Button
              variant={calculationReady ? 'default' : 'outline'}
              className={`flex flex-col h-auto py-4 gap-2 ${
                calculationReady
                  ? 'bg-[#1A2744] hover:bg-[#1A2744]/90 text-white'
                  : 'text-[#1A2744] border-[#1A2744]/20 hover:bg-[#1A2744]/5'
              }`}
            >
              <Calculator className="h-5 w-5" />
              <span className="text-xs font-medium">Calculate</span>
            </Button>
          </Link>
          <Link href="/filing-guide" className="contents">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2 text-[#1A2744] border-[#1A2744]/20 hover:bg-[#1A2744]/5"
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-medium">Filing Guide</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Slip inventory ────────────────────────────────────────── */}
      {hasSlips && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-slate-700 font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Slips on File
              </CardTitle>
              <Link href="/slips">
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-slate-400">
                  Manage <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-slate-100">
            {slips.map((slip, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Badge
                  variant="secondary"
                  className="bg-[#1A2744]/10 text-[#1A2744] font-semibold text-xs shrink-0"
                >
                  {slip.type}
                </Badge>
                <span className="text-sm text-slate-600 truncate">
                  {'data' in slip &&
                  'issuerName' in (slip.data as unknown as Record<string, unknown>)
                    ? String((slip.data as unknown as Record<string, unknown>).issuerName)
                    : slip.type}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Refresh hint ─────────────────────────────────────────── */}
      <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
        <RefreshCw className="h-3 w-3" />
        Estimates update when you add or edit slips.
      </p>
    </main>
  );
}
