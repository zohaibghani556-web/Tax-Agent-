'use client';

/**
 * CreditFinder — scans the user's profile and calculation result to surface
 * credits and deductions they may have missed or are eligible for.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, CheckCircle2 } from 'lucide-react';
import type {
  TaxCalculationResult,
  DeductionsCreditsInput,
} from '@/lib/tax-engine/types';

interface CreditSuggestion {
  id: string;
  title: string;
  estimate?: string;
  description: string;
  eligibilityNote: string;
}

function buildSuggestions(
  result: TaxCalculationResult,
  deductions: DeductionsCreditsInput,
): CreditSuggestion[] {
  const suggestions: CreditSuggestion[] = [];

  // Ontario Trillium Benefit — rent or property tax paid, income not too high
  if (deductions.rentPaid > 0 || deductions.propertyTaxPaid > 0) {
    if (result.estimatedOTB > 0) {
      suggestions.push({
        id: 'otb',
        title: 'Ontario Trillium Benefit (OTB)',
        estimate: `Est. ${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(result.estimatedOTB)}/year`,
        description:
          'You qualify for the OTB, which combines the Ontario Energy and Property Tax Credit (OEPTC) and Ontario Sales Tax Credit (OSTC). It is paid monthly starting July 2026 based on your 2025 return.',
        eligibilityNote:
          'File ON-BEN (Part 2) with your 2025 return. Payments begin July 2026. Your rent or property tax paid and net income determine the amount.',
      });
    }
  }

  // Medical expenses — claimed but below threshold (no credit generated)
  const totalMed = deductions.medicalExpenses.reduce((s, e) => s + e.amount, 0);
  const medThreshold = Math.min(2759, Math.round(result.netIncome * 0.03 * 100) / 100);

  if (totalMed > 0 && totalMed <= medThreshold) {
    suggestions.push({
      id: 'med-low',
      title: 'Medical Expenses Below Threshold',
      description: `Your medical expenses (${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(totalMed)}) are below the 3%-of-net-income threshold (${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(medThreshold)}). No credit is generated yet.`,
      eligibilityNote:
        'Consolidate all eligible receipts — dental, vision, prescriptions, travel to medical care. You can claim any 12-month period ending in 2025. Consider claiming in a lower-income year.',
    });
  }

  // RRSP — significant room but not fully used
  const unusedRrsp = deductions.rrspContributionRoom - deductions.rrspContributions;
  if (unusedRrsp > 5000 && result.netIncome > 50000) {
    suggestions.push({
      id: 'rrsp',
      title: 'RRSP Contribution Room Available',
      estimate: `Up to ${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Math.min(unusedRrsp, 32490))} deductible`,
      description: `You have $${unusedRrsp.toLocaleString('en-CA')} in unused RRSP room. Contributing before March 3, 2026 reduces your 2025 taxable income.`,
      eligibilityNote:
        'Contributions to March 3, 2026 count for 2025. At your marginal rate, each $1,000 contributed saves approximately ' +
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(result.combinedMarginalRate * 1000) +
        ' in tax.',
    });
  }

  return suggestions;
}

interface Props {
  result: TaxCalculationResult;
  deductions: DeductionsCreditsInput;
  profile?: unknown;
}

export function CreditFinder({ result, deductions }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const suggestions = buildSuggestions(result, deductions);

  if (suggestions.length === 0) {
    return (
      <div className="rounded-2xl px-5 py-4 flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#10B981]" />
        <p className="text-sm font-medium text-white/70">
          No missed credits detected — your return looks thorough!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Credit Finder
          <span className="ml-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
          </span>
        </h3>
        <p className="text-xs text-white/45 mt-1">
          Potential credits and deductions you may be eligible for based on your profile.
        </p>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {suggestions.map((s) => (
          <div key={s.id} className="px-5 py-3">
            <button
              className="w-full flex items-start justify-between gap-3 text-left focus-visible:outline-none"
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              aria-expanded={expanded === s.id}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{s.title}</span>
                  {s.estimate && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                      {s.estimate}
                    </span>
                  )}
                </div>
                {expanded !== s.id && (
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{s.description}</p>
                )}
              </div>
              {expanded === s.id ? (
                <ChevronUp className="h-4 w-4 text-white/35 shrink-0 mt-0.5" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/35 shrink-0 mt-0.5" />
              )}
            </button>

            {expanded === s.id && (
              <div className="mt-2.5 space-y-2">
                <p className="text-sm text-white/60">{s.description}</p>
                <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs text-white/50">
                    <span className="font-semibold text-white/70">How to claim: </span>
                    {s.eligibilityNote}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
