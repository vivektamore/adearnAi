import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { serializeBigInts } from '@/lib/money';
import {
  OpenaiAdsService,
  CreateOpenaiCampaignParams,
  CreateOpenaiAdGroupParams,
  CreateOpenaiAdParams,
  OpenaiObjectiveType,
  OpenaiBudgetTypeEnum,
} from '@/lib/openai-ads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/advertiser/openai
 * Fetches connected OpenAI Ad Account status, capabilities, and list of campaigns
 * with their ad groups, ads, and latest insight metrics.
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let orgId = auth.session!.organizationId;
  if (!orgId) {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: auth.session!.userId },
    });
    orgId = userOrg?.organizationId || null;
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Advertiser organization not associated.' }, { status: 400 });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      openaiAccountId: true,
      openaiAccountStatus: true,
    },
  });

  const accountInfo = await OpenaiAdsService.getAdAccount();

  // If organization does not have an openaiAccountId yet, associate the discovered account ID
  if (organization && !organization.openaiAccountId) {
    const accountStatusMap: Record<string, 'UNLINKED' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED'> = {
      ACTIVE: 'ACTIVE',
      PENDING_REVIEW: 'PENDING_VERIFICATION',
      SUSPENDED: 'SUSPENDED',
    };
    const mappedStatus = accountStatusMap[accountInfo.status] || 'PENDING_VERIFICATION';

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        openaiAccountId: accountInfo.id,
        openaiAccountStatus: mappedStatus,
      },
    });
  }

  // Fetch all OpenAI campaigns for this organization
  const campaigns = await prisma.openaiCampaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      adGroups: {
        include: {
          ads: true,
        },
      },
      insightReports: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return NextResponse.json(
    serializeBigInts({
      account: accountInfo,
      campaigns,
    })
  );
}

/**
 * POST /api/advertiser/openai
 * Autonomous OpenAI ChatGPT Campaign Pipeline:
 * 1. Verify account status & capabilities
 * 2. Create OpenAI campaign (starts in PAUSED state)
 * 3. Create OpenAI ad group (starts in PAUSED state)
 * 4. Create OpenAI ad (starts in PAUSED state)
 * 5. Persist hierarchy and link to AdEarn parent campaign record
 * 6. Record audit log
 */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let orgId = auth.session!.organizationId;
  if (!orgId) {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: auth.session!.userId },
    });
    orgId = userOrg?.organizationId || null;
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Advertiser organization not associated.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      // Step 1: Campaign details
      name,
      objective, // 'impressions' | 'clicks' | 'conversions'
      budgetType, // 'DAILY' | 'LIFETIME'
      budgetAmount, // Major units (e.g., 2900.00 for ₹2,900)
      currency = 'INR',
      startTime,
      endTime,
      countries = ['India'],
      platforms = ['Android app', 'Android web', 'Desktop web', 'iOS app', 'iOS web'],
      landingPageUrl,
      complianceAcknowledged,

      // Step 2: Ad Group details
      adGroupName,
      contextHints = [],
      bidStrategy = 'LOWEST_COST',
      maxBidAmount,

      // Step 2: Ad Creative details
      brandName,
      faviconUrl,
      headline,
      description,
      imageUrl,
      utmParameters,
    } = body;

    // Strict Validations
    if (!name || !objective || !budgetType || budgetAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required campaign parameters (name, objective, budgetType, budgetAmount).' },
        { status: 400 }
      );
    }

    if (!complianceAcknowledged) {
      return NextResponse.json(
        { error: 'Advertiser agreement and OpenAI advertising policy acknowledgment are mandatory.' },
        { status: 400 }
      );
    }

    if (!headline || headline.length > 60) {
      return NextResponse.json(
        { error: 'Headline is required and must not exceed 60 characters.' },
        { status: 400 }
      );
    }

    if (!description || description.length > 120) {
      return NextResponse.json(
        { error: 'Description is required and must not exceed 120 characters.' },
        { status: 400 }
      );
    }

    if (!landingPageUrl || !imageUrl) {
      return NextResponse.json(
        { error: 'Landing page URL and creative image URL are required.' },
        { status: 400 }
      );
    }

    // Convert major currency amount to integer micros ($1 = 1,000,000 micros)
    const budgetMicros = OpenaiAdsService.unitsToMicros(Number(budgetAmount));
    const maxBidMicros = maxBidAmount ? OpenaiAdsService.unitsToMicros(Number(maxBidAmount)) : undefined;

    // 1. Verify OpenAI Ad Account
    const accountInfo = await OpenaiAdsService.getAdAccount();
    if (accountInfo.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Connected OpenAI Ad Account is suspended. Cannot create campaigns.' },
        { status: 403 }
      );
    }

    // 2. Create OpenAI Campaign (initial state: PAUSED)
    const campaignParams: CreateOpenaiCampaignParams = {
      name,
      objective: objective.toLowerCase() as OpenaiObjectiveType,
      budgetType: budgetType.toUpperCase() as OpenaiBudgetTypeEnum,
      budgetMicros,
      currency,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      countries: Array.isArray(countries) ? countries : [countries],
      platforms: Array.isArray(platforms) ? platforms : [platforms],
      landingPageUrl,
      complianceInfo: { acknowledgedAt: new Date().toISOString() },
    };

    const externalCampaign = await OpenaiAdsService.createCampaign(campaignParams);

    // 3. Create OpenAI Ad Group (initial state: PAUSED)
    const billingMapping = OpenaiAdsService.getBillingMapping(campaignParams.objective);
    const adGroupParams: CreateOpenaiAdGroupParams = {
      externalCampaignId: externalCampaign.externalCampaignId,
      name: adGroupName || `${name} - Ad Group 1`,
      contextHints: Array.isArray(contextHints) ? contextHints : [],
      bidStrategy,
      maxBidMicros,
      billingEvent: billingMapping.billingEvent,
    };

    const externalAdGroup = await OpenaiAdsService.createAdGroup(adGroupParams);

    // 4. Create OpenAI Ad (initial state: PAUSED)
    const adParams: CreateOpenaiAdParams = {
      externalAdGroupId: externalAdGroup.externalAdGroupId,
      name: `${name} - Ad 1`,
      brandName: brandName || 'AdEarn Brand',
      faviconUrl,
      headline,
      description,
      imageUrl,
      landingPageUrl,
      utmParameters,
    };

    const externalAd = await OpenaiAdsService.createAd(adParams);

    // 5. Persist unified record in AdEarn DB
    // Create master AdEarn campaign record marked with channel: OPENAI_CHATGPT
    const parentCampaign = await prisma.campaign.create({
      data: {
        organizationId: orgId,
        title: `[ChatGPT] ${name}`,
        description: `Autonomous OpenAI ChatGPT campaign: ${name}`,
        category: 'ChatGPT Native Advertising',
        channel: 'OPENAI_CHATGPT',
        actionType: 'SANDBOX_TRIAL',
        targetUrl: landingPageUrl,
        costPerOutcomePaise: BigInt(0), // No AdEarn escrow or CPO settlement for OpenAI inventory
        budgetAllocatedPaise: BigInt(0), // Stored as 0 in AdEarn paise to prevent unit conflation
        targetOutcomes: 0,
        status: 'PAUSED',
        flightStart: startTime ? new Date(startTime) : new Date(),
        flightEnd: endTime ? new Date(endTime) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Save OpenaiCampaign
    const dbOpenaiCampaign = await prisma.openaiCampaign.create({
      data: {
        organizationId: orgId,
        campaignId: parentCampaign.id,
        externalCampaignId: externalCampaign.externalCampaignId,
        name,
        objective: objective.toUpperCase() as any,
        status: 'PAUSED',
        budgetType: budgetType.toUpperCase() as any,
        budgetMicros,
        currency,
        startDate: campaignParams.startTime,
        endDate: campaignParams.endTime,
        geoTargetingJson: JSON.stringify(campaignParams.countries),
        platformsJson: JSON.stringify(campaignParams.platforms),
        landingPageUrl: campaignParams.landingPageUrl,
        complianceJson: JSON.stringify(campaignParams.complianceInfo),
      },
    });

    // Save OpenaiAdGroup
    const dbOpenaiAdGroup = await prisma.openaiAdGroup.create({
      data: {
        openaiCampaignId: dbOpenaiCampaign.id,
        externalAdGroupId: externalAdGroup.externalAdGroupId,
        name: adGroupParams.name,
        status: 'PAUSED',
        contextHintsJson: JSON.stringify(adGroupParams.contextHints),
        bidStrategy: adGroupParams.bidStrategy,
        maxBidMicros: adGroupParams.maxBidMicros,
        billingEvent: adGroupParams.billingEvent,
      },
    });

    // Save OpenaiAd
    const dbOpenaiAd = await prisma.openaiAd.create({
      data: {
        adGroupId: dbOpenaiAdGroup.id,
        externalAdId: externalAd.externalAdId,
        name: adParams.name,
        status: 'PAUSED',
        brandName: adParams.brandName,
        faviconUrl: adParams.faviconUrl,
        headline: adParams.headline,
        description: adParams.description,
        imageUrl: adParams.imageUrl,
        landingPageUrl: adParams.landingPageUrl,
        utmParameters: adParams.utmParameters,
        reviewStatus: 'PENDING_REVIEW',
      },
    });

    // Create initial insight snapshot
    const initialInsights = await OpenaiAdsService.getCampaignInsights(externalCampaign.externalCampaignId);
    await prisma.openaiInsightReport.create({
      data: {
        openaiCampaignId: dbOpenaiCampaign.id,
        dataDate: new Date(),
        impressions: initialInsights.impressions,
        clicks: initialInsights.clicks,
        spendMicros: initialInsights.spendMicros,
        ctrPercent: initialInsights.ctrPercent,
        avgCpcMicros: initialInsights.avgCpcMicros,
        avgCpmMicros: initialInsights.avgCpmMicros,
        conversions: initialInsights.conversions,
        cpaMicros: initialInsights.cpaMicros,
        attributedSalesMicros: initialInsights.attributedSalesMicros,
        roas: initialInsights.roas,
        freshnessTimestamp: new Date(),
      },
    });

    // 6. Record Audit Log
    await recordAuditLog({
      actorId: auth.session!.userId,
      actorRole: auth.session!.role || 'ADVERTISER',
      action: 'CREATE_OPENAI_CAMPAIGN',
      entityType: 'OPENAI_CAMPAIGN',
      entityId: dbOpenaiCampaign.id,
      newState: {
        campaignName: name,
        objective,
        budgetMicros: budgetMicros.toString(),
        adGroupId: dbOpenaiAdGroup.id,
        adId: dbOpenaiAd.id,
        isSandbox: accountInfo.isSandbox,
      },
      ipAddress: req.ip || req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      serializeBigInts({
        success: true,
        campaign: {
          ...dbOpenaiCampaign,
          adGroups: [
            {
              ...dbOpenaiAdGroup,
              ads: [dbOpenaiAd],
            },
          ],
        },
        account: accountInfo,
        requiresActivation: true,
        message: 'Campaign created in PAUSED state. Ready for advertiser review and activation.',
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create OpenAI ChatGPT campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error creating OpenAI ChatGPT campaign.' },
      { status: 500 }
    );
  }
}
