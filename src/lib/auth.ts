import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'adearn-ai-development-super-secret-jwt-key-2026-minimum-32-chars-long';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADVERTISER' | 'ADMIN' | 'SUPER_ADMIN';
  organizationId?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthSession;
  } catch (err) {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): AuthSession | null {
  // Check authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = verifyToken(token);
    if (session) return session;
  }

  // Check cookie next
  const cookieToken = req.cookies.get('adearn_session')?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  return null;
}

export function requireAuth(req: NextRequest, allowedRoles?: ('USER' | 'ADVERTISER' | 'ADMIN' | 'SUPER_ADMIN' | 'BRAND' | 'CREATOR')[]) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return { error: 'Authentication required. Please sign in.', status: 401, session: null };
  }
  if (allowedRoles) {
    const normalize = (r: string) => {
      const u = r.toUpperCase();
      if (u === 'BRAND') return 'ADVERTISER';
      if (u === 'CREATOR') return 'USER';
      return u;
    };
    const normUserRole = normalize(session.role);
    const normAllowed = allowedRoles.map(normalize);
    const isAllowed =
      normAllowed.includes(normUserRole) ||
      (normUserRole === 'SUPER_ADMIN' && normAllowed.includes('ADMIN'));

    if (!isAllowed) {
      return { error: 'Forbidden. You do not have permission for this resource.', status: 403, session: null };
    }
  }
  return { error: null, status: 200, session };
}
