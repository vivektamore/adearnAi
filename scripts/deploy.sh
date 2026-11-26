#!/usr/bin/env bash
# ==============================================================================
# AdEarn AI — Production Deployment Script
# ==============================================================================
# Usage:
#   ./scripts/deploy.sh [git_branch_or_commit]
#
# Process:
#   1. Pre-flight checks (.env, docker, docker compose)
#   2. Automatic database backup before any changes
#   3. Tag current container image as rollback fallback
#   4. Rebuild production Docker image
#   5. Run non-destructive database migrations
#   6. Deploy updated application container
#   7. Verify healthcheck endpoint (/api/health)
#   8. Reload Nginx reverse proxy
# ==============================================================================

set -euo pipefail

TARGET_REF="${1:-HEAD}"
HEALTH_URL="http://127.0.0.1:3000/api/health"
MAX_RETRIES=12
RETRY_INTERVAL=5

echo "=========================================================="
echo "🚀 AdEarn AI — Production Release Deployment"
echo "Target Ref:   ${TARGET_REF}"
echo "Timestamp:    $(date +"%Y-%m-%d %H:%M:%S")"
echo "=========================================================="

# 1. Pre-flight checks
if [ ! -f .env ]; then
  echo "❌ Error: Production .env file missing in root directory." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Error: Docker is not installed or not in PATH." >&2
  exit 1
fi

COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
  else
    echo "❌ Error: Neither 'docker compose' nor 'docker-compose' found." >&2
    exit 1
  fi
fi

# 2. Database Backup
echo "Step 1: Creating safety database backup before deployment..."
if [ -f ./scripts/backup_db.sh ]; then
  bash ./scripts/backup_db.sh ./backups/pre_deploy || {
    echo "❌ Database backup failed. Aborting deployment to protect data." >&2
    exit 1
  }
fi

# 3. Tag current image as rollback fallback if it exists
CURRENT_IMAGE=$(docker images adearn-app -q | head -n 1 || true)
if [ -n "${CURRENT_IMAGE}" ]; then
  echo "Step 2: Tagging active image ${CURRENT_IMAGE} as 'adearn-app:previous' for rollback..."
  docker tag "${CURRENT_IMAGE}" "adearn-app:previous" || true
fi

# 4. Build application container
echo "Step 3: Building production Docker image (adearn-app)..."
${COMPOSE_CMD} build --pull app

# 5. Run Database Migration
echo "Step 4: Executing Prisma database migrations..."
${COMPOSE_CMD} run --rm app npx prisma db push --skip-generate

# 6. Deploy updated container
echo "Step 5: Updating application service..."
${COMPOSE_CMD} up -d --no-deps app

# 7. Health Check Verification
echo "Step 6: Verifying container health via ${HEALTH_URL}..."
ATTEMPT=1
HEALTHY=false

while [ ${ATTEMPT} -le ${MAX_RETRIES} ]; do
  echo "  Probe attempt ${ATTEMPT}/${MAX_RETRIES}..."
  
  HTTP_STATUS=$(${COMPOSE_CMD} exec -T app wget -q -O - http://127.0.0.1:3000/api/health 2>/dev/null | grep -o '"status":"UP"' || true)
  
  if [ "${HTTP_STATUS}" = '"status":"UP"' ]; then
    HEALTHY=true
    break
  fi
  
  sleep ${RETRY_INTERVAL}
  ATTEMPT=$((ATTEMPT + 1))
done

if [ "${HEALTHY}" = true ]; then
  echo "✅ Application health check PASSED!"
else
  echo "❌ Application health check FAILED after ${MAX_RETRIES} attempts." >&2
  echo "⚠️ Initiating automated rollback..." >&2
  if [ -f ./scripts/rollback.sh ]; then
    bash ./scripts/rollback.sh
  fi
  exit 1
fi

# 8. Reload Nginx
echo "Step 7: Reloading Nginx configuration..."
${COMPOSE_CMD} exec -T nginx nginx -s reload || true

echo "=========================================================="
echo "🎉 Deployment successfully verified and completed!"
echo "=========================================================="
exit 0
