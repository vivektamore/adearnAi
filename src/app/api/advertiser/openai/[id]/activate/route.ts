import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { serializeBigInts } from '@/lib/money';
import { OpenaiAdsService } from '@/lib/openai-ads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/advertiser/openai/[id]/activate
 * Transitions an OpenAI ChatGPT campaign state between PAUSED and ACTIVE.
 * AdEarn enforces explicit activation confirmation by the advertiser.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const campaignId = params.id;
  const campaign = await prisma.openaiCampaign.findFirst({
    where: {
      id: campaignId,
      organizationId: orgId,
    },
    include: {
      adGroups: {
        include: {
          ads: true,
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'OpenAI campaign not found.' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetStatus = body.status === 'ACTIVE' ? 'active' : 'paused';

    // 1. Call OpenAI Ads API state transition endpoint
    const updatedStatus = await OpenaiAdsService.updateCampaignStatus(
      campaign.externalCampaignId || campaign.id,
      targetStatus
    );

    const dbStatus = updatedStatus.toUpperCase() as any;

    // 2. Update OpenAI campaign, its ad groups and ads in database
    await prisma.$transaction(async (tx) => {
      await tx.openaiCampaign.update({
        where: { id: campaign.id },
        data: { status: dbStatus },
      });

      await tx.openaiAdGroup.updateMany({
        where: { openaiCampaignId: campaign.id },
        data: { status: dbStatus },
      });

      const adGroupIds = campaign.adGroups.map((g) => g.id);
      if (adGroupIds.length > 0) {
        await tx.openaiAd.updateMany({
          where: { adGroupId: { in: adGroupIds } },
          data: { status: dbStatus },
        });
      }

      // Sync parent AdEarn campaign status
      if (campaign.campaignId) {
        await tx.campaign.update({
          where: { id: campaign.campaignId },
          data: { status: dbStatus === 'ACTIVE' ? 'ACTIVE' : 'PAUSED' },
        });
      }
    });

    // 3. Record Audit Log
    await recordAuditLog({
      actorId: auth.session!.userId,
      actorRole: auth.session!.role || 'ADVERTISER',
      action: 'UPDATE_OPENAI_CAMPAIGN_STATUS',
      entityType: 'OPENAI_CAMPAIGN',
      entityId: campaign.id,
      oldState: { status: campaign.status },
      newState: { status: dbStatus },
      ipAddress: req.ip || req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      serializeBigInts({
        success: true,
        campaignId: campaign.id,
        status: dbStatus,
        message: `OpenAI campaign successfully set to ${dbStatus}.`,
      })
    );
  } catch (error: any) {
    console.error('Failed to update OpenAI campaign status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update OpenAI campaign status.' },
      { status: 500 }
    );
  }
}
