import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { serializeBigInts } from '@/lib/money';
import { OpenaiAdsService } from '@/lib/openai-ads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/advertiser/openai/conversions
 * Retrieves conversion tracking configuration, JavaScript Pixel snippet,
 * and Conversions API integration guides for the organization.
 */
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
    return NextResponse.json({ error: 'Advertiser organization not associated.' }, { status: 400 });
  }

  let config = await prisma.openaiConversionConfig.findUnique({
    where: { organizationId: orgId },
  });

  if (!config) {
    // Generate default pixel ID for this organization
    const defaultPixelId = `oai_px_${orgId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
    const pixelSnippet = OpenaiAdsService.generateConversionSnippet(defaultPixelId);

    config = await prisma.openaiConversionConfig.create({
      data: {
        organizationId: orgId,
        pixelId: defaultPixelId,
        pixelCode: pixelSnippet,
        conversionsApiEnabled: true,
        attributionWindowDays: 7,
        eventDeduplicationEnabled: true,
      },
    });
  }

  const jsSnippet = OpenaiAdsService.generateConversionSnippet(config.pixelId || 'oai_px_default');
  const sampleCapiPayload = OpenaiAdsService.buildConversionsApiPayload({
    eventName: 'Purchase',
    eventTime: Math.floor(Date.now() / 1000),
    eventId: 'evt_sample_' + Date.now(),
    actionSource: 'website',
    customData: {
      currency: 'INR',
      value: 2999.0,
      order_id: 'ORD_10293',
    },
  });

  return NextResponse.json(
    serializeBigInts({
      config,
      jsSnippet,
      sampleCapiPayload,
      privacyNotice: 'Conversion tracking strictly records permitted first-party advertiser website actions. No ChatGPT conversation contents or user prompts are ever collected or transmitted.',
      permittedStandardEvents: ['PageView', 'Lead', 'CompleteRegistration', 'Purchase', 'AddToCart', 'InitiateCheckout'],
    })
  );
}

/**
 * POST /api/advertiser/openai/conversions
 * Updates conversion configuration (pixel ID, attribution windows, test mode).
 */
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

  try {
    const body = await req.json();
    const { conversionsApiEnabled, attributionWindowDays, eventDeduplicationEnabled } = body;

    const defaultPixelId = `oai_px_${orgId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
    const pixelSnippet = OpenaiAdsService.generateConversionSnippet(defaultPixelId);

    const updated = await prisma.openaiConversionConfig.upsert({
      where: { organizationId: orgId },
      update: {
        ...(conversionsApiEnabled !== undefined ? { conversionsApiEnabled: Boolean(conversionsApiEnabled) } : {}),
        ...(attributionWindowDays !== undefined ? { attributionWindowDays: Number(attributionWindowDays) } : {}),
        ...(eventDeduplicationEnabled !== undefined ? { eventDeduplicationEnabled: Boolean(eventDeduplicationEnabled) } : {}),
      },
      create: {
        organizationId: orgId,
        pixelId: defaultPixelId,
        pixelCode: pixelSnippet,
        conversionsApiEnabled: Boolean(conversionsApiEnabled),
        attributionWindowDays: Number(attributionWindowDays) || 7,
        eventDeduplicationEnabled: eventDeduplicationEnabled !== undefined ? Boolean(eventDeduplicationEnabled) : true,
      },
    });

    return NextResponse.json(
      serializeBigInts({
        success: true,
        config: updated,
        message: 'Conversion tracking configuration updated.',
      })
    );
  } catch (error: any) {
    console.error('Error updating conversion config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update conversion configuration.' },
      { status: 500 }
    );
  }
}
