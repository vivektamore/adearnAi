import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { serializeBigInts } from '@/lib/money';
import { OpenaiAdsService } from '@/lib/openai-ads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/advertiser/openai/sync
 * Synchronizes metrics from OpenAI Insights endpoints for the brand's active campaigns.
 * Persists reports in OpenaiInsightReport with source attribution ('OPENAI_INSIGHTS_API')
 * and data freshness indicators.
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
    const body = await req.json().catch(() => ({}));
    const { campaignId } = body;

    const whereClause: any = { organizationId: orgId };
    if (campaignId) {
      whereClause.id = campaignId;
    }

    const campaigns = await prisma.openaiCampaign.findMany({
      where: whereClause,
    });

    if (campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        syncedCount: 0,
        message: 'No OpenAI campaigns found to synchronize.',
        reports: [],
      });
    }

    const syncedReports = [];

    for (const campaign of campaigns) {
      const insights = await OpenaiAdsService.getCampaignInsights(
        campaign.externalCampaignId || campaign.id
      );

      const report = await prisma.openaiInsightReport.upsert({
        where: {
          openaiCampaignId_dataDate: {
            openaiCampaignId: campaign.id,
            dataDate: new Date(),
          },
        },
        update: {
          impressions: insights.impressions,
          clicks: insights.clicks,
          spendMicros: insights.spendMicros,
          ctrPercent: insights.ctrPercent,
          avgCpcMicros: insights.avgCpcMicros,
          avgCpmMicros: insights.avgCpmMicros,
          conversions: insights.conversions,
          cpaMicros: insights.cpaMicros,
          attributedSalesMicros: insights.attributedSalesMicros,
          roas: insights.roas,
          freshnessTimestamp: new Date(),
        },
        create: {
          openaiCampaignId: campaign.id,
          dataDate: new Date(),
          impressions: insights.impressions,
          clicks: insights.clicks,
          spendMicros: insights.spendMicros,
          ctrPercent: insights.ctrPercent,
          avgCpcMicros: insights.avgCpcMicros,
          avgCpmMicros: insights.avgCpmMicros,
          conversions: insights.conversions,
          cpaMicros: insights.cpaMicros,
          attributedSalesMicros: insights.attributedSalesMicros,
          roas: insights.roas,
          freshnessTimestamp: new Date(),
        },
      });

      // Update lastSyncedAt on campaign
      await prisma.openaiCampaign.update({
        where: { id: campaign.id },
        data: {
          lastSyncedAt: new Date(),
          reportedSpendMicros: insights.spendMicros,
        },
      });

      syncedReports.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        report,
      });
    }

    return NextResponse.json(
      serializeBigInts({
        success: true,
        syncedCount: syncedReports.length,
        syncedAt: new Date().toISOString(),
        freshnessNotice: 'OpenAI delivery reporting and spend data are subject to a standard 2 to 4 hour processing delay.',
        reports: syncedReports,
      })
    );
  } catch (error: any) {
    console.error('Error synchronizing OpenAI campaign insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to synchronize OpenAI campaign insights.' },
      { status: 500 }
    );
  }
}
