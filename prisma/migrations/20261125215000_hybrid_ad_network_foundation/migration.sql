-- =========================================================================
-- ADEARNAI MIGRATION: 20261125215000_hybrid_ad_network_foundation
-- TARGET ENGINE: MySQL 8.0
-- STRATEGY: Additive, Backward-Compatible, Zero Data Loss
-- =========================================================================

-- Step 1: Extend Campaign Table with Native Pacing and KYC Targeting
ALTER TABLE `Campaign` 
    ADD COLUMN `dailyBudgetCapPaise` BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN `minKycTier` ENUM('TIER_0', 'TIER_1', 'TIER_2') NOT NULL DEFAULT 'TIER_0';

-- Step 2: Create Session Table (Identity & Authentication)
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(128) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_idx`(`userId`),
    INDEX `Session_sessionToken_idx`(`sessionToken`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Create UserPreference Table
CREATE TABLE `UserPreference` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `optInRewards` BOOLEAN NOT NULL DEFAULT true,
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `preferredCategoriesJson` TEXT NULL,
    `theme` VARCHAR(191) NOT NULL DEFAULT 'SYSTEM',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserPreference_userId_key`(`userId`),
    INDEX `UserPreference_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 4: Create ConsentHistory Table (DPDP / Regulatory Audit)
CREATE TABLE `ConsentHistory` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `consentType` VARCHAR(191) NOT NULL,
    `granted` BOOLEAN NOT NULL DEFAULT true,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `consentTextVersion` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `consentedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConsentHistory_userId_idx`(`userId`),
    INDEX `ConsentHistory_consentType_idx`(`consentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 5: Create ExtensionInstallation Table (Extension Fleet Lifecycle)
CREATE TABLE `ExtensionInstallation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `installationId` VARCHAR(64) NOT NULL,
    `extensionVersion` VARCHAR(191) NOT NULL DEFAULT '2.0.0',
    `clientPlatform` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'REVOKED', 'UNINSTALLED') NOT NULL DEFAULT 'ACTIVE',
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `installedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExtensionInstallation_installationId_key`(`installationId`),
    INDEX `ExtensionInstallation_userId_idx`(`userId`),
    INDEX `ExtensionInstallation_installationId_idx`(`installationId`),
    INDEX `ExtensionInstallation_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 6: Create UserAdPreference Table
CREATE TABLE `UserAdPreference` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserAdPreference_userId_idx`(`userId`),
    UNIQUE INDEX `UserAdPreference_userId_category_key`(`userId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 7: Create AdPlacement Table (Inventory Surfaces)
CREATE TABLE `AdPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `surfaceType` VARCHAR(191) NOT NULL,
    `dimensions` VARCHAR(191) NOT NULL,
    `floorCpmPaise` BIGINT NOT NULL DEFAULT 3000,
    `floorCpcPaise` BIGINT NOT NULL DEFAULT 150,
    `minDwellSeconds` DOUBLE NOT NULL DEFAULT 1.0,
    `status` ENUM('ACTIVE', 'PAUSED', 'DEPRECATED') NOT NULL DEFAULT 'ACTIVE',
    `policyText` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdPlacement_key_key`(`key`),
    INDEX `AdPlacement_key_idx`(`key`),
    INDEX `AdPlacement_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 8: Create CampaignPlacement Table (Placement Targeting Map)
CREATE TABLE `CampaignPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `placementId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CampaignPlacement_campaignId_idx`(`campaignId`),
    INDEX `CampaignPlacement_placementId_idx`(`placementId`),
    UNIQUE INDEX `CampaignPlacement_campaignId_placementId_key`(`campaignId`, `placementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 9: Create AdRequest Table (Auction Ingestion Telemetry)
CREATE TABLE `AdRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `placementId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `eligibleCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdRequest_requestId_key`(`requestId`),
    INDEX `AdRequest_requestId_idx`(`requestId`),
    INDEX `AdRequest_userId_idx`(`userId`),
    INDEX `AdRequest_placementId_idx`(`placementId`),
    INDEX `AdRequest_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 10: Create AdDecision Table (Cryptographically Signed Decision Tokens)
CREATE TABLE `AdDecision` (
    `id` VARCHAR(191) NOT NULL,
    `adRequestId` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `creativeAssetId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `tokenDigest` VARCHAR(64) NOT NULL,
    `decisionToken` TEXT NOT NULL,
    `pricingModel` ENUM('CPO', 'CPM', 'HYBRID') NOT NULL DEFAULT 'CPM',
    `chargePaise` BIGINT NOT NULL DEFAULT 0,
    `rewardPaise` BIGINT NOT NULL DEFAULT 0,
    `status` ENUM('ISSUED', 'CLAIMED', 'EXPIRED', 'DISCARDED') NOT NULL DEFAULT 'ISSUED',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdDecision_tokenDigest_key`(`tokenDigest`),
    INDEX `AdDecision_adRequestId_idx`(`adRequestId`),
    INDEX `AdDecision_campaignId_idx`(`campaignId`),
    INDEX `AdDecision_tokenDigest_idx`(`tokenDigest`),
    INDEX `AdDecision_status_idx`(`status`),
    INDEX `AdDecision_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 11: Create AdEvent Table (Universal Telemetry Ingestion & Deduplication)
CREATE TABLE `AdEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(64) NOT NULL,
    `adDecisionId` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `eventType` ENUM('IMPRESSION', 'CLICK', 'CONVERSION') NOT NULL,
    `tokenDigest` VARCHAR(64) NOT NULL,
    `status` ENUM('RECEIVED', 'VALIDATED', 'DUPLICATE', 'REJECTED', 'SETTLED') NOT NULL DEFAULT 'RECEIVED',
    `payloadJson` TEXT NULL,
    `chargePaise` BIGINT NOT NULL DEFAULT 0,
    `rewardPaise` BIGINT NOT NULL DEFAULT 0,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AdEvent_eventId_key`(`eventId`),
    UNIQUE INDEX `AdEvent_tokenDigest_key`(`tokenDigest`),
    INDEX `AdEvent_eventId_idx`(`eventId`),
    INDEX `AdEvent_campaignId_idx`(`campaignId`),
    INDEX `AdEvent_userId_idx`(`userId`),
    INDEX `AdEvent_eventType_idx`(`eventType`),
    INDEX `AdEvent_tokenDigest_idx`(`tokenDigest`),
    INDEX `AdEvent_status_idx`(`status`),
    INDEX `AdEvent_receivedAt_idx`(`receivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 12: Create FraudCase Table (Forensics & Kinematics Desk)
CREATE TABLE `FraudCase` (
    `id` VARCHAR(191) NOT NULL,
    `caseNumber` VARCHAR(32) NOT NULL,
    `incidentType` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `description` TEXT NOT NULL,
    `telemetryEvidenceJson` TEXT NULL,
    `resolutionNotes` TEXT NULL,
    `resolvedByUserId` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FraudCase_caseNumber_key`(`caseNumber`),
    INDEX `FraudCase_caseNumber_idx`(`caseNumber`),
    INDEX `FraudCase_userId_idx`(`userId`),
    INDEX `FraudCase_campaignId_idx`(`campaignId`),
    INDEX `FraudCase_status_idx`(`status`),
    INDEX `FraudCase_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 13: Create PaymentWebhookRecord Table (Gateway Webhook Audit Log)
CREATE TABLE `PaymentWebhookRecord` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(128) NOT NULL,
    `payloadJson` TEXT NOT NULL,
    `status` ENUM('PENDING', 'PROCESSED', 'FAILED', 'IGNORED') NOT NULL DEFAULT 'PENDING',
    `errorReason` TEXT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PaymentWebhookRecord_idempotencyKey_key`(`idempotencyKey`),
    INDEX `PaymentWebhookRecord_provider_idx`(`provider`),
    INDEX `PaymentWebhookRecord_idempotencyKey_idx`(`idempotencyKey`),
    INDEX `PaymentWebhookRecord_status_idx`(`status`),
    INDEX `PaymentWebhookRecord_receivedAt_idx`(`receivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 14: Create CampaignDailyAggregate Table (Analytical Aggregates)
CREATE TABLE `CampaignDailyAggregate` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `impressionsCount` INTEGER NOT NULL DEFAULT 0,
    `clicksCount` INTEGER NOT NULL DEFAULT 0,
    `conversionsCount` INTEGER NOT NULL DEFAULT 0,
    `spendPaise` BIGINT NOT NULL DEFAULT 0,
    `creatorRewardPaise` BIGINT NOT NULL DEFAULT 0,
    `ivtBlockedCount` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CampaignDailyAggregate_campaignId_idx`(`campaignId`),
    INDEX `CampaignDailyAggregate_date_idx`(`date`),
    UNIQUE INDEX `CampaignDailyAggregate_campaignId_date_key`(`campaignId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 15: Create PlacementDailyAggregate Table
CREATE TABLE `PlacementDailyAggregate` (
    `id` VARCHAR(191) NOT NULL,
    `placementId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `requestsCount` INTEGER NOT NULL DEFAULT 0,
    `impressionsCount` INTEGER NOT NULL DEFAULT 0,
    `clicksCount` INTEGER NOT NULL DEFAULT 0,
    `revenuePaise` BIGINT NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlacementDailyAggregate_placementId_idx`(`placementId`),
    INDEX `PlacementDailyAggregate_date_idx`(`date`),
    UNIQUE INDEX `PlacementDailyAggregate_placementId_date_key`(`placementId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 16: Add Institutional Foreign Keys & Referential Integrity Constraints
ALTER TABLE `Session` 
    ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserPreference` 
    ADD CONSTRAINT `UserPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ConsentHistory` 
    ADD CONSTRAINT `ConsentHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ExtensionInstallation` 
    ADD CONSTRAINT `ExtensionInstallation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserAdPreference` 
    ADD CONSTRAINT `UserAdPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CampaignPlacement` 
    ADD CONSTRAINT `CampaignPlacement_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CampaignPlacement` 
    ADD CONSTRAINT `CampaignPlacement_placementId_fkey` FOREIGN KEY (`placementId`) REFERENCES `AdPlacement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AdRequest` 
    ADD CONSTRAINT `AdRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AdRequest` 
    ADD CONSTRAINT `AdRequest_placementId_fkey` FOREIGN KEY (`placementId`) REFERENCES `AdPlacement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AdDecision` 
    ADD CONSTRAINT `AdDecision_adRequestId_fkey` FOREIGN KEY (`adRequestId`) REFERENCES `AdRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AdDecision` 
    ADD CONSTRAINT `AdDecision_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AdEvent` 
    ADD CONSTRAINT `AdEvent_adDecisionId_fkey` FOREIGN KEY (`adDecisionId`) REFERENCES `AdDecision`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AdEvent` 
    ADD CONSTRAINT `AdEvent_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AdEvent` 
    ADD CONSTRAINT `AdEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CampaignDailyAggregate` 
    ADD CONSTRAINT `CampaignDailyAggregate_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PlacementDailyAggregate` 
    ADD CONSTRAINT `PlacementDailyAggregate_placementId_fkey` FOREIGN KEY (`placementId`) REFERENCES `AdPlacement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

