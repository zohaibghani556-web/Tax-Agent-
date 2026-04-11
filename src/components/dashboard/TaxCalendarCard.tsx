'use client';

/**
 * TaxCalendarCard — shows the next 3 upcoming tax events in the dashboard.
 * Uses the deterministic TAX_CALENDAR_2025 list (no AI, no API calls).
 */

import { Calendar, AlertCircle, Info, CreditCard } from 'lucide-react';
import { getUpcomingEvents } from '@/lib/tax-calendar';
import type { TaxEvent } from '@/lib/tax-calendar';

function eventIcon(type: TaxEvent['type']) {
  if (type === 'deadline') return <AlertCircle className="h-4 w-4 text-amber-400" />;
  if (type === 'payment') return <CreditCard className="h-4 w-4 text-red-400" />;
  return <Info className="h-4 w-4 text-blue-400" />;
}

function urgencyStyle(daysUntil: number): string {
  if (daysUntil < 0) return 'text-white/30'; // past
  if (daysUntil <= 7) return 'text-red-400 font-bold';
  if (daysUntil <= 30) return 'text-amber-400 font-semibold';
  return 'text-white/60';
}

function formatDaysLabel(daysUntil: number): string {
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d ago`;
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil}d`;
}

export function TaxCalendarCard() {
  const events = getUpcomingEvents().slice(0, 3);

  if (events.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-white/40" />
        <h2 className="text-base font-semibold text-white">Tax calendar</h2>
      </div>

      <div className="space-y-3">
        {events.map((event, i) => {
          const daysUntil = event.daysUntil ?? 0;
          return (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl px-3 py-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="mt-0.5 shrink-0">{eventIcon(event.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80">{event.title}</p>
                <p className="text-xs text-white/35 mt-0.5 line-clamp-2">{event.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-xs tabular-nums ${urgencyStyle(daysUntil)}`}>
                  {formatDaysLabel(daysUntil)}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {new Date(event.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
