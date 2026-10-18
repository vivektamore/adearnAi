# AdEarn AI — Production Go-Live & Operations Checklist

## 1. Pre-Deployment Configuration & Secrets Audit

Ensure all environment variables in production `.env` (or Docker secrets) are securely generated and distinct from development defaults:

- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `APP_URL=https://adearn.ai` (or configured production domain)
- [ ] `DATABASE_URL`: Production MySQL connection string with non-root user (`adearn_user`) and a high-entropy password ($\ge 32$ characters).
- [ ] `DB_ROOT_PASSWORD`: Secure root password for containerized MySQL.
- [ ] `REDIS_URL`: Authenticated connection string (`redis://:password@redis:6379`).
- [ ] `REDIS_PASSWORD`: High-entropy password for Redis.
- [ ] `JWT_SECRET`: 64-character random hex string (`openssl rand -hex 32`).
- [ ] `COOKIE_SECRET`: 64-character random hex string (`openssl rand -hex 32`).
- [ ] `AUDIT_LOG_HMAC_SECRET`: Dedicated secret key for cryptographic audit chaining.
- [ ] `UPI_PAYOUT_PROVIDER`: Set to `cashfree` or `razorpayx` once corporate keys are approved.
- [ ] `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY`: Live banking disbursement credentials.
- [ ] `STORAGE_DRIVER`: `s3` (or `local` with persistent Docker volume mount `/app/storage/uploads`).

---

## 2. Infrastructure & Network Security Hardening

- [ ] **Firewall (UFW / AWS Security Group):**
  - Allow Inbound: Port `80` (HTTP) and Port `443` (HTTPS).
  - Allow Inbound: Port `22` (SSH via public key authentication only, disable password auth).
  - Block Inbound: Port `3306` (MySQL) and Port `6379` (Redis). Never expose to public internet.
- [ ] **Docker Bridge Isolation:**
  - Verify `docker-compose.yml` uses `internal_net` with `internal: true` for `db` and `redis`.
  - Only `nginx` is attached to `public_net`.
- [ ] **Container User Privileges:**
  - Verify Next.js Dockerfile executes under non-root user `nextjs` (UID 1001).
- [ ] **Nginx Reverse Proxy & SSL:**
  - Let's Encrypt Certbot configured for automatic renewal via cron/systemd.
  - TLS 1.2 and TLS 1.3 only; modern cipher suites configured.
  - Security headers enabled:
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `X-Frame-Options: SAMEORIGIN`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 3. Database Migration & Baseline Verification

- [ ] Run Prisma migration check against production database:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Verify database indexes exist on critical lookup columns:
  - `User.email` (unique index)
  - `Wallet.userId` / `Wallet.organizationId` (unique indexes)
  - `Campaign.organizationId` / `Campaign.status` (composite index)
  - `TaskSubmission.userId` / `TaskSubmission.campaignId` (composite index)
  - `LedgerTransaction.walletId` / `LedgerTransaction.createdAt`
  - `PayoutRequest.walletId` / `PayoutRequest.status`
- [ ] Ensure non-destructive data policy is active:
  - Production deployments must NEVER run `prisma db push --force-reset` or `seed.js`.

---

## 4. Disaster Recovery & Automated Backup Setup

- [ ] Create backup directory:
  ```bash
  sudo mkdir -p /var/backups/adearn/mysql
  sudo chmod 700 /var/backups/adearn/mysql
  ```
- [ ] Install daily backup cron job (e.g. at 02:00 AM IST):
  ```bash
  0 2 * * * /usr/local/bin/backup-adearn-db.sh >> /var/log/adearn-backup.log 2>&1
  ```
- [ ] Configure backup retention policy:
  - Daily backups: retain 7 days.
  - Weekly backups: retain 4 weeks.
  - Monthly backups: retain 12 months.
- [ ] Test cold restore procedure into an isolated test container to confirm backup integrity.

---

## 5. Health Monitoring & Alerting

- [ ] Set up external uptime probe (e.g., BetterStack, UptimeRobot, or Cloudwatch):
  - URL: `https://adearn.ai/api/health`
  - Expected Status: HTTP 200
  - Interval: 60 seconds
  - Alert Threshold: 2 consecutive failures
- [ ] Set up Docker container restart monitoring:
  - `restart: always` configured on all services in `docker-compose.yml`.
- [ ] Log aggregation:
  - Monitor `/app/logs` volume for uncaught exceptions or database connection retry spikes.

---

## 6. Chrome Extension Packaging & Distribution

- [ ] Verify `extension/manifest.json`:
  - `manifest_version: 3`
  - `name: "AdEarn AI Companion"`
  - `version: "1.0.0"`
  - `host_permissions`: configured strictly for `https://*.adearn.ai/*`.
- [ ] Build distribution zip:
  ```bash
  cd extension
  zip -r ../adearn-extension-v1.0.0.zip manifest.json popup.html popup.js
  ```
- [ ] Submit package to Chrome Web Store Developer Dashboard for review.

---

## 7. Rollback Runbook (In Case of Deployment Failure)

If a critical defect is identified post-deployment:

1. **Revert Application Container to Previous Stable Tag:**
   ```bash
   docker-compose down app
   docker tag adearn-app:previous adearn-app:latest
   docker-compose up -d --no-deps app
   ```
2. **Database Rollback (if schema migration caused regression):**
   ```bash
   # Restore pre-deployment database dump
   docker exec -i adearn-db mysql -u adearn_user -p"$DB_PASSWORD" adearn_ai < /var/backups/adearn/pre_deploy_backup.sql
   ```
3. **Verify Restoration:**
   ```bash
   curl -s http://localhost:3000/api/health
   ```
