import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { DoubleEntryLedger, SYSTEM_ACCOUNTS, JournalEntrySpec } from '@/lib/double-entry';
import { recordAuditLog } from '@/lib/audit';

const TELEMETRY_SIGNING_KEY = process.env.TELEMETRY_SIGNING_KEY || 'telemetry-integrity-key-adearn-ai-prod-2026';

export interface ImpressionTokenPayload {
  campaignId: string;
  creativeAssetId: string | null;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  expectedDwellMinSeconds: number;
  pricingModel: 'CPO' | 'CPM' | 'CPC' | 'HYBRID';
  rewardPaise: string; // string representation of BigInt
  chargePaise: string; // string representation of BigInt
}

export interface ClickTokenPayload {
  campaignId: string;
  creativeAssetId: string | null;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  pricingModel: 'CPO' | 'CPM' | 'CPC' | 'HYBRID';
  cpcChargePaise: string;
  creatorRewardPaise: string;
}

/**
 * Generates an HMAC-SHA256 signed, short-lived click token (120-second TTL).
 */
export function generateClickToken(payload: Omit<ClickTokenPayload, 'issuedAt' | 'expiresAt'>, ttlSeconds: number = 120): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: ClickTokenPayload = {
    ...payload,
    issuedAt: now,
    expiresAt: now + ttlSeconds,
  };

  const dataStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', TELEMETRY_SIGNING_KEY).update(dataStr).digest('base64url');
  return `${dataStr}.${hmac}`;
}

/**
 * Cryptographically verifies a click token and returns its payload if valid and unexpired.
 */
export function verifyClickToken(token: string): ClickTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [dataStr, receivedHmac] = parts;

    const expectedHmac = crypto.createHmac('sha256', TELEMETRY_SIGNING_KEY).update(dataStr).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
      return null;
    }

    const payloadJson = Buffer.from(dataStr, 'base64url').toString('utf-8');
    const payload: ClickTokenPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (now > payload.expiresAt || now < payload.issuedAt - 5) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Generates an HMAC-SHA256 signed, short-lived impression token (60-second TTL).
 */
export function generateImpressionToken(payload: Omit<ImpressionTokenPayload, 'issuedAt' | 'expiresAt'>, ttlSeconds: number = 60): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: ImpressionTokenPayload = {
    ...payload,
    issuedAt: now,
    expiresAt: now + ttlSeconds,
  };

  const dataStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', TELEMETRY_SIGNING_KEY).update(dataStr).digest('base64url');
  return `${dataStr}.${hmac}`;
}

/**
 * Cryptographically verifies an impression token and returns its payload if valid and unexpired.
 */
export function verifyImpressionToken(token: string): ImpressionTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [dataStr, receivedHmac] = parts;

    const expectedHmac = crypto.createHmac('sha256', TELEMETRY_SIGNING_KEY).update(dataStr).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
      return null;
    }

    const payloadJson = Buffer.from(dataStr, 'base64url').toString('utf-8');
    const payload: ImpressionTokenPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (now > payload.expiresAt || now < payload.issuedAt - 5) {
      return null; // Expired or future timestamp
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Exact integer paise CPM calculation for a cumulative impression count:
 * totalChargePaise = floor((cpmRatePaise * totalCount) / 1000)
 * totalRewardPaise = floor((creatorRewardCpmPaise * totalCount) / 1000)
 * totalPlatformMarginPaise = totalChargePaise - totalRewardPaise
 */
export function calculateCumulativeCpmPaise(
  cpmRatePaise: bigint,
  creatorRewardCpmPaise: bigint,
  totalCount: number | bigint
): { totalChargePaise: bigint; totalRewardPaise: bigint; totalPlatformMarginPaise: bigint } {
  const cpm = BigInt(cpmRatePaise);
  const rewardCpm = BigInt(creatorRewardCpmPaise);
  const count = BigInt(totalCount);

  if (cpm < 0n || rewardCpm < 0n || count < 0n) {
    throw new Error('INVALID_MONETARY_INPUT: CPM rates and impression counts must be non-negative.');
  }

  if (rewardCpm > cpm) {
    throw new Error('SUBSIDY_UNSUPPORTED: Creator reward CPM cannot exceed advertiser charge CPM.');
  }

  // Maximum supported boundary enforcement (e.g. ₹100,000 CPM / 10,000,000 paise)
  if (cpm > 10_000_000_00n) {
    throw new Error('MONETARY_OVERFLOW: CPM rate exceeds maximum allowed financial threshold.');
  }

  if (count === 0n) {
    return { totalChargePaise: 0n, totalRewardPaise: 0n, totalPlatformMarginPaise: 0n };
  }

  const totalChargePaise = (cpm * count) / 1000n;
  const totalRewardPaise = (rewardCpm * count) / 1000n;
  const totalPlatformMarginPaise = totalChargePaise - totalRewardPaise;

  return { totalChargePaise, totalRewardPaise, totalPlatformMarginPaise };
}

/**
 * Calculates the exact marginal delta charge and reward for adding `batchCount` impressions
 * after `priorCount` impressions have already been validated.
 * This guarantees zero fractional-paise loss over time, exactly fulfilling:
 * Cumulative Charge = floor((priorCount + batchCount) * cpmRatePaise / 1000)
 * Delta Platform Fee = Delta Advertiser Charge - Delta Creator Reward
 */
export function calculateMarginalCpmPaise(
  cpmRatePaise: bigint,
  creatorRewardCpmPaise: bigint,
  priorCount: number | bigint,
  batchCount: number | bigint = 1
): { deltaChargePaise: bigint; deltaRewardPaise: bigint; deltaPlatformMarginPaise: bigint } {
  const prior = BigInt(priorCount);
  const batch = BigInt(batchCount);

  if (prior < 0n || batch < 0n) {
    throw new Error('INVALID_MONETARY_INPUT: Prior impression count and batch count must be non-negative.');
  }

  if (batch === 0n) {
    return { deltaChargePaise: 0n, deltaRewardPaise: 0n, deltaPlatformMarginPaise: 0n };
  }

  const priorCalc = calculateCumulativeCpmPaise(cpmRatePaise, creatorRewardCpmPaise, prior);
  const newCalc = calculateCumulativeCpmPaise(cpmRatePaise, creatorRewardCpmPaise, prior + batch);

  const deltaChargePaise = newCalc.totalChargePaise - priorCalc.totalChargePaise;
  const deltaRewardPaise = newCalc.totalRewardPaise - priorCalc.totalRewardPaise;
  const deltaPlatformMarginPaise = deltaChargePaise - deltaRewardPaise;

  return { deltaChargePaise, deltaRewardPaise, deltaPlatformMarginPaise };
}

/**
 * Legacy wrapper for backward compatibility with 1-impression calculations.
 */
export function calculateCpmPaise(
  cpmRatePaise: bigint,
  creatorRewardCpmPaise: bigint,
  impressionCount: number = 1
): { chargePaise: bigint; rewardPaise: bigint; platformMarginPaise: bigint } {
  const res = calculateMarginalCpmPaise(cpmRatePaise, creatorRewardCpmPaise, 0n, impressionCount);
  return {
    chargePaise: res.deltaChargePaise,
    rewardPaise: res.deltaRewardPaise,
    platformMarginPaise: res.deltaPlatformMarginPaise,
  };
}

/**
 * Service to retrieve eligible, active, funded ad campaigns for extension display.
 */
export async function getEligibleAdsForExtension(userId?: string) {
  const now = new Date();

  // Find active campaigns that have available budget and are within flight dates
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { flightStart: null },
        { flightStart: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { flightEnd: null },
            { flightEnd: { gte: now } },
          ],
        },
      ],
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          isVerified: true,
        },
      },
      creativeAssets: {
        where: { status: 'APPROVED' },
        take: 3,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Filter campaigns that still have budget remaining (budgetAllocatedPaise > budgetSpentPaise)
  const fundedCampaigns = campaigns.filter((c) => {
    return c.budgetAllocatedPaise > c.budgetSpentPaise;
  });

  return fundedCampaigns;
}

/**
 * Records and validates an ad impression atomically with double-entry accounting.
 */
export async function recordAdImpression(params: {
  userId: string;
  sessionToken: string;
  eventId: string;
  dwellSeconds: number;
  viewabilityScore: number;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { userId, sessionToken, eventId, dwellSeconds, viewabilityScore, ipAddress, userAgent } = params;

  // 1. Verify token
  const tokenPayload = verifyImpressionToken(sessionToken);
  if (!tokenPayload) {
    throw new Error('INVALID_TOKEN: Impression token is invalid or expired.');
  }

  if (tokenPayload.userId !== userId) {
    throw new Error('TOKEN_MISMATCH: Impression token does not match authenticated user.');
  }

  // 2. Viewability heuristics (minimum 1.0 second dwell time, >= 50% viewport intersection)
  if (dwellSeconds < 1.0 || viewabilityScore < 0.5) {
    throw new Error('INSUFFICIENT_VIEWABILITY: Impression did not satisfy viewability threshold (min 1.0s, 50% viewability).');
  }

  // 3. Deduplication check on eventId and tokenDigest
  const tokenDigest = crypto.createHash('sha256').update(sessionToken).digest('hex');
  const existing = await prisma.campaignImpression.findFirst({
    where: {
      OR: [
        { eventId },
        { tokenDigest },
      ],
    },
  });

  if (existing) {
    throw new Error('DUPLICATE_EVENT: This impression event or token has already been recorded and rewarded.');
  }

  // 4. Layered Anti-Fraud: Rate Limiting & Frequency Capping
  const now = new Date();
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // A. Velocity Limit: max 15 impressions per minute per user across all campaigns
  const recentUserImpressions = await prisma.campaignImpression.count({
    where: {
      userId,
      createdAt: { gte: oneMinuteAgo },
    },
  });
  if (recentUserImpressions >= 15) {
    throw new Error('RATE_LIMIT_EXCEEDED: Impression rate limit exceeded. Please wait a moment before claiming more rewards.');
  }

  // B. Frequency Cap: max 10 impressions per user per campaign in 24 hours
  const campaignDailyUserImpressions = await prisma.campaignImpression.count({
    where: {
      userId,
      campaignId: tokenPayload.campaignId,
      createdAt: { gte: twentyFourHoursAgo },
    },
  });
  if (campaignDailyUserImpressions >= 10) {
    throw new Error('FREQUENCY_CAP_EXCEEDED: Daily frequency cap reached for this campaign. Thank you for participating!');
  }  // 5. Atomic Concurrency Enforcement & Ledger Posting within a single database transaction
  const idempotencyKey = `IMPRESSION-${eventId}`;

  const result = await prisma.$transaction(async (tx) => {
    // A. Idempotency Check within transaction
    const existingImpression = await tx.campaignImpression.findFirst({
      where: {
        OR: [
          { eventId },
          { tokenDigest },
        ],
      },
      include: { campaign: true },
    });

    if (existingImpression) {
      throw new Error('DUPLICATE_EVENT: This impression event or token has already been recorded and rewarded.');
    }

    // B. Acquire exclusive row lock on Campaign row in MySQL InnoDB (SELECT ... FOR UPDATE)
    // This serializes all concurrent impressions for this campaign, guaranteeing that impressionsCount and budgetSpentPaise
    // are read authoritatively and updated without any race conditions or duplicate delta calculations.
    const lockedCampaigns: any[] = await tx.$queryRawUnsafe(
      `SELECT id, title, status, pricingModel, cpmRatePaise, creatorImpressionRewardPaise, 
              budgetAllocatedPaise, budgetSpentPaise, impressionsCount, organizationId
       FROM Campaign 
       WHERE id = ? 
       FOR UPDATE`,
      tokenPayload.campaignId
    );

    if (!lockedCampaigns || lockedCampaigns.length === 0) {
      throw new Error('CAMPAIGN_NOT_FOUND: Campaign not found.');
    }

    const campaign = lockedCampaigns[0];

    if (campaign.status !== 'ACTIVE') {
      throw new Error('CAMPAIGN_INACTIVE: Campaign is not active.');
    }

    // C. Lock user wallet (Strict Lock Order: Campaign -> Wallet)
    const lockedWallets: any[] = await tx.$queryRawUnsafe(
      `SELECT id, availablePaise, pendingPaise, escrowPaise, lifetimeEarnedPaise, lifetimePaidPaise 
       FROM Wallet 
       WHERE userId = ? 
       FOR UPDATE`,
      userId
    );

    if (!lockedWallets || lockedWallets.length === 0) {
      throw new Error('WALLET_NOT_FOUND: User wallet not found.');
    }

    const userWallet = lockedWallets[0];

    // D. Compute exact marginal delta charge and reward from the LOCKED priorCount
    let chargePaise: bigint;
    let rewardPaise: bigint;
    let platformMarginPaise: bigint;

    const priorImpressionsCount = BigInt(campaign.impressionsCount);

    if (campaign.pricingModel === 'CPM') {
      const marginal = calculateMarginalCpmPaise(
        BigInt(campaign.cpmRatePaise),
        BigInt(campaign.creatorImpressionRewardPaise),
        priorImpressionsCount,
        1n
      );
      chargePaise = marginal.deltaChargePaise;
      rewardPaise = marginal.deltaRewardPaise;
      platformMarginPaise = marginal.deltaPlatformMarginPaise;
    } else {
      // CPO or Hybrid: use token payload values
      chargePaise = BigInt(tokenPayload.chargePaise || '10');
      rewardPaise = BigInt(tokenPayload.rewardPaise || '5');
      platformMarginPaise = chargePaise >= rewardPaise ? chargePaise - rewardPaise : 0n;
    }

    // E. Atomic budget check: ensure budgetSpentPaise + chargePaise <= budgetAllocatedPaise
    const budgetSpent = BigInt(campaign.budgetSpentPaise);
    const budgetAllocated = BigInt(campaign.budgetAllocatedPaise);

    if (budgetSpent + chargePaise > budgetAllocated) {
      throw new Error('BUDGET_EXHAUSTED: Campaign budget has been exhausted or campaign is inactive.');
    }

    // F. Atomically update Campaign accounting state
    await tx.$executeRawUnsafe(
      `UPDATE Campaign 
       SET budgetSpentPaise = budgetSpentPaise + ?,
           impressionsCount = impressionsCount + 1
       WHERE id = ?`,
      chargePaise,
      campaign.id
    );

    // G. Insert CampaignImpression
    await tx.campaignImpression.create({
      data: {
        campaignId: campaign.id,
        userId,
        creativeAssetId: tokenPayload.creativeAssetId,
        eventId,
        sessionToken,
        tokenDigest,
        dwellSeconds,
        viewabilityScore,
        status: 'VALIDATED',
        rewardPaise,
        chargePaise,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'AdEarn-Extension/2.0.0',
        validatedAt: new Date(),
      },
    });

    // H. Post balanced double-entry General Journal entries and update creator wallet WITHIN THIS TRANSACTION
    if (chargePaise > 0n || rewardPaise > 0n) {
      const entries: JournalEntrySpec[] = [];

      if (chargePaise > 0n) {
        entries.push({
          accountCode: SYSTEM_ACCOUNTS.CAMPAIGN_RESERVE_LIABILITY.code,
          entryType: 'DEBIT',
          amountPaise: chargePaise,
        });
      }

      if (rewardPaise > 0n) {
        entries.push({
          accountCode: SYSTEM_ACCOUNTS.CREATOR_PAYABLE_LIABILITY.code,
          entryType: 'CREDIT',
          amountPaise: rewardPaise,
        });
      }

      if (platformMarginPaise > 0n) {
        entries.push({
          accountCode: SYSTEM_ACCOUNTS.PLATFORM_FEE_REVENUE.code,
          entryType: 'CREDIT',
          amountPaise: platformMarginPaise,
        });
      }

      const totalDr = entries.filter((e) => e.entryType === 'DEBIT').reduce((acc, e) => acc + e.amountPaise, 0n);
      const totalCr = entries.filter((e) => e.entryType === 'CREDIT').reduce((acc, e) => acc + e.amountPaise, 0n);

      if (totalDr === totalCr && entries.length > 0) {
        await DoubleEntryLedger.postBalancedTransaction({
          tx,
          referenceId: eventId,
          idempotencyKey,
          type: 'CREDIT_IMPRESSION_REWARD',
          description: `Impression validated & rewarded for campaign: ${campaign.title}`,
          actorId: userId,
          entries,
          walletUpdates: rewardPaise > 0n ? [
            {
              walletId: userWallet.id,
              availableDeltaPaise: rewardPaise,
              lifetimeEarnedDeltaPaise: rewardPaise,
            },
          ] : [],
          metadata: {
            campaignId: campaign.id,
            eventId,
            chargePaise: chargePaise.toString(),
            rewardPaise: rewardPaise.toString(),
            platformMarginPaise: platformMarginPaise.toString(),
            priorImpressionsCount: priorImpressionsCount.toString(),
          },
        });
      }
    }

    return {
      success: true,
      eventId,
      rewardPaise,
      chargePaise,
      platformMarginPaise,
      campaignTitle: campaign.title,
    };
  }, {
    isolationLevel: 'ReadCommitted',
    maxWait: 10000,
    timeout: 15000,
  });

  await recordAuditLog({
    actorId: userId,
    actorRole: 'USER',
    action: 'AD_IMPRESSION_VALIDATED_REWARDED',
    entityType: 'CampaignImpression',
    entityId: eventId,
    newState: {
      campaignId: tokenPayload.campaignId,
      rewardPaise: result.rewardPaise.toString(),
      chargePaise: result.chargePaise.toString(),
      platformMarginPaise: result.platformMarginPaise.toString(),
    },
  });

  return result;
}

export interface RecordAdClickParams {
  userId: string;
  clickToken: string;
  eventId: string;
  ipAddress?: string;
  userAgent?: string;
  optInRewards?: boolean;
}

/**
 * Validates an ad click, enforces anti-fraud rate caps, deducts CPC from campaign budget,
 * optionally credits creator wallet if rewards are enabled, and balances the general ledger.
 */
export async function recordAdClick(params: RecordAdClickParams) {
  const { userId, clickToken, eventId, ipAddress, userAgent, optInRewards = true } = params;

  // 1. Verify click token cryptographic signature
  const tokenPayload = verifyClickToken(clickToken);
  if (!tokenPayload) {
    throw new Error('INVALID_TOKEN: Click signature is invalid, tampered, or expired.');
  }

  // 2. Token ownership verification
  if (tokenPayload.userId !== userId) {
    throw new Error('TOKEN_MISMATCH: Click token does not belong to the authenticated user.');
  }

  // 3. Rate limiting & Frequency capping against click bots
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Velocity limit: max 10 clicks per minute per user across all campaigns
  const recentUserClicks = await prisma.campaignImpression.count({
    where: {
      userId,
      createdAt: { gte: oneMinuteAgo },
      sessionToken: { startsWith: 'CLICK:' },
    },
  });
  if (recentUserClicks >= 10) {
    throw new Error('RATE_LIMIT_EXCEEDED: Click rate limit exceeded. Please wait a moment.');
  }

  // Frequency cap: max 5 clicks per user per campaign in 24 hours
  const campaignDailyClicks = await prisma.campaignImpression.count({
    where: {
      userId,
      campaignId: tokenPayload.campaignId,
      createdAt: { gte: twentyFourHoursAgo },
      sessionToken: { startsWith: 'CLICK:' },
    },
  });
  if (campaignDailyClicks >= 5) {
    throw new Error('FREQUENCY_CAP_EXCEEDED: Daily click frequency cap reached for this campaign.');
  }

  const idempotencyKey = `CLICK-${eventId}`;
  const tokenDigest = crypto.createHash('sha256').update('CLICK:' + clickToken).digest('hex');

  const result = await prisma.$transaction(async (tx) => {
    // Idempotency check
    const existingClick = await tx.campaignImpression.findFirst({
      where: {
        OR: [
          { eventId },
          { tokenDigest },
        ],
      },
    });

    if (existingClick) {
      throw new Error('DUPLICATE_EVENT: This click event has already been recorded.');
    }

    // Row lock on Campaign
    const lockedCampaigns: any[] = await tx.$queryRawUnsafe(
      `SELECT id, title, status, budgetAllocatedPaise, budgetSpentPaise, targetUrl, organizationId 
       FROM Campaign 
       WHERE id = ? 
       FOR UPDATE`,
      tokenPayload.campaignId
    );

    if (!lockedCampaigns || lockedCampaigns.length === 0) {
      throw new Error('CAMPAIGN_NOT_FOUND: Campaign not found.');
    }

    const campaign = lockedCampaigns[0];
    if (campaign.status !== 'ACTIVE') {
      throw new Error('CAMPAIGN_INACTIVE: Campaign is not active.');
    }

    // Row lock on User Wallet
    const lockedWallets: any[] = await tx.$queryRawUnsafe(
      `SELECT id, availablePaise, pendingPaise, escrowPaise, lifetimeEarnedPaise 
       FROM Wallet 
       WHERE userId = ? 
       FOR UPDATE`,
      userId
    );

    if (!lockedWallets || lockedWallets.length === 0) {
      throw new Error('WALLET_NOT_FOUND: User wallet not found.');
    }

    const userWallet = lockedWallets[0];

    const rawCharge = BigInt(tokenPayload.cpcChargePaise || '50');
    const cpcCharge = rawCharge > 0n ? rawCharge : 50n;
    // Creator reward only if rewards opted in
    let creatorReward = optInRewards ? BigInt(tokenPayload.creatorRewardPaise || '25') : 0n;
    if (creatorReward > cpcCharge) creatorReward = cpcCharge / 2n;
    const platformMargin = cpcCharge - creatorReward;

    // Check atomic budget
    const budgetSpent = BigInt(campaign.budgetSpentPaise);
    const budgetAllocated = BigInt(campaign.budgetAllocatedPaise);

    if (budgetSpent + cpcCharge > budgetAllocated) {
      throw new Error('BUDGET_EXHAUSTED: Campaign budget has been exhausted.');
    }

    // Atomically increment campaign budgetSpent and verifiedOutcomes
    await tx.$executeRawUnsafe(
      `UPDATE Campaign 
       SET budgetSpentPaise = budgetSpentPaise + ?, 
           verifiedOutcomes = verifiedOutcomes + 1 
       WHERE id = ?`,
      cpcCharge,
      campaign.id
    );

    // Record click impression entry
    await tx.campaignImpression.create({
      data: {
        campaignId: campaign.id,
        userId,
        creativeAssetId: tokenPayload.creativeAssetId,
        eventId,
        sessionToken: `CLICK:${clickToken}`,
        tokenDigest,
        dwellSeconds: 1.0,
        viewabilityScore: 1.0,
        status: 'VALIDATED',
        rewardPaise: creatorReward,
        chargePaise: cpcCharge,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'AdEarn-Extension/2.0.0',
        validatedAt: new Date(),
      },
    });

    // Double-entry ledger settlement
    const entries: JournalEntrySpec[] = [
      {
        accountCode: SYSTEM_ACCOUNTS.CAMPAIGN_RESERVE_LIABILITY.code,
        entryType: 'DEBIT',
        amountPaise: cpcCharge,
      },
    ];

    if (creatorReward > 0n) {
      entries.push({
        accountCode: SYSTEM_ACCOUNTS.CREATOR_PAYABLE_LIABILITY.code,
        entryType: 'CREDIT',
        amountPaise: creatorReward,
      });
    }

    if (platformMargin > 0n) {
      entries.push({
        accountCode: SYSTEM_ACCOUNTS.PLATFORM_FEE_REVENUE.code,
        entryType: 'CREDIT',
        amountPaise: platformMargin,
      });
    }

    await DoubleEntryLedger.postBalancedTransaction({
      tx,
      referenceId: eventId,
      idempotencyKey,
      type: 'CREDIT_REWARD',
      description: `CPC Click validated & rewarded for campaign: ${campaign.title}`,
      actorId: userId,
      entries,
      walletUpdates: creatorReward > 0n ? [
        {
          walletId: userWallet.id,
          availableDeltaPaise: creatorReward,
          lifetimeEarnedDeltaPaise: creatorReward,
        },
      ] : [],
      metadata: {
        campaignId: campaign.id,
        eventId,
        type: 'CPC_CLICK',
        cpcCharge: cpcCharge.toString(),
        creatorReward: creatorReward.toString(),
        platformMargin: platformMargin.toString(),
      },
    });

    return {
      success: true,
      eventId,
      targetUrl: campaign.targetUrl,
      rewardPaise: creatorReward,
      chargePaise: cpcCharge,
      platformMarginPaise: platformMargin,
      campaignTitle: campaign.title,
    };
  }, {
    isolationLevel: 'ReadCommitted',
    maxWait: 10000,
    timeout: 15000,
  });

  await recordAuditLog({
    actorId: userId,
    actorRole: 'USER',
    action: 'AD_CLICK_VALIDATED_REWARDED',
    entityType: 'CampaignClick',
    entityId: eventId,
    newState: {
      campaignId: tokenPayload.campaignId,
      rewardPaise: result.rewardPaise.toString(),
      chargePaise: result.chargePaise.toString(),
      targetUrl: result.targetUrl,
    },
  });

  return result;
}
