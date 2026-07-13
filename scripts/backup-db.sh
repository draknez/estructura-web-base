#!/bin/bash
# backup-db.sh — Snapshot de SQLite con timestamp y rotación.
# Uso: ./scripts/backup-db.sh [RETENTION_DAYS]
# Cron sugerido: 0 */6 * * * /path/to/scripts/backup-db.sh

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_FILE="${APP_DIR}/server/database.sqlite"
BACKUP_DIR="${APP_DIR}/backups"
RETENTION="${1:-7}"

mkdir -p "${BACKUP_DIR}"

if [ ! -f "${DB_FILE}" ]; then
  echo "[backup] BD no existe en ${DB_FILE} — nada que respaldar."
  exit 0
fi

TS="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_DIR}/db-${TS}.sqlite"

# Copia atómica: VACUUM INTO (SQLite >= 3.27) si está disponible, sino cp.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "${DB_FILE}" ".timeout 5000" "VACUUM INTO '${DEST}'"
else
  cp "${DB_FILE}" "${DEST}"
fi

# Comprimir (best-effort)
if command -v gzip >/dev/null 2>&1; then
  gzip -f "${DEST}"
  DEST="${DEST}.gz"
fi

SIZE=$(du -h "${DEST}" | cut -f1)
echo "[backup] OK -> ${DEST} (${SIZE})"

# Rotación
find "${BACKUP_DIR}" -name "db-*.sqlite*" -mtime +"${RETENTION}" -delete 2>/dev/null || true
REMAINING=$(find "${BACKUP_DIR}" -name "db-*.sqlite*" | wc -l)
echo "[backup] Retención=${RETENTION}d, snapshots restantes: ${REMAINING}"