'use client';

/**
 * PIPEDA cookie consent banner.
 *
 * PIPEDA requires meaningful consent before collecting personal information.
 * This banner appears on first visit, records the user's choice in localStorage,
 * and never re-appears once a decision is made.
 *
 * We don't use tracking cookies — Vercel Speed Insights is the only
 * third-party script and it's privacy-first (no fingerprinting).
 * This banner covers the legal consent requirement regardless.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const CONSENT_KEY = 'taxagent_cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't made a choice yet
    try {
      const existing = localStorage.getItem(CONSENT_KEY);
      if (!existing) setVisible(true);
    } catch {
      // localStorage unavailable (private browsing edge case) — don't show banner
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch { /* ignore */ }
    setVisible(false);
  }

  function decline() {
    try {
      localStorage.setItem(CONSENT_KEY, 'declined');
    } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie and privacy consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{
          background: 'rgba(10,16,32,0.97)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Text */}
        <p className="flex-1 text-sm text-white/60 leading-relaxed">
          We use essential cookies and store your tax data securely in Canada (AWS ca-central-1) in accordance with{' '}
          <Link
            href="/privacy"
            className="text-[#34d399] hover:underline focus:outline-none focus-visible:underline"
          >
            PIPEDA
          </Link>
          . No tracking or advertising cookies.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={decline}
            className="text-sm text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
            aria-label="Decline non-essential cookies"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="text-sm font-semibold text-white px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] transition-colors"
            aria-label="Accept cookies"
          >
            Accept
          </button>
          <button
            onClick={decline}
            className="text-white/30 hover:text-white/60 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
