# AdEarn AI — Production Operations Runbook

## Document Status & Classification
- **Classification:** Strictly Confidential / Operations & SRE Runbook
- **Version:** 2.0.0-PROD
- **Last Updated:** 2026-10-21
- **Status:** APPROVED FOR STAGING / BLOCKED FOR LIVE PAYOUTS PENDING NODAL APPROVAL

---

## 1. Deployment Prerequisites

### 1.1 Infrastructure & Operating System
- **Server:** Ubuntu 22.04 LTS / 24.04 LTS (x86_64 or aarch64)
- **Minimum Specs:** 2 vCPU, 4GB RAM, 40GB NVMe SSD
- **Network Ports:**
  - `80/tcp` (HTTP -> Redirected to 443)
  - `443/tcp` (HTTPS / TLS 1.3)
  - `22/tcp` (SSH via Public-Key authentication ONLY, root login disabled)
  - **PROHIBITED:** Port `3306` (MySQL) and Port `6379` (Redis) MUST NOT be exposed on public interfaces. Docker networks bind them to `127.0.0.1` or internal bridge only.

### 1.2 System Dependencies
- Docker Engine >= 24.0.0
- Docker Compose v2 >= 2.20.0
- Node.js 20.x LTS (for local administration/migration runners)
- OpenSSL >= 3.0 (for secret generation)

---

## 2. Environment Configuration & Secret Management

### 2.1 Critical Production Variables
All secrets must be cryptographically random (minimum 32 bytes / 256 bits):
```bash
# Generate high-entropy secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For AUDIT_HMAC_SECRET
openssl rand -base64 32 # For ENCRYPTION_KEY (32-byte AES key)
openssl rand -hex 24  # For DB_PASSWORD
openssl rand -hex 24  # For REDIS_PASSWORD
```

### 2.2 Production `.env.production` Template
```ini
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://adearn.ai

# Database (Internal Docker network or private VPC endpoint)
DATABASE_URL=mysql://adearn_app:${DB_PASSWORD}@mysql:3306/adearn_ai?connection_limit=25&pool_timeout=10

# Redis Cache & Session Store
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# Cryptographic Keys (NEVER commit to git or log to stdout)
JWT_SECRET=${SECURE_RANDOM_JWT_SECRET}
AUDIT_HMAC_SECRET=${SECURE_RANDOM_AUDIT_SECRET}
PAYOUT_ENCRYPTION_KEY=${SECURE_AES_256_KEY}

# Payment & Banking Adapters
PAYOUT_PROVIDER_MODE=sandbox # DO NOT set to live until RBI/bank nodal signoff
CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
WEBHOOK_SIGNING_SECRET=
```

---

## 3. Database Migration Procedures

### 3.1 Migration Philosophy
- **Zero-Downtime / Backward-Compatible:** No destructive migrations (`DROP COLUMN`, `RENAME TABLE` in-flight) are permitted in production.
- **Migration Execution:**
  ```bash
  # Step 1: Run pre-deployment migration check
  npx prisma migrate status

  # Step 2: Apply pending migrations safely
  npx prisma migrate deploy

  # Step 3: Reconcile double-entry ledger balance before traffic cutover
  node scripts/reconcile_ledger.js
  ```
- **Prohibited Commands in Production:**
  - `npx prisma db push --force-reset` (CATASTROPHIC DATA LOSS)
  - `npx prisma db seed` on production database (Overwrites active balances)

---

## 4. Backup & Disaster Recovery (DR)

### 4.1 Automated Daily Backup Script (`scripts/backup_db.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/adearn"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/adearn_db_${TIMESTAMP}.sql.gz"
ENC_FILENAME="${FILENAME}.enc"

mkdir -p "${BACKUP_DIR}"

# 1. Consistent transaction dump using single-transaction
mysqldump --single-transaction --quick --lock-tables=false \
  -h 127.0.0.1 -u adearn_app -p"${DB_PASSWORD}" adearn_ai \
  | gzip -9 > "${FILENAME}"

# 2. Encrypt at rest with GPG / OpenSSL before shipping offsite
openssl enc -aes-256-cbc -salt -pbkdf2 -in "${FILENAME}" -out "${ENC_FILENAME}" -k "${BACKUP_ENCRYPTION_PASSPHRASE}"
rm -f "${FILENAME}"

# 3. Ship to secure offsite object storage (S3/GCS with Object Lock)
# aws s3 cp "${ENC_FILENAME}" s3://adearn-offsite-backups/mysql/

echo "Backup successful: ${ENC_FILENAME}"
```

### 4.2 Restoration & Point-in-Time Recovery
1. Spin up an isolated staging container (do not restore directly over production).
2. Decrypt backup archive:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -in adearn_db_YYYYMMDD.sql.gz.enc -out restored.sql.gz -k "${BACKUP_ENCRYPTION_PASSPHRASE}"
   gunzip < restored.sql.gz | mysql -h staging-db -u root -p adearn_restored
   ```
3. Run ledger balance reconciliation:
   ```bash
   node scripts/reconcile_ledger.js
   ```
4. Verify `Total Journal Debits === Total Journal Credits`.

---

## 5. Monitoring, Alerting & Health Checks

### 5.1 Health Endpoints
- `GET /api/health`
  - Validates MySQL connection (`SELECT 1`)
  - Validates Redis ping
  - Validates application uptime
  - Returns `200 OK` with JSON telemetry.

### 5.2 Critical Alert Conditions (P0 / P1)
1. **Ledger Imbalance Alert:** If `scripts/reconcile_ledger.js` detects `SUM(Dr) !== SUM(Cr)`, halt automated payouts immediately and alert SRE.
2. **Payout Outbox Dead-Letter Alert:** Payout items with `dispatchAttempts > 5` or stuck in `RECONCILIATION_PENDING` for > 30 minutes.
3. **Database Concurrency Contention:** Increased error rates on conditional SQL updates or deadlock counters.
4. **Security Header Tampering:** Elevated HTTP 403 / 401 rates on API routes indicating credential stuffing or token forgery.

---

## 6. Rollback Procedures

### 6.1 Application Rollback
Containerized deployments allow instantaneous rollback to previous Docker image tag:
```bash
# Rollback container to previous tag
docker compose stop web
docker compose rm -f web
docker tag adearn-web:previous adearn-web:latest
docker compose up -d web
```

### 6.2 Database Rollback Strategy
If a migration added non-breaking nullable columns or new tables (`Account`, `JournalEntry`), application rollback requires NO schema reversion.
If schema reversion is mandatory:
1. Stop traffic at Nginx (`503 Maintenance Mode`).
2. Run custom backward migration script.
3. Verify ledger integrity: `node scripts/reconcile_ledger.js`.
4. Restore traffic.

---

## 7. Incident Handling & Emergency Runbook

### Scenario A: Payment Gateway Timeout Surge
1. Gateways experience API latency; payout requests mark `RECONCILIATION_PENDING`.
2. **ACTION:** DO NOT trigger manual refunds. Do not re-dispatch blindly.
3. Wait for webhook callbacks or query provider settlement report via reconciliation cron.
4. If provider confirms settlement, transition to `CLEARED`. If provider confirms failure, transition to `FAILED` and execute single reversal.

### Scenario B: Suspected Compromise of Admin Account
1. Rotate `JWT_SECRET` immediately in `.env.production`.
2. Restart application container (`docker compose restart web`) — this invalidates all active sessions globally.
3. Run SQL audit query:
   ```sql
   SELECT * FROM AuditLog ORDER BY createdAt DESC LIMIT 100;
   ```
---

## 8. Release Approval Criteria (Go/No-Go Gate)
Before clearing production deployment:
- [x] All automated unit and financial integrity tests pass (`npm test` — 9 test suites passing).
- [x] Double-entry general ledger is 100% in equilibrium (`SUM(Dr) === SUM(Cr) = ₹116,410.66`).
- [x] Concurrency safety verified with zero overdrafts under race conditions (`test/financial_concurrency_and_reconciliation.test.js`).
- [x] Chart of Accounts cache verified with fail-closed security and stampede protection (`test/chart_of_accounts_cache.test.ts`).
- [x] Strict lock hierarchy (`Campaign` -> `Wallet`) guarantees zero deadlocks under concurrent storms.
- [x] Client identity header stripping active in edge middleware.
- [x] Payout system strictly enforced in `sandbox` mode (`PAYOUT_MODE="sandbox"`).
- [ ] Bank Nodal / Escrow account opened and legal agreement signed (Currently **BLOCKED**).
- [ ] Production VPS DNS records (`A` / `AAAA`) pointed to staging/production host (Currently **BLOCKED**).

### Final Staging Release Decision: **CONDITIONAL GO FOR STAGING**
- **Approved:** Controlled staging deployment, Chrome Web Store internal testing, advertiser campaign funding simulation, and creator impression telemetry.
- **Strictly Prohibited:** Real-money live payouts, production domain deployment, and real bank account transfers until banking licenses and RBI compliance are finalized.

---

## 9. Staging Verification, Financial Monitoring & Incident Recovery

### 9.1 Staging Initial Seed & Migration Runbook
When deploying to a clean staging database:
1. **Apply Migrations:**
   ```bash
   npx prisma migrate deploy
   ```
2. **Initialize Chart of Accounts:**
   ```bash
   npx tsx -e "import { DoubleEntryLedger } from './src/lib/double-entry'; DoubleEntryLedger.ensureStandardAccounts().then(() => console.log('Standard Accounts Ready'))"
   ```
3. **Seed Initial Accounts via Double-Entry Journal:**
   Any initial opening balance (e.g. advertiser seed deposit) MUST be accompanied by an opening journal transaction (`Dr 1010_NODAL_BANK_ASSET, Cr 2010_ADVERTISER_ESCROW_LIABILITY`) so that general ledger and sub-ledger wallets remain 1:1 synchronized from day 1.
4. **Run Pre-Flight Integrity Test:**
   ```bash
   npm test
   ```

### 9.2 Continuous Financial Monitoring (Cron Schedule)
Schedule automated reconciliation every hour via cron:
```bash
# General Ledger hourly reconciliation cron
0 * * * * cd /opt/adearn-ai && node scripts/reconcile_ledger.js >> /var/log/adearn/reconcile.log 2>&1
```
- **Alert Trigger:** If `discrepancies > 0` or `SUM(Dr) !== SUM(Cr)`, trigger P0 PagerDuty / Telegram incident alert.

### 9.3 Emergency Incident Recovery: Lock Contention / Deadlocks
If MySQL InnoDB encounters a deadlock or lock timeout under heavy traffic spikes:
1. Verify connection pool sizing: Ensure `connection_limit >= 30` and `pool_timeout >= 20` in `DATABASE_URL`.
2. Check for long-running uncommitted transactions:
   ```sql
   SELECT trx_id, trx_state, trx_started, trx_wait_started, trx_query 
   FROM information_schema.innodb_trx 
   ORDER BY trx_started ASC;
   ```
3. Terminate stalled transaction if identified:
   ```sql
   KILL <connection_id>;
   ```
4. Re-run reconciliation inspector to confirm ledger equilibrium:
   ```bash
   node scripts/reconcile_ledger.js
   ```
