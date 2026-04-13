/**
 * Sentry browser SDK initialization.
 * Runs in the user's browser — keep this lightweight.
 * Replay is disabled: this is a tax app; we never record screens.
 */
import * as Sentry from '@sentry/nextjs';

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
