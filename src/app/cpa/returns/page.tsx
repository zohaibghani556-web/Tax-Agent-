'use client';

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Search,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  type ClientReturn,
  type FilterKey,
  type ReturnStatus,
  MOCK_RETURNS,
} from '@/lib/mock/cpa-returns';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtCAD(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
}

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  ReturnStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  'Ready to review': {
    bg: 'bg-emerald-500/[0.12]',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
  },
  Flagged: {
    bg: 'bg-amber-500/[0.12]',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
  },
  'Client action': {
    bg: 'bg-red-500/[0.12]',
    border: 'border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-500',
  },
  'In progress': {
    bg: 'bg-indigo-500/[0.12]',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    dot: 'bg-indigo-500',
  },
  Filed: {
    bg: 'bg-white/[0.05]',
    border: 'border-white/[0.15]',
    text: 'text-white/55',
    dot: 'bg-white/30',
  },
};

function StatusBadge({ status }: { status: ReturnStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold h-auto border',
        s.bg,
        s.border,
        s.text,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
      {status}
    </Badge>
  );
}

// ─── Flag chips ──────────────────────────────────────────────────────────────

function FlagChips({ flags }: { flags: string[] }) {
  if (flags.length === 0) {
    return <span className="text-white/30 text-[12px]">—</span>;
  }
  return (
    <div className="flex gap-1.5 flex-wrap">
      {flags.slice(0, 2).map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400/90 border border-amber-500/25 text-[11px] font-medium"
        >
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {f}
        </span>
      ))}
      {flags.length > 2 && (
        <span className="text-[11px] text-white/40 px-1.5 py-0.5">
          +{flags.length - 2}
        </span>
      )}
    </div>
  );
}

// ─── Expanded detail panel ───────────────────────────────────────────────────

function ExpandedDetail({ c }: { c: ClientReturn }) {
  return (
    <div className="px-5 py-5 bg-[#0a1628]/50 border-t border-white/5">
      <div className="grid md:grid-cols-4 gap-5">
        {/* Income summary */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-2">
            Income summary
          </p>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-white/55">Employment (T4)</span>
              <span className="text-white tabular-nums">{fmtCAD(c.breakdown.t4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">Investment (T5)</span>
              <span className="text-white tabular-nums">{fmtCAD(c.breakdown.t5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">Self-employment</span>
              <span className="text-white tabular-nums">{fmtCAD(c.breakdown.se)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-white/5 mt-1.5">
              <span className="text-white/80 font-medium">Total</span>
              <span className="text-white font-semibold tabular-nums">{fmtCAD(c.income)}</span>
            </div>
          </div>
        </div>

        {/* Slips */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-2">
            Slips
          </p>
          <div className="space-y-1.5 text-[13px]">
            {c.slips.map((s) => (
              <div key={s.type} className="flex justify-between">
                <span className="text-white/55">{s.type}</span>
                <span className="text-white/70">{s.state}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flagged items */}
        <div className="md:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.15em] text-amber-400 font-semibold mb-2">
            Flagged items
          </p>
          <div className="space-y-2">
            {c.flagDetails.length > 0 ? (
              c.flagDetails.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/20"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] text-white/85 font-medium">{f.title}</p>
                    <p className="text-[11px] text-white/50 mt-0.5">{f.body}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-white/40">No flags on this return.</p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              className="bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] text-white font-semibold text-[13px] px-4 h-9 rounded-full shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-colors"
              onClick={() => console.log('Open return →', c.id)}
            >
              Open return →
            </Button>
            <Button
              className="bg-white/[0.05] hover:bg-white/[0.10] text-white/80 font-semibold text-[13px] px-4 h-9 rounded-full border border-white/15 transition-colors"
              onClick={() => console.log('Message client', c.id)}
            >
              Message client
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop table row ───────────────────────────────────────────────────────

function ClientRow({
  c,
  open,
  onToggle,
}: {
  c: ClientReturn;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-t border-white/[0.05] hover:bg-white/[0.025] cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {/* Client */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 bg-white/[0.06] border border-white/10 flex-shrink-0">
              <AvatarFallback className="bg-white/[0.06] text-white/70 text-[12px] font-semibold">
                {c.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium text-[14px] leading-tight">{c.name}</p>
              <p className="text-[11px] text-white/40 font-mono mt-0.5">
                SIN ••• ••• {c.sinSuffix} · {c.type}
              </p>
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="px-5 py-4">
          <StatusBadge status={c.status} />
        </td>

        {/* Flags */}
        <td className="px-5 py-4">
          <FlagChips flags={c.flags} />
        </td>

        {/* Income */}
        <td className="px-5 py-4 text-right">
          <span className="text-white text-[14px] tabular-nums">{fmtCAD(c.income)}</span>
        </td>

        {/* Refund / Owing */}
        <td className="px-5 py-4 text-right">
          <span
            className={cn(
              'text-[14px] font-semibold tabular-nums',
              c.refund >= 0 ? 'text-emerald-400' : 'text-amber-400',
            )}
          >
            {c.refund >= 0 ? '+' : '-'}
            {fmtCAD(c.refund)}
          </span>
        </td>

        {/* Updated */}
        <td className="px-5 py-4 text-white/40 text-[12px] font-mono whitespace-nowrap">
          {c.updatedLabel}
        </td>

        {/* Chevron */}
        <td className="px-5 py-4 text-right">
          {open ? (
            <ChevronDown className="w-4 h-4 text-white/40 inline" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white/40 inline" />
          )}
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={7} className="p-0">
            <ExpandedDetail c={c} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Mobile card ─────────────────────────────────────────────────────────────

function ClientCard({
  c,
  open,
  onToggle,
}: {
  c: ClientReturn;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
      {/* Card header — tap to expand */}
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={onToggle}
      >
        <Avatar className="h-10 w-10 bg-white/[0.06] border border-white/10 flex-shrink-0 mt-0.5">
          <AvatarFallback className="bg-white/[0.06] text-white/70 text-[13px] font-semibold">
            {c.initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-white font-medium text-[14px] truncate">{c.name}</p>
            {open ? (
              <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-white/40 font-mono mb-2">
            SIN ••• ••• {c.sinSuffix} · {c.type}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            {c.flags.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400/90 border border-amber-500/25 text-[11px] font-medium">
                <AlertTriangle className="w-3 h-3" />
                {c.flags.length} flag{c.flags.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Refund / income row */}
      <div className="px-4 pb-3 flex justify-between text-[13px] border-t border-white/[0.05] pt-3">
        <div>
          <p className="text-white/40 text-[11px] mb-0.5">Income</p>
          <p className="text-white tabular-nums font-medium">{fmtCAD(c.income)}</p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-[11px] mb-0.5">
            {c.refund >= 0 ? 'Refund' : 'Owing'}
          </p>
          <p
            className={cn(
              'tabular-nums font-semibold',
              c.refund >= 0 ? 'text-emerald-400' : 'text-amber-400',
            )}
          >
            {c.refund >= 0 ? '+' : '-'}
            {fmtCAD(c.refund)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-[11px] mb-0.5">Updated</p>
          <p className="text-white/60 font-mono text-[12px]">{c.updatedLabel}</p>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-white/[0.05]">
          <ExpandedDetail c={c} />
        </div>
      )}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  delta: string;
  icon: React.ReactNode;
  valueClass?: string;
}

function StatCard({ label, value, delta, icon, valueClass }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
          {label}
        </p>
        <span className="text-white/30">{icon}</span>
      </div>
      <p
        className={cn(
          'text-[30px] font-bold tabular-nums leading-none tracking-[-0.02em]',
          valueClass ?? 'text-white',
        )}
      >
        {value}
      </p>
      <p className="text-[12px] text-white/45 mt-1.5">{delta}</p>
    </div>
  );
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

const FILTER_DEFS: { id: FilterKey; label: string; predicate: (c: ClientReturn) => boolean }[] = [
  { id: 'all',     label: 'All',           predicate: () => true },
  { id: 'ready',   label: 'Ready',         predicate: (c) => c.status === 'Ready to review' },
  { id: 'flagged', label: 'Flagged',       predicate: (c) => c.flags.length > 0 },
  { id: 'action',  label: 'Client action', predicate: (c) => c.status === 'Client action' },
  { id: 'filed',   label: 'Filed',         predicate: (c) => c.status === 'Filed' },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CPAReturnsPage() {
  const [openId, setOpenId] = useState<string | null>('c1');
  const [filter, setFilter] = useState<FilterKey>('all');

  function toggleRow(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  const filtered = MOCK_RETURNS.filter(
    FILTER_DEFS.find((d) => d.id === filter)!.predicate,
  );

  const pendingCount  = MOCK_RETURNS.filter((c) => ['Flagged', 'Client action', 'In progress'].includes(c.status)).length;
  const readyCount    = MOCK_RETURNS.filter((c) => c.status === 'Ready to review').length;
  const totalRefunds  = MOCK_RETURNS.filter((c) => c.refund > 0).reduce((s, c) => s + c.refund, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
      {/* ── Page header ───────────────────────────────────────── */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--emerald)] mb-1">
        REVIEW QUEUE
      </p>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-white font-bold text-[28px] md:text-[30px] tracking-[-0.02em]">
            Client returns · 2025 season
          </h1>
          <p className="text-white/55 text-[14px] mt-1">
            {MOCK_RETURNS.length} active returns · {pendingCount} need your attention · deadline April 30
          </p>
        </div>

        {/* Top-right actions */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Button
            className="w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 text-white/60 p-0 flex items-center justify-center"
            onClick={() => console.log('notifications')}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </Button>

          <Button
            className="bg-white/[0.05] hover:bg-white/[0.10] text-white/80 font-semibold text-[13px] px-4 h-9 rounded-full border border-white/15 transition-colors gap-1.5"
            onClick={() => console.log('TaxCycle export')}
          >
            <Download className="w-3.5 h-3.5" />
            TaxCycle export
          </Button>

          <Button
            className="bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] text-white font-semibold text-[13px] px-5 h-9 rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-colors gap-1.5"
            onClick={() => console.log('Invite client')}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite client
          </Button>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Pending review"
          value={String(pendingCount)}
          delta={`${MOCK_RETURNS.filter((c) => c.status === 'Flagged').length} flagged · ${MOCK_RETURNS.filter((c) => c.status === 'Client action').length} client action`}
          valueClass="text-amber-400"
          icon={<AlertCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Ready to file"
          value={String(readyCount)}
          delta="Awaiting your sign-off"
          valueClass="text-emerald-400"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          label="Household refunds"
          value={`$${(totalRefunds / 1000).toFixed(1)}k`}
          delta={`Across ${MOCK_RETURNS.length} open returns`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Avg. time saved"
          value="47 min"
          delta="Per return vs. last year"
          valueClass="text-indigo-400"
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* ── Table panel ───────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Tabs + search */}
        <div className="flex items-center justify-between gap-2 p-2 border-b border-white/[0.05] overflow-x-auto">
          <div className="flex items-center gap-1 flex-shrink-0">
            {FILTER_DEFS.map((def) => {
              const count = MOCK_RETURNS.filter(def.predicate).length;
              const active = filter === def.id;
              return (
                <button
                  key={def.id}
                  onClick={() => setFilter(def.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors',
                    active
                      ? 'bg-white/[0.06] text-white'
                      : 'text-white/55 hover:text-white hover:bg-white/[0.03]',
                  )}
                >
                  {def.label}
                  <span
                    className={cn(
                      'ml-1.5 text-[11px]',
                      active ? 'text-[var(--emerald)]' : 'text-white/35',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search (no-op placeholder) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-[12px] text-white/60 w-64 flex-shrink-0 mr-1">
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <Input
              className="bg-transparent border-none shadow-none outline-none p-0 h-auto text-[12px] placeholder:text-white/30 text-white/70 focus-visible:ring-0"
              placeholder="Search clients, SIN, slip..."
            />
            <kbd className="text-[10px] text-white/35 font-mono border border-white/10 rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.12em] text-white/35 font-semibold">
                <th className="px-5 py-3 text-left font-semibold">Client</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-left font-semibold">Flags</th>
                <th className="px-5 py-3 text-right font-semibold">Income</th>
                <th className="px-5 py-3 text-right font-semibold">Refund / Owing</th>
                <th className="px-5 py-3 text-left font-semibold">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <ClientRow
                  key={c.id}
                  c={c}
                  open={openId === c.id}
                  onToggle={() => toggleRow(c.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile card list ── */}
        <div className="md:hidden p-3 space-y-3">
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              c={c}
              open={openId === c.id}
              onToggle={() => toggleRow(c.id)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-white/40 text-[14px]">
            No returns match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
