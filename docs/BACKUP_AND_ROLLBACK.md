# AdEarn AI — Backup, Disaster Recovery & Rollback Runbook

## 1. Disaster Recovery & Backup Strategy

AdEarn AI handles financial ledgers, creator balances, advertiser escrow pools, and proof-of-attention telemetry. Data durability and continuous recovery capabilities are mandatory.

### 1.1 Automated Daily Logical Backups (`mysqldump`)
Create a root cron job (`/etc/cron.d/adearn_db_backup`):
```bash
# Daily logical backup at 02:00 AM UTC with single-transaction consistency
0 2 * * * root mysqldump -u adearn_prod -p'STRONG_PASSWORD' --single-transaction --quick --routines --triggers adearn_ai | gzip > /var/backups/adearn/adearn_ai_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

### 1.2 Binary Logging & Point-In-Time Recovery (PITR)
Ensure MySQL `my.cnf` has binary logging enabled:
```ini
[mysqld]
log-bin = /var/log/mysql/mysql-bin.log
expire_logs_days = 14
max_binlog_size = 500M
binlog_format = ROW
```

### 1.3 Database Restoration Procedure
In the event of database failure:
```bash
# 1. Stop web application traffic
pm2 stop adearn-ai

# 2. Decompress and restore most recent logical backup
gunzip < /var/backups/adearn/adearn_ai_20261109_020000.sql.gz | mysql -u adearn_prod -p adearn_ai

# 3. Replay binary logs up to desired point in time
mysqlbinlog --stop-datetime="2026-11-09 10:00:00" /var/log/mysql/mysql-bin.000* | mysql -u adearn_prod -p adearn_ai

# 4. Run ledger reconciliation inspector to verify double-entry equilibrium
node scripts/reconcile_ledger.js

# 5. Restart application
pm2 restart adearn-ai
```

---

## 2. Application Release Rollback Procedure

When a release fails post-deployment smoke verification:

### Step 1: Immediate Rollback to Previous Git Commit
```bash
cd /var/www/adearn-ai
git log -n 5 --oneline
# Revert to last known good commit
git checkout <LAST_KNOWN_GOOD_COMMIT_HASH>
```

### Step 2: Clean Rebuild
```bash
npm ci --production=false
npm run build
```

### Step 3: Zero-Downtime Process Reload
```bash
pm2 reload adearn-ai
```

### Step 4: Verification
```bash
node scripts/reconcile_ledger.js
curl -I https://adearn.ai/api/auth/session
```

---

## 3. Emergency Financial Kill-Switch

If suspicious financial activity, bot exploitation, or bank nodal discrepancies are detected:

1. **Activate Payout Sandbox Lockdown**:
   Update `.env.production`:
   ```bash
   PAYOUT_MODE="sandbox"
   ```
   Execute zero-downtime reload:
   ```bash
   pm2 reload adearn-ai
   ```
   *Effect*: All real-money outgoing bank transfers and UPI disbursements are immediately neutralized. Payout requests enter pending verification without live fund movement.

2. **Freeze Campaign Ingestion**:
   In `/admin/settings`, toggle campaign moderation auto-approvals off and pause active campaigns.

