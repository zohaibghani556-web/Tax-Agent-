/**
 * Sentry browser SDK initialization.
 * Runs in the user's browser — keep this lightweight.
 * Replay is disabled: this is a tax app; we never record screens.
 *
 * PIPEDA: only initialise if the user has already accepted the cookie
 * consent banner. On first visit (no stored consent) this is a no-op.
 * ConditionalAnalytics will call Sentry.init() once the user accepts
 * in the same page-session.
 */
import * as Sentry from '@sentry/nextjs';

// Read consent synchronously — localStorage is available in the browser at
// this point (module runs after DOMContentLoaded in Next.js client bundles).
let hasConsent = false;
try {
  hasConsent = localStorage.getItem('taxagent_cookie_consent') === 'accepted';
} catch {
  // localStorage unavailable (e.g. private browsing) — stay disabled
}

if (hasConsent) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // 10% of transactions traced — enough to detect regressions without cost
    tracesSampleRate: 0.1,

    // Replay disabled — tax data on screen must never be recorded
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Don't send errors in development — noise, and devs see them in console
    enabled: process.env.NODE_ENV === 'production',
  });
}
