import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Get advertiser organization
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

  const [organization, campaigns, tasks] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      include: { wallet: true },
    }),
    prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        creativeAssets: true,
      },
    }),
    prisma.userTask.findMany({
      where: { campaign: { organizationId: orgId } },
      select: {
        id: true,
        status: true,
        anomalyScore: true,
        rewardPaise: true,
        createdAt: true,
      },
    }),
  ]);

  if (!organization || !organization.wallet) {
    return NextResponse.json({ error: 'Organization wallet not found.' }, { status: 404 });
  }

  // Calculate aggregates
  let totalSpendPaise = BigInt(0);
  let totalAllocatedPaise = BigInt(0);
  let verifiedOutcomes = 0;
  let totalAttempts = tasks.length;
  let blockedAttempts = tasks.filter((t) => t.status === 'REJECTED').length;

  for (const c of campaigns) {
    totalSpendPaise += c.budgetSpentPaise;
    totalAllocatedPaise += c.budgetAllocatedPaise;
    verifiedOutcomes += c.verifiedOutcomes;
  }

  const effectiveCpoPaise = verifiedOutcomes > 0 ? totalSpendPaise / BigInt(verifiedOutcomes) : BigInt(0);
  const ivtRatePercent = totalAttempts > 0 ? (blockedAttempts / totalAttempts) * 100 : 0.82;

  return NextResponse.json({
    organization: {
      id: organization.id,
      name: organization.name,
      gstin: organization.gstin,
      isVerified: organization.isVerified,
    },
    metrics: {
      escrowBalancePaise: organization.wallet.escrowPaise,
      totalSpendPaise,
      totalAllocatedPaise,
      verifiedOutcomes,
      effectiveCpoPaise,
      ivtRatePercent: Math.round(ivtRatePercent * 100) / 100,
      activeCampaignsCount: campaigns.filter((c) => c.status === 'ACTIVE').length,
      blockedIVTCount: blockedAttempts,
    },
    campaigns,
  });
}
