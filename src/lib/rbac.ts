import { NextRequest } from 'next/server';
import { AuthSession, getSessionFromRequest } from '@/lib/auth';

export type CanonicalRole = 'USER' | 'ADVERTISER' | 'ADMIN' | 'SUPER_ADMIN';

export type AdminPermission =
  | 'campaigns.moderate'
  | 'payouts.approve'
  | 'fraud.review'
  | 'users.manage'
  | 'settings.manage'
  | 'audit.read'
  | 'unit_economics.read';

/**
 * Normalizes input role aliases into canonical system roles.
 * Supports legacy aliases: 'BRAND' -> 'ADVERTISER', 'CREATOR' -> 'USER'.
 */
export function normalizeRole(role: string | null | undefined): CanonicalRole {
  if (!role) return 'USER';
  const upper = role.toUpperCase();
  if (upper === 'SUPER_ADMIN' || upper === 'SUPERADMIN') return 'SUPER_ADMIN';
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'ADVERTISER' || upper === 'BRAND') return 'ADVERTISER';
  if (upper === 'USER' || upper === 'CREATOR') return 'USER';
  return 'USER';
}

/**
 * Institutional Permissions Matrix
 */
const ROLE_PERMISSIONS: Record<CanonicalRole, readonly (AdminPermission | '*')[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'campaigns.moderate',
    'payouts.approve',
    'fraud.review',
    'users.manage',
    'audit.read',
    'unit_economics.read',
  ],
  ADVERTISER: [],
  USER: [],
};

/**
 * Checks whether a given role holds a specific administrative permission.
 */
export function hasPermission(role: string | null | undefined, permission: AdminPermission): boolean {
  const canonical = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[canonical];
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  return (permissions as readonly AdminPermission[]).includes(permission);
}

export interface RbacAuthResult {
  authorized: boolean;
  error: string | null;
  status: number;
  session: AuthSession | null;
}

/**
 * Validates that an incoming request possesses an authenticated session
 * and that the session's role matches one of the allowed roles.
 */
export function requireRole(
  req: NextRequest,
  allowedRoles: (CanonicalRole | 'BRAND' | 'CREATOR')[]
): RbacAuthResult {
  const session = getSessionFromRequest(req);
  if (!session) {
    return {
      authorized: false,
      error: 'Authentication required. Please sign in.',
      status: 401,
      session: null,
    };
  }

  const normalizedUserRole = normalizeRole(session.role);
  const normalizedAllowedRoles = allowedRoles.map(r => normalizeRole(r));

  // SUPER_ADMIN has platform-wide authority unless explicitly excluded
  const isAllowed =
    normalizedAllowedRoles.includes(normalizedUserRole) ||
    (normalizedUserRole === 'SUPER_ADMIN' && normalizedAllowedRoles.includes('ADMIN'));

  if (!isAllowed) {
    return {
      authorized: false,
      error: 'Forbidden. Your role is unauthorized to access this portal resource.',
      status: 403,
      session,
    };
  }

  return {
    authorized: true,
    error: null,
    status: 200,
    session: {
      ...session,
      role: normalizedUserRole as any,
    },
  };
}

/**
 * Enforces organization ownership for multi-tenant brand resources (IDOR defense).
 * Returns true if caller is Super Admin or legitimately owns the organization.
 */
export function verifyBrandOwnership(
  session: AuthSession | null,
  targetOrgId: string | null | undefined
): { authorized: boolean; error: string | null; status: number } {
  if (!session) {
    return { authorized: false, error: 'Authentication required.', status: 401 };
  }

  const canonicalRole = normalizeRole(session.role);
  if (canonicalRole === 'SUPER_ADMIN') {
    return { authorized: true, error: null, status: 200 };
  }

  if (canonicalRole !== 'ADVERTISER') {
    return { authorized: false, error: 'Forbidden. Advertiser organization account required.', status: 403 };
  }

  if (!targetOrgId || !session.organizationId || session.organizationId !== targetOrgId) {
    return {
      authorized: false,
      error: 'Forbidden. You do not have permission to access another organization’s assets or campaigns.',
      status: 403,
    };
  }

  return { authorized: true, error: null, status: 200 };
}

/**
 * Enforces individual creator ownership for private financial/task resources (IDOR defense).
 */
export function verifyUserOwnership(
  session: AuthSession | null,
  targetUserId: string | null | undefined
): { authorized: boolean; error: string | null; status: number } {
  if (!session) {
    return { authorized: false, error: 'Authentication required.', status: 401 };
  }

  const canonicalRole = normalizeRole(session.role);
  if (canonicalRole === 'SUPER_ADMIN') {
    return { authorized: true, error: null, status: 200 };
  }

  if (!targetUserId || session.userId !== targetUserId) {
    return {
      authorized: false,
      error: 'Forbidden. You cannot access or modify resources belonging to another user.',
      status: 403,
    };
  }

  return { authorized: true, error: null, status: 200 };
}

/**
 * Enforces granular administrative permission verification.
 */
export function requireAdminPermission(
  req: NextRequest,
  permission: AdminPermission
): RbacAuthResult {
  const roleCheck = requireRole(req, ['ADMIN', 'SUPER_ADMIN']);
  if (!roleCheck.authorized) {
    return roleCheck;
  }

  if (!hasPermission(roleCheck.session?.role, permission)) {
    return {
      authorized: false,
      error: `Forbidden. Missing required administrative permission '${permission}'.`,
      status: 403,
      session: roleCheck.session,
    };
  }

  return roleCheck;
}

