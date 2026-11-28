import prisma from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import {
  OpenaiAdsService,
  CreateOpenaiCampaignParams,
  CreateOpenaiAdGroupParams,
  CreateOpenaiAdParams,
} from '@/lib/openai-ads';

export interface DeploymentResult {
  success: boolean;
  campaignId: string;
  channelsDeployed: string[];
  openaiCampaignId?: string;
  extensionStatus?: string;
  message: string;
}

/**
 * Autonomous Campaign Deployer
 * Handles zero-friction autonomous deployment of approved campaigns to
 * OpenAI ChatGPT and/or the AdEarn Extension network.
 */
export class CampaignDeployer {
  static async deploy(campaignId: string, reviewerUserId: string): Promise<DeploymentResult> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        organization: true,
        creativeAssets: true,
        openaiCampaign: true,
      },
    });

    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found.`);
    }

    const channelsDeployed: string[] = [];
    let externalOpenaiCampaignId: string | undefined;

    // 1. DEPLOY TO OPENAI CHATGPT (if OPENAI_CHATGPT or OMNICHANNEL)
    if (campaign.channel === 'OPENAI_CHATGPT' || campaign.channel === 'OMNICHANNEL') {
      try {
        const accountInfo = await OpenaiAdsService.getAdAccount();
        const asset = campaign.creativeAssets[0]?.assetUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71';

        // Convert paise to major INR, then to integer micros ($1/₹1 = 1,000,000 micros)
        const budgetRupees = Number(campaign.budgetAllocatedPaise) / 100;
        const budgetMicros = BigInt(Math.max(1000, Math.round(budgetRupees * 1_000_000)));

        // Context hints generation from title, description, category
        let parsedHints: string[] = [];
        if (campaign.contextHintsJson) {
          try {
            parsedHints = JSON.parse(campaign.contextHintsJson);
          } catch {
            parsedHints = campaign.contextHintsJson.split(',').map((s) => s.trim());
          }
        }

        if (parsedHints.length === 0) {
          parsedHints = [
            `${campaign.category.toLowerCase()} solutions`,
            `${campaign.title.toLowerCase().slice(0, 30)}`,
            'digital platform workflow',
            'performance analytics',
          ];
        }

        // Headlines and descriptions strictly conforming to character constraints
        const headlineRaw = campaign.headline || campaign.title;
        const headline = headlineRaw.length > 60 ? headlineRaw.slice(0, 57) + '...' : headlineRaw;

        const descRaw = campaign.description || `${campaign.title} - Exclusive offer for forward-thinking teams.`;
        const description = descRaw.length > 120 ? descRaw.slice(0, 117) + '...' : descRaw;

        // 1.1 Create OpenAI Campaign
        const extCampaign = await OpenaiAdsService.createCampaign({
          name: campaign.title,
          objective: 'clicks',
          budgetType: 'DAILY',
          budgetMicros,
          currency: 'INR',
          countries: ['India'],
          platforms: ['Android app', 'Android web', 'Desktop web', 'iOS app', 'iOS web'],
          landingPageUrl: campaign.targetUrl || 'https://adearn.ai',
          complianceInfo: { approvedByAdmin: reviewerUserId, approvedAt: new Date().toISOString() },
        });

        // 1.2 Create OpenAI Ad Group
        const extAdGroup = await OpenaiAdsService.createAdGroup({
          externalCampaignId: extCampaign.externalCampaignId,
          name: `${campaign.title} - Ad Group`,
          contextHints: parsedHints,
          bidStrategy: 'LOWEST_COST',
          billingEvent: 'click',
        });

        // 1.3 Create OpenAI Ad
        const extAd = await OpenaiAdsService.createAd({
          externalAdGroupId: extAdGroup.externalAdGroupId,
          name: `${campaign.title} - Native Ad`,
          brandName: campaign.brandName || campaign.organization.name,
          faviconUrl: campaign.faviconUrl || undefined,
          headline,
          description,
          imageUrl: asset,
          landingPageUrl: campaign.targetUrl || 'https://adearn.ai',
        });

        // 1.4 Transition to ACTIVE in OpenAI
        await OpenaiAdsService.updateCampaignStatus(extCampaign.externalCampaignId, 'active');

        // 1.5 Persist in Database
        const dbOpenaiCampaign = await prisma.openaiCampaign.upsert({
          where: { campaignId: campaign.id },
          update: {
            status: 'ACTIVE',
            externalCampaignId: extCampaign.externalCampaignId,
            name: campaign.title,
            budgetMicros,
          },
          create: {
            organizationId: campaign.organizationId,
            campaignId: campaign.id,
            externalCampaignId: extCampaign.externalCampaignId,
            name: campaign.title,
            objective: 'CLICKS',
            status: 'ACTIVE',
            budgetType: 'DAILY',
            budgetMicros,
            currency: 'INR',
            landingPageUrl: campaign.targetUrl || 'https://adearn.ai',
            geoTargetingJson: JSON.stringify(['India']),
            platformsJson: JSON.stringify(['Android app', 'Android web', 'Desktop web', 'iOS app', 'iOS web']),
          },
        });

        const dbAdGroup = await prisma.openaiAdGroup.create({
          data: {
            openaiCampaignId: dbOpenaiCampaign.id,
            externalAdGroupId: extAdGroup.externalAdGroupId,
            name: `${campaign.title} - Ad Group`,
            status: 'ACTIVE',
            contextHintsJson: JSON.stringify(parsedHints),
            bidStrategy: 'LOWEST_COST',
            billingEvent: 'click',
          },
        });

        await prisma.openaiAd.create({
          data: {
            adGroupId: dbAdGroup.id,
            externalAdId: extAd.externalAdId,
            name: `${campaign.title} - Native Ad`,
            status: 'ACTIVE',
            brandName: campaign.brandName || campaign.organization.name,
            faviconUrl: campaign.faviconUrl,
            headline,
            description,
            imageUrl: asset,
            landingPageUrl: campaign.targetUrl || 'https://adearn.ai',
            reviewStatus: 'APPROVED',
          },
        });

        // Create initial insights snapshot
        const initialInsights = await OpenaiAdsService.getCampaignInsights(extCampaign.externalCampaignId);
        await prisma.openaiInsightReport.upsert({
          where: {
            openaiCampaignId_dataDate: {
              openaiCampaignId: dbOpenaiCampaign.id,
              dataDate: new Date(),
            },
          },
          update: {
            impressions: initialInsights.impressions,
            clicks: initialInsights.clicks,
            spendMicros: initialInsights.spendMicros,
            ctrPercent: initialInsights.ctrPercent,
            conversions: initialInsights.conversions,
            freshnessTimestamp: new Date(),
          },
          create: {
            openaiCampaignId: dbOpenaiCampaign.id,
            dataDate: new Date(),
            impressions: initialInsights.impressions,
            clicks: initialInsights.clicks,
            spendMicros: initialInsights.spendMicros,
            ctrPercent: initialInsights.ctrPercent,
            avgCpcMicros: initialInsights.avgCpcMicros,
            avgCpmMicros: initialInsights.avgCpmMicros,
            conversions: initialInsights.conversions,
            freshnessTimestamp: new Date(),
          },
        });

        channelsDeployed.push('OPENAI_CHATGPT');
        externalOpenaiCampaignId = extCampaign.externalCampaignId;
      } catch (err: any) {
        console.error('Failed to deploy to OpenAI ChatGPT:', err);
        throw new Error(`OpenAI ChatGPT deployment failed: ${err.message}`);
      }
    }

    // 2. DEPLOY TO ADEARN EXTENSION (if ADEARN_EXTENSION or OMNICHANNEL)
    if (campaign.channel === 'ADEARN_EXTENSION' || campaign.channel === 'OMNICHANNEL') {
      channelsDeployed.push('ADEARN_EXTENSION');
    }

    // 3. UPDATE MASTER CAMPAIGN TO ACTIVE
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'ACTIVE',
      },
    });

    // 4. WRITE AUDIT LOG
    await recordAuditLog({
      actorId: reviewerUserId,
      actorRole: 'ADMIN',
      action: 'CAMPAIGN_AUTONOMOUS_DEPLOYED',
      entityType: 'Campaign',
      entityId: campaign.id,
      newState: {
        channelsDeployed,
        openaiCampaignId: externalOpenaiCampaignId,
        status: 'ACTIVE',
      },
    });

    return {
      success: true,
      campaignId: campaign.id,
      channelsDeployed,
      openaiCampaignId: externalOpenaiCampaignId,
      extensionStatus: 'ACTIVE',
      message: `Campaign successfully approved and deployed to [${channelsDeployed.join(', ')}].`,
    };
  }
}
