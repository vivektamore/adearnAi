# Production Troubleshooting & Diagnostics Runbook — AdEarn AI
## Incident Resolution, Log Analysis, Diagnostics, and Operational Fixes

---

## 1. Container Health & Connectivity Issues

### Symptom: `adearn-app` fails with database connection error
**Diagnostics:**
```bash
docker compose logs app | grep -E "(PrismaClientInitializationError|ECONNREFUSED)"
```
**Fix:**
- Verify MySQL container is healthy: `docker compose ps db`.
- Check database user credentials:
  ```bash
  docker compose exec db mysql -u adearn_user -p"$(grep DB_PASSWORD .env | cut -d '=' -f2)" -e "SELECT 1;"
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
- If app crashed due to memory exhaustion, inspect `dmesg | grep -i oom` on the host and increase server swap or container memory limits in `docker-compose.yml`.

---

## 3. High CPU / Slow Database Queries

### Symptom: Response times exceed 1.5 seconds on feed, tasks, or wallet
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
- Ensure `innodb_buffer_pool_size` is tuned to at least 1G-2G in MySQL configuration.

---

## 4. Redis Connection Refused / Cache Degraded

### Symptom: `/api/health` reports Redis connectivity timeout or degraded state
**Diagnostics:**
```bash
docker compose logs redis | tail -n 30
docker compose exec redis redis-cli -a "$(grep REDIS_PASSWORD .env | cut -d '=' -f2)" ping
```
**Fix:**
- If Redis returns `WRONGPASS`, ensure `REDIS_PASSWORD` matches between `.env` and `docker-compose.yml`.
- If memory limit is reached, check Redis memory policy: `CONFIG GET maxmemory-policy` (must be `allkeys-lru`).

---

## 5. Payout Stuck in `PROCESSING` State

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
- If in `sandbox` mode, simulate provider clearing or process directly via the Admin Payouts Console (`/admin/payouts`).
- If provider failed with a temporary bank gateway timeout, trigger safe retry in the Admin Payout console. Safe retries preserve idempotency keys.
- If provider permanently rejected the transfer, use compensating recovery: the ledger posts a `PAYOUT_REVERSAL` transaction crediting the user's available balance back.

---

## 6. Rate Limiting HTTP 429 Errors

### Symptom: User or API client receives HTTP 429 Too Many Requests
**Diagnostics:**
```bash
docker compose logs nginx | grep "limiting requests, excess"
```
**Fix:**
- Nginx applies rate limiting per `$binary_remote_addr`:
  - `/api/auth/`: 5 req/s (burst 10)
  - `/api/`: 15 req/s (burst 30)
- If legitimately high traffic from an office IP or proxy, increase the burst value in `nginx/conf.d/adearn.conf`:
  ```nginx
  limit_req zone=api_limit burst=60 nodelay;
  ```
- Reload Nginx: `docker compose exec nginx nginx -s reload`.

---

## 7. Let's Encrypt Certificate Renewal Failure

### Symptom: HTTPS certificate expired or Certbot reports challenge error
**Diagnostics:**
```bash
docker run --rm -it \
  -v "/home/adearn/app/nginx/certbot/conf:/etc/letsencrypt" \
  -v "/home/adearn/app/nginx/certbot/www:/var/www/certbot" \
  certbot/certbot renew --dry-run
```
**Fix:**
- Ensure DNS A-records for `adearn.ai` and `www.adearn.ai` resolve to the public IP of the host.
- Verify Nginx is serving `/.well-known/acme-challenge/` from `/var/www/certbot`.
- Test challenge accessibility:
  ```bash
  echo "test" > nginx/certbot/www/.well-known/acme-challenge/test.txt
  curl -i http://adearn.ai/.well-known/acme-challenge/test.txt
  ```
