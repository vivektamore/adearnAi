-- Migration: 20261126201500_openai_chatgpt_channel_foundation

-- AlterTable Organization
ALTER TABLE `Organization` 
  ADD COLUMN `openaiAccountId` VARCHAR(191) NULL,
  ADD COLUMN `openaiAccountStatus` ENUM('UNLINKED', 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'UNLINKED';

CREATE INDEX `Organization_openaiAccountId_idx` ON `Organization`(`openaiAccountId`);

-- AlterTable Campaign
ALTER TABLE `Campaign` 
  ADD COLUMN `channel` ENUM('ADEARN_EXTENSION', 'OPENAI_CHATGPT') NOT NULL DEFAULT 'ADEARN_EXTENSION';

-- CreateTable OpenaiCampaign
CREATE TABLE `OpenaiCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `externalCampaignId` VARCHAR(64) NULL,
    `name` VARCHAR(191) NOT NULL,
    `objective` ENUM('IMPRESSIONS', 'CLICKS', 'CONVERSIONS') NOT NULL DEFAULT 'CLICKS',
    `status` ENUM('PAUSED', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'PAUSED',
    `budgetType` ENUM('DAILY', 'LIFETIME') NOT NULL DEFAULT 'DAILY',
    `budgetMicros` BIGINT NOT NULL DEFAULT 0,
    `reportedSpendMicros` BIGINT NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `geoTargetingJson` TEXT NULL,
    `platformsJson` TEXT NULL,
    `landingPageUrl` TEXT NOT NULL,
    `complianceJson` TEXT NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `syncError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OpenaiCampaign_campaignId_key`(`campaignId`),
    UNIQUE INDEX `OpenaiCampaign_externalCampaignId_key`(`externalCampaignId`),
    INDEX `OpenaiCampaign_organizationId_idx`(`organizationId`),
    INDEX `OpenaiCampaign_externalCampaignId_idx`(`externalCampaignId`),
    INDEX `OpenaiCampaign_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable OpenaiAdGroup
CREATE TABLE `OpenaiAdGroup` (
    `id` VARCHAR(191) NOT NULL,
    `openaiCampaignId` VARCHAR(191) NOT NULL,
    `externalAdGroupId` VARCHAR(64) NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('PAUSED', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'PAUSED',
    `contextHintsJson` TEXT NULL,
    `bidStrategy` VARCHAR(191) NOT NULL DEFAULT 'MAX_CLICKS',
    `maxBidMicros` BIGINT NULL,
    `billingEvent` VARCHAR(191) NOT NULL DEFAULT 'click',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OpenaiAdGroup_externalAdGroupId_key`(`externalAdGroupId`),
    INDEX `OpenaiAdGroup_openaiCampaignId_idx`(`openaiCampaignId`),
    INDEX `OpenaiAdGroup_externalAdGroupId_idx`(`externalAdGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable OpenaiAd
CREATE TABLE `OpenaiAd` (
    `id` VARCHAR(191) NOT NULL,
    `adGroupId` VARCHAR(191) NOT NULL,
    `externalAdId` VARCHAR(64) NULL,
    `name` VARCHAR(191) NOT NULL,
    `brandName` VARCHAR(191) NOT NULL,
    `faviconUrl` TEXT NULL,
    `headline` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `imageUrl` TEXT NOT NULL,
    `landingPageUrl` TEXT NOT NULL,
    `utmParameters` TEXT NULL,
    `status` ENUM('PAUSED', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'PAUSED',
    `reviewStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING_REVIEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OpenaiAd_externalAdId_key`(`externalAdId`),
    INDEX `OpenaiAd_adGroupId_idx`(`adGroupId`),
    INDEX `OpenaiAd_externalAdId_idx`(`externalAdId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable OpenaiInsightReport
CREATE TABLE `OpenaiInsightReport` (
    `id` VARCHAR(191) NOT NULL,
    `openaiCampaignId` VARCHAR(191) NOT NULL,
    `dataDate` DATE NOT NULL,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `spendMicros` BIGINT NOT NULL DEFAULT 0,
    `ctrPercent` DOUBLE NOT NULL DEFAULT 0,
    `avgCpcMicros` BIGINT NOT NULL DEFAULT 0,
    `avgCpmMicros` BIGINT NOT NULL DEFAULT 0,
    `conversions` INTEGER NOT NULL DEFAULT 0,
    `cpaMicros` BIGINT NOT NULL DEFAULT 0,
    `attributedSalesMicros` BIGINT NOT NULL DEFAULT 0,
    `roas` DOUBLE NOT NULL DEFAULT 0,
    `freshnessTimestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OpenaiInsightReport_openaiCampaignId_idx`(`openaiCampaignId`),
    INDEX `OpenaiInsightReport_dataDate_idx`(`dataDate`),
    UNIQUE INDEX `OpenaiInsightReport_openaiCampaignId_dataDate_key`(`openaiCampaignId`, `dataDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable OpenaiConversionConfig
CREATE TABLE `OpenaiConversionConfig` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `pixelId` VARCHAR(191) NULL,
    `pixelCode` TEXT NULL,
    `conversionsApiEnabled` BOOLEAN NOT NULL DEFAULT false,
    `attributionWindowDays` INTEGER NOT NULL DEFAULT 7,
    `eventDeduplicationEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OpenaiConversionConfig_organizationId_key`(`organizationId`),
    INDEX `OpenaiConversionConfig_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OpenaiCampaign` ADD CONSTRAINT `OpenaiCampaign_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpenaiCampaign` ADD CONSTRAINT `OpenaiCampaign_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpenaiAdGroup` ADD CONSTRAINT `OpenaiAdGroup_openaiCampaignId_fkey` FOREIGN KEY (`openaiCampaignId`) REFERENCES `OpenaiCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpenaiAd` ADD CONSTRAINT `OpenaiAd_adGroupId_fkey` FOREIGN KEY (`adGroupId`) REFERENCES `OpenaiAdGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpenaiInsightReport` ADD CONSTRAINT `OpenaiInsightReport_openaiCampaignId_fkey` FOREIGN KEY (`openaiCampaignId`) REFERENCES `OpenaiCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpenaiConversionConfig` ADD CONSTRAINT `OpenaiConversionConfig_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
