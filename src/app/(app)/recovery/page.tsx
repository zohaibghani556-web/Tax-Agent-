'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle,
  X,
  RotateCcw,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addCsrfHeader } from '@/lib/csrf-client';
import type { RecoveryOpportunity } from '@/lib/recovery/recovery-engine';
import type { ParsedNOA } from '@/lib/recovery/noa-parser';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecoveryResponse {
  opportunities: RecoveryOpportunity[];
  totalRecoverable: number;
  noa: ParsedNOA;
}

type PageState =
  | { status: 'idle' }
  | { status: 'selected'; file: File }
  | { status: 'scanning'; fileName: string }
  | { status: 'results'; data: RecoveryResponse }
  | { status: 'error'; message: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

const CONFIDENCE_COLOR: Record<RecoveryOpportunity['confidence'], string> = {
  high:   'text-emerald-400',
  medium: 'text-amber-400',
  low:    'text-white/40',
};

const CONFIDENCE_LABEL: Record<RecoveryOpportunity['confidence'], string> = {
  high:   'High confidence',
  medium: 'Verify to confirm',
  low:    'If applicable',
};

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {children}
    </div>
  );
}

// ── Download T1-ADJ Guide ─────────────────────────────────────────────────────

function downloadGuide(data: RecoveryResponse): void {
  const { noa, opportunities, totalRecoverable } = data;
  const t1adjOps = opportunities.filter((o) => o.t1AdjRequired);
  const planningOps = opportunities.filter((o) => !o.t1AdjRequired);

  const lines: string[] = [
    `TaxAgent.ai — Retroactive Recovery Guide`,
    `Tax Year: ${noa.taxYear}`,
    `Generated: ${new Date().toLocaleDateString('en-CA')}`,
    ``,
    `═══════════════════════════════════════`,
    `TOTAL RECOVERABLE (T1-ADJ): ${formatCad(totalRecoverable)}`,
    `═══════════════════════════════════════`,
    ``,
    `CRA allows amendments going back 10 years (ITA s.152(4.2)).`,
    `File T1-ADJ online at My Account: canada.ca/my-cra-account`,
    `Or mail Form T1-ADJ to your CRA tax centre.`,
    ``,
  ];

  if (t1adjOps.length > 0) {
    lines.push(`── ITEMS REQUIRING T1-ADJ ──────────────`, ``);
    t1adjOps.forEach((op, i) => {
      lines.push(
        `${i + 1}. ${op.description}`,
        `   Line: ${op.lineNumber}`,
        `   Estimated amount: ${formatCad(op.estimatedAmount)}`,
        `   Confidence: ${CONFIDENCE_LABEL[op.confidence]}`,
        ``,
        `   How to claim:`,
        ...op.instructions.split('. ').map((s) => `   ${s.trim()}.`).filter((s) => s.trim() !== '.'),
        ``,
      );
    });
  }

  if (planningOps.length > 0) {
    lines.push(`── PLANNING OPPORTUNITIES ──────────────`, ``);
    planningOps.forEach((op, i) => {
      lines.push(
        `${i + 1}. ${op.description}`,
        `   Line: ${op.lineNumber}`,
        `   Potential value: ${formatCad(op.estimatedAmount)}`,
        ``,
        `   Action:`,
        `   ${op.instructions}`,
        ``,
      );
    });
  }

  lines.push(
    `───────────────────────────────────────`,
    `Disclaimer: These are estimates based on your NOA data.`,
    `Consult a tax professional for complex situations.`,
    `All amounts verified against CRA guidelines.`,
  );

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TaxAgent-Recovery-${noa.taxYear}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── OpportunityCard ───────────────────────────────────────────────────────────

function OpportunityCard({ op }: { op: RecoveryOpportunity }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        {/* Amount badge */}
        <div
          className="flex-shrink-0 rounded-xl px-3 py-2 text-center min-w-[80px]"
          style={{
            background: op.t1AdjRequired
              ? 'rgba(16,185,129,0.1)'
              : 'rgba(255,255,255,0.05)',
          }}
        >
          <p className={`text-base font-bold tabular-nums ${op.t1AdjRequired ? 'text-[var(--emerald)]' : 'text-white/60'}`}>
            {formatCad(op.estimatedAmount)}
          </p>
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">
            {op.description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-white/30">Line {op.lineNumber}</span>
            <span className="text-white/20">·</span>
            <span className={`text-xs ${CONFIDENCE_COLOR[op.confidence]}`}>
              {CONFIDENCE_LABEL[op.confidence]}
            </span>
            {op.t1AdjRequired && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-xs text-white/40">T1-ADJ required</span>
              </>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        {open
          ? <ChevronUp className="h-4 w-4 text-white/30 flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-white/30 flex-shrink-0" />
        }
      </button>

      {open && (
        <div
          className="px-5 pb-5 pt-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-sm text-white/60 leading-relaxed">{op.instructions}</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RecoveryPage() {
  const [state, setState] = useState<PageState>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [hasSpouse, setHasSpouse] = useState(false);
  const [ageInput, setAgeInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setState({ status: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setState({ status: 'error', message: 'Unsupported file type. Use PNG, JPG, WebP, or PDF.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setState({ status: 'error', message: 'File too large. Maximum 10 MB.' });
      return;
    }
    setState({ status: 'selected', file });
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scan = async () => {
    if (state.status !== 'selected') return;
    const { file } = state;
    setState({ status: 'scanning', fileName: file.name });

    const fd = new FormData();
    fd.append('file', file);
    fd.append('hasSpouseOrDependant', String(hasSpouse));
    if (ageInput && !isNaN(parseInt(ageInput, 10))) {
      fd.append('ageOnDec31', ageInput);
    }

    try {
      const res = await fetch('/api/recovery', addCsrfHeader({ method: 'POST', body: fd }));
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        setState({ status: 'error', message: error ?? 'Could not read this document.' });
        return;
      }
      const data = (await res.json()) as RecoveryResponse;
      setState({ status: 'results', data });
    } catch {
      setState({ status: 'error', message: 'Network error. Please try again.' });
    }
  };

  // ── Results view ─────────────────────────────────────────────────────────────
  if (state.status === 'results') {
    const { data } = state;
    const { opportunities, totalRecoverable, noa } = data;
    const t1adjOps = opportunities.filter((o) => o.t1AdjRequired);
    const planningOps = opportunities.filter((o) => !o.t1AdjRequired);

    return (
      <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400 mb-2">
              Recovery results
            </p>
            <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.015em' }}>
              {noa.taxYear} tax return scan
            </h1>
            <p className="text-white/40 mt-1 text-sm">{noa.taxpayerName || 'Your return'}</p>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mt-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Scan another
          </button>
        </div>

        {/* Total recoverable hero */}
        {totalRecoverable > 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-sm text-white/50 mb-2">Potentially recoverable via T1-ADJ</p>
            <p className="text-5xl font-black text-[var(--emerald)] tabular-nums">
              {formatCad(totalRecoverable)}
            </p>
            <p className="text-sm text-white/40 mt-3">
              CRA allows amendments going back 10 years.{' '}
              <a
                href="https://www.canada.ca/en/revenue-agency/services/about-canada-revenue-agency-cra/complaints-disputes/request-change-return.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--emerald)] hover:underline"
              >
                File a T1-ADJ at My Account
              </a>
            </p>
          </GlassCard>
        ) : (
          <GlassCard className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-[var(--emerald)] mx-auto mb-3" />
            <p className="text-lg font-semibold text-white">Your {noa.taxYear} return looks optimized</p>
            <p className="text-sm text-white/40 mt-2">
              No missed credits were detected based on the information in your NOA.
            </p>
          </GlassCard>
        )}

        {/* T1-ADJ opportunities */}
        {t1adjOps.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--emerald)]" />
              <p className="text-sm font-semibold text-white">
                {t1adjOps.length} missed credit{t1adjOps.length !== 1 ? 's' : ''} found
              </p>
              <span className="text-xs text-white/30 ml-auto">Click any row for instructions</span>
            </div>
            {t1adjOps.map((op, i) => (
              <OpportunityCard key={`adj-${i}`} op={op} />
            ))}
          </div>
        )}

        {/* Planning opportunities */}
        {planningOps.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/60">Planning opportunities</p>
            {planningOps.map((op, i) => (
              <OpportunityCard key={`plan-${i}`} op={op} />
            ))}
          </div>
        )}

        {/* Download guide CTA */}
        {opportunities.length > 0 && (
          <button
            onClick={() => downloadGuide(data)}
            className="w-full flex items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold text-white bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-colors"
          >
            <Download className="h-4 w-4 text-white" />
            Download T1-ADJ Recovery Guide
          </button>
        )}

        {/* Low confidence disclaimer */}
        {opportunities.some((o) => o.confidence === 'low') && (
          <p className="text-xs text-white/25 text-center">
            Items marked &quot;If applicable&quot; require you to verify eligibility before filing.
            Consult a tax professional for complex situations.
          </p>
        )}
      </div>
      </div>
    );
  }

  // ── Upload / idle / scanning / error views ────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--background)]">
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400 mb-3">
          Retroactive scanner
        </p>
        <h1 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: '-0.015em' }}>
          Recover money from past returns
        </h1>
        <p className="text-white/50 text-sm leading-relaxed">
          CRA allows amendments going back 10 years. Upload your old Notice of Assessment
          and we&apos;ll check for missed credits automatically.
        </p>
      </div>

      {/* ── Info cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Common missed credit', value: 'CWB', sub: 'Up to $1,518' },
          { label: 'Years you can go back', value: '10', sub: 'ITA s.152(4.2)' },
          { label: 'Process', value: 'T1-ADJ', sub: 'Free, online' },
        ].map((item) => (
          <GlassCard key={item.label} className="p-4 text-center">
            <p className="text-2xl font-black text-[var(--emerald)]">{item.value}</p>
            <p className="text-[10px] text-white/40 mt-1 leading-snug">{item.label}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{item.sub}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Context inputs ────────────────────────────────────────────── */}
      <GlassCard className="p-5 space-y-4">
        <p className="text-sm font-semibold text-white">Tell us a bit more (optional)</p>
        <p className="text-xs text-white/40 -mt-2">
          Helps us calculate your eligible credits more accurately.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <div
              onClick={() => setHasSpouse((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${hasSpouse ? 'bg-[var(--emerald)]' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${hasSpouse ? 'left-5' : 'left-1'}`} />
            </div>
            <span className="text-sm text-white/70">Had a spouse or dependant</span>
          </label>
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm text-white/50 whitespace-nowrap">Age on Dec 31:</span>
            <input
              type="number"
              placeholder="e.g. 68"
              min="18"
              max="100"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              className="w-20 rounded-lg px-3 py-1.5 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-white/25"
            />
          </div>
        </div>
      </GlassCard>

      {/* ── Upload zone ────────────────────────────────────────────────── */}
      <GlassCard className="p-5">
        <p className="text-sm font-semibold text-white mb-4">Upload your Notice of Assessment</p>

        {state.status === 'idle' && (
          <div className="space-y-3">
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload Notice of Assessment"
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              className="rounded-xl p-10 text-center cursor-pointer transition-colors"
              style={{
                border: `2px dashed ${isDragging ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.15)'}`,
                background: isDragging ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <Upload className="mx-auto mb-3 h-9 w-9 text-white/30" />
              <p className="text-base font-semibold text-white/70">Drop your NOA here</p>
              <p className="mt-1 text-sm text-white/40">or click to browse</p>
            </div>
            <p className="text-xs text-white/25 text-center flex items-center justify-center gap-1.5">
              <Shield className="h-3 w-3" />
              PDF, PNG, JPG, WebP · max 10 MB · not stored on our servers
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {state.status === 'selected' && (
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <FileText className="h-8 w-8 text-white/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 truncate">{state.file.name}</p>
                <p className="text-xs text-white/40">{(state.file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                onClick={reset}
                className="text-white/30 hover:text-white/60 transition-colors"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={scan} className="w-full rounded-full bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] shadow-[0_10px_30px_rgba(16,185,129,0.3)] gap-2">
              <TrendingUp className="h-4 w-4" />
              Scan for missed credits
            </Button>
          </div>
        )}

        {state.status === 'scanning' && (
          <div className="rounded-xl p-12 flex flex-col items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <Loader2 className="h-8 w-8 animate-spin text-[var(--emerald)]" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white/80">Scanning your return…</p>
              <p className="text-xs text-white/40 mt-1">
                Reading {state.fileName} · checking for missed credits
              </p>
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="space-y-3">
            <div
              className="rounded-xl p-5 space-y-3"
              style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-300">Could not read this document</p>
                  <p className="text-sm text-red-400/80 mt-0.5">{state.message}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={reset} className="border-red-400/30 text-red-300">
                Try again
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── What we check ────────────────────────────────────────────── */}
      <GlassCard className="p-5">
        <p className="text-sm font-semibold text-white mb-4">What we check</p>
        <div className="space-y-3">
          {[
            {
              name: 'Canada Workers Benefit (CWB)',
              detail: 'Line 45300 — refundable credit for low-income workers. Up to $1,518 single, $2,616 family.',
            },
            {
              name: 'Age Amount (65+)',
              detail: 'Line 30100 — up to $1,319 federal credit if you were 65+ and it wasn\'t claimed.',
            },
            {
              name: 'Tuition carryforward',
              detail: 'Line 32300 — unused tuition credits carry forward indefinitely. Each $1 of carryforward = 15¢ off your taxes.',
            },
            {
              name: 'RRSP contribution room',
              detail: 'Line 20800 — if you have unused room, contributing now reduces future taxes significantly.',
            },
          ].map((item) => (
            <div key={item.name} className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-[var(--emerald)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white/80">{item.name}</p>
                <p className="text-xs text-white/40 mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
    </div>
  );
}
