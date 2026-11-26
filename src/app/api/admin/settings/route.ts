import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminPermission, requireRole } from '@/lib/rbac';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['ADMIN', 'SUPER_ADMIN']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const settings = await prisma.systemSetting.findMany();

  return NextResponse.json({
    settings: {
      minWithdrawalPaise: process.env.MIN_WITHDRAWAL_THRESHOLD_PAISE || '10000',
      maxDailyEarningPaise: process.env.MAX_DAILY_EARNING_CAP_PAISE || '500000',
      payoutMode: process.env.PAYOUT_MODE || 'sandbox',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      autoApproveKycTier1: 'ENABLED',
      fraudKinematicsThreshold: '0.45',
      rbiNodalAccountVpa: 'nodal.settlement@hdfcbank',
      webhookRetryMax: '5',
    },
    apiKeys: [
      { id: 'key_live_telemetry_01', name: 'Sandbox Telemetry Ingestion Key', prefix: 'adearn_live_***b89a', status: 'ACTIVE', created: '16 Oct 2026' },
      { id: 'key_live_webhook_02', name: 'RazorpayX Nodal Settlement Webhook', prefix: 'whsec_***4e1a', status: 'ACTIVE', created: '01 Oct 2026' },
    ],
  });
}

export async function PUT(req: NextRequest) {
  const auth = requireAdminPermission(req, 'settings.manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { key, value } = await req.json();

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: 'ADMIN',
    action: 'SYSTEM_SETTING_UPDATED',
    entityType: 'SystemSetting',
    entityId: key,
    newState: { value },
  });

  return NextResponse.json({ success: true, message: `Setting ${key} updated.` });
}
