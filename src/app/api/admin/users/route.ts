import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminPermission } from '@/lib/rbac';
import { recordAuditLog } from '@/lib/audit';
import { serializeBigInts } from '@/lib/money';

export async function GET(req: NextRequest) {
  const auth = requireAdminPermission(req, 'users.manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim().toLowerCase() || '';
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (role && ['USER', 'ADVERTISER', 'ADMIN'].includes(role.toUpperCase())) {
    where.role = role.toUpperCase();
  }

  if (status && ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'].includes(status.toUpperCase())) {
    where.status = status.toUpperCase();
  }

  const users = await prisma.user.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      kycTier: true,
      kycStatus: true,
      upiId: true,
      bankAccountNumber: true,
      createdAt: true,
      wallet: {
        select: {
          id: true,
          availablePaise: true,
          pendingPaise: true,
          escrowPaise: true,
          lifetimeEarnedPaise: true,
          lifetimePaidPaise: true,
        },
      },
      userOrganizations: {
        include: {
          organization: {
            select: { id: true, name: true, isVerified: true },
          },
        },
      },
    },
  });

  const totalCount = await prisma.user.count({ where });

  return NextResponse.json(
    serializeBigInts({
      users,
      totalCount,
      limit,
    })
  );
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdminPermission(req, 'users.manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const { userId, status, kycTier, reason } = body;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const updateData: any = {};
  if (status && ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'].includes(status)) {
    updateData.status = status;
  }
  if (kycTier && ['TIER_0', 'TIER_1', 'TIER_2'].includes(kycTier)) {
    updateData.kycTier = kycTier;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid status or KYC update provided.' }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, email: true, name: true, role: true, status: true, kycTier: true },
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: auth.session!.role,
    action: 'ADMIN_USER_STATUS_UPDATED',
    entityType: 'User',
    entityId: userId,
    oldState: { status: user.status, kycTier: user.kycTier },
    newState: { ...updateData, reason: reason || 'Administrative status change' },
  });

  return NextResponse.json({
    success: true,
    message: `User ${user.email} updated successfully.`,
    user: updatedUser,
  });
}
