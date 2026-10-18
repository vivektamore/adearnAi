# AdEarn AI — Live Test Plan & Verification Strategy

## 1. Executive Overview

This document formalizes the comprehensive live testing protocol for **AdEarn AI**, India's institutional sponsored-content and voluntary creator rewards platform. The platform bridges three distinct portals (User, Advertiser, Admin) alongside a Chrome Manifest V3 companion extension, unified by an authoritative Next.js 14 backend, Prisma ORM, and MySQL 8.0 relational database.

The testing protocol verifies that all 20 Google Stitch AI reference designs are functionally wired to real backend endpoints, eliminate dummy fallback data in production paths, enforce double-entry integer paise accounting, and maintain strict tenant isolation and kinematic anti-fraud heuristics.

---

## 2. Environment Architecture & System Under Test

- **Web Framework:** Next.js 14.2.35 (React 18, App Router)
- **Programming Language:** TypeScript 5.6.3 (Strict Mode)
- **Database Engine:** MySQL 8.0 (Containerized / Local port 3306)
- **ORM / Persistence:** Prisma ORM 5.21.1
- **Authentication:** Bcrypt salted password hashing + Cryptographically signed JWT HTTP-only cookies
- **Financial Minor Unit:** Integer paise ($1 \text{ INR} = 100 \text{ paise}$)
- **Telemetry Verification:** Client-side kinematic event tracking (dwell time, cursor velocity, trajectory deviation)
- **Companion Extension:** Chrome Extension Manifest V3 (`extension/`)
- **Base URL:** `http://localhost:3000`

---

## 3. Test Personas & Security Credentials

All automated and manual browser tests execute against isolated test personas provisioned in the live MySQL database. No production accounts or real monetary movements are utilized.

| Persona Role | User Email | Role Tier | Authorized Scope | Seed Identifier |
| :--- | :--- | :--- | :--- | :--- |
| **Creator / End User** | `arun@creator.in` | `USER` (KYC Tier 1) | Personal dashboard, campaign discovery, task execution, personal wallet, withdrawal requests, support tickets | Screen 01 Persona (Arun Kumar) |
| **Advertiser / Brand Owner** | `advertiser@zerodha.in` | `ADVERTISER` (Org Owner) | Brand overview, campaign wizard, creative uploads, escrow wallet, campaign analytics, tax invoices | Zerodha Advisory Solutions India |
| **Moderation Reviewer** | `admin@adearn.ai` | `ADMIN` | Campaign moderation queue, creative review, approve/reject/request changes workflow | Operations Team |
| **Fraud & Risk Analyst** | `admin@adearn.ai` | `ADMIN` | Kinematic telemetry inspection, bot flag queue, device risk scoring | Fraud Prevention Desk |
| **Finance Operator** | `admin@adearn.ai` | `FINANCE_ADMIN` | Payout request queue, UPI/IMPS clearing simulation, ledger reconciliation | Finance Operations |
| **Super Administrator** | `admin@adearn.ai` | `SUPER_ADMIN` | Platform unit economics, platform liabilities, HMAC-SHA256 audit logs, system configuration | Platform Executive |

---

## 4. Screen-by-Screen Test Matrix (20 Stitch Screens)

### User Portal (Screens 01–07)
| Screen # | Route | Test Objectives | Key Controls to Validate |
| :--- | :--- | :--- | :--- |
| **01** | `/` | User Dashboard load, live balance display, active stats | Available balance, pending hold, lifetime earned, CTA to campaigns feed |
| **02** | `/campaigns` | Sponsored Feed discovery, live eligibility filter | Brand cards, reward values in INR, participation eligibility checks |
| **03** | `/campaigns/[id]` | Ad detail & interactive task session initiation | Server-issued task session token, task start timer, telemetry collection |
| **04** | `/wallet` | Reward Wallet & immutable dual-entry ledger | Available vs. Pending breakdown, transaction list, audit references |
| **05** | `/withdrawals` | Voluntary withdrawal request, bank/UPI destination | Amount input, "Withdraw All" calculation, overdraft validation, history table |
| **06** | `/profile` | Profile, KYC status, data consent preferences | KYC verification badge, DPDP consent toggles, bank account details |
| **07** | `/support` | Ticket submission, dispute status tracking | Support tickets table, new ticket modal, dispute status badges |

### Advertiser Portal (Screens 08–12)
| Screen # | Route | Test Objectives | Key Controls to Validate |
| :--- | :--- | :--- | :--- |
| **08** | `/advertiser` | Brand overview, spend analytics, active campaigns | Total spend, escrow balance, active campaign cards, new campaign CTA |
| **09** | `/advertiser/campaigns/new` | Multi-step campaign wizard, budget reservation | Objective selection, action type, reward per action, escrow allocation |
| **10** | `/advertiser/campaigns/[id]` | Creative & campaign review details | Assets preview, flight status, moderation feedback, budget progress |
| **11** | `/advertiser/analytics` | Campaign conversion metrics, engagement stats | Verified outcomes, effective CPO, dwell time averages, IVT rate |
| **12** | `/advertiser/billing` | Nodal escrow pool, top-up options, GST invoices | Escrow balance, RTGS/NEFT instructions, downloadable GST tax invoices |

### Admin Operations Portal (Screens 13–19)
| Screen # | Route | Test Objectives | Key Controls to Validate |
| :--- | :--- | :--- | :--- |
| **13** | `/admin` | Operations desk, platform escrow vs. user liabilities | Live metric cards, aggregate platform health, pending queue counts |
| **14** | `/admin/moderation` | Campaign moderation queue, compliance review | Approve/Reject/Request Changes buttons, mandatory audit reason dialog |
| **15** | `/admin/fraud` | Kinematic telemetry review, bot signal analysis | Macro-bot detection flags, dwell time deviations, risk score triggers |
| **16** | `/admin/payouts` | Withdrawal payout approvals & bank clearing simulation | Dual-approval trigger, bank settlement simulator, UTR assignment |
| **17** | `/admin/users` | User & Advertiser management, KYC controls | User status toggles, KYC tier adjustments, organization inspection |
| **18** | `/admin/analytics` | Platform unit economics, gross margins | Gross advertiser spend minus creator payouts = platform margin |
| **19** | `/admin/settings` | System configuration, tamper-evident audit logs | HMAC-SHA256 cryptographically chained audit log table, system toggles |

### Chrome Extension (Screen 20)
| Screen # | File / Route | Test Objectives | Key Controls to Validate |
| :--- | :--- | :--- | :--- |
| **20** | `extension/popup.html` (`/extension`) | Manifest V3 companion popup live sync | Cookie-based session fetch, available balance, pending hold, web portal link |

---

## 5. End-to-End Workflow Verification Protocols

### Workflow A: Creator Earning & Payout Lifecycle
1. Creator logs in via `/login` and receives signed JWT cookie.
2. Navigates to `/campaigns` to retrieve active sponsored feed from MySQL.
3. Selects active campaign and starts task via `POST /api/tasks/start`.
4. Tests kinematic fraud rejection (submitting zero mouse movement or $< 8\text{s}$ dwell time).
5. Submits valid human telemetry via `POST /api/tasks/submit`.
6. Verifies ledger credit transaction in MySQL (`CREDIT_REWARD`).
7. Tests double-submission prevention (idempotency key rejection).
8. Tests withdrawal overdraft rejection (attempting to withdraw balance + ₹1,000).
9. Submits valid withdrawal request via `POST /api/withdrawals/request`.
10. Finance clearing simulation transitions payout from `REQUESTED` to `CLEARED` with mock UTR.

### Workflow B: Brand Campaign Flight & Escrow Lifecycle
1. Brand owner authenticates and selects authorized organization.
2. Navigates to `/advertiser/campaigns/new`.
3. Configures title, action type, audience filters, reward per action, and total escrow budget.
4. Submits campaign; verifies atomic escrow lock in database (`ESCROW_LOCK`).
5. Confirms campaign status is `IN_REVIEW` and NOT visible in public user feed.
6. Admin moderation approves campaign (`POST /api/admin/moderation`).
7. Confirms campaign transitions to `ACTIVE` and appears in eligible creator feeds.

### Workflow C: Admin Operations & Forensic Audit
1. Admin inspects moderation queue, flags, and payout requests.
2. Executes moderation approval with reason code.
3. Verifies tamper-evident audit record generated with HMAC-SHA256 signature.
4. Calculates real-time platform unit economics: gross advertiser spend minus creator payouts.

### Workflow D: Chrome Companion Live Sync
1. Companion popup calls `GET /api/extension/session` with session cookie.
2. Checks available balance and pending hold against live creator wallet.
3. Creator completes activity on web portal.
4. Popup reloads; confirms immediate balance update without stale cache or hardcoded values.
5. Logs out; confirms popup gracefully transitions to unauthenticated state.

---

## 6. Failure Modes & Edge Case Assertions

1. **Overdraft Attack:** Immediate error `400 Bad Request` returned when requested withdrawal exceeds `availablePaise`.
2. **Replay / Duplicate Submission:** Identical `taskId` or `idempotencyKey` returns `409 Conflict` or idempotent cached response; zero duplicate ledger entries.
3. **Privilege Escalation:** Regular user attempting to access `/api/admin/*` receives `403 Forbidden`.
4. **Tenant Cross-Contamination:** Advertiser attempting to query or mutate another organization's campaign receives `403 Forbidden` / `404 Not Found`.
5. **Database Connection Interruption:** `/api/health` returns HTTP 503 with status `DEGRADED` and latency diagnostics.
6. **Zero-Interaction Botting:** Zero mouse movements or keypresses during task session generates a high-severity `BOT_ACTIVITY` fraud signal and blocks payout crediting.
