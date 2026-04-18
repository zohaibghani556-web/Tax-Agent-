'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  onDismiss: () => void;
}

function formatCad(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

// 40 particles with deterministic positions so SSR doesn't mismatch
const PARTICLES = Array.from({ length: 40 }, (_, i) => {
  const angle = (i / 40) * 2 * Math.PI + (i % 3) * 0.3;
  const radius = 80 + (i % 5) * 30;
  return {
    id: i,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    size: 4 + (i % 3) * 3,
    delay: (i % 8) * 0.06,
  };
});

function Particle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-[var(--emerald)] pointer-events-none"
      style={{ width: size, height: size, top: '50%', left: '50%', marginLeft: -size / 2, marginTop: -size / 2 }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y, opacity: 0, scale: 0.3 }}
      transition={{ duration: 1.2, delay, ease: [0.2, 0, 0.8, 1] }}
    />
  );
}

export function RefundReveal({ result, onDismiss }: Props) {
  const prefersReduced = usePrefersReducedMotion();
  const isRefund = result.balanceOwing < 0;
  const finalAmount = Math.abs(result.balanceOwing);

  // Count-up animation using requestAnimationFrame
  const [displayAmount, setDisplayAmount] = useState(prefersReduced ? finalAmount : 0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const DURATION = 1800; // ms

  useEffect(() => {
    if (prefersReduced) {
      setDisplayAmount(finalAmount);
      return;
    }
    // Small delay before count-up starts (panel slides in first)
    const timeout = setTimeout(() => {
      startTimeRef.current = null;
      function tick(ts: number) {
        if (startTimeRef.current === null) startTimeRef.current = ts;
        const elapsed = ts - startTimeRef.current;
        const progress = Math.min(elapsed / DURATION, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayAmount(Math.round(finalAmount * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }, 400);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [finalAmount, prefersReduced]);

  // Dismiss on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  const effectiveRate = (result.averageTaxRate * 100).toFixed(1) + '%';
  const federalTax = formatCad(result.netFederalTax);
  const ontarioTax = formatCad(result.netOntarioTax);

  const pills = [
    { label: 'Effective Rate', value: effectiveRate },
    { label: 'Federal Tax', value: federalTax },
    { label: 'Ontario Tax', value: ontarioTax },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.2 }}
        onClick={onDismiss}
        role="dialog"
        aria-modal="true"
        aria-label={isRefund ? 'Your estimated refund' : 'Amount owing'}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-sm sm:max-w-md mx-4 sm:mx-0 rounded-t-3xl sm:rounded-3xl overflow-hidden"
          style={{
            background: isRefund ? 'rgba(6,20,18,0.98)' : 'rgba(20,6,6,0.98)',
            border: `1px solid ${isRefund ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            boxShadow: isRefund
              ? '0 0 80px rgba(16,185,129,0.25), 0 32px 64px rgba(0,0,0,0.6)'
              : '0 0 80px rgba(239,68,68,0.2), 0 32px 64px rgba(0,0,0,0.6)',
          }}
          initial={prefersReduced ? { opacity: 0 } : { y: 80, opacity: 0 }}
          animate={prefersReduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={prefersReduced ? { opacity: 0 } : { y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-10 pb-8 text-center">
            {/* Verdict label */}
            <motion.p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: isRefund ? 'var(--emerald)' : 'var(--error)' }}
              initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              {isRefund ? 'Your Refund' : 'Amount Owing'}
            </motion.p>

            {/* Amount + particles */}
            <div className="relative inline-block">
              {/* Particles (refund only) */}
              {isRefund && !prefersReduced && (
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  {PARTICLES.map((p) => (
                    <Particle key={p.id} x={p.x} y={p.y} size={p.size} delay={p.delay + 0.4} />
                  ))}
                </div>
              )}

              <motion.p
                className="text-6xl sm:text-7xl font-black tabular-nums leading-none"
                style={{ color: isRefund ? 'var(--emerald)' : 'var(--error)' }}
                initial={prefersReduced ? {} : { scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4, ease: [0.2, 0, 0, 1.2] }}
              >
                {formatCad(displayAmount)}
              </motion.p>
            </div>

            <motion.p
              className="text-sm mt-3 mb-8"
              style={{ color: isRefund ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)' }}
              initial={prefersReduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.3 }}
            >
              {isRefund ? 'CRA owes you this for 2025' : 'Owing to CRA for 2025'}
            </motion.p>

            {/* Stat pills */}
            <div className="flex gap-2 justify-center mb-8" role="list">
              {pills.map((pill, i) => (
                <motion.div
                  key={pill.label}
                  role="listitem"
                  className="rounded-full px-3 py-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                >
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide">{pill.label}</p>
                  <p className="text-sm font-bold text-white tabular-nums mt-0.5">{pill.value}</p>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.button
              onClick={() => {
                onDismiss();
                setTimeout(() => {
                  document.getElementById('breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: isRefund ? 'var(--emerald)' : 'var(--error)' }}
              initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.3 }}
            >
              See Full Breakdown →
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
