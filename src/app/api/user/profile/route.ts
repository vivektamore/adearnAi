import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session!.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      kycTier: true,
      kycStatus: true,
      upiId: true,
      bankAccountNumber: true,
      bankIfsc: true,
      bankAccountName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const body = await req.json();
  const { name, upiId, bankAccountNumber, bankIfsc, bankAccountName } = body;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name ? { name } : {}),
      ...(upiId !== undefined ? { upiId } : {}),
      ...(bankAccountNumber !== undefined ? { bankAccountNumber } : {}),
      ...(bankIfsc !== undefined ? { bankIfsc } : {}),
      ...(bankAccountName !== undefined ? { bankAccountName } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      upiId: true,
      bankAccountNumber: true,
      bankIfsc: true,
      bankAccountName: true,
      kycTier: true,
    },
  });

  await recordAuditLog({
    actorId: userId,
    actorRole: auth.session!.role,
    action: 'USER_PROFILE_UPDATED',
    entityType: 'User',
    entityId: userId,
  });

  return NextResponse.json({
    success: true,
    user: updatedUser,
    message: 'Profile preferences updated successfully.',
  });
}
