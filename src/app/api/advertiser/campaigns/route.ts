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
    return NextResponse.json({ campaigns: [] });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: { creativeAssets: true },
  });

  return NextResponse.json({ campaigns });
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
    return NextResponse.json({ error: 'Advertiser organization not associated.' }, { status: 400 });
  }

  const body = await req.json();
  const {
    title,
    description,
    category = 'FinTech',
    actionType = 'SURVEY',
    targetUrl,
    budgetAllocatedRupees,
    costPerOutcomeRupees,
    targetOutcomes,
    assetUrl,
  } = body;

  if (!title || !description || !targetUrl || !budgetAllocatedRupees || !costPerOutcomeRupees) {
    return NextResponse.json({ error: 'Missing mandatory campaign creation fields.' }, { status: 400 });
  }

  const budgetAllocatedPaise = BigInt(Math.round(budgetAllocatedRupees * 100));
  const costPerOutcomePaise = BigInt(Math.round(costPerOutcomeRupees * 100));

  // Verify advertiser has sufficient escrow funds
  const wallet = await prisma.wallet.findUnique({
    where: { organizationId: orgId },
  });

  if (!wallet) {
    return NextResponse.json({ error: 'Organization escrow wallet not found.' }, { status: 404 });
  }

  if (wallet.escrowPaise < budgetAllocatedPaise) {
    return NextResponse.json({
      error: `Insufficient unreserved escrow pool balance. Required: ₹${budgetAllocatedRupees.toFixed(2)}, Available Escrow: ₹${(Number(wallet.escrowPaise) / 100).toFixed(2)}. Please top-up escrow before campaign submission.`,
    }, { status: 400 });
  }

  // Deduct from unreserved escrow balance and lock into campaign
  const idempotencyKey = `ESCROW-LOCK-CAMP-${Date.now()}`;
  await FinancialLedger.postTransaction({
    walletId: wallet.id,
    referenceId: idempotencyKey,
    type: 'ESCROW_LOCK',
    amountPaise: budgetAllocatedPaise,
    idempotencyKey,
    reason: `Escrow budget reservation for campaign: ${title}`,
    actorId: auth.session!.userId,
  });

  // Create Campaign in ACTIVE status (or IN_REVIEW if strict moderation enabled)
  const campaign = await prisma.campaign.create({
    data: {
      organizationId: orgId,
      title,
      description,
      category,
      actionType,
      status: 'ACTIVE',
      targetUrl,
      budgetAllocatedPaise,
      budgetSpentPaise: BigInt(0),
      costPerOutcomePaise,
      targetOutcomes: targetOutcomes ? parseInt(targetOutcomes, 10) : 1000,
      verifiedOutcomes: 0,
      flightStart: new Date(),
      flightEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      creativeAssets: {
        create: {
          assetUrl: assetUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
          assetType: 'IMAGE',
          status: 'APPROVED',
        },
      },
    },
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: auth.session!.role,
    action: 'CAMPAIGN_CREATED_AND_FUNDED',
    entityType: 'Campaign',
    entityId: campaign.id,
    newState: { title, budgetAllocatedRupees },
  });

  return NextResponse.json({
    success: true,
    campaign,
    message: 'Campaign created successfully with locked escrow reserve. Live telemetry activated.',
  });
}
