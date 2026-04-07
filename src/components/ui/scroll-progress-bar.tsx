'use client';

/**
 * ScrollProgressBar
 *
 * A slim emerald-to-teal gradient bar fixed at the top of the viewport.
 * Reads window scroll via Framer Motion useScroll() — tracks scrollYProgress
 * (0 → 1 from top to bottom of page). A useSpring smooths rapid scroll events
 * into a fluid animation.
 *
 * A small circular percentage badge appears after 5% scroll and trails the
 * right end of the visible bar.
 */

import React, { useState } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from 'framer-motion';

/** Height of the progress bar in pixels */
const BAR_HEIGHT = 3;

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();

  // Spring smoothing — responsive but not twitchy
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 40,
    restDelta: 0.001,
  });

  // Track raw progress for the percentage badge
  const [percentage, setPercentage] = useState(0);
  const [showBadge, setShowBadge] = useState(false);

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const pct = Math.round(latest * 100);
    setPercentage(pct);
    setShowBadge(latest > 0.05);
  });

  // The badge follows the right edge of the visible bar.
  // barWidth goes 0% → 100% as progress goes 0 → 1.
  const badgeLeft = useTransform(smoothProgress, [0, 1], ['0%', '100%']);

  return (
    <>
      {/* Progress bar track (invisible background, just for positioning) */}
      <div
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{ height: BAR_HEIGHT }}
        aria-hidden="true"
      >
        {/* Filled bar */}
        <motion.div
          className="h-full origin-left"
          style={{
            scaleX: smoothProgress,
            background: 'linear-gradient(90deg, #10b981 0%, #0d9488 60%, #0891b2 100%)',
            boxShadow: `0 0 12px rgba(16, 185, 129, 0.7), 0 0 4px rgba(16, 185, 129, 0.5)`,
          }}
        />

        {/* Glowing leading edge */}
        <motion.div
          className="absolute top-0 -translate-x-full pointer-events-none"
          style={{
            left: badgeLeft,
            width: 20,
            height: BAR_HEIGHT,
            background:
              'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), #10b981)',
            filter: 'blur(3px)',
          }}
        />
      </div>

      {/* Percentage badge */}
      <motion.div
        className="fixed z-50 pointer-events-none"
        style={{
          top: BAR_HEIGHT + 6,
          left: badgeLeft,
          translateX: '-50%',
        }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{
          opacity: showBadge ? 1 : 0,
          scale: showBadge ? 1 : 0.7,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        aria-hidden="true"
      >
        <div
          className="flex items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
          style={{
            width: 32,
            height: 32,
            background: 'rgba(10, 22, 40, 0.85)',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {percentage}%
        </div>
      </motion.div>
    </>
  );
}

export default ScrollProgressBar;
