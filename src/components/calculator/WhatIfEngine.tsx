'use client';

/**
 * WhatIfEngine — real-time tax savings estimator.
 *
 * Uses marginal rates from the engine result for RRSP estimates and the
 * federal/Ontario donation credit tiering for donation estimates.
 * No API call needed — all math is local.
 */

import { useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { TaxCalculationResult, DeductionsCreditsInput } from '@/lib/tax-engine/types';

interface Props {
  result: TaxCalculationResult;
  deductions: DeductionsCreditsInput;
}

function formatCad(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}

/**
 * Donation credit = federal portion + Ontario portion.
 * Federal: first $200 at 15%, over $200 at 29%.
 * Ontario: first $200 at 5.05%, over $200 at 11.16%.
 * — ITA s.118.1; Ontario Taxation Act s.8.4
 */
function calcDonationCredit(total: number): number {
  const fed =
    total <= 200 ? total * 0.15 : 200 * 0.15 + (total - 200) * 0.29;
  const on =
    total <= 200 ? total * 0.0505 : 200 * 0.0505 + (total - 200) * 0.1116;
  return Math.round((fed + on) * 100) / 100;
}

export function WhatIfEngine({ result, deductions }: Props) {
  const currentRrspContributed = deductions.rrspContributions;
  const maxAdditionalRrsp = Math.max(
    0,
    Math.min(30_000, deductions.rrspContributionRoom - currentRrspContributed),
  );
  const currentDonations = deductions.donations.reduce((s, d) => s + d.amount, 0);

  const [rrspDelta, setRrspDelta] = useState(0);
  const [donationDelta, setDonationDelta] = useState(0);

  // RRSP reduces taxable income → savings ≈ delta × combined marginal rate
  const rrspSavings = Math.round(rrspDelta * result.combinedMarginalRate * 100) / 100;

  // Donation credit delta — exact per-tier calculation
  const donationSavings = Math.max(
    0,
    calcDonationCredit(currentDonations + donationDelta) - calcDonationCredit(currentDonations),
  );

  const totalSavings = Math.round((rrspSavings + donationSavings) * 100) / 100;
  const newBalance = Math.round((result.balanceOwing - totalSavings) * 100) / 100;
  const isActive = rrspDelta > 0 || donationDelta > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-[#1A2744] flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-emerald-600" />
          What-If Engine
        </CardTitle>
        <p className="text-xs text-slate-500">
          Adjust contributions to see real-time tax savings. Uses your actual marginal rate.
        </p>
      </CardHeader>

      <CardContent className="space-y-5 pt-2">
        {/* ── RRSP slider ────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <label className="text-sm font-medium text-slate-700">
              Additional RRSP Contribution
            </label>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatCad(rrspDelta)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(1, maxAdditionalRrsp)}
            step={100}
            value={rrspDelta}
            disabled={maxAdditionalRrsp === 0}
            onChange={(e) => setRrspDelta(Number(e.target.value))}
            className="w-full h-2 accent-[#1A2744] disabled:opacity-40"
          />

          <div className="flex justify-between text-xs text-slate-400">
            <span>$0</span>
            <span>
              {maxAdditionalRrsp > 0
                ? `${formatCad(maxAdditionalRrsp)} available room`
                : 'RRSP room fully used'}
            </span>
          </div>

          {rrspDelta > 0 && (
            <p className="text-sm text-emerald-700 font-medium">
              → Saves{' '}
              <span className="font-bold">{formatCad(rrspSavings)}</span> in taxes
              <span className="text-xs text-slate-400 font-normal ml-1">
                ({(result.combinedMarginalRate * 100).toFixed(1)}% marginal rate)
              </span>
            </p>
          )}
        </div>

        <Separator />

        {/* ── Donations slider ───────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <label className="text-sm font-medium text-slate-700">
              Additional Charitable Donations
            </label>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatCad(donationDelta)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={donationDelta}
            onChange={(e) => setDonationDelta(Number(e.target.value))}
            className="w-full h-2 accent-[#1A2744]"
          />

          <div className="flex justify-between text-xs text-slate-400">
            <span>$0</span>
            <span>$5,000</span>
          </div>

          {donationDelta > 0 && (
            <p className="text-sm text-emerald-700 font-medium">
              → Generates{' '}
              <span className="font-bold">{formatCad(donationSavings)}</span> in credits
              <span className="text-xs text-slate-400 font-normal ml-1">
                (federal + Ontario tiered donation credit)
              </span>
            </p>
          )}
        </div>

        {/* ── Summary ────────────────────────────────────────────────── */}
        {isActive && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-1.5">
            <p className="text-sm font-semibold text-emerald-800">
              Total estimated savings:{' '}
              <span className="tabular-nums">{formatCad(totalSavings)}</span>
            </p>
            <p className="text-sm text-emerald-700">
              New outcome:{' '}
              <span
                className={`font-bold tabular-nums ${
                  newBalance < 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {newBalance < 0
                  ? `${formatCad(Math.abs(newBalance))} refund`
                  : `${formatCad(newBalance)} owing`}
              </span>
            </p>
            <p className="text-xs text-slate-400 pt-0.5">
              RRSP deadline: March 3, 2026 · Donations claimed on 2025 return
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
