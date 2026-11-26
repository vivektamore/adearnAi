import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { FinancialLedger } from '@/lib/ledger';
import { recordAuditLog } from '@/lib/audit';
import { parseRupeesToPaise, paiseToDecimalRupees, serializeBigInts } from '@/lib/money';

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
    return NextResponse.json({ campaigns: [] });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: { creativeAssets: true },
  });

  return NextResponse.json(serializeBigInts({ campaigns }));
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: 'Advertiser organization not associated.' }, { status: 400 });
  }

  const body = await req.json();
  const {
    title,
    description,
    category = 'FinTech',
    actionType = 'SURVEY',
    pricingModel = 'CPO',
    targetUrl,
    budgetAllocatedRupees,
    costPerOutcomeRupees,
    cpmRateRupees,
    creatorImpressionRewardRupees,
    cpcRateRupees,
    creatorClickRewardRupees,
    dailyBudgetCapRupees,
    rewardsEnabled = true,
    minKycTier = 'TIER_0',
    budgetAllocatedPaise: rawBudgetPaise,
    costPerOutcomePaise: rawCpoPaise,
    cpmRatePaise: rawCpmPaise,
    targetOutcomes,
    assetUrl,
    idempotencyKey: clientKey,
  } = body;

  if (!title || !description || !targetUrl) {
    return NextResponse.json({ error: 'Missing mandatory campaign creation fields.' }, { status: 400 });
  }

  let budgetAllocatedPaise: bigint;
  let costPerOutcomePaise: bigint = BigInt(500); // Default ₹5.00 minimum
  let cpmRatePaise: bigint = BigInt(0);
  let creatorImpressionRewardPaise: bigint = BigInt(0);
  let cpcRatePaise: bigint = BigInt(0);
  let creatorClickRewardPaise: bigint = BigInt(0);
  let dailyBudgetCapPaise: bigint = BigInt(0);

  try {
    if (rawBudgetPaise !== undefined && rawBudgetPaise !== null) {
      budgetAllocatedPaise = typeof rawBudgetPaise === 'bigint' ? rawBudgetPaise : BigInt(rawBudgetPaise);
    } else if (budgetAllocatedRupees !== undefined && budgetAllocatedRupees !== null) {
      budgetAllocatedPaise = parseRupeesToPaise(budgetAllocatedRupees);
    } else {
      return NextResponse.json({ error: 'Budget allocated amount is required.' }, { status: 400 });
    }

    if (pricingModel === 'CPM') {
      if (rawCpmPaise !== undefined && rawCpmPaise !== null) {
        cpmRatePaise = typeof rawCpmPaise === 'bigint' ? rawCpmPaise : BigInt(rawCpmPaise);
      } else if (cpmRateRupees !== undefined && cpmRateRupees !== null) {
        cpmRatePaise = parseRupeesToPaise(cpmRateRupees);
      } else {
        cpmRatePaise = BigInt(5000); // ₹50.00 CPM default
      }

      if (creatorImpressionRewardRupees !== undefined && creatorImpressionRewardRupees !== null) {
        creatorImpressionRewardPaise = parseRupeesToPaise(creatorImpressionRewardRupees);
      } else {
        creatorImpressionRewardPaise = cpmRatePaise / BigInt(2);
      }
      costPerOutcomePaise = cpmRatePaise / BigInt(1000);
      if (costPerOutcomePaise < BigInt(1)) costPerOutcomePaise = BigInt(5);
    } else if (pricingModel === 'CPC') {
      if (cpcRateRupees !== undefined && cpcRateRupees !== null) {
        cpcRatePaise = parseRupeesToPaise(cpcRateRupees);
      } else {
        cpcRatePaise = BigInt(200); // ₹2.00 default
      }

      if (creatorClickRewardRupees !== undefined && creatorClickRewardRupees !== null) {
        creatorClickRewardPaise = parseRupeesToPaise(creatorClickRewardRupees);
      } else {
        creatorClickRewardPaise = cpcRatePaise / BigInt(2);
      }
      costPerOutcomePaise = cpcRatePaise;
    } else {
      // CPO pricing model
      if (rawCpoPaise !== undefined && rawCpoPaise !== null) {
        costPerOutcomePaise = typeof rawCpoPaise === 'bigint' ? rawCpoPaise : BigInt(rawCpoPaise);
      } else if (costPerOutcomeRupees !== undefined && costPerOutcomeRupees !== null) {
        costPerOutcomePaise = parseRupeesToPaise(costPerOutcomeRupees);
      } else {
        return NextResponse.json({ error: 'Cost per outcome amount is required.' }, { status: 400 });
      }

      if (costPerOutcomePaise < BigInt(500)) {
        return NextResponse.json({ error: 'Minimum cost per outcome is ₹5.00' }, { status: 400 });
      }
    }

    if (dailyBudgetCapRupees) {
      dailyBudgetCapPaise = parseRupeesToPaise(dailyBudgetCapRupees);
    }

    if (budgetAllocatedPaise < BigInt(100000)) {
      return NextResponse.json({ error: 'Minimum campaign budget is ₹1,000.00' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid budget format.' }, { status: 400 });
  }

  // Verify advertiser has sufficient escrow funds
  const wallet = await prisma.wallet.findUnique({
    where: { organizationId: orgId },
  });

  if (!wallet) {
    return NextResponse.json({ error: 'Organization escrow wallet not found.' }, { status: 404 });
  }

  if (wallet.escrowPaise < budgetAllocatedPaise) {
    return NextResponse.json({
      error: `Insufficient unreserved escrow pool balance. Required: ₹${paiseToDecimalRupees(budgetAllocatedPaise)}, Available Escrow: ₹${paiseToDecimalRupees(wallet.escrowPaise)}. Please top-up escrow before campaign submission.`,
    }, { status: 400 });
  }

  // Deduct from unreserved escrow balance and lock into campaign
  const idempotencyKey = clientKey ? String(clientKey).trim() : `ESCROW-LOCK-CAMP-${Date.now()}`;
  await FinancialLedger.postTransaction({
    walletId: wallet.id,
    referenceId: idempotencyKey,
    type: 'ESCROW_LOCK',
    amountPaise: budgetAllocatedPaise,
    idempotencyKey,
    reason: `Escrow budget reservation for campaign: ${title}`,
    actorId: auth.session!.userId,
  });

  // Build structured requirementsJson containing pricing & targeting configurations
  const requirementsJson = JSON.stringify({
    pricingModel: pricingModel || 'CPO',
    cpcRatePaise: cpcRatePaise ? cpcRatePaise.toString() : null,
    creatorClickRewardPaise: creatorClickRewardPaise ? creatorClickRewardPaise.toString() : null,
    dailyBudgetCapPaise: dailyBudgetCapPaise ? dailyBudgetCapPaise.toString() : null,
    rewardsEnabled: rewardsEnabled !== false,
    minKycTier: minKycTier || 'TIER_0',
    targetCategory: category || 'FinTech',
  });

  // Create Campaign in IN_REVIEW status (requires Admin moderation approval before live ad serving)
  const campaign = await prisma.campaign.create({
    data: {
      organizationId: orgId,
      title,
      description,
      category,
      actionType,
      pricingModel: pricingModel === 'CPM' ? 'CPM' : pricingModel === 'CPC' ? 'HYBRID' : 'CPO',
      status: 'IN_REVIEW',
      targetUrl,
      requirementsJson,
      budgetAllocatedPaise,
      budgetSpentPaise: BigInt(0),
      costPerOutcomePaise,
      cpmRatePaise,
      creatorImpressionRewardPaise,
      targetOutcomes: targetOutcomes ? parseInt(targetOutcomes, 10) : 1000,
      verifiedOutcomes: 0,
      flightStart: new Date(),
      flightEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      creativeAssets: {
        create: {
          assetUrl: assetUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
          assetType: 'IMAGE',
          status: 'PENDING',
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
    newState: { title, budgetAllocatedPaise: budgetAllocatedPaise.toString() },
  });

  return NextResponse.json(
    serializeBigInts({
      success: true,
      campaign,
      message: 'Campaign submitted successfully with locked escrow reserve. Waiting for admin compliance & moderation approval.',
    })
  );
}
