# AdEarn AI — Environment Variable Reference

This document catalogs all environment variables used across development, testing, staging, and production environments.

---

## 1. Master Configuration Matrix

| Variable | Required in Prod | Default (Dev) | Description | Security Level |
|---|:---:|---|---|:---:|
| `DATABASE_URL` | **Yes** | `mysql://root:password@localhost:3306/adearn_ai` | MySQL 8.0 connection string with connection pool parameters | **Critical Secret** |
| `JWT_SECRET` | **Yes** | `adearn-ai-development-super-secret-jwt-key-...` | Minimum 32-character secret key for HMAC-SHA256 JWT signing | **Critical Secret** |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration window | Standard Config |
| `NODE_ENV` | **Yes** | `development` | Node.js execution environment (`production`, `development`, `test`) | Standard Config |
| `PORT` | No | `3000` | HTTP port for Next.js web application | Standard Config |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `http://localhost:3000` | Canonical public URL used for redirects and email notifications | Public Config |
| `PAYOUT_MODE` | **Yes** | `sandbox` | Disbursal engine mode (`sandbox` or `live`). Controls real nodal movement. | **High Risk** |
| `RAZORPAYX_KEY_ID` | Conditional | `rzp_test_...` | RazorpayX API Key ID (Required if `PAYOUT_MODE="live"`) | **Critical Secret** |
| `RAZORPAYX_KEY_SECRET` | Conditional | `secret_...` | RazorpayX API Secret (Required if `PAYOUT_MODE="live"`) | **Critical Secret** |
| `RAZORPAYX_ACCOUNT_NUMBER`| Conditional | `232323...` | Designated RBI-compliant Nodal Settlement Account number | Sensitive Config |
| `MIN_WITHDRAWAL_THRESHOLD_PAISE` | No | `10000` | Minimum voluntary withdrawal in paise (₹100.00) | Standard Config |
| `MAX_DAILY_EARNING_CAP_PAISE` | No | `500000` | Maximum daily reward accrual per creator in paise (₹5,000.00) | Standard Config |
| `TEST_BASE_URL` | No | `http://localhost:3000` | Target URL for automated integration test suites | Test Config |

---

## 2. Environment Configuration File `.env.production.example`

```bash
# ==============================================================================
# ADEARN AI — PRODUCTION ENVIRONMENT CONFIGURATION TEMPLATE
# ==============================================================================

# Database Persistence (MySQL 8.0 with InnoDB)
DATABASE_URL="mysql://adearn_app:YourStrongPassword123!@127.0.0.1:3306/adearn_ai?connection_limit=25&sslaccept=strict"

# Authentication & Cryptographic Keys
JWT_SECRET="generate-a-strong-random-64-character-hex-string-for-production"
JWT_EXPIRES_IN="7d"

# Runtime Environment
NODE_ENV="production"
PORT=3000
NEXT_PUBLIC_APP_URL="https://adearn.ai"

# Financial Disbursal Engine
# KEEP SET TO "sandbox" UNTIL FORMAL BANK NODAL SIGN-OFF
PAYOUT_MODE="sandbox"

# Live Banking Gateway (Active when PAYOUT_MODE="live")
RAZORPAYX_KEY_ID=""
RAZORPAYX_KEY_SECRET=""
RAZORPAYX_ACCOUNT_NUMBER=""

# Institutional Risk & Velocity Caps
MIN_WITHDRAWAL_THRESHOLD_PAISE=10000
MAX_DAILY_EARNING_CAP_PAISE=500000
```

