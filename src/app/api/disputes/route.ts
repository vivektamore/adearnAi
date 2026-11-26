import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const disputes = await prisma.dispute.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ disputes });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const { subject, description, userTaskId, payoutRequestId, evidenceUrl } = await req.json();

  if (!subject || !description) {
    return NextResponse.json({ error: 'Subject and detailed description are required.' }, { status: 400 });
  }

  // IDOR Defense: If userTaskId is provided, verify it belongs to caller
  if (userTaskId) {
    const task = await prisma.userTask.findUnique({
      where: { id: userTaskId },
      select: { userId: true },
    });
    if (!task) {
      return NextResponse.json({ error: 'Referenced user task not found.' }, { status: 404 });
    }
    if (task.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden. Cannot file dispute referencing another user’s task.' },
        { status: 403 }
      );
    }
  }

  // IDOR Defense: If payoutRequestId is provided, verify it belongs to caller
  if (payoutRequestId) {
    const payout = await prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      select: { userId: true },
    });
    if (!payout) {
      return NextResponse.json({ error: 'Referenced payout request not found.' }, { status: 404 });
    }
    if (payout.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden. Cannot file dispute referencing another user’s payout request.' },
        { status: 403 }
      );
    }
  }

  const dispute = await prisma.dispute.create({
    data: {
      userId,
      subject,
      description,
      userTaskId: userTaskId || null,
      payoutRequestId: payoutRequestId || null,
      evidenceUrlsJson: evidenceUrl ? JSON.stringify([evidenceUrl]) : null,
      status: 'OPEN',
    },
  });

  await recordAuditLog({
    actorId: userId,
    actorRole: auth.session!.role,
    action: 'DISPUTE_FILED',
    entityType: 'Dispute',
    entityId: dispute.id,
  });

  return NextResponse.json({
    success: true,
    dispute,
    message: 'Your dispute has been submitted to the compliance operations desk. Ticket ID: #' + dispute.id.slice(-6).toUpperCase(),
  });
}
