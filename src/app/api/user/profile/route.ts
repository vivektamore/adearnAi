import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


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

  const cleanUpi = upiId ? String(upiId).trim() : null;
  const cleanIfsc = bankIfsc ? String(bankIfsc).trim().toUpperCase() : null;
  const cleanAcc = bankAccountNumber ? String(bankAccountNumber).trim().replace(/\s+/g, '') : null;

  if (cleanUpi && !/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/.test(cleanUpi)) {
    return NextResponse.json({ error: 'Invalid UPI ID format. Expected format: username@bank' }, { status: 400 });
  }

  if (cleanIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
    return NextResponse.json({ error: 'Invalid Bank IFSC code format. Expected 11-character alphanumeric code (e.g. HDFC0001234)' }, { status: 400 });
  }

  if (cleanAcc && !/^\d{8,20}$/.test(cleanAcc)) {
    return NextResponse.json({ error: 'Invalid Bank Account Number. Must contain between 8 and 20 digits.' }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name ? { name: String(name).trim() } : {}),
      ...(cleanUpi !== null ? { upiId: cleanUpi } : {}),
      ...(cleanAcc !== null ? { bankAccountNumber: cleanAcc } : {}),
      ...(cleanIfsc !== null ? { bankIfsc: cleanIfsc } : {}),
      ...(bankAccountName ? { bankAccountName: String(bankAccountName).trim() } : {}),
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
