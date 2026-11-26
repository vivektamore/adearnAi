# Docker Deployment Guide — AdEarn AI
## Production Multi-Container Orchestration, Topology, and Operations

This runbook guides Site Reliability Engineers and DevOps through building, running, scaling, and managing the multi-container AdEarn AI production stack.

---

## 1. Production Container Architecture

The AdEarn AI production stack is containerized using Docker Engine and Docker Compose v2.

```
                              [ Public Internet ]
                                       │
                                   Port 80/443
                                       ▼
                         ┌───────────────────────────┐
                         │   adearn-nginx (Proxy)    │
                         │   TLS 1.2/1.3, Rate-Limits│
                         └─────────────┬─────────────┘
                                       │ internal_net (Bridge)
                                       ▼
                         ┌───────────────────────────┐
                         │   adearn-app (Next.js)    │
                         │   Node 20 Alpine, Non-root│
                         └─────────────┬─────────────┘
                                       │ internal_net (Bridge)
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
           ┌───────────────────────────┐┌───────────────────────────┐
           │     adearn-db (MySQL 8)   ││   adearn-redis (Redis 7)  │
           │     Volume: db_data       ││   Volume: redis_data      │
           └───────────────────────────┘└───────────────────────────┘
```

### Security Invariants:
- **Zero Exposed DB/Cache Ports:** Neither MySQL (3306) nor Redis (6379) binds to host ports. They exist strictly within `internal_net` (Docker internal bridge).
- **Non-Root Execution:** The Next.js container executes under user `nextjs:nodejs` (UID 1001).
- **Multi-Stage Build:** Multi-stage `Dockerfile` ensures build dependencies and dev toolchains are stripped from the runtime layer.

---

## 2. Environment Setup

```bash
cd /home/adearn/app
cp .env.example .env
chmod 600 .env
```

Ensure production secrets are generated cryptographically and set in `/home/adearn/app/.env`:
```bash
openssl rand -hex 32 # for JWT_SECRET
openssl rand -hex 32 # for COOKIE_SECRET
openssl rand -hex 24 # for DB_PASSWORD
openssl rand -hex 24 # for REDIS_PASSWORD
```

---

## 3. Initial Build & Startup

```bash
# 1. Build the production Next.js container image
docker compose build --no-cache

# 2. Launch MySQL and Redis data services first
docker compose up -d db redis

# 3. Verify data services are healthy
docker compose ps
```

Wait until `adearn-db` and `adearn-redis` show `(healthy)`.

---

## 4. Controlled Database Schema Migration

Execute non-destructive database migrations inside an ephemeral container on the internal network:

```bash
# Apply schema migrations safely without clearing data
docker compose run --rm app npx prisma db push --skip-generate
```

> [!CAUTION]
> Never run `prisma db push --force-reset` or `prisma migrate reset` in a production or staging environment with real data!

---

## 5. Launch Full Stack

```bash
# Start all services (app, db, redis, nginx)
docker compose up -d

# Verify container status
docker compose ps
```

Expected status:
```text
NAME           IMAGE          COMMAND                  SERVICE   STATUS              PORTS
adearn-app     adearn-app     "npm start"              app       Up (healthy)        3000/tcp
adearn-db      mysql:8.0      "mysqld ..."             db        Up (healthy)        
adearn-nginx   nginx:alpine   "/docker-entrypoint.…"   nginx     Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
adearn-redis   redis:7-alpine "redis-server ..."       redis     Up (healthy)        
```

---

## 6. Automated Deployment Workflow

To deploy subsequent updates with automated database backup and health verification:

```bash
bash ./scripts/deploy.sh
```

This single command:
1. Backs up the live MySQL database to `./backups/pre_deploy/`.
2. Tags existing container image as `adearn-app:previous`.
3. Pulls and compiles the new build.
4. Executes Prisma migrations.
5. Performs rolling restart of `app`.
6. Validates `/api/health` probe.
7. Automatically triggers `./scripts/rollback.sh` if health checks fail.

---

## 7. Emergency Rollback

If a bad deployment passes build but fails in production runtime:

```bash
# Fast container rollback:
bash ./scripts/rollback.sh

# Complete rollback including pre-deploy database snapshot:
bash ./scripts/rollback.sh --with-db-restore
```

---

## 8. Log Review & Troubleshooting

```bash
# Tail application container logs
docker compose logs -f --tail=100 app

# Check Nginx access and upstream latency
docker compose logs -f --tail=100 nginx

# Check MySQL error log
docker compose logs -f db
```
