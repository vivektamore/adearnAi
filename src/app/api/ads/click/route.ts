import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAuth } from '@/lib/auth';
import { recordAdClick } from '@/lib/ads';
import { serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    let userId = session?.userId;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst({ where: { role: 'USER' }, select: { id: true } });
      userId = defaultUser?.id || 'guest_creator';
    }

    const body = await req.json();
    const { clickToken, eventId, optInRewards } = body;

    if (!clickToken) {
      return NextResponse.json({ error: 'clickToken is required.' }, { status: 400 });
    }

    const finalEventId = eventId || `clk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'AdEarn-Extension';

    const result = await recordAdClick({
      userId,
      clickToken,
      eventId: finalEventId,
      ipAddress,
      userAgent,
      optInRewards: optInRewards !== false,
    });

    return NextResponse.json(
      serializeBigInts({
        success: true,
        message: 'Click verified and processed.',
        eventId: result.eventId,
        targetUrl: result.targetUrl,
        rewardPaise: result.rewardPaise,
        chargePaise: result.chargePaise,
        campaignTitle: result.campaignTitle,
      })
    );
  } catch (err: any) {
    const message = err.message || 'Failed to record click.';
    let status = 400;

    if (message.startsWith('INVALID_TOKEN') || message.startsWith('TOKEN_MISMATCH')) {
      status = 401;
    } else if (message.startsWith('DUPLICATE_EVENT')) {
      status = 409;
    } else if (message.startsWith('BUDGET_EXHAUSTED')) {
      status = 410;
    } else if (message.startsWith('RATE_LIMIT_EXCEEDED') || message.startsWith('FREQUENCY_CAP_EXCEEDED')) {
      status = 429;
    }

    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clickToken = searchParams.get('token');
    const eventId = searchParams.get('eventId') || `clk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const redirect = searchParams.get('redirect') === 'true';

    const session = getSessionFromRequest(req);
    let userId = session?.userId;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst({ where: { role: 'USER' }, select: { id: true } });
      userId = defaultUser?.id || 'guest_creator';
    }

    if (!clickToken) {
      return NextResponse.json({ error: 'token parameter is required.' }, { status: 400 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'AdEarn-Extension';

    const result = await recordAdClick({
      userId,
      clickToken,
      eventId,
      ipAddress,
      userAgent,
      optInRewards: true,
    });

    if (redirect && result.targetUrl) {
      return NextResponse.redirect(result.targetUrl);
    }

    return NextResponse.json(
      serializeBigInts({
        success: true,
        targetUrl: result.targetUrl,
        rewardPaise: result.rewardPaise,
      })
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Click processing failed.' }, { status: 400 });
  }
}
