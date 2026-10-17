# Docker Compose Deployment Guide — AdEarn AI

This runbook guides you through building, migrating, running, and managing the multi-container AdEarn AI production stack.

---

## 1. Prerequisites Checklist

- Ubuntu server prepared with Docker Engine and Docker Compose v2.
- DNS A-records pointing to server public IP (`adearn.ai` and `www.adearn.ai`).
- Firewall allowing only ports 80, 443, and 22.
- Environment variables configured in `.env.production`.

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cd /home/adearn/app
cp .env.example .env
chmod 600 .env
```

Ensure production secrets are generated cryptographically:
```bash
# Generate high-entropy keys
openssl rand -base64 32 # for JWT_SECRET
openssl rand -base64 32 # for COOKIE_SECRET
openssl rand -hex 16    # for DB_PASSWORD
openssl rand -hex 16    # for REDIS_PASSWORD
```

Set these inside `/home/adearn/app/.env`.

---

## 3. Initial Build & Container Startup

```bash
# Build the Next.js container image
docker compose build --no-cache

# Start database and Redis services first
docker compose up -d db redis

# Check container health status
docker compose ps
```

Wait until `adearn-db` and `adearn-redis` report `(healthy)`.

---

## 4. Database Migrations & Initial Seed

Run database migrations inside an ephemeral migration container connected to the internal Docker network:

```bash
# Push schema migrations
docker compose run --rm app npx prisma db push

# (Optional - Staging only) Seed initial test fixtures
docker compose run --rm app node scripts/seed.js
```

---

## 5. Start Full Application Stack

```bash
docker compose up -d
```

Verify that all 4 containers are up and running:
```bash
docker compose ps
```

Output should resemble:
```text
NAME           IMAGE          COMMAND                  SERVICE   STATUS              PORTS
adearn-app     adearn-app     "docker-entrypoint.s…"   app       Up (healthy)        3000/tcp
adearn-db      mysql:8.0      "docker-entrypoint.s…"   db        Up (healthy)        3306/tcp
adearn-nginx   nginx:alpine   "/docker-entrypoint.…"   nginx     Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
adearn-redis   redis:7-alpine "docker-entrypoint.s…"   redis     Up (healthy)        6379/tcp
```

---

## 6. Live Telemetry & Log Monitoring

```bash
# Tail all container logs
docker compose logs -f

# Tail only application errors
docker compose logs -f app | grep ERROR

# Tail Nginx access log with response times
docker compose exec nginx tail -f /var/log/nginx/access.log
```

---

## 7. Container Lifecycle Management

```bash
# Graceful restart of application without dropping database
docker compose restart app

# Stop the stack safely
docker compose down

# Stop and remove volumes (DESTRUCTIVE - Development only)
# docker compose down -v
```
