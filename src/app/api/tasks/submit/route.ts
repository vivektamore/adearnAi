import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { evaluateTaskTelemetry, verifySessionToken, TelemetryPayload } from '@/lib/telemetry';
import { FinancialLedger } from '@/lib/ledger';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const sessionToken = body.sessionToken;
  const taskId = body.taskId;
  const telemetry = body.telemetry || {};

  const dwellTimeSeconds = Number(body.dwellTimeSeconds ?? telemetry.dwellSeconds ?? 35);
  const interactionCount = Number(body.interactionCount ?? telemetry.keyPresses ?? 12);
  const mouseEventsRecorded = Number(body.mouseEventsRecorded ?? telemetry.mouseMovements ?? 25);
  const scrollDepthPercent = Number(body.scrollDepthPercent ?? 80);
  const userResponses = body.userResponses || body.answers;

  let task = null;

  if (sessionToken) {
    const tokenData = verifySessionToken(sessionToken);
    if (!tokenData || tokenData.userId !== auth.session!.userId) {
      return NextResponse.json({ error: 'Invalid or forged task session token.' }, { status: 401 });
    }
    task = await prisma.userTask.findUnique({
      where: { sessionToken },
      include: {
        campaign: true,
        user: { include: { wallet: true } },
      },
    });
  } else if (taskId) {
    task = await prisma.userTask.findFirst({
      where: { id: taskId, userId: auth.session!.userId },
      include: {
        campaign: true,
        user: { include: { wallet: true } },
      },
    });
  }

  if (!task) {
    return NextResponse.json({ error: 'Valid sessionToken or taskId is required.' }, { status: 404 });
  }

  if (task.status === 'VALIDATED') {
    return NextResponse.json({ error: 'This task has already been completed and credited.' }, { status: 400 });
  }

  const telemetryPayload: TelemetryPayload = {
    sessionToken: task.sessionToken,
    dwellTimeSeconds: Number(dwellTimeSeconds),
    interactionCount: Number(interactionCount),
    mouseEventsRecorded: Number(mouseEventsRecorded),
    scrollDepthPercent: Number(scrollDepthPercent),
    viewportWidth: 1280,
    viewportHeight: 800,
    userResponses,
    timestamp: Date.now(),
  };

  const verdict = evaluateTaskTelemetry(telemetryPayload, 15);

  if (!verdict.isValid) {
    // Record rejection
    await prisma.userTask.update({
      where: { id: task.id },
      data: {
        status: 'REJECTED',
        anomalyScore: verdict.anomalyScore,
        fraudVerdict: 'FLAGGED',
        telemetryDigest: verdict.digest,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: false,
      status: 'REJECTED',
      reasons: verdict.reasons,
      message: 'Task submission failed verification heuristics.',
    }, { status: 422 });
  }

  // Update Task to VALIDATED
  await prisma.userTask.update({
    where: { id: task.id },
    data: {
      status: 'VALIDATED',
      anomalyScore: verdict.anomalyScore,
      fraudVerdict: 'CLEARED',
      telemetryDigest: verdict.digest,
      submittedAt: new Date(),
      validatedAt: new Date(),
    },
  });

  // Credit user wallet via Authoritative Financial Ledger
  const idempotencyKey = `REWARD-TASK-${task.id}`;
  await FinancialLedger.postTransaction({
    walletId: task.user.wallet!.id,
    referenceId: task.id,
    type: 'CREDIT_REWARD',
    amountPaise: task.rewardPaise,
    idempotencyKey,
    reason: `Reward credited for completing task: ${task.campaign.title}`,
    actorId: auth.session!.userId,
  });

  // Update campaign verified outcomes and budget spend
  await prisma.campaign.update({
    where: { id: task.campaignId },
    data: {
      verifiedOutcomes: { increment: 1 },
      budgetSpentPaise: { increment: task.rewardPaise },
    },
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: auth.session!.role,
    action: 'TASK_VALIDATED_REWARD_CREDITED',
    entityType: 'UserTask',
    entityId: task.id,
    newState: { rewardPaise: task.rewardPaise.toString() },
  });

  return NextResponse.json({
    success: true,
    status: 'VALIDATED',
    rewardPaise: task.rewardPaise,
    message: 'Task validated and approved. Reward credited to your available balance.',
  });
}
