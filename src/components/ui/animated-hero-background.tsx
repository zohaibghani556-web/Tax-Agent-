'use client';

/**
 * AnimatedHeroBackground
 *
 * CSS-only animated gradient blobs — no Framer Motion on the blobs themselves.
 * Animations are defined in a <style> block using @keyframes and run entirely
 * on the GPU compositor thread, so they never block the main thread.
 *
 * Performance notes:
 * - Only `transform` and `opacity` are animated (compositor-safe properties).
 * - `will-change: transform` is set to promote each blob to its own layer.
 * - Blobs are reduced from 6 to 3 to cut GPU memory usage.
 * - `filter: blur(80px)` is applied to the container once (not per-blob).
 */

import React from 'react';

interface AnimatedHeroBackgroundProps {
  children?: React.ReactNode;
  className?: string;
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
      {/* CSS keyframe animations — GPU compositor thread only */}
      <style>{`
        @keyframes blob-drift-1 {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0); }
          33%       { transform: translate(-50%, -50%) translate(8vw, 8vh); }
          66%       { transform: translate(-50%, -50%) translate(-5vw, 12vh); }
        }
        @keyframes blob-drift-2 {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0); }
          40%       { transform: translate(-50%, -50%) translate(-6vw, -8vh); }
          70%       { transform: translate(-50%, -50%) translate(5vw, 6vh); }
        }
        @keyframes blob-drift-3 {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0); }
          50%       { transform: translate(-50%, -50%) translate(7vw, -10vh); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-blob { animation: none !important; }
        }
      `}</style>

      {/* Blobs — blur applied to wrapper once to avoid per-element repaints */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
        style={{ filter: 'blur(70px)' }}
      >
        {/* Blob 1 — emerald, top-left */}
        <div
          className="hero-blob absolute rounded-full"
          style={{
            width: '55vw',
            height: '55vw',
            left: '5%',
            top: '5%',
            background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
            opacity: 0.22,
            willChange: 'transform',
            animation: 'blob-drift-1 24s ease-in-out infinite',
          }}
        />
        {/* Blob 2 — teal, top-right */}
        <div
          className="hero-blob absolute rounded-full"
          style={{
            width: '48vw',
            height: '48vw',
            left: '65%',
            top: '15%',
            background: 'radial-gradient(circle, #059669 0%, transparent 70%)',
            opacity: 0.16,
            willChange: 'transform',
            animation: 'blob-drift-2 30s ease-in-out infinite',
          }}
        />
        {/* Blob 3 — navy blue, bottom-center */}
        <div
          className="hero-blob absolute rounded-full"
          style={{
            width: '42vw',
            height: '42vw',
            left: '30%',
            top: '65%',
            background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)',
            opacity: 0.1,
            willChange: 'transform',
            animation: 'blob-drift-3 20s ease-in-out infinite',
          }}
        />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, rgba(10,22,40,0.7) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export default AnimatedHeroBackground;
