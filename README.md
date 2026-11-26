# AdEarn AI — Production Sponsored-Content & User Rewards Marketplace

> **India-focused B2B2C Advertising Platform** featuring ASCI compliance, RBI Nodal Escrow accounting, Kinematic Attention Telemetry, Append-Only Double-Entry Ledger, and 20 Google Stitch AI Reference Screens.

---

## 🌟 Key Platform Capabilities

1. **Approved Stitch UI/UX Preservation**: All 20 approved Google Stitch AI reference designs (User, Advertiser, Admin, and Chrome Extension Companion) are faithfully implemented with exact colors, typography, cards, and micro-interactions.
2. **Authoritative Financial Ledger**:
   - Double-entry accounting with append-only ledger transactions.
   - All monetary amounts stored as 64-bit integer minor units (`paise`, where ₹1.00 = 100 paise).
   - Strict overdraft protection: concurrent withdrawals cannot exceed available balances.
   - Compensating failure recovery: failed payouts generate atomic `PAYOUT_REVERSAL` ledger credits.
   - Idempotency guarantees on all money-moving operations.
3. **Kinematic Attention Telemetry Engine**:
   - Validates user task engagement via dwell time, mouse vector velocity, and keystroke cadence.
   - Detects and rejects headless bots and automated macros before crediting rewards.
4. **Tenant-Isolated Advertiser Portal**:
   - Campaign creation wizard with audience, budget, flight schedule, and creative asset management.
   - Live telemetry, attribution analytics, and GST tax invoice generation.
5. **Admin Operations & Compliance Hub**:
   - Campaign moderation queue with change requests and approvals.
   - Kinematic Fraud Lab for forensic inspection of bot attempts.
   - Payout clearing console with dual-approval workflow for high-value transactions.
   - Tamper-evident SHA-256 cryptographic audit logging.
6. **Hardened Edge Security & RBAC**:
   - Next.js Edge Middleware verifying WebCrypto HMAC-SHA256 session tokens.
   - Role-Based Access Control enforcing boundary isolation between User, Advertiser, and Admin portals.
   - PII destination masking on creator payout destinations (`••••••••8123` / `ro*******ma@okhdfcbank`).

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ (tested on v20.17.0)
- MySQL 8.0 Server running on `localhost:3306`

### 2. Installation
```bash
# Clone repository
git clone https://github.com/adearn/adearn-ai.git
cd adearn-ai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### 3. Database Migration & Seed
```bash
# Push schema to MySQL
npx prisma db push

# Seed test fixtures (users, organizations, campaigns, wallets)
node scripts/seed.js
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔑 Test Credentials (Development Fixtures)

| Role | Email | Password | Access Portal |
|---|---|---|---|
| **Admin** | `admin@adearn.ai` | `Admin@12345` | `/admin` |
| **Advertiser** | `advertiser@zerodha.in` | `Advertiser@12345` | `/advertiser` |
| **Creator / User** | `arun@creator.in` | `User@12345` | `/` (User Dashboard) |

A unified 1-click test login is accessible at `/login`.

---

## 🧪 Comprehensive Automated Test Suites

```bash
# Run the complete test suite (56 Invariants Verified: 56 Passed, 0 Failed)
npm test

# Alternatively, run individual test suites:
node test/run_tests.js                 # Financial invariants & anti-fraud engine (16 tests)
node test/e2e_workflows.test.js        # Cross-portal end-to-end workflows (23 tests)
node test/security_and_payments.test.js # Edge middleware, RBAC & payment flows (17 tests)

# Run high-concurrency HTTP and database load benchmark
node scripts/load_test.js
```

---

## 🚢 Production Deployment & Operations

AdEarn AI includes production-ready Docker orchestration, Nginx reverse proxy, and automated operational scripts:

### Operational Shell Scripts
- **Database Backup:** `bash ./scripts/backup_db.sh [backup_dir]` (automated snapshot, gzip-9, 7-day retention)
- **Database Restore:** `bash ./scripts/restore_db.sh <backup_file.sql.gz>` (safe restore with pre-flight snapshot)
- **Production Deploy:** `bash ./scripts/deploy.sh` (backup -> build -> migrate -> health check -> Nginx reload)
- **Emergency Rollback:** `bash ./scripts/rollback.sh [--with-db-restore]` (instant rollback to `:previous` image)

### Deployment Documentation Suite (`docs/deployment/`)
1. [Ubuntu Server Setup Guide](docs/deployment/UBUNTU_SERVER_SETUP.md) — Bare-metal / Cloud VM hardening and setup.
2. [Environment Variables Reference](docs/deployment/ENVIRONMENT_VARIABLES.md) — Variable reference and rotation policies.
3. [Docker Deployment Guide](docs/deployment/DOCKER_DEPLOYMENT.md) — Container topology and operations.
4. [Nginx Reverse Proxy & Load Balancer](docs/deployment/Nginx_REVERSE_PROXY.md) — Edge gateway and rate-limiting zones.
5. [HTTPS & Automated SSL Setup](docs/deployment/HTTPS_SETUP.md) — Let's Encrypt Certbot automation.
6. [Database Migrations & Data Safety](docs/deployment/DATABASE_MIGRATIONS.md) — Prisma schema migrations and data protection.
7. [Database Backup & Disaster Recovery](docs/deployment/BACKUP_AND_RESTORE.md) — Snapshot routines and recovery.
8. [Release Rollback Procedures](docs/deployment/ROLLBACK.md) — Emergency reversion and forward-fixes.
9. [Pre-Flight Production Checklist](docs/deployment/PRODUCTION_CHECKLIST.md) — 24-point pre-flight audit.
10. [Production Troubleshooting](docs/deployment/TROUBLESHOOTING.md) — Diagnostics for DB, proxy, cache, and payouts.
11. [Deployment & Readiness Report](docs/deployment/DEPLOYMENT_REPORT.md) — Evidence-based deployment audit.

---

## 📚 Technical Reference Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Implementation Audit](docs/IMPLEMENTATION_AUDIT.md)
- [DevOps SRE Runbook](docs/DEVOPS_RUNBOOK.md)
- [Known Limitations](docs/KNOWN_LIMITATIONS.md)
- [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Financial Ledger](docs/FINANCIAL_LEDGER.md)
- [Reward State Machine](docs/REWARD_STATE_MACHINE.md)
- [Role Permission Matrix](docs/ROLE_PERMISSION_MATRIX.md)
- [Security Review](docs/SECURITY_REVIEW.md)
- [Privacy & DPDP Act Compliance](docs/PRIVACY_AND_DATA_HANDLING.md)
- [Load Test Results](docs/performance/LOAD_TEST_RESULTS.md)
