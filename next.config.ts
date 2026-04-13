import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// ── Content Security Policy ──────────────────────────────────────────────────
// Protects against XSS: restricts where scripts, styles, and connections can
// originate. Next.js requires 'unsafe-inline' for style-src due to its CSS-in-JS
// runtime. script-src 'unsafe-inline' is required for Next.js hydration chunks.
const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for inline scripts (hydration)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind/Next.js inject inline styles at runtime
  "style-src 'self' 'unsafe-inline'",
  // Images: self, data URIs (base64 previews), blob: (OCR canvas)
  "img-src 'self' data: blob:",
  // API calls: Supabase REST + Realtime WS, Anthropic (server-side only, but defense in depth)
  [
    "connect-src 'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    // Vercel Analytics beacon
    'https://vitals.vercel-insights.com',
    'https://va.vercel-scripts.com',
    // Sentry error reporting
    'https://*.ingest.sentry.io',
    'https://*.ingest.us.sentry.io',
  ].join(' '),
  "font-src 'self'",
  // No iframes ever — defense against clickjacking at the CSP level too
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Upgrade any accidental HTTP sub-resource to HTTPS
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  // @xenova/transformers uses native Node.js modules (fs, path, onnxruntime-node)
  // that webpack cannot bundle. Mark it as an external so Next.js skips bundling
  // and lets Node.js require() it at runtime in API routes.
  serverExternalPackages: ['@xenova/transformers'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy — primary XSS defence
          { key: 'Content-Security-Policy', value: CSP },
          // Prevent this site from being embedded in iframes (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Force HTTPS for 1 year, include subdomains
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Block XSS in older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Restrict referrer to same-origin — prevents URL with PII leaking
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features not needed by this app
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
      {
        // API routes: no caching of sensitive responses
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress noisy build output when SENTRY_AUTH_TOKEN is not set (local dev)
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source map upload — only runs when SENTRY_AUTH_TOKEN is present (CI/Vercel)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Don't expose source maps in the browser bundle
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  webpack: {
    // Suppress SDK logger calls in production bundles (replaces deprecated disableLogger)
    treeshake: { removeDebugLogging: true },
    // Don't auto-create Vercel Cron monitors (replaces deprecated automaticVercelMonitors)
    automaticVercelMonitors: false,
  },
});
