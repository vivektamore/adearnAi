import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { recordAdImpression } from '@/lib/ads';
import { serializeBigInts } from '@/lib/money';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    let userId = session?.userId;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst({ where: { role: 'USER' }, select: { id: true } });
      userId = defaultUser?.id || 'guest_creator';
    }

    const body = await req.json();
    const { sessionToken, eventId, dwellSeconds, viewabilityScore } = body;

    if (!sessionToken || !eventId) {
      return NextResponse.json({ error: 'sessionToken and eventId are required.' }, { status: 400 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'AdEarn-Extension';

    const result = await recordAdImpression({
      userId,
      sessionToken,
      eventId,
      dwellSeconds: Number(dwellSeconds ?? 1.5),
      viewabilityScore: Number(viewabilityScore ?? 1.0),
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      serializeBigInts({
        success: true,
        message: 'Impression verified and rewarded.',
        eventId: result.eventId,
        rewardPaise: result.rewardPaise,
        campaignTitle: result.campaignTitle,
      })
    );
  } catch (err: any) {
    const message = err.message || 'Failed to record impression.';
    let status = 400;

    if (message.startsWith('INVALID_TOKEN') || message.startsWith('TOKEN_MISMATCH')) {
      status = 401;
    } else if (message.startsWith('DUPLICATE_EVENT')) {
      status = 409;
    } else if (message.startsWith('INSUFFICIENT_VIEWABILITY')) {
      status = 422;
    } else if (message.startsWith('BUDGET_EXHAUSTED')) {
      status = 410;
    } else if (message.startsWith('RATE_LIMIT_EXCEEDED') || message.startsWith('FREQUENCY_CAP_EXCEEDED')) {
      status = 429;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
