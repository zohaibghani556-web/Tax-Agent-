'use client';

import { Sparkles } from 'lucide-react';

interface UpgradePromptProps {
  featureName: string;
  /** Children are the actual feature content — shown when `show` is false (user has access). */
  children: React.ReactNode;
  /** Set to true to show the feature, false to show the upgrade wall. Default: true (MVP — all users have access). */
  show?: boolean;
}

/**
 * UpgradePrompt — wraps a Pro-gated feature.
 *
 * When `show` is false (future paid gating), renders a blurred overlay with
 * an upgrade call-to-action. When `show` is true (default, MVP), renders children.
 *
 * Usage:
 *   <UpgradePrompt featureName="What-If Engine" show={hasAccess('what-if-engine', tier)}>
 *     <WhatIfEngine ... />
 *   </UpgradePrompt>
 */
export function UpgradePrompt({ featureName, children, show = true }: UpgradePromptProps) {
  if (show) return <>{children}</>;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred preview of the actual content */}
      <div className="blur-sm pointer-events-none select-none" aria-hidden>
        {children}
      </div>

      {/* Upgrade overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl"
        style={{ background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(2px)' }}
      >
        <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-amber-400" />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-semibold text-white">{featureName}</p>
          <p className="text-xs text-white/50 mt-1">Available on TaxAgent Pro</p>
        </div>
        <a
          href="/settings"
          className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-400 transition-colors"
        >
          Upgrade to Pro
        </a>
      </div>
    </div>
  );
}
