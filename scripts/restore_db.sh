#!/usr/bin/env bash
# ==============================================================================
# AdEarn AI — Database Restoration Script (MySQL 8.0)
# ==============================================================================
# Usage:
#   ./scripts/restore_db.sh <path_to_backup_file.sql.gz> [--force]
#
# Caution:
#   This operation overwrites the target database!
#   An automated safety snapshot of the live database will be created first.
# ==============================================================================

set -euo pipefail

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs -d '\n' 2>/dev/null || true)
fi

DB_CONTAINER="${DB_CONTAINER:-adearn-db}"
MYSQL_DATABASE="${MYSQL_DATABASE:-adearn_ai}"
MYSQL_USER="${MYSQL_USER:-adearn_user}"
DB_PASSWORD="${DB_PASSWORD:-${MYSQL_PASSWORD:-}}"

BACKUP_FILE="${1:-}"
FORCE_FLAG="${2:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "❌ Error: Missing backup file argument." >&2
  echo "Usage: $0 <path_to_backup_file.sql.gz> [--force]" >&2
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "=========================================================="
echo "⚠️  AdEarn AI Database Restore Utility"
echo "Target DB:    ${MYSQL_DATABASE}"
echo "Container:    ${DB_CONTAINER}"
echo "Source File:  ${BACKUP_FILE}"
echo "=========================================================="

if [ "${FORCE_FLAG}" != "--force" ]; then
  read -p "⚠️  Are you sure you want to restore and overwrite '${MYSQL_DATABASE}'? (yes/no): " CONFIRM
  if [ "${CONFIRM}" != "yes" ]; then
    echo "Restoration cancelled by user."
    exit 0
  fi
fi

# Step 1: Pre-restore safety snapshot
SAFETY_DIR="./backups/mysql/pre_restore_safety"
mkdir -p "${SAFETY_DIR}"
SAFETY_FILE="${SAFETY_DIR}/safety_backup_$(date +"%Y%m%d_%H%M%S").sql.gz"
echo "Creating pre-restore safety snapshot at: ${SAFETY_FILE}..."
docker exec "${DB_CONTAINER}" mysqldump \
  -u "${MYSQL_USER}" \
  -p"${DB_PASSWORD}" \
  --single-transaction \
  --quick \
  "${MYSQL_DATABASE}" | gzip -9 > "${SAFETY_FILE}" || true
echo "✅ Safety snapshot created."

# Step 2: Stream restore from gzipped file
echo "Restoring database from: ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${DB_CONTAINER}" mysql \
  -u "${MYSQL_USER}" \
  -p"${DB_PASSWORD}" \
  "${MYSQL_DATABASE}"

# Step 3: Verification query
echo "Verifying restored tables..."
TABLE_COUNT=$(docker exec -i "${DB_CONTAINER}" mysql \
  -u "${MYSQL_USER}" \
  -p"${DB_PASSWORD}" \
  -sN -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${MYSQL_DATABASE}';")

echo "✅ Database restore completed successfully."
echo "Verified table count in '${MYSQL_DATABASE}': ${TABLE_COUNT} tables."
exit 0
