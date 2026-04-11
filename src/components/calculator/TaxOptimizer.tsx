'use client';

import { useState } from 'react';
import { TrendingUp, Info } from 'lucide-react';
import type { TaxCalculationResult } from '@/lib/tax-engine/types';
import { FHSA } from '@/lib/tax-engine/constants';

interface TaxOptimizerProps {
  result: TaxCalculationResult;
  currentRrspContributions: number;
  currentRrspRoom: number;
  fhsaRoom?: number;
  netIncome: number;
}

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    maximumFractionDigits: 0, minimumFractionDigits: 0,
  }).format(n);
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="text-white/30 hover:text-white/60 transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {show && (
        <div
          className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 rounded-lg px-3 py-2 text-xs leading-snug text-white/80 shadow-xl"
          style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

export function TaxOptimizer({ result, currentRrspContributions, currentRrspRoom, fhsaRoom = 8000, netIncome }: TaxOptimizerProps) {
  const rate = result.combinedMarginalRate;
  const additionalRrspRoom = Math.max(0, currentRrspRoom - currentRrspContributions);
  const [rrspSliderValue, setRrspSliderValue] = useState(additionalRrspRoom);

  const rrspSaving = Math.round(rrspSliderValue * rate);
  const fhsaSaving = Math.round(Math.min(fhsaRoom, FHSA.annualLimit) * rate);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white/80">Tax Optimizer</h3>
      </div>

      {/* CARD 1 — RRSP Optimizer */}
      {additionalRrspRoom > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-white/70">RRSP Optimizer</p>
              <p className="text-[10px] text-white/35 mt-0.5">Deadline: Mar 3, 2026</p>
            </div>
            <span className="text-sm font-bold text-emerald-400">{formatCad(rrspSaving)} saved</span>
          </div>

          <p className="text-xs text-white/50 leading-snug">
            You have <span className="text-white/80 font-medium">{formatCad(additionalRrspRoom)}</span> unused RRSP room.
            Contributing it all could save approximately <span className="text-emerald-400 font-semibold">{formatCad(rrspSaving)}</span> in taxes at your {(rate * 100).toFixed(1)}% marginal rate.
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30">$0</span>
              <span className="text-[10px] text-white/50 font-medium">{formatCad(rrspSliderValue)} contribution → saves {formatCad(Math.round(rrspSliderValue * rate))}</span>
              <span className="text-[10px] text-white/30">{formatCad(additionalRrspRoom)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={additionalRrspRoom}
              step={100}
              value={rrspSliderValue}
              onChange={(e) => setRrspSliderValue(Number(e.target.value))}
              className="w-full accent-emerald-400 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #10B981 ${(rrspSliderValue / additionalRrspRoom) * 100}%, rgba(255,255,255,0.1) 0%)` }}
            />
          </div>

          <p className="text-[10px] text-white/30">
            Every $1,000 in RRSP = <span className="text-emerald-400">{formatCad(Math.round(1000 * rate))}</span> saved
          </p>
        </div>
      )}

      {/* CARD 2 — FHSA */}
      {netIncome > 0 && (
        <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold text-white/70">FHSA Opportunity</p>
              <Tooltip text="A registered account for first-time buyers. Contributions are tax-deductible like RRSP. Withdrawals are tax-free like TFSA. Maximum $8,000/year, $40,000 lifetime. Must be used for first home purchase." />
            </div>
            {fhsaRoom > 0 && (
              <span className="text-sm font-bold text-emerald-400">{formatCad(fhsaSaving)} saved</span>
            )}
          </div>

          {fhsaRoom > 0 ? (
            <p className="text-xs text-white/50 leading-snug">
              First Home Savings Account: contributing{' '}
              <span className="text-white/80 font-medium">{formatCad(Math.min(fhsaRoom, FHSA.annualLimit))}</span>{' '}
              (your available room) would save{' '}
              <span className="text-emerald-400 font-semibold">~{formatCad(fhsaSaving)}</span>{' '}
              in taxes AND grows tax-free toward your first home.
            </p>
          ) : (
            <p className="text-xs text-white/50 leading-snug">
              Not using a FHSA yet? First-time buyers can contribute $8,000/year tax-deductibly. Ask your bank to open one today.
            </p>
          )}
        </div>
      )}

      {/* CARD 3 — Marginal Rate Context */}
      <div className="rounded-xl p-4 space-y-2.5" style={cardStyle}>
        <p className="text-xs font-semibold text-white/70">Your Marginal Rate Breakdown</p>
        <p className="text-[10px] text-white/40">Your next dollar of income is taxed at <span className="text-white/70 font-semibold">{(rate * 100).toFixed(2)}%</span></p>

        <div className="space-y-1.5">
          {[
            { label: 'Federal', value: result.marginalFederalRate },
            { label: 'Ontario', value: result.marginalOntarioRate },
            { label: 'Combined', value: result.combinedMarginalRate, bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} className="flex items-center justify-between">
              <span className={`text-xs ${bold ? 'text-white/80 font-semibold' : 'text-white/45'}`}>{label}</span>
              <span className={`text-xs tabular-nums ${bold ? 'text-white font-bold' : 'text-white/45'}`}>
                {(value * 100).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-white/35 border-t border-white/5 pt-2 mt-1">
          Every $1,000 in additional deductions saves you approximately{' '}
          <span className="text-emerald-400">{formatCad(Math.round(1000 * rate))}</span>.
        </p>
      </div>
    </div>
  );
}
