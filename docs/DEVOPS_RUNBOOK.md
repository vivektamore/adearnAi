# Master DevOps & SRE Operations Runbook — AdEarn AI
## Production Architecture, Service Catalog, Incident Response, and Maintenance Procedures

This document serves as the primary operational guide for Site Reliability Engineers (SRE) and DevOps personnel maintaining the AdEarn AI production platform.

---

## 1. Quick Reference: Core Services & Topology

| Service | Container Name | Internal Port | External Port | Healthcheck Probe | Restart Policy |
|---|---|---|---|---|---|
| **Edge Proxy** | `adearn-nginx` | 80, 443 | 80, 443 (HTTP/S) | `nginx -t` | `always` |
| **Application** | `adearn-app` | 3000 | - (Internal net only) | `GET /api/health` | `always` |
| **Database** | `adearn-db` | 3306 | - (Internal net only) | `mysqladmin ping` | `always` |
| **Cache & Queue** | `adearn-redis` | 6379 | - (Internal net only) | `redis-cli ping` | `always` |

> [!IMPORTANT]
> Neither MySQL (3306) nor Redis (6379) is bound to host ports. They are reachable exclusively inside the Docker bridge network `internal_net`.

---

## 2. Operational Procedures & Shell Scripts

| Routine Operation | Supported Script Command | Description |
|---|---|---|
| **Deploy Release** | `bash ./scripts/deploy.sh` | Pre-deploy DB backup, tag image `:previous`, build, migrate, probe health, reload Nginx. |
| **Emergency Rollback** | `bash ./scripts/rollback.sh` | Instant container rollback to previous image tag and health verification. |
| **Rollback + DB Restore** | `bash ./scripts/rollback.sh --with-db-restore` | Reverts container and restores pre-deploy database snapshot. |
| **Database Backup** | `bash ./scripts/backup_db.sh [dir]` | Non-locking `mysqldump` snapshot, gzip-9 compression, 7-day retention pruning. |
| **Database Restore** | `bash ./scripts/restore_db.sh <file.sql.gz>` | Safe restoration with automated pre-restore live snapshot and table count audit. |
| **Application Restart** | `docker compose restart app` | Restarts Next.js application without touching DB or Redis state. |
| **Edge Proxy Reload** | `docker compose exec nginx nginx -s reload` | Reloads Nginx reverse proxy configuration with zero dropped connections. |

---

## 3. Real-Time Diagnostics & Monitoring

### Probing API Health & DB Latency:
```bash
curl -s http://localhost:3000/api/health | jq .
```

### Inspecting Container Health Status:
```bash
docker compose ps
```

### Live Log Streaming:
```bash
# Application error logs:
docker compose logs -f --tail=100 app | grep -iE "(error|exception|fail)"

# Nginx HTTP access & upstream response times:
docker compose logs -f --tail=100 nginx

# MySQL database activity & slow queries:
docker compose logs -f --tail=100 db
```

---

## 4. Emergency Incident Triage (Severity 1)

1. **Service Outage / 502 Bad Gateway:**
   - Run `docker compose ps` to identify which container exited.
   - If `app` crashed, run `docker compose logs --tail=100 app`.
   - If host ran out of memory, inspect `dmesg -T | grep -i oom`.
   - Execute fast rollback: `bash ./scripts/rollback.sh`.

2. **Database Connectivity Failure:**
   - Verify DB health: `docker compose exec db mysqladmin ping -u root -p`.
   - Check connection limit in `.env`: `DATABASE_URL` should have `connection_limit=30`.

3. **Financial Discrepancy / Payout Failure:**
   - Check `/admin/payouts` console for transactions marked `PROCESSING` or `FAILED`.
   - Verify that compensating ledger recovery posted `PAYOUT_REVERSAL` to restore creator available balance.

---

## 5. Deployment Documentation Library (`docs/deployment/`)

For in-depth operational runbooks, refer to:
- [Ubuntu Server Setup Guide](docs/deployment/UBUNTU_SERVER_SETUP.md)
- [Environment Variables Reference](docs/deployment/ENVIRONMENT_VARIABLES.md)
- [Docker Deployment Guide](docs/deployment/DOCKER_DEPLOYMENT.md)
- [Nginx Reverse Proxy Configuration](docs/deployment/Nginx_REVERSE_PROXY.md)
- [HTTPS & SSL Setup](docs/deployment/HTTPS_SETUP.md)
- [Database Migrations Guide](docs/deployment/DATABASE_MIGRATIONS.md)
- [Database Backup & Restore](docs/deployment/BACKUP_AND_RESTORE.md)
- [Release Rollback Procedures](docs/deployment/ROLLBACK.md)
- [Production Pre-Flight Checklist](docs/deployment/PRODUCTION_CHECKLIST.md)
- [Production Troubleshooting](docs/deployment/TROUBLESHOOTING.md)
- [Production Deployment Report](docs/deployment/DEPLOYMENT_REPORT.md)
