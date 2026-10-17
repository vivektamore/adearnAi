# Full Data Path & Database Integration Audit Report — AdEarn AI

**Database Engine:** MySQL 8.0 Community Server (InnoDB, `utf8mb4_unicode_ci`, ACID compliant)  
**ORM Layer:** Prisma ORM 5.22.0 with custom BigInt JSON serialization  
**Financial Precision:** Authoritative integer minor units (`paise`) across all balance columns

---

## 1. Full Data Path Architecture

Every screen on AdEarn AI follows the audited unidirectional data path:

```
[Stitch React Component]
          │ (Client Fetch with credentials)
          ▼
[Next.js App Router API Handler]
          │ (requireAuth checks JWT session & RBAC)
          ▼
[Business Logic & Ledger Engine]
          │ (Prisma interactive ACID transaction)
          ▼
[MySQL 8.0 InnoDB Database]
          │ (Foreign key constraints, indexes, BigInt paise)
          ▼
[Typed JSON Response with BigInt Serialization]
          │
          ▼
[UI Renders Authoritative State with Zero Float Math]
```

---

## 2. Screen-by-Screen Data Path Audit

### Screen 01: User Dashboard (`src/app/page.tsx`)
- **Authoritative Tables**: `users`, `wallets`, `user_tasks`, `campaigns`
- **API Endpoint**: `GET /api/user/dashboard`
- **Data Flow**: `page.tsx` fetches on mount with session cookie -> `requireAuth(['USER', 'ADMIN'])` verifies session -> Prisma queries `wallet` (`availablePaise`, `pendingPaise`, `lifetimeEarnedPaise`, `lifetimePaidPaise`) and queries `user_tasks` taking latest 5 ordered by `createdAt: 'desc'` -> returns typed JSON -> metric tiles display `formatINR(val)` and recent activity table renders real rows.

### Screen 02: Sponsored Ad Feed (`src/app/feed/page.tsx`)
- **Authoritative Tables**: `campaigns`, `organizations`, `user_tasks`
- **API Endpoint**: `GET /api/campaigns?category=...&actionType=...`
- **Data Flow**: `feed/page.tsx` loads campaigns matching active filters -> `/api/campaigns` queries `where: { status: 'ACTIVE' }` with search and category filters -> includes `organization { name, isVerified }` -> returns campaigns array -> UI renders sponsored disclosure cards and task rules.

### Screen 03: Ad Detail and Task Sandbox (`src/app/task/[id]/page.tsx`)
- **Authoritative Tables**: `campaigns`, `user_tasks`, `wallets`, `ledger_transactions`
- **API Endpoints**: `POST /api/tasks/start`, `POST /api/tasks/submit`
- **Data Flow**: User clicks "Start Task" -> `POST /api/tasks/start` generates HMAC session token and persists `UserTask` in `STARTED` state -> User completes survey in sandbox with kinematic telemetry tracking -> `POST /api/tasks/submit` evaluates dwell duration and vectors -> if valid, runs `FinancialLedger.postTransaction` to credit `CREDIT_REWARD` -> updates task to `VALIDATED` -> UI displays success dialog and redirects to wallet.

### Screen 04: Reward Wallet & Ledger (`src/app/wallet/page.tsx`)
- **Authoritative Tables**: `wallets`, `ledger_transactions`
- **API Endpoint**: `GET /api/wallet`
- **Data Flow**: `wallet/page.tsx` queries `/api/wallet` -> route loads user's `wallet` and all `ledger_transactions` ordered by `createdAt: 'desc'` -> UI renders Available, Pending, and Lifetime balance cards and the immutable transaction history table.

### Screen 05: Withdrawals and Payouts (`src/app/withdrawals/page.tsx`)
- **Authoritative Tables**: `wallets`, `payout_requests`, `ledger_transactions`
- **API Endpoints**: `GET /api/payouts`, `POST /api/payouts`
- **Data Flow**: User enters withdrawal amount in INR -> `POST /api/payouts` validates threshold (`>= 10000` paise) -> validates `wallet.availablePaise >= amount` -> executes atomic transaction: debits `wallet.availablePaise`, creates `DEBIT_WITHDRAWAL` ledger transaction, creates `PayoutRequest` in `PROCESSING` status -> dispatches to `SandboxPayoutAdapter` -> receives bank UTR -> updates to `CLEARED` -> UI displays clearing reference.

### Screen 06: Profile and Privacy (`src/app/profile/page.tsx`)
- **Authoritative Tables**: `users`, `audit_logs`
- **API Endpoints**: `GET /api/user/profile`, `PUT /api/user/profile`
- **Data Flow**: Loads user KYC tier and masked UPI details -> updates profile upon form submission -> records `USER_PROFILE_UPDATED` in `audit_logs`.

### Screen 07: Help and Disputes (`src/app/support/page.tsx`)
- **Authoritative Tables**: `disputes`, `user_tasks`, `payout_requests`
- **API Endpoints**: `GET /api/disputes`, `POST /api/disputes`
- **Data Flow**: User files dispute ticket -> creates row in `disputes` with optional `userTaskId` foreign key -> displays support ticket status timeline (`OPEN`, `UNDER_REVIEW`, `RESOLVED_CREDITED`).

### Screen 08: Advertiser Overview (`src/app/advertiser/page.tsx`)
- **Authoritative Tables**: `campaigns`, `wallets`, `organizations`, `user_tasks`
- **API Endpoint**: `GET /api/advertiser/overview`
- **Data Flow**: Scopes strictly to `auth.session.organizationId` -> sums `campaign.budgetSpentPaise`, queries `wallet.escrowPaise`, and counts `verifiedOutcomes` -> renders live flight tiles and SVG telemetry charts.

### Screen 09: Campaign Creation Wizard (`src/app/advertiser/campaigns/new/page.tsx`)
- **Authoritative Tables**: `campaigns`, `creative_assets`, `wallets`, `ledger_transactions`
- **API Endpoint**: `POST /api/advertiser/campaigns`
- **Data Flow**: Validates all wizard fields -> checks unreserved escrow balance -> runs `FinancialLedger.postTransaction` with `ESCROW_LOCK` -> creates `Campaign` in `IN_REVIEW` status with associated `CreativeAsset` -> redirects advertiser to flight control.

### Screen 10: Campaign Telemetry & Flight Control (`src/app/advertiser/campaigns/[id]/page.tsx`)
- **Authoritative Tables**: `campaigns`, `user_tasks`, `creative_assets`
- **API Endpoint**: `GET /api/advertiser/campaigns/[id]`
- **Data Flow**: Checks organization ownership -> retrieves flight telemetry, dwell distributions, and active participant counts.

### Screen 11: Attribution Analytics (`src/app/advertiser/analytics/page.tsx`)
- **Authoritative Tables**: `campaigns`, `user_tasks`
- **API Endpoint**: `GET /api/advertiser/analytics`
- **Data Flow**: Calculates verified outcome rates, IVT disqualifications, and average dwell duration from actual `user_tasks` records.

### Screen 12: Billing & Escrow Top-Up (`src/app/advertiser/billing/page.tsx`)
- **Authoritative Tables**: `wallets`, `ledger_transactions`
- **API Endpoints**: `GET /api/advertiser/billing`, `POST /api/advertiser/billing`
- **Data Flow**: Lists GST invoices (18% GST calculation) -> allows RTGS/UPI escrow top-up -> executes `ADVERTISER_TOPUP` transaction updating `wallet.escrowPaise`.

### Screen 13: Admin Operations Dashboard (`src/app/admin/page.tsx`)
- **Authoritative Tables**: `campaigns`, `wallets`, `payout_requests`, `user_tasks`
- **API Endpoint**: `GET /api/admin/overview`
- **Data Flow**: Admin role guard -> computes platform-wide liabilities: total escrow pool reserves, total creator available balances, and pending moderation queue counts.

### Screen 14: Campaign Moderation Queue (`src/app/admin/moderation/page.tsx`)
- **Authoritative Tables**: `campaigns`, `moderation_records`, `audit_logs`
- **API Endpoints**: `GET /api/admin/moderation`, `POST /api/admin/moderation`
- **Data Flow**: Loads all campaigns awaiting moderation -> reviewer clicks Approve/Reject -> updates `campaign.status` -> creates `ModerationRecord` -> emits HMAC-SHA256 `AuditLog`.

### Screen 15: Fraud & Forensic Lab (`src/app/admin/fraud-lab/page.tsx`)
- **Authoritative Tables**: `user_tasks`, `fraud_incidents`, `users`
- **API Endpoints**: `GET /api/admin/fraud`, `POST /api/admin/fraud`
- **Data Flow**: Queries tasks where `fraudVerdict == 'FLAGGED'` or `anomalyScore > 0.3` -> admin can Quarantine User (updates `user.status = 'SUSPENDED'`) or Clear Verdict.

### Screen 16: Payout Operations & Clearing (`src/app/admin/payouts/page.tsx`)
- **Authoritative Tables**: `payout_requests`, `wallets`, `audit_logs`
- **API Endpoints**: `GET /api/admin/payouts`, `POST /api/admin/payouts`
- **Data Flow**: Displays pending payout requests -> admin executes batch clearing -> triggers payout adapter -> updates status to `CLEARED` with bank UTR.

### Screen 17: Immutable Audit Logs (`src/app/admin/audit-logs/page.tsx`)
- **Authoritative Tables**: `audit_logs`, `users`
- **API Endpoint**: `GET /api/admin/audit-logs`
- **Data Flow**: Paginated query of `audit_logs` with actor name, action string, entity references, and cryptographic hash verification.

### Screen 18: Unit Economics Dashboard (`src/app/admin/analytics/page.tsx`)
- **Authoritative Tables**: `campaigns`, `user_tasks`, `payout_requests`
- **API Endpoint**: `GET /api/admin/unit-economics`
- **Data Flow**: Sums total gross campaign spend vs user reward liabilities -> calculates platform take-rate and contribution margin.

### Screen 19: Settings & API Configuration (`src/app/admin/settings/page.tsx`)
- **Authoritative Tables**: `system_settings`, `audit_logs`
- **API Endpoints**: `GET /api/admin/settings`, `PUT /api/admin/settings`
- **Data Flow**: Upserts system settings into `system_settings` table -> logs change in `audit_logs`.

### Screen 20: Companion Chrome Extension (`src/app/extension/page.tsx` & `extension/`)
- **Authoritative Tables**: `users`, `wallets`, `campaigns`
- **API Endpoint**: `GET /api/extension/session`
- **Data Flow**: Browser extension requests session status with credentials -> route verifies JWT cookie -> returns live available balance, pending balance, and eligible campaign count from MySQL.
