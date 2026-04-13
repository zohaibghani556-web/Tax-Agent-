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
    <div className="rounded-2xl p-5 space-y-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-[#10B981]" />
          What-If Engine
        </h3>
        <p className="text-xs text-white/45 mt-1">
          Adjust contributions to see real-time tax savings. Uses your actual marginal rate.
        </p>
      </div>

      {/* ── RRSP slider ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <label className="text-sm font-medium text-white/70">
            Additional RRSP Contribution
          </label>
          <span className="text-sm font-semibold text-white tabular-nums">
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
          className="w-full h-2 accent-[#10B981] disabled:opacity-40"
        />

        <div className="flex justify-between text-xs text-white/35">
          <span>$0</span>
          <span>
            {maxAdditionalRrsp > 0
              ? `${formatCad(maxAdditionalRrsp)} available room`
              : 'RRSP room fully used'}
          </span>
        </div>

        {rrspDelta > 0 && (
          <p className="text-sm text-[#10B981] font-medium">
            → Saves{' '}
            <span className="font-bold">{formatCad(rrspSavings)}</span> in taxes
            <span className="text-xs text-white/35 font-normal ml-1">
              ({(result.combinedMarginalRate * 100).toFixed(1)}% marginal rate)
            </span>
          </p>
        )}
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

      {/* ── Donations slider ───────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <label className="text-sm font-medium text-white/70">
            Additional Charitable Donations
          </label>
          <span className="text-sm font-semibold text-white tabular-nums">
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
          className="w-full h-2 accent-[#10B981]"
        />

        <div className="flex justify-between text-xs text-white/35">
          <span>$0</span>
          <span>$5,000</span>
        </div>

        {donationDelta > 0 && (
          <p className="text-sm text-[#10B981] font-medium">
            → Generates{' '}
            <span className="font-bold">{formatCad(donationSavings)}</span> in credits
            <span className="text-xs text-white/35 font-normal ml-1">
              (federal + Ontario tiered donation credit)
            </span>
          </p>
        )}
      </div>

      {/* ── Summary ────────────────────────────────────────────────── */}
      {isActive && (
        <div className="rounded-xl p-4 space-y-1.5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p className="text-sm font-semibold text-[#10B981]">
            Total estimated savings:{' '}
            <span className="tabular-nums">{formatCad(totalSavings)}</span>
          </p>
          <p className="text-sm text-white/70">
            New outcome:{' '}
            <span
              className={`font-bold tabular-nums ${
                newBalance < 0 ? 'text-[#10B981]' : 'text-red-400'
              }`}
            >
              {newBalance < 0
                ? `${formatCad(Math.abs(newBalance))} refund`
                : `${formatCad(newBalance)} owing`}
            </span>
          </p>
          <p className="text-xs text-white/35 pt-0.5">
            RRSP deadline: March 3, 2026 · Donations claimed on 2025 return
          </p>
        </div>
      )}
    </div>
  );
}
