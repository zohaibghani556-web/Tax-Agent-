# Session 4 — Infrastructure & Data Governance (April 22–23, 2026)

**Commits**: `5dacc87`, `ba58057`

## Summary

Confirmed Supabase is provisioned in ca-central-1 (Montreal, Canada), audited Row Level Security coverage (all 9 tables covered, RLS policies correct), and created a manual backup strategy. Free tier lacks automated backups — manual `pg_dump` script deployed at `scripts/backup-supabase.sh` with weekly scheduling capability and GPG AES-256 encryption.

## Decisions & Rationale

1. **Stay on Supabase Free tier for now** — $25/month Pro upgrade is deferred to Week 9 (alpha launch). Manual backups are belt-and-suspenders; the upgrade becomes non-negotiable once real users are onboarded.

2. **Document the Anthropic API cross-border flow explicitly** — Text extracted from slips and chat goes to Anthropic (US). This is disclosed and acceptable under PIPEDA. Future sessions should NOT suggest switching to a Canadian-hosted LLM without regulator pressure; the tradeoff is intentional.

3. **Confirm tax_knowledge RLS is intentionally permissive** — `USING (true)` is correct as long as the table contains only CRA reference data. Flag for future revisit if that invariant changes.

## Files Changed / Created

| File | Change | Notes |
|------|--------|-------|
| `CLAUDE.md` | Updated | Added "Data Residency" section with ca-central-1 verification + Anthropic API disclosure |
| `docs/infrastructure.md` | Created | Full infrastructure guide: data residency, backup strategy table, RLS audit matrix |
| `scripts/backup-supabase.sh` | Created | `pg_dump → gzip → gpg --symmetric` with 30-day local pruning. Requires `DATABASE_URL` and `BACKUP_ENCRYPTION_KEY` env vars. |

## Follow-ups

- **Before Week 9 alpha launch**: Upgrade Supabase to Pro ($25/month) to enable automated daily backups. Update `docs/infrastructure.md` tier table and commit.
- **Establish off-site backup cadence**: CRA requires 7-year retention per ITA s.230(4). Set up weekly copy of encrypted archives to AWS S3 Glacier, Backblaze B2, or external encrypted drive.
- **Test restore**: Run through a full `pg_restore` from a backup archive before the alpha launch to confirm the process works under pressure.

## Notes for Future Self

- The Free → Pro upgrade is cheap ($25/month) relative to the risk of losing one user's tax return. Don't defer it past Week 9.
- The backup script requires `libpq` tools. macOS users hit the `brew link --force libpq` step — link is broken by default to avoid conflicts with system PostgreSQL.
- `tax_knowledge` `USING (true)` RLS is an intentional design decision, not a security gap. Document this so future audits don't flag it as overly permissive.
- All 9 user-data tables use join-based ownership resolution (`profile_id → tax_profiles.user_id = auth.uid()`). This is correct and avoids the risk of a malformed row escaping to another user if we ever add table-level constraints.
