'use client';

/**
 * PIPEDA cookie consent banner.
 *
 * PIPEDA requires meaningful consent before collecting personal information.
 * This banner appears on first visit, records the user's choice in:
 *   1. localStorage — fast, same-device signal read by ConditionalAnalytics
 *   2. Supabase user_metadata — persists across devices for logged-in users
 *
 * On accept: fires 'taxagent:consent-accepted' so analytics activate
 * immediately without a page reload (handled by ConditionalAnalytics).
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const CONSENT_KEY = 'taxagent_cookie_consent';

async function persistConsentToSupabase(value: 'accepted' | 'declined') {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.auth.updateUser({
        data: {
          cookie_consent: value,
          cookie_consent_at: new Date().toISOString(),
        },
      });
    }
  } catch {
    // Non-critical — localStorage is the primary signal
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't made a choice yet (check localStorage first,
    // then fall back to checking Supabase user_metadata for returning users on
    // a new device).
    async function checkConsent() {
      try {
        const existing = localStorage.getItem(CONSENT_KEY);
        if (existing) return; // already decided on this device

        // Check Supabase for cross-device preference
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user?.user_metadata?.cookie_consent) {
          // Sync the stored preference to this device silently
          localStorage.setItem(CONSENT_KEY, data.user.user_metadata.cookie_consent as string);
          if (data.user.user_metadata.cookie_consent === 'accepted') {
            window.dispatchEvent(new Event('taxagent:consent-accepted'));
          }
          return;
        }

        setVisible(true);
      } catch {
        setVisible(true);
      }
    }
    checkConsent();
  }, []);

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
      window.dispatchEvent(new Event('taxagent:consent-accepted'));
    } catch { /* ignore */ }
    persistConsentToSupabase('accepted');
    setVisible(false);
  }

  function decline() {
    try {
      localStorage.setItem(CONSENT_KEY, 'declined');
    } catch { /* ignore */ }
    persistConsentToSupabase('declined');
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
            className="text-sm font-semibold text-white px-4 py-1.5 rounded-lg bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] transition-colors"
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
