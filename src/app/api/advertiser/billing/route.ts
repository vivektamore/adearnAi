import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { FinancialLedger } from '@/lib/ledger';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
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
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const [org, wallet, transactions] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.wallet.findUnique({ where: { organizationId: orgId } }),
    prisma.ledgerTransaction.findMany({
      where: { wallet: { organizationId: orgId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  // Derive genuine tax settlement receipts from real top-up ledger transactions
  const topUpTxs = transactions.filter((t) => t.type === 'ADVERTISER_TOPUP');
  const invoices = topUpTxs.map((t, idx) => {
    const basePaise = (t.amountPaise * BigInt(100)) / BigInt(118);
    const gstPaise = t.amountPaise - basePaise;
    return {
      id: `INV-${t.referenceId ? t.referenceId.slice(0, 16) : `TX${idx + 1001}`}`,
      date: new Date(t.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      period: t.reason || 'Nodal Escrow Pool Deposit',
      amountPaise: t.amountPaise.toString(),
      basePaise: basePaise.toString(),
      gstPaise: gstPaise.toString(),
      status: 'PAID',
      paymentMode: t.referenceId?.startsWith('RTGS') ? 'HDFC RTGS Nodal Clearing' : 'UPI / NetBanking Nodal Pool',
    };
  });

  return NextResponse.json({
    organization: org,
    wallet,
    transactions,
    invoices,
  });
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

  const { amountRupees, utrNumber } = await req.json();
  if (!amountRupees || amountRupees <= 0) {
    return NextResponse.json({ error: 'Invalid top-up amount' }, { status: 400 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { organizationId: orgId } });
  if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

  const amountPaise = BigInt(Math.round(amountRupees * 100));
  const idempotencyKey = `TOPUP-${orgId}-${Date.now()}`;

  await FinancialLedger.postTransaction({
    walletId: wallet.id,
    referenceId: utrNumber || `RTGS-${Date.now()}`,
    type: 'ADVERTISER_TOPUP',
    amountPaise,
    idempotencyKey,
    reason: `Nodal Escrow Pool Top-Up via RTGS/UPI (UTR: ${utrNumber || 'SIMULATED-RTGS'})`,
    actorId: auth.session!.userId,
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: auth.session!.role,
    action: 'ADVERTISER_ESCROW_TOPUP',
    entityType: 'Wallet',
    entityId: wallet.id,
    newState: { amountRupees, utrNumber },
  });

  return NextResponse.json({
    success: true,
    message: `₹${amountRupees.toFixed(2)} successfully credited to your RBI-Compliant Nodal Escrow Reserve.`,
  });
}
