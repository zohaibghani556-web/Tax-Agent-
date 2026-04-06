'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimalPlaces?: number;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  className,
  prefix = '',
  suffix = '',
  decimalPlaces = 0,
}: NumberTickerProps) {
  const [displayed, setDisplayed] = useState(direction === 'up' ? 0 : value);
  const ref = useRef<HTMLSpanElement>(null);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          setTimeout(start, delay * 1000);
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    const duration = 1800;
    const from = direction === 'up' ? 0 : value;
    const to = direction === 'up' ? value : 0;

    function tick(timestamp: number) {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      setDisplayed(from + (to - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const formatted = new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(parseFloat(displayed.toFixed(decimalPlaces)));

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
