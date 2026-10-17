import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({
      authenticated: false,
      message: 'No active AdEarn AI browser session found. Please sign in via the web platform.',
    });
  }

  const [user, wallet, eligibleCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, kycTier: true },
    }),
    prisma.wallet.findUnique({
      where: { userId: session.userId },
      select: { availablePaise: true, pendingPaise: true },
    }),
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),
  ]);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      kycTier: user?.kycTier,
    },
    wallet: {
      availablePaise: wallet?.availablePaise || '0',
      pendingPaise: wallet?.pendingPaise || '0',
    },
    companionTelemetry: {
      activeAuditedNode: 'Node-IN-South-01',
      sessionStatus: 'ACTIVE_TELEMETRY_SYNCED',
      eligibleCampaignsCount: eligibleCount,
    },
  });
}
