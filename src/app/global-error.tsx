'use client';

/**
 * Global error boundary for the Next.js App Router.
 * Catches unhandled errors in the root layout and React render tree,
 * reports them to Sentry, and shows a recovery UI.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-CA">
      <body style={{ margin: 0, background: '#0a1020', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '22px',
            }}>
              ⚠
            </div>
            <h1 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
              Something went wrong
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: '14px', color: 'rgba(255,255,255,0.50)', lineHeight: 1.6 }}>
              An unexpected error occurred. Your data is safe — this error has been logged and we&apos;ll look into it.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  background: 'var(--emerald)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '11px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              {/* global-error must render its own <html> — next/link is unavailable here */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  display: 'inline-block',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.50)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '100px',
                  padding: '11px 24px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Go home
              </a>
            </div>
            {error.digest && (
              <p style={{ marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.20)', fontFamily: 'monospace' }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
