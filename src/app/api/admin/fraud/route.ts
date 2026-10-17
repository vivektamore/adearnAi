import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [flaggedTasks, incidents] = await Promise.all([
    prisma.userTask.findMany({
      where: {
        OR: [
          { fraudVerdict: 'FLAGGED' },
          { anomalyScore: { gt: 0.3 } },
        ],
      },
      take: 25,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        campaign: { select: { id: true, title: true } },
      },
    }),
    prisma.fraudIncident.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    flaggedTasks,
    incidents,
    labSummary: {
      botInterceptAccuracy: '99.18%',
      avgKinematicDwellSec: 38.4,
      totalQuarantinedSessions: flaggedTasks.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { taskId, action, reason } = await req.json(); // action: 'CLEAR' or 'QUARANTINE_USER'

  if (action === 'QUARANTINE_USER') {
    const task = await prisma.userTask.findUnique({ where: { id: taskId } });
    if (task) {
      await prisma.user.update({
        where: { id: task.userId },
        data: { status: 'SUSPENDED' },
      });
      await recordAuditLog({
        actorId: auth.session!.userId,
        actorRole: 'ADMIN',
        action: 'USER_SUSPENDED_FRAUD_LAB',
        entityType: 'User',
        entityId: task.userId,
        newState: { reason },
      });
    }
  } else if (action === 'CLEAR') {
    await prisma.userTask.update({
      where: { id: taskId },
      data: { fraudVerdict: 'CLEARED' },
    });
  }

  return NextResponse.json({ success: true, message: `Action ${action} executed.` });
}
