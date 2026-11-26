# AUTHENTICATION & SECURITY MIDDLEWARE AUDIT REPORT
**AdEarn AI — Next.js App Router Architecture**  
**Audit Date:** October 18, 2026  
**Auditor:** Senior Next.js Security Engineer, Financial Systems Architect & Database Engineer  
**Status:** ALL DEFECTS CORRECTED, TESTED & VERIFIED  

---

## 1. Executive Summary

An architectural and security audit of the AdEarn AI platform identified critical vulnerabilities that allowed portal route bypasses, unauthorized access to sensitive financial endpoints, and public privilege escalation.

Prior to this intervention:
1. Next.js served portal pages (`/admin`, `/advertiser`, `/wallet`, `/withdrawals`, `/profile`) directly to unauthenticated visitors because no `middleware.ts` existed in the root or `src/` directory.
2. Route handlers under `/api` relied strictly on manual per-route guards (`requireAuth`). Any missing check would expose sensitive user or ledger data.
3. Public user registration (`POST /api/auth/register`) accepted arbitrary role assignments from the client, allowing visitors to register as `ADMIN`.
4. Authentication sessions set in cookies were not authoritatively validated at the edge before rendering server layouts.

All defects have been systematically remediated with zero-downtime, zero-data-loss, and full preservation of existing Stitch UI screens and MySQL database records.

---

## 2. Vulnerability & Defect Inventory

### Defect 1: Total Absence of Edge Security Middleware
- **Source File:** Missing `src/middleware.ts` (Now implemented)
- **Root Cause:** Next.js App Router served client components and portal layouts without an authoritative edge gatekeeper. Unauthenticated HTTP GET requests returned `HTTP 200 OK`.
- **Affected Routes:** `/admin/*`, `/advertiser/*`, `/wallet`, `/withdrawals`, `/campaigns`, `/tasks`, `/profile`, `/disputes`, `/api/*`.
- **Security Implication:** CRITICAL. Unauthenticated callers could directly inspect portal layout shells, trigger unauthenticated client fetch queries, and bypass server page guards.
- **Correction:** Implemented `src/middleware.ts` operating on Next.js Edge runtime utilizing WebCrypto `crypto.subtle` HMAC-SHA256 signature verification and `atob()` payload decoding. Non-authenticated visitors attempting to access protected pages receive an immediate `HTTP 307 Temporary Redirect` to `/login?redirect=<target>`. Protected `/api/*` endpoints return `HTTP 401 Unauthorized` JSON.
- **Test Case:** Automated test verified `curl.exe -I http://localhost:3000/admin` returns `HTTP 307 Temporary Redirect` with `Location: /login?redirect=%2Fadmin`. API tests verified `curl.exe -I http://localhost:3000/api/payouts` returns `HTTP 401 Unauthorized`.

---

### Defect 2: Role Escalation in Public Registration
- **Source File:** `src/app/api/auth/register/route.ts`
- **Root Cause:** The registration handler took `body.role` directly from the client JSON payload: `role = body.role || 'USER'`.
- **Affected Route:** `POST /api/auth/register`
- **Security Implication:** CRITICAL. Any public visitor or script could forge a registration request with `{"role": "ADMIN"}` and immediately gain super-administrator privileges over moderation, system settings, and payout clearances.
- **Correction:** Enforced strict server-side canonical role assignment:
  ```typescript
  const assignedRole = role === 'ADVERTISER' ? 'ADVERTISER' : 'USER';
  ```
  Public registration is strictly constrained to `USER` (creator) and `ADVERTISER`. Administrative roles (`ADMIN`) cannot be self-provisioned and require direct database provisioning or dual-approved administrative authorization.
- **Test Case:** Test `Public registration cannot create ADMIN role` attempts registration with `role: "ADMIN"`; asserts that the returned user record has canonical role `USER`. Verified in automated test suite.

---

### Defect 3: Cross-Portal Role Boundary Leaks
- **Source File:** `src/middleware.ts` & `src/lib/auth.ts`
- **Root Cause:** Authenticated creator users (`USER`) could attempt to access `/admin` or `/advertiser` routes without early edge-level rejection.
- **Affected Routes:** `/admin/*`, `/advertiser/*`, `/api/admin/*`, `/api/advertiser/*`.
- **Security Implication:** HIGH. Horizontal and vertical privilege escalation vectors; unnecessary backend computation on unauthorized requests.
- **Correction:** Edge middleware classifies routes by required role:
  - `/admin/*` & `/api/admin/*`: Strict `ADMIN` role required. Non-admin redirected to `/wallet` (or `/advertiser` for advertisers).
  - `/advertiser/*` & `/api/advertiser/*`: `ADVERTISER` or `ADMIN` required.
  - `/wallet`, `/withdrawals`, `/profile`: Creator portal routes. Advertisers attempting to access are routed to `/advertiser`.
  - All protected APIs enforce HTTP 403 Forbidden with descriptive JSON if an authenticated actor lacks role permissions.
- **Test Case:** Authenticated creator token accessing `/admin` redirects to `/wallet`; calling `/api/admin/overview` returns `HTTP 403 Forbidden`. Passed in automated test suite.

---

### Defect 4: Session Cookie & Header Desynchronization
- **Source File:** `src/lib/auth.ts`, `src/middleware.ts`
- **Root Cause:** Session cookies (`adearn_session`) were parsed inconsistently between Edge runtime and Node.js server handlers. Node.js `jsonwebtoken` was incompatible with Edge runtime without polyfills.
- **Affected Routes:** All protected routes.
- **Security Implication:** MEDIUM. Risk of edge runtime crash or intermittent authentication bypass under high concurrency.
- **Correction:** Implemented native WebCrypto HMAC-SHA256 token verification within `src/middleware.ts`. Injected downstream identity headers (`x-user-id`, `x-user-role`, `x-user-email`, `x-organization-id`) into the forwarded request, allowing server components to access validated claims without redundant token decoding.
- **Test Case:** End-to-end verified with both browser agent and curl sessions.

---

## 3. Defense-in-Depth Security Headers

The Edge Middleware enforces strict institutional security headers on every response:

```http
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
```

These headers protect against clickjacking, MIME-sniffing, cross-site framing, and reflective script injection.

---

## 4. Audit Sign-Off

| Metric | Pre-Audit State | Post-Remediation State |
| :--- | :--- | :--- |
| **Edge Route Barrier** | ❌ None (HTTP 200 on all routes) | ✅ Edge WebCrypto HMAC-SHA256 gatekeeper |
| **Unauthenticated Redirection** | ❌ FAILED | ✅ HTTP 307 Redirect to `/login?redirect=...` |
| **API Unauthorized Rejection** | ⚠️ Inconsistent per-route | ✅ HTTP 401 JSON at Edge & Route level |
| **RBAC Enforcement** | ⚠️ Route-level only | ✅ Dual-layer (Edge + Authoritative Route Guard) |
| **Public Privilege Escalation** | ❌ VULNERABLE (`ADMIN` registration) | ✅ FORBIDDEN (Strict server assignment) |
| **Audit Status** | **NON-COMPLIANT** | **PASSED & PRODUCTION READY** |
