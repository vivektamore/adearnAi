# Environment Variables Reference — AdEarn AI
## Production Configuration, Invariants, and Secret Rotation Guide

All sensitive configuration must be managed through environment variables. **Never commit `.env` files with production credentials to Git.** In production, variables must be loaded via Docker Compose environment directives or a secure vault.

---

## 1. Master Environment Variable Matrix

| Variable Name | Purpose | Required / Optional | Example Format / Placeholder | Target Environment | Secret Rotation / Renewal Procedure |
|---|---|---|---|---|---|
| `NODE_ENV` | Controls Next.js compilation & runtime optimizations | Required | `production` | Production, Staging | Set statically during image build and deployment. |
| `PORT` | Local container HTTP listening port | Required | `3000` | All | Static port allocation. |
| `NEXT_PUBLIC_APP_URL` | Canonical public FQDN for CORS, redirects, and webhooks | Required | `https://adearn.ai` | All | Update DNS record and SSL certificate simultaneously if domain changes. |
| `DATABASE_URL` | Prisma MySQL 8.0 connection string with pool bounds | Required | `mysql://adearn_user:<PASSWORD>@db:3306/adearn_ai?connection_limit=30` | Production, Staging | Rotate DB password in MySQL first (`ALTER USER`), update `.env`, restart container. |
| `DB_ROOT_PASSWORD` | MySQL container root administrative credential | Required (Docker) | `openssl rand -hex 24` | Production, Staging | Rotate during planned maintenance window. Restrict access to DB host only. |
| `DB_PASSWORD` | MySQL application user credential | Required (Docker) | `openssl rand -hex 24` | Production, Staging | Zero-downtime rotation: create secondary user/password, test connection, update app. |
| `REDIS_URL` | Connection string for Redis 7 distributed cache | Required | `redis://:<PASSWORD>@redis:6379` | Production, Staging | Set matching password in Redis server configuration and update application URL. |
| `REDIS_PASSWORD` | Redis `AUTH` password | Required (Docker) | `openssl rand -hex 24` | Production, Staging | Rotate using `CONFIG SET requirepass <NEW_PASS>` without downtime, update `.env`. |
| `JWT_SECRET` | HMAC-SHA256 signing key for session tokens (min 32 chars) | Required | `openssl rand -base64 32` | Production, Staging | Generate new secret. Note: Invalidates existing active sessions; users must re-authenticate. |
| `COOKIE_SECRET` | Secret for cryptographic cookie signing | Required | `openssl rand -base64 32` | Production, Staging | Rotate quarterly. Invalidates stored browser cookies. |
| `AUDIT_HMAC_SECRET` | Key for tamper-evident audit log ledger hashing | Required | `openssl rand -base64 32` | Production, Staging | Master forensic key. Store encrypted backup in secure offline physical vault. |
| `PAYOUT_MODE` / `UPI_PAYOUT_PROVIDER` | Payout provider engine (`sandbox`, `cashfree`, `razorpayx`) | Required | `sandbox` (pre-live) / `razorpayx` | Production, Staging | Toggle to live only after bank nodal account KYC approval is formally executed. |
| `RAZORPAYX_KEY_ID` | RazorpayX API Key ID for automated payouts | Conditional | `rzp_live_xxxxxxxxxxxxxxxx` | Production (Live) | Rotate annually or immediately if leaked via Razorpay dashboard. |
| `RAZORPAYX_KEY_SECRET` | RazorpayX API Secret Key | Conditional | `openssl rand -hex 16` | Production (Live) | Generated in Razorpay dashboard. Replaces old key within 24-hour grace window. |
| `RAZORPAYX_ACCOUNT_NUMBER` | Authoritative bank current / nodal account number | Conditional | `78787800800` | Production (Live) | Authoritative corporate account assigned by banking partner. |
| `TELEMETRY_SIGNING_KEY` | Key for anti-fraud kinematic telemetry verification | Required | `openssl rand -hex 32` | Production, Staging | Rotate bi-annually. Shared between API and Chrome extension companion. |
| `STORAGE_DRIVER` | Media asset storage adapter (`local`, `s3`) | Required | `local` | Production, Staging | Change to `s3` when moving to multi-instance cloud cluster. |
| `STORAGE_LOCAL_PATH` | Absolute path inside container for uploads | Conditional | `/app/storage/uploads` | Production (Local) | Persistent Docker volume mount point. |
| `AWS_S3_BUCKET` | Cloudflare R2 / AWS S3 bucket name | Conditional | `adearn-creatives-prod` | Production (S3) | Set on initial cloud storage provisioning. |
| `AWS_ACCESS_KEY_ID` | Cloud object storage IAM credentials | Conditional | `AKIAIOSFODNN7EXAMPLE` | Production (S3) | Rotate via AWS IAM every 90 days using dual-key rotation. |
| `AWS_SECRET_ACCESS_KEY` | Cloud object storage IAM secret key | Conditional | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | Production (S3) | Rotate via AWS IAM every 90 days. |
| `AWS_REGION` | AWS / R2 region code | Conditional | `ap-south-1` (Mumbai) | Production (S3) | Match server geographic locality for low latency. |

---

## 2. Startup Validation & Safe Failure Handling

AdEarn AI strictly enforces required configuration during process initialization:
1. If `DATABASE_URL` is missing, Prisma will immediately abort startup with an informative configuration error.
2. If `JWT_SECRET` is missing or shorter than 32 characters, the authentication engine will safely reject startup in production mode to avoid weak HMAC security.
3. Diagnostic endpoints (`/api/health`) report only adapter **modes** and **health statuses** (`healthy` / `degraded`). Secret strings and connection credentials are **never printed to logs, console output, or API responses**.

---

## 3. Cryptographic Secret Generation Commands

Use these exact commands on the Ubuntu deployment host to generate production-grade keys:

```bash
# Generate 64-character hex strings
JWT_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
AUDIT_HMAC_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 24)
```
