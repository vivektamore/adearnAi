# Production Troubleshooting & Diagnostics Runbook — AdEarn AI

---

## 1. Container Health & Connectivity Issues

### Symptom: `adearn-app` fails with database connection error
**Diagnostics:**
```bash
docker compose logs app | grep "PrismaClientInitializationError"
```
**Fix:**
- Verify MySQL container is healthy: `docker compose ps db`.
- Check database user credentials:
  ```bash
  docker compose exec db mysql -u adearn_user -p"$DB_PASSWORD" -e "SELECT 1;"
  ```
- Ensure `DATABASE_URL` in `.env` uses `db:3306`, not `localhost:3306`, inside Docker networks.

---

## 2. Nginx 502 Bad Gateway

### Symptom: Nginx returns HTTP 502 to web browsers
**Diagnostics:**
```bash
docker compose logs nginx | tail -n 50
```
**Fix:**
- Confirm Next.js app container is running: `docker compose ps app`.
- Test local container proxy connectivity:
  ```bash
  docker compose exec nginx wget -qO- http://app:3000/api/health
  ```
- If app crashed due to memory exhaustion, inspect `dmesg | grep -i oom` on the host and adjust container memory limits.

---

## 3. High CPU / Slow Database Queries

### Symptom: Response times exceed 1.5 seconds on feed or wallet
**Diagnostics:**
```bash
# Check running MySQL processes
docker compose exec db mysql -u root -p -e "SHOW FULL PROCESSLIST;"

# Inspect slow query log
docker compose exec db tail -f /var/lib/mysql/slow-query.log
```
**Fix:**
- Ensure indexes exist on queried foreign keys: `organizationId`, `userId`, `campaignId`.
- Verify connection pool limits in `DATABASE_URL` (`connection_limit=30`).

---

## 4. Payout Stuck in `PROCESSING` State

### Symptom: User withdrawal remains in `PROCESSING` without UTR number
**Diagnostics:**
```bash
docker compose exec app node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.payoutRequest.findMany({ where: { status: 'PROCESSING' } }).then(console.log);
"
```
**Fix:**
- If sandbox mode is active, simulate provider webhook or clear via Admin Payouts clearing console (`/admin/payouts`).
- If provider failed with temporary timeout, click "Safe Retry" in the Admin Payout console. Safe retries preserve original idempotency keys.
