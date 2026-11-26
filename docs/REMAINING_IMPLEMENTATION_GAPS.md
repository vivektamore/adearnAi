# ADEARNAI — REMAINING IMPLEMENTATION GAPS & REMEDIATION PLAN

**Date:** November 2026  
**Auditor:** Principal Software Architect, Application Security & FinTech Systems Engineer  

---

## 1. Verified Gaps Identified During Master Audit

### Gap 1: Database Session Lifecycle Tracking
* **Current State:** JWT tokens are signed statelessly using HMAC-SHA256 and stored in `adearn_session` cookie. The newly migrated `Session` table in MySQL 8.0 is ready but not yet populated during login.
* **Remediation:** Update `src/app/api/auth/login/route.ts` to insert a `Session` record with `sessionToken`, `userId`, `ipAddress`, `userAgent`, and `expiresAt`. Update `src/app/api/auth/logout/route.ts` to invalidate the session record.

---

### Gap 2: User Preference Atomic Initialization
* **Current State:** Extension popup uses local storage (`adearn_opt_in_rewards`) for reward preferences. The newly migrated `UserPreference` table is ready.
* **Remediation:** Update `src/app/api/auth/register/route.ts` to atomically initialize `UserPreference` for newly registered creators, ensuring default DPDP-compliant settings.

---

### Gap 3: Payment Gateway Webhook Audit Ingestion
* **Current State:** Payment webhooks were previously stubbed in mock handlers.
* **Remediation:** Implement `/api/webhooks/payouts` to record incoming webhook payloads into `PaymentWebhookRecord` with idempotency deduplication and status tracking.

---

### Gap 4: Pacing and Delivery Scheduler Integration
* **Current State:** Campaigns store `dailyBudgetCapPaise` and `minKycTier` in `requirementsJson` and now natively on `Campaign` columns.
* **Remediation:** Ensure `/api/ads/serve` explicitly enforces `dailyBudgetCapPaise` rollups against `CampaignDailyAggregate` so campaigns reaching their daily limit are automatically paused until next UTC midnight.

---

## 2. Summary of Remediation Actions

| Subsystem | File Target | Remediation Action | Status |
| :--- | :--- | :--- | :--- |
| **Auth** | `src/app/api/auth/login/route.ts` | Populate `Session` record on login | IN PROGRESS |
| **Auth** | `src/app/api/auth/logout/route.ts` | Invalidate `Session` record on logout | IN PROGRESS |
| **Auth** | `src/app/api/auth/register/route.ts` | Initialize `UserPreference` on registration | IN PROGRESS |
| **Ad Serving** | `src/app/api/ads/serve/route.ts` | Enforce daily budget cap and KYC tier filter | IN PROGRESS |
| **Finance** | `src/app/api/webhooks/payouts/route.ts` | Idempotent webhook logging into `PaymentWebhookRecord` | IN PROGRESS |
