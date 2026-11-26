# AdEarn AI — Complete Route Inventory

This inventory documents every public, authenticated, and privileged route across the User Portal, Brand Portal, Admin Portal, and System APIs.

---

## 1. Public & Authentication Routes

| Method | Route Path | Type | Role Requirement | Description |
|---|---|---|---|---|
| `GET` | `/` | Page | Public | Landing page and platform introduction |
| `GET` | `/login` | Page | Public | Centralized authentication portal |
| `GET` | `/register` | Page | Public | Creator user registration page |
| `POST` | `/api/auth/register` | API | Public | Creates Creator user and initial 0-paise wallet |
| `POST` | `/api/auth/login` | API | Public | Authenticates credentials and issues signed JWT |
| `POST` | `/api/auth/logout` | API | Authenticated | Clears `adearn_session` cookie |
| `GET` | `/api/auth/session` | API | Authenticated | Inspects active session identity and role |

---

## 2. Creator / User Portal Routes (`/dashboard`, `/tasks`, `/wallet`, etc.)

| Method | Route Path | Type | Role Requirement | Description |
|---|---|---|---|---|
| `GET` | `/dashboard` | Page | `USER`, `ADMIN` | Creator overview, earnings, and active tasks |
| `GET` | `/tasks` | Page | `USER`, `ADMIN` | Sponsored content and task discovery feed |
| `GET` | `/tasks/[id]` | Page | `USER`, `ADMIN` | Interactive task execution sandbox |
| `GET` | `/wallet` | Page | `USER`, `ADMIN` | Real-time ledger balances and transaction log |
| `GET` | `/withdrawals` | Page | `USER`, `ADMIN` | Voluntary payout requests and destination config |
| `GET` | `/profile` | Page | `USER`, `ADMIN` | KYC verification and profile settings |
| `GET` | `/help` | Page | `USER`, `ADMIN` | Dispute submission and support tickets |
| `GET` | `/extension` | Page | `USER`, `ADMIN` | Chrome Companion Extension pairing & stats |
| `GET` | `/api/user/overview` | API | `USER`, `ADMIN` | Real-time wallet balances, active tasks, KYC tier |
| `GET` | `/api/campaigns` | API | `USER`, `ADMIN` | Active sponsored campaigns available to user |
| `POST` | `/api/tasks/start` | API | `USER`, `ADMIN` | Initiates task session and issues telemetry token |
| `POST` | `/api/tasks/submit` | API | `USER`, `ADMIN` | Submits telemetry proof and credits reward |
| `GET` | `/api/wallet/transactions` | API | `USER`, `ADMIN` | Historical sub-ledger transactions |
| `GET` | `/api/payouts` | API | `USER`, `ADMIN` | User withdrawal history and active methods |
| `POST` | `/api/payouts` | API | `USER`, `ADMIN` | Requests voluntary payout to UPI or Bank |
| `POST` | `/api/payouts/methods` | API | `USER`, `ADMIN` | Registers a new UPI ID or Bank Account |
| `DELETE` | `/api/payouts/methods` | API | `USER`, `ADMIN` | Deactivates an existing payout destination |
| `POST` | `/api/disputes` | API | `USER`, `ADMIN` | Creates dispute ticket for flagged task |

---

## 3. Brand / Advertiser Portal Routes (`/advertiser/*`)

| Method | Route Path | Type | Role Requirement | Description |
|---|---|---|---|---|
| `GET` | `/advertiser` | Page | `ADVERTISER`, `ADMIN` | Brand overview, spend, escrow pool, and CPO |
| `GET` | `/advertiser/campaigns` | Page | `ADVERTISER`, `ADMIN` | Portfolio of created campaigns |
| `GET` | `/advertiser/campaigns/new` | Page | `ADVERTISER`, `ADMIN` | Campaign creation wizard |
| `GET` | `/advertiser/campaigns/[id]` | Page | `ADVERTISER`, `ADMIN` | Campaign detail and performance metrics |
| `GET` | `/advertiser/campaigns/[id]/edit` | Page | `ADVERTISER`, `ADMIN` | Campaign configuration editor |
| `GET` | `/advertiser/analytics` | Page | `ADVERTISER`, `ADMIN` | Real-time attribution and kinematic telemetry |
| `GET` | `/advertiser/billing` | Page | `ADVERTISER`, `ADMIN` | Escrow deposit, double-entry ledger & invoices |
| `GET` | `/api/advertiser/overview` | API | `ADVERTISER`, `ADMIN` | Metrics, unreserved escrow, and campaigns count |
| `GET` | `/api/advertiser/campaigns` | API | `ADVERTISER`, `ADMIN` | List campaigns owned by user's organization |
| `POST` | `/api/advertiser/campaigns` | API | `ADVERTISER`, `ADMIN` | Create campaign with atomic escrow allocation |
| `PATCH` | `/api/advertiser/campaigns/[id]` | API | `ADVERTISER`, `ADMIN` | Toggle campaign status (`ACTIVE` <-> `PAUSED`) |
| `GET` | `/api/advertiser/analytics` | API | `ADVERTISER`, `ADMIN` | Dwell times, retention curves, attribution breakdown |
| `GET` | `/api/advertiser/billing` | API | `ADVERTISER`, `ADMIN` | Invoices, wallet balance, GST breakdowns |
| `POST` | `/api/advertiser/billing/deposit` | API | `ADVERTISER`, `ADMIN` | Funds escrow pool via simulated netbanking/UPI |

---

## 4. Admin Portal Routes (`/admin/*`)

| Method | Route Path | Type | Role Requirement | Permission Flag | Description |
|---|---|---|---|---|---|
| `GET` | `/admin` | Page | `ADMIN`, `SUPER_ADMIN` | `dashboard.read` | Operations Overview Dashboard |
| `GET` | `/admin/moderation` | Page | `ADMIN`, `SUPER_ADMIN` | `campaigns.moderate` | Campaign Moderation Desk |
| `GET` | `/admin/fraud-lab` | Page | `ADMIN`, `SUPER_ADMIN` | `fraud.review` | Fraud & Kinematics Lab (Canonical) |
| `GET` | `/admin/fraud` | Page | `ADMIN`, `SUPER_ADMIN` | `fraud.review` | Fraud Lab Route Alias |
| `GET` | `/admin/payouts` | Page | `ADMIN`, `SUPER_ADMIN` | `payouts.approve` | Payout Clearing & Nodal Settlement |
| `GET` | `/admin/audit-logs` | Page | `ADMIN`, `SUPER_ADMIN` | `audit.read` | Immutable Audit Trail & Logs |
| `GET` | `/admin/analytics` | Page | `ADMIN`, `SUPER_ADMIN` | `unit_economics.read` | Unit Economics & Margins (Canonical) |
| `GET` | `/admin/unit-economics` | Page | `ADMIN`, `SUPER_ADMIN` | `unit_economics.read` | Unit Economics Route Alias |
| `GET` | `/admin/settings` | Page | `ADMIN`, `SUPER_ADMIN` | `dashboard.read` | Platform Settings & Configuration |
| `GET` | `/api/admin/overview` | API | `ADMIN`, `SUPER_ADMIN` | `dashboard.read` | Global metrics, nodal escrow, audit stream |
| `GET` | `/api/admin/moderation` | API | `ADMIN`, `SUPER_ADMIN` | `campaigns.moderate` | Fetch campaigns in review queue |
| `POST` | `/api/admin/moderation` | API | `ADMIN`, `SUPER_ADMIN` | `campaigns.moderate` | Approve, reject, or pause campaign |
| `GET` | `/api/admin/fraud` | API | `ADMIN`, `SUPER_ADMIN` | `fraud.review` | Fetch flagged sessions and IVT summary |
| `POST` | `/api/admin/fraud` | API | `ADMIN`, `SUPER_ADMIN` | `fraud.review` | Quarantine user or clear anomaly |
| `GET` | `/api/admin/payouts` | API | `ADMIN`, `SUPER_ADMIN` | `payouts.approve` | Fetch withdrawal requests and nodal stats |
| `POST` | `/api/admin/payouts` | API | `ADMIN`, `SUPER_ADMIN` | `payouts.approve` | Batch approve or reject payouts |
| `GET` | `/api/admin/audit-logs` | API | `ADMIN`, `SUPER_ADMIN` | `audit.read` | Paginated search of system audit events |
| `GET` | `/api/admin/unit-economics`| API | `ADMIN`, `SUPER_ADMIN`| `unit_economics.read`| Dynamic spend, margins, take-rate % |
| `GET` | `/api/admin/settings` | API | `ADMIN`, `SUPER_ADMIN` | `dashboard.read` | Global platform settings |
| `PUT` | `/api/admin/settings` | API | `SUPER_ADMIN` only | `settings.manage` | Mutates system setting & writes audit log |

---

## 5. Extension & Ad-Serving APIs (`/api/ads/*`, `/api/extension/*`)

| Method | Route Path | Type | Role Requirement | Description |
|---|---|---|---|---|
| `GET` | `/api/ads/serve` | API | `USER`, `ADMIN` | Delivers active funded campaigns to extension |
| `POST` | `/api/ads/impression` | API | `USER`, `ADMIN` | Verifies viewability dwell and records CPM credit |
| `GET` | `/api/extension/session` | API | `USER`, `ADMIN` | Extension session status, balances and pairing |

