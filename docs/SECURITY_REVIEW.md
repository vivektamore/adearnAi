# Security Review & Risk Assessment — AdEarn AI

---

## 1. Threat Modeling & Controls Implemented

### A. Broken Object-Level Authorization (IDOR)
- **Threat**: An advertiser changes an ID parameter in a URL or payload to view another advertiser's campaign or billing invoice.
- **Defense**: Server-side tenant isolation enforced in `src/app/api/advertiser/`. `orgId` is derived strictly from the authenticated JWT session rather than client-supplied parameters.

### B. Concurrent Overdraft & Double-Spending Attacks
- **Threat**: A malicious user sends simultaneous concurrent withdrawal requests to drain their balance multiple times before the balance is decremented.
- **Defense**: All financial balance mutations run in Prisma interactive ACID transactions with optimistic lock checks (`version`) and strict pre-debit balance verification.

### C. Automated Bots & Macro Scripting
- **Threat**: Automated headless browsers (Puppeteer, Selenium) simulate ad clicks or survey submissions.
- **Defense**: Client-side kinematic attention telemetry (`src/lib/telemetry.ts`) captures dwell duration, mouse movement distance, and keypress cadence. Tasks submitted without genuine human interaction are rejected and routed to the Fraud Lab.

### D. Credential Stuffing & Brute Force
- **Threat**: Automated password guessing attacks against user and advertiser accounts.
- **Defense**: Bcrypt password hashing (10 salt rounds) + Nginx IP-based rate limiting on `/api/auth/` (5 requests/second with burst 10).

### E. Financial Audit Tampering
- **Threat**: A compromised database administrator account attempts to alter audit records or balances.
- **Defense**: Audit log entries calculate an HMAC-SHA256 signature chain (`hash`) using a private server secret. Any database alteration breaks hash verification during compliance audits.

---

## 2. Outstanding Risks & Next Enhancements

1. **Production SMS/OTP Gateway**:
   - Currently, user mobile numbers are verified via sandbox protocol. Production deployment requires contract signing with an Indian DLT-registered SMS provider (e.g. MSG91, Kaleyra, Twilio India) for OTP 2FA.
2. **Production Banking Provider Webhook Whitelisting**:
   - In production, Cashfree or RazorpayX webhooks must validate HMAC-SHA256 request headers and restrict inbound connections to provider IP CIDR blocks.
