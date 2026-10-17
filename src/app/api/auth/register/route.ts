import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role = 'USER', organizationName, gstin } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const assignedRole = role === 'ADVERTISER' ? 'ADVERTISER' : 'USER';

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name,
        role: assignedRole,
        kycTier: assignedRole === 'ADVERTISER' ? 'TIER_2' : 'TIER_1',
        kycStatus: 'VERIFIED',
      },
    });

    let organizationId: string | null = null;

    if (assignedRole === 'ADVERTISER') {
      const org = await prisma.organization.create({
        data: {
          name: organizationName || `${name} Organization`,
          gstin: gstin || null,
          contactEmail: cleanEmail,
          isVerified: true,
          users: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });
      organizationId = org.id;

      // Create advertiser escrow wallet
      await prisma.wallet.create({
        data: {
          organizationId: org.id,
          escrowPaise: BigInt(0),
          availablePaise: BigInt(0),
          pendingPaise: BigInt(0),
        },
      });
    } else {
      // Create user reward wallet
      await prisma.wallet.create({
        data: {
          userId: user.id,
          availablePaise: BigInt(0),
          pendingPaise: BigInt(0),
          lifetimeEarnedPaise: BigInt(0),
          lifetimePaidPaise: BigInt(0),
        },
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId,
    });

    await recordAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId,
      },
    });

    response.cookies.set({
      name: 'adearn_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Internal server error during account creation.' }, { status: 500 });
  }
}
