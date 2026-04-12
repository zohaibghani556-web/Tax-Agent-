'use client';

import { useEffect, useRef, useState } from 'react';
import type { TaxCalculationResult } from '@/lib/tax-engine/types';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

interface Props {
  result: TaxCalculationResult;
}

interface Segment {
  label: string;
  amount: number;
  color: string;
}

interface TooltipState {
  segment: Segment;
  x: number;
  y: number;
}

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

// SVG donut helpers
const CX = 100;
const CY = 100;
const R = 72;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * R;

interface ArcProps {
  startAngle: number;
  endAngle: number;
  color: string;
  strokeWidth: number;
  animated: boolean;
  animDelay: number;
  onMouseEnter?: (e: React.MouseEvent<SVGCircleElement>) => void;
  onMouseLeave?: () => void;
  onFocus?: (e: React.FocusEvent<SVGCircleElement>) => void;
  onBlur?: () => void;
  hovered: boolean;
  label: string;
}

function DonutArc({
  startAngle, endAngle, color, strokeWidth, animated, animDelay,
  onMouseEnter, onMouseLeave, onFocus, onBlur, hovered, label,
}: ArcProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const span = endAngle - startAngle;
  const dashLength = (span / 360) * CIRCUMFERENCE;
  // rotate the circle so the arc starts at startAngle
  const rotationDeg = startAngle - 90;

  useEffect(() => {
    const el = arcRef.current;
    if (!el) return;
    if (animated) {
      el.style.strokeDashoffset = String(CIRCUMFERENCE);
      el.style.transition = 'none';
      // Force reflow
      void el.getBoundingClientRect();
      el.style.transition = `stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1) ${animDelay}s`;
      el.style.strokeDashoffset = String(CIRCUMFERENCE - dashLength);
    } else {
      el.style.strokeDashoffset = String(CIRCUMFERENCE - dashLength);
    }
  }, [animated, animDelay, dashLength]);

  return (
    <circle
      ref={arcRef}
      cx={CX}
      cy={CY}
      r={R}
      fill="none"
      stroke={color}
      strokeWidth={hovered ? strokeWidth + 3 : strokeWidth}
      strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
      strokeDashoffset={CIRCUMFERENCE}
      strokeLinecap="round"
      transform={`rotate(${rotationDeg} ${CX} ${CY})`}
      style={{ transition: 'stroke-width 0.15s ease', cursor: 'pointer', outline: 'none' }}
      tabIndex={0}
      role="img"
      aria-label={label}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

// Count-up hook
function useCountUp(target: number, duration: number, enabled: boolean) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    startRef.current = null;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    const id = setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, 400);
    return () => {
      clearTimeout(id);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled]);

  return value;
}

export function TaxBreakdownChart({ result }: Props) {
  const prefersReduced = usePrefersReducedMotion();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cpp = (result.lineByLine[30800] ?? 0) + (result.lineByLine[31200] ?? 0);
  const total = result.totalIncome;
  const takeHome = Math.max(0, total - result.netFederalTax - result.netOntarioTax - cpp);

  const segments: Segment[] = [
    { label: 'Federal Tax', amount: result.netFederalTax, color: '#6366F1' },
    { label: 'Ontario Tax', amount: result.netOntarioTax, color: '#8B5CF6' },
    { label: 'CPP / EI', amount: cpp, color: '#F59E0B' },
    { label: 'Net Take-Home', amount: takeHome, color: '#10B981' },
  ].filter((s) => s.amount > 0);

  // Build angle ranges (with 1.5° gaps between segments)
  const GAP = 1.5;
  const totalGap = GAP * segments.length;
  const availableDeg = 360 - totalGap;
  const totalAmount = segments.reduce((s, seg) => s + seg.amount, 0);

  let cursor = 0;
  const arcs = segments.map((seg) => {
    const span = (seg.amount / totalAmount) * availableDeg;
    const start = cursor;
    const end = cursor + span;
    cursor = end + GAP;
    return { ...seg, startAngle: start, endAngle: end };
  });

  const effectiveRatePct = result.averageTaxRate * 100;
  const displayRate = useCountUp(effectiveRatePct, 1200, !prefersReduced);

  function showTooltip(seg: Segment, e: React.MouseEvent<SVGCircleElement> | React.FocusEvent<SVGCircleElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'clientX' in e ? e.clientX : rect.left + rect.width / 2;
    const clientY = 'clientY' in e ? e.clientY : rect.top + 60;
    setTooltip({
      segment: seg,
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  }

  return (
    <div
      ref={containerRef}
      className="rounded-2xl p-6 relative"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <h3 className="text-sm font-semibold text-white/80 mb-5">Tax Breakdown</h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut */}
        <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
          <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Tax breakdown donut chart">
            {/* Track */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />

            {arcs.map((arc, i) => (
              <DonutArc
                key={arc.label}
                startAngle={arc.startAngle}
                endAngle={arc.endAngle}
                color={arc.color}
                strokeWidth={STROKE}
                animated={!prefersReduced}
                animDelay={i * 0.12}
                hovered={hovered === i}
                label={`${arc.label}: ${formatCad(arc.amount)}`}
                onMouseEnter={(e) => { setHovered(i); showTooltip(arc, e); }}
                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                onFocus={(e) => { setHovered(i); showTooltip(arc, e); }}
                onBlur={() => { setHovered(null); setTooltip(null); }}
              />
            ))}
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black tabular-nums text-white leading-none">
              {displayRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wide mt-1">Effective</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-3">
          {arcs.map((seg, i) => {
            const pctOfTotal = totalAmount > 0 ? (seg.amount / totalAmount) * 100 : 0;
            return (
              <button
                key={seg.label}
                type="button"
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                style={{
                  background: hovered === i ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${hovered === i ? seg.color + '40' : 'rgba(255,255,255,0.06)'}`,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ background: seg.color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-white/70">{seg.label}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold tabular-nums text-white">{formatCad(seg.amount)}</span>
                  <span className="text-xs text-white/35 ml-1.5">{pctOfTotal.toFixed(1)}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none rounded-xl px-3 py-2 text-sm shadow-xl"
          style={{
            background: 'rgba(15,23,42,0.95)',
            border: `1px solid ${tooltip.segment.color}40`,
            left: Math.min(tooltip.x + 12, (containerRef.current?.offsetWidth ?? 400) - 160),
            top: Math.max(tooltip.y - 48, 0),
            minWidth: 140,
          }}
        >
          <p className="font-semibold text-white">{tooltip.segment.label}</p>
          <p className="tabular-nums font-bold mt-0.5" style={{ color: tooltip.segment.color }}>
            {formatCad(tooltip.segment.amount)}
          </p>
          <p className="text-xs text-white/40">
            {totalAmount > 0 ? ((tooltip.segment.amount / totalAmount) * 100).toFixed(1) : '0'}% of income
          </p>
        </div>
      )}
    </div>
  );
}
