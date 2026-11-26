-- Rollback Migration: 20261126201500_openai_chatgpt_channel_foundation

ALTER TABLE `OpenaiConversionConfig` DROP FOREIGN KEY `OpenaiConversionConfig_organizationId_fkey`;
ALTER TABLE `OpenaiInsightReport` DROP FOREIGN KEY `OpenaiInsightReport_openaiCampaignId_fkey`;
ALTER TABLE `OpenaiAd` DROP FOREIGN KEY `OpenaiAd_adGroupId_fkey`;
ALTER TABLE `OpenaiAdGroup` DROP FOREIGN KEY `OpenaiAdGroup_openaiCampaignId_fkey`;
ALTER TABLE `OpenaiCampaign` DROP FOREIGN KEY `OpenaiCampaign_campaignId_fkey`;
ALTER TABLE `OpenaiCampaign` DROP FOREIGN KEY `OpenaiCampaign_organizationId_fkey`;

DROP TABLE IF EXISTS `OpenaiConversionConfig`;
DROP TABLE IF EXISTS `OpenaiInsightReport`;
DROP TABLE IF EXISTS `OpenaiAd`;
DROP TABLE IF EXISTS `OpenaiAdGroup`;
DROP TABLE IF EXISTS `OpenaiCampaign`;

ALTER TABLE `Campaign` DROP COLUMN `channel`;

ALTER TABLE `Organization` 
  DROP INDEX `Organization_openaiAccountId_idx`,
  DROP COLUMN `openaiAccountStatus`,
  DROP COLUMN `openaiAccountId`;
