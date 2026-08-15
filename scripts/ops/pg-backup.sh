#!/usr/bin/env bash
# Nightly pg_dump of the supabase-local Postgres (Story 9.7 task 7) — the
# ops-level durability half of "live sync + ops backup". Dumps the whole
# `postgres` database (public schema + auth users) via the db container's
# own pg_dump, gzipped into ~/Backups/one-down-pg, and prunes dumps older
# than 14 days. Installed as a launchd user agent (no sudo):
#   cp scripts/ops/com.onedown.pg-backup.plist ~/Library/LaunchAgents/
#   launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.onedown.pg-backup.plist
# Run manually any time: ./scripts/ops/pg-backup.sh
set -uo pipefail

BACKUP_DIR="$HOME/Backups/one-down-pg"
RETENTION_DAYS=14
# Docker Desktop's CLI lives outside launchd's minimal PATH.
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

mkdir -p "$BACKUP_DIR"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*"
}

CONTAINER="$(docker ps --format '{{.Names}}' 2>/dev/null | grep '^supabase_db_' | head -1)"
if [ -z "$CONTAINER" ]; then
  # Stack down (or Docker not running) — a quiet skip, not a failure: the
  # stack is only up while developing, and no writes happen while it's down.
  log "skip: no running supabase_db_* container"
  exit 0
fi

STAMP="$(date '+%Y%m%d-%H%M%S')"
OUT="$BACKUP_DIR/one-down-$STAMP.sql.gz"
if docker exec "$CONTAINER" pg_dump -U postgres -d postgres | gzip > "$OUT"; then
  log "dumped $CONTAINER -> $OUT ($(du -h "$OUT" | cut -f1))"
else
  log "ERROR: pg_dump failed (container $CONTAINER)"
  rm -f "$OUT"
  exit 1
fi

# Retention: anything older than RETENTION_DAYS goes.
find "$BACKUP_DIR" -name 'one-down-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
log "retention: $(ls "$BACKUP_DIR" | grep -c '^one-down-.*\.sql\.gz$') dump(s) kept"
