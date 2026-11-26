/**
 * ADEARN AI — COMPLETE USER PORTAL AUDIT, NAVIGATION & FUNCTIONAL VERIFICATION SUITE
 * Validates Workflows A through H, Navigation Integrity, IDOR Defense,
 * BigInt/Paise Monetary Invariants, Telemetry Verification, and Payout Controls.
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'adearn-ai-development-super-secret-jwt-key-2026-minimum-32-chars-long';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runUserPortalAudit() {
  console.log('================================================================');
  console.log('🧑‍💻 ADEARN AI USER PORTAL AUDIT & FUNCTIONAL VERIFICATION SUITE');
  console.log('Testing against Live Runtime & Live MySQL 8.0');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(msg) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  }

  function recordFail(msg, err) {
    console.error(`  ❌ FAIL: ${msg}`);
    if (err) console.error(err);
    failed++;
  }

  const ts = Date.now();
  const testUserA = {
    id: `usr_audit_creator_a_${ts}`,
    email: `creator_a_${ts}@test.in`,
    password: 'Password123!',
    name: 'Audited Creator Alpha',
    role: 'USER',
  };
  const testUserB = {
    id: `usr_audit_creator_b_${ts}`,
    email: `creator_b_${ts}@test.in`,
    password: 'Password123!',
    name: 'Audited Creator Beta',
    role: 'USER',
  };
  const testOrg = {
    id: `org_audit_sponsor_${ts}`,
    name: 'Sponsor Alpha Corp',
    contactEmail: `sponsor_${ts}@test.in`,
  };

  let tokenA = null;
  let tokenB = null;
  let campaignId = null;
  let taskAId = null;
  let payoutRequestIdA = null;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Provision Isolated Test Fixtures
    // -------------------------------------------------------------------------
    console.log('[SETUP] Provisioning Ephemeral Audit Test Fixtures in MySQL...');
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Password123!', salt);

    // Create User A with Wallet (Initial: ₹250.00 = 25,000 paise)
    await prisma.user.create({
      data: {
        id: testUserA.id,
        email: testUserA.email,
        name: testUserA.name,
        passwordHash: passHash,
        role: 'USER',
        kycTier: 'TIER_1',
        kycStatus: 'VERIFIED',
        upiId: 'alphacreator@okhdfc',
        wallet: {
          create: {
            availablePaise: BigInt(25000),
            pendingPaise: BigInt(5000),
            lifetimeEarnedPaise: BigInt(30000),
            lifetimePaidPaise: BigInt(0),
          },
        },
      },
    });

    // Create User B with Wallet (Initial: ₹100.00 = 10,000 paise)
    await prisma.user.create({
      data: {
        id: testUserB.id,
        email: testUserB.email,
        name: testUserB.name,
        passwordHash: passHash,
        role: 'USER',
        kycTier: 'TIER_1',
        kycStatus: 'VERIFIED',
        upiId: 'betacreator@okaxis',
        wallet: {
          create: {
            availablePaise: BigInt(10000),
            pendingPaise: BigInt(0),
            lifetimeEarnedPaise: BigInt(10000),
            lifetimePaidPaise: BigInt(0),
          },
        },
      },
    });

    // Create Sponsor Organization & Campaign
    await prisma.organization.create({
      data: {
        id: testOrg.id,
        name: testOrg.name,
        contactEmail: testOrg.contactEmail,
        isVerified: true,
        wallet: { create: { escrowPaise: BigInt(500000) } },
      },
    });

    const camp = await prisma.campaign.create({
      data: {
        organizationId: testOrg.id,
        title: 'Institutional Fintech Audit Survey 2026',
        description: 'Verify digital savings workflow and interest calculation',
        category: 'FinTech',
        actionType: 'SURVEY',
        targetUrl: 'https://sponsor.example.com',
        budgetAllocatedPaise: BigInt(100000),
        costPerOutcomePaise: BigInt(3500), // ₹35.00
        targetOutcomes: 20,
        status: 'ACTIVE',
      },
    });
    campaignId = camp.id;

    tokenA = makeToken({ userId: testUserA.id, email: testUserA.email, name: testUserA.name, role: 'USER' });
    tokenB = makeToken({ userId: testUserB.id, email: testUserB.email, name: testUserB.name, role: 'USER' });

    recordPass('Test accounts (USER_A, USER_B) and verified campaign provisioned successfully.');

    // =========================================================================
    // WORKFLOW A: Authentication, Login, Session, Dashboard & Logout
    // =========================================================================
    console.log('\n--- [WORKFLOW A] Authentication, Dashboard & Session Lifecycle ---');

    // A.1: Valid Login
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserA.email, password: testUserA.password }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.success);
      assert.ok(data.token);
      assert.strictEqual(data.user.email, testUserA.email);
      assert.strictEqual(data.user.role, 'USER');
      recordPass('A.1.1 Valid User login succeeds and issues signed token + HTTP cookie');
    } catch (err) {
      recordFail('A.1.1 Login error', err);
    }

    // A.2: Invalid password rejection
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserA.email, password: 'WrongPassword999!' }),
      });
      assert.strictEqual(res.status, 401);
      recordPass('A.1.2 Invalid password rejected with HTTP 401');
    } catch (err) {
      recordFail('A.1.2 Invalid password error', err);
    }

    // A.3: User Dashboard data matches database backend records
    try {
      const res = await fetch(`${BASE_URL}/api/user/dashboard`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const d = await res.json();
      assert.strictEqual(d.user.id, testUserA.id);
      assert.strictEqual(d.metrics.availableBalancePaise, '25000');
      assert.strictEqual(d.metrics.pendingBalancePaise, '5000');
      assert.strictEqual(d.metrics.lifetimeEarnedPaise, '30000');
      recordPass('A.1.3 User Dashboard metrics match exact MySQL database balances (available: ₹250.00)');
    } catch (err) {
      recordFail('A.1.3 Dashboard fetch error', err);
    }

    // A.4: Logout invalidates cookie session
    try {
      const res = await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST' });
      assert.strictEqual(res.status, 200);
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie && setCookie.includes('adearn_session=;'));
      recordPass('A.1.4 Logout endpoint clears session cookie');
    } catch (err) {
      recordFail('A.1.4 Logout error', err);
    }

    // =========================================================================
    // WORKFLOW B: Sponsored Content Discovery, Task Start & Activity Verification
    // =========================================================================
    console.log('\n--- [WORKFLOW B] Sponsored Content & Task Verification Lifecycle ---');

    // B.1: Discover active campaigns from feed
    try {
      const res = await fetch(`${BASE_URL}/api/campaigns`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const feed = await res.json();
      assert.ok(Array.isArray(feed.campaigns));
      const found = feed.campaigns.find(c => c.id === campaignId);
      assert.ok(found, 'Seeded campaign must appear in active feed');
      assert.strictEqual(found.title, 'Institutional Fintech Audit Survey 2026');
      recordPass('B.1.1 User discovers active sponsored campaigns from public/creator feed');
    } catch (err) {
      recordFail('B.1.1 Feed discovery error', err);
    }

    // B.2: Start interactive task session and obtain cryptographically signed token
    let taskSessionToken = null;
    try {
      const res = await fetch(`${BASE_URL}/api/tasks/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ campaignId }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.success);
      assert.ok(data.taskId);
      assert.ok(data.sessionToken);
      taskSessionToken = data.sessionToken;
      taskAId = data.taskId;
      recordPass('B.1.2 Task session started; HMAC-signed sessionToken issued to creator');
    } catch (err) {
      recordFail('B.1.2 Task start error', err);
    }

    // B.3: Bot Rejection Defense: Zero dwell & zero interaction rejected by telemetry engine
    try {
      const res = await fetch(`${BASE_URL}/api/tasks/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          sessionToken: taskSessionToken,
          dwellTimeSeconds: 1, // Sub-minimum dwell (< 15s)
          interactionCount: 0,
          mouseEventsRecorded: 0,
          userResponses: { answer: 'opt1' },
        }),
      });
      assert.strictEqual(res.status, 422);
      const data = await res.json();
      assert.strictEqual(data.status, 'REJECTED');
      recordPass('B.1.3 Telemetry Defense: Sub-threshold bot submission rejected with HTTP 422');
    } catch (err) {
      recordFail('B.1.3 Telemetry rejection error', err);
    }

    // B.4: Genuine Voluntary Activity Submission & Double-Entry Credit
    // Re-issue active task session token for valid submission
    const resRestart = await fetch(`${BASE_URL}/api/tasks/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ campaignId }),
    });
    const restartData = await resRestart.json();
    taskSessionToken = restartData.sessionToken;
    taskAId = restartData.taskId;

    try {
      const res = await fetch(`${BASE_URL}/api/tasks/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          sessionToken: taskSessionToken,
          dwellTimeSeconds: 22,
          interactionCount: 8,
          mouseEventsRecorded: 45,
          scrollDepthPercent: 88,
          userResponses: { answer: 'opt2' },
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'VALIDATED');
      assert.strictEqual(data.rewardPaise, '3500'); // ₹35.00
      recordPass('B.1.4 Genuine voluntary engagement validated: +₹35.00 credited to wallet');

      // Verify wallet balance incremented in MySQL
      const walletA = await prisma.wallet.findUnique({ where: { userId: testUserA.id } });
      assert.strictEqual(walletA.availablePaise, BigInt(28500)); // 25,000 + 3,500 = 28,500
      recordPass('B.1.5 Authoritative wallet balance incremented exactly to ₹285.00 in MySQL');
    } catch (err) {
      recordFail('B.1.4 Task submit error', err);
    }

    // B.5: Idempotency & Replay Defense: Re-submitting the same completed task rejected
    try {
      const res = await fetch(`${BASE_URL}/api/tasks/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          sessionToken: taskSessionToken,
          dwellTimeSeconds: 25,
          interactionCount: 10,
          mouseEventsRecorded: 50,
          userResponses: { answer: 'opt2' },
        }),
      });
      assert.strictEqual(res.status, 400);
      recordPass('B.1.6 Replay Defense: Duplicate submission on completed task blocked with HTTP 400');
    } catch (err) {
      recordFail('B.1.6 Replay test error', err);
    }

    // =========================================================================
    // WORKFLOW C: Chrome Companion Extension Binding & Session Telemetry
    // =========================================================================
    console.log('\n--- [WORKFLOW C] Chrome Extension Companion Binding ---');

    try {
      const res = await fetch(`${BASE_URL}/api/extension/session`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const extSession = await res.json();
      assert.ok(extSession.authenticated);
      assert.strictEqual(extSession.user.id, testUserA.id);
      assert.strictEqual(extSession.wallet.availablePaise, '28500');
      assert.ok(extSession.companionTelemetry.eligibleCampaignsCount >= 1);
      recordPass('C.1.1 Extension Session API correctly binds to authenticated USER_A account');
      recordPass('C.1.2 Companion reflects live wallet balance & eligible campaign count');
    } catch (err) {
      recordFail('C.1.1 Extension session error', err);
    }

    // Unauthenticated extension request
    try {
      const res = await fetch(`${BASE_URL}/api/extension/session`);
      assert.strictEqual(res.status, 200);
      const unauth = await res.json();
      assert.strictEqual(unauth.authenticated, false);
      recordPass('C.1.3 Extension returns authenticated: false when no token is present');
    } catch (err) {
      recordFail('C.1.3 Unauth extension test error', err);
    }

    // =========================================================================
    // WORKFLOW D: Rewards Wallet & Double-Entry Ledger Reconciliation
    // =========================================================================
    console.log('\n--- [WORKFLOW D] Rewards Wallet & Ledger Reconciliation ---');

    try {
      const res = await fetch(`${BASE_URL}/api/wallet`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const wData = await res.json();
      assert.strictEqual(wData.wallet.availablePaise, '28500');
      assert.ok(Array.isArray(wData.transactions));
      
      // Find the CREDIT_REWARD transaction for task
      const rewardTx = wData.transactions.find(t => t.type === 'CREDIT_REWARD');
      assert.ok(rewardTx, 'Must contain ledger transaction for reward credit');
      assert.strictEqual(rewardTx.amountPaise, '3500');
      assert.strictEqual(rewardTx.balanceAfterPaise, '28500');
      recordPass('D.1.1 Wallet Ledger displays immutable audit record with post-balance calculation');
    } catch (err) {
      recordFail('D.1.1 Wallet ledger error', err);
    }

    // =========================================================================
    // WORKFLOW E: Payout Methods & Withdrawal Workflow
    // =========================================================================
    console.log('\n--- [WORKFLOW E] Payout Methods, Validation & Withdrawals ---');

    // E.1: Add valid UPI payout method
    let methodId = null;
    try {
      const res = await fetch(`${BASE_URL}/api/payout-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          type: 'UPI',
          destinationAddress: 'alphacreator@okhdfcbank',
          accountHolderName: 'Audited Creator Alpha',
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.success);
      assert.ok(data.payoutMethod.id);
      assert.ok(data.payoutMethod.maskedAddress.startsWith('al') && data.payoutMethod.maskedAddress.endsWith('@okhdfcbank'));
      methodId = data.payoutMethod.id;
      recordPass('E.1.1 Creator adds valid UPI destination; address masked by default');
    } catch (err) {
      recordFail('E.1.1 Add payout method error', err);
    }

    // E.2: Rejection of sub-minimum withdrawal (< ₹100.00)
    try {
      const res = await fetch(`${BASE_URL}/api/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          amountRupees: 50, // Sub-minimum (threshold is ₹100)
          payoutMethodId: methodId,
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Minimum withdrawal threshold'));
      recordPass('E.1.2 Sub-minimum withdrawal (< ₹100.00) rejected with HTTP 400');
    } catch (err) {
      recordFail('E.1.2 Sub-minimum withdrawal error', err);
    }

    // E.3: Rejection of overdraft withdrawal exceeding available balance
    try {
      const res = await fetch(`${BASE_URL}/api/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          amountRupees: 500, // Available is only ₹285.00
          payoutMethodId: methodId,
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Insufficient available funds'));
      recordPass('E.1.3 Overdraft withdrawal exceeding available balance rejected with HTTP 400');
    } catch (err) {
      recordFail('E.1.3 Overdraft withdrawal error', err);
    }

    // E.4: Valid Withdrawal Submission (₹150.00 = 15,000 paise)
    try {
      const res = await fetch(`${BASE_URL}/api/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          amountRupees: 150,
          payoutMethodId: methodId,
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.success);
      assert.strictEqual(data.payout.status, 'CLEARED'); // Sandbox adapter clears immediately with UTR
      assert.ok(data.payout.utrNumber);
      payoutRequestIdA = data.payout.id;
      recordPass('E.1.4 Valid withdrawal processed atomically: balance debited, UTR generated');

      // Verify wallet in MySQL: ₹285.00 - ₹150.00 = ₹135.00 (13,500 paise)
      const walletAfter = await prisma.wallet.findUnique({ where: { userId: testUserA.id } });
      assert.strictEqual(walletAfter.availablePaise, BigInt(13500));
      assert.strictEqual(walletAfter.lifetimePaidPaise, BigInt(15000));
      recordPass('E.1.5 Available balance updated to ₹135.00 and lifetimePaid updated to ₹150.00');
    } catch (err) {
      recordFail('E.1.4 Valid withdrawal error', err);
    }

    // E.5: Payout history reflects authenticated user records
    try {
      const res = await fetch(`${BASE_URL}/api/payouts`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 200);
      const pData = await res.json();
      assert.ok(pData.payoutRequests.length >= 1);
      const req = pData.payoutRequests.find(p => p.id === payoutRequestIdA);
      assert.ok(req);
      assert.strictEqual(req.amountPaise, '15000');
      assert.strictEqual(req.status, 'CLEARED');
      recordPass('E.1.6 Payout history accurately lists withdrawal request with UTR confirmation');
    } catch (err) {
      recordFail('E.1.6 Payout history error', err);
    }

    // =========================================================================
    // WORKFLOW F: Privacy Settings & User Profile
    // =========================================================================
    console.log('\n--- [WORKFLOW F] Privacy Settings & User Profile ---');

    // F.1: Update legal name and primary UPI ID
    try {
      const res = await fetch(`${BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          name: 'Audited Alpha Renamed',
          upiId: 'alpharename@okhdfcbank',
          bankAccountNumber: '998877665544',
          bankIfsc: 'HDFC0001234',
        }),
      });
      assert.strictEqual(res.status, 200);
      recordPass('F.1.1 User profile and payment preferences updated successfully');

      // Verify persistence in MySQL
      const userCheck = await prisma.user.findUnique({ where: { id: testUserA.id } });
      assert.strictEqual(userCheck.name, 'Audited Alpha Renamed');
      assert.strictEqual(userCheck.upiId, 'alpharename@okhdfcbank');
      assert.strictEqual(userCheck.bankAccountNumber, '998877665544');
      assert.strictEqual(userCheck.bankIfsc, 'HDFC0001234');
      recordPass('F.1.2 Profile updates verified in MySQL database records');
    } catch (err) {
      recordFail('F.1.1 Profile update error', err);
    }

    // F.2: Rejection of malformed UPI syntax
    try {
      const res = await fetch(`${BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ upiId: 'invalid-upi-no-vpa-at' }),
      });
      assert.strictEqual(res.status, 400);
      recordPass('F.1.3 Malformed UPI syntax rejected with HTTP 400');
    } catch (err) {
      recordFail('F.1.3 Malformed UPI error', err);
    }

    // F.3: Rejection of malformed IFSC code
    try {
      const res = await fetch(`${BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({ bankIfsc: 'BADIFSC' }), // Not 11 chars
      });
      assert.strictEqual(res.status, 400);
      recordPass('F.1.4 Malformed IFSC code rejected with HTTP 400');
    } catch (err) {
      recordFail('F.1.4 Malformed IFSC error', err);
    }

    // =========================================================================
    // WORKFLOW G: Help & Disputes Lifecycle
    // =========================================================================
    console.log('\n--- [WORKFLOW G] Help Centre & Support Disputes ---');

    let disputeId = null;
    try {
      const res = await fetch(`${BASE_URL}/api/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          subject: 'Clarification on Task Engagement Reward',
          description: 'Requesting confirmation on whether weekend campaign bonuses apply to this survey activity.',
          userTaskId: taskAId,
        }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.success);
      assert.ok(data.dispute.id);
      disputeId = data.dispute.id;
      recordPass('G.1.1 Creator successfully files dispute referencing their valid task');

      // Fetch disputes list
      const listRes = await fetch(`${BASE_URL}/api/disputes`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(listRes.status, 200);
      const listData = await listRes.json();
      const foundDisp = listData.disputes.find(d => d.id === disputeId);
      assert.ok(foundDisp);
      assert.strictEqual(foundDisp.status, 'OPEN');
      recordPass('G.1.2 Dispute history accurately displays saved ticket with status OPEN');
    } catch (err) {
      recordFail('G.1.1 Dispute filing error', err);
    }

    // =========================================================================
    // WORKFLOW H: Multi-Tenant IDOR & Cross-User Security Defense
    // =========================================================================
    console.log('\n--- [WORKFLOW H] Multi-Tenant IDOR & Cross-User Security Defense ---');

    // H.1: User B cannot access User A's wallet
    try {
      // Direct call to /api/wallet uses session.userId; User B calling it only receives User B's wallet
      const res = await fetch(`${BASE_URL}/api/wallet`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.strictEqual(res.status, 200);
      const bWallet = await res.json();
      assert.strictEqual(bWallet.wallet.userId, testUserB.id);
      assert.notStrictEqual(bWallet.wallet.userId, testUserA.id);
      assert.strictEqual(bWallet.wallet.availablePaise, '10000');
      recordPass('H.1.1 Tenant Isolation: User B cannot read User A wallet (returns only own ₹100.00 wallet)');
    } catch (err) {
      recordFail('H.1.1 Wallet IDOR error', err);
    }

    // H.2: User B cannot delete or access User A's payout method
    try {
      const res = await fetch(`${BASE_URL}/api/payout-methods?id=${methodId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      assert.strictEqual(res.status, 404);
      recordPass('H.1.2 Tenant Isolation: User B blocked from deleting User A payout method (HTTP 404)');
    } catch (err) {
      recordFail('H.1.2 Payout method IDOR error', err);
    }

    // H.3: User B cannot file dispute referencing User A's task
    try {
      const res = await fetch(`${BASE_URL}/api/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          subject: 'Hijack User A Task',
          description: 'Attempting to claim User A task credit',
          userTaskId: taskAId,
        }),
      });
      assert.strictEqual(res.status, 403);
      recordPass('H.1.3 IDOR Defense: User B blocked from filing dispute on User A task (HTTP 403)');
    } catch (err) {
      recordFail('H.1.3 Dispute IDOR error', err);
    }

    // H.4: User B cannot file dispute referencing User A's payout request
    try {
      const res = await fetch(`${BASE_URL}/api/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          subject: 'Hijack User A Payout',
          description: 'Attempting to dispute User A payout',
          payoutRequestId: payoutRequestIdA,
        }),
      });
      assert.strictEqual(res.status, 403);
      recordPass('H.1.4 IDOR Defense: User B blocked from disputing User A payout request (HTTP 403)');
    } catch (err) {
      recordFail('H.1.4 Payout IDOR error', err);
    }

    // H.5: User accounts strictly denied access to Brand Portal & APIs
    try {
      const res = await fetch(`${BASE_URL}/api/advertiser/campaigns`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 403);
      recordPass('H.1.5 Route Boundary: USER account strictly blocked from /api/advertiser/* (HTTP 403)');
    } catch (err) {
      recordFail('H.1.5 Brand route denial error', err);
    }

    // H.6: User accounts strictly denied access to Admin Portal & APIs
    try {
      const res = await fetch(`${BASE_URL}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.strictEqual(res.status, 403);
      recordPass('H.1.6 Route Boundary: USER account strictly blocked from /api/admin/* (HTTP 403)');
    } catch (err) {
      recordFail('H.1.6 Admin route denial error', err);
    }

    // -------------------------------------------------------------------------
    // WORKFLOW I: User Portal Navigation Links, Page Routing & Anti-Leak Verification
    // -------------------------------------------------------------------------
    console.log('\n--- [WORKFLOW I] Navigation Links & Cross-Portal Boundary Verification ---');

    // Generate tokens for Admin and Advertiser roles
    const adminToken = jwt.sign(
      { userId: 'audit_admin_user', email: 'admin@adearn.ai', name: 'Admin', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const advertiserToken = jwt.sign(
      { userId: 'audit_advertiser_user', email: 'brand@adearn.ai', name: 'Brand', role: 'ADVERTISER', organizationId: testOrg.id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // I.1.1: Creator requests / (User Dashboard) -> 200 OK
    try {
      const res = await fetch(`${BASE_URL}/`, {
        headers: { Cookie: `adearn_session=${tokenA}` },
        redirect: 'manual',
      });
      assert.strictEqual(res.status, 200);
      recordPass('I.1.1 Creator navigation to / (User Dashboard) returns HTTP 200');
    } catch (err) {
      recordFail('I.1.1 Navigation to / error', err);
    }

    // I.1.2: Creator requests /feed (Active Tasks) -> 200 OK (NO redirect to /admin)
    try {
      const res = await fetch(`${BASE_URL}/feed`, {
        headers: { Cookie: `adearn_session=${tokenA}` },
        redirect: 'manual',
      });
      assert.strictEqual(res.status, 200);
      assert.notStrictEqual(res.status, 307);
      recordPass('I.1.2 Creator navigation to /feed (Active Tasks) returns HTTP 200 (Zero redirect to /admin)');
    } catch (err) {
      recordFail('I.1.2 Navigation to /feed error', err);
    }

    // I.1.3: Creator requests /tasks -> Redirects safely to /feed
    try {
      const res = await fetch(`${BASE_URL}/tasks`, {
        headers: { Cookie: `adearn_session=${tokenA}` },
        redirect: 'manual',
      });
      assert.ok(res.status === 307 || res.status === 308);
      assert.ok(res.headers.get('location')?.endsWith('/feed'));
      recordPass('I.1.3 Navigation to /tasks normalized safely to /feed (HTTP 307)');
    } catch (err) {
      recordFail('I.1.3 /tasks normalization error', err);
    }

    // I.1.4: Creator requests /wallet -> 200 OK
    try {
      const res = await fetch(`${BASE_URL}/wallet`, {
        headers: { Cookie: `adearn_session=${tokenA}` },
        redirect: 'manual',
      });
      assert.strictEqual(res.status, 200);
      recordPass('I.1.4 Creator navigation to /wallet returns HTTP 200');
    } catch (err) {
      recordFail('I.1.4 Navigation to /wallet error', err);
    }

    // I.1.5: Creator requests /withdrawals -> 200 OK
    try {
      const res = await fetch(`${BASE_URL}/withdrawals`, {
        headers: { Cookie: `adearn_session=${tokenA}` },
        redirect: 'manual',
      });
      assert.strictEqual(res.status, 200);
      recordPass('I.1.5 Creator navigation to /withdrawals returns HTTP 200');
    } catch (err) {
      recordFail('I.1.5 Navigation to /withdrawals error', err);
    }

    // I.1.6: Creator requests /profile -> 200 OK
    try {
      const res = await fetch(`${BASE_URL}/profile`, {
        headers: { Cookie: `adearn_session=${tokenA}` },
        redirect: 'manual',
      });
      assert.strictEqual(res.status, 200);
      recordPass('I.1.6 Creator navigation to /profile returns HTTP 200');
    } catch (err) {
      recordFail('I.1.6 Navigation to /profile error', err);
    }

    // I.1.7: Creator requests /support -> 200 OK
    try {
      const res = await fetch(`${BASE_URL}/support`, {
        headers: { Cookie: `adearn_session=${tokenA}` },
        redirect: 'manual',
      });
      assert.strictEqual(res.status, 200);
      recordPass('I.1.7 Creator navigation to /support returns HTTP 200');
    } catch (err) {
      recordFail('I.1.7 Navigation to /support error', err);
    }

    // I.1.8: Creator requests /extension -> 200 OK
    try {
      const res = await fetch(`${BASE_URL}/extension`, {
        headers: { Cookie: `adearn_session=${tokenA}` },
        redirect: 'manual',
      });
      assert.strictEqual(res.status, 200);
      recordPass('I.1.8 Creator navigation to /extension returns HTTP 200');
    } catch (err) {
      recordFail('I.1.8 Navigation to /extension error', err);
    }

    // I.1.9: Admin role navigating to / (User Board) -> Immediately redirected to /admin
    try {
      const res = await fetch(`${BASE_URL}/`, {
        headers: { Cookie: `adearn_session=${adminToken}` },
        redirect: 'manual',
      });
      assert.ok(res.status === 307 || res.status === 308);
      assert.ok(res.headers.get('location')?.endsWith('/admin'));
      recordPass('I.1.9 Anti-Leak: Admin accessing / (User Board) redirected strictly to /admin');
    } catch (err) {
      recordFail('I.1.9 Admin redirect on / error', err);
    }

    // I.1.10: Admin role navigating to /feed -> Immediately redirected to /admin
    try {
      const res = await fetch(`${BASE_URL}/feed`, {
        headers: { Cookie: `adearn_session=${adminToken}` },
        redirect: 'manual',
      });
      assert.ok(res.status === 307 || res.status === 308);
      assert.ok(res.headers.get('location')?.endsWith('/admin'));
      recordPass('I.1.10 Anti-Leak: Admin accessing /feed redirected strictly to /admin');
    } catch (err) {
      recordFail('I.1.10 Admin redirect on /feed error', err);
    }

    // I.1.11: Advertiser role navigating to / -> Immediately redirected to /advertiser
    try {
      const res = await fetch(`${BASE_URL}/`, {
        headers: { Cookie: `adearn_session=${advertiserToken}` },
        redirect: 'manual',
      });
      assert.ok(res.status === 307 || res.status === 308);
      assert.ok(res.headers.get('location')?.endsWith('/advertiser'));
      recordPass('I.1.11 Anti-Leak: Brand accessing / (User Board) redirected strictly to /advertiser');
    } catch (err) {
      recordFail('I.1.11 Brand redirect on / error', err);
    }

  } catch (globalErr) {
    recordFail('Global User Portal Audit Error', globalErr);
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP: Prune Ephemeral Audit Test Fixtures
    // -------------------------------------------------------------------------
    console.log('\n--- [CLEANUP] Pruning Ephemeral Audit Fixtures from MySQL ---');
    try {
      await prisma.dispute.deleteMany({
        where: { userId: { in: [testUserA.id, testUserB.id] } },
      });
      await prisma.userTask.deleteMany({
        where: { userId: { in: [testUserA.id, testUserB.id] } },
      });
      await prisma.payoutRequest.deleteMany({
        where: { userId: { in: [testUserA.id, testUserB.id] } },
      });
      await prisma.payoutMethod.deleteMany({
        where: { userId: { in: [testUserA.id, testUserB.id] } },
      });
      await prisma.ledgerTransaction.deleteMany({
        where: {
          wallet: { userId: { in: [testUserA.id, testUserB.id] } },
        },
      });
      if (campaignId) {
        await prisma.campaign.deleteMany({ where: { id: campaignId } });
      }
      await prisma.wallet.deleteMany({
        where: {
          OR: [
            { userId: { in: [testUserA.id, testUserB.id] } },
            { organizationId: testOrg.id },
          ],
        },
      });
      await prisma.organization.deleteMany({
        where: { id: testOrg.id },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUserA.id, testUserB.id] } },
      });
      recordPass('Ephemeral audit fixtures cleanly pruned from MySQL. Zero production leakage.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 USER PORTAL AUDIT RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUserPortalAudit().catch((err) => {
  console.error('Fatal user portal audit runner error:', err);
  process.exit(1);
});
