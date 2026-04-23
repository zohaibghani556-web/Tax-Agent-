'use client';

/**
 * ConditionalAnalytics — loads Vercel SpeedInsights and initialises Sentry
 * only after the user has explicitly accepted the cookie consent banner.
 *
 * PIPEDA requires meaningful consent before collecting performance data.
 * Default state: denied. SpeedInsights and Sentry are never loaded until
 * the user clicks "Accept" in the CookieBanner.
 *
 * Listens for the 'taxagent:consent-accepted' custom event dispatched by
 * CookieBanner so analytics activates in the same page-session without a
 * reload.
 */

import { useEffect, useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const CONSENT_KEY = 'taxagent_cookie_consent';

export function ConditionalAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    function checkConsent() {
      try {
        setConsented(localStorage.getItem(CONSENT_KEY) === 'accepted');
      } catch {
        // localStorage unavailable — keep denied
      }
    }

    checkConsent();

    // Activate immediately when the user accepts in the same session
    window.addEventListener('taxagent:consent-accepted', checkConsent);
    return () => window.removeEventListener('taxagent:consent-accepted', checkConsent);
  }, []);

  // Dynamically init Sentry once consent is given. sentry.client.config.ts
  // will have already skipped init (no prior consent), so we do it here.
  useEffect(() => {
    if (!consented) return;
    import('@sentry/nextjs').then(({ init, getClient }) => {
      // Avoid double-init if Sentry was already initialised
      if (getClient()) return;
      init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        enabled: process.env.NODE_ENV === 'production',
      });
    });
  }, [consented]);

  if (!consented) return null;
  return <SpeedInsights />;
}
