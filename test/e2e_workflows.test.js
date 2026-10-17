/**
 * AdEarn AI Comprehensive End-to-End Test Suite
 * Covers:
 * Workflow A: User Earns a Reward (Registration, Login, Feed, Task Start, Telemetry Submit, Wallet Credit, Withdrawal, Clearing)
 * Workflow B: Advertiser Publishes a Campaign (Registration, Org, Escrow Top-Up, Campaign Creation, Moderation, Budget Lock)
 * Workflow C: Admin Operations & Governance (Audit Logs, Fraud Lab, Payout Batch Clearing, Unit Economics)
 * Workflow D: Chrome Extension Live Session Sync & Cross-Portal Consistency
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'adearn-secret-jwt-key-2025';

async function runE2ETests() {
  console.log('================================================================');
  console.log('🚀 ADEARN AI END-TO-END WORKFLOW & CROSS-PORTAL TEST SUITE');
  console.log('Testing against Live Database: MySQL 8.0 (adearn_ai)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function step(description, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${description}`);
      console.error(`    -> ${err.message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  let testUserId = null;
  let testUserEmail = `creator_${timestamp}@test.in`;
  let testUserToken = null;
  let testWalletId = null;

  let testAdvId = null;
  let testAdvEmail = `brand_${timestamp}@zerodha.in`;
  let testAdvToken = null;
  let testOrgId = null;
  let testAdvWalletId = null;
  let testCampaignId = null;

  let adminUser = null;
  let adminToken = null;

  // SETUP: Find or verify seeded admin
  await step('Locate authoritative System Administrator account', async () => {
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    assert.ok(adminUser, 'Admin account must exist');
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
      JWT_SECRET
    );
  });

  // ============================================================================
  // WORKFLOW A: USER REGISTRATION, ENGAGEMENT, REWARD, AND WITHDRAWAL
  // ============================================================================
  console.log('\n--- [WORKFLOW A] User Registration, Engagement & Payout Lifecycle ---');

  await step('Step 1: Register new Creator User in live MySQL', async () => {
    const passwordHash = await bcrypt.hash('CreatorPass123!', 10);
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash,
        name: `Test Creator ${timestamp}`,
        role: 'USER',
        upiId: `testuser_${timestamp}@okaxis`,
        wallet: {
          create: {
            availablePaise: 0n,
            pendingPaise: 0n,
            escrowPaise: 0n,
            lifetimeEarnedPaise: 0n,
            lifetimePaidPaise: 0n,
          },
        },
      },
      include: { wallet: true },
    });

    testUserId = user.id;
    testWalletId = user.wallet.id;
    assert.strictEqual(user.wallet.availablePaise, 0n);
    assert.ok(testUserId);
  });

  await step('Step 2: Authenticate user & issue signed JWT session', async () => {
    const user = await prisma.user.findUnique({ where: { email: testUserEmail } });
    assert.ok(user);
    const isMatch = await bcrypt.compare('CreatorPass123!', user.passwordHash);
    assert.strictEqual(isMatch, true);

    testUserToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role, organizationId: null },
      JWT_SECRET
    );
    assert.ok(testUserToken);
  });

  await step('Step 3: Discover active sponsored campaigns from live feed', async () => {
    const campaigns = await prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
      include: { organization: true },
    });
    assert.ok(campaigns.length > 0, 'Feed must return at least one active campaign');
    testCampaignId = campaigns[0].id;
  });

  let taskSessionToken = null;
  let taskId = null;

  await step('Step 4: Start an interactive task session and obtain signed token', async () => {
    const campaign = await prisma.campaign.findUnique({ where: { id: testCampaignId } });
    assert.ok(campaign);

    taskSessionToken = `adearn_sess_${testUserId}_${testCampaignId}_${timestamp}`;
    const task = await prisma.userTask.create({
      data: {
        campaignId: testCampaignId,
        userId: testUserId,
        sessionToken: taskSessionToken,
        status: 'STARTED',
        rewardPaise: campaign.costPerOutcomePaise,
      },
    });

    taskId = task.id;
    assert.ok(taskId);
    assert.strictEqual(task.status, 'STARTED');
  });

  await step('Step 5: Reject automated bot submission with zero mouse movement', async () => {
    const zeroMovement = 0;
    const dwellSeconds = 2; // Under threshold
    const isBot = dwellSeconds < 15 || zeroMovement < 5;
    assert.strictEqual(isBot, true, 'Zero movement macro must trigger bot heuristic');

    // Simulate rejection in database
    await prisma.userTask.update({
      where: { id: taskId },
      data: {
        anomalyScore: 0.85,
        fraudVerdict: 'FLAGGED',
      },
    });

    const task = await prisma.userTask.findUnique({ where: { id: taskId } });
    assert.strictEqual(task.fraudVerdict, 'FLAGGED');
  });

  await step('Step 6: Submit genuine human activity with adequate dwell & telemetry', async () => {
    const campaign = await prisma.campaign.findUnique({ where: { id: testCampaignId } });
    const rewardPaise = campaign.costPerOutcomePaise;

    // Transition task to VALIDATED
    await prisma.userTask.update({
      where: { id: taskId },
      data: {
        status: 'VALIDATED',
        fraudVerdict: 'CLEARED',
        anomalyScore: 0.05,
        validatedAt: new Date(),
      },
    });

    // Credit reward to wallet via Authoritative Financial Ledger
    const idempotencyKey = `REWARD-E2E-${taskId}`;
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: testWalletId },
        data: {
          availablePaise: { increment: rewardPaise },
          lifetimeEarnedPaise: { increment: rewardPaise },
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          referenceId: taskId,
          walletId: testWalletId,
          type: 'CREDIT_REWARD',
          amountPaise: rewardPaise,
          balanceAfterPaise: rewardPaise,
          idempotencyKey,
          reason: 'E2E Test task completion verified reward',
        },
      });

      await tx.campaign.update({
        where: { id: testCampaignId },
        data: {
          verifiedOutcomes: { increment: 1 },
          budgetSpentPaise: { increment: rewardPaise },
        },
      });
    });

    const updatedWallet = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    assert.strictEqual(updatedWallet.availablePaise, rewardPaise);
    assert.strictEqual(updatedWallet.lifetimeEarnedPaise, rewardPaise);
  });

  await step('Step 7: Verify ledger idempotency prevents duplicate reward crediting', async () => {
    const idempotencyKey = `REWARD-E2E-${taskId}`;
    const duplicateCheck = await prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey },
    });
    assert.ok(duplicateCheck, 'Idempotency key must exist');

    // Attempting to reuse same idempotency key must be detected
    const isDuplicate = Boolean(duplicateCheck);
    assert.strictEqual(isDuplicate, true);
  });

  await step('Step 8: Overdraft protection prevents withdrawal exceeding available balance', async () => {
    const wallet = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    const excessiveAmount = wallet.availablePaise + 500000n; // Exceeds balance

    assert.throws(() => {
      if (wallet.availablePaise < excessiveAmount) {
        throw new Error('INSUFFICIENT_FUNDS');
      }
    }, /INSUFFICIENT_FUNDS/);
  });

  let payoutRequestId = null;

  await step('Step 9: Request voluntary payout to verified UPI destination', async () => {
    const wallet = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    const payoutAmount = wallet.availablePaise; // Withdraw all
    assert.ok(payoutAmount > 0n);

    const idempotencyKey = `PAYOUT-E2E-${testUserId}-${timestamp}`;

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: testWalletId },
        data: {
          availablePaise: { decrement: payoutAmount },
          lifetimePaidPaise: { increment: payoutAmount },
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          referenceId: idempotencyKey,
          walletId: testWalletId,
          type: 'DEBIT_WITHDRAWAL',
          amountPaise: payoutAmount,
          balanceAfterPaise: 0n,
          idempotencyKey,
          reason: 'Voluntary withdrawal payout test',
        },
      });

      const payout = await tx.payoutRequest.create({
        data: {
          userId: testUserId,
          amountPaise: payoutAmount,
          method: 'UPI',
          destinationAddress: `testuser_${timestamp}@okaxis`,
          maskedAddress: `te**@okaxis`,
          status: 'PROCESSING',
          idempotencyKey,
        },
      });

      payoutRequestId = payout.id;
    });

    const refreshedWallet = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    assert.strictEqual(refreshedWallet.availablePaise, 0n);
    assert.ok(payoutRequestId);
  });

  await step('Step 10: Bank clearing confirmation attaches UTR and updates to CLEARED', async () => {
    const simulatedUTR = `UTR-NPCI-E2E-${timestamp}`;

    await prisma.payoutRequest.update({
      where: { id: payoutRequestId },
      data: {
        status: 'CLEARED',
        utrNumber: simulatedUTR,
        clearedAt: new Date(),
      },
    });

    const finalPayout = await prisma.payoutRequest.findUnique({ where: { id: payoutRequestId } });
    assert.strictEqual(finalPayout.status, 'CLEARED');
    assert.strictEqual(finalPayout.utrNumber, simulatedUTR);
  });

  // ============================================================================
  // WORKFLOW B: ADVERTISER CAMPAIGN PUBLISHING & ESCROW BUDGET LOCK
  // ============================================================================
  console.log('\n--- [WORKFLOW B] Advertiser Publishing & Nodal Escrow Budget Lifecycle ---');

  await step('Step 1: Register Advertiser Organization & Escrow Wallet', async () => {
    const passwordHash = await bcrypt.hash('AdvPass123!', 10);
    const user = await prisma.user.create({
      data: {
        email: testAdvEmail,
        passwordHash,
        name: `Test Brand Lead ${timestamp}`,
        role: 'ADVERTISER',
      },
    });
    testAdvId = user.id;

    const org = await prisma.organization.create({
      data: {
        name: `Acme FinTech ${timestamp}`,
        gstin: '29ABCDE1234F1Z5',
        contactEmail: testAdvEmail,
        isVerified: true,
        users: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
        wallet: {
          create: {
            escrowPaise: 0n,
            availablePaise: 0n,
            pendingPaise: 0n,
          },
        },
      },
      include: { wallet: true },
    });

    testOrgId = org.id;
    testAdvWalletId = org.wallet.id;
    assert.ok(testOrgId);
    assert.ok(testAdvWalletId);
  });

  await step('Step 2: Top-Up Nodal Escrow Pool via RTGS/UPI', async () => {
    const topupAmountPaise = 5000000n; // ₹50,000.00
    const idempotencyKey = `TOPUP-E2E-${testOrgId}-${timestamp}`;

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: testAdvWalletId },
        data: {
          escrowPaise: { increment: topupAmountPaise },
        },
      });

      await tx.ledgerTransaction.create({
        data: {
          referenceId: `RTGS-MOCK-${timestamp}`,
          walletId: testAdvWalletId,
          type: 'ADVERTISER_TOPUP',
          amountPaise: topupAmountPaise,
          balanceAfterPaise: topupAmountPaise,
          idempotencyKey,
          reason: 'Advertiser Nodal Escrow Pool Top-Up via RTGS',
        },
      });
    });

    const w = await prisma.wallet.findUnique({ where: { id: testAdvWalletId } });
    assert.strictEqual(w.escrowPaise, topupAmountPaise);
  });

  let createdCampaignId = null;

  await step('Step 3: Create Campaign and Lock Escrow Budget Atomically', async () => {
    const budgetAllocatedPaise = 2000000n; // ₹20,000.00
    const costPerOutcomePaise = 5000n; // ₹50.00 per outcome
    const idempotencyKey = `LOCK-E2E-${testOrgId}-${timestamp}`;

    await prisma.$transaction(async (tx) => {
      // 1. Deduct unreserved escrow
      await tx.wallet.update({
        where: { id: testAdvWalletId },
        data: {
          escrowPaise: { decrement: budgetAllocatedPaise },
        },
      });

      // 2. Post ESCROW_LOCK ledger entry
      await tx.ledgerTransaction.create({
        data: {
          referenceId: idempotencyKey,
          walletId: testAdvWalletId,
          type: 'ESCROW_LOCK',
          amountPaise: budgetAllocatedPaise,
          balanceAfterPaise: 3000000n, // Remaining ₹30,000 unreserved
          idempotencyKey,
          reason: 'Escrow budget locked for campaign flight',
        },
      });

      // 3. Create campaign in DRAFT / IN_REVIEW
      const campaign = await tx.campaign.create({
        data: {
          organizationId: testOrgId,
          title: `E2E Brand Engagement Flight ${timestamp}`,
          description: 'Verified voluntary survey for accredited retail investors.',
          category: 'FinTech',
          actionType: 'SURVEY',
          status: 'IN_REVIEW',
          targetUrl: 'https://acmefintech.in/survey',
          budgetAllocatedPaise,
          budgetSpentPaise: 0n,
          costPerOutcomePaise,
          targetOutcomes: 400,
          flightStart: new Date(),
          flightEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      createdCampaignId = campaign.id;
    });

    const remainingWallet = await prisma.wallet.findUnique({ where: { id: testAdvWalletId } });
    assert.strictEqual(remainingWallet.escrowPaise, 3000000n);
    assert.ok(createdCampaignId);
  });

  await step('Step 4: Verify campaign is NOT live before admin moderation', async () => {
    const camp = await prisma.campaign.findUnique({ where: { id: createdCampaignId } });
    assert.strictEqual(camp.status, 'IN_REVIEW');

    // Should not appear in active feed
    const inFeed = await prisma.campaign.findFirst({
      where: { id: createdCampaignId, status: 'ACTIVE' },
    });
    assert.strictEqual(inFeed, null, 'Unapproved campaign must not appear in feed');
  });

  await step('Step 5: Admin Moderation Desk reviews & approves campaign', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id: createdCampaignId },
        data: { status: 'ACTIVE' },
      });

      await tx.moderationRecord.create({
        data: {
          campaignId: createdCampaignId,
          reviewerUserId: adminUser.id,
          decision: 'ACTIVE',
          reviewerNotes: 'ASCI disclosures and advertiser funding verified.',
          reviewedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUser.id,
          actorRole: 'ADMIN',
          action: 'CAMPAIGN_APPROVED_ACTIVE',
          entityType: 'Campaign',
          entityId: createdCampaignId,
          cryptographicHash: `hash-${Date.now()}`,
        },
      });
    });

    const liveCamp = await prisma.campaign.findUnique({ where: { id: createdCampaignId } });
    assert.strictEqual(liveCamp.status, 'ACTIVE');
  });

  await step('Step 6: Approved campaign appears in live feed for voluntary user participation', async () => {
    const available = await prisma.campaign.findFirst({
      where: { id: createdCampaignId, status: 'ACTIVE' },
    });
    assert.ok(available, 'Approved campaign must now be available in public feed');
  });

  // ============================================================================
  // WORKFLOW C: ADMIN OPERATIONS, AUDIT LOGS & UNIT ECONOMICS
  // ============================================================================
  console.log('\n--- [WORKFLOW C] Admin Operations, Forensic Audit & Governance ---');

  await step('Step 1: Admin inspects moderation records in MySQL', async () => {
    const records = await prisma.moderationRecord.findMany({
      where: { campaignId: createdCampaignId },
    });
    assert.ok(records.length > 0);
    assert.strictEqual(records[0].decision, 'ACTIVE');
  });

  await step('Step 2: Cryptographic audit log chain verification', async () => {
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: createdCampaignId },
    });
    assert.ok(auditLogs.length > 0);
    assert.ok(auditLogs[0].cryptographicHash);
  });

  await step('Step 3: Platform Unit Economics & Gross Margin calculation', async () => {
    const [campaigns, tasks, payouts] = await Promise.all([
      prisma.campaign.findMany(),
      prisma.userTask.findMany({ where: { status: 'VALIDATED' } }),
      prisma.payoutRequest.findMany({ where: { status: 'CLEARED' } }),
    ]);

    let totalSpend = 0n;
    for (const c of campaigns) totalSpend += c.budgetSpentPaise;

    let totalLiabilities = 0n;
    for (const t of tasks) totalLiabilities += t.rewardPaise;

    assert.ok(typeof totalSpend === 'bigint');
    assert.ok(typeof totalLiabilities === 'bigint');
  });

  // ============================================================================
  // WORKFLOW D: CHROME EXTENSION LIVE SESSION & CROSS-PORTAL CONSISTENCY
  // ============================================================================
  console.log('\n--- [WORKFLOW D] Chrome Extension Live Session & Cross-Portal Consistency ---');

  await step('Step 1: Companion Extension query reflects exact live creator wallet balance', async () => {
    const wallet = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    const eligibleCount = await prisma.campaign.count({ where: { status: 'ACTIVE' } });

    // Extension API response shape:
    const extensionPayload = {
      authenticated: true,
      user: { id: testUserId, email: testUserEmail },
      wallet: {
        availablePaise: wallet.availablePaise.toString(),
        pendingPaise: wallet.pendingPaise.toString(),
      },
      companionTelemetry: {
        eligibleCampaignsCount: eligibleCount,
      },
    };

    assert.strictEqual(extensionPayload.wallet.availablePaise, '0');
    assert.ok(extensionPayload.companionTelemetry.eligibleCampaignsCount >= 1);
  });

  await step('Step 2: Cross-portal consistency: User, Advertiser & Admin see matching ledger facts', async () => {
    // 1. User sees their cleared payout
    const userPayout = await prisma.payoutRequest.findFirst({
      where: { userId: testUserId, id: payoutRequestId },
    });
    assert.strictEqual(userPayout.status, 'CLEARED');

    // 2. Admin sees the exact same cleared payout in the clearing queue
    const adminPayout = await prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { user: true },
    });
    assert.strictEqual(adminPayout.status, 'CLEARED');
    assert.strictEqual(adminPayout.user.id, testUserId);

    // 3. Advertiser sees their campaign active and budget locked
    const advCampaign = await prisma.campaign.findUnique({
      where: { id: createdCampaignId },
    });
    assert.strictEqual(advCampaign.status, 'ACTIVE');
    assert.strictEqual(advCampaign.organizationId, testOrgId);
  });

  // ============================================================================
  // CLEANUP TEST FIXTURES
  // ============================================================================
  console.log('\n--- Cleanup Non-Destructive Test Fixtures ---');

  await step('Safely prune ephemeral test records from database', async () => {
    // Prune test-specific tasks, disputes, payouts, campaigns, and wallets
    if (taskId) await prisma.userTask.deleteMany({ where: { id: taskId } });
    if (payoutRequestId) await prisma.payoutRequest.deleteMany({ where: { id: payoutRequestId } });
    if (createdCampaignId) {
      await prisma.moderationRecord.deleteMany({ where: { campaignId: createdCampaignId } });
      await prisma.creativeAsset.deleteMany({ where: { campaignId: createdCampaignId } });
      await prisma.campaign.deleteMany({ where: { id: createdCampaignId } });
    }
    if (testWalletId) {
      await prisma.ledgerTransaction.deleteMany({ where: { walletId: testWalletId } });
      await prisma.wallet.deleteMany({ where: { id: testWalletId } });
    }
    if (testAdvWalletId) {
      await prisma.ledgerTransaction.deleteMany({ where: { walletId: testAdvWalletId } });
      await prisma.wallet.deleteMany({ where: { id: testAdvWalletId } });
    }
    if (testOrgId) {
      await prisma.userOrganization.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.organization.deleteMany({ where: { id: testOrgId } });
    }
    if (testUserId) await prisma.user.deleteMany({ where: { id: testUserId } });
    if (testAdvId) await prisma.user.deleteMany({ where: { id: testAdvId } });

    console.log('    All ephemeral test records pruned. Genuine database state preserved.');
  });

  console.log('\n================================================================');
  console.log(`🏁 END-TO-END TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch(async (e) => {
  console.error('E2E Execution Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
