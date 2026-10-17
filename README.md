# AdEarn AI — Production Sponsored-Content & User Rewards Marketplace

> **India-focused B2B2C Advertising Platform** featuring ASCI compliance, RBI Nodal Escrow accounting, Kinematic Attention Telemetry, Append-Only Double-Entry Ledger, and 20 Google Stitch AI Reference Screens.

---

## 🌟 Key Platform Capabilities

1. **Approved Stitch UI/UX Preservation**: All 20 approved Google Stitch AI reference designs (User, Advertiser, Admin, and Chrome Extension Companion) are faithfully implemented with exact colors, typography, cards, and micro-interactions.
2. **Authoritative Financial Ledger**:
   - Double-entry accounting with append-only ledger transactions.
   - All monetary amounts stored as 64-bit integer minor units (`paise`, where ₹1.00 = 100 paise).
   - Strict overdraft protection: concurrent withdrawals cannot exceed available balances.
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

## 🧪 Automated Testing & Load Benchmarking

```bash
# Run automated financial ledger, telemetry, and RBAC test suite
node test/run_tests.js

# Run high-concurrency HTTP and database load benchmark
node scripts/load_test.js
```

---

## 🚢 Production Deployment

For full deployment instructions on an Ubuntu server using Docker Compose and Nginx, refer to the documentation:

- [Ubuntu Server Setup](docs/deployment/UBUNTU_SERVER_SETUP.md)
- [Docker Compose Deployment](docs/deployment/DOCKER_COMPOSE_DEPLOYMENT.md)
- [Environment Variables](docs/deployment/ENVIRONMENT_VARIABLES.md)
- [Nginx Reverse Proxy & SSL](docs/deployment/NGINX_REVERSE_PROXY.md)
- [Database Setup & Tuning](docs/deployment/DATABASE_SETUP.md)
- [Disaster Recovery & Backups](docs/deployment/BACKUP_AND_RESTORE.md)
- [Production Pre-Flight Checklist](docs/deployment/PRODUCTION_CHECKLIST.md)

---

## 📚 Complete System Documentation

- [Implementation Audit](docs/IMPLEMENTATION_AUDIT.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Financial Ledger](docs/FINANCIAL_LEDGER.md)
- [Reward State Machine](docs/REWARD_STATE_MACHINE.md)
- [Role Permission Matrix](docs/ROLE_PERMISSION_MATRIX.md)
- [Security Review](docs/SECURITY_REVIEW.md)
- [Privacy & DPDP Act Compliance](docs/PRIVACY_AND_DATA_HANDLING.md)
- [DevOps SRE Runbook](docs/DEVOPS_RUNBOOK.md)
- [Load Test Results](docs/performance/LOAD_TEST_RESULTS.md)
