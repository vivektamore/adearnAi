-- =========================================================================
-- ADEARNAI ROLLBACK SCRIPT: 20261125215000_hybrid_ad_network_foundation
-- TARGET ENGINE: MySQL 8.0
-- STRATEGY: Graceful, Safe Reversion of Additive Foundation
-- =========================================================================

-- Step 1: Drop Foreign Key Constraints
ALTER TABLE `PlacementDailyAggregate` DROP FOREIGN KEY `PlacementDailyAggregate_placementId_fkey`;
ALTER TABLE `CampaignDailyAggregate` DROP FOREIGN KEY `CampaignDailyAggregate_campaignId_fkey`;
ALTER TABLE `AdEvent` DROP FOREIGN KEY `AdEvent_userId_fkey`;
ALTER TABLE `AdEvent` DROP FOREIGN KEY `AdEvent_campaignId_fkey`;
ALTER TABLE `AdEvent` DROP FOREIGN KEY `AdEvent_adDecisionId_fkey`;
ALTER TABLE `AdDecision` DROP FOREIGN KEY `AdDecision_campaignId_fkey`;
ALTER TABLE `AdDecision` DROP FOREIGN KEY `AdDecision_adRequestId_fkey`;
ALTER TABLE `AdRequest` DROP FOREIGN KEY `AdRequest_placementId_fkey`;
ALTER TABLE `AdRequest` DROP FOREIGN KEY `AdRequest_userId_fkey`;
ALTER TABLE `CampaignPlacement` DROP FOREIGN KEY `CampaignPlacement_placementId_fkey`;
ALTER TABLE `CampaignPlacement` DROP FOREIGN KEY `CampaignPlacement_campaignId_fkey`;
ALTER TABLE `UserAdPreference` DROP FOREIGN KEY `UserAdPreference_userId_fkey`;
ALTER TABLE `ExtensionInstallation` DROP FOREIGN KEY `ExtensionInstallation_userId_fkey`;
ALTER TABLE `ConsentHistory` DROP FOREIGN KEY `ConsentHistory_userId_fkey`;
ALTER TABLE `UserPreference` DROP FOREIGN KEY `UserPreference_userId_fkey`;
ALTER TABLE `Session` DROP FOREIGN KEY `Session_userId_fkey`;

-- Step 2: Drop Extended Tables
DROP TABLE IF EXISTS `PlacementDailyAggregate`;
DROP TABLE IF EXISTS `CampaignDailyAggregate`;
DROP TABLE IF EXISTS `PaymentWebhookRecord`;
DROP TABLE IF EXISTS `FraudCase`;
DROP TABLE IF EXISTS `AdEvent`;
DROP TABLE IF EXISTS `AdDecision`;
DROP TABLE IF EXISTS `AdRequest`;
DROP TABLE IF EXISTS `CampaignPlacement`;
DROP TABLE IF EXISTS `AdPlacement`;
DROP TABLE IF EXISTS `UserAdPreference`;
DROP TABLE IF EXISTS `ExtensionInstallation`;
DROP TABLE IF EXISTS `ConsentHistory`;
DROP TABLE IF EXISTS `UserPreference`;
DROP TABLE IF EXISTS `Session`;

-- Step 3: Revert Extended Columns on Campaign Table
ALTER TABLE `Campaign` 
    DROP COLUMN `dailyBudgetCapPaise`,
    DROP COLUMN `minKycTier`;

