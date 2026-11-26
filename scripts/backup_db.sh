#!/usr/bin/env bash
# ==============================================================================
# AdEarn AI — Automated Database Backup Script (MySQL 8.0)
# ==============================================================================
# Usage:
#   ./scripts/backup_db.sh [/optional/path/to/backup_dir]
#
# Environment variables:
#   DB_CONTAINER      (Default: adearn-db)
#   MYSQL_DATABASE    (Default: adearn_ai)
#   MYSQL_USER        (Default: adearn_user)
#   DB_PASSWORD       (Required or read from .env)
#   BACKUP_DIR        (Default: ./backups/mysql)
#   RETENTION_DAYS    (Default: 7)
# ==============================================================================

set -euo pipefail

# Load environment if .env exists
if [ -f .env ]; then
  # Export vars without comments
  export $(grep -v '^#' .env | xargs -d '\n' 2>/dev/null || true)
fi

DB_CONTAINER="${DB_CONTAINER:-adearn-db}"
MYSQL_DATABASE="${MYSQL_DATABASE:-adearn_ai}"
MYSQL_USER="${MYSQL_USER:-adearn_user}"
DB_PASSWORD="${DB_PASSWORD:-${MYSQL_PASSWORD:-}}"
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups/mysql}}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/adearn_ai_backup_${TIMESTAMP}.sql.gz"

echo "=========================================================="
echo "📦 Starting AdEarn AI Database Backup"
echo "Timestamp:    ${TIMESTAMP}"
echo "Target DB:    ${MYSQL_DATABASE}"
echo "Container:    ${DB_CONTAINER}"
echo "Destination:  ${BACKUP_FILE}"
echo "=========================================================="

# Create backup directory if missing
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# Check if Docker container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "❌ Error: Docker container '${DB_CONTAINER}' is not running." >&2
  exit 1
fi

# Execute mysqldump inside container and pipe to gzip
echo "Executing mysqldump with consistent snapshot options..."
docker exec "${DB_CONTAINER}" mysqldump \
  -u "${MYSQL_USER}" \
  -p"${DB_PASSWORD}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  "${MYSQL_DATABASE}" | gzip -9 > "${BACKUP_FILE}"

# Verify backup file existence and non-zero size
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup failed or produced empty file: ${BACKUP_FILE}" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "✅ Backup successfully created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Enforce retention policy: prune archives older than RETENTION_DAYS
echo "Applying retention policy: pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "adearn_ai_backup_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -print -delete || true

echo "✨ Backup job completed successfully."
exit 0
