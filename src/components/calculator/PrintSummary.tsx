'use client';

/**
 * PrintSummary — visible only when window.print() is called.
 * Renders a clean, paper-friendly T1 summary without the dark UI chrome.
 * All screen elements use print:hidden; this component uses hidden print:block.
 */

import type { TaxCalculationResult } from '@/lib/tax-engine/types';

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n);
}

interface Row {
  label: string;
  line?: number;
  amount: number;
}

function PrintRow({ label, line, amount }: Row) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-gray-100 text-sm">
      <span className="text-gray-600">
        {line && <span className="text-gray-400 mr-2 text-xs tabular-nums">L{line}</span>}
        {label}
      </span>
      <span className="tabular-nums font-medium text-gray-900">{formatCad(amount)}</span>
    </div>
  );
}

interface PrintSummaryProps {
  result: TaxCalculationResult;
}

export function PrintSummary({ result }: PrintSummaryProps) {
  const isRefund = result.balanceOwing < 0;
  const today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="hidden print:block font-sans text-gray-900 p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-800">
        <div>
          <p className="text-xl font-bold text-gray-900">TaxAgent.ai</p>
          <p className="text-sm text-gray-500">2025 Ontario T1 Return — Estimate</p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>Generated: {today}</p>
          <p>This is an estimate only. Review before filing.</p>
        </div>
      </div>

      {/* Income */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Income</h2>
        {(result.lineByLine[10100] ?? 0) > 0 && (
          <PrintRow label="Employment income" line={10100} amount={result.lineByLine[10100] ?? 0} />
        )}
        {(result.lineByLine[11900] ?? 0) > 0 && (
          <PrintRow label="EI benefits" line={11900} amount={result.lineByLine[11900] ?? 0} />
        )}
        {(result.lineByLine[12100] ?? 0) > 0 && (
          <PrintRow label="Interest and investment income" line={12100} amount={result.lineByLine[12100] ?? 0} />
        )}
        {(result.lineByLine[12000] ?? 0) > 0 && (
          <PrintRow label="Taxable eligible dividends" line={12000} amount={result.lineByLine[12000] ?? 0} />
        )}
        {(result.lineByLine[11500] ?? 0) > 0 && (
          <PrintRow label="Pension / other income" line={11500} amount={result.lineByLine[11500] ?? 0} />
        )}
        <div className="flex justify-between gap-4 py-2 text-sm font-semibold">
          <span className="text-gray-500">L15000 Total income</span>
          <span className="tabular-nums">{formatCad(result.totalIncome)}</span>
        </div>
      </section>

      {/* Net / Taxable Income */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Adjusted Income</h2>
        <PrintRow label="Net income" line={23600} amount={result.netIncome} />
        <PrintRow label="Taxable income" line={26000} amount={result.taxableIncome} />
      </section>

      {/* Federal Tax */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Federal Tax</h2>
        <PrintRow label="Federal tax on income" line={40400} amount={result.federalTaxOnIncome} />
        <PrintRow label="Federal non-refundable credits" line={35000} amount={result.federalNonRefundableCredits} />
        <PrintRow label="Net federal tax" line={42000} amount={result.netFederalTax} />
        {(result.lineByLine[41000] ?? 0) > 0 && (
          <PrintRow label="CPP contributions payable" line={41000} amount={result.lineByLine[41000] ?? 0} />
        )}
      </section>

      {/* Ontario Tax */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Ontario Tax</h2>
        <PrintRow label="Ontario tax on income" amount={result.ontarioTaxOnIncome} />
        <PrintRow label="Ontario non-refundable credits" amount={result.ontarioNonRefundableCredits} />
        <PrintRow label="Net Ontario tax" line={42800} amount={result.netOntarioTax} />
        {result.ontarioSurtax > 0 && (
          <PrintRow label="Ontario surtax" amount={result.ontarioSurtax} />
        )}
      </section>

      {/* Summary */}
      <section className="mt-6 pt-4 border-t-2 border-gray-800">
        <PrintRow label="Total income tax deducted" line={43700} amount={result.totalTaxDeducted} />
        <div className="flex justify-between gap-4 py-3 text-base font-bold">
          <span className={isRefund ? 'text-green-700' : 'text-red-700'}>
            {isRefund ? 'Estimated refund' : 'Balance owing'}
          </span>
          <span className={`tabular-nums ${isRefund ? 'text-green-700' : 'text-red-700'}`}>
            {formatCad(Math.abs(result.balanceOwing))}
          </span>
        </div>
      </section>

      {/* Rates */}
      <section className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Marginal rate</p>
          <p className="font-semibold">{(result.combinedMarginalRate * 100).toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Effective rate</p>
          <p className="font-semibold">{(result.averageTaxRate * 100).toFixed(2)}%</p>
        </div>
      </section>

      <p className="mt-8 text-xs text-gray-400 text-center">
        TaxAgent.ai · 2025 Ontario T1 Estimate · Generated {today} · For informational purposes only. Verify all amounts with CRA before filing.
      </p>
    </div>
  );
}
