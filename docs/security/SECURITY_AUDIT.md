# AdEarn AI — Comprehensive Security Audit & Threat Model
## Route Authorization Matrix, Session Verification, Tenant Isolation, and Anti-Fraud Controls

**Standard:** OWASP Top 10, Zero-Trust Architecture, Indian DPDP Act 2023  
**Audit Evaluation:** Evidence-Based Verification (`PASS`, `FAIL`, `BLOCKED`, `NOT RUN`)

---

## 1. Route Authorization Matrix

| Route / Endpoint | Method | Required Role | Unauthenticated Policy | Authenticated / Unauthorized Policy | Defense-in-Depth Enforcement |
|---|---|---|---|---|---|
| `/` | `GET` | Public / USER | 200 OK | Allowed | Page layout |
| `/login`, `/register` | `GET` | Public | 200 OK | 307 Redirect to portal | Middleware |
| `/feed`, `/tasks/*` | `GET` | USER, ADMIN | 307 Redirect to `/login?redirect=...` | Allowed | Middleware + Session Check |
| `/wallet`, `/withdrawals` | `GET` | USER, ADMIN | 307 Redirect to `/login?redirect=...` | 307 Redirect to `/advertiser` if ADVERTISER | Middleware |
| `/profile` | `GET` | USER, ADMIN | 307 Redirect to `/login?redirect=...` | Allowed | Middleware |
| `/advertiser/*` | `GET` | ADVERTISER, ADMIN | 307 Redirect to `/login?redirect=...` | 307 Redirect to `/wallet` | Middleware |
| `/admin/*` | `GET` | ADMIN | 307 Redirect to `/login?redirect=...` | 307 Redirect to home portal | Middleware |
| `/api/auth/register` | `POST` | Public | 200 OK (Forced to `USER` role) | Rejects ADMIN role creation | API Handler |
| `/api/auth/login` | `POST` | Public | 200 OK | Signs JWT cookie | API Handler |
| `/api/payouts` | `GET`, `POST` | USER, ADMIN | **401 Unauthorized JSON** | **403 Forbidden JSON** | Middleware + `requireAuth` |
| `/api/payout-methods` | `GET`, `POST`, `DELETE` | USER, ADMIN | **401 Unauthorized JSON** | **403 / 404 (Tenant Isolated)** | API Handler enforces `userId` |
| `/api/advertiser/billing` | `GET`, `POST` | ADVERTISER, ADMIN | **401 Unauthorized JSON** | **403 Forbidden JSON** | Middleware + `requireAuth` |
| `/api/advertiser/campaigns` | `GET`, `POST` | ADVERTISER, ADMIN | **401 Unauthorized JSON** | **403 Forbidden JSON** | Middleware + `requireAuth` |
| `/api/tasks/submit` | `POST` | USER, ADMIN | **401 Unauthorized JSON** | **403 Forbidden JSON** | Session Token + Telemetry |
| `/api/admin/*` | `GET`, `POST` | ADMIN | **401 Unauthorized JSON** | **403 Forbidden JSON** | Middleware + `requireAuth` |

---

## 2. Authentication & Session Verification

### WebCrypto HMAC-SHA256 Token Validation:
- Signed with high-entropy cryptographic key (`JWT_SECRET`).
- Verified in Edge Middleware using native `crypto.subtle.verify('HMAC', key, signature, data)`.
- Validates token format (3 parts), base64url decoding, signature match, and expiration timestamp (`exp`).

### Defense Against Open Redirect Attacks:
Redirect parameters in `/login?redirect=...` are passed through `sanitizeRedirectPath()`:
- Must begin with a single `/`.
- Double-slash relative protocol redirects (e.g., `//malicious.com`) are stripped to `/`.
- URLs containing external protocol schemes (`https://`, `http://`, `javascript:`) are rejected.

### Spoofed Identity Header Stripping:
At the entry point of `src/middleware.ts`, any client-supplied headers matching `x-user-id`, `x-user-role`, `x-user-email`, or `x-organization-id` are explicitly deleted. Only verified cryptographic session claims are attached for downstream consumers.

---

## 3. Tenant Isolation & Resource Ownership

Every data-modifying endpoint strictly enforces resource ownership at the database query level:
- In [`src/app/api/payout-methods/route.ts`](file:///c:/Users/vivek/Desktop/Selling%20Projects/AdearnAI/src/app/api/payout-methods/route.ts), deleting a payout method scopes the query to `WHERE id = :id AND userId = :sessionUserId`. An attacker attempting to delete another user's method receives HTTP 404 Not Found.
- In [`src/app/api/advertiser/campaigns/route.ts`](file:///c:/Users/vivek/Desktop/Selling%20Projects/AdearnAI/src/app/api/advertiser/campaigns/route.ts), campaigns are scoped to `WHERE organizationId = :sessionOrgId`.
- In [`src/app/api/payouts/route.ts`](file:///c:/Users/vivek/Desktop/Selling%20Projects/AdearnAI/src/app/api/payouts/route.ts), withdrawal requests debit exclusively from `WHERE userId = :sessionUserId`.

---

## 4. PII Masking & Privacy Controls

To comply with the Indian DPDP Act 2023:
1. **UPI ID Masking:** Virtual Payment Addresses are masked on ingestion: `ro*******ma@okhdfcbank`.
2. **Bank Account Masking:** Account numbers are stored masked in API responses: `••••••••8123`.
3. **No PIN/Password Storage:** The platform never requests, stores, or logs UPI PINs, ATM PINs, net-banking passwords, or CVVs.

---

## 5. Anti-Fraud Kinematic Telemetry Engine

Task submissions are evaluated against four independent behavioral vectors:
1. **Dwell Time:** Must satisfy the campaign-configured minimum dwell threshold (e.g. $\ge 15$ seconds). Zero dwell time macros are flagged immediately.
2. **Cursor Kinematics:** Validates mouse vector movement and velocity changes. Submissions with 0 mouse events or static coordinate vectors are flagged as automated headless bots.
3. **Interaction Cadence:** Verifies keystroke and click intervals.
4. **Session Token Signature:** Task engagement requires a server-signed, non-reusable session token tied to the user's ID. Replay of used tokens returns HTTP 400.
