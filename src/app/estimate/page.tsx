'use client';

/**
 * 60-Second Viral Tax Estimator — public, no login required.
 *
 * Five questions → client-side calculation via calculateTaxes() →
 * estimated refund/owing + top missed credits + shareble URL.
 *
 * No PII is stored or transmitted. Answers are numbers only.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ChevronLeft,
  Share2,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Percent,
  AlertCircle,
  Lightbulb,
  Copy,
  Check,
} from 'lucide-react';
import { calculateTaxes } from '@/lib/taxEngine';
import type { TaxInput, TaxBreakdown } from '@/lib/taxEngine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
}

function formatCadFull(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Estimate withheld tax from employment income when user selects "not sure". */
function estimateWithholding(employment: number): number {
  // Approximate CRA withholding at source for Ontario employee, no extras
  if (employment <= 0) return 0;
  if (employment <= 15000) return Math.round(employment * 0.00);
  if (employment <= 30000) return Math.round(employment * 0.10);
  if (employment <= 50000) return Math.round(employment * 0.155);
  if (employment <= 80000) return Math.round(employment * 0.20);
  if (employment <= 120000) return Math.round(employment * 0.26);
  return Math.round(employment * 0.32);
}

type OtherIncomeType = 'investments' | 'self_employment' | 'none';

interface Answers {
  employmentIncome: number;
  taxWithheld: number | null; // null = "not sure"
  rrspContribution: number;
  rentPaid: number;
  otherIncomeType: OtherIncomeType;
  otherIncomeAmount: number;
}

function buildTaxInput(a: Answers): TaxInput {
  const withheld = a.taxWithheld ?? estimateWithholding(a.employmentIncome);
  return {
    employmentIncome: a.employmentIncome,
    selfEmploymentNetIncome: a.otherIncomeType === 'self_employment' ? a.otherIncomeAmount : 0,
    otherEmploymentIncome: 0,
    pensionIncome: 0,
    annuityIncome: 0,
    rrspIncome: 0,
    otherIncome: 0,
    interestIncome: a.otherIncomeType === 'investments' ? a.otherIncomeAmount * 0.4 : 0,
    eligibleDividends: a.otherIncomeType === 'investments' ? a.otherIncomeAmount * 0.3 : 0,
    ineligibleDividends: 0,
    capitalGains: a.otherIncomeType === 'investments' ? a.otherIncomeAmount * 0.3 : 0,
    capitalLossesPriorYears: 0,
    rentalIncome: 0,
    rentalExpenses: 0,
    foreignIncome: 0,
    foreignTaxPaid: 0,
    eiRegularBenefits: 0,
    socialAssistance: 0,
    workersComp: 0,
    disabilityPensionCPP: 0,
    oasPension: 0,
    netPartnershipIncome: 0,
    scholarshipFellowship: 0,
    researchGrants: 0,
    rrspContribution: a.rrspContribution,
    rrspContributionRoom: Math.max(a.rrspContribution, Math.round(a.employmentIncome * 0.18)),
    prppContribution: 0,
    fhsaContribution: 0,
    unionDues: 0,
    profDues: 0,
    childcareExpenses: 0,
    movingExpenses: 0,
    supportPayments: 0,
    carryingCharges: 0,
    employmentExpenses: 0,
    otherDeductions: 0,
    age: 35,
    isBlind: false,
    hasDisability: false,
    hasDisabledSpouse: false,
    hasDisabledDependent: false,
    disabledDependentAge: 0,
    hasSpouse: false,
    spouseNetIncome: 0,
    numberOfDependentsUnder18: 0,
    numberOfDependents18Plus: 0,
    isCaregiver: false,
    tuitionFederal: 0,
    tuitionCarryforwardFed: 0,
    studentLoanInterest: 0,
    medicalExpenses: 0,
    charitableDonations: 0,
    politicalContributions: 0,
    ontarioPoliticalContributions: 0,
    firstTimeHomeBuyer: false,
    homeAccessibilityReno: 0,
    adoptionExpenses: 0,
    pensionIncomeSplitting: 0,
    isVolunteerFirefighter: false,
    isSearchAndRescue: false,
    digitalNewsSubscriptions: 0,
    taxWithheld: withheld,
    cppContributedEmployee: 0,
    cpp2ContributedEmployee: 0,
    eiContributedEmployee: 0,
    rentPaid: a.rentPaid,
    propertyTaxPaid: 0,
    isNorthernOntario: false,
    ontarioSalesTaxCreditEligible: true,
    installmentsPaid: 0,
    fhsaWithdrawal: 0,
    hasPriorYearCapitalLosses: false,
    numberOfChildren: 0,
    numberOfChildrenUnder6: 0,
    hasSpouseForBenefits: false,
  };
}

interface MissedCredit {
  name: string;
  description: string;
  estimatedValue: string;
}

function getMissedCredits(a: Answers, result: TaxBreakdown): MissedCredit[] {
  const missed: MissedCredit[] = [];
  const netIncome = result.lines.L23600_netIncome;

  // CWB — low-income workers earning under ~$33k often miss this
  if (
    a.employmentIncome >= 3000 &&
    netIncome < 33000 &&
    result.refundable.cwbBasic < 100
  ) {
    missed.push({
      name: 'Canada Workers Benefit (CWB)',
      description: 'Refundable credit for lower-income workers. Many miss this because it requires filing.',
      estimatedValue: 'up to $1,518',
    });
  }

  // OTB — if they paid rent but didn't capture the full benefit
  if (a.rentPaid > 0 && result.refundable.ontarioTrilliumBenefit < 50) {
    missed.push({
      name: 'Ontario Trillium Benefit (OTB)',
      description: 'Tax-free monthly benefit for Ontario renters. Based on rent paid and income.',
      estimatedValue: 'up to $1,421/year',
    });
  }

  // RRSP room — if they have significant income but no RRSP contribution
  if (a.employmentIncome > 40000 && a.rrspContribution === 0) {
    const potentialDeduction = Math.min(
      Math.round(a.employmentIncome * 0.18),
      32490
    );
    const marginalRate = result.summary.marginalCombinedRate;
    const estimatedSaving = Math.round(potentialDeduction * 0.3 * marginalRate);
    missed.push({
      name: 'RRSP Contribution',
      description: 'Contributing to your RRSP reduces taxable income dollar-for-dollar.',
      estimatedValue: `could save ~${formatCad(estimatedSaving)}`,
    });
  }

  // GST/HST credit — if income is low
  if (netIncome < 40000 && result.refundable.gstHstCredit < 50) {
    missed.push({
      name: 'GST/HST Credit',
      description: 'Quarterly tax-free payment for lower/moderate-income Canadians.',
      estimatedValue: 'up to $349/year',
    });
  }

  return missed.slice(0, 3);
}

// ── URL param helpers ─────────────────────────────────────────────────────────

function answersToParams(a: Answers): URLSearchParams {
  const p = new URLSearchParams();
  p.set('ei', String(a.employmentIncome));
  if (a.taxWithheld !== null) p.set('tw', String(a.taxWithheld));
  p.set('rrsp', String(a.rrspContribution));
  p.set('rent', String(a.rentPaid));
  p.set('oi', a.otherIncomeType);
  p.set('oia', String(a.otherIncomeAmount));
  return p;
}

function paramsToAnswers(p: URLSearchParams): Partial<Answers> {
  const result: Partial<Answers> = {};
  if (p.has('ei')) result.employmentIncome = Number(p.get('ei'));
  if (p.has('tw')) result.taxWithheld = Number(p.get('tw'));
  if (p.has('rrsp')) result.rrspContribution = Number(p.get('rrsp'));
  if (p.has('rent')) result.rentPaid = Number(p.get('rent'));
  if (p.has('oi')) result.otherIncomeType = p.get('oi') as OtherIncomeType;
  if (p.has('oia')) result.otherIncomeAmount = Number(p.get('oia'));
  return result;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${((step) / total) * 100}%` }}
      />
    </div>
  );
}

function SliderInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-emerald-500 cursor-pointer"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  prefix,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  prefix?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg font-mono">
          {prefix}
        </span>
      )}
      <input
        type="number"
        min={0}
        value={value === 0 ? '' : value}
        placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className={`w-full bg-white/5 border border-white/20 rounded-xl text-white text-xl font-mono
          focus:outline-none focus:border-emerald-500/60 focus:bg-white/8 transition-all
          py-4 ${prefix ? 'pl-10 pr-6' : 'px-6'}`}
      />
    </div>
  );
}

// ── Estimator inner component (needs Suspense for useSearchParams) ─────────────

function EstimatorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0); // 0 = intro, 1-5 = questions, 6 = results
  const TOTAL_STEPS = 5;

  // Default answers
  const defaultAnswers: Answers = {
    employmentIncome: 65000,
    taxWithheld: null,
    rrspContribution: 0,
    rentPaid: 0,
    otherIncomeType: 'none',
    otherIncomeAmount: 0,
  };

  const [answers, setAnswers] = useState<Answers>(() => {
    const fromParams = paramsToAnswers(searchParams);
    // If URL has params, jump straight to results
    return { ...defaultAnswers, ...fromParams };
  });

  const [notSureTax, setNotSureTax] = useState(answers.taxWithheld === null);
  const [copied, setCopied] = useState(false);

  // Jump to results if URL params are present
  useEffect(() => {
    if (searchParams.has('ei')) {
      setStep(6);
    }
  }, [searchParams]);

  // Compute result only when on results step
  const result = useMemo<TaxBreakdown | null>(() => {
    if (step !== 6) return null;
    try {
      return calculateTaxes(buildTaxInput(answers));
    } catch {
      return null;
    }
  }, [step, answers]);

  const missedCredits = useMemo<MissedCredit[]>(() => {
    if (!result) return [];
    return getMissedCredits(answers, result);
  }, [result, answers]);

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else setStep(6); // go to results
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
    else setStep(0);
  }

  function goToResults() {
    setStep(6);
    // Update URL with answers (no PII — just numbers)
    const params = answersToParams(answers);
    router.replace(`/estimate?${params.toString()}`, { scroll: false });
  }

  function restart() {
    setStep(0);
    setAnswers(defaultAnswers);
    setNotSureTax(true);
    router.replace('/estimate', { scroll: false });
  }

  function copyShareUrl() {
    const params = answersToParams(answers);
    const url = `${window.location.origin}/estimate?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const effectiveTaxWithheld = answers.taxWithheld ?? estimateWithholding(answers.employmentIncome);

  // ── Screens ────────────────────────────────────────────────────────────────

  // Intro
  if (step === 0) {
    return (
      <div className="relative min-h-screen bg-[#0a1020] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
        {/* Ambient blobs — same grammar as the marketing hero */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute rounded-full" style={{ width: '55vw', height: '55vw', left: '-10vw', top: '-15vw', background: 'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)', filter: 'blur(70px)' }} />
          <div className="absolute rounded-full" style={{ width: '45vw', height: '45vw', right: '-8vw', top: '-10vw', background: 'radial-gradient(circle, rgba(20,184,166,0.12), transparent 70%)', filter: 'blur(70px)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,22,40,0.80) 100%)' }} />
        </div>

        <div className="relative max-w-lg w-full text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-4 py-1.5 mb-8 text-sm text-emerald-400 font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            No account required · Takes 60 seconds
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight" style={{ letterSpacing: '-0.025em' }}>
            How much are you<br />
            <span className="text-emerald-400">getting back</span> this year?
          </h1>
          <p className="text-white/50 text-lg mb-10 leading-relaxed">
            Answer 5 questions. Get your estimated 2025 refund instantly —
            calculated against real CRA rates, client-side.
          </p>

          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold
              text-lg px-8 py-4 rounded-full transition-colors duration-200 shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
          >
            Calculate my refund →
          </button>

          <p className="mt-6 text-white/30 text-sm">
            No personal info collected. Numbers stay in your browser.
          </p>
        </div>
      </div>
    );
  }

  // Results
  if (step === 6 && result) {
    const refund = result.summary.refundOrOwing;
    const isRefund = refund >= 0;
    const effRate = result.summary.effectiveRate * 100;
    const marginalRate = result.summary.marginalCombinedRate * 100;
    const withheldEstimated = answers.taxWithheld === null;

    return (
      <div className="min-h-screen bg-[#0a1020] px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Restart */}
          <button
            onClick={restart}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Start over
          </button>

          {/* Main result */}
          <div className={`rounded-3xl border p-8 mb-6 text-center
            ${isRefund
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-amber-500/5 border-amber-500/20'
            }`}
          >
            <p className="text-white/50 text-sm uppercase tracking-wider mb-2 font-medium">
              Estimated {isRefund ? 'refund' : 'balance owing'}
              {withheldEstimated && ' (withholding estimated)'}
            </p>

            <div className={`text-6xl sm:text-7xl font-bold tabular-nums mb-2 ${isRefund ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isRefund ? '+' : '-'}{formatCad(refund)}
            </div>

            <p className="text-white/40 text-sm">
              For 2025 tax year · Ontario resident
            </p>

            {withheldEstimated && (
              <p className="mt-3 text-white/30 text-xs">
                * Tax withheld estimated at {formatCadFull(effectiveTaxWithheld)} based on your income.
                Enter your T4 Box 22 amount above for exact results.
              </p>
            )}
          </div>

          {/* Rate stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider mb-2">
                <Percent className="w-3.5 h-3.5" />
                Effective rate
              </div>
              <div className="text-3xl font-bold text-white">
                {effRate.toFixed(1)}%
              </div>
              <p className="text-white/30 text-xs mt-1">of total income paid in tax</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Marginal rate
              </div>
              <div className="text-3xl font-bold text-white">
                {marginalRate.toFixed(1)}%
              </div>
              <p className="text-white/30 text-xs mt-1">tax on your next dollar earned</p>
            </div>
          </div>

          {/* Missed credits */}
          {missedCredits.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-4">
                <Lightbulb className="w-4 h-4" />
                Credits you may be missing
              </div>
              <div className="space-y-4">
                {missedCredits.map((credit, i) => (
                  <div key={i} className="flex gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white text-sm font-medium">{credit.name}</div>
                      <div className="text-white/50 text-xs mt-0.5">{credit.description}</div>
                      <div className="text-emerald-400 text-xs mt-1 font-mono">{credit.estimatedValue}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 rounded-2xl p-6 mb-6">
            <h3 className="text-white font-semibold text-lg mb-1">
              Get your exact amount — it&apos;s free
            </h3>
            <p className="text-white/50 text-sm mb-4">
              Upload your T4, let AI read it, and get a precise calculation
              with every credit applied to your situation.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white
                font-semibold px-6 py-3.5 rounded-full transition-colors duration-200 text-sm shadow-[0_8px_24px_rgba(16,185,129,0.3)]"
            >
              File for free →
            </Link>
          </div>

          {/* Share */}
          <div className="flex items-center gap-3">
            <button
              onClick={copyShareUrl}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10
                text-white/60 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-colors duration-200"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share my estimate
                </>
              )}
            </button>
            <p className="text-white/25 text-xs">
              Shareable link — no personal info included
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Questions 1–5
  return (
    <div className="min-h-screen bg-[#0a1020] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={back}
            className="text-white/40 hover:text-white/70 transition-colors p-1"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <ProgressBar step={step} total={TOTAL_STEPS} />
          </div>
          <span className="text-white/40 text-sm tabular-nums">{step}/{TOTAL_STEPS}</span>
        </div>

        {/* Q1: Employment Income */}
        {step === 1 && (
          <QuestionCard
            title="What was your employment income this year?"
            hint="T4 Box 14 — from your main job(s)"
          >
            <div className="space-y-4">
              <div className="text-center text-4xl font-bold text-emerald-400 font-mono">
                {formatCadFull(answers.employmentIncome)}
              </div>
              <SliderInput
                value={answers.employmentIncome}
                onChange={(v) => update('employmentIncome', v)}
                min={0}
                max={250000}
                step={1000}
              />
              <div className="flex justify-between text-xs text-white/30">
                <span>$0</span>
                <span>$250,000</span>
              </div>
              <div className="mt-1">
                <NumberInput
                  value={answers.employmentIncome}
                  onChange={(v) => update('employmentIncome', v)}
                  placeholder="Or type exact amount"
                  prefix="$"
                />
              </div>
            </div>
            <NextButton onClick={next} />
          </QuestionCard>
        )}

        {/* Q2: Tax Withheld */}
        {step === 2 && (
          <QuestionCard
            title="How much income tax was withheld?"
            hint="T4 Box 22 — check your last paystub or T4"
          >
            <div className="space-y-4">
              <button
                onClick={() => {
                  setNotSureTax(true);
                  update('taxWithheld', null);
                }}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all text-sm
                  ${notSureTax
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                  }`}
              >
                <span>Not sure — estimate it for me</span>
                {notSureTax && <CheckCircle2 className="w-4 h-4" />}
              </button>

              {notSureTax ? (
                <div className="text-center text-white/40 text-sm py-2">
                  Using estimated withholding of{' '}
                  <span className="text-white/60 font-mono">
                    {formatCadFull(estimateWithholding(answers.employmentIncome))}
                  </span>
                </div>
              ) : (
                <NumberInput
                  value={answers.taxWithheld ?? 0}
                  onChange={(v) => {
                    setNotSureTax(false);
                    update('taxWithheld', v);
                  }}
                  placeholder="Tax withheld (Box 22)"
                  prefix="$"
                />
              )}

              <button
                onClick={() => {
                  setNotSureTax(false);
                  if (answers.taxWithheld === null) update('taxWithheld', 0);
                }}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all text-sm
                  ${!notSureTax
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                  }`}
              >
                <span>I know the amount</span>
                {!notSureTax && <CheckCircle2 className="w-4 h-4" />}
              </button>
            </div>
            <NextButton onClick={next} />
          </QuestionCard>
        )}

        {/* Q3: RRSP */}
        {step === 3 && (
          <QuestionCard
            title="Did you contribute to an RRSP?"
            hint="Contributions up to Feb 28, 2026 count for 2025"
          >
            <div className="space-y-4">
              <button
                onClick={() => update('rrspContribution', 0)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all text-sm
                  ${answers.rrspContribution === 0
                    ? 'bg-white/8 border-white/20 text-white/70'
                    : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                  }`}
              >
                <span>No / skip this</span>
                {answers.rrspContribution === 0 && <CheckCircle2 className="w-4 h-4 text-white/40" />}
              </button>

              <div className="relative">
                <p className="text-white/50 text-xs mb-2 pl-1">Enter contribution amount:</p>
                <NumberInput
                  value={answers.rrspContribution}
                  onChange={(v) => update('rrspContribution', v)}
                  placeholder="RRSP contributed"
                  prefix="$"
                />
              </div>
            </div>
            <NextButton onClick={next} />
          </QuestionCard>
        )}

        {/* Q4: Rent */}
        {step === 4 && (
          <QuestionCard
            title="How much rent did you pay in Ontario?"
            hint="Full-year rental payments. Used to calculate Ontario Trillium Benefit."
          >
            <div className="space-y-4">
              <button
                onClick={() => update('rentPaid', 0)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all text-sm
                  ${answers.rentPaid === 0
                    ? 'bg-white/8 border-white/20 text-white/70'
                    : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                  }`}
              >
                <span>I own / didn&apos;t rent</span>
                {answers.rentPaid === 0 && <CheckCircle2 className="w-4 h-4 text-white/40" />}
              </button>

              <div className="relative">
                <p className="text-white/50 text-xs mb-2 pl-1">Enter annual rent paid:</p>
                <NumberInput
                  value={answers.rentPaid}
                  onChange={(v) => update('rentPaid', v)}
                  placeholder="Annual rent"
                  prefix="$"
                />
              </div>
            </div>
            <NextButton onClick={next} />
          </QuestionCard>
        )}

        {/* Q5: Other income */}
        {step === 5 && (
          <QuestionCard
            title="Any other income?"
            hint="Rough estimate is fine"
          >
            <div className="space-y-3">
              {(
                [
                  { value: 'none', label: 'None — employment only', icon: <CheckCircle2 className="w-4 h-4" /> },
                  { value: 'investments', label: 'Investments (dividends, interest, capital gains)', icon: <TrendingUp className="w-4 h-4" /> },
                  { value: 'self_employment', label: 'Self-employment / freelance', icon: <DollarSign className="w-4 h-4" /> },
                ] as const
              ).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => update('otherIncomeType', value)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border transition-all text-sm text-left
                    ${answers.otherIncomeType === value
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                    }`}
                >
                  <span className={answers.otherIncomeType === value ? 'text-emerald-400' : 'text-white/30'}>
                    {icon}
                  </span>
                  {label}
                </button>
              ))}

              {answers.otherIncomeType !== 'none' && (
                <div className="pt-2">
                  <p className="text-white/50 text-xs mb-2 pl-1">
                    Approximate {answers.otherIncomeType === 'investments' ? 'investment' : 'net self-employment'} income:
                  </p>
                  <NumberInput
                    value={answers.otherIncomeAmount}
                    onChange={(v) => update('otherIncomeAmount', v)}
                    placeholder="Amount"
                    prefix="$"
                  />
                </div>
              )}
            </div>

            <button
              onClick={goToResults}
              className="mt-8 w-full inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600
                text-white font-semibold text-lg px-8 py-4 rounded-full transition-colors duration-200
                shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
            >
              Calculate my refund
              <ArrowRight className="w-5 h-5" />
            </button>
          </QuestionCard>
        )}
      </div>
    </div>
  );
}

// ── Small reusable sub-components ─────────────────────────────────────────────

function QuestionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-snug" style={{ letterSpacing: '-0.015em' }}>{title}</h2>
      <p className="text-white/40 text-sm mb-8">{hint}</p>
      {children}
    </div>
  );
}

function NextButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-8 w-full inline-flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10
        border border-white/15 hover:border-white/25 text-white font-semibold text-base px-8 py-4 rounded-full
        transition-all duration-200"
    >
      Continue
      <ArrowRight className="w-5 h-5" />
    </button>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function EstimatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a1020] flex items-center justify-center">
          <div className="text-white/40 text-sm">Loading...</div>
        </div>
      }
    >
      <EstimatorInner />
    </Suspense>
  );
}
