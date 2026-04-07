'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  /** If true, starts immediately on mount instead of waiting for scroll */
  immediate?: boolean;
}

export function CountUp({
  end,
  duration = 1.8,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  immediate = false,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const prefersReduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const started = useRef(false);

  const shouldStart = immediate || isInView;

  useEffect(() => {
    if (!shouldStart || started.current) return;
    started.current = true;

    if (prefersReduced) {
      setCount(end);
      return;
    }

    const durationMs = duration * 1000;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = end * eased;
      setCount(
        decimals > 0
          ? Math.round(current * 10 ** decimals) / 10 ** decimals
          : Math.round(current),
      );
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [shouldStart, end, duration, decimals, prefersReduced]);

  const formatted =
    decimals > 0
      ? count.toFixed(decimals)
      : count.toLocaleString('en-CA');

  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
