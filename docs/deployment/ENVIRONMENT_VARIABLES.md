# Environment Variables Reference — AdEarn AI

All sensitive configuration must be managed through environment variables. Never commit `.env` files with production credentials to Git.

---

## 1. Core Server & Application

| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | Yes | Runtime environment (`production`, `development`, `test`) | `production` |
| `PORT` | Yes | HTTP listening port for the Next.js process | `3000` |
| `NEXT_PUBLIC_APP_URL` | Yes | Publicly accessible base URL | `https://adearn.ai` |

---

## 2. Relational Database (MySQL 8.0)

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | Prisma connection string with connection pool options | `mysql://adearn_user:password@db:3306/adearn_ai?connection_limit=30` |
| `DB_ROOT_PASSWORD` | Yes (Docker) | Root password for MySQL container initialization | `openssl rand -hex 16` |
| `DB_PASSWORD` | Yes (Docker) | Dedicated application user password | `openssl rand -hex 16` |

---

## 3. Distributed Cache & Job Queue (Redis 7)

| Variable | Required | Description | Example |
|---|---|---|---|
| `REDIS_URL` | Yes | Connection string for Redis instance with password | `redis://:password@redis:6379` |
| `REDIS_PASSWORD` | Yes (Docker) | Password required for Redis clients (`AUTH`) | `openssl rand -hex 16` |

---

## 4. Cryptographic Secrets & Authentication

| Variable | Required | Description | Example |
|---|---|---|---|
| `JWT_SECRET` | Yes | High-entropy secret for HMAC-SHA256 session tokens | `openssl rand -base64 32` |
| `COOKIE_SECRET` | Yes | Secret for signing secure session cookies | `openssl rand -base64 32` |
| `AUDIT_HMAC_SECRET` | Yes | Key for tamper-evident audit log hashing | `openssl rand -base64 32` |

---

## 5. Payment & Payout Adapters

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `UPI_PAYOUT_PROVIDER` | Yes | Payout provider engine (`sandbox`, `cashfree`, `razorpayx`) | `sandbox` |
| `CASHFREE_CLIENT_ID` | Conditional | Cashfree Payouts API Client ID | `CF_PAYOUT_ID_...` |
| `CASHFREE_CLIENT_SECRET` | Conditional | Cashfree Payouts API Secret Key | `CF_SECRET_...` |
| `RAZORPAYX_ACCOUNT_NUMBER` | Conditional | RazorpayX Current Account Number | `78787800800` |
| `RAZORPAYX_KEY_ID` | Conditional | RazorpayX API Key ID | `rzp_live_...` |
| `RAZORPAYX_KEY_SECRET` | Conditional | RazorpayX API Key Secret | `rzp_secret_...` |

---

## 6. Storage Adapter

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `STORAGE_DRIVER` | Yes | Media asset storage adapter (`local`, `s3`) | `local` |
| `STORAGE_LOCAL_PATH` | Conditional | Local directory for uploaded creative assets | `/app/storage/uploads` |
| `AWS_S3_BUCKET` | Conditional | S3 / Cloudflare R2 bucket name | `adearn-creatives-prod` |
| `AWS_ACCESS_KEY_ID` | Conditional | Object storage access key ID | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Conditional | Object storage secret key | `...` |
| `AWS_REGION` | Conditional | S3 region | `ap-south-1` (Mumbai) |

---

## 7. Email & Communication Gateway

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `SMTP_HOST` | Optional | Transactional email provider host | `smtp.sendgrid.net` |
| `SMTP_PORT` | Optional | SMTP port | `587` |
| `SMTP_USER` | Optional | SMTP username | `apikey` |
| `SMTP_PASS` | Optional | SMTP API key | `SG...` |
| `FROM_EMAIL` | Optional | Sender address for system notifications | `notifications@adearn.ai` |
