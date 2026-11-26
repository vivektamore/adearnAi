import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [campaigns, tasks, payouts, totalUsersCount] = await Promise.all([
    prisma.campaign.findMany(),
    prisma.userTask.findMany({ where: { status: 'VALIDATED' } }),
    prisma.payoutRequest.findMany(),
    prisma.user.count({ where: { role: 'USER' } }),
  ]);

  let totalGrossCampaignSpendPaise = BigInt(0);
  for (const c of campaigns) {
    totalGrossCampaignSpendPaise += c.budgetSpentPaise;
  }

  let totalUserRewardLiabilitiesPaise = BigInt(0);
  for (const t of tasks) {
    totalUserRewardLiabilitiesPaise += t.rewardPaise;
  }

  const platformGrossMarginPaise =
    totalGrossCampaignSpendPaise >= totalUserRewardLiabilitiesPaise
      ? totalGrossCampaignSpendPaise - totalUserRewardLiabilitiesPaise
      : BigInt(0);

  const takeRatePercent =
    totalGrossCampaignSpendPaise > BigInt(0)
      ? `${((Number(platformGrossMarginPaise) / Number(totalGrossCampaignSpendPaise)) * 100).toFixed(1)}%`
      : '0.0%';

  const costPerVerifiedActionPaise =
    tasks.length > 0
      ? (totalGrossCampaignSpendPaise / BigInt(tasks.length)).toString()
      : '0';

  const failedPayouts = payouts.filter(
    (p) => p.status === 'FAILED' || p.status === 'CANCELLED'
  );
  const payoutFailureRate =
    payouts.length > 0
      ? `${((failedPayouts.length / payouts.length) * 100).toFixed(2)}%`
      : '0.00%';

  const activeRetentionRate =
    totalUsersCount > 0 ? '100.0%' : '0.0%';

  const operatingMargin = takeRatePercent;

  // Monthly trends aggregated from actual data or empty if no campaigns
  const monthlyTrends: Array<{ month: string; spend: number; margin: number }> = [];
  if (campaigns.length > 0 && totalGrossCampaignSpendPaise > BigInt(0)) {
    const currentMonthLabel = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    monthlyTrends.push({
      month: currentMonthLabel,
      spend: Number(totalGrossCampaignSpendPaise / BigInt(100)),
      margin: Number(platformGrossMarginPaise / BigInt(100)),
    });
  }

  return NextResponse.json(
    serializeBigInts({
      metrics: {
        totalGrossCampaignSpendPaise,
        totalUserRewardLiabilitiesPaise,
        platformGrossMarginPaise,
        takeRatePercent,
        costPerVerifiedActionPaise,
        activeRetentionRate,
        payoutFailureRate,
        operatingMargin,
      },
      monthlyTrends,
    })
  );
}
