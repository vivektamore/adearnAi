import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';
import { verifyBrandOwnership, hasPermission, normalizeRole } from '@/lib/rbac';
import { serializeBigInts } from '@/lib/money';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']);
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

  // IDOR Defense: verify brand ownership if caller is advertiser
  const role = normalizeRole(auth.session!.role);
  if (role === 'ADVERTISER') {
    let orgId = auth.session!.organizationId;
    if (!orgId) {
      const userOrg = await prisma.userOrganization.findFirst({
        where: { userId: auth.session!.userId },
      });
      orgId = userOrg?.organizationId || null;
    }

    const ownershipCheck = verifyBrandOwnership(
      { ...auth.session!, organizationId: orgId },
      campaign.organizationId
    );
    if (!ownershipCheck.authorized) {
      return NextResponse.json({ error: ownershipCheck.error }, { status: ownershipCheck.status });
    }
  } else if (role === 'ADMIN') {
    if (!hasPermission('ADMIN', 'campaigns.moderate')) {
      return NextResponse.json(
        { error: "Forbidden. Administrative permission 'campaigns.moderate' required." },
        { status: 403 }
      );
    }
  }

  return NextResponse.json(serializeBigInts({ campaign }));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // IDOR Defense: verify brand ownership if caller is advertiser
  const role = normalizeRole(auth.session!.role);
  if (role === 'ADVERTISER') {
    let orgId = auth.session!.organizationId;
    if (!orgId) {
      const userOrg = await prisma.userOrganization.findFirst({
        where: { userId: auth.session!.userId },
      });
      orgId = userOrg?.organizationId || null;
    }

    const ownershipCheck = verifyBrandOwnership(
      { ...auth.session!, organizationId: orgId },
      campaign.organizationId
    );
    if (!ownershipCheck.authorized) {
      return NextResponse.json({ error: ownershipCheck.error }, { status: ownershipCheck.status });
    }
  } else if (role === 'ADMIN') {
    if (!hasPermission('ADMIN', 'campaigns.moderate')) {
      return NextResponse.json(
        { error: "Forbidden. Administrative permission 'campaigns.moderate' required." },
        { status: 403 }
      );
    }
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

  return NextResponse.json(serializeBigInts({ success: true, campaign: updatedCampaign }));
}
