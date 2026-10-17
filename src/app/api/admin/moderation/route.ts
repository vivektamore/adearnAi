import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      organization: { select: { name: true, gstin: true, isVerified: true } },
      creativeAssets: true,
    },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { campaignId, decision, reviewerNotes } = await req.json();

  if (!['ACTIVE', 'REJECTED', 'PAUSED'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision code' }, { status: 400 });
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: decision },
  });

  await prisma.moderationRecord.create({
    data: {
      campaignId,
      reviewerUserId: auth.session!.userId,
      decision,
      reviewerNotes,
      reviewedAt: new Date(),
    },
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: 'ADMIN',
    action: `MODERATION_DECISION_${decision}`,
    entityType: 'Campaign',
    entityId: campaignId,
    newState: { decision, reviewerNotes },
  });

  return NextResponse.json({ success: true, campaign: updatedCampaign });
}
