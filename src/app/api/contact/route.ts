/**
 * TaxAgent.ai — Contact / CPA Lead Capture API Route
 *
 * POST /api/contact
 * Accepts { name, email, message, type } and emails zohaibghani556@gmail.com via Resend.
 *
 * Security:
 *   - Public route (no auth required — pre-login contact form)
 *   - Rate limited: 3 submissions per IP per hour
 *   - Input sanitized and length-capped server-side
 *
 * Setup required:
 *   1. npm install resend
 *   2. Add RESEND_API_KEY to .env.local and Vercel env vars
 *   3. Verify your sending domain at resend.com/domains (or use onboarding@resend.dev for testing)
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-process rate limiter: IP → { count, resetAt }
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function sanitize(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen);
}

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkIpRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = sanitize(body.name, 100);
  const email = sanitize(body.email, 200);
  const message = sanitize(body.message, 2000);
  const type = sanitize(body.type, 50) || 'General';

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: 'Name, email, and message are required.' },
      { status: 400 }
    );
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Fail gracefully in dev if key not set — log and return success so UI isn't broken
    console.warn('[contact] RESEND_API_KEY not set — email not sent');
    return NextResponse.json({ ok: true });
  }

  // Dynamically import resend so the route doesn't break if package isn't installed yet
  let Resend: typeof import('resend').Resend;
  try {
    const mod = await import('resend');
    Resend = mod.Resend;
  } catch {
    console.error('[contact] resend package not installed — run: npm install resend');
    return NextResponse.json({ ok: true }); // Fail gracefully
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    // Use Resend's shared domain for testing; swap to noreply@taxagent.ai once domain is verified
    from: 'TaxAgent.ai <onboarding@resend.dev>',
    to: 'zohaibghani556@gmail.com',
    replyTo: email,
    subject: `[TaxAgent] ${type} inquiry from ${name}`,
    html: `
      <h2>New ${type} inquiry — TaxAgent.ai</h2>
      <table>
        <tr><td><strong>Name:</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
        <tr><td><strong>Type:</strong></td><td>${type}</td></tr>
      </table>
      <hr />
      <p>${message.replace(/\n/g, '<br/>')}</p>
      <hr />
      <p style="color:#888;font-size:12px">Sent from taxagent.ai contact form · IP: ${ip}</p>
    `,
  });

  if (error) {
    console.error('[contact] Resend error:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
