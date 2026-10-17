# Relational Database Schema & Entities — AdEarn AI (Authoritative Specification)

AdEarn AI uses **MySQL 8.0 Community Server** managed via **Prisma ORM**. All monetary calculations are performed in integer minor units (`paise`, where ₹1.00 = 100 paise) using 64-bit BigInt fields.

---

## 1. Entity-Relationship Architecture

```
[User] ───< [UserOrganization] >─── [Organization]
  │                                        │
  ├──< [Wallet] (Personal)                 ├──< [Wallet] (Escrow Pool)
  │      │                                 │      │
  │      └──< [LedgerTransaction]          │      └──< [LedgerTransaction]
  │                                        │
  ├──< [UserTask] ─────────────────────────┼──< [Campaign]
  │      │                                 │      │
  │      ├──< [FraudIncident]              │      ├──< [CreativeAsset]
  │      └──< [Dispute]                    │      └──< [ModerationRecord]
  ├──< [PayoutRequest] ──< [Dispute]       │
  └──< [AuditLog]                          └──< [FraudIncident]
```

---

## 2. Table Specifications & Column DDL

### 1. `User` (`users`)
- `id` (VARCHAR(30), PK): CUID identifier (`@default(cuid())`)
- `email` (VARCHAR(255), UNIQUE)
- `passwordHash` (VARCHAR(255)): Bcrypt salted hash
- `name` (VARCHAR(255))
- `role` (ENUM: `USER`, `ADVERTISER`, `ADMIN`, default `USER`)
- `status` (ENUM: `ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`, default `ACTIVE`)
- `kycTier` (ENUM: `TIER_0`, `TIER_1`, `TIER_2`, default `TIER_1`)
- `kycStatus` (VARCHAR(50), default `"VERIFIED"`)
- `upiId` (VARCHAR(255), Nullable): Stored UPI destination
- `bankAccountNumber` (VARCHAR(255), Nullable)
- `bankIfsc` (VARCHAR(50), Nullable)
- `bankAccountName` (VARCHAR(255), Nullable)
- `avatarUrl` (VARCHAR(255), Nullable)
- `createdAt`, `updatedAt` (DATETIME)
- *Indexes*: `email`, `role`

### 2. `Organization` (`organizations`)
- `id` (VARCHAR(30), PK): Tenant organization CUID
- `name` (VARCHAR(255))
- `gstin` (VARCHAR(50), Nullable): Indian GST identification number
- `pan` (VARCHAR(50), Nullable): Permanent Account Number
- `contactEmail` (VARCHAR(255))
- `isVerified` (BOOLEAN, default `true`)
- `createdAt`, `updatedAt` (DATETIME)
- *Indexes*: `name`

### 3. `UserOrganization` (`user_organizations`)
- `id` (VARCHAR(30), PK)
- `userId` (VARCHAR(30), FK -> `User.id`)
- `organizationId` (VARCHAR(30), FK -> `Organization.id`)
- `role` (VARCHAR(50), default `"OWNER"`)
- *Unique Constraint*: `[userId, organizationId]`

### 4. `Wallet` (`wallets`)
- `id` (VARCHAR(30), PK)
- `userId` (VARCHAR(30), Nullable, UNIQUE): For personal creator reward wallets
- `organizationId` (VARCHAR(30), Nullable, UNIQUE): For advertiser escrow pool wallets
- `availablePaise` (BIGINT, default `0`): Withdrawable balance (User) or unallocated funds
- `pendingPaise` (BIGINT, default `0`): Rewards in validation/cooling-off
- `escrowPaise` (BIGINT, default `0`): Advertiser deposited escrow balance available for campaign allocation
- `lifetimeEarnedPaise` (BIGINT, default `0`): Historical gross approved earnings
- `lifetimePaidPaise` (BIGINT, default `0`): Historical cleared disbursements
- `createdAt`, `updatedAt` (DATETIME)
- *Indexes*: `userId`, `organizationId`

### 5. `LedgerTransaction` (`ledger_transactions`)
- `id` (VARCHAR(30), PK)
- `walletId` (VARCHAR(30), FK -> `Wallet.id`)
- `referenceId` (VARCHAR(255)): Associated Task ID, UTR number, or Invoice ID
- `type` (ENUM: `CREDIT_REWARD`, `DEBIT_WITHDRAWAL`, `ESCROW_LOCK`, `ESCROW_RELEASE`, `ADVERTISER_TOPUP`, `ADMIN_ADJUSTMENT`)
- `amountPaise` (BIGINT): Transaction delta
- `balanceAfterPaise` (BIGINT): Running authoritative balance
- `idempotencyKey` (VARCHAR(255), UNIQUE): Prevents duplicate transactions
- `reason` (VARCHAR(255)): Human-readable business reason
- `metadata` (TEXT, Nullable): JSON attributes
- `createdAt` (DATETIME)
- *Indexes*: `walletId`, `referenceId`, `idempotencyKey`

### 6. `Campaign` (`campaigns`)
- `id` (VARCHAR(30), PK)
- `organizationId` (VARCHAR(30), FK -> `Organization.id`)
- `title` (VARCHAR(255))
- `description` (TEXT)
- `category` (VARCHAR(100), default `"FinTech"`)
- `actionType` (ENUM: `SURVEY`, `SANDBOX_TRIAL`, `APP_INSTALL`, `VIDEO_ATTENTION`, `SENTIMENT_POLL`)
- `status` (ENUM: `DRAFT`, `IN_REVIEW`, `ACTIVE`, `PAUSED`, `COMPLETED`, `REJECTED`)
- `targetUrl` (TEXT)
- `requirementsJson` (TEXT, Nullable)
- `budgetAllocatedPaise` (BIGINT, default `0`): Escrow locked for this flight
- `budgetSpentPaise` (BIGINT, default `0`): Total verified rewards disbursed
- `costPerOutcomePaise` (BIGINT, default `0`): Per-task reward rate
- `targetOutcomes` (INT, default `100`)
- `verifiedOutcomes` (INT, default `0`)
- `ivtRatePercent` (FLOAT, default `0.0`): Invalid traffic percentage
- `flightStart`, `flightEnd` (DATETIME, Nullable)
- `createdAt`, `updatedAt` (DATETIME)
- *Indexes*: `organizationId`, `status`, `actionType`

### 7. `CreativeAsset` (`creative_assets`)
- `id` (VARCHAR(30), PK)
- `campaignId` (VARCHAR(30), FK -> `Campaign.id`)
- `assetUrl` (TEXT)
- `assetType` (VARCHAR(50), default `"IMAGE"`)
- `checksum` (VARCHAR(64), Nullable): SHA-256 asset hash
- `fileSizeBytes` (INT, default `0`)
- `status` (VARCHAR(50), default `"APPROVED"`)
- `reviewerNotes` (TEXT, Nullable)
- `createdAt` (DATETIME)
- *Indexes*: `campaignId`

### 8. `UserTask` (`user_tasks`)
- `id` (VARCHAR(30), PK)
- `campaignId` (VARCHAR(30), FK -> `Campaign.id`)
- `userId` (VARCHAR(30), FK -> `User.id`)
- `sessionToken` (VARCHAR(255), UNIQUE): HMAC-SHA256 signed session token
- `status` (ENUM: `STARTED`, `SUBMITTED`, `VALIDATED`, `REJECTED`, `EXPIRED`)
- `startedAt` (DATETIME)
- `submittedAt`, `validatedAt` (DATETIME, Nullable)
- `rewardPaise` (BIGINT, default `0`)
- `telemetryDigest` (TEXT, Nullable): Kinematic coordinate telemetry summary
- `anomalyScore` (FLOAT, default `0.0`): Heuristic risk score (0.0 to 1.0)
- `fraudVerdict` (ENUM: `CLEARED`, `FLAGGED`, `BLOCKED`, default `CLEARED`)
- `createdAt` (DATETIME)
- *Indexes*: `campaignId`, `userId`, `sessionToken`, `status`

### 9. `PayoutRequest` (`payout_requests`)
- `id` (VARCHAR(30), PK)
- `userId` (VARCHAR(30), FK -> `User.id`)
- `amountPaise` (BIGINT)
- `method` (VARCHAR(50), default `"UPI"`)
- `destinationAddress` (VARCHAR(255))
- `maskedAddress` (VARCHAR(255))
- `status` (ENUM: `REQUESTED`, `PROCESSING`, `CLEARED`, `FAILED`, `CANCELLED`)
- `utrNumber` (VARCHAR(255), Nullable): Bank clearing reference
- `failureReason` (VARCHAR(255), Nullable)
- `idempotencyKey` (VARCHAR(255), UNIQUE)
- `approvedByUserId` (VARCHAR(30), Nullable)
- `createdAt` (DATETIME)
- `clearedAt` (DATETIME, Nullable)
- *Indexes*: `userId`, `status`, `idempotencyKey`

### 10. `Dispute` (`disputes`)
- `id` (VARCHAR(30), PK)
- `userId` (VARCHAR(30), FK -> `User.id`)
- `userTaskId` (VARCHAR(30), Nullable, FK -> `UserTask.id`)
- `payoutRequestId` (VARCHAR(30), Nullable, FK -> `PayoutRequest.id`)
- `subject` (VARCHAR(255))
- `description` (TEXT)
- `evidenceUrlsJson` (TEXT, Nullable)
- `status` (ENUM: `OPEN`, `UNDER_REVIEW`, `RESOLVED_CREDITED`, `REJECTED`)
- `resolutionNotes` (TEXT, Nullable)
- `createdAt` (DATETIME), `resolvedAt` (DATETIME, Nullable)
- *Indexes*: `userId`, `status`

### 11. `ModerationRecord` (`moderation_records`)
- `id` (VARCHAR(30), PK)
- `campaignId` (VARCHAR(30), FK -> `Campaign.id`)
- `reviewerUserId` (VARCHAR(30), Nullable)
- `decision` (VARCHAR(50), default `"PENDING"`)
- `reviewerNotes` (TEXT, Nullable)
- `reviewedAt` (DATETIME, Nullable)
- `createdAt` (DATETIME)
- *Indexes*: `campaignId`

### 12. `FraudIncident` (`fraud_incidents`)
- `id` (VARCHAR(30), PK)
- `userTaskId` (VARCHAR(30), Nullable, FK -> `UserTask.id`)
- `userId` (VARCHAR(30), Nullable)
- `incidentType` (VARCHAR(100))
- `severity` (VARCHAR(50), default `"MEDIUM"`)
- `description` (TEXT)
- `telemetryPayloadJson` (TEXT, Nullable)
- `status` (VARCHAR(50), default `"INVESTIGATING"`)
- `resolvedByUserId` (VARCHAR(30), Nullable)
- `createdAt` (DATETIME)
- *Indexes*: `userTaskId`, `status`

### 13. `AuditLog` (`audit_logs`)
- `id` (VARCHAR(30), PK)
- `actorId` (VARCHAR(30), Nullable, FK -> `User.id`)
- `actorRole` (VARCHAR(50), default `"SYSTEM"`)
- `action` (VARCHAR(255))
- `entityType` (VARCHAR(100))
- `entityId` (VARCHAR(255))
- `oldStateJson`, `newStateJson` (TEXT, Nullable)
- `ipAddress`, `userAgent` (VARCHAR(255), Nullable)
- `cryptographicHash` (VARCHAR(64)): HMAC-SHA256 signature chain
- `createdAt` (DATETIME)
- *Indexes*: `actorId`, `action`, `entityType`

### 14. `SystemSetting` (`system_settings`)
- `id` (VARCHAR(30), PK)
- `key` (VARCHAR(255), UNIQUE)
- `value` (TEXT)
- `description` (VARCHAR(255), Nullable)
- `updatedAt` (DATETIME)
- *Indexes*: `key`
