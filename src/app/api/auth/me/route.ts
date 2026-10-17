import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      wallet: true,
      userOrganizations: {
        include: {
          organization: {
            include: {
              wallet: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const org = user.userOrganizations[0]?.organization || null;

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      kycTier: user.kycTier,
      kycStatus: user.kycStatus,
      upiId: user.upiId,
      wallet: user.wallet,
      organization: org
        ? {
            id: org.id,
            name: org.name,
            gstin: org.gstin,
            wallet: org.wallet,
          }
        : null,
    },
  });
}
