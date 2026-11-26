import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role = 'USER', organizationName, gstin } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be between 8 and 128 characters long.' }, { status: 400 });
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain at least one letter and one number or special character.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const assignedRole = (role === 'ADVERTISER' || role === 'BRAND') ? 'ADVERTISER' : 'USER';

    // Atomic transaction: Guarantees user, organization, and wallet sub-ledger are created atomically
    const { user, organizationId } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          name: cleanName,
          role: assignedRole,
          kycTier: 'TIER_1',
          kycStatus: 'UNVERIFIED',
        },
      });

      let orgId: string | null = null;

      // Initialize default user preferences atomically
      await tx.userPreference.create({
        data: {
          userId: newUser.id,
          optInRewards: true,
          emailNotifications: true,
          theme: 'SYSTEM',
        },
      });

      if (assignedRole === 'ADVERTISER') {
        const org = await tx.organization.create({
          data: {
            name: (organizationName || `${cleanName}'s Organization`).trim(),
            gstin: gstin ? gstin.trim().toUpperCase() : null,
            contactEmail: cleanEmail,
            isVerified: false,
            users: {
              create: {
                userId: newUser.id,
                role: 'OWNER',
              },
            },
          },
        });
        orgId = org.id;

        // Create advertiser escrow wallet
        await tx.wallet.create({
          data: {
            organizationId: org.id,
            escrowPaise: BigInt(0),
            availablePaise: BigInt(0),
            pendingPaise: BigInt(0),
          },
        });
      } else {
        // Create user reward wallet
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            availablePaise: BigInt(0),
            pendingPaise: BigInt(0),
            lifetimeEarnedPaise: BigInt(0),
            lifetimePaidPaise: BigInt(0),
          },
        });
      }

      return { user: newUser, organizationId: orgId };
    });

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
