# TaxAgent.ai — Security & Operations Notes

## Pre-Launch Key Rotation Checklist

Before going live, rotate all keys from their initial values:

### Anthropic API Key
- Go to: console.anthropic.com → API Keys
- Create a new key, update `ANTHROPIC_API_KEY` in Vercel environment variables
- Delete the old key immediately after confirming the new one works
- **Set a spend cap**: console.anthropic.com → Billing → Usage limits

### Supabase Anon Key
- Go to: Supabase dashboard → Project Settings → API
- The anon key is public-safe (RLS enforces data isolation) but rotate periodically
- Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel

### Supabase Service Role Key
- **HIGH SENSITIVITY** — this key bypasses RLS. Treat like a database root password.
- Go to: Supabase dashboard → Project Settings → API → service_role key
- Rotate every 90 days or immediately if exposed
- Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel
- Never log this key. Never commit it. Never expose it client-side.

---

## GitHub Secret Scanning
Enable in: repo Settings → Security → Secret scanning → Enable
This automatically detects accidentally committed API keys and alerts you.

---

## Supabase Point-in-Time Recovery (PITR)
Enable in: Supabase dashboard → Project Settings → Database → Point-in-time recovery
Required for CRA compliance — you must be able to restore tax data.

---

## Vercel Security
- Enable 2FA for all team members: vercel.com → Account → Security
- Review environment variable access by preview branches

---

## Rate Limiter — Production Note
The current in-memory rate limiter (`src/lib/rate-limit.ts`) works per-instance only.
On Vercel (multi-instance deployment), each serverless function instance has its own
bucket — a determined attacker can bypass the limit by hitting different instances.

**Before scaling beyond one Vercel instance:**
1. Sign up for Upstash Redis: console.upstash.com
2. Create a Redis database (Global tier recommended for low latency)
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel
4. The rate limiter will automatically switch to Redis-backed sliding window

---

## Data Retention
CRA requires taxpayers to keep records for 6 years (ITA s.230(4)).
TaxAgent retains data for 7 years (one-year buffer).

To enforce automatic purging, enable `pg_cron` in Supabase:
- Supabase dashboard → Database → Extensions → pg_cron → Enable
- Then run the SQL migration in `src/lib/data-retention.ts` (see SQL comments there)
