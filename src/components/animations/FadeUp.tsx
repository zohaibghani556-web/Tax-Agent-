'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
}

export function FadeUp({
  children,
  delay = 0,
  duration = 0.55,
  className = '',
  once = true,
  as = 'div',
}: FadeUpProps) {
  const prefersReduced = useReducedMotion();

  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
      whileInView={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
