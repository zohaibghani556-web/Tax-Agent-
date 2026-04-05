'use client';

/**
 * CreditFinder — scans the user's profile and calculation result to surface
 * credits and deductions they may have missed or are eligible for.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type {
  TaxCalculationResult,
  TaxProfile,
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
  profile: Partial<TaxProfile>,
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
  if (totalMed > 0 && totalMed < medThreshold) {
    suggestions.push({
      id: 'medical-threshold',
      title: 'Medical Expenses Below Threshold',
      description: `Your claimed medical expenses ($${totalMed.toFixed(0)}) are below the $${medThreshold.toFixed(0)} threshold for your net income. No credit is generated. Check for unclaimed receipts — dental, prescriptions, vision care, physiotherapy, and most medical devices qualify.`,
      eligibilityNote:
        'Threshold is the lesser of $2,759 or 3% of net income. Only amounts above the threshold generate a 15% federal credit. Claim on line 33099 (Schedule 1).',
    });
  }

  // Digital news subscription — not claimed
  if (!deductions.digitalNewsSubscription || deductions.digitalNewsSubscription === 0) {
    suggestions.push({
      id: 'digital-news',
      title: 'Digital News Subscription Credit',
      estimate: 'Up to $75 federal credit',
      description:
        'You can claim up to $500 in eligible digital news subscription costs. The federal credit is 15% (up to $75). Qualifying subscriptions must be from a Qualified Canadian Journalism Organization (QCJO).',
      eligibilityNote:
        'Claim on line 31350 (Schedule 1). Common qualifying publishers include The Globe and Mail, Toronto Star, and many local outlets. Keep your subscription receipts.',
    });
  }

  // First-time Home Buyer's Amount — not claimed
  if (!deductions.homeBuyersEligible) {
    suggestions.push({
      id: 'home-buyer',
      title: "First Home Buyer's Amount",
      estimate: '$1,500 federal + $750 Ontario',
      description:
        "If you or your spouse/partner purchased a qualifying home in 2025 and neither of you owned a home in the last 4 calendar years, you can claim $10,000 (15% = $1,500 federal credit). Ontario's First Home Buyer's Tax Credit adds up to $750.",
      eligibilityNote:
        'Claim $10,000 on line 31270 (Schedule 1) and $5,000 on line 63050 (ON428). The home must become your principal residence by the end of the following year.',
    });
  }

  // Disability Tax Credit — not claimed
  if (!deductions.hasDisabilityCredit) {
    suggestions.push({
      id: 'dtc',
      title: 'Disability Tax Credit (DTC)',
      estimate: '~$1,650 federal + ~$508 Ontario',
      description:
        "If you or a dependant have a severe and prolonged physical or mental impairment that markedly restricts daily activities, you may qualify for the DTC. It's worth $11,048 × 15% = ~$1,657 federally plus an Ontario equivalent.",
      eligibilityNote:
        'Apply to CRA with form T2201, certified by a qualified practitioner. Once approved, claim on line 31600 (Schedule 1) and line 58440 (ON428). Prior years can be amended up to 10 years back.',
    });
  }

  // Home Accessibility Tax Credit — not claimed (relevant if 65+ or DTC)
  if (deductions.homeAccessibilityExpenses === 0) {
    suggestions.push({
      id: 'home-access',
      title: 'Home Accessibility Tax Credit',
      estimate: 'Up to $3,000 credit',
      description:
        'If you are 65+ or eligible for the DTC, you can claim up to $20,000 for eligible renovations that make your home safer or more accessible — ramps, grab bars, widened doorways, walk-in tubs, stair lifts, etc. The 15% credit is worth up to $3,000.',
      eligibilityNote:
        'Claim on line 31285 (Schedule 1). Keep all receipts and contractor invoices. Only the homeowner or an eligible individual occupying the home can claim.',
    });
  }

  // Unused carryforward amounts
  if (
    deductions.tuitionCarryforward === 0 &&
    deductions.capitalLossCarryforward === 0 &&
    deductions.nonCapitalLossCarryforward === 0
  ) {
    suggestions.push({
      id: 'carryforward',
      title: 'Check for Unused Carryforward Amounts',
      description:
        'Your CRA My Account shows any unused tuition credits, capital loss carryforwards, or non-capital loss carryforwards from prior years. These can significantly reduce your 2025 tax.',
      eligibilityNote:
        "Log in at canada.ca/my-cra-account → Tax Returns → Carry forward amounts. Prior-year tuition credits transfer to line 32300, capital losses go on Schedule 3.",
    });
  }

  // Pension income splitting — if married/common-law with pension income
  if (
    (profile.maritalStatus === 'married' || profile.maritalStatus === 'common-law') &&
    result.totalIncome > 60_000
  ) {
    suggestions.push({
      id: 'pension-split',
      title: 'Pension Income Splitting',
      description:
        'If you or your spouse/partner received eligible pension income, you may be able to split up to 50% of it with the lower-income spouse. This can reduce your combined tax bill.',
      eligibilityNote:
        'Both spouses must complete Form T1032 (Joint Election to Split Pension Income). Eligible pension income includes RRIF withdrawals, annuities, and registered pension plans.',
    });
  }

  return suggestions;
}

interface Props {
  result: TaxCalculationResult;
  deductions: DeductionsCreditsInput;
  profile: Partial<TaxProfile>;
}

export function CreditFinder({ result, deductions, profile }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const suggestions = buildSuggestions(result, deductions, profile);

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 pb-5 flex items-center gap-2.5 text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            No missed credits detected — your return looks thorough!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-[#1A2744] flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Credit Finder
          <Badge className="ml-1 bg-amber-100 text-amber-700 border-0 text-xs font-semibold">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">
          Potential credits and deductions you may be eligible for based on your profile.
        </p>
      </CardHeader>

      <CardContent className="pt-2 divide-y divide-slate-100">
        {suggestions.map((s) => (
          <div key={s.id} className="py-3 first:pt-1">
            <button
              className="w-full flex items-start justify-between gap-3 text-left focus-visible:outline-none"
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              aria-expanded={expanded === s.id}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800">{s.title}</span>
                  {s.estimate && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-medium">
                      {s.estimate}
                    </Badge>
                  )}
                </div>
                {expanded !== s.id && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.description}</p>
                )}
              </div>
              {expanded === s.id ? (
                <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              )}
            </button>

            {expanded === s.id && (
              <div className="mt-2.5 space-y-2">
                <p className="text-sm text-slate-600">{s.description}</p>
                <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">How to claim: </span>
                    {s.eligibilityNote}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
