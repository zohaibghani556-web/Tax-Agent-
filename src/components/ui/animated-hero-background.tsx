'use client';

/**
 * AnimatedHeroBackground
 *
 * Full-screen hero section with slowly drifting radial gradient blobs.
 * Pure CSS radial gradients animated via Framer Motion — no Three.js, no shaders.
 * Color palette: navy (#0a1628, #0d1f3c) and emerald (#10b981, #059669).
 *
 * Each blob has its own drift animation with a different duration so they
 * never move in sync, creating an organic "living mesh" appearance.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface BlobConfig {
  id: number;
  color: string;
  size: string;
  initialX: string;
  initialY: string;
  animateX: string[];
  animateY: string[];
  duration: number;
  opacity: number;
}

const BLOBS: BlobConfig[] = [
  {
    id: 1,
    color: '#10b981',
    size: '60vw',
    initialX: '-10%',
    initialY: '-15%',
    animateX: ['-10%', '5%', '-5%', '-10%'],
    animateY: ['-15%', '-5%', '5%', '-15%'],
    duration: 22,
    opacity: 0.25,
  },
  {
    id: 2,
    color: '#059669',
    size: '50vw',
    initialX: '60%',
    initialY: '10%',
    animateX: ['60%', '50%', '65%', '60%'],
    animateY: ['10%', '20%', '5%', '10%'],
    duration: 28,
    opacity: 0.18,
  },
  {
    id: 3,
    color: '#0d9488',
    size: '45vw',
    initialX: '20%',
    initialY: '55%',
    animateX: ['20%', '30%', '15%', '20%'],
    animateY: ['55%', '45%', '60%', '55%'],
    duration: 18,
    opacity: 0.15,
  },
  {
    id: 4,
    color: '#10b981',
    size: '35vw',
    initialX: '75%',
    initialY: '60%',
    animateX: ['75%', '65%', '80%', '75%'],
    animateY: ['60%', '70%', '55%', '60%'],
    duration: 25,
    opacity: 0.12,
  },
  {
    id: 5,
    color: '#1d4ed8',
    size: '55vw',
    initialX: '30%',
    initialY: '-10%',
    animateX: ['30%', '40%', '25%', '30%'],
    animateY: ['-10%', '0%', '-20%', '-10%'],
    duration: 32,
    opacity: 0.1,
  },
  {
    id: 6,
    color: '#047857',
    size: '40vw',
    initialX: '-5%',
    initialY: '70%',
    animateX: ['-5%', '5%', '-10%', '-5%'],
    animateY: ['70%', '60%', '75%', '70%'],
    duration: 20,
    opacity: 0.14,
  },
];

interface AnimatedHeroBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  /** Override minimum height. Defaults to "100vh" */
  minHeight?: string;
}

export function AnimatedHeroBackground({
  children,
  className = '',
  minHeight = '100vh',
}: AnimatedHeroBackgroundProps) {
  return (
    <section
      className={`relative w-full overflow-hidden ${className}`}
      style={{ minHeight, background: '#0a1628' }}
    >
      {/* SVG noise filter — subtle grain texture */}
      <svg className="absolute inset-0 w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="hero-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
              result="noiseOut"
            />
            <feColorMatrix
              type="saturate"
              values="0"
              in="noiseOut"
              result="grayNoise"
            />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blended" />
            <feComposite in="blended" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* Drifting gradient blobs */}
      <div
        className="absolute inset-0 overflow-hidden"
        aria-hidden="true"
        style={{ filter: 'blur(80px)' }}
      >
        {BLOBS.map((blob) => (
          <motion.div
            key={blob.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: blob.size,
              height: blob.size,
              background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
              opacity: blob.opacity,
              left: blob.initialX,
              top: blob.initialY,
              translateX: '-50%',
              translateY: '-50%',
            }}
            animate={{
              left: blob.animateX,
              top: blob.animateY,
            }}
            transition={{
              duration: blob.duration,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatType: 'loop',
            }}
          />
        ))}
      </div>

      {/* Subtle dark navy mesh grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Noise grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          opacity: 0.4,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Vignette — deep edge darkening */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, rgba(10, 22, 40, 0.7) 100%)',
        }}
      />

      {/* Content layer */}
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export default AnimatedHeroBackground;
