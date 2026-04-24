#!/usr/bin/env bash
# ============================================================
# TaxAgent.ai — Manual Supabase backup (belt-and-suspenders)
#
# Runs pg_dump against the Supabase connection string and saves
# an encrypted, compressed archive locally.
#
# Usage:
#   ./scripts/backup-supabase.sh
#
# Schedule (recommended):
#   Weekly via cron: 0 3 * * 0 /path/to/scripts/backup-supabase.sh
#
# Required env vars (set in .env.local or your shell profile):
#   DATABASE_URL          — Supabase direct connection string
#                           (find in: Supabase dashboard → Project Settings → Database → Connection string → URI)
#   BACKUP_ENCRYPTION_KEY — passphrase for GPG symmetric encryption
#
# Requires:
#   pg_dump (PostgreSQL client tools)
#   gpg
# ============================================================

set -euo pipefail

# ── Config ───────────────────────────────────────────────────

BACKUP_DIR="${BACKUP_DIR:-$HOME/taxagent-backups}"
RETENTION_DAYS=30   # keep local archives for 30 days (CRA requires 7 years — archive to cold storage separately)
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
ARCHIVE_NAME="taxagent-${TIMESTAMP}.sql.gz.gpg"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

# ── Pre-flight checks ─────────────────────────────────────────

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Set it to your Supabase direct connection string." >&2
  echo "       Find it in: Supabase dashboard → Project Settings → Database → Connection string → URI" >&2
  exit 1
fi

if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  echo "ERROR: BACKUP_ENCRYPTION_KEY is not set. Set a strong passphrase for archive encryption." >&2
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  echo "ERROR: pg_dump not found. Install PostgreSQL client tools." >&2
  echo "       macOS: brew install libpq && brew link --force libpq" >&2
  exit 1
fi

if ! command -v gpg &>/dev/null; then
  echo "ERROR: gpg not found. Install GnuPG." >&2
  echo "       macOS: brew install gnupg" >&2
  exit 1
fi

# ── Create backup dir ─────────────────────────────────────────

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# ── Run pg_dump | gzip | gpg encrypt ─────────────────────────

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting backup → ${ARCHIVE_NAME}"

pg_dump \
  --no-password \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --format=plain \
  "${DATABASE_URL}" \
  | gzip -9 \
  | gpg \
      --batch \
      --yes \
      --symmetric \
      --cipher-algo AES256 \
      --passphrase "${BACKUP_ENCRYPTION_KEY}" \
      --output "${ARCHIVE_PATH}"

ARCHIVE_SIZE=$(du -sh "${ARCHIVE_PATH}" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup complete. Size: ${ARCHIVE_SIZE} → ${ARCHIVE_PATH}"

# ── Prune old local archives ──────────────────────────────────

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Pruning archives older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "taxagent-*.sql.gz.gpg" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Pruning done."

# ── Reminder: off-site copy ───────────────────────────────────
# CRA requires 7-year record retention (ITA s.230(4)); we keep 7 years.
# Local backups alone do not satisfy this — copy archives to durable cold
# storage (e.g. AWS S3 Glacier, Backblaze B2, or an external hard drive
# stored off-premises). Add an rsync/aws s3 cp call here once decided.

echo ""
echo "REMINDER: Copy ${ARCHIVE_PATH} to off-site cold storage for CRA 7-year retention compliance."
echo "          Local 30-day retention is belt-and-suspenders only, not a substitute for off-site."
