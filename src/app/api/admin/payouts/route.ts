import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminPermission, requireRole } from '@/lib/rbac';
import { getPayoutAdapter } from '@/lib/payout-adapter';
import { recordAuditLog } from '@/lib/audit';
import { FinancialLedger } from '@/lib/ledger';
import { serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['ADMIN', 'SUPER_ADMIN']);
  if (!auth.authorized) {
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
    if (p.status === 'PROCESSING' || p.status === 'REQUESTED' || p.status === 'RECONCILIATION_PENDING') {
      pendingQueuePaise += p.amountPaise;
    }
  }

  return NextResponse.json(
    serializeBigInts({
      payouts,
      nodalPoolSummary: {
        clearingStatus: 'LIVE_RESERVE_100_PERCENT',
        nodalBank: 'HDFC Bank Ltd. (Nodal Settlement Account)',
        totalDisbursedPaise,
        pendingQueuePaise,
        activeBatchCount: payouts.filter((p) => p.status === 'REQUESTED' || p.status === 'PROCESSING').length,
      },
    })
  );
}

export async function POST(req: NextRequest) {
  const auth = requireAdminPermission(req, 'payouts.approve');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { payoutId, action } = await req.json(); // action: 'APPROVE_BATCH' or 'REJECT'

  const payout = await prisma.payoutRequest.findUnique({
    where: { id: payoutId },
    include: { user: true },
  });

  if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 });

  if (action === 'APPROVE_BATCH') {
    if (payout.status === 'CLEARED') {
      return NextResponse.json({ error: 'Payout has already been cleared.' }, { status: 400 });
    }
    if (payout.status === 'FAILED' || payout.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot clear a payout that is in a failed/cancelled terminal state.' }, { status: 400 });
    }

    const adapter = getPayoutAdapter();
    const result = await adapter.initiatePayout({
      payoutId: payout.id,
      amountPaise: payout.amountPaise,
      destinationAddress: payout.destinationAddress,
      destinationType: payout.method === 'BANK_ACCOUNT' ? 'BANK_ACCOUNT' : 'UPI',
      name: payout.user.name,
    });

    const updated = await prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: result.status,
        utrNumber: result.utrNumber,
        clearedAt: result.status === 'CLEARED' ? new Date() : null,
        approvedByUserId: auth.session!.userId,
      },
    });

    await recordAuditLog({
      actorId: auth.session!.userId,
      actorRole: 'ADMIN',
      action: 'ADMIN_CLEARED_PAYOUT_BATCH',
      entityType: 'PayoutRequest',
      entityId: payoutId,
      newState: { utrNumber: result.utrNumber, status: result.status },
    });

    return NextResponse.json(serializeBigInts({ success: true, payout: updated }));
  }

  if (action === 'REJECT') {
    // Terminal state protection: prevent double reversal
    if (payout.status === 'CLEARED' || payout.status === 'FAILED' || payout.status === 'CANCELLED') {
      return NextResponse.json({
        error: `Cannot reject payout: already in terminal state (${payout.status}).`,
      }, { status: 400 });
    }

    const db: any = prisma;

    // Use conditional update to guarantee at most one effective reversal under concurrent requests
    const updateResult = await db.payoutRequest.updateMany({
      where: {
        id: payoutId,
        status: { in: ['REQUESTED', 'PROCESSING', 'RECONCILIATION_PENDING'] },
      },
      data: {
        status: 'FAILED',
        failureReason: 'Rejected by compliance administrator during dual-approval audit.',
        approvedByUserId: auth.session!.userId,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json({
        error: 'Payout state was concurrently transitioned by another administrative action.',
      }, { status: 409 });
    }

    // Find user's wallet and execute exactly one compensating reversal
    const userWallet = await db.wallet.findUnique({ where: { userId: payout.userId } });
    if (userWallet) {
      await FinancialLedger.postTransaction({
        walletId: userWallet.id,
        referenceId: `ADMIN-REJ-${payout.id}`,
        type: 'PAYOUT_REVERSAL',
        amountPaise: payout.amountPaise,
        idempotencyKey: `ADMIN-REVERSAL-${payout.id}`,
        reason: 'Compliance administrator rejected payout request. Funds restored to available balance.',
        actorId: auth.session!.userId,
      });
    }

    const updated = await db.payoutRequest.findUnique({ where: { id: payoutId } });

    await recordAuditLog({
      actorId: auth.session!.userId,
      actorRole: 'ADMIN',
      action: 'ADMIN_REJECTED_PAYOUT_REVERSED',
      entityType: 'PayoutRequest',
      entityId: payoutId,
      newState: { status: 'FAILED', reason: 'Admin rejected' },
    });

    return NextResponse.json(
      serializeBigInts({
        success: true,
        payout: updated,
        message: 'Payout rejected and creator wallet funds restored.',
      })
    );
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
