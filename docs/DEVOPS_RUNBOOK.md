# Master DevOps & SRE Operations Runbook — AdEarn AI

This document serves as the primary operational guide for Site Reliability Engineers (SRE) and DevOps personnel maintaining the AdEarn AI production platform.

---

## 1. Quick Reference: Core Services & Ports

| Service | Container Name | Internal Port | External Port | Healthcheck |
|---|---|---|---|---|
| Edge Proxy | `adearn-nginx` | 80, 443 | 80, 443 | `nginx -t` |
| Application | `adearn-app` | 3000 | - | `GET /api/health` |
| Database | `adearn-db` | 3306 | - | `mysqladmin ping` |
| Cache & Queue | `adearn-redis` | 6379 | - | `redis-cli ping` |

---

## 2. Common Operational Tasks

### Restarting the Application with Zero Database Disruption
```bash
docker compose restart app
```

### Checking System Health & Latency Telemetry
```bash
curl -s http://localhost:3000/api/health | jq .
```

### Inspecting Slow Database Queries
```bash
docker compose exec db tail -n 50 /var/lib/mysql/slow-query.log
```

### Triggering Manual Database Backup
```bash
/home/adearn/scripts/backup_db.sh
```

### Reviewing Application Error Logs
```bash
docker compose logs --tail=100 -f app | grep -i "error"
```
