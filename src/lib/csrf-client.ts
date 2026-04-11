/**
 * TaxAgent.ai — CSRF double-submit cookie helpers (client-side).
 *
 * Reads the csrf_token cookie and injects it as an X-CSRF-Token request header.
 * The cookie is SameSite=Strict and NOT HttpOnly so JS can read it.
 *
 * Usage:
 *   import { addCsrfHeader } from '@/lib/csrf-client';
 *   const res = await fetch('/api/calculate', addCsrfHeader({ method: 'POST', ... }));
 */

/**
 * Reads the csrf_token cookie. If missing, generates and sets a new one.
 * The cookie is SameSite=Strict so it is only sent on same-origin requests.
 */
export function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  if (match?.[1]) return match[1];

  // Generate a new token using the Web Crypto API (available in all modern browsers)
  let token: string;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    let t = '';
    while (t.length < 64) t += Math.random().toString(36).slice(2);
    token = t.slice(0, 64);
  }

  // Set the cookie: SameSite=Strict, no HttpOnly so JS can read it
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `csrf_token=${token}; SameSite=Strict; Path=/${secure}`;
  return token;
}

/**
 * Returns a RequestInit with the X-CSRF-Token header added.
 * Merges with existing headers if provided.
 */
export function addCsrfHeader(init: RequestInit = {}): RequestInit {
  const token = getCsrfToken();
  return {
    ...init,
    headers: {
      ...init.headers,
      'X-CSRF-Token': token,
    },
  };
}
