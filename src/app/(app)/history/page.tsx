'use client';

/**
 * Calculation History — shows all saved T1 calculation snapshots for the user.
 * Each row shows the date, balance owing/refund, and key rates.
 * Clicking a row restores that result to localStorage for the calculator to use.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCalculationHistory } from '@/lib/supabase/tax-data';
import type { TaxCalculationResult } from '@/lib/tax-engine/types';
import { toast } from 'sonner';

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n);
}

interface HistoryEntry {
  id: string;
  createdAt: string;
  result: TaxCalculationResult;
}

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? '';
      if (!uid) { setLoading(false); return; }
      const history = await getCalculationHistory(uid, 2025);
      setEntries(history);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  function restoreResult(result: TaxCalculationResult) {
    localStorage.setItem('taxagent_calc_result', JSON.stringify(result));
    toast.success('Result restored — opening calculator');
    router.push('/calculator');
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Calculation History
        </h1>
        <p className="text-sm text-white/40 mt-0.5">Your saved 2025 T1 calculations — click any row to restore.</p>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div
          className="flex flex-col items-center gap-4 rounded-xl px-6 py-12 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}
        >
          <Clock className="h-10 w-10 text-white/20" />
          <div className="space-y-1">
            <p className="font-semibold text-white/70">No calculations yet</p>
            <p className="text-sm text-white/30">Run the calculator to create your first snapshot.</p>
          </div>
          <a
            href="/calculator"
            className="inline-flex items-center gap-2 rounded-full bg-[#10B981] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors"
          >
            Open calculator
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const isRefund = entry.result.balanceOwing < 0;
            const amount = Math.abs(entry.result.balanceOwing);
            const date = new Date(entry.createdAt);
            const isLatest = i === 0;

            return (
              <button
                key={entry.id}
                onClick={() => restoreResult(entry.result)}
                className="w-full text-left rounded-xl px-5 py-4 transition-colors group"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isRefund ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                      {isRefund
                        ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                        : <TrendingDown className="h-4 w-4 text-amber-400" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-base font-bold tabular-nums ${isRefund ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isRefund ? '+' : '-'}{formatCad(amount)}
                        </span>
                        <span className="text-xs text-white/30">
                          {isRefund ? 'refund' : 'owing'}
                        </span>
                        {isLatest && (
                          <span className="inline-flex items-center rounded-full bg-[#10B981]/20 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/30 mt-0.5">
                        {date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {' · '}
                        {date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-white/30">Marginal rate</p>
                      <p className="text-sm font-semibold text-white/70 tabular-nums">
                        {(entry.result.combinedMarginalRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-white/30">Taxable income</p>
                      <p className="text-sm font-semibold text-white/70 tabular-nums">
                        {formatCad(entry.result.taxableIncome)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/50 transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
