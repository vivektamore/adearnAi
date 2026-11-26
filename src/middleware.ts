import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'adearn-ai-development-super-secret-jwt-key-2026-minimum-32-chars-long';

interface DecodedToken {
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADVERTISER' | 'ADMIN' | 'SUPER_ADMIN';
  organizationId?: string | null;
  exp?: number;
}

/**
 * Edge-compatible JWT parser and signature verification using native WebCrypto API
 */
async function verifyJwtEdge(token: string): Promise<DecodedToken | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // 1. Verify HMAC-SHA256 signature using WebCrypto
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert base64url to Uint8Array for verification
    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);
    const signatureBinary = base64UrlToUint8Array(signatureB64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBinary as unknown as BufferSource,
      dataToVerify as unknown as BufferSource
    );

    if (!isValid) return null;

    // 2. Parse payload
    const payloadJson = atob(base64UrlToBase64(payloadB64));
    const payload: DecodedToken = JSON.parse(payloadJson);

    // 3. Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

function base64UrlToBase64(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return base64;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64UrlToBase64(base64Url);
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Sanitizes redirect paths to strictly prevent Open Redirect attacks.
 * Disallows protocol schemes, external URLs, and double-slashes (//malicious.com).
 */
function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path) return '/';
  const trimmed = path.trim();
  // Must start with a single slash, not double slash, and must not contain ://
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('://')) {
    return trimmed;
  }
  return '/';
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Strip any client-supplied spoofed identity headers immediately
  const cleanHeaders = new Headers(req.headers);
  cleanHeaders.delete('x-user-id');
  cleanHeaders.delete('x-user-role');
  cleanHeaders.delete('x-user-email');
  cleanHeaders.delete('x-organization-id');

  // 2. Always allow public static assets, Next internals, and public images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') // Static files (.png, .svg, .js, .css, etc.)
  ) {
    return NextResponse.next();
  }

  // 3. Explicitly Public Routes
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/extension' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/ads') ||
    pathname === '/api/health' ||
    pathname === '/api/extension/session';

  // Extract session token from cookie or Authorization header
  let token = req.cookies.get('adearn_session')?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  const session = token ? await verifyJwtEdge(token) : null;

  // Redirect authenticated users away from /login or /register to their designated portal
  if (isPublicRoute) {
    if (session && (pathname === '/login' || pathname === '/register')) {
      if (session.role === 'ADMIN' || session.role === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      if (session.role === 'ADVERTISER' || (session.role as string) === 'BRAND') {
        return NextResponse.redirect(new URL('/advertiser', req.url));
      }
      return NextResponse.redirect(new URL('/', req.url));
    }
    return addSecurityHeaders(NextResponse.next({ request: { headers: cleanHeaders } }));
  }

  // 4. Unauthenticated requests to protected routes -> Reject or Redirect
  if (!session) {
    // For protected API endpoints, return JSON 401 instead of redirecting
    if (pathname.startsWith('/api/')) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Unauthorized. Authenticated session required.' },
          { status: 401 }
        )
      );
    }

    // For web pages, redirect to /login with sanitized redirect param
    const safeRedirect = sanitizeRedirectPath(pathname);
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', safeRedirect);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // 5. Strict Portal & RBAC Route Isolation

  // A. Admin Portal & APIs (/admin/*, /api/admin/*) -> ADMIN or SUPER_ADMIN ONLY
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      if (pathname.startsWith('/api/')) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Forbidden. Administrative credentials required.' },
            { status: 403 }
          )
        );
      }
      const dest = (session.role === 'ADVERTISER' || (session.role as string) === 'BRAND') ? '/advertiser' : '/wallet';
      return addSecurityHeaders(NextResponse.redirect(new URL(dest, req.url)));
    }
  }

  // B. Advertiser Portal & APIs (/advertiser/*, /api/advertiser/*) -> ADVERTISER / BRAND (or SUPER_ADMIN)
  if (pathname.startsWith('/advertiser') || pathname.startsWith('/api/advertiser')) {
    const isAdvertiser = session.role === 'ADVERTISER' || (session.role as string) === 'BRAND' || session.role === 'SUPER_ADMIN';
    if (!isAdvertiser) {
      if (pathname.startsWith('/api/')) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Forbidden. Advertiser organization account required.' },
            { status: 403 }
          )
        );
      }
      const dest = (session.role === 'ADMIN' || session.role === 'SUPER_ADMIN') ? '/admin' : '/wallet';
      return addSecurityHeaders(NextResponse.redirect(new URL(dest, req.url)));
    }
  }

  // C. Creator / User Portal & APIs
  // Web Pages: /, /wallet, /withdrawals, /tasks, /tasks/*, /task/*, /feed, /profile, /support, /extension
  const isUserPortalPage =
    pathname === '/' ||
    pathname === '/wallet' ||
    pathname === '/withdrawals' ||
    pathname === '/feed' ||
    pathname === '/tasks' ||
    pathname.startsWith('/task/') ||
    pathname === '/profile' ||
    pathname === '/support' ||
    pathname === '/extension';

  if (isUserPortalPage) {
    // Gracefully normalize /tasks to /feed
    if (pathname === '/tasks') {
      return addSecurityHeaders(NextResponse.redirect(new URL('/feed', req.url)));
    }
    if (session.role === 'ADVERTISER' || (session.role as string) === 'BRAND') {
      return addSecurityHeaders(NextResponse.redirect(new URL('/advertiser', req.url)));
    }
    if (session.role === 'ADMIN' || session.role === 'SUPER_ADMIN') {
      return addSecurityHeaders(NextResponse.redirect(new URL('/admin', req.url)));
    }
  }

  // API Creator Endpoints: (/api/wallet/*, /api/payouts/*, /api/payout-methods/*, /api/tasks/*)
  if (
    pathname.startsWith('/api/wallet') ||
    pathname.startsWith('/api/payouts') ||
    pathname.startsWith('/api/payout-methods') ||
    pathname.startsWith('/api/tasks')
  ) {
    if (session.role === 'ADVERTISER' || (session.role as string) === 'BRAND') {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Forbidden. Creator account required.' },
          { status: 403 }
        )
      );
    }
  }

  // 6. Allowed: Attach verified user info headers from cryptographic session
  cleanHeaders.set('x-user-id', session.userId);
  cleanHeaders.set('x-user-role', session.role);
  cleanHeaders.set('x-user-email', session.email);
  if (session.organizationId) {
    cleanHeaders.set('x-organization-id', session.organizationId);
  }

  const response = NextResponse.next({
    request: {
      headers: cleanHeaders,
    },
  });

  return addSecurityHeaders(response);
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
