# CANONICAL ROLE & ROUTE ACCESS MATRIX
**AdEarn AI — Authorization Boundaries & Access Control Governance**  
**Document Version:** 1.0.0  
**Effective Date:** October 18, 2026  

---

## 1. Role Definitions & Access Boundaries

| Role Code | Display Name | Core Responsibilities & Privileges | Strict Restrictions |
| :--- | :--- | :--- | :--- |
| **PUBLIC** | Anonymous Visitor | Browse landing page, public legal policies, view documentation, log in, register. | Cannot view any portal data, balances, or call private endpoints. |
| **USER** | Creator / Earner | Browse sponsored campaigns, start tasks, complete verified surveys/trials, view personal wallet & ledger, add/manage personal payout methods, withdraw funds (min ₹100), submit disputes. | Cannot approve payouts, access other users' data, view advertiser billing, or access admin moderation. |
| **ADVERTISER** | Brand / Organization | Manage company profile, create campaigns, upload creative assets, submit campaigns for review, fund nodal escrow reserve, view organization analytics & tax invoices. | Cannot approve their own campaigns, view creator personal banking data, or credit rewards directly. |
| **ADMIN** | Super Administrator / Operations | Review and moderate submitted campaigns, inspect telemetry fraud incidents, manage payout clearing batches, dual-approval compliance audits, inspect cryptographic audit logs, update system settings. | Bound by dual-approval requirements for high-value clearances; all actions permanently recorded in HMAC-SHA256 audit log. |

---

## 2. Page Routes Access Matrix

| Route Pattern | Target Portal | Public | Creator (`USER`) | Advertiser (`ADVERTISER`) | Admin (`ADMIN`) | Unauthorized Behavior |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `/` | Landing Page | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow | Allowed for all |
| `/login` | Authentication | ✅ Allow | 🔄 Redirect (`/wallet`) | 🔄 Redirect (`/advertiser`) | 🔄 Redirect (`/admin`) | Redirects authenticated actors to home |
| `/register` | Public Onboarding | ✅ Allow | 🔄 Redirect (`/wallet`) | 🔄 Redirect (`/advertiser`) | 🔄 Redirect (`/admin`) | Public registration constrained to USER/ADVERTISER |
| `/feed` | Campaign Discovery | ❌ Deny | ✅ Allow | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login?redirect=%2Ffeed` |
| `/wallet` | Creator Wallet & Ledger | ❌ Deny | ✅ Allow | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login?redirect=%2Fwallet` |
| `/withdrawals` | Screen 05 (Payouts) | ❌ Deny | ✅ Allow | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login?redirect=%2Fwithdrawals` |
| `/profile` | Screen 06 (Preferences) | ❌ Deny | ✅ Allow | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login?redirect=%2Fprofile` |
| `/tasks` | Active Task Tracker | ❌ Deny | ✅ Allow | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login?redirect=%2Ftasks` |
| `/task/[id]` | Task Execution Session | ❌ Deny | ✅ Allow | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login` |
| `/disputes` | Dispute Resolution Desk | ❌ Deny | ✅ Allow | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login` |
| `/advertiser` | Advertiser Dashboard | ❌ Deny | 🔄 Redirect (`/wallet`) | ✅ Allow | ✅ Allow | 307 Redirect to `/login?redirect=%2Fadvertiser` |
| `/advertiser/campaigns/*` | Campaign Manager & Wizard | ❌ Deny | 🔄 Redirect (`/wallet`) | ✅ Allow | ✅ Allow | 307 Redirect to `/login` |
| `/advertiser/analytics` | Advertiser Analytics | ❌ Deny | 🔄 Redirect (`/wallet`) | ✅ Allow | ✅ Allow | 307 Redirect to `/login` |
| `/advertiser/billing` | Screen 12 (Funding) | ❌ Deny | 🔄 Redirect (`/wallet`) | ✅ Allow | ✅ Allow | 307 Redirect to `/login` |
| `/admin` | Admin Overview | ❌ Deny | 🔄 Redirect (`/wallet`) | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login?redirect=%2Fadmin` |
| `/admin/moderation` | Campaign Moderation Desk | ❌ Deny | 🔄 Redirect (`/wallet`) | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login` |
| `/admin/payouts` | Screen 16 (Nodal Clearing) | ❌ Deny | 🔄 Redirect (`/wallet`) | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login` |
| `/admin/analytics` | Platform Unit Economics | ❌ Deny | 🔄 Redirect (`/wallet`) | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login` |
| `/admin/fraud-lab` | Telemetry Forensics | ❌ Deny | 🔄 Redirect (`/wallet`) | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login` |
| `/admin/audit-logs` | Cryptographic Audit Chain | ❌ Deny | 🔄 Redirect (`/wallet`) | 🔄 Redirect (`/advertiser`) | ✅ Allow | 307 Redirect to `/login` |

---

## 3. REST API Handlers Access Matrix

| API Route | HTTP Method | Public | Creator (`USER`) | Advertiser (`ADVERTISER`) | Admin (`ADMIN`) | Unauthenticated Status | Unauthorized Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/auth/login` | POST | ✅ | ✅ | ✅ | ✅ | — | — |
| `/api/auth/register` | POST | ✅ | ❌ | ❌ | ❌ | — | Role locked to USER/ADVERTISER |
| `/api/auth/logout` | POST | ✅ | ✅ | ✅ | ✅ | — | — |
| `/api/auth/session` | GET | 401 | ✅ | ✅ | ✅ | 401 JSON | — |
| `/api/health` | GET | ✅ | ✅ | ✅ | ✅ | — | — |
| `/api/user/profile` | GET / PUT | 401 | ✅ | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/payout-methods` | GET / POST | 401 | ✅ | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/payout-methods` | PUT / DELETE | 401 | ✅ (Owner) | 403 | ✅ | 401 JSON | 404 (Tenant Isolation) |
| `/api/payouts` | GET / POST | 401 | ✅ | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/wallet` | GET | 401 | ✅ | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/campaigns` | GET | 401 | ✅ | ✅ | ✅ | 401 JSON | — |
| `/api/tasks` | GET / POST | 401 | ✅ | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/disputes` | GET / POST | 401 | ✅ | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/advertiser/overview` | GET | 401 | 403 | ✅ | ✅ | 401 JSON | 403 Forbidden |
| `/api/advertiser/campaigns` | GET / POST | 401 | 403 | ✅ | ✅ | 401 JSON | 403 Forbidden |
| `/api/advertiser/billing` | GET / POST | 401 | 403 | ✅ | ✅ | 401 JSON | 403 Forbidden |
| `/api/advertiser/analytics` | GET | 401 | 403 | ✅ | ✅ | 401 JSON | 403 Forbidden |
| `/api/admin/overview` | GET | 401 | 403 | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/admin/moderation` | GET / POST | 401 | 403 | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/admin/payouts` | GET / POST | 401 | 403 | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/admin/audit-logs` | GET | 401 | 403 | 403 | ✅ | 401 JSON | 403 Forbidden |
| `/api/extension/session` | GET | ✅ | ✅ | ✅ | ✅ | Returns active or anonymous status |

---

## 4. Enforcement Architecture

1. **Edge Middleware Barrier (`src/middleware.ts`):** Evaluated for every HTTP request before route rendering or handler compilation.
2. **Authoritative Handler Verification (`src/lib/auth.ts` -> `requireAuth`):** Evaluated inside the route handler using the signed request context, guaranteeing authorization even if edge middleware were bypassed by direct internal dispatch.
3. **Tenant Data Scoping:** All queries include explicit user or organization criteria (`where: { userId: session.userId }` or `where: { organizationId: session.organizationId }`), preventing cross-tenant data access.
