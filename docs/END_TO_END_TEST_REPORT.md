# Automated End-to-End Workflow Test Execution Report — AdEarn AI

**Execution Date:** 2026-10-17  
**Test Suite:** `test/e2e_workflows.test.js`  
**Execution Command:** `node test/e2e_workflows.test.js`  
**Target Environment:** Local Node.js runtime + MySQL 8.0 (`localhost:3306/adearn_ai`)  
**Overall Result:** **23 Passed, 0 Failed (100% Pass Rate)**

---

## 1. Executive Summary

All three primary end-to-end user journeys (User, Advertiser, Admin), along with the companion Chrome Extension synchronization and cross-portal consistency tests, have been executed against live MySQL 8.0 relational tables. Ephemeral test fixtures were safely pruned upon completion without modifying or dropping pre-existing seeded records.

---

## 2. Detailed Workflow Test Breakdown

### Workflow A: User Registration, Engagement & Payout Lifecycle
Validates the complete creator journey from fresh signup through voluntary withdrawal settlement.

| Step # | Test Description | Assertions & Invariants Verified | Result |
|---|---|---|:---:|
| **A.1** | Register new Creator User in live MySQL | User created with bcrypt hash; wallet initialized with 0 available & pending paise | **PASS** |
| **A.2** | Authenticate user & issue signed JWT session | Bcrypt constant-time compare succeeds; JWT signed with `userId` and role `USER` | **PASS** |
| **A.3** | Discover active sponsored campaigns from feed | Active campaign retrieved with organization relation; `status == 'ACTIVE'` | **PASS** |
| **A.4** | Start interactive task session | Unique `sessionToken` issued; `UserTask` created in `STARTED` state | **PASS** |
| **A.5** | Reject automated bot submission | Zero mouse movement & 2s dwell triggers anti-bot heuristic; `fraudVerdict: 'FLAGGED'` | **PASS** |
| **A.6** | Submit genuine human activity | Dwell time & vectors pass; task marked `VALIDATED`; `CREDIT_REWARD` increments available | **PASS** |
| **A.7** | Verify ledger idempotency | Re-submitting identical idempotency key detected; duplicate credit prevented | **PASS** |
| **A.8** | Overdraft protection verification | Attempting to withdraw more than available balance throws `INSUFFICIENT_FUNDS` | **PASS** |
| **A.9** | Request voluntary payout to UPI VPA | Available balance debited atomically; `PayoutRequest` created in `PROCESSING` | **PASS** |
| **A.10** | Bank clearing confirmation | 12-digit Indian Bank UTR attached; status updated to `CLEARED`; wallet balance reaches 0 | **PASS** |

### Workflow B: Advertiser Publishing & Nodal Escrow Budget Lifecycle
Validates brand organization registration, nodal escrow funding, campaign wizard creation, and admin moderation.

| Step # | Test Description | Assertions & Invariants Verified | Result |
|---|---|---|:---:|
| **B.1** | Register Advertiser Organization & Escrow Wallet| User linked to `Organization` via `UserOrganization` with `role: 'OWNER'` | **PASS** |
| **B.2** | Top-Up Nodal Escrow Pool via RTGS | Posts `ADVERTISER_TOPUP` transaction; credits ₹50,000.00 (5,000,000 paise) to escrow | **PASS** |
| **B.3** | Create Campaign & Lock Escrow Budget | Deducts ₹20,000 from escrow; posts `ESCROW_LOCK`; creates campaign in `IN_REVIEW` | **PASS** |
| **B.4** | Verify campaign is NOT live prematurely | Confirms unapproved flight does not appear in public `/feed` | **PASS** |
| **B.5** | Admin Moderation Desk reviews & approves | Admin sets `status = 'ACTIVE'`; creates `ModerationRecord` & `AuditLog` | **PASS** |
| **B.6** | Approved campaign appears in public feed | Matching creator users can now discover and initiate the voluntary campaign task | **PASS** |

### Workflow C: Admin Operations, Forensic Audit & Governance
Validates compliance oversight, cryptographic tamper-evidence, and financial unit economics.

| Step # | Test Description | Assertions & Invariants Verified | Result |
|---|---|---|:---:|
| **C.1** | Admin inspects moderation records in MySQL | Verified decision history, reviewer user ID, and reviewer notes | **PASS** |
| **C.2** | Cryptographic audit log chain verification | HMAC-SHA256 signature exists on campaign approval audit entry | **PASS** |
| **C.3** | Platform Unit Economics calculation | Gross campaign spend vs user reward liabilities reconciles with platform margin | **PASS** |

### Workflow D: Chrome Extension Live Session & Cross-Portal Consistency
Validates companion extension session syncing and cross-portal fact alignment.

| Step # | Test Description | Assertions & Invariants Verified | Result |
|---|---|---|:---:|
| **D.1** | Extension reflects exact live creator wallet balance | Extension payload matches authoritative database balance (`0`) and eligible count | **PASS** |
| **D.2** | Cross-portal fact consistency | User, Advertiser, and Admin see identical payout state, campaign status, and balances | **PASS** |

---

## 3. Raw Execution Output Log

```text
================================================================
🚀 ADEARN AI END-TO-END WORKFLOW & CROSS-PORTAL TEST SUITE
Testing against Live Database: MySQL 8.0 (adearn_ai)
================================================================

  ✓ PASS: Locate authoritative System Administrator account

--- [WORKFLOW A] User Registration, Engagement & Payout Lifecycle ---
  ✓ PASS: Step 1: Register new Creator User in live MySQL
  ✓ PASS: Step 2: Authenticate user & issue signed JWT session
  ✓ PASS: Step 3: Discover active sponsored campaigns from live feed
  ✓ PASS: Step 4: Start an interactive task session and obtain signed token
  ✓ PASS: Step 5: Reject automated bot submission with zero mouse movement
  ✓ PASS: Step 6: Submit genuine human activity with adequate dwell & telemetry
  ✓ PASS: Step 7: Verify ledger idempotency prevents duplicate reward crediting
  ✓ PASS: Step 8: Overdraft protection prevents withdrawal exceeding available balance
  ✓ PASS: Step 9: Request voluntary payout to verified UPI destination
  ✓ PASS: Step 10: Bank clearing confirmation attaches UTR and updates to CLEARED

--- [WORKFLOW B] Advertiser Publishing & Nodal Escrow Budget Lifecycle ---
  ✓ PASS: Step 1: Register Advertiser Organization & Escrow Wallet
  ✓ PASS: Step 2: Top-Up Nodal Escrow Pool via RTGS/UPI
  ✓ PASS: Step 3: Create Campaign and Lock Escrow Budget Atomically
  ✓ PASS: Step 4: Verify campaign is NOT live before admin moderation
  ✓ PASS: Step 5: Admin Moderation Desk reviews & approves campaign
  ✓ PASS: Step 6: Approved campaign appears in live feed for voluntary user participation

--- [WORKFLOW C] Admin Operations, Forensic Audit & Governance ---
  ✓ PASS: Step 1: Admin inspects moderation records in MySQL
  ✓ PASS: Step 2: Cryptographic audit log chain verification
  ✓ PASS: Step 3: Platform Unit Economics & Gross Margin calculation

--- [WORKFLOW D] Chrome Extension Live Session & Cross-Portal Consistency ---
  ✓ PASS: Step 1: Companion Extension query reflects exact live creator wallet balance
  ✓ PASS: Step 2: Cross-portal consistency: User, Advertiser & Admin see matching ledger facts

--- Cleanup Non-Destructive Test Fixtures ---
    All ephemeral test records pruned. Genuine database state preserved.
  ✓ PASS: Safely prune ephemeral test records from database

================================================================
🏁 END-TO-END TEST RESULTS: 23 Passed, 0 Failed
================================================================
```
