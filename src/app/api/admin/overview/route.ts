import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [
    totalUsers,
    totalAdvertisers,
    activeCampaigns,
    pendingModeration,
    pendingPayouts,
    flaggedFraud,
    wallets,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.organization.count(),
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    prisma.campaign.count({ where: { status: 'IN_REVIEW' } }),
    prisma.payoutRequest.count({ where: { status: 'REQUESTED' } }),
    prisma.userTask.count({ where: { fraudVerdict: 'FLAGGED' } }),
    prisma.wallet.findMany(),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);

  let totalAvailablePaise = BigInt(0);
  let totalEscrowPaise = BigInt(0);
  for (const w of wallets) {
    totalAvailablePaise += w.availablePaise;
    totalEscrowPaise += w.escrowPaise;
  }

  return NextResponse.json(
    serializeBigInts({
      sessionUser: {
        userId: auth.session!.userId,
        email: auth.session!.email,
        name: auth.session!.name,
        role: auth.session!.role,
      },
      metrics: {
        totalUsers,
        totalAdvertisers,
        activeCampaigns,
        pendingModeration,
        pendingPayouts,
        flaggedFraud,
        totalAvailablePaise,
        totalEscrowPaise,
        systemStatus: 'ALL_NODES_OPERATIONAL',
      },
      recentAuditLogs,
    })
  );
}
