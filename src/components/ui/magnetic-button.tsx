'use client';

/**
 * MagneticButton
 *
 * A wrapper that applies a magnetic pull toward the cursor when the mouse
 * enters a configurable radius around the element. The attraction strength
 * scales with proximity — strongest at the center, zero at the radius edge.
 *
 * Uses Framer Motion useMotionValue + useSpring for smooth, physical spring-back.
 * Attaches a single window mousemove listener to avoid re-renders.
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export interface MagneticButtonProps {
  children: React.ReactNode;
  /** Magnetic attraction radius in pixels. Default: 150 */
  radius?: number;
  /** How strongly the button moves toward cursor. 0–1. Default: 0.45 */
  strength?: number;
  className?: string;
}

export function MagneticButton({
  children,
  radius = 150,
  strength = 0.45,
  className = '',
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 180, damping: 16, mass: 0.8 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < radius) {
        // Proximity factor: 1 at center → 0 at radius edge
        const proximity = 1 - distance / radius;
        x.set(deltaX * proximity * strength);
        y.set(deltaY * proximity * strength);
        setIsActive(true);
      } else {
        x.set(0);
        y.set(0);
        setIsActive(false);
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [radius, strength, x, y]);

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x: springX, y: springY }}
      data-magnetic-active={isActive}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CTAButton — pre-styled emerald gradient button using MagneticButton
// ---------------------------------------------------------------------------

export interface CTAButtonProps {
  label?: string;
  onClick?: () => void;
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'emerald' | 'outline' | 'ghost';
}

const SIZE_CLASSES = {
  sm: 'px-5 py-2.5 text-sm',
  md: 'px-7 py-3.5 text-base',
  lg: 'px-9 py-4 text-lg',
} as const;

export function CTAButton({
  label = 'Start Free — File 2025 Taxes',
  onClick,
  href,
  size = 'md',
  variant = 'emerald',
}: CTAButtonProps) {
  const sizeClass = SIZE_CLASSES[size];

  const baseClass = `
    relative inline-flex items-center justify-center gap-2
    font-semibold rounded-full tracking-tight
    transition-all duration-200 cursor-pointer
    focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628]
    ${sizeClass}
  `.trim();

  const variantStyles: Record<string, React.CSSProperties> = {
    emerald: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
      color: '#fff',
      boxShadow: '0 4px 24px rgba(16, 185, 129, 0.4), 0 1px 0 rgba(255,255,255,0.1) inset',
    },
    outline: {
      background: 'transparent',
      color: '#10b981',
      border: '1.5px solid #10b981',
      boxShadow: '0 0 0 0 transparent',
    },
    ghost: {
      background: 'rgba(16, 185, 129, 0.08)',
      color: '#10b981',
    },
  };

  const content = (
    <motion.button
      type="button"
      className={baseClass}
      style={variantStyles[variant]}
      onClick={onClick}
      whileHover={{
        boxShadow:
          variant === 'emerald'
            ? '0 6px 32px rgba(16, 185, 129, 0.55), 0 1px 0 rgba(255,255,255,0.1) inset'
            : variantStyles[variant].boxShadow,
        filter: 'brightness(1.08)',
      }}
      whileTap={{ scale: 0.96 }}
    >
      {/* Subtle shimmer layer */}
      {variant === 'emerald' && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
        >
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{
              duration: 2.5,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        </span>
      )}

      <span className="relative z-10">{label}</span>

      {/* Arrow icon */}
      <motion.span
        className="relative z-10"
        animate={{ x: [0, 3, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </motion.span>
    </motion.button>
  );

  if (href) {
    return (
      <MagneticButton>
        <a href={href} className="inline-block">
          {content}
        </a>
      </MagneticButton>
    );
  }

  return <MagneticButton>{content}</MagneticButton>;
}

export default MagneticButton;
