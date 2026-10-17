# API Specification & Endpoints Reference — AdEarn AI (Authoritative Specification)

AdEarn AI exposes a modular, strongly typed REST API built with Next.js 14 App Router route handlers. All requests accept and return JSON. Authentication is maintained via HttpOnly session cookies (`adearn_session`) or Bearer JWT headers.

---

## 1. Authentication & Identity

### `POST /api/auth/register`
Creates a new User account. Automatically creates an Organization and Escrow Wallet for Advertisers, or a Reward Wallet for Users.
- **Request Body**:
  ```json
  {
    "email": "user@domain.in",
    "password": "Password123!",
    "name": "Arun Kumar",
    "role": "USER",
    "organizationName": "Optional Org Name",
    "gstin": "Optional GSTIN"
  }
  ```
- **Response**: `200 OK` (or `409 Conflict`)
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "cm...cuid",
      "email": "user@domain.in",
      "name": "Arun Kumar",
      "role": "USER",
      "organizationId": null
    }
  }
  ```

### `POST /api/auth/login`
Authenticates user credentials, sets an HttpOnly cookie, and returns a session JWT.
- **Request Body**:
  ```json
  { "email": "user@domain.in", "password": "Password123!" }
  ```
- **Response**: `200 OK` (or `401 Unauthorized`, `403 Forbidden` if suspended)

### `GET /api/auth/me`
Returns current authenticated profile, role, KYC tier, and organization linkage.

### `POST /api/auth/logout`
Invalidates session and clears the `adearn_session` cookie.

---

## 2. Campaigns & Tasks Feed

### `GET /api/campaigns`
Public and authenticated feed of active campaigns with search, category filtering, and pagination.
- **Query Parameters**:
  - `search` (string): Keyword search in title and description
  - `category` (string): e.g. `FinTech`, `E-Commerce`, `EdTech`
  - `actionType` (string): `SURVEY`, `SANDBOX_TRIAL`, `APP_INSTALL`, `VIDEO_ATTENTION`, `SENTIMENT_POLL`
  - `page` (number, default `1`)
  - `limit` (number, default `12`)
- **Response**:
  ```json
  {
    "campaigns": [
      {
        "id": "cm...cuid",
        "title": "Zerodha Mutual Funds & SIP Investor Survey",
        "category": "FinTech",
        "actionType": "SURVEY",
        "costPerOutcomePaise": "4500",
        "verifiedOutcomes": 12,
        "targetOutcomes": 1000,
        "organization": { "name": "Zerodha Advisory Solutions", "isVerified": true }
      }
    ],
    "pagination": { "total": 3, "page": 1, "limit": 12, "totalPages": 1 }
  }
  ```

### `GET /api/campaigns/:id`
Returns full campaign details, sponsor disclosures, creative assets, and task rules.

### `POST /api/tasks/start`
Initiates a user task session. Generates an HMAC-SHA256 signed session token.
- **Request Body**: `{ "campaignId": "cm...cuid" }`
- **Response**:
  ```json
  {
    "success": true,
    "taskId": "cm...taskCuid",
    "sessionToken": "adearn_sess_...",
    "campaign": { "id": "...", "title": "...", "actionType": "SURVEY", "rewardPaise": "4500" }
  }
  ```

### `POST /api/tasks/submit`
Submits task completion with kinematic telemetry coordinates, dwell time, and answers.
- **Request Body**: Supports either direct sessionToken or taskId format:
  ```json
  {
    "sessionToken": "adearn_sess_...",
    "dwellTimeSeconds": 45,
    "interactionCount": 14,
    "mouseEventsRecorded": 38,
    "scrollDepthPercent": 90,
    "userResponses": { "q1": "Option A" }
  }
  ```
  *Alternative nested format:*
  ```json
  {
    "taskId": "cm...taskCuid",
    "telemetry": { "dwellSeconds": 45, "mouseMovements": 38, "keyPresses": 14 },
    "answers": { "q1": "Option A" }
  }
  ```
- **Response**: `200 OK` (or `422 Unprocessable Entity` if bot heuristics fail)
  ```json
  {
    "success": true,
    "status": "VALIDATED",
    "rewardPaise": "4500",
    "message": "Task validated and approved. Reward credited to your available balance."
  }
  ```

---

## 3. User Wallet & Payouts

### `GET /api/wallet`
Returns comprehensive wallet totals (`availablePaise`, `pendingPaise`, `lifetimeEarnedPaise`, `lifetimePaidPaise`) and paginated immutable ledger entries.

### `POST /api/payouts`
Submits a voluntary withdrawal request to a verified UPI VPA or Bank Account.
- **Request Body**:
  ```json
  {
    "amountRupees": 200,
    "upiId": "arun@okaxis"
  }
  ```
- **Rules**: `amountPaise >= 10000` (₹100.00 min threshold), `wallet.availablePaise >= amountPaise`.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "payout": {
      "id": "cm...payoutCuid",
      "amountPaise": "20000",
      "status": "CLEARED",
      "utrNumber": "UTR-NPCI-2026884192",
      "maskedAddress": "ar**@okaxis"
    },
    "message": "Withdrawal of ₹200.00 processed successfully via Indian UPI Nodal Pool."
  }
  ```

### `GET /api/user/profile` & `PUT /api/user/profile`
Retrieves or updates user profile attributes, UPI ID, and banking details.

### `GET /api/disputes` & `POST /api/disputes`
Lists user support disputes or creates a new compliance ticket with optional task/payout references.

---

## 4. Advertiser Portal

### `GET /api/advertiser/overview`
Returns organization-isolated campaign metrics, unreserved escrow balance, locked budget, and verified outcomes.

### `GET /api/advertiser/campaigns` & `POST /api/advertiser/campaigns`
Lists or creates campaigns for the authenticated advertiser's organization. Locks escrow budget atomically upon submission.
- **POST Request Body**:
  ```json
  {
    "title": "Zerodha New Account Sandbox Trial",
    "description": "Complete simulated sandbox account opening",
    "category": "FinTech",
    "actionType": "SANDBOX_TRIAL",
    "targetUrl": "https://zerodha.com",
    "budgetAllocatedRupees": 25000,
    "costPerOutcomeRupees": 65,
    "targetOutcomes": 384,
    "assetUrl": "https://..."
  }
  ```

### `GET /api/advertiser/campaigns/:id`
Retrieves live telemetry, attention distributions, and active flight controls for a specific campaign.

### `GET /api/advertiser/analytics`
Attribution, conversion rate, cost per verified outcome, and exportable reports.

### `GET /api/advertiser/billing` & `POST /api/advertiser/billing`
Lists GST invoices (18% tax breakdown) and processes simulated or RTGS nodal escrow pool top-ups.

---

## 5. Admin Operations & Governance

### `GET /api/admin/overview`
System-wide operational control room: active campaigns, nodal pool clearing status, pending moderation count, and platform latency.

### `GET /api/admin/moderation` & `POST /api/admin/moderation`
Campaign moderation queue. `POST` accepts `{ "campaignId": "...", "decision": "ACTIVE" | "REJECTED" | "PAUSED", "reviewerNotes": "..." }`.

### `GET /api/admin/fraud` & `POST /api/admin/fraud`
Forensic lab for kinematic anomaly inspections and bot investigations. `POST` accepts `{ "taskId": "...", "action": "CLEAR" | "QUARANTINE_USER", "reason": "..." }`.

### `GET /api/admin/payouts` & `POST /api/admin/payouts`
Clearing queue and dual-approval execution for user withdrawals. `POST` accepts `{ "payoutId": "...", "action": "APPROVE_BATCH" }`.

### `GET /api/admin/audit-logs`
Tamper-evident HMAC-SHA256 cryptographic audit logs with search, actor details, and pagination.

### `GET /api/admin/unit-economics`
Gross platform revenue, escrow liabilities, creator payouts, and net contribution margin.

### `GET /api/admin/settings` & `PUT /api/admin/settings`
Platform configuration, minimum withdrawal thresholds, API key management, and maintenance mode.

---

## 6. Companion Extension & Observability

### `GET /api/extension/session`
Provides the companion Chrome extension popup with current user balance, pending rewards, and eligible campaign count.

### `GET /api/health`
Observability probe reporting service status, MySQL 8.0 latency, payout adapter readiness, and ledger engine state.
- **Sample Output**:
  ```json
  {
    "status": "UP",
    "timestamp": "2026-10-17T10:44:06.542Z",
    "service": "AdEarn AI Core API Engine",
    "environment": "development",
    "checks": {
      "database": { "status": "healthy", "engine": "MySQL 8.0", "latencyMs": 48 },
      "payoutAdapter": { "mode": "sandbox", "status": "ready" },
      "ledgerEngine": { "status": "operational", "currency": "INR (Integer Paise)" }
    },
    "responseTimeMs": 48
  }
  ```
