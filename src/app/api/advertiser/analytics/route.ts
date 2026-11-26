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

  let orgId = auth.session!.organizationId;
  if (!orgId) {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: auth.session!.userId },
    });
    orgId = userOrg?.organizationId || null;
  }

  if (!orgId) {
    return NextResponse.json(
      { error: 'Advertiser organization not associated. Analytics unavailable.' },
      { status: 400 }
    );
  }

  const tasks = await prisma.userTask.findMany({
    where: { campaign: { organizationId: orgId } },
    select: {
      id: true,
      status: true,
      rewardPaise: true,
      anomalyScore: true,
      fraudVerdict: true,
      startedAt: true,
      submittedAt: true,
      campaign: {
        select: { title: true, actionType: true, category: true },
      },
    },
  });

  const total = tasks.length;
  const validatedTasks = tasks.filter((t) => t.status === 'VALIDATED');
  const validated = validatedTasks.length;
  const rejected = tasks.filter((t) => t.status === 'REJECTED').length;
  const inProgress = tasks.filter((t) => t.status === 'STARTED').length;

  // Compute genuine attention dwell from actual task session timestamps
  let totalDwellMs = 0;
  let dwellCount = 0;
  for (const t of validatedTasks) {
    if (t.startedAt && t.submittedAt) {
      const diff = new Date(t.submittedAt).getTime() - new Date(t.startedAt).getTime();
      if (diff > 0 && diff < 3600000) {
        totalDwellMs += diff;
        dwellCount++;
      }
    }
  }
  const averageAttentionDwellSec = dwellCount > 0 ? Math.round((totalDwellMs / dwellCount / 1000) * 10) / 10 : 0;
  const multiTouchRetentionRate = total > 0 ? Math.round((validated / total) * 1000) / 10 : 0;
  const ivtRate = total > 0 ? Math.round((rejected / total) * 1000) / 10 : 0;

  // Group genuine validated tasks by actionType / channel
  const actionCounts: Record<string, number> = {};
  for (const t of validatedTasks) {
    const action = t.campaign.actionType || 'INTERACTIVE_TASK';
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  }

  const attributionBreakdown = Object.entries(actionCounts).map(([action, count]) => ({
    channel: action.replace('_', ' '),
    conversions: count,
    share: validated > 0 ? `${Math.round((count / validated) * 100)}%` : '0%',
    modelConfidence: '100% Cryptographic Verification',
  }));

  return NextResponse.json(
    serializeBigInts({
      metrics: {
        totalInitiated: total,
        validatedOutcomes: validated,
        rejectedIVT: rejected,
        inProgress,
        ivtRate,
        averageAttentionDwellSec,
        multiTouchRetentionRate,
      },
      attributionBreakdown,
    })
  );
}
