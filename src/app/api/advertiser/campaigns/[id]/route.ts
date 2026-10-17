import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      creativeAssets: true,
      userTasks: {
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, kycTier: true },
          },
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { status } = await req.json();
  if (!['ACTIVE', 'PAUSED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid campaign status update' }, { status: 400 });
  }

  const updatedCampaign = await prisma.campaign.update({
    where: { id: params.id },
    data: { status },
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: auth.session!.role,
    action: `CAMPAIGN_STATUS_${status}`,
    entityType: 'Campaign',
    entityId: params.id,
  });

  return NextResponse.json({ success: true, campaign: updatedCampaign });
}
