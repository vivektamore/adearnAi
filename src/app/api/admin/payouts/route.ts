import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getPayoutAdapter } from '@/lib/payout-adapter';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const payouts = await prisma.payoutRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true, upiId: true, kycTier: true } },
    },
  });

  let totalDisbursedPaise = BigInt(0);
  let pendingQueuePaise = BigInt(0);

  for (const p of payouts) {
    if (p.status === 'CLEARED') totalDisbursedPaise += p.amountPaise;
    if (p.status === 'PROCESSING' || p.status === 'REQUESTED') pendingQueuePaise += p.amountPaise;
  }

  return NextResponse.json({
    payouts,
    nodalPoolSummary: {
      clearingStatus: 'LIVE_RESERVE_100_PERCENT',
      nodalBank: 'HDFC Bank Ltd. (Nodal Settlement Account)',
      totalDisbursedPaise,
      pendingQueuePaise,
      activeBatchCount: payouts.filter((p) => p.status === 'REQUESTED').length,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { payoutId, action } = await req.json(); // action: 'APPROVE_BATCH' or 'REJECT'

  const payout = await prisma.payoutRequest.findUnique({
    where: { id: payoutId },
    include: { user: true },
  });

  if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 });

  if (action === 'APPROVE_BATCH') {
    const adapter = getPayoutAdapter();
    const result = await adapter.initiatePayout({
      payoutId: payout.id,
      amountPaise: payout.amountPaise,
      destinationAddress: payout.destinationAddress,
      destinationType: 'UPI',
      name: payout.user.name,
    });

    const updated = await prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: result.status,
        utrNumber: result.utrNumber,
        clearedAt: new Date(),
        approvedByUserId: auth.session!.userId,
      },
    });

    await recordAuditLog({
      actorId: auth.session!.userId,
      actorRole: 'ADMIN',
      action: 'ADMIN_CLEARED_PAYOUT_BATCH',
      entityType: 'PayoutRequest',
      entityId: payoutId,
      newState: { utrNumber: result.utrNumber },
    });

    return NextResponse.json({ success: true, payout: updated });
  }

  return NextResponse.json({ success: true });
}
