# API Specification & Endpoints Reference — AdEarn AI

AdEarn AI exposes a modular REST API built with Next.js App Router route handlers. All responses are JSON with consistent error formats and HTTP status codes.

---

## 1. Authentication & Sessions

### `POST /api/auth/register`
Creates a new User account.
- **Request Body**:
  ```json
  { "email": "user@domain.in", "password": "...", "name": "Arun Kumar", "role": "USER", "organizationName": "Optional" }
  ```
- **Response**: `201 Created` with session cookie and user profile.

### `POST /api/auth/login`
Authenticates a user and sets an HttpOnly JWT cookie.
- **Request Body**:
  ```json
  { "email": "user@domain.in", "password": "..." }
  ```
- **Response**: `200 OK` `{ "token": "...", "user": { ... } }`

### `GET /api/auth/me`
Retrieves current authenticated session profile and role.

### `POST /api/auth/logout`
Clears session cookie and invalidates client session.

---

## 2. User & Rewards Endpoints

### `GET /api/user/dashboard`
Returns authenticated user metrics: available balance, pending balance, approved balance, lifetime payouts, and active tasks.

### `GET /api/campaigns`
Public/authenticated feed of active campaigns with search, category filter, and pagination.
- **Query Params**: `search`, `category`, `actionType`, `page`, `limit`

### `GET /api/campaigns/:id`
Retrieves full campaign details, sponsor disclosures, and task requirements.

### `POST /api/tasks/start`
Initiates a user task session for a campaign, generating a signed session token.
- **Request Body**: `{ "campaignId": "..." }`

### `POST /api/tasks/submit`
Submits task completion with kinematic telemetry coordinates, dwell time, and answers.
- **Request Body**:
  ```json
  {
    "taskId": "...",
    "telemetry": { "dwellSeconds": 45, "mouseMovements": 120, "keyPresses": 15 },
    "answers": { ... }
  }
  ```

### `GET /api/wallet`
Returns comprehensive wallet totals and paginated immutable ledger entries.

### `POST /api/payouts`
Submits a withdrawal request to UPI ID or Bank Account.
- **Request Body**: `{ "amountRupees": 200, "payoutMethod": "UPI", "upiId": "arun@okaxis" }`

### `GET /api/user/profile` / `PUT /api/user/profile`
Retrieves or updates user profile, DPDP consents, and notification settings.

### `GET /api/disputes` / `POST /api/disputes`
Submits a reward or payout dispute ticket with evidence links.

---

## 3. Advertiser Portal Endpoints

### `GET /api/advertiser/overview`
Returns advertiser campaign spend, reserved budget, funded balance, and active flight metrics.

### `GET /api/advertiser/campaigns` / `POST /api/advertiser/campaigns`
Creates or lists organization campaigns. Enforces tenant isolation.

### `GET /api/advertiser/campaigns/:id`
Returns live telemetry and kinematic attention metrics for a specific campaign.

### `GET /api/advertiser/analytics`
Attribution, conversion rate, cost per verified outcome, and exportable reports.

### `GET /api/advertiser/billing` / `POST /api/advertiser/billing`
Lists GST invoices and allows simulated or RTGS nodal escrow pool top-ups.

---

## 4. Admin Operations Endpoints

- `GET /api/admin/overview`: System-wide operations dashboard.
- `GET /api/admin/moderation` & `POST /api/admin/moderation`: Approve, reject, or request changes on advertiser campaigns.
- `GET /api/admin/fraud` & `POST /api/admin/fraud`: Forensic lab for kinematic anomalies and bot investigations.
- `GET /api/admin/payouts` & `POST /api/admin/payouts`: Clearing queue and dual-approval execution for user withdrawals.
- `GET /api/admin/audit-logs`: Tamper-evident SHA-256 cryptographic audit logs.
- `GET /api/admin/unit-economics`: Platform revenue, nodal escrow liabilities, and contribution margin.
- `GET /api/admin/settings` & `PUT /api/admin/settings`: Platform reward thresholds, API keys, and maintenance mode.

---

## 5. Chrome Extension Sync Bridge

### `GET /api/extension/session`
Provides the companion Chrome extension popup with current user balance, pending rewards, and eligible campaign counts.
