import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;

  const [user, wallet, recentTasks, activeCampaignsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        kycTier: true,
        kycStatus: true,
        upiId: true,
      },
    }),
    prisma.wallet.findUnique({
      where: { userId },
    }),
    prisma.userTask.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: {
            title: true,
            actionType: true,
            category: true,
            organization: {
              select: { name: true },
            },
          },
        },
      },
    }),
    prisma.campaign.count({
      where: { status: 'ACTIVE' },
    }),
  ]);

  if (!user || !wallet) {
    return NextResponse.json({ error: 'User wallet not found.' }, { status: 404 });
  }

  return NextResponse.json({
    user,
    metrics: {
      availableBalancePaise: wallet.availablePaise,
      pendingBalancePaise: wallet.pendingPaise,
      lifetimeEarnedPaise: wallet.lifetimeEarnedPaise,
      lifetimePaidPaise: wallet.lifetimePaidPaise,
      activeCampaignsAvailable: activeCampaignsCount,
    },
    recentTasks,
  });
}
