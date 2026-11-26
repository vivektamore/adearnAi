# Database Backup and Disaster Recovery Runbook — AdEarn AI
## Production MySQL 8.0 Backup Automation, Retention, Off-Site Replication, and Restoration

Financial applications must maintain verifiable, automated, encrypted, and tested backup and restoration procedures.

---

## 1. Automated Logical Backup Utility (`scripts/backup_db.sh`)

AdEarn AI provides a standalone, production-hardened backup script at `scripts/backup_db.sh`.

### Key Characteristics:
- **Consistent Snapshot:** Uses `mysqldump --single-transaction --quick` to capture consistent state without locking tables or interrupting user sessions.
- **Includes Stored Logic:** Captures `--routines` and `--triggers`.
- **Max Compression:** Pipes dump output directly into `gzip -9` to minimize storage footprint.
- **Integrity Validation:** Verifies file creation and non-zero byte size before exiting.
- **Automated Retention:** Automatically prunes dumps older than `RETENTION_DAYS` (default: 7 daily backups).

### Manual Invocation:
```bash
# Run backup to default directory (./backups/mysql)
bash ./scripts/backup_db.sh

# Run backup to custom destination
bash ./scripts/backup_db.sh /mnt/secure_backup_volume/mysql
```

---

## 2. Automated Cron Scheduling

Schedule automated nightly execution on the production host via the `adearn` user crontab:

```bash
crontab -e
```

Add the following schedule (runs daily at 02:00 AM):
```cron
0 2 * * * /home/adearn/app/scripts/backup_db.sh /home/adearn/app/backups/mysql >> /home/adearn/app/logs/backup.log 2>&1
```

---

## 3. Off-Site Replication to S3 / Cloudflare R2

Never store backups solely on the host running the application. Synchronize daily archives to private, encrypted object storage with bucket versioning enabled:

```bash
# Append to cron job or backup script
aws s3 sync /home/adearn/app/backups/mysql s3://adearn-backups-vault/mysql/ \
  --sse AES256 \
  --region ap-south-1
```

---

## 4. Disaster Recovery & Restoration Procedure (`scripts/restore_db.sh`)

To restore the MySQL database from a compressed backup archive (e.g., following hardware failure, corrupt state, or catastrophic incident):

### Interactive Restoration:
```bash
# Syntax: ./scripts/restore_db.sh <path_to_backup_file.sql.gz> [--force]
bash ./scripts/restore_db.sh ./backups/mysql/adearn_ai_backup_20261018_020000.sql.gz
```

### Script Execution Steps:
1. Validates that the input archive exists and is non-empty.
2. Prompts operator for explicit `yes` confirmation (unless `--force` is provided).
3. Automatically creates a **pre-restore safety snapshot** of the live database in `./backups/mysql/pre_restore_safety/` before making any modifications.
4. Streams decompression and imports SQL directly into the running `adearn-db` container.
5. Runs verification query counting tables in `information_schema.tables` and reporting verified table counts.

---

## 5. Post-Restoration Verification & Health Check

After restoring:

```bash
# 1. Verify application container health
curl -s http://127.0.0.1:3000/api/health | jq .

# 2. Check table record counts
docker compose exec db mysql -u adearn_user -p"$(grep DB_PASSWORD .env | cut -d '=' -f2)" -e "
  SELECT table_name, table_rows 
  FROM information_schema.tables 
  WHERE table_schema = 'adearn_ai';
"

# 3. Verify user and campaign data integrity
docker compose run --rm app node scripts/verify_db.js
```
