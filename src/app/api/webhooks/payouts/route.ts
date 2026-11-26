import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const provider = req.headers.get('x-webhook-provider') || body.provider || 'SANDBOX_NODAL';
    const eventType = body.event || body.type || 'PAYOUT.PROCESSED';
    const eventId = body.id || body.eventId || `evt_${Date.now()}`;
    const idempotencyKey = body.idempotencyKey || `whk_${provider}_${eventId}`;

    // Verify deduplication
    const existing = await prisma.paymentWebhookRecord.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Webhook event already recorded and processed.',
        idempotent: true,
      });
    }

    // Persist webhook record
    const record = await prisma.paymentWebhookRecord.create({
      data: {
        provider,
        eventType,
        eventId,
        idempotencyKey,
        payloadJson: rawBody,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    await recordAuditLog({
      actorId: 'SYSTEM_WEBHOOK',
      actorRole: 'SYSTEM',
      action: 'PAYMENT_WEBHOOK_RECEIVED',
      entityType: 'PaymentWebhookRecord',
      entityId: record.id,
      newState: { provider, eventType, idempotencyKey },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment webhook event ingested successfully.',
      recordId: record.id,
    });
  } catch (err: any) {
    console.error('Webhook ingestion error:', err);
    return NextResponse.json({ error: 'Internal error processing payment webhook.' }, { status: 500 });
  }
}
