# AdEarn AI — System Architecture Specification
## Technical Architecture, Relational Schema, Financial State Machine, and Security Invariants

---

## 1. System Overview

AdEarn AI is an enterprise-grade advertising and sponsored-content platform connecting verified brands/advertisers with eligible Indian digital creators and users. It enforces strict compliance with Indian advertising guidelines (ASCI), regulatory payment safeguards (RBI Nodal account standards), and verifiable user task completion.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  [ User Portal (Screens 01-07) ]  [ Advertiser Portal (08-12) ]  [ Admin (13-19) ]|
|                       [ Chrome Extension Companion (Screen 20) ]                  |
+-----------------------------------------------------------------------------------+
                                          |
                              (HTTPS / WSS / JSON REST)
                                          v
+-----------------------------------------------------------------------------------+
|                         REVERSE PROXY & EDGE SECURITY                             |
|          Nginx (Rate Limiting, SSL/TLS Termination, Security Headers)             |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                              APPLICATION LAYER (Next.js)                          |
|  - Edge Middleware: Auth JWT & Session Guard, RBAC Validator, Multi-Tenant Guard  |
|  - API Routes (/api/auth, /api/campaigns, /api/tasks, /api/payouts, /api/admin)   |
|  - Business Modules:                                                              |
|      * Campaign Lifecycle Engine    * Verification & Kinematics Telemetry         |
|      * Financial Ledger Service     * Escrow Drawdown Engine                      |
|      * Payout Adapter Service       * Immutable Audit Logger                      |
+-----------------------------------------------------------------------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
+----------------------------------+       +------------------------------------+
|       PRIMARY DATABASE           |       |         CACHE & QUEUE ENGINE       |
|  MySQL 8.0 (InnoDB, Prisma ORM)  |       |  Redis 7 (Sessions, Rate Limits,   |
|  - Users & KYC Entities          |       |           Background Task Locks)   |
|  - Campaigns & Creatives         |       +------------------------------------+
|  - Authoritative Ledger (Paise)  |
|  - Immutable Audit Trails        |
+----------------------------------+
```

---

## 2. Core Business Entities & Relational Schema

### 2.1 Currency & Money Representation
All monetary values in the database are stored as **integer minor units (paise)** using 64-bit integer (`BigInt`) types:
- `₹1.00` = `100` paise
- `₹245.00` = `24500` paise
- `₹4,50,000.00` = `45000000` paise

Floating-point mathematics is strictly forbidden for financial calculations.

### 2.2 Relational Entities (Prisma / MySQL 8.0)
1. **User (`User`):** Identity, email, password hash, role (`USER`, `ADVERTISER`, `ADMIN`), status (`ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`).
2. **Organization (`Organization`):** Brand/advertiser tenant entity, GSTIN, business registration, contact details, nodal escrow balance (paise).
3. **Campaign (`Campaign`):** Campaign metadata, objective, action type (Survey, Interactive Sandbox, App Trial, Video), budget allocated (paise), budget spent (paise), cost per outcome (CPO paise), flight start/end, moderation status (`DRAFT`, `SUBMITTED`, `ACTIVE`, `REJECTED`, `PAUSED`, `COMPLETED`).
4. **CampaignCreative (`CampaignCreative`):** Creative banners, destination URLs, checksum, MIME type, moderation status.
5. **CampaignEscrowLock (`CampaignEscrowLock`):** Explicit escrow hold reserving advertiser funds during active campaign flight.
6. **TaskSession (`TaskSession`):** Instance of a user engaging with a campaign. Holds signed session token, client kinematics digest, dwell time, and status.
7. **UserReward (`UserReward`):** Reward ledger entity tracking user claim lifecycle (`PENDING` -> `APPROVED` -> `CREDITED`).
8. **LedgerTransaction (`LedgerTransaction`):** Append-only double-entry financial record. Fields: `id`, `referenceId`, `walletId`, `type` (`CREDIT_REWARD`, `DEBIT_WITHDRAWAL`, `ESCROW_LOCK`, `ESCROW_RELEASE`, `ADVERTISER_TOPUP`, `PAYOUT_REVERSAL`, `ADMIN_ADJUSTMENT`), `amountPaise`, `balanceAfterPaise`, `idempotencyKey`, `reason`, `createdAt`.
9. **PayoutMethod (`PayoutMethod`):** Masked creator withdrawal destination (`UPI` or `BANK_ACCOUNT`). Contains `accountNumberMasked` (`••••••••8123` or `ro*******ma@okhdfcbank`), `isDefault` flag, and strict user ownership isolation.
10. **PayoutRequest (`PayoutRequest`):** Creator withdrawal record. Status: `REQUESTED`, `PROCESSING`, `CLEARED`, `FAILED`, `CANCELLED`. Stores UTR bank reference and linked payout method.
11. **FundingOrder (`FundingOrder`):** Advertiser escrow top-up order tracking gross amount, 18% integer GST split, net escrow credit, and payment gateway references.
12. **AuditLog (`AuditLog`):** Immutable compliance log recording privileged administrative actions with HMAC-SHA256 tamper-evident integrity hashes.
13. **FraudDetectionEvent (`FraudDetectionEvent`):** Forensic record of flagged bot interactions, low dwell times, or abnormal cursor vectors.

---

## 3. Financial State Machine & Invariants

### 3.1 Reward Lifecycle
```
[User Discovers Campaign]
         |
         v
[Task Started] ---> Creates unique signed server task session
         |
         v
[Task Submitted] -> Server verifies kinematic telemetry & completion proof
         |
         +---------------------------------------+
         |                                       |
    (Proof Valid)                          (Fraud / Invalid)
         v                                       v
[Reward PENDING]                          [Task REJECTED]
(In Escrow Lock)                       (Zero reward credited)
         |
    (24-48h SLA / Auto-Clear)
         v
[Reward APPROVED]
         |
         v
[Wallet AVAILABLE] (Paise credited to user available balance)
         |
         v
[Withdrawal REQUESTED] ---> Available balance deducted, pending payout
         |
         +---------------------------------------+
         |                                       |
  (Provider Success)                      (Provider Failure)
         v                                       v
[Payout CLEARED]                          [Payout FAILED]
(Bank UTR recorded,                       (Atomic Compensating Recovery:
 ledger finalized)                         PAYOUT_REVERSAL restores balance)
```

### 3.2 Invariants
1. **Conservation of Balance:** At no point can `availableBalance` fall below zero.
2. **Idempotency:** Replay of a webhook, reward claim, or top-up with the same `idempotencyKey` returns the existing result without generating duplicate ledger entries.
3. **Escrow Guarantee:** Advertisers cannot activate campaigns unless sufficient escrow balance is locked in advance.
4. **Append-Only Ledger:** Rows in `LedgerTransaction` are never modified or deleted; corrections are executed as compensating ledger entries (`PAYOUT_REVERSAL`).
5. **PII Masking:** Payout destinations are masked upon creation to prevent exposure in logs or UI.
