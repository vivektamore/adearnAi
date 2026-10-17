import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { FinancialLedger } from '@/lib/ledger';
import { getPayoutAdapter } from '@/lib/payout-adapter';
import { recordAuditLog } from '@/lib/audit';

const MIN_WITHDRAWAL_PAISE = BigInt(process.env.MIN_WITHDRAWAL_THRESHOLD_PAISE || 10000); // ₹100.00

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;

  const [wallet, user, payoutRequests] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { upiId: true, bankAccountNumber: true, bankIfsc: true, kycTier: true },
    }),
    prisma.payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    wallet,
    user,
    minThresholdPaise: MIN_WITHDRAWAL_PAISE,
    payoutRequests,
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const body = await req.json();
  const { amountRupees, upiId } = body;

  if (!amountRupees || amountRupees <= 0) {
    return NextResponse.json({ error: 'Please enter a valid withdrawal amount.' }, { status: 400 });
  }

  const amountPaise = BigInt(Math.round(amountRupees * 100));

  if (amountPaise < MIN_WITHDRAWAL_PAISE) {
    return NextResponse.json({
      error: `Minimum withdrawal threshold is ₹100.00.`,
    }, { status: 400 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found.' }, { status: 404 });
  }

  if (wallet.availablePaise < amountPaise) {
    return NextResponse.json({
      error: `Insufficient available funds. Available: ₹${(Number(wallet.availablePaise) / 100).toFixed(2)}`,
    }, { status: 400 });
  }

  const destination = upiId || (await prisma.user.findUnique({ where: { id: userId } }))?.upiId;
  if (!destination) {
    return NextResponse.json({ error: 'A verified UPI ID or Bank account destination is required.' }, { status: 400 });
  }

  // Mask destination (e.g. ar**@okaxis)
  const [handle, vpa] = destination.split('@');
  const maskedAddress = handle.length > 2 ? `${handle.slice(0, 2)}**@${vpa}` : `**@${vpa}`;

  const idempotencyKey = `WITHDRAWAL-${userId}-${Date.now()}`;

  // 1. Debit wallet ledger atomically
  await FinancialLedger.postTransaction({
    walletId: wallet.id,
    referenceId: idempotencyKey,
    type: 'DEBIT_WITHDRAWAL',
    amountPaise,
    idempotencyKey,
    reason: `Voluntary payout withdrawal request to ${maskedAddress}`,
    actorId: userId,
  });

  // 2. Create Payout Request record
  const payout = await prisma.payoutRequest.create({
    data: {
      userId,
      amountPaise,
      method: 'UPI',
      destinationAddress: destination,
      maskedAddress,
      status: 'PROCESSING',
      idempotencyKey,
    },
  });

  // 3. Initiate via Payout Adapter
  const adapter = getPayoutAdapter();
  const adapterResult = await adapter.initiatePayout({
    payoutId: payout.id,
    amountPaise,
    destinationAddress: destination,
    destinationType: 'UPI',
    name: auth.session!.name,
  });

  // 4. Update status with clearing reference
  const updatedPayout = await prisma.payoutRequest.update({
    where: { id: payout.id },
    data: {
      status: adapterResult.status,
      utrNumber: adapterResult.utrNumber,
      clearedAt: adapterResult.status === 'CLEARED' ? new Date() : null,
      failureReason: adapterResult.failureReason || null,
    },
  });

  await recordAuditLog({
    actorId: userId,
    actorRole: auth.session!.role,
    action: 'WITHDRAWAL_REQUEST_DISBURSED',
    entityType: 'PayoutRequest',
    entityId: payout.id,
    newState: { utrNumber: adapterResult.utrNumber, status: adapterResult.status },
  });

  return NextResponse.json({
    success: true,
    payout: updatedPayout,
    message: `Withdrawal of ₹${amountRupees.toFixed(2)} processed successfully via Indian UPI Nodal Pool.`,
  });
}
