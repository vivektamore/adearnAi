import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { generateSessionToken } from '@/lib/telemetry';
import { serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { campaignId } = await req.json();
  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required.' }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign || campaign.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Campaign is not currently active.' }, { status: 400 });
  }

  // Check if user already has an active or completed task for this campaign
  const existingTask = await prisma.userTask.findFirst({
    where: {
      userId: auth.session!.userId,
      campaignId,
      status: 'VALIDATED',
    },
  });

  if (existingTask) {
    return NextResponse.json(
      { error: 'You have already completed and received rewards for this sponsored campaign.' },
      { status: 400 }
    );
  }

  const sessionToken = generateSessionToken(auth.session!.userId, campaignId);

  const task = await prisma.userTask.create({
    data: {
      campaignId,
      userId: auth.session!.userId,
      sessionToken,
      status: 'STARTED',
      rewardPaise: campaign.costPerOutcomePaise,
    },
  });

  return NextResponse.json(
    serializeBigInts({
      success: true,
      taskId: task.id,
      sessionToken,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        actionType: campaign.actionType,
        rewardPaise: campaign.costPerOutcomePaise,
      },
    })
  );
}
