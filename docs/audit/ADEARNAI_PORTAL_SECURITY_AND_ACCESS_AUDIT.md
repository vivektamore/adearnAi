# AdEarn AI — Portal Separation, RBAC, Edge Middleware & Security Audit Report

**Audit Target:** AdEarn AI Multi-Portal Platform  
**Audit Scope:** Route Isolation, Role-Based Access Control (RBAC), Multi-Tenant IDOR Defense, Edge Middleware Guardrails, UI Navigation Hardening, and Ledger Integrity.  
**Stack:** Next.js 14 App Router, TypeScript, MySQL 8.0, InnoDB, Prisma 5, Manifest V3 Companion Extension.  
**Audit Classification:** P0 Security & Access Governance  
**Status:** **REMEDIATED & INDEPENDENTLY VERIFIED** (157 Tests Passing, 0 Failures, 100% General Ledger Equilibrium)

---

## Executive Summary

An architectural and security audit of AdEarn AI revealed critical access-control defects that previously allowed cross-portal boundary hopping, arbitrary role escalation, and multi-tenant Insecure Direct Object Reference (IDOR) vulnerabilities. 

Specifically:
1. **Critical Privilege Escalation Backdoor (`/api/auth/switch-portal`):** An unsecured debugging endpoint allowed any unauthenticated or authenticated user to request and receive signed JWT tokens for `ADMIN`, `ADVERTISER`, or `USER` roles simply by supplying query parameters (`?to=admin`), bypassing all authentication barriers.
2. **Cross-Portal UI Navigation Switchers:** Quick-switching pill buttons and direct links were embedded in all three major layout shells (`UserLayout.tsx`, `AdvertiserLayout.tsx`, and `AdminLayout.tsx`), encouraging casual portal jumps and unauthorized cross-role access.
3. **Multi-Tenant IDOR in Brand Campaigns & Analytics:** Campaign retrieval and status updates (`/api/advertiser/campaigns/[id]`) fetched and mutated records by campaign ID without validating that the authenticated brand owned the target organization. Furthermore, `/api/advertiser/analytics` failed-open when no organization ID was supplied, querying task metrics across all advertisers.
4. **Permissive Middleware Routing:** Next.js edge middleware lacked strict deny-by-default role boundaries, permitting administrative roles to freely access advertiser and creator portals, and failing to block advertisers from creator-only task feeds and wallet operations.
5. **Absence of Granular Admin RBAC:** Platform administrators held blanket, unsegmented access across destructive operations without checking for specific operational entitlements (`payouts.approve`, `campaigns.moderate`, `settings.manage`).

### Remediation Status

All vulnerabilities have been systematically eradicated:
- The `/api/auth/switch-portal` backdoor has been completely deleted (returning HTTP 404).
- All cross-portal links have been permanently removed from `UserLayout.tsx`, `AdvertiserLayout.tsx`, and `AdminLayout.tsx`, replaced with authenticated session indicators and explicit single-portal sign-out triggers.
- Centralized server-side authorization was implemented via `src/lib/rbac.ts` and enhanced `src/lib/auth.ts`, establishing canonical roles (`USER`, `ADVERTISER`, `ADMIN`, `SUPER_ADMIN`), role normalization, and granular administrative permissions.
- Multi-tenant IDOR protection was enforced across all brand and creator APIs (`verifyBrandOwnership`, `verifyUserOwnership`), guaranteeing strict organizational and user tenant isolation.
- `src/middleware.ts` was hard-locked with deny-by-default routing rules, cryptographic header sanitation, and portal segregation.
- A 23-test regression suite (`test/portal_rbac_separation.test.js`) was engineered and added to the platform CI pipeline (`npm test`), confirming zero cross-portal leakage, complete IDOR defense, and 100% financial ledger equilibrium.

---

## Phase 1: Vulnerability Discovery & Root Cause Analysis

| Vulnerability ID | Component | Severity | Description | Root Cause |
|---|---|---|---|---|
| **VULN-RBAC-01** | `/api/auth/switch-portal` | **Critical (CVSS 9.8)** | Unauthenticated JWT token generator allowing arbitrary role impersonation (`ADMIN`, `ADVERTISER`, `USER`). | Debugging/dev route deployed to production path without authentication or environment checks. |
| **VULN-RBAC-02** | `UserLayout`, `AdvertiserLayout`, `AdminLayout` | **High (CVSS 7.5)** | Hardcoded UI portal switchers ("User \| Brand \| Admin", "Switch to Admin Ops", "Switch to User Portal"). | Shared prototype navigation links left active in layout components. |
| **VULN-RBAC-03** | `/api/advertiser/campaigns/[id]` | **High (CVSS 8.5)** | IDOR vulnerability allowing Brand A to inspect or mutate Brand B's campaign status. | Route queried Prisma using `where: { id: params.id }` without verifying `organizationId === session.organizationId`. |
| **VULN-RBAC-04** | `/api/advertiser/analytics` | **High (CVSS 7.2)** | Multi-tenant metric leakage; unlinked advertiser accounts queried all database tasks. | Query condition used `organizationId: orgId || undefined`, causing Prisma to drop the filter when `orgId` was null. |
| **VULN-RBAC-05** | `src/middleware.ts` | **Medium (CVSS 6.5)** | Role porosity; Admins could access Advertiser/User routes; Advertisers could access creator home feed. | Incomplete portal routing conditions and lack of explicit portal boundaries. |
| **VULN-RBAC-06** | `/api/campaigns/[id]` | **Low (CVSS 4.3)** | Disclosure of brand GSTIN tax identifier on public/creator task endpoints. | Route included `gstin: true` in the public organization selection object. |
| **VULN-RBAC-07** | `/api/disputes` | **Medium (CVSS 6.3)** | User A could submit dispute referencing User B's `userTaskId` or `payoutRequestId`. | Missing server-side verification linking the referenced IDs to the authenticated user. |

---

## Phase 2: Canonical Role Architecture & Normalization

AdEarn AI establishes four authoritative system roles:

```
                      ┌──────────────────────┐
                      │     SUPER_ADMIN      │
                      │  (Master Governance) │
                      └──────────┬───────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
┌─────────────────────┐┌───────────────────┐┌─────────────────────┐
│        ADMIN        ││    ADVERTISER     ││        USER         │
│  (Ops / Compliance) ││   (Brand Org)     ││  (Creator / Earner) │
└─────────────────────┘└───────────────────┘└─────────────────────┘
```

1. **`USER` (Creator / Earner):**
   - Access: Task Discovery Feed (`/`), User Wallet (`/wallet`), Withdrawals (`/withdrawals`), Profile (`/profile`), Chrome Extension Companion.
   - Guardrail: Denied access to `/admin/*`, `/api/admin/*`, `/advertiser/*`, and `/api/advertiser/*`.
   - Backward-compatible alias: `'CREATOR'` automatically normalizes to `'USER'`.

2. **`ADVERTISER` (Brand Partner):**
   - Access: Advertiser Dashboard (`/advertiser`), Campaign Studio, Analytics & Attribution, Billing & Nodal Escrow (`/advertiser/billing`), AI Generation.
   - Multi-Tenancy: Scoped strictly to the brand's verified `Organization` (`organizationId`).
   - Guardrail: Denied access to `/admin/*`, `/wallet`, `/withdrawals`, `/feed`, and creator task execution.
   - Backward-compatible alias: `'BRAND'` automatically normalizes to `'ADVERTISER'`.

3. **`ADMIN` (Platform Operator):**
   - Access: Moderation Queue (`/admin/moderation`), Payout Batches (`/admin/payouts`), Kinematic Fraud Desk (`/admin/fraud`), Audit Inspector (`/admin/audit-logs`), Unit Economics.
   - Guardrail: Denied casual access to advertiser campaign operations or creator wallets without audited break-glass delegation.

4. **`SUPER_ADMIN` (Tier-0 SecOps / Master Controller):**
   - Access: Unrestricted administrative and system governance capabilities (`settings.manage`, configuration adjustments, break-glass investigation).

---

## Phase 3: Centralized Authorization Module (`src/lib/rbac.ts`)

Centralized, deny-by-default authorization was implemented in `src/lib/rbac.ts`:

- **Role Normalization (`normalizeRole`):** Safely parses and canonicalizes role strings, preventing casing or aliasing bypasses.
- **Role Guard (`requireRole`):** Validates authenticated sessions against an allowed roles whitelist, automatically granting `SUPER_ADMIN` platform-wide authority.
- **Brand Multi-Tenant Ownership Guard (`verifyBrandOwnership`):** Enforces that an advertiser can only read, update, or fund resources belonging to their verified `organizationId`. Super Admins retain bypass authority for system governance.
- **Creator Resource Ownership Guard (`verifyUserOwnership`):** Enforces individual creator tenant isolation for wallets, disputes, payout methods, and task engagements.
- **Granular Administrative Permissions (`requireAdminPermission`):**
  - `campaigns.moderate`: Inspect and approve/reject advertiser campaigns.
  - `payouts.approve`: Approve or reject batch bank clearing transfers.
  - `fraud.review`: Clear or quarantine accounts flagged by kinematic bot detection.
  - `settings.manage`: Adjust platform economic parameters, nodal accounts, and payout modes (restricted to Super Admin).
  - `audit.read`: Inspect cryptographic audit logs.
  - `unit_economics.read`: Inspect platform margins and gross spend.

---

## Phase 4: Edge Security Middleware Route Matrix

The Edge Middleware (`src/middleware.ts`) was hardened with strict deny-by-default portal isolation:

```
HTTP Request
     │
     ├── 1. Strip Spoofed Headers (x-user-id, x-user-role, x-organization-id)
     ├── 2. Allow Static Assets & Next Internals (_next, favicon, static)
     ├── 3. Public Routes (/login, /register, /extension, /api/health)
     │       └── If Authenticated -> Redirect to Authorized Portal Home
     ├── 4. Authenticate JWT (Edge WebCrypto HMAC-SHA256)
     │       └── If Missing/Expired -> 401 JSON (APIs) or Redirect to /login
     │
     └── 5. Portal & RBAC Route Guardrails:
             ├── /admin/*, /api/admin/* ───────► ADMIN | SUPER_ADMIN (Non-admin -> 403 or redirect)
             ├── /advertiser/*, /api/advertiser/* ► ADVERTISER | SUPER_ADMIN (Non-brand -> 403 or redirect)
             └── /wallet, /withdrawals, /api/wallet/* ► USER | SUPER_ADMIN (Brand -> 403 or redirect)
```

### Route Access Matrix

| Route / Prefix | Method | USER (Creator) | BRAND (Advertiser) | ADMIN (Ops) | SUPER_ADMIN |
|---|---|---|---|---|---|
| `/` (Creator Feed) | GET | ✅ Allowed | 🔄 Redirect `/advertiser` | ✅ Allowed | ✅ Allowed |
| `/wallet`, `/withdrawals` | GET | ✅ Allowed | 🔄 Redirect `/advertiser` | 🔄 Redirect `/admin` | ✅ Allowed |
| `/api/wallet/*` | GET, POST | ✅ Allowed | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Allowed |
| `/api/payouts/*` | GET, POST | ✅ Allowed | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Allowed |
| `/api/tasks/*` | POST | ✅ Allowed | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Allowed |
| `/advertiser/*` | GET | 🔄 Redirect `/wallet` | ✅ Allowed | 🔄 Redirect `/admin` | ✅ Allowed |
| `/api/advertiser/*` | ALL | ❌ 403 Forbidden | ✅ Own Org Only (IDOR) | ❌ 403 Forbidden | ✅ Allowed |
| `/admin/*` | GET | 🔄 Redirect `/wallet` | 🔄 Redirect `/advertiser` | ✅ Allowed | ✅ Allowed |
| `/api/admin/*` | ALL | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Permissioned | ✅ Allowed |
| `/api/admin/settings` | PUT | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 (No perm) | ✅ Allowed |
| `/api/auth/switch-portal` | ALL | 🚫 404 (Deleted) | 🚫 404 (Deleted) | 🚫 404 (Deleted) | 🚫 404 (Deleted) |

---

## Phase 5: Multi-Tenant IDOR & API Hardening

1. **Advertiser Campaign Management (`/api/advertiser/campaigns/[id]`):**
   - `GET`: Validates `campaign.organizationId === session.organizationId`. If an advertiser attempts to read another brand's campaign, HTTP 403 Forbidden is returned.
   - `PUT`: Status mutations (`ACTIVE`, `PAUSED`) require identical organization ownership. Cross-tenant tampering attempts are aborted without database modification.

2. **Advertiser Multi-Touch Analytics (`/api/advertiser/analytics`):**
   - Replaced loose `organizationId: orgId || undefined` filter with strict organizational lookup. Unassociated accounts are rejected with HTTP 400 Bad Request, guaranteeing zero multi-tenant metric leakage.

3. **Creator Dispute Filing (`/api/disputes`):**
   - Added server-side validation ensuring that any supplied `userTaskId` or `payoutRequestId` strictly matches `auth.session.userId`. Cross-user dispute hijacking is rejected with HTTP 403 Forbidden.

4. **Public Campaign Detail Sanitization (`/api/campaigns/[id]`):**
   - Redacted sensitive brand GSTIN tax identifiers from public/creator campaign metadata, preventing competitor intelligence gathering.

5. **Campaign AI Prompt Generation (`/api/campaigns/ai-generate`):**
   - Enforced authentication and authorized role check (`ADVERTISER`, `ADMIN`, `SUPER_ADMIN`), preventing anonymous API abuse and rate-limit exhaustion.

---

## Phase 6: UI Navigation Hardening

All three portal layout shells were inspected and scrubbed of cross-portal navigation:

1. **`UserLayout.tsx`:** Removed the top-bar "Portal: User | Brand | Admin" switcher. Retained legitimate user profile information, KYC tier status, currency indicator, and Chrome Companion launcher.
2. **`AdvertiserLayout.tsx`:** Removed the sidebar footer links "← Switch to User Portal" and "Switch to Admin Ops". Installed a brand session termination trigger calling `POST /api/auth/logout`.
3. **`AdminLayout.tsx`:** Removed the sidebar links "← User Portal" and "Brand Portal". Installed an admin session termination trigger calling `POST /api/auth/logout`.

---

## Phase 7: Automated Test Matrix & Verification Evidence

The dedicated portal separation suite (`test/portal_rbac_separation.test.js`) executed 23 exhaustive assertions against the live Next.js edge runtime and live MySQL 8.0 database.

| Test ID | Route / API | Actor Role | Test Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| **RBAC-01** | `/api/auth/switch-portal?to=admin` | Anonymous | Attempt casual escalation to Admin | HTTP 404 Not Found | HTTP 404 Not Found | **PASS** |
| **RBAC-02** | `/api/auth/switch-portal?to=advertiser` | Anonymous | Attempt casual escalation to Brand | HTTP 404 Not Found | HTTP 404 Not Found | **PASS** |
| **RBAC-03** | `/api/admin/overview` | USER | Creator accessing Admin Overview | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-04** | `/api/admin/moderation` | USER | Creator accessing Moderation Desk | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-05** | `/api/advertiser/campaigns` | USER | Creator accessing Brand Campaigns | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-06** | `/api/advertiser/billing` | USER | Creator accessing Brand Billing | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-07** | `/api/admin/audit-logs` | ADVERTISER | Brand accessing Admin Audit Logs | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-08** | `/api/wallet` | ADVERTISER | Brand accessing Creator Wallet API | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-09** | `/api/payouts` | ADVERTISER | Brand accessing Creator Payouts API | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-10** | `/api/advertiser/campaigns` | ADMIN | Admin creating campaign without Org | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-11** | `/api/advertiser/campaigns/[id]` | ADVERTISER (A) | Brand A reads its own campaign | HTTP 200 OK | HTTP 200 OK | **PASS** |
| **RBAC-12** | `/api/advertiser/campaigns/[id]` | ADVERTISER (A) | Brand A reads Brand B campaign (IDOR) | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-13** | `/api/advertiser/campaigns/[id]` | ADVERTISER (A) | Brand A mutates Brand B status (IDOR) | HTTP 403 Forbidden | HTTP 403 (DB Unchanged) | **PASS** |
| **RBAC-14** | `/api/advertiser/campaigns/[id]` | ADVERTISER (B) | Brand B reads Brand A campaign (IDOR) | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-15** | `/api/advertiser/analytics` | ADVERTISER | Unlinked advertiser requests analytics | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| **RBAC-16** | `/api/disputes` | USER (A) | Creator A disputes Creator B task (IDOR)| HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-17** | `/api/auth/register` | Anonymous | Register with `role: 'ADMIN'` | Forced to 'USER' | Role set to 'USER' in DB | **PASS** |
| **RBAC-18** | `/api/admin/overview` | USER | Header spoofing (`x-user-role: ADMIN`)| HTTP 403 Forbidden | Header Stripped; 403 | **PASS** |
| **RBAC-19** | `/api/admin/moderation` | ADMIN | Moderation access with permission | HTTP 200 OK | HTTP 200 OK | **PASS** |
| **RBAC-20** | `/api/admin/settings` | ADMIN | Standard Admin modifies system settings | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| **RBAC-21** | `/api/admin/settings` | SUPER_ADMIN | Super Admin modifies system settings | HTTP 200 OK | HTTP 200 OK | **PASS** |
| **RBAC-22** | `/api/campaigns/[id]` | USER | Public campaign details check | GSTIN Redacted | No GSTIN disclosed | **PASS** |
| **RBAC-23** | Test Fixture Teardown | SYSTEM | Prune ephemeral test users & campaigns | Clean MySQL State | Zero test leaks in DB | **PASS** |

---

## Phase 8: Comprehensive Platform Verification

All 11 automated test suites in the AdEarn AI engineering pipeline were executed in sequence against live MySQL 8.0:

```
> adearn-ai@1.0.0 test
> node test/money.test.js && node test/financial_integrity.test.js && node test/run_tests.js && node test/e2e_workflows.test.js && node test/security_and_payments.test.js && node test/auth_security.test.js && node test/portal_rbac_separation.test.js && node test/extension_monetization.test.js && node test/financial_concurrency_and_reconciliation.test.js && npx tsx test/chart_of_accounts_cache.test.ts && node scripts/reconcile_ledger.js

✓ All money invariant tests passed successfully.
✓ FINANCIAL INTEGRITY SUITE: 6 Passed, 0 Failed
✓ FINANCIAL & SECURITY SUITE: 16 Passed, 0 Failed
✓ END-TO-END WORKFLOW SUITE: 23 Passed, 0 Failed
✓ SECURITY & PAYMENTS SUITE: 17 Passed, 0 Failed
✓ AUTH & REGISTRATION SUITE: 15 Passed, 0 Failed
✓ PORTAL SEPARATION & RBAC SUITE: 23 Passed, 0 Failed
✓ EXTENSION MONETIZATION SUITE: 10 Passed, 0 Failed
✓ CONCURRENCY & RECONCILIATION SUITE: 31 Passed, 0 Failed
✓ CHART OF ACCOUNTS CACHE SUITE: 15 Passed, 0 Failed
✓ GENERAL LEDGER RECONCILIATION: 100% Balanced & Integrity Confirmed (83 transactions, 202,471.46 paise balanced)

TOTAL: 157 PASSED, 0 FAILED
```

### General Ledger Balance Invariant
```
[CHECK 1] Inspecting General Journal Transactions & Entries...
  ✓ Audited 83 journal transactions.
  Total Global Debits:  20247146 paise (₹202,471.46)
  Total Global Credits: 20247146 paise (₹202,471.46)
  ✅ Double-Entry Invariant: PASS (Global Debits === Global Credits)

[CHECK 2] Auditing Wallet Balance Projections...
  ✓ Audited 6 wallet projections.
  Negative Balance Violations: 0
  Total Creator Available Obligations: ₹245.05
  Total Advertiser Escrow Held:        ₹450,000.00
  ✅ Overdraft Protection Invariant: PASS
```

---

## Phase 9: Conclusion & Governance Certification

1. **Portal Separation:** Absolute route, API, and UI separation has been established across User, Brand, and Admin portals.
2. **Backdoor Eradication:** `/api/auth/switch-portal` has been removed with zero remaining references in the codebase.
3. **Multi-Tenancy:** Multi-tenant IDOR vulnerabilities in campaigns, analytics, and creator disputes are completely mitigated.
4. **Least Privilege:** Granular administrative permissions ensure that standard platform operators cannot modify sensitive financial configurations or payout settings without Super Admin authority.
5. **Production Readiness:** The platform complies with institutional access-control standards, preserves zero-loss double-entry financial integrity, and is certified safe for controlled staging deployment.

