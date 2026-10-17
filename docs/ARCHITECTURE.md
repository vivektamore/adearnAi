# AdEarn AI — System Architecture Specification

## 1. System Overview

AdEarn AI is an enterprise-grade advertising and sponsored-content platform connecting verified brands/advertisers with eligible Indian digital creators and users. It enforces strict compliance with Indian advertising guidelines (ASCI), regulatory payment safeguards (RBI Nodal account standards), and verifiable user task completion.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  [ User Portal (Screens 01-07) ]  [ Advertiser Portal (08-12) ]  [ Admin (13-19) ] |
|                       [ Chrome Extension Companion (Screen 20) ]                  |
+-----------------------------------------------------------------------------------+
                                          |
                              (HTTPS / WSS / JSON REST)
                                          v
+-----------------------------------------------------------------------------------+
|                         REVERSE PROXY & EDGE SECURITY                             |
|              Nginx / Cloudflare (Rate Limiting, SSL/TLS Termination, WAF)         |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                              APPLICATION LAYER (Next.js)                          |
|  - API Routes (/api/auth, /api/campaigns, /api/tasks, /api/wallet, /api/admin)    |
|  - Middleware: Auth JWT & Session Guard, RBAC Validator, Tenant Isolation Guard   |
|  - Business Modules:                                                              |
|      * Campaign Lifecycle Engine    * Verification & Kinematics Telemetry        |
|      * Financial Ledger Service     * Escrow Drawdown Engine                     |
|      * Payout Adapter Service       * Immutable Audit Logger                     |
+-----------------------------------------------------------------------------------+
                                          |
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
+----------------------------------+       +------------------------------------+
|       PRIMARY DATABASE           |       |         CACHE & QUEUE ENGINE       |
|  MySQL 8.0 / PostgreSQL (Prisma) |       |  Redis (Sessions, Rate Limits,     |
|  - Users & KYC Entities          |       |         Background Job Locks)      |
|  - Campaigns & Creatives         |       +------------------------------------+
|  - Authoritative Ledger (Paise)  |
|  - Immutable Audit Trails        |
+----------------------------------+
```

---

## 2. Core Business Entities & Relational Schema

### 2.1 Currency & Money Representation
All monetary values in the database are stored as **integer minor units (paise)**:
- `₹1.00` = `100` paise
- `₹245.00` = `24500` paise
- `₹4,50,000.00` = `45000000` paise
Floating-point mathematics is strictly forbidden for financial calculations.

### 2.2 Relational Entities
1. **User (`users`):** Identity, email, password hash, role (`USER`, `ADVERTISER`, `ADMIN`), KYC tier, status (`ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`).
2. **Organization (`organizations`):** Brand/advertiser tenant entity, GSTIN, business registration, contact details.
3. **Campaign (`campaigns`):** Campaign metadata, objective, action type (Survey, Interactive Sandbox, App Trial, Video), budget allocated (paise), budget spent (paise), cost per outcome (CPO paise), flight start/end, moderation status (`DRAFT`, `SUBMITTED`, `ACTIVE`, `REJECTED`, `PAUSED`, `COMPLETED`).
4. **CreativeAsset (`creative_assets`):** Creative banners, destination URLs, checksum, MIME type, moderation status.
5. **UserTask (`user_tasks`):** Instance of a user engaging with a campaign. State: `STARTED`, `IN_PROGRESS`, `SUBMITTED`, `VALIDATED`, `REJECTED`, `EXPIRED`. Holds session reference, client kinematics digest, validation timestamp.
6. **Wallet (`wallets`):** Balances per user/org:
   - `available_balance`: with-drawable funds (paise).
   - `pending_balance`: funds awaiting validation hold (paise).
   - `escrow_balance`: reserved advertiser funds (paise).
7. **LedgerTransaction (`ledger_transactions`):** Append-only double-entry financial record. Fields: `id`, `reference_id`, `wallet_id`, `type` (`CREDIT_REWARD`, `DEBIT_WITHDRAWAL`, `ESCROW_LOCK`, `ESCROW_RELEASE`, `ADVERTISER_TOPUP`, `ADMIN_ADJUSTMENT`), `amount_paise`, `balance_after_paise`, `idempotency_key`, `reason`, `created_at`.
8. **PayoutRequest (`payout_requests`):** Withdrawal record. Destination: UPI ID or IFSC/Account (masked in logs). Status: `REQUESTED`, `PROCESSING`, `CLEARED`, `FAILED`, `CANCELLED`. UTR / bank reference number.
9. **Dispute (`disputes`):** Ticket filed by user or advertiser regarding a task outcome or payout issue. Status: `OPEN`, `UNDER_REVIEW`, `RESOLVED_CREDITED`, `REJECTED`.
10. **AuditLog (`audit_logs`):** Immutable compliance log recording every privileged administrative action, configuration change, and payout release.

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
[Task Submitted] -> Server verifies telemetry & completion proof
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
    (Dual Admin Approval / Automated UPI clearing)
         v
[Payout CLEARED] (External UTR recorded, ledger finalized)
```

### 3.2 Invariants
1. **Conservation of Balance:** At no point can `available_balance` fall below zero.
2. **Idempotency:** Replay of a webhook or task submission with the same `idempotency_key` returns the existing result without generating duplicate ledger entries.
3. **Escrow Guarantee:** Advertisers cannot activate campaigns unless sufficient escrow balance is locked in advance.
4. **Append-Only Ledger:** Rows in `ledger_transactions` are never modified or deleted; corrections are executed as compensating ledger entries.
