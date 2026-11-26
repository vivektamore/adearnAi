import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// In-memory sliding-window brute force protection
interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return true;

  if (record.lockedUntil > now) {
    return false; // Locked out
  }

  // Window expired, reset
  if (now - record.firstAttemptAt > WINDOW_MS) {
    loginAttempts.delete(key);
    return true;
  }

  return true;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now, lockedUntil: 0 });
    return;
  }

  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
}

function clearRateLimit(key: string): void {
  loginAttempts.delete(key);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const rateLimitKey = `${ipAddress}:${cleanEmail}`;

    if (!checkRateLimit(rateLimitKey)) {
      await recordAuditLog({
        actorRole: 'ANONYMOUS',
        action: 'USER_LOGIN_LOCKED',
        entityType: 'User',
        entityId: cleanEmail,
        ipAddress,
        userAgent: req.headers.get('user-agent'),
      });
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please wait 15 minutes before trying again.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        userOrganizations: true,
      },
    });

    if (!user) {
      recordFailedAttempt(rateLimitKey);
      await recordAuditLog({
        actorRole: 'ANONYMOUS',
        action: 'USER_LOGIN_FAILED',
        entityType: 'User',
        entityId: cleanEmail,
        ipAddress,
        userAgent: req.headers.get('user-agent'),
      });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'This account has been suspended for policy compliance review.' }, { status: 403 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      recordFailedAttempt(rateLimitKey);
      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'USER_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent: req.headers.get('user-agent'),
      });
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Login succeeded, clear any prior rate limit tracking
    clearRateLimit(rateLimitKey);

    const orgId = user.userOrganizations[0]?.organizationId || null;

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: orgId,
    });

    // Record session in database for lifecycle auditing & revocation
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: token,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
        userAgent: req.headers.get('user-agent'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    }).catch(() => {});

    await recordAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: 'USER_LOGIN_SUCCESS',
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
        kycTier: user.kycTier,
        organizationId: orgId,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'adearn_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error during authentication.' }, { status: 500 });
  }
}
