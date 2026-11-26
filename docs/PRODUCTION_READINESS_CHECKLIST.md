# AdEarn AI — Production Readiness Checklist

This checklist must be reviewed and signed off prior to production deployment.

---

## 1. Architecture & Portals Separation

- [x] **Portal Isolation**: User Portal (`/dashboard`), Brand Portal (`/advertiser`), and Admin Portal (`/admin`) routes are strictly separated.
- [x] **No Cross-Portal Navigation**: Links between portals removed from layout sidebars and headers.
- [x] **Middleware Route Guard**: `src/middleware.ts` enforces role requirements at edge runtime.
- [x] **Server-Side API Guard**: All `/api/*` endpoints independently verify session role and permissions.
- [x] **Canonical Roles**: Canonical roles (`USER`, `ADVERTISER`, `ADMIN`, `SUPER_ADMIN`) normalized.

---

## 2. Authentication & Data Security

- [x] **Password Security**: Bcrypt with salt factor 10.
- [x] **JWT Security**: Signed with HMAC-SHA256; `JWT_SECRET` configured via environment.
- [x] **HTTP-Only Cookies**: `adearn_session` cookie configured with secure flags.
- [x] **IDOR Defense**: Multi-tenant organization boundaries enforced on all campaign, billing, and task queries.
- [x] **Destination Masking**: Payout destinations (UPI, Bank Account) masked on display (`pay***@okaxis`, `••••••••8123`).
- [x] **BigInt Protection**: All API route responses pass through `serializeBigInts(...)` to prevent JSON serialization crashes.

---

## 3. Financial Ledger & Nodal Settlement

- [x] **Integer Paise Invariant**: All monetary values stored and calculated as 64-bit BigInt integer paise.
- [x] **Zero Floating-Point Math**: Zero float multiplication/division on balances.
- [x] **Double-Entry Equilibrium**: Every economic transaction creates balanced debit and credit entries.
- [x] **Overdraft Prevention**: Conditional updates (`availablePaise >= amount`) prevent negative wallet balances under concurrency.
- [x] **Terminal State Defense**: Payouts in `CLEARED`, `FAILED`, or `CANCELLED` cannot be re-cleared or re-reversed.
- [x] **Disbursal Safety**: `PAYOUT_MODE="sandbox"` strictly enforced until formal banking partner sign-off.

---

## 4. Anti-Fraud & Kinematic Telemetry

- [x] **Kinematic Verification**: Task sessions enforce dwell time and interaction telemetry validation.
- [x] **Bot Rejection**: Instantaneous submissions and zero-movement scripts rejected with HTTP 422/400.
- [x] **Forensic Lab Workbench**: High-anomaly sessions quarantined for human review.
- [x] **Frequency Capping**: Daily impression frequency caps (max 10 impressions per user per campaign).
- [x] **Velocity Capping**: Maximum 15 impressions per minute per user.

---

## 5. Verification & Testing Sign-Off

- [x] **Automated Test Suite**: All 14 test suites pass (`npm test` exits code 0).
- [x] **TypeScript Compilation**: `npx tsc --noEmit` exits code 0 with 0 type errors.
- [x] **General Ledger Reconciliation**: `node scripts/reconcile_ledger.js` reports 100% equilibrium.
- [x] **Zero Mock Data in Production Seed**: `scripts/seed.js` provisions clean accounts with zero fake campaigns or spend.

