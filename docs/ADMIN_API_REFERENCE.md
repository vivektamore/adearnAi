# AdEarn AI — Admin API Reference Specification

All `/api/admin/*` endpoints require authentication via an `Authorization: Bearer <token>` header or `adearn_session` cookie containing a valid JWT with an `ADMIN` or `SUPER_ADMIN` canonical role.

---

## 1. Operations Overview

### `GET /api/admin/overview`
Returns high-level system telemetry, active counts, aggregate nodal escrow values, and recent audit records.

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `dashboard.read`
- **Response Format**: `application/json`

#### Example Response (200 OK)
```json
{
  "sessionUser": {
    "userId": "usr_secops_01",
    "email": "secops@adearn.ai",
    "name": "SecOps Administrator",
    "role": "SUPER_ADMIN"
  },
  "metrics": {
    "totalUsers": 24,
    "totalAdvertisers": 3,
    "activeCampaigns": 0,
    "pendingModeration": 0,
    "pendingPayouts": 0,
    "flaggedFraud": 0,
    "totalAvailablePaise": "24505",
    "totalEscrowPaise": "45000000",
    "systemStatus": "ALL_NODES_OPERATIONAL"
  },
  "recentAuditLogs": [
    {
      "id": "log_8923a1",
      "action": "SYSTEM_SETTING_UPDATED",
      "actorRole": "ADMIN",
      "createdAt": "2026-11-09T10:15:32.000Z",
      "actor": { "name": "SecOps Administrator", "email": "secops@adearn.ai" }
    }
  ]
}
```

---

## 2. Campaign Moderation

### `GET /api/admin/moderation`
Lists all campaigns currently registered on the platform, sorted by creation date descending.

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `campaigns.moderate`

### `POST /api/admin/moderation`
Executes an administrative decision on a submitted campaign.

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `campaigns.moderate`
- **Request Body**:
```json
{
  "campaignId": "cmp_84920a",
  "decision": "ACTIVE",
  "reviewerNotes": "Creative assets verified. Target landing URL complies with FinTech disclosure regulations."
}
```
- **Allowed Decisions**: `'ACTIVE'`, `'REJECTED'`, `'PAUSED'`.
- **Response (200 OK)**:
```json
{
  "success": true,
  "campaign": {
    "id": "cmp_84920a",
    "status": "ACTIVE"
  }
}
```

---

## 3. Fraud & Kinematics Forensic Lab

### `GET /api/admin/fraud`
Fetches flagged task sessions exceeding anomaly score thresholds (score > 0.3 or `fraudVerdict: 'FLAGGED'`).

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `fraud.review`

### `POST /api/admin/fraud`
Executes forensic remediation on a flagged task session.

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `fraud.review`
- **Request Body**:
```json
{
  "taskId": "tsk_2910fa",
  "action": "QUARANTINE_USER",
  "reason": "Synthetic trajectory detected: 0ms dwell, zero velocity variance."
}
```
- **Allowed Actions**:
  - `'QUARANTINE_USER'`: Immediately sets user status to `SUSPENDED` and writes to audit log.
  - `'CLEAR'`: Sets `fraudVerdict: 'CLEARED'` on the task session.

---

## 4. Payout Clearing & Nodal Pool

### `GET /api/admin/payouts`
Retrieves pending and historical withdrawal requests and nodal settlement pool statistics.

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `payouts.approve`

### `POST /api/admin/payouts`
Processes a withdrawal batch approval or rejection.

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `payouts.approve`
- **Request Body**:
```json
{
  "payoutId": "pay_9021da",
  "action": "APPROVE_BATCH"
}
```
- **Allowed Actions**:
  - `'APPROVE_BATCH'`: Dispatches payout via active adapter (`RazorpayXPayoutAdapter` or `SandboxPayoutAdapter`). Upon success, sets status to `CLEARED`, attaches UTR, and balances double-entry accounts.
  - `'REJECT'`: Transitions status to `FAILED`, executes a compensating `PAYOUT_REVERSAL` ledger transaction, and restores funds to creator wallet.
- **Error Responses**:
  - `400 Bad Request`: If payout is already in a terminal state (`CLEARED`, `FAILED`, `CANCELLED`).

---

## 5. Immutable Audit Logs

### `GET /api/admin/audit-logs`
Returns a paginated list of system audit log entries.

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `audit.read`
- **Query Parameters**:
  - `page`: Page number (integer, default: 1).
  - `limit`: Items per page (integer, default: 25, max: 100).
  - `action`: Keyword filter matching action code.

---

## 6. Unit Economics & Gross Margins

### `GET /api/admin/unit-economics`
Returns platform macro-economic metrics calculated dynamically from database records.

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `unit_economics.read`
- **Response (200 OK)**:
```json
{
  "metrics": {
    "totalGrossCampaignSpendPaise": "0",
    "totalUserRewardLiabilitiesPaise": "0",
    "platformGrossMarginPaise": "0",
    "takeRatePercent": "0.0%",
    "costPerVerifiedActionPaise": "0",
    "activeRetentionRate": "100.0%",
    "payoutFailureRate": "0.00%",
    "operatingMargin": "0.0%"
  },
  "monthlyTrends": []
}
```

---

## 7. Platform Settings & Configuration

### `GET /api/admin/settings`
Returns current system settings and operational mode.

- **Required Roles**: `ADMIN`, `SUPER_ADMIN`
- **Required Permission**: `dashboard.read`

### `PUT /api/admin/settings`
Updates a platform system configuration variable.

- **Required Roles**: `SUPER_ADMIN` only (least-privilege enforcement blocks standard `ADMIN`)
- **Required Permission**: `settings.manage`
- **Request Body**:
```json
{
  "key": "minWithdrawalPaise",
  "value": "10000"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Setting minWithdrawalPaise updated."
}
```

