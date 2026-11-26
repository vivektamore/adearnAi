#!/usr/bin/env bash
# ==============================================================================
# AdEarn AI — Emergency Rollback Script
# ==============================================================================
# Usage:
#   ./scripts/rollback.sh [--with-db-restore <path_to_backup.sql.gz>]
#
# Process:
#   1. Re-tags adearn-app:previous as active app image
#   2. Re-launches application container
#   3. Optionally restores pre-deployment database snapshot
#   4. Re-verifies healthcheck endpoint (/api/health)
#   5. Reloads Nginx reverse proxy
# ==============================================================================

set -euo pipefail

WITH_DB_RESTORE="${1:-}"
BACKUP_SNAPSHOT="${2:-}"

echo "=========================================================="
echo "🚨 AdEarn AI — EMERGENCY ROLLBACK PROCEDURE"
echo "Timestamp:    $(date +"%Y-%m-%d %H:%M:%S")"
echo "=========================================================="

COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
fi

# Step 1: Check for rollback image tag
if ! docker images adearn-app:previous -q | grep -q .; then
  echo "❌ Error: 'adearn-app:previous' image tag does not exist. Cannot perform image rollback." >&2
  exit 1
fi

echo "Step 1: Restoring previous container image..."
docker tag adearn-app:previous adearn-app:latest

echo "Step 2: Restarting application container with previous build..."
${COMPOSE_CMD} up -d --no-deps app

# Step 3: Optional database rollback
if [ "${WITH_DB_RESTORE}" = "--with-db-restore" ]; then
  if [ -z "${BACKUP_SNAPSHOT}" ]; then
    # Look for most recent pre_deploy backup
    BACKUP_SNAPSHOT=$(find ./backups/pre_deploy -name "*.sql.gz" -type f | sort -r | head -n 1 || true)
  fi

  if [ -n "${BACKUP_SNAPSHOT}" ] && [ -f "${BACKUP_SNAPSHOT}" ]; then
    echo "Step 3: Restoring database snapshot: ${BACKUP_SNAPSHOT}..."
    bash ./scripts/restore_db.sh "${BACKUP_SNAPSHOT}" --force
  else
    echo "⚠️ Warning: No pre-deploy database snapshot found. Skipping database restore."
  fi
fi

# Step 4: Healthcheck verification
echo "Step 4: Probing rollback container health..."
sleep 5
HTTP_STATUS=$(${COMPOSE_CMD} exec -T app wget -q -O - http://127.0.0.1:3000/api/health 2>/dev/null | grep -o '"status":"UP"' || true)

if [ "${HTTP_STATUS}" = '"status":"UP"' ]; then
  echo "✅ Rollback verified: Application is UP and healthy."
else
  echo "❌ Rollback health check failed. Manual intervention required!" >&2
  exit 1
fi

# Step 5: Reload Nginx
echo "Step 5: Reloading Nginx..."
${COMPOSE_CMD} exec -T nginx nginx -s reload || true

echo "=========================================================="
echo "✅ Rollback completed successfully."
echo "=========================================================="
exit 0
