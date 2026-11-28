import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminPermission, requireRole } from '@/lib/rbac';
import { recordAuditLog } from '@/lib/audit';
import { serializeBigInts } from '@/lib/money';
import { CampaignDeployer } from '@/lib/campaign-deployer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['ADMIN', 'SUPER_ADMIN']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      organization: { select: { name: true, gstin: true, isVerified: true } },
      creativeAssets: true,
      openaiCampaign: true,
    },
  });

  return NextResponse.json(serializeBigInts({ campaigns }));
}

export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, 'campaigns.moderate');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { campaignId, decision, reviewerNotes } = await req.json();

  if (!['ACTIVE', 'REJECTED', 'PAUSED'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision code' }, { status: 400 });
  }

  try {
    let deploymentResult = null;

    if (decision === 'ACTIVE') {
      // Autonomous Multi-Channel Deployment on Approval
      deploymentResult = await CampaignDeployer.deploy(campaignId, auth.session!.userId);
    } else {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: decision },
      });
    }

    await prisma.moderationRecord.create({
      data: {
        campaignId,
        reviewerUserId: auth.session!.userId,
        decision,
        reviewerNotes: reviewerNotes || (decision === 'ACTIVE' ? 'Approved & autonomously deployed' : 'Rejected'),
        reviewedAt: new Date(),
      },
    });

    await recordAuditLog({
      actorId: auth.session!.userId,
      actorRole: 'ADMIN',
      action: `MODERATION_DECISION_${decision}`,
      entityType: 'Campaign',
      entityId: campaignId,
      newState: { decision, reviewerNotes, deploymentResult },
    });

    const updatedCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        organization: true,
        creativeAssets: true,
        openaiCampaign: true,
      },
    });

    return NextResponse.json(
      serializeBigInts({
        success: true,
        campaign: updatedCampaign,
        deployment: deploymentResult,
        message: decision === 'ACTIVE'
          ? 'Campaign approved and autonomously deployed across selected channels.'
          : `Campaign status updated to ${decision}.`,
      })
    );
  } catch (error: any) {
    console.error('Moderation deployment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process moderation action.' },
      { status: 500 }
    );
  }
}
