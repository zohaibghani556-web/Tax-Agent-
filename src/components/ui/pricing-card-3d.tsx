'use client';

/**
 * PricingCard3D
 *
 * Pricing card with mouse-tracking 3D tilt perspective effect.
 * Uses Framer Motion useMotionValue + useSpring + useTransform to derive
 * rotateX / rotateY from the cursor position relative to the card center.
 * transformStyle: "preserve-3d" creates genuine depth — child elements
 * use translateZ to float at different Z-layers.
 *
 * Popular variant emits an emerald glow via box-shadow.
 */

import React, { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

export interface PricingCardProps {
  planName: string;
  price: string;
  period: string;
  features: string[];
  isPopular?: boolean;
  ctaLabel: string;
  onCtaClick?: () => void;
}

/** Max tilt angle in degrees */
const MAX_TILT = 12;

export function PricingCard3D({
  planName,
  price,
  period,
  features,
  isPopular = false,
  ctaLabel,
  onCtaClick,
}: PricingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Raw mouse position as fraction from center [-0.5, 0.5]
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring physics for smooth, physical-feeling tilt
  const springConfig = { stiffness: 260, damping: 28 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Map mouse fraction to rotation degrees
  const rotateX = useTransform(springY, [-0.5, 0.5], [`${MAX_TILT}deg`, `-${MAX_TILT}deg`]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [`-${MAX_TILT}deg`, `${MAX_TILT}deg`]);

  // Subtle scale-up on hover via spring
  const scale = useSpring(1, { stiffness: 300, damping: 25 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xFraction = (e.clientX - rect.left) / rect.width - 0.5;
    const yFraction = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xFraction);
    mouseY.set(yFraction);
    scale.set(1.03);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
    scale.set(1);
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        scale,
        transformStyle: 'preserve-3d',
        perspective: '1200px',
      }}
      className="relative w-full max-w-sm cursor-pointer select-none"
    >
      {/* Card shell */}
      <div
        className="relative rounded-2xl overflow-hidden p-px"
        style={{
          background: isPopular
            ? 'linear-gradient(135deg, var(--emerald) 0%, #0d9488 50%, var(--navy) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          boxShadow: isPopular
            ? '0 0 40px rgba(16, 185, 129, 0.35), 0 20px 60px rgba(0, 0, 0, 0.5)'
            : '0 20px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          className="rounded-2xl p-8"
          style={{ background: '#0d1f3c' }}
        >
          {/* Popular badge — floats at Z+20 */}
          {isPopular && (
            <motion.div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{
                background: 'linear-gradient(90deg, var(--emerald), #0d9488)',
                color: 'var(--white)',
                translateZ: '20px',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
              Most Popular
            </motion.div>
          )}

          {/* Plan name — Z+10 */}
          <motion.p
            className="text-sm font-medium uppercase tracking-widest mb-2"
            style={{
              color: isPopular ? 'var(--emerald)' : 'rgba(255,255,255,0.5)',
              translateZ: '10px',
            }}
          >
            {planName}
          </motion.p>

          {/* Price — Z+30 for maximum depth pop */}
          <motion.div
            className="flex items-end gap-1 mb-1"
            style={{ translateZ: '30px' }}
          >
            <span
              className="text-5xl font-bold tracking-tight"
              style={{ color: '#f0f9f6' }}
            >
              {price}
            </span>
          </motion.div>

          <motion.p
            className="text-sm mb-8"
            style={{ color: 'rgba(255,255,255,0.4)', translateZ: '10px' }}
          >
            {period}
          </motion.p>

          {/* Divider */}
          <motion.div
            className="h-px mb-6"
            style={{
              background: isPopular
                ? 'linear-gradient(90deg, var(--emerald) 0%, transparent 100%)'
                : 'rgba(255,255,255,0.07)',
              translateZ: '5px',
            }}
          />

          {/* Feature list — Z+15 */}
          <motion.ul
            className="space-y-3 mb-8"
            style={{ translateZ: '15px' }}
          >
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: 'rgba(16, 185, 129, 0.15)' }}
                >
                  <svg
                    className="w-3 h-3"
                    style={{ color: 'var(--emerald)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {feature}
                </span>
              </li>
            ))}
          </motion.ul>

          {/* CTA button — highest Z layer */}
          <motion.button
            onClick={onCtaClick}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1f3c]"
            style={{
              background: isPopular
                ? 'linear-gradient(135deg, var(--emerald) 0%, var(--emerald-dark) 100%)'
                : 'rgba(255,255,255,0.06)',
              color: isPopular ? '#fff' : 'rgba(255,255,255,0.7)',
              border: isPopular ? 'none' : '1px solid rgba(255,255,255,0.1)',
              translateZ: '35px',
              boxShadow: isPopular ? '0 4px 20px rgba(16, 185, 129, 0.3)' : 'none',
            }}
            whileHover={{
              background: isPopular
                ? 'linear-gradient(135deg, var(--emerald-dark) 0%, #047857 100%)'
                : 'rgba(255,255,255,0.1)',
            }}
            whileTap={{ scale: 0.97 }}
          >
            {ctaLabel}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default PricingCard3D;
