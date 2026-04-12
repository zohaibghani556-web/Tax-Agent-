'use client';

import { useEffect, useRef, useState } from 'react';

interface Step {
  label: string;
  done: boolean;
}

interface Props {
  assessmentDone: boolean;
  hasSlips: boolean;
  hasCalculation: boolean;
  hasFilingGuide: boolean;
}

const CX = 90;
const CY = 90;
const R = 72;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * R;

// Color thresholds
function ringColor(pct: number): string {
  if (pct >= 100) return '#10B981'; // emerald
  if (pct >= 51) return '#6366F1';  // indigo
  return '#F59E0B';                  // amber
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
      setValue(Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    const id = setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, 100);
    return () => {
      clearTimeout(id);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled]);

  return value;
}

export function CompletionRing({ assessmentDone, hasSlips, hasCalculation, hasFilingGuide }: Props) {
  // Detect reduced motion via media query (not a hook from framer-motion — keeps this dep-free)
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const steps: Step[] = [
    { label: 'Assessment', done: assessmentDone },
    { label: 'Slips uploaded', done: hasSlips },
    { label: 'Calculation', done: hasCalculation },
    { label: 'Filing guide', done: hasFilingGuide },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  const displayPct = useCountUp(pct, 1000, !prefersReduced);
  const color = ringColor(pct);

  // SVG ring ref for animation
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const filled = (pct / 100) * CIRCUMFERENCE;
    if (prefersReduced) {
      el.style.strokeDashoffset = String(CIRCUMFERENCE - filled);
      return;
    }
    el.style.strokeDashoffset = String(CIRCUMFERENCE);
    el.style.transition = 'none';
    void el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1) 0.1s, stroke 0.4s ease';
    el.style.strokeDashoffset = String(CIRCUMFERENCE - filled);
  }, [pct, prefersReduced]);

  // Pulse glow at 100%
  const [glowDone, setGlowDone] = useState(false);
  useEffect(() => {
    if (pct === 100 && !prefersReduced) {
      const t = setTimeout(() => setGlowDone(true), 1200);
      return () => clearTimeout(t);
    }
  }, [pct, prefersReduced]);

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          {/* Glow effect at 100% */}
          {pct === 100 && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: `0 0 32px 8px ${color}50`,
                animation: glowDone ? 'none' : 'pulse 1s ease-out forwards',
                opacity: glowDone ? 0.4 : 1,
              }}
            />
          )}

          <svg
            viewBox="0 0 180 180"
            className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px]"
            role="img"
            aria-label={`Filing completion: ${pct}%`}
          >
            {/* Track */}
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={STROKE}
            />
            {/* Progress arc — rotated so it starts at top */}
            <circle
              ref={ringRef}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={CIRCUMFERENCE}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className="text-3xl font-black tabular-nums leading-none"
              style={{ color }}
            >
              {displayPct}%
            </span>
            <span className="text-[11px] text-white/40 font-semibold uppercase tracking-wide mt-1">
              Complete
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 w-full">
          <p className="text-sm font-semibold text-white/80 mb-4">Filing checklist</p>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {/* Dot */}
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0 transition-colors duration-300"
                  style={{
                    background: step.done ? color : 'transparent',
                    border: `2px solid ${step.done ? color : 'rgba(255,255,255,0.2)'}`,
                    boxShadow: step.done ? `0 0 6px ${color}60` : 'none',
                  }}
                />
                <span
                  className="text-sm transition-colors duration-300"
                  style={{ color: step.done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}
                >
                  {step.label}
                </span>
                {step.done && (
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
                    Done
                  </span>
                )}
              </div>
            ))}
          </div>

          {pct < 100 && (
            <p className="text-xs text-white/30 mt-4 leading-snug">
              {completedCount} of {steps.length} steps complete
              {completedCount === 0 ? ' — start your assessment to begin.' : '.'}
            </p>
          )}
          {pct === 100 && (
            <p className="text-xs mt-4 font-semibold" style={{ color }}>
              Your return is ready to file.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
