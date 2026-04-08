'use client';

/**
 * Tax Assessment — multi-step form that collects the user's tax situation.
 * Covers the fields needed for a basic Ontario T1 calculation.
 *
 * Steps:
 *  1. Income type (employed / self-employed / retired / student / mixed)
 *  2. Income amounts (tailored by income type)
 *  3. Key deductions (RRSP, childcare, union dues)
 *  4. Personal situation (age, marital status, dependants)
 *  5. Review + calculate
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Types ────────────────────────────────────────────────────────────────────

type IncomeType = 'employed' | 'self-employed' | 'retired' | 'student' | 'mixed';
type MaritalStatus = 'single' | 'married' | 'common-law' | 'separated' | 'divorced' | 'widowed';

interface AssessmentData {
  // Step 1
  incomeType: IncomeType | '';
  // Step 2
  employmentIncome: string;
  selfEmploymentIncome: string;
  pensionIncome: string;
  otherIncome: string;
  taxWithheld: string;
  // Step 3
  rrspContribution: string;
  unionDues: string;
  childcareCosts: string;
  // Step 4
  dateOfBirth: string;
  maritalStatus: MaritalStatus | '';
  hasDependants: boolean;
  hasDisability: boolean;
}

const EMPTY: AssessmentData = {
  incomeType: '',
  employmentIncome: '',
  selfEmploymentIncome: '',
  pensionIncome: '',
  otherIncome: '',
  taxWithheld: '',
  rrspContribution: '',
  unionDues: '',
  childcareCosts: '',
  dateOfBirth: '',
  maritalStatus: '',
  hasDependants: false,
  hasDisability: false,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function dollars(val: string): number {
  const n = parseFloat(val.replace(/,/g, ''));
  return isNaN(n) || n < 0 ? 0 : n;
}

function MoneyInput({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </Label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-7"
        />
      </div>
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
}: {
  data: AssessmentData;
  onChange: (d: Partial<AssessmentData>) => void;
}) {
  const options: { value: IncomeType; label: string; desc: string }[] = [
    { value: 'employed', label: 'Employed', desc: 'I receive a T4 from an employer' },
    { value: 'self-employed', label: 'Self-employed', desc: 'I run a business or freelance' },
    { value: 'retired', label: 'Retired', desc: 'I receive pension or retirement income' },
    { value: 'student', label: 'Student', desc: 'I have tuition and limited income' },
    { value: 'mixed', label: 'Mixed income', desc: 'I have multiple income sources' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        This helps us ask the right questions. You can adjust later.
      </p>
      {options.map((opt) => {
        const selected = data.incomeType === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ incomeType: opt.value })}
            className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all ${
              selected
                ? 'border-[#10B981] bg-[#10B981]/5'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-semibold text-sm ${selected ? 'text-[#10B981]' : 'text-slate-800'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
              {selected && <Check className="h-5 w-5 text-[#10B981] flex-shrink-0" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Step2({
  data,
  onChange,
}: {
  data: AssessmentData;
  onChange: (d: Partial<AssessmentData>) => void;
}) {
  const type = data.incomeType;
  const showEmployment = type === 'employed' || type === 'mixed';
  const showSelfEmployed = type === 'self-employed' || type === 'mixed';
  const showPension = type === 'retired' || type === 'mixed';

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Enter amounts from your 2025 tax slips. Leave blank if not applicable.
      </p>

      {showEmployment && (
        <MoneyInput
          id="employmentIncome"
          label="Employment income (T4 Box 14)"
          value={data.employmentIncome}
          onChange={(v) => onChange({ employmentIncome: v })}
          hint="Total employment income from all employers"
        />
      )}

      {showSelfEmployed && (
        <MoneyInput
          id="selfEmploymentIncome"
          label="Net self-employment income"
          value={data.selfEmploymentIncome}
          onChange={(v) => onChange({ selfEmploymentIncome: v })}
          hint="Revenue minus business expenses"
        />
      )}

      {showPension && (
        <MoneyInput
          id="pensionIncome"
          label="Pension / CPP / OAS income"
          value={data.pensionIncome}
          onChange={(v) => onChange({ pensionIncome: v })}
          hint="Total from T4A, T4A(P), T4A(OAS)"
        />
      )}

      <MoneyInput
        id="otherIncome"
        label="Other income (interest, dividends, EI, etc.)"
        value={data.otherIncome}
        onChange={(v) => onChange({ otherIncome: v })}
        hint="Investment income, EI benefits, rental income"
      />

      <MoneyInput
        id="taxWithheld"
        label="Total income tax withheld"
        value={data.taxWithheld}
        onChange={(v) => onChange({ taxWithheld: v })}
        hint="Box 22 on your T4(s) plus any other withholding"
      />
    </div>
  );
}

function Step3({
  data,
  onChange,
}: {
  data: AssessmentData;
  onChange: (d: Partial<AssessmentData>) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        These reduce your taxable income and can increase your refund.
      </p>

      <MoneyInput
        id="rrspContribution"
        label="RRSP contributions (2025)"
        value={data.rrspContribution}
        onChange={(v) => onChange({ rrspContribution: v })}
        hint="Contributions made Jan 1, 2025 – Feb 28, 2026"
      />

      <MoneyInput
        id="unionDues"
        label="Union / professional dues"
        value={data.unionDues}
        onChange={(v) => onChange({ unionDues: v })}
        hint="T4 Box 44 or receipts from your professional association"
      />

      <MoneyInput
        id="childcareCosts"
        label="Childcare expenses"
        value={data.childcareCosts}
        onChange={(v) => onChange({ childcareCosts: v })}
        hint="Daycare, after-school care, camps for children under 16"
      />
    </div>
  );
}

function Step4({
  data,
  onChange,
}: {
  data: AssessmentData;
  onChange: (d: Partial<AssessmentData>) => void;
}) {
  const maritalOptions: { value: MaritalStatus; label: string }[] = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'common-law', label: 'Common-law' },
    { value: 'separated', label: 'Separated' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        These affect your credits and deductions under the Income Tax Act.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="dob" className="text-sm font-medium text-slate-700">Date of birth</Label>
        <Input
          id="dob"
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          max="2007-12-31"
        />
        <p className="text-xs text-slate-400">Needed for the age amount credit (65+)</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">Marital status on December 31, 2025</Label>
        <Select
          value={data.maritalStatus}
          onValueChange={(v) => onChange({ maritalStatus: v as MaritalStatus })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {maritalOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onChange({ hasDependants: !data.hasDependants })}
          className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
            data.hasDependants ? 'border-[#10B981] bg-[#10B981]/5' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-slate-800">I have dependants</p>
              <p className="text-xs text-slate-500 mt-0.5">Children or other dependants you support</p>
            </div>
            {data.hasDependants && <Check className="h-5 w-5 text-[#10B981] flex-shrink-0" />}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange({ hasDisability: !data.hasDisability })}
          className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
            data.hasDisability ? 'border-[#10B981] bg-[#10B981]/5' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-slate-800">I have a disability certificate (T2201)</p>
              <p className="text-xs text-slate-500 mt-0.5">CRA-approved disability tax credit certificate</p>
            </div>
            {data.hasDisability && <Check className="h-5 w-5 text-[#10B981] flex-shrink-0" />}
          </div>
        </button>
      </div>
    </div>
  );
}

function Step5Review({
  data,
  calcResult,
  calcError,
  calcLoading,
}: {
  data: AssessmentData;
  calcResult: { balanceOwing: number; totalIncome: number; totalTaxPayable: number; averageTaxRate: number } | null;
  calcError: string | null;
  calcLoading: boolean;
}) {
  function formatCad(n: number) {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
  }

  const rows = [
    ['Income type', data.incomeType || '—'],
    ['Employment income', data.employmentIncome ? `$${data.employmentIncome}` : '—'],
    ['Self-employment income', data.selfEmploymentIncome ? `$${data.selfEmploymentIncome}` : '—'],
    ['Pension income', data.pensionIncome ? `$${data.pensionIncome}` : '—'],
    ['Other income', data.otherIncome ? `$${data.otherIncome}` : '—'],
    ['Tax withheld', data.taxWithheld ? `$${data.taxWithheld}` : '—'],
    ['RRSP contribution', data.rrspContribution ? `$${data.rrspContribution}` : '—'],
    ['Union dues', data.unionDues ? `$${data.unionDues}` : '—'],
    ['Childcare costs', data.childcareCosts ? `$${data.childcareCosts}` : '—'],
    ['Date of birth', data.dateOfBirth || '—'],
    ['Marital status', data.maritalStatus || '—'],
    ['Dependants', data.hasDependants ? 'Yes' : 'No'],
    ['Disability (T2201)', data.hasDisability ? 'Yes' : 'No'],
  ].filter(([, v]) => v !== '—');

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Review your answers before we calculate your estimate.</p>

      <div className="rounded-xl border border-slate-100 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-800 text-right">{value}</span>
          </div>
        ))}
      </div>

      {calcLoading && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-5 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" />
          <span className="text-sm text-slate-600">Calculating your 2025 estimate…</span>
        </div>
      )}

      {calcError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {calcError}
        </div>
      )}

      {calcResult && (
        <div className="rounded-xl bg-[#10B981]/5 border border-[#10B981]/20 p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#10B981]">2025 Estimate</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-500">Total income</p>
              <p className="text-lg font-bold text-slate-800">{formatCad(calcResult.totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tax payable</p>
              <p className="text-lg font-bold text-slate-800">{formatCad(calcResult.totalTaxPayable)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">
                {calcResult.balanceOwing < 0 ? 'Est. refund' : 'Balance owing'}
              </p>
              <p className={`text-lg font-bold ${calcResult.balanceOwing < 0 ? 'text-[#10B981]' : 'text-red-600'}`}>
                {formatCad(Math.abs(calcResult.balanceOwing))}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Avg rate: {(calcResult.averageTaxRate * 100).toFixed(1)}% · Ontario T1 estimate, not a CRA assessment
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const STEP_TITLES = [
  'What best describes your income?',
  'Tell us about your income',
  'Any deductions?',
  'Your personal situation',
  'Review & calculate',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [data, setData] = useState<AssessmentData>(EMPTY);
  const [calcResult, setCalcResult] = useState<{
    balanceOwing: number;
    totalIncome: number;
    totalTaxPayable: number;
    averageTaxRate: number;
  } | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(patch: Partial<AssessmentData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function canAdvance(): boolean {
    if (step === 1) return data.incomeType !== '';
    if (step === 4) return data.dateOfBirth !== '' && data.maritalStatus !== '';
    return true;
  }

  async function runCalculation() {
    setCalcLoading(true);
    setCalcError(null);
    setCalcResult(null);

    // Build a flat TaxInput from the form data
    const input = {
      mode: 'flat' as const,
      input: {
        employmentIncome: dollars(data.employmentIncome),
        selfEmploymentNetIncome: dollars(data.selfEmploymentIncome),
        pensionIncome: dollars(data.pensionIncome),
        otherIncome: dollars(data.otherIncome),
        incomeTaxDeducted: dollars(data.taxWithheld),
        rrspDeduction: dollars(data.rrspContribution),
        unionDues: dollars(data.unionDues),
        childcareExpenses: dollars(data.childcareCosts),
        hasDisabilityTaxCredit: data.hasDisability,
        // Derive age from dateOfBirth
        age: data.dateOfBirth
          ? new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear()
          : 30,
      },
    };

    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Calculation failed');
      const result = await res.json();
      setCalcResult({
        balanceOwing: result.balanceOwing ?? 0,
        totalIncome: result.totalIncome ?? 0,
        totalTaxPayable: result.totalTaxPayable ?? 0,
        averageTaxRate: result.averageTaxRate ?? 0,
      });
    } catch {
      setCalcError('Could not calculate estimate. Please try again.');
    } finally {
      setCalcLoading(false);
    }
  }

  async function handleNext() {
    if (step < 5) {
      const nextStep = (step + 1) as 1 | 2 | 3 | 4 | 5;
      setStep(nextStep);
      if (nextStep === 5) {
        await runCalculation();
      }
    } else {
      // Final step — redirect to dashboard
      setSubmitting(true);
      router.push('/dashboard');
    }
  }

  function handleBack() {
    if (step > 1) setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5);
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A2744]">Tax Assessment</h1>
        <p className="text-sm text-slate-500 mt-1">Step {step} of 5</p>

        {/* Step indicator */}
        <div className="flex gap-1.5 mt-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-[#10B981]' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1A2744]">
            {STEP_TITLES[step - 1]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && <Step1 data={data} onChange={update} />}
          {step === 2 && <Step2 data={data} onChange={update} />}
          {step === 3 && <Step3 data={data} onChange={update} />}
          {step === 4 && <Step4 data={data} onChange={update} />}
          {step === 5 && (
            <Step5Review
              data={data}
              calcResult={calcResult}
              calcError={calcError}
              calcLoading={calcLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={step === 1}
          className="text-slate-500"
        >
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canAdvance() || (step === 5 && calcLoading) || submitting}
          className="bg-[#10B981] hover:bg-[#059669] text-white gap-2 rounded-full px-6"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : step === 5 ? (
            <>Go to dashboard <ChevronRight className="h-4 w-4" /></>
          ) : (
            <>Next <ChevronRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </main>
  );
}
