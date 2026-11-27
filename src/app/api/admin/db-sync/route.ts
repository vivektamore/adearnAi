import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET/POST /api/admin/db-sync
 * Safe database self-healing & synchronization endpoint for Vercel cloud deployments.
 * Ensures all required columns (like User.name, Campaign.channel) and OpenAI tables exist.
 */
export async function GET() {
  return handleSync();
}

export async function POST() {
  return handleSync();
}

async function handleSync() {
  const operations: Array<{ statement: string; status: 'applied' | 'already_exists' | 'error'; error?: string }> = [];

  const statements = [
    // 1. User table additions
    "ALTER TABLE `User` ADD COLUMN `name` VARCHAR(191) NOT NULL DEFAULT 'User'",

    // 2. Organization table additions
    "ALTER TABLE `Organization` ADD COLUMN `openaiAccountId` VARCHAR(191) NULL",
    "ALTER TABLE `Organization` ADD COLUMN `openaiAccountStatus` VARCHAR(32) NOT NULL DEFAULT 'UNLINKED'",

    // 3. Campaign table additions
    "ALTER TABLE `Campaign` ADD COLUMN `channel` VARCHAR(32) NOT NULL DEFAULT 'ADEARN_EXTENSION'",
    "ALTER TABLE `Campaign` ADD COLUMN `targetUrl` TEXT NULL",

    // 4. OpenaiCampaign table
    `CREATE TABLE IF NOT EXISTS \`OpenaiCampaign\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`organizationId\` VARCHAR(191) NOT NULL,
      \`campaignId\` VARCHAR(191) NULL,
      \`externalCampaignId\` VARCHAR(64) NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`objective\` VARCHAR(32) NOT NULL DEFAULT 'CLICKS',
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'PAUSED',
      \`budgetType\` VARCHAR(32) NOT NULL DEFAULT 'DAILY',
      \`budgetMicros\` BIGINT NOT NULL DEFAULT 0,
      \`reportedSpendMicros\` BIGINT NOT NULL DEFAULT 0,
      \`currency\` VARCHAR(191) NOT NULL DEFAULT 'USD',
      \`startDate\` DATETIME(3) NULL,
      \`endDate\` DATETIME(3) NULL,
      \`geoTargetingJson\` TEXT NULL,
      \`platformsJson\` TEXT NULL,
      \`landingPageUrl\` TEXT NOT NULL,
      \`complianceJson\` TEXT NULL,
      \`lastSyncedAt\` DATETIME(3) NULL,
      \`syncError\` TEXT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`OpenaiCampaign_campaignId_key\`(\`campaignId\`),
      UNIQUE INDEX \`OpenaiCampaign_externalCampaignId_key\`(\`externalCampaignId\`),
      INDEX \`OpenaiCampaign_organizationId_idx\`(\`organizationId\`),
      INDEX \`OpenaiCampaign_externalCampaignId_idx\`(\`externalCampaignId\`),
      INDEX \`OpenaiCampaign_status_idx\`(\`status\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    // 5. OpenaiAdGroup table
    `CREATE TABLE IF NOT EXISTS \`OpenaiAdGroup\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`openaiCampaignId\` VARCHAR(191) NOT NULL,
      \`externalAdGroupId\` VARCHAR(64) NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'PAUSED',
      \`contextHintsJson\` TEXT NULL,
      \`bidStrategy\` VARCHAR(191) NOT NULL DEFAULT 'MAX_CLICKS',
      \`maxBidMicros\` BIGINT NULL,
      \`billingEvent\` VARCHAR(191) NOT NULL DEFAULT 'click',
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`OpenaiAdGroup_externalAdGroupId_key\`(\`externalAdGroupId\`),
      INDEX \`OpenaiAdGroup_openaiCampaignId_idx\`(\`openaiCampaignId\`),
      INDEX \`OpenaiAdGroup_externalAdGroupId_idx\`(\`externalAdGroupId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    // 6. OpenaiAd table
    `CREATE TABLE IF NOT EXISTS \`OpenaiAd\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`adGroupId\` VARCHAR(191) NOT NULL,
      \`externalAdId\` VARCHAR(64) NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`brandName\` VARCHAR(191) NOT NULL,
      \`faviconUrl\` TEXT NULL,
      \`headline\` VARCHAR(191) NOT NULL,
      \`description\` TEXT NOT NULL,
      \`imageUrl\` TEXT NOT NULL,
      \`landingPageUrl\` TEXT NOT NULL,
      \`utmParameters\` TEXT NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'PAUSED',
      \`reviewStatus\` VARCHAR(191) NOT NULL DEFAULT 'PENDING_REVIEW',
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`OpenaiAd_externalAdId_key\`(\`externalAdId\`),
      INDEX \`OpenaiAd_adGroupId_idx\`(\`adGroupId\`),
      INDEX \`OpenaiAd_externalAdId_idx\`(\`externalAdId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    // 7. OpenaiInsightReport table
    `CREATE TABLE IF NOT EXISTS \`OpenaiInsightReport\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`openaiCampaignId\` VARCHAR(191) NOT NULL,
      \`dataDate\` DATE NOT NULL,
      \`impressions\` INTEGER NOT NULL DEFAULT 0,
      \`clicks\` INTEGER NOT NULL DEFAULT 0,
      \`spendMicros\` BIGINT NOT NULL DEFAULT 0,
      \`ctrPercent\` DOUBLE NOT NULL DEFAULT 0,
      \`avgCpcMicros\` BIGINT NOT NULL DEFAULT 0,
      \`avgCpmMicros\` BIGINT NOT NULL DEFAULT 0,
      \`conversions\` INTEGER NOT NULL DEFAULT 0,
      \`cpaMicros\` BIGINT NOT NULL DEFAULT 0,
      \`attributedSalesMicros\` BIGINT NOT NULL DEFAULT 0,
      \`roas\` DOUBLE NOT NULL DEFAULT 0,
      \`freshnessTimestamp\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`OpenaiInsightReport_openaiCampaignId_dataDate_key\`(\`openaiCampaignId\`, \`dataDate\`),
      INDEX \`OpenaiInsightReport_openaiCampaignId_idx\`(\`openaiCampaignId\`),
      INDEX \`OpenaiInsightReport_dataDate_idx\`(\`dataDate\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

    // 8. OpenaiConversionConfig table
    `CREATE TABLE IF NOT EXISTS \`OpenaiConversionConfig\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`organizationId\` VARCHAR(191) NOT NULL,
      \`pixelId\` VARCHAR(191) NULL,
      \`pixelCode\` TEXT NULL,
      \`conversionsApiEnabled\` BOOLEAN NOT NULL DEFAULT false,
      \`attributionWindowDays\` INTEGER NOT NULL DEFAULT 7,
      \`eventDeduplicationEnabled\` BOOLEAN NOT NULL DEFAULT true,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`OpenaiConversionConfig_organizationId_key\`(\`organizationId\`),
      INDEX \`OpenaiConversionConfig_organizationId_idx\`(\`organizationId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      operations.push({ statement: sql.slice(0, 60) + '...', status: 'applied' });
    } catch (err: any) {
      if (
        err.message?.includes('Duplicate column') ||
        err.message?.includes('already exists') ||
        err.message?.includes('1060')
      ) {
        operations.push({ statement: sql.slice(0, 60) + '...', status: 'already_exists' });
      } else {
        operations.push({ statement: sql.slice(0, 60) + '...', status: 'error', error: err.message });
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Database schema successfully verified and synchronized.',
    timestamp: new Date().toISOString(),
    operations,
  });
}
