import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { serializeBigInts } from '@/lib/money';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({
      authenticated: false,
      message: 'No active AdEarn AI browser session found. Please sign in via the extension or web platform.',
    });
  }

  const [user, wallet, eligibleCount, activePayout] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, kycTier: true },
    }),
    prisma.wallet.findUnique({
      where: { userId: session.userId },
      select: {
        availablePaise: true,
        pendingPaise: true,
        lifetimeEarnedPaise: true,
        lifetimePaidPaise: true,
      },
    }),
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    prisma.payoutRequest.findFirst({
      where: {
        userId: session.userId,
        status: { in: ['REQUESTED', 'PROCESSING', 'RECONCILIATION_PENDING'] },
      },
      select: { amountPaise: true, status: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json(
    serializeBigInts({
      authenticated: true,
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        kycTier: user?.kycTier,
        role: session.role,
      },
      wallet: {
        availablePaise: wallet?.availablePaise || '0',
        pendingPaise: wallet?.pendingPaise || '0',
        lifetimeEarnedPaise: wallet?.lifetimeEarnedPaise || '0',
        lifetimePaidPaise: wallet?.lifetimePaidPaise || '0',
        withdrawalInProgressPaise: activePayout?.amountPaise || '0',
        activePayoutStatus: activePayout?.status || null,
      },
      companionTelemetry: {
        activeAuditedNode: 'Node-IN-South-01',
        sessionStatus: 'ACTIVE_TELEMETRY_SYNCED',
        eligibleCampaignsCount: eligibleCount,
      },
    })
  );
}
