# Database Backup and Disaster Recovery Runbook — AdEarn AI

Financial applications must maintain verifiable, automated, encrypted, and tested backup procedures.

---

## 1. Automated Daily Logical Backup Script

Create `/home/adearn/scripts/backup_db.sh`:

```bash
#!/usr/bin/env bash
set -eo pipefail


BACKUP_DIR="/home/adearn/backups/mysql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/adearn_ai_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup: ${FILENAME}"

# Dump database using single-transaction (consistent snapshot without locking tables)
docker compose exec -T db mysqldump -u adearn_user -p"${DB_PASSWORD}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  adearn_ai | gzip > "${FILENAME}"

# Generate SHA256 checksum for tamper-evidence
sha256sum "${FILENAME}" > "${FILENAME}.sha256"

echo "[SUCCESS] Backup complete. Size: $(du -h "${FILENAME}" | cut -f1)"

# Prune backups older than 30 days
find "${BACKUP_DIR}" -type f -name "adearn_ai_*.sql.gz*" -mtime +${RETENTION_DAYS} -delete
echo "[INFO] Pruned backups older than ${RETENTION_DAYS} days."
```

Make executable:
```bash
chmod 700 /home/adearn/scripts/backup_db.sh
```

---

## 2. Automated Cron Schedule

Add to crontab:
```cron
# Run daily at 02:00 UTC
0 2 * * * /home/adearn/scripts/backup_db.sh >> /home/adearn/logs/backup.log 2>&1
```

---

## 3. Off-Site Replication to S3 / Cloudflare R2

Never store backups solely on the host running the application. Sync backups to private object storage:

```bash
# Using AWS CLI / R2 CLI
aws s3 sync /home/adearn/backups/mysql s3://adearn-backups-secure/mysql/ --sse AES256
```

---

## 4. Full Disaster Recovery / Restoration Procedure

To restore the database from a backup file (e.g., following server failure or data corruption):

```bash
# 1. Stop web application traffic to prevent concurrent writes during restore
docker compose stop app

# 2. Verify SHA256 checksum of the backup file
sha256sum -c adearn_ai_20261017_020000.sql.gz.sha256

# 3. Decompress and restore into database
gunzip < adearn_ai_20261017_020000.sql.gz | docker compose exec -T db mysql -u adearn_user -p"${DB_PASSWORD}" adearn_ai

# 4. Run Prisma schema validation check
docker compose run --rm app npx prisma validate

# 5. Restart application
docker compose start app

# 6. Verify health endpoint
curl -s http://localhost:3000/api/health | jq .
```
