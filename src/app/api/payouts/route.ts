import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { FinancialLedger } from '@/lib/ledger';
import { getPayoutAdapter } from '@/lib/payout-adapter';
import { recordAuditLog } from '@/lib/audit';
import { parseRupeesToPaise, paiseToDecimalRupees, serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


const MIN_WITHDRAWAL_PAISE = BigInt(process.env.MIN_WITHDRAWAL_THRESHOLD_PAISE || 10000); // ₹100.00

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const db: any = prisma;

  const [wallet, user, payoutRequests, payoutMethods] = await Promise.all([
    db.wallet.findUnique({ where: { userId } }),
    db.user.findUnique({
      where: { id: userId },
      select: { upiId: true, bankAccountNumber: true, bankIfsc: true, kycTier: true },
    }),
    db.payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        payoutMethod: {
          select: {
            type: true,
            maskedAddress: true,
            bankName: true,
          },
        },
      },
    }),
    db.payoutMethod.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        type: true,
        accountHolderName: true,
        maskedAddress: true,
        bankName: true,
        ifscCode: true,
        status: true,
        isDefault: true,
      },
    }),
  ]);

  return NextResponse.json(
    serializeBigInts({
      wallet,
      user,
      minThresholdPaise: MIN_WITHDRAWAL_PAISE,
      payoutRequests,
      payoutMethods,
    })
  );
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const db: any = prisma;
  const body = await req.json();
  const { amountRupees, amountPaise: rawPaise, payoutMethodId, upiId, idempotencyKey: clientKey } = body;

  let amountPaise: bigint;
  try {
    if (rawPaise !== undefined && rawPaise !== null) {
      amountPaise = typeof rawPaise === 'bigint' ? rawPaise : BigInt(rawPaise);
      if (amountPaise <= 0n) throw new Error('Amount must be positive.');
    } else if (amountRupees !== undefined && amountRupees !== null) {
      amountPaise = parseRupeesToPaise(amountRupees);
    } else {
      return NextResponse.json({ error: 'Please enter a valid withdrawal amount in INR.' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid withdrawal amount format.' }, { status: 400 });
  }

  if (amountPaise < MIN_WITHDRAWAL_PAISE) {
    return NextResponse.json({
      error: `Minimum withdrawal threshold is ₹${paiseToDecimalRupees(MIN_WITHDRAWAL_PAISE)}.`,
    }, { status: 400 });
  }

  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    return NextResponse.json({ error: 'Authoritative wallet record not found.' }, { status: 404 });
  }

  if (wallet.availablePaise < amountPaise) {
    return NextResponse.json({
      error: `Insufficient available funds. Current Available: ₹${paiseToDecimalRupees(wallet.availablePaise)}`,
    }, { status: 400 });
  }

  // Authoritatively resolve payout destination
  let resolvedMethod: any = null;
  let destination = '';
  let destinationType: 'UPI' | 'BANK_ACCOUNT' = 'UPI';
  let maskedAddress = '';

  if (payoutMethodId) {
    resolvedMethod = await db.payoutMethod.findFirst({
      where: { id: payoutMethodId, userId, status: { not: 'REMOVED' } },
    });
    if (!resolvedMethod) {
      return NextResponse.json({ error: 'Selected payout destination is invalid or unverified.' }, { status: 400 });
    }
    destination = resolvedMethod.destinationAddress;
    destinationType = resolvedMethod.type;
    maskedAddress = resolvedMethod.maskedAddress;
  } else {
    // Fall back to default method or provided upiId or legacy user.upiId
    resolvedMethod = await db.payoutMethod.findFirst({
      where: { userId, isDefault: true, status: { not: 'REMOVED' } },
    });

    if (resolvedMethod) {
      destination = resolvedMethod.destinationAddress;
      destinationType = resolvedMethod.type;
      maskedAddress = resolvedMethod.maskedAddress;
    } else {
      const fallbackUpi = upiId || (await db.user.findUnique({ where: { id: userId } }))?.upiId;
      if (!fallbackUpi) {
        return NextResponse.json({ error: 'Please configure and select a payout destination (UPI ID or Bank Account).' }, { status: 400 });
      }
      destination = fallbackUpi;
      destinationType = 'UPI';
      const [handle, vpa] = destination.split('@');
      maskedAddress = handle && handle.length > 2 ? `${handle.slice(0, 2)}**@${vpa}` : `**@${vpa}`;
    }
  }

  // Idempotency resolution: support caller key or deterministic fallback
  const idempotencyKey = clientKey ? String(clientKey).trim() : `WITHDRAWAL-${userId}-${Date.now()}`;

  // Check if payout request already exists for this idempotency key
  const existingPayout = await db.payoutRequest.findUnique({
    where: { idempotencyKey },
  });
  if (existingPayout) {
    return NextResponse.json(
      serializeBigInts({
        success: true,
        duplicate: true,
        payout: existingPayout,
        message: 'Withdrawal instruction already received and processed.',
      })
    );
  }

  // Step 1: Atomic Debit & Payout Record Creation
  let payout: any = null;
  try {
    payout = await db.$transaction(async (tx: any) => {
      // 1. Double-entry Atomic Debit
      await FinancialLedger.postTransaction({
        walletId: wallet.id,
        referenceId: idempotencyKey,
        type: 'DEBIT_WITHDRAWAL',
        amountPaise,
        idempotencyKey,
        reason: `Voluntary withdrawal disbursement to ${maskedAddress}`,
        actorId: userId,
      });

      // 2. Create Payout Request in PROCESSING state with PENDING_DISPATCH outbox status
      return await tx.payoutRequest.create({
        data: {
          userId,
          payoutMethodId: resolvedMethod?.id || null,
          amountPaise,
          method: destinationType,
          destinationAddress: destination,
          maskedAddress,
          status: 'PROCESSING',
          outboxStatus: 'PENDING_DISPATCH',
          dispatchAttempts: 1,
          lastDispatchedAt: new Date(),
          idempotencyKey,
        },
      });
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'Unable to reserve withdrawal funds due to concurrency lock.',
    }, { status: 400 });
  }

  // Step 2: External Dispatch Outside Database Transaction
  const adapter = getPayoutAdapter();
  let adapterResult: any = null;
  let dispatchError: any = null;

  try {
    adapterResult = await adapter.initiatePayout({
      payoutId: payout.id,
      amountPaise,
      destinationAddress: destination,
      destinationType,
      name: auth.session!.name,
    });
  } catch (err: any) {
    dispatchError = err;
  }

  // Step 3: Handle Dispatch Outcome
  // Case A: Network Timeout or Unhandled Dispatch Error -> Mark RECONCILIATION_PENDING (No premature refund!)
  if (dispatchError || !adapterResult || adapterResult.status === 'PROCESSING') {
    const pendingPayout = await db.payoutRequest.update({
      where: { id: payout.id },
      data: {
        status: 'RECONCILIATION_PENDING',
        outboxStatus: 'RETRY_RECONCILIATION',
        failureReason: dispatchError?.message || 'Banking gateway acknowledgement pending.',
      },
    });

    await recordAuditLog({
      actorId: userId,
      actorRole: auth.session!.role,
      action: 'WITHDRAWAL_DISPATCH_TIMEOUT_HELD',
      entityType: 'PayoutRequest',
      entityId: payout.id,
      newState: { status: 'RECONCILIATION_PENDING', outboxStatus: 'RETRY_RECONCILIATION' },
    });

    return NextResponse.json(
      serializeBigInts({
        success: true,
        status: 'RECONCILIATION_PENDING',
        payout: pendingPayout,
        message: 'Withdrawal is currently being reconciled with banking gateway. Funds remain safeguarded.',
      }),
      { status: 202 }
    );
  }

  // Case B: Definitive Failure from Provider -> Atomic Compensating Reversal
  if (adapterResult.status === 'FAILED') {
    const reversalKey = `REVERSAL-${payout.id}`;
    await FinancialLedger.postTransaction({
      walletId: wallet.id,
      referenceId: `REV-${payout.id}`,
      type: 'PAYOUT_REVERSAL',
      amountPaise,
      idempotencyKey: reversalKey,
      reason: `Compensating reversal for rejected payout: ${adapterResult.failureReason || 'Provider rejected transfer'}`,
      actorId: 'SYSTEM',
    });

    const failedPayout = await db.payoutRequest.update({
      where: { id: payout.id },
      data: {
        status: 'FAILED',
        outboxStatus: 'TERMINAL_FAILED',
        failureReason: adapterResult.failureReason || 'Banking network clearing rejected transaction.',
      },
    });

    await recordAuditLog({
      actorId: userId,
      actorRole: auth.session!.role,
      action: 'WITHDRAWAL_FAILED_AND_REVERSED',
      entityType: 'PayoutRequest',
      entityId: payout.id,
      newState: { status: 'FAILED', failureReason: adapterResult.failureReason, reversedPaise: amountPaise.toString() },
    });

    return NextResponse.json(
      serializeBigInts({
        success: false,
        error: `Payout disbursement failed: ${adapterResult.failureReason || 'Bank transfer failed'}. Your wallet balance has been restored.`,
        payout: failedPayout,
      }),
      { status: 422 }
    );
  }

  // Case C: Authoritative Settlement (CLEARED)
  const clearedPayout = await db.payoutRequest.update({
    where: { id: payout.id },
    data: {
      status: 'CLEARED',
      outboxStatus: 'COMPLETED',
      utrNumber: adapterResult.utrNumber,
      clearedAt: new Date(),
      failureReason: null,
    },
  });

  await recordAuditLog({
    actorId: userId,
    actorRole: auth.session!.role,
    action: 'WITHDRAWAL_REQUEST_DISBURSED',
    entityType: 'PayoutRequest',
    entityId: payout.id,
    newState: { utrNumber: adapterResult.utrNumber, status: 'CLEARED', maskedAddress },
  });

  return NextResponse.json(
    serializeBigInts({
      success: true,
      payout: clearedPayout,
      message: `Withdrawal of ₹${paiseToDecimalRupees(amountPaise)} processed successfully via Indian RBI Nodal Pool (UTR: ${adapterResult.utrNumber}).`,
    })
  );
}
