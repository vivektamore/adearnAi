# Relational Database Schema & Entities — AdEarn AI

AdEarn AI uses MySQL 8.0 managed via Prisma ORM.

---

## 1. Entity-Relationship Overview

```
[User] ───< [UserOrganization] >─── [Organization]
  │                                        │
  ├──< [Wallet] (Personal)                 ├──< [Wallet] (Escrow Pool)
  │      │                                 │      │
  │      └──< [LedgerTransaction]          │      └──< [LedgerTransaction]
  │                                        │
  ├──< [UserTask] ─────────────────────────┼──< [Campaign]
  │                                        │      │
  ├──< [PayoutRequest]                     │      ├──< [CreativeAsset]
  │                                        │      └──< [ModerationRecord]
  ├──< [Dispute]                           │
  └──< [AuditLog]                          └──< [FraudIncident]
```

---

## 2. Table Specifications

### 1. `users`
- `id` (VARCHAR(36), PK): UUID
- `email` (VARCHAR(255), UNIQUE)
- `passwordHash` (VARCHAR(255))
- `name` (VARCHAR(255))
- `role` (ENUM: `USER`, `ADVERTISER`, `ADMIN`)
- `status` (ENUM: `ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`)
- `createdAt`, `updatedAt` (DATETIME)

### 2. `organizations`
- `id` (VARCHAR(36), PK): Tenant Organization UUID
- `name` (VARCHAR(255))
- `slug` (VARCHAR(255), UNIQUE)
- `verified` (BOOLEAN)
- `gstin` (VARCHAR(50))
- `pan` (VARCHAR(50))

### 3. `wallets`
- `id` (VARCHAR(36), PK)
- `userId` (VARCHAR(36), NULLABLE, UNIQUE): Linked user
- `organizationId` (VARCHAR(36), NULLABLE, UNIQUE): Linked organization
- `availablePaise` (BIGINT): Integer minor units available for withdrawal
- `pendingPaise` (BIGINT): Rewards awaiting validation
- `heldPaise` (BIGINT): Funds locked in flight or in withdrawal processing
- `version` (INT): Optimistic concurrency control lock version

### 4. `ledger_transactions`
- `id` (VARCHAR(36), PK)
- `walletId` (VARCHAR(36), FK)
- `referenceId` (VARCHAR(255)): Unique reference (Task ID, UTR, Invoice)
- `type` (ENUM: `CREDIT_REWARD`, `DEBIT_PAYOUT`, `ADVERTISER_TOPUP`, `RESERVE_BUDGET`, `REVERSAL`)
- `amountPaise` (BIGINT): Transaction delta
- `balanceAfterPaise` (BIGINT): Authoritative running balance
- `idempotencyKey` (VARCHAR(255), UNIQUE): Duplicate submission prevention
- `createdAt` (DATETIME)

### 5. `campaigns`
- `id` (VARCHAR(36), PK)
- `organizationId` (VARCHAR(36), FK)
- `title` (VARCHAR(255))
- `actionType` (ENUM: `SURVEY`, `TRIAL`, `CLICK`, `INSTALL`, `POLL`)
- `status` (ENUM: `DRAFT`, `PENDING_REVIEW`, `ACTIVE`, `PAUSED`, `EXHAUSTED`, `REJECTED`)
- `totalBudgetPaise` (BIGINT)
- `spentBudgetPaise` (BIGINT)
- `rewardPerActionPaise` (BIGINT)
- `dwellTimeSeconds` (INT): Minimum attention dwell requirement

### 6. `user_tasks`
- `id` (VARCHAR(36), PK)
- `userId` (VARCHAR(36), FK)
- `campaignId` (VARCHAR(36), FK)
- `status` (ENUM: `STARTED`, `SUBMITTED`, `VALIDATED`, `APPROVED`, `REJECTED`)
- `dwellSeconds` (INT): Measured attention dwell
- `mouseMovements` (INT): Telemetry coordinates count
- `keyPresses` (INT)
- `confidenceScore` (INT): Anti-bot confidence rating (0-100)

### 7. `payout_requests`
- `id` (VARCHAR(36), PK)
- `userId` (VARCHAR(36), FK)
- `amountPaise` (BIGINT)
- `payoutMethod` (ENUM: `UPI`, `IMPS`, `NEFT`)
- `destinationMasked` (VARCHAR(100)): Masked UPI ID or account number
- `status` (ENUM: `REQUESTED`, `PROCESSING`, `PAID`, `FAILED`, `CANCELLED`)
- `providerRef` (VARCHAR(255)): Bank UTR or payment gateway transaction ID

### 8. `audit_logs`
- `id` (VARCHAR(36), PK)
- `actorId` (VARCHAR(36), NULLABLE)
- `action` (VARCHAR(255))
- `entityType` (VARCHAR(100))
- `entityId` (VARCHAR(255))
- `payload` (JSON)
- `hash` (VARCHAR(64)): HMAC-SHA256 tamper-evident integrity hash
