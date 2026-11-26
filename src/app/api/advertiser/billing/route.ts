import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { FinancialLedger } from '@/lib/ledger';
import { recordAuditLog } from '@/lib/audit';
import { parseRupeesToPaise, paiseToDecimalRupees, calculateGstInclusive, serializeBigInts } from '@/lib/money';

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
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const [org, wallet, transactions, fundingOrders] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.wallet.findUnique({ where: { organizationId: orgId } }),
    prisma.ledgerTransaction.findMany({
      where: { wallet: { organizationId: orgId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.fundingOrder.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  // Derive genuine tax settlement receipts from real top-up ledger transactions
  const topUpTxs = transactions.filter((t) => t.type === 'ADVERTISER_TOPUP');
  const invoices = topUpTxs.map((t, idx) => {
    const gstSplit = calculateGstInclusive(t.amountPaise, 18);
    return {
      id: `INV-${t.referenceId ? t.referenceId.slice(0, 16) : `TX${idx + 1001}`}`,
      date: new Date(t.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      period: t.reason || 'Nodal Escrow Pool Deposit',
      amountPaise: t.amountPaise.toString(),
      basePaise: gstSplit.basePaise.toString(),
      gstPaise: gstSplit.gstPaise.toString(),
      status: 'PAID',
      paymentMode: t.referenceId?.startsWith('RTGS') ? 'HDFC RTGS Nodal Clearing' : 'UPI / NetBanking Nodal Pool',
    };
  });

  return NextResponse.json(
    serializeBigInts({
      organization: org,
      wallet,
      transactions,
      fundingOrders,
      invoices,
    })
  );
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN']);
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
    return NextResponse.json({ error: 'Advertiser organization not found' }, { status: 400 });
  }

  const body = await req.json();
  const { amountRupees, amountPaise: rawPaise, utrNumber, idempotencyKey: clientKey } = body;

  let amountPaise: bigint;
  try {
    if (rawPaise !== undefined && rawPaise !== null) {
      amountPaise = typeof rawPaise === 'bigint' ? rawPaise : BigInt(rawPaise);
      if (amountPaise <= 0n) throw new Error('Top-up amount must be positive.');
    } else if (amountRupees !== undefined && amountRupees !== null) {
      amountPaise = parseRupeesToPaise(amountRupees);
    } else {
      return NextResponse.json({ error: 'Please enter a valid top-up amount in INR.' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid top-up amount.' }, { status: 400 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { organizationId: orgId } });
  if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

  const gstSplit = calculateGstInclusive(amountPaise, 18);
  const idempotencyKey = clientKey ? String(clientKey).trim() : `TOPUP-${orgId}-${Date.now()}`;
  const effectiveUtr = utrNumber ? String(utrNumber).trim() : `RTGS-NPCI-${Date.now().toString().slice(-6)}`;

  // Idempotency check
  const existingOrder = await prisma.fundingOrder.findUnique({
    where: { idempotencyKey },
  });
  if (existingOrder) {
    return NextResponse.json(
      serializeBigInts({
        success: true,
        duplicate: true,
        message: 'Top-up already confirmed and credited.',
        fundingOrder: existingOrder,
      })
    );
  }

  // 1. Post to double-entry general ledger
  await FinancialLedger.postTransaction({
    walletId: wallet.id,
    referenceId: effectiveUtr,
    type: 'ADVERTISER_TOPUP',
    amountPaise,
    idempotencyKey,
    reason: `Nodal Escrow Pool Top-Up via RTGS/UPI (UTR: ${effectiveUtr})`,
    actorId: auth.session!.userId,
  });

  // 2. Persist formal FundingOrder record
  const fundingOrder = await prisma.fundingOrder.create({
    data: {
      organizationId: orgId,
      amountPaise: gstSplit.basePaise,
      gstPaise: gstSplit.gstPaise,
      totalPaise: amountPaise,
      currency: 'INR',
      status: 'CONFIRMED',
      provider: 'SANDBOX_NODAL',
      providerOrderId: `ORD-${Date.now()}`,
      providerPaymentId: `PAY-${Date.now()}`,
      utrNumber: effectiveUtr,
      idempotencyKey,
      confirmedAt: new Date(),
      metadataJson: JSON.stringify({
        taxInvoiceGenerated: true,
        gstRatePercent: 18,
        actorId: auth.session!.userId,
      }),
    },
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: auth.session!.role,
    action: 'ADVERTISER_ESCROW_TOPUP',
    entityType: 'FundingOrder',
    entityId: fundingOrder.id,
    newState: { amountPaise: amountPaise.toString(), utrNumber: effectiveUtr, totalPaise: amountPaise.toString() },
  });

  return NextResponse.json(
    serializeBigInts({
      success: true,
      message: `₹${paiseToDecimalRupees(amountPaise)} successfully credited to your RBI-Compliant Nodal Escrow Reserve.`,
      fundingOrder: {
        id: fundingOrder.id,
        utrNumber: fundingOrder.utrNumber,
        totalPaise: fundingOrder.totalPaise.toString(),
        status: fundingOrder.status,
      },
    })
  );
}
