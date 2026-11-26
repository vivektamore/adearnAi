import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']);
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
  const ivtRatePercent = totalAttempts > 0 ? (blockedAttempts / totalAttempts) * 100 : 0;

  // Aggregate daily time-series for the past 7 days from genuine task timestamps
  const now = new Date();
  const dailySeries: Array<{ date: string; valid: number; blocked: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date(now.getTime() - i * 86400000);
    const dateStr = dayDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const startOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    const endOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);

    const dayTasks = tasks.filter((t) => {
      const tDate = new Date(t.createdAt);
      return tDate >= startOfDay && tDate <= endOfDay;
    });

    dailySeries.push({
      date: dateStr,
      valid: dayTasks.filter((t) => t.status === 'VALIDATED').length,
      blocked: dayTasks.filter((t) => t.status === 'REJECTED').length,
    });
  }

  return NextResponse.json(
    serializeBigInts({
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
        campaignsTotal: campaigns.length,
        activeCampaignsCount: campaigns.filter((c) => c.status === 'ACTIVE').length,
        blockedIVTCount: blockedAttempts,
      },
      user: {
        name: auth.session!.name,
        email: auth.session!.email,
      },
      dailySeries,
      campaigns,
    })
  );
}
