# TaxAgent.ai — Infrastructure & Data Governance

_Last updated: April 22, 2026_

---

## Data Residency

**Supabase project: ca-central-1 (Montreal, Canada)**

Verified April 22, 2026 in the Supabase dashboard. All of the following are provisioned in ca-central-1:

- PostgreSQL database (all user PII and tax data)
- Supabase Auth (user accounts, sessions, MFA)
- Supabase Storage (uploaded slip images)
- Supabase Vault (SIN encryption keys, if ever collected)

### Cross-Border Data Flow

The only data that leaves Canada is text content sent to the **Anthropic API (US)** for:

1. Conversational assessment (`/api/chat`) — user's tax profile answers
2. Slip OCR extraction (`/api/ocr`) — extracted text from slip images (not raw images)
3. Filing guide generation (`/api/filing-guide`) — tax calculation results + profile
4. NOA recovery analysis (`/api/recovery`) — NOA extracted text

This transfer is transient (no Anthropic retention beyond their standard API policy). It is disclosed in the privacy policy. Under PIPEDA, transient processing outside Canada is permitted when disclosed; this is standard practice for AI-powered SaaS products.

**Do not** switch to a Canadian-hosted LLM to eliminate this transfer unless a regulator specifically requires it. The Anthropic API quality/cost tradeoff is intentional.

---

## Backups

### Supabase Tier: **Free** (confirmed April 23, 2026)

| Tier | Automated Backups | Point-in-Time Recovery |
|------|------------------|----------------------|
| **Free** ← current | **None** | Not available |
| **Pro** ($25/month) | Daily, 7-day retention | Available as add-on |
| **Pro + PITR** | Daily, 7-day retention | 30-day recovery window |

**The Free tier has zero automated backups.** The manual backup script below is the only backup protection in place right now.

**Action required before onboarding real users**: Upgrade to Supabase Pro ($25/month). This enables daily automated backups with 7-day retention. Until then, run `scripts/backup-supabase.sh` manually at least weekly and copy archives to off-site storage.

### Manual Backup Script (belt-and-suspenders)

`scripts/backup-supabase.sh` performs a weekly manual `pg_dump` regardless of Supabase tier.

**Setup:**

```bash
# 1. Install prerequisites
brew install libpq gnupg
brew link --force libpq

# 2. Set env vars (add to ~/.zshrc or .env.local)
export DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
# Find in: Supabase dashboard → Project Settings → Database → Connection string → URI
export BACKUP_ENCRYPTION_KEY="your-strong-passphrase-here"

# 3. Test run
./scripts/backup-supabase.sh

# 4. Schedule weekly (runs every Sunday at 3am UTC)
crontab -e
# Add: 0 3 * * 0 /path/to/taxagent/scripts/backup-supabase.sh
```

Archives are saved to `~/taxagent-backups/` encrypted with AES-256 GPG. Local archives are pruned after 30 days.

**Off-site storage (required for CRA compliance)**: CRA requires 7-year record retention per ITA s.230(4). Local backups alone do not satisfy this. Copy archives to durable cold storage (AWS S3 Glacier, Backblaze B2, or encrypted external drive stored off-premises).

---

## Row Level Security (RLS) Audit

_Audited: April 22, 2026 against `supabase/migrations/20260405000000_initial_schema_rls.sql`_

### Status: CLEAN — no gaps found

| Table | RLS Enabled | Policy | Verdict |
|-------|-------------|--------|---------|
| `tax_profiles` | Yes | `FOR ALL USING (auth.uid() = user_id)` | Owner-only. Clean. |
| `tax_slips` | Yes | `FOR ALL` via join → `tax_profiles.user_id = auth.uid()` | Owner-only. Clean. |
| `tax_calculations` | Yes | `FOR ALL` via join → `tax_profiles.user_id = auth.uid()` | Owner-only. Clean. |
| `deductions_credits` | Yes | `FOR ALL` via join → `tax_profiles.user_id = auth.uid()` | Owner-only. Clean. |
| `business_income` | Yes | `FOR ALL` via join → `tax_profiles.user_id = auth.uid()` | Owner-only. Clean. |
| `rental_income` | Yes | `FOR ALL` via join → `tax_profiles.user_id = auth.uid()` | Owner-only. Clean. |
| `chat_messages` | Yes | `FOR ALL` via join → `tax_profiles.user_id = auth.uid()` | Owner-only. Clean. |
| `audit_log` | Yes | `FOR SELECT USING (auth.uid() = user_id)` | Read-only for users; writes are service-role only. Intentional. Clean. |
| `tax_knowledge` | Yes | `FOR SELECT USING (true)` | **Intentionally public-read.** Non-sensitive CRA reference data. No user PII. Write is service-role only (seeding script). Flagged but not a problem. |

### Notes

- **`tax_knowledge` permissive SELECT**: The `USING (true)` policy is intentional — this table contains CRA reference facts used for RAG retrieval, not user data. Authenticated and anon users both read it (needed for the public viral estimator). Do not restrict it.

- **`audit_log` write path**: Audit entries are written server-side using the Supabase service role key, which bypasses RLS. This is correct — users should not be able to insert or modify their own audit trail.

- **Join-based ownership (all non-profile tables)**: Every user-data table resolves ownership via `profile_id → tax_profiles.id → tax_profiles.user_id = auth.uid()`. This is correct and secure. The only risk is if a row is somehow inserted with a `profile_id` belonging to a different user — the server-side API routes prevent this by always looking up the profile for the authenticated user before inserting.

- **No tables discovered without RLS**: As of this audit all 9 application tables have RLS enabled. When adding future tables, enforce RLS before the first INSERT.

### Action Items from Audit

None. RLS coverage is complete and policies are correct.
