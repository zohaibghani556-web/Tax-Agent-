'use client';

/**
 * Calculator — full T1 General summary view.
 *
 * Calls /api/calculate with the user's data, then renders a CRA-mirrored
 * breakdown with expandable sections, color-coded balance, What-If Engine,
 * and Credit Finder.
 *
 * TODO: replace DEMO_* with data loaded from Supabase (tax_profiles, tax_slips).
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Download, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCad(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

// ── Expandable section ────────────────────────────────────────────────────────

interface LineItem {
  label: string;
  line?: number;
  amount: number;
  indent?: boolean;
  faint?: boolean;
}

function Section({
  title,
  total,
  totalLabel,
  totalLine,
  lines,
  defaultOpen = false,
}: {
  title: string;
  total: number;
  totalLabel: string;
  totalLine?: number;
  lines: LineItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors focus-visible:outline-none"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-[#1A2744]">{title}</span>
          {!open && (
            <span className="text-sm tabular-nums text-slate-500">{formatCad(total)}</span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <>
          <Separator />
          <CardContent className="pt-0 pb-0">
            {lines.map((item, i) => (
              <div
                key={i}
                className={`flex items-baseline justify-between py-2.5 border-b border-slate-100 last:border-0 ${
                  item.indent ? 'pl-4' : ''
                }`}
              >
                <div className="flex items-baseline gap-2 min-w-0">
                  {item.line && (
                    <span className="text-xs text-slate-400 tabular-nums shrink-0 w-12">
                      L{item.line}
                    </span>
                  )}
                  <span
                    className={`text-sm ${
                      item.faint ? 'text-slate-400' : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                <span
                  className={`text-sm tabular-nums shrink-0 ml-4 ${
                    item.faint ? 'text-slate-400' : 'text-slate-700'
                  }`}
                >
                  {formatCad(item.amount)}
                </span>
              </div>
            ))}
          </CardContent>
          <Separator />
          <div className="flex items-baseline justify-between px-5 py-3 bg-slate-50">
            <div className="flex items-baseline gap-2">
              {totalLine && (
                <span className="text-xs text-slate-500 tabular-nums w-12">L{totalLine}</span>
              )}
              <span className="text-sm font-semibold text-[#1A2744]">{totalLabel}</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-[#1A2744]">
              {formatCad(total)}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedAt, setCalculatedAt] = useState<Date | null>(null);

  // TODO: replace DEMO_* with real data from Supabase
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
          profile: DEMO_PROFILE,
          slips: DEMO_SLIPS,
          business: DEMO_BUSINESS,
          rental: DEMO_RENTAL,
          deductions: DEMO_DEDUCTIONS,
        }),
      });
      if (!res.ok) throw new Error('Calculation failed');
      setResult(await res.json());
      setCalculatedAt(new Date());
    } catch {
      setError('Calculation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Calculate on first load
  useEffect(() => { runCalc(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isRefund = result && result.balanceOwing < 0;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6 print:py-4 print:space-y-4">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#1A2744]">Tax Calculator</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            2025 Ontario T1 Summary · {profile.legalName}
          </p>
          {calculatedAt && (
            <p className="text-xs text-slate-400 mt-1">
              Last calculated {calculatedAt.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={runCalc}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Calculating…' : 'Recalculate'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && (
        <Alert className="border-red-200 bg-red-50 print:hidden">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Warnings from engine ───────────────────────────────────── */}
      {result?.warnings?.length ? (
        <div className="space-y-2">
          {result.warnings.map((w, i) => (
            <Alert
              key={i}
              className={
                w.severity === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
              }
            >
              <AlertTriangle
                className={`h-4 w-4 ${
                  w.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                }`}
              />
              <AlertDescription
                className={`text-sm ${
                  w.severity === 'error' ? 'text-red-700' : 'text-amber-800'
                }`}
              >
                {w.message}
                {w.action && (
                  <span className="block mt-0.5 font-medium">{w.action}</span>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      ) : null}

      {/* ── Loading skeleton ──────────────────────────────────────── */}
      {loading && !result && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {/* ── T1 Sections ───────────────────────────────────────────── */}
      {result && (
        <>
          {/* Income */}
          <Section
            title="Income"
            total={result.totalIncome}
            totalLabel="Total Income"
            totalLine={15000}
            defaultOpen
            lines={[
              {
                label: 'Employment income',
                line: result.lineByLine[10100] !== undefined ? 10100 : undefined,
                amount: result.lineByLine[10100] ?? 0,
              },
              {
                label: 'Interest and investment income',
                line: result.lineByLine[12100] !== undefined ? 12100 : undefined,
                amount: result.lineByLine[12100] ?? 0,
              },
              {
                label: 'Taxable eligible dividends',
                line: result.lineByLine[12000] !== undefined ? 12000 : undefined,
                amount: result.lineByLine[12000] ?? 0,
              },
              {
                label: 'Other taxable dividends',
                line: result.lineByLine[12010] !== undefined ? 12010 : undefined,
                amount: result.lineByLine[12010] ?? 0,
              },
            ].filter((l) => l.amount !== 0)}
          />

          {/* Deductions */}
          <Section
            title="Deductions"
            total={result.totalIncome - result.netIncome}
            totalLabel="Total Deductions"
            lines={[
              {
                label: 'RRSP/PRPP deduction',
                line: result.lineByLine[20800] !== undefined ? 20800 : undefined,
                amount: result.lineByLine[20800] ?? deductions.rrspContributions,
              },
              {
                label: 'Union, professional dues',
                amount: deductions.unionDues,
                faint: deductions.unionDues === 0,
              },
              {
                label: 'Child care expenses',
                amount: deductions.childcareExpenses,
                faint: deductions.childcareExpenses === 0,
              },
              {
                label: 'Moving expenses',
                amount: deductions.movingExpenses,
                faint: deductions.movingExpenses === 0,
              },
              {
                label: 'Carrying charges',
                amount: deductions.carryingCharges,
                faint: deductions.carryingCharges === 0,
              },
            ].filter((l) => !l.faint || l.amount !== 0)}
          />

          {/* Net Income */}
          <Card className="bg-slate-50">
            <CardContent className="pt-4 pb-4 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400 mr-2">L23600</span>
                <span className="font-semibold text-sm text-[#1A2744]">Net Income</span>
              </div>
              <span className="font-bold tabular-nums text-[#1A2744]">
                {formatCad(result.netIncome)}
              </span>
            </CardContent>
          </Card>

          {/* Taxable Income */}
          <Card className="bg-slate-50">
            <CardContent className="pt-4 pb-4 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400 mr-2">L26000</span>
                <span className="font-semibold text-sm text-[#1A2744]">Taxable Income</span>
              </div>
              <span className="font-bold tabular-nums text-[#1A2744]">
                {formatCad(result.taxableIncome)}
              </span>
            </CardContent>
          </Card>

          {/* Federal Tax */}
          <Section
            title="Federal Tax (Schedule 1)"
            total={result.netFederalTax}
            totalLabel="Net Federal Tax"
            lines={[
              { label: 'Federal tax on income', amount: result.federalTaxOnIncome },
              {
                label: 'Less: non-refundable credits',
                amount: -result.federalNonRefundableCredits,
                indent: true,
              },
              {
                label: 'Less: dividend tax credit',
                amount: -result.federalDividendTaxCredit,
                indent: true,
                faint: result.federalDividendTaxCredit === 0,
              },
              {
                label: 'Less: top-up credit (2025)',
                amount: -result.topUpTaxCredit,
                indent: true,
                faint: result.topUpTaxCredit === 0,
              },
            ].filter((l) => !l.faint || l.amount !== 0)}
          />

          {/* Ontario Tax */}
          <Section
            title="Ontario Tax (ON428 + ON-BEN)"
            total={result.netOntarioTax}
            totalLabel="Net Ontario Tax"
            lines={[
              { label: 'Ontario tax on income', amount: result.ontarioTaxOnIncome },
              {
                label: 'Less: non-refundable credits',
                amount: -result.ontarioNonRefundableCredits,
                indent: true,
              },
              {
                label: 'Less: dividend tax credit',
                amount: -result.ontarioDividendTaxCredit,
                indent: true,
                faint: result.ontarioDividendTaxCredit === 0,
              },
              {
                label: 'Less: low-income reduction',
                amount: -result.ontarioLowIncomeReduction,
                indent: true,
                faint: result.ontarioLowIncomeReduction === 0,
              },
              {
                label: 'Ontario surtax',
                amount: result.ontarioSurtax,
                faint: result.ontarioSurtax === 0,
              },
              { label: 'Ontario Health Premium', amount: result.ontarioHealthPremium },
            ].filter((l) => !l.faint || l.amount !== 0)}
          />

          {/* Benefits */}
          {result.estimatedOTB > 0 && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-4 pb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Ontario Trillium Benefit (ON-BEN)
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Estimated annual benefit, paid monthly starting July 2026
                  </p>
                </div>
                <span className="font-bold tabular-nums text-emerald-700 text-sm shrink-0">
                  {formatCad(result.estimatedOTB)} / yr
                </span>
              </CardContent>
            </Card>
          )}

          {/* Bottom Line ─────────────────────────────────────────── */}
          <Card
            className={`border-2 ${
              isRefund ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
            }`}
          >
            <CardContent className="pt-5 pb-5 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-600">Total tax payable</span>
                <span className="tabular-nums text-sm font-medium text-slate-700">
                  {formatCad(result.totalTaxPayable)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-600">Total tax deducted at source</span>
                <span className="tabular-nums text-sm font-medium text-slate-700">
                  {formatCad(result.totalTaxDeducted)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-base font-bold ${
                      isRefund ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {isRefund ? 'Estimated Refund' : 'Balance Owing'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRefund
                      ? 'File your return to receive your refund.'
                      : 'Due April 30, 2026. Pay at CRA My Account or your bank.'}
                  </p>
                </div>
                <span
                  className={`text-3xl font-black tabular-nums ${
                    isRefund ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatCad(Math.abs(result.balanceOwing))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Rates summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              {
                label: 'Marginal Rate',
                value: pct(result.combinedMarginalRate),
                sub: `${pct(result.marginalFederalRate)} fed + ${pct(result.marginalOntarioRate)} ON`,
              },
              { label: 'Average Rate', value: pct(result.averageTaxRate), sub: 'of taxable income' },
              {
                label: 'Federal Rate',
                value: pct(result.marginalFederalRate),
                sub: '2025 blended bracket',
              },
            ].map((r) => (
              <Card key={r.label}>
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs text-slate-400">{r.label}</p>
                  <p className="text-lg font-bold text-[#1A2744] tabular-nums">{r.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── What-If Engine ────────────────────────────────────── */}
          <div className="print:hidden">
            <WhatIfEngine result={result} deductions={deductions} />
          </div>

          {/* ── Credit Finder ─────────────────────────────────────── */}
          <div className="print:hidden">
            <CreditFinder result={result} deductions={deductions} profile={profile} />
          </div>
        </>
      )}

      {/* ── Print footer ──────────────────────────────────────────── */}
      <p className="hidden print:block text-xs text-slate-400 text-center pt-4">
        TaxAgent.ai · 2025 Ontario T1 Estimate · {new Date().toLocaleDateString('en-CA')} · This is an
        estimate only. File your official return at canada.ca.
      </p>
    </main>
  );
}
