# Authoritative Campaign-to-Task Lifecycle & Verification Pipeline — AdEarn AI

AdEarn AI operates strictly on an audited, server-side verified advertising model. It rejects unverified clicks, browser-simulated engagement, and arbitrary client-side reward submissions.

---

## 1. End-to-End Workflow Architecture

```
[Advertiser]
     │
     │ 1. Create Flight & Fund Escrow (`POST /api/advertiser/campaigns`)
     ▼
[Campaign State: IN_REVIEW]
     │
     │ 2. Compliance Review (`POST /api/admin/moderation` -> 'ACTIVE')
     ▼
[Campaign State: ACTIVE]
     │
     │ 3. Server-side Eligibility Filter (`GET /api/campaigns`)
     ▼
[Creator User]
     │
     │ 4. Start Task Session (`POST /api/tasks/start` -> Issues HMAC token)
     ▼
[UserTask: STARTED]
     │
     │ 5. Task Completion & Telemetry Submission (`POST /api/tasks/submit`)
     ├── Bot / Low Dwell Detected ──> [UserTask: REJECTED] ──> [Fraud Lab Alert]
     ▼
[UserTask: VALIDATED]
     │
     │ 6. Double-Entry Append-Only Ledger (`CREDIT_REWARD`)
     ▼
[Wallet: Available Balance Incremented]
     │
     │ 7. Voluntary Withdrawal (`POST /api/payouts` -> ₹100 min threshold)
     ▼
[PayoutRequest: PROCESSING]
     │
     │ 8. Bank Clearing Confirmation (NPCI UPI 2.0 / IMPS UTR)
     ▼
[PayoutRequest: CLEARED]
```

---

## 2. Step-by-Step Technical Implementation

### Step 1: Advertiser Flight Creation & Escrow Reservation
- An authenticated advertiser (`ADVERTISER`) enters campaign parameters: title, objective (`SURVEY`, `SANDBOX_TRIAL`, `APP_INSTALL`, `VIDEO_ATTENTION`, `SENTIMENT_POLL`), target URL, flight dates, allocated budget, and cost per outcome in INR.
- **Server Enforcement**:
  - The server verifies `wallet.escrowPaise >= budgetAllocatedPaise`.
  - Atomically decrements unreserved escrow and posts an `ESCROW_LOCK` transaction in `ledger_transactions`.
  - Persists the campaign in `IN_REVIEW` status.

### Step 2: Campaign Moderation & Policy Governance
- Campaign reviewers on the Admin Operations Desk (`/admin/moderation`) inspect:
  - ASCI disclosure compliance (explicit `#Sponsored` labelling).
  - Target URL domain validity and redirection safety.
  - Creative asset file size, format, and checksum.
- Actions:
  - `ACTIVE`: Approved for live distribution.
  - `REJECTED`: Rejected with mandatory reviewer reason; advertiser notified.
  - `PAUSED`: Temporarily suspended pending creative revision.
- Every moderation decision creates an immutable `ModerationRecord` and an HMAC-SHA256 `AuditLog`.

### Step 3: Server-Side Eligibility & Feed Distribution
- When a user accesses `/feed` (`GET /api/campaigns`), the backend applies strict server-side eligibility checks:
  1. `status == 'ACTIVE'`.
  2. `budgetSpentPaise + costPerOutcomePaise <= budgetAllocatedPaise` (budget not exhausted).
  3. `now() >= flightStart` and `now() <= flightEnd`.
  4. The user has not already completed the campaign (`UserTask.status != 'VALIDATED'`).
  5. User status is not `SUSPENDED`.

### Step 4: Individual Task Session Creation
- When an eligible user voluntarily begins a task (`POST /api/tasks/start`):
  - Server confirms eligibility once more at mutation time.
  - Generates a cryptographically signed HMAC-SHA256 `sessionToken` incorporating `userId`, `campaignId`, and timestamp.
  - Creates a `UserTask` in `STARTED` state with authoritative reward amount locked to `campaign.costPerOutcomePaise`.

### Step 5: Attention Telemetry & Fraud Verification
- During task execution in `/task/[id]`, the client captures continuous kinematic attention telemetry:
  - Active dwell duration (seconds).
  - Mouse coordinate movement vector count.
  - Keystroke interaction count.
  - Scroll depth percentage.
- Upon submission (`POST /api/tasks/submit`):
  - Server validates session token signature and expiry.
  - Server verifies `dwellTimeSeconds >= campaign.dwellTimeSeconds`.
  - Rejects zero-movement macros (`mouseEventsRecorded < 5 && interactionCount == 0`).
  - Evaluates event velocity (`events / second <= 100`).
  - If anomalous, marks task `REJECTED`, sets `fraudVerdict: 'FLAGGED'`, and creates a `FraudIncident`.

### Step 6: Reward Approval & Authoritative Ledger Credit
- Upon valid verification:
  - Task state updates to `VALIDATED` with timestamp.
  - Inside a serialized database transaction (`prisma.$transaction`):
    - User's `wallet.availablePaise` and `lifetimeEarnedPaise` increment by `task.rewardPaise`.
    - An append-only `CREDIT_REWARD` entry is written to `ledger_transactions`.
    - Campaign `budgetSpentPaise` and `verifiedOutcomes` increment.
  - Idempotency key `REWARD-TASK-{taskId}` guarantees that repeated callbacks or submissions cannot double-credit.

### Step 7: Withdrawal Request & Nodal Clearing
- User initiates payout (`POST /api/payouts`):
  - Validates `amountPaise >= 10000` (₹100.00 min threshold).
  - Overdraft check: `wallet.availablePaise >= amountPaise`.
  - Atomically debits `wallet.availablePaise` and posts `DEBIT_WITHDRAWAL` transaction.
  - Creates `PayoutRequest` in `PROCESSING` state.
  - Dispatches to Payout Adapter (`SandboxPayoutAdapter` in test/staging, or `CashfreePayoutAdapter` / `RazorpayXPayoutAdapter` in production).
  - Upon bank settlement confirmation, attaches 12-digit Indian Bank UTR (e.g. `UTR-NPCI-...`) and updates status to `CLEARED`.
