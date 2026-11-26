import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { getEligibleAdsForExtension, generateImpressionToken, generateClickToken, calculateMarginalCpmPaise } from '@/lib/ads';
import { serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    let userId = session?.userId;

    // Graceful companion fallback: if user is browsing ChatGPT before logging into extension popup,
    // associate impressions with the primary creator account so ads serve immediately.
    if (!userId) {
      const defaultUser = await prisma.user.findFirst({
        where: { role: 'USER' },
        select: { id: true },
      });
      userId = defaultUser?.id || 'guest_creator';
    }
    const campaigns = await getEligibleAdsForExtension(userId);

    // Map each campaign into an ad serving payload with authoritative impression and click tokens
    const ads = campaigns.map((camp) => {
      const creative = camp.creativeAssets[0] || null;

      // Determine impression charge and creator reward
      let chargePaise = BigInt(0);
      let rewardPaise = BigInt(0);

      if (camp.pricingModel === 'CPM') {
        const cpmCalc = calculateMarginalCpmPaise(camp.cpmRatePaise, camp.creatorImpressionRewardPaise, camp.impressionsCount, 1);
        chargePaise = cpmCalc.deltaChargePaise;
        rewardPaise = cpmCalc.deltaRewardPaise;
      } else {
        // CPO or CPC/Hybrid
        chargePaise = camp.cpmRatePaise > BigInt(0) ? camp.cpmRatePaise / BigInt(1000) : BigInt(10);
        rewardPaise = camp.creatorImpressionRewardPaise > BigInt(0) ? camp.creatorImpressionRewardPaise / BigInt(1000) : BigInt(5);
      }

      // Generate secure HMAC-signed impression token valid for 60 seconds
      const impressionToken = generateImpressionToken({
        campaignId: camp.id,
        creativeAssetId: creative?.id || null,
        userId,
        expectedDwellMinSeconds: 1.0,
        pricingModel: (camp.pricingModel as any) || 'CPM',
        rewardPaise: rewardPaise.toString(),
        chargePaise: chargePaise.toString(),
      }, 60);

      // Derive CPC rates from campaign requirements or defaults
      let cpcChargePaise = '200'; // Default ₹2.00
      let cpcRewardPaise = '100'; // Default ₹1.00

      try {
        if (camp.requirementsJson) {
          const reqs = JSON.parse(camp.requirementsJson);
          if (reqs.cpcRatePaise && BigInt(reqs.cpcRatePaise) > 0n) {
            cpcChargePaise = reqs.cpcRatePaise.toString();
          }
          if (reqs.creatorClickRewardPaise && BigInt(reqs.creatorClickRewardPaise) > 0n) {
            cpcRewardPaise = reqs.creatorClickRewardPaise.toString();
          }
        }
      } catch {}

      if (cpcChargePaise === '200' && camp.pricingModel === 'HYBRID' && camp.costPerOutcomePaise > 0n) {
        cpcChargePaise = camp.costPerOutcomePaise.toString();
        cpcRewardPaise = (camp.costPerOutcomePaise / BigInt(2)).toString();
      }

      // Safeguard: Ensure minimum 50 paise charge and 25 paise reward
      if (BigInt(cpcChargePaise) < 50n) cpcChargePaise = '50';
      if (BigInt(cpcRewardPaise) < 25n) cpcRewardPaise = (BigInt(cpcChargePaise) / BigInt(2)).toString();

      // Generate secure HMAC-signed click token valid for 120 seconds
      const clickToken = generateClickToken({
        campaignId: camp.id,
        creativeAssetId: creative?.id || null,
        userId,
        pricingModel: (camp.pricingModel as any) || 'CPC',
        cpcChargePaise,
        creatorRewardPaise: cpcRewardPaise,
      }, 120);

      return {
        id: camp.id,
        title: camp.title,
        description: camp.description,
        category: camp.category,
        actionType: camp.actionType,
        pricingModel: camp.pricingModel,
        brand: {
          id: camp.organization.id,
          name: camp.organization.name,
          isVerified: camp.organization.isVerified,
        },
        creative: creative ? {
          id: creative.id,
          assetUrl: creative.assetUrl,
          assetType: creative.assetType,
        } : null,
        sponsoredPrompt: `Tell me about ${camp.title} and why it is useful.`,
        rewardPaise,
        costPerOutcomePaise: camp.costPerOutcomePaise,
        cpcChargePaise,
        cpcRewardPaise,
        impressionToken,
        clickToken,
        targetUrl: camp.targetUrl,
        taskUrl: `/tasks/${camp.id}`,
      };
    });

    return NextResponse.json(
      serializeBigInts({
        success: true,
        count: ads.length,
        ads,
      })
    );
  } catch (err: any) {
    console.error('Error serving ads:', err);
    return NextResponse.json({ error: 'Failed to retrieve eligible ads.' }, { status: 500 });
  }
}
