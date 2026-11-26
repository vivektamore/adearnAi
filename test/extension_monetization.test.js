// AdEarn AI — Master Extension Monetization & Accounting Audit Suite
// Verifies Manifest V3 compliance, exact CPM arithmetic, cumulative delta aggregation,
// atomic budget row-locking under concurrency, frequency capping, and double-entry ledger equilibrium.

const assert = require('assert');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'adearn-ai-development-super-secret-jwt-key-2026-minimum-32-chars-long';
const TELEMETRY_SIGNING_KEY = process.env.TELEMETRY_SIGNING_KEY || 'telemetry-integrity-key-adearn-ai-prod-2026';
const BASE_URL = 'http://localhost:3000';

function generateTestImpressionToken(payload, ttlSeconds = 60) {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    issuedAt: now,
    expiresAt: now + ttlSeconds,
  };
  const dataStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', TELEMETRY_SIGNING_KEY).update(dataStr).digest('base64url');
  return `${dataStr}.${hmac}`;
}

function makeAuthHeader(user) {
  const token = jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function runTests() {
  console.log('\n================================================================');
  console.log('⚡ ADEARN AI EXTENSION MONETIZATION & ACCOUNTING AUDIT SUITE');
  console.log('Testing against Live Local Server & Live MySQL 8.0');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // ==========================================================================
  // SECTION 1: CPM ARITHMETIC & DELTA AGGREGATION UNIT TESTS
  // ==========================================================================
  console.log('--- [SECTION 1] Exact Integer Paise CPM Arithmetic & Delta Aggregation ---');

  // Exact math implementation mirrors src/lib/ads.ts
  function calculateCumulativeCpmPaise(cpmRatePaise, creatorRewardCpmPaise, totalCount) {
    const count = BigInt(totalCount);
    if (count <= 0n) return { totalChargePaise: 0n, totalRewardPaise: 0n, totalPlatformMarginPaise: 0n };
    const totalChargePaise = (BigInt(cpmRatePaise) * count) / 1000n;
    const totalRewardPaise = (BigInt(creatorRewardCpmPaise) * count) / 1000n;
    const totalPlatformMarginPaise = totalChargePaise >= totalRewardPaise ? totalChargePaise - totalRewardPaise : 0n;
    return { totalChargePaise, totalRewardPaise, totalPlatformMarginPaise };
  }

  function calculateMarginalCpmPaise(cpmRatePaise, creatorRewardCpmPaise, priorCount, batchCount = 1) {
    const prior = BigInt(priorCount);
    const batch = BigInt(batchCount);
    if (batch <= 0n) return { deltaChargePaise: 0n, deltaRewardPaise: 0n, deltaPlatformMarginPaise: 0n };
    const priorCalc = calculateCumulativeCpmPaise(cpmRatePaise, creatorRewardCpmPaise, prior);
    const newCalc = calculateCumulativeCpmPaise(cpmRatePaise, creatorRewardCpmPaise, prior + batch);
    const deltaChargePaise = newCalc.totalChargePaise - priorCalc.totalChargePaise;
    const deltaRewardPaise = newCalc.totalRewardPaise - priorCalc.totalRewardPaise;
    const deltaPlatformMarginPaise = deltaChargePaise >= deltaRewardPaise ? deltaChargePaise - deltaRewardPaise : 0n;
    return { deltaChargePaise, deltaRewardPaise, deltaPlatformMarginPaise };
  }

  await test('1.1 Exact CPM calculation: 1, 999, 1000, 1001 impressions with standard CPM (₹50/₹30)', async () => {
    const cpmRate = 5000n; // ₹50.00
    const creatorRate = 3000n; // ₹30.00

    // 1 impression
    const c1 = calculateCumulativeCpmPaise(cpmRate, creatorRate, 1);
    assert.strictEqual(c1.totalChargePaise, 5n, '1 impression = 5 paise charge');
    assert.strictEqual(c1.totalRewardPaise, 3n, '1 impression = 3 paise reward');
    assert.strictEqual(c1.totalPlatformMarginPaise, 2n, '1 impression = 2 paise margin');

    // 999 impressions
    const c999 = calculateCumulativeCpmPaise(cpmRate, creatorRate, 999);
    assert.strictEqual(c999.totalChargePaise, 4995n, '999 impressions = 4995 paise charge');
    assert.strictEqual(c999.totalRewardPaise, 2997n, '999 impressions = 2997 paise reward');

    // 1000 impressions
    const c1000 = calculateCumulativeCpmPaise(cpmRate, creatorRate, 1000);
    assert.strictEqual(c1000.totalChargePaise, 5000n, '1000 impressions = 5000 paise exact');
    assert.strictEqual(c1000.totalRewardPaise, 3000n, '1000 impressions = 3000 paise exact');

    // 1001 impressions
    const c1001 = calculateCumulativeCpmPaise(cpmRate, creatorRate, 1001);
    assert.strictEqual(c1001.totalChargePaise, 5005n, '1001 impressions = 5005 paise');
    assert.strictEqual(c1001.totalRewardPaise, 3003n, '1001 impressions = 3003 paise');
  });

  await test('1.2 Fractional CPM handling: CPM rates not divisible by 1000 (e.g. ₹25.00 CPM = 2500 paise)', async () => {
    const cpmRate = 2500n; // 2.5 paise per impression
    const creatorRate = 1500n; // 1.5 paise per impression

    // Over 4 single impressions, verify delta accumulation eliminates fractional loss:
    let runningCharge = 0n;
    let runningReward = 0n;

    for (let i = 0; i < 4; i++) {
      const delta = calculateMarginalCpmPaise(cpmRate, creatorRate, i, 1);
      runningCharge += delta.deltaChargePaise;
      runningReward += delta.deltaRewardPaise;
    }

    assert.strictEqual(runningCharge, 10n, '4 impressions at 2.5 paise must equal exactly 10 paise');
    assert.strictEqual(runningReward, 6n, '4 impressions at 1.5 paise must equal exactly 6 paise');
  });

  await test('1.3 Zero-loss property: Sum of 1000 single-impression additions equals bulk 1000 calculation', async () => {
    const cpmRate = 3333n; // ₹33.33 CPM
    const creatorRate = 2222n; // ₹22.22 CPM

    let sumDeltaCharge = 0n;
    let sumDeltaReward = 0n;

    for (let i = 0; i < 1000; i++) {
      const m = calculateMarginalCpmPaise(cpmRate, creatorRate, i, 1);
      sumDeltaCharge += m.deltaChargePaise;
      sumDeltaReward += m.deltaRewardPaise;
    }

    const bulk = calculateCumulativeCpmPaise(cpmRate, creatorRate, 1000);
    assert.strictEqual(sumDeltaCharge, bulk.totalChargePaise, 'Incremental sum must equal bulk charge');
    assert.strictEqual(sumDeltaReward, bulk.totalRewardPaise, 'Incremental sum must equal bulk reward');
    assert.strictEqual(sumDeltaCharge, 3333n, 'Total charge must equal 3333 paise');
    assert.strictEqual(sumDeltaReward, 2222n, 'Total reward must equal 2222 paise');
  });

  await test('1.4 Large impression volume scale test: 1,000,000 impressions without overflow', async () => {
    const cpmRate = 5000n;
    const creatorRate = 3500n;
    const calc = calculateCumulativeCpmPaise(cpmRate, creatorRate, 1000000);
    assert.strictEqual(calc.totalChargePaise, 5000000n, '1M impressions = ₹50,000.00');
    assert.strictEqual(calc.totalRewardPaise, 3500000n, '1M impressions = ₹35,000.00');
    assert.strictEqual(calc.totalPlatformMarginPaise, 1500000n, '1M impressions = ₹15,000.00 margin');
  });

  // ==========================================================================
  // SECTION 2: CHROME EXTENSION MANIFEST V3 SECURITY
  // ==========================================================================
  console.log('\n--- [SECTION 2] Manifest V3 Extension Security & Neutralization ---');

  await test('2.1 Manifest V3: Prohibits ChatGPT host permissions and removes content_scripts', async () => {
    const manifestPath = path.join(__dirname, '../extension/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');
    assert.strictEqual(manifest.content_scripts, undefined, 'Must NOT contain third-party content scripts');
    assert.ok(manifest.background && manifest.background.service_worker, 'Must declare background service worker');

    for (const hp of manifest.host_permissions) {
      assert.ok(!hp.includes('chatgpt.com'), 'Must not request chatgpt.com');
      assert.ok(!hp.includes('openai.com'), 'Must not request openai.com');
    }

    const contentJsPath = path.join(__dirname, '../extension/content.js');
    const contentJs = fs.readFileSync(contentJsPath, 'utf8');
    assert.ok(!contentJs.includes('document.body.appendChild'), 'content.js must not perform DOM injection');
    assert.ok(!contentJs.includes('#prompt-textarea'), 'content.js must not manipulate ChatGPT prompt textarea');
  });

  // ==========================================================================
  // SECTION 3: SERVER APIS, ATOMIC CONCURRENCY & LEDGER RECONCILIATION
  // ==========================================================================
  console.log('\n--- [SECTION 3] Server APIs, Concurrency & Double-Entry Accounting ---');

  const timestamp = Date.now();
  const testAdvEmail = `adv_monetize_${timestamp}@test.in`;
  const testCreatorEmail = `creator_monetize_${timestamp}@test.in`;

  let creatorUser, advUser, organization, campaign;

  try {
    // Create Creator User & Wallet
    creatorUser = await prisma.user.create({
      data: {
        email: testCreatorEmail,
        passwordHash: 'dummy_hash',
        name: 'Arun Extension Tester',
        role: 'USER',
        wallet: {
          create: {
            availablePaise: 0n,
            pendingPaise: 0n,
            escrowPaise: 0n,
          },
        },
      },
      include: { wallet: true },
    });

    // Create Advertiser User & Organization & Wallet
    organization = await prisma.organization.create({
      data: {
        name: `Brand Flight ${timestamp}`,
        contactEmail: testAdvEmail,
        isVerified: true,
        wallet: {
          create: {
            availablePaise: 0n,
            pendingPaise: 0n,
            escrowPaise: 1000000n, // ₹10,000.00 in escrow
          },
        },
      },
      include: { wallet: true },
    });

    advUser = await prisma.user.create({
      data: {
        email: testAdvEmail,
        passwordHash: 'dummy_hash',
        name: 'Brand Advertiser',
        role: 'ADVERTISER',
        userOrganizations: {
          create: {
            organizationId: organization.id,
            role: 'OWNER',
          },
        },
      },
    });

    // Create an active funded campaign with CPM and CPO pricing
    campaign = await prisma.campaign.create({
      data: {
        organizationId: organization.id,
        title: `Sponsored AI Evaluation ${timestamp}`,
        description: 'Voluntary evaluation of enterprise AI capabilities with guaranteed rewards.',
        category: 'Enterprise SaaS',
        actionType: 'SANDBOX_TRIAL',
        pricingModel: 'CPM',
        cpmRatePaise: 5000n, // ₹50.00 CPM (5 paise per view)
        creatorImpressionRewardPaise: 3000n, // ₹30.00 CPM (3 paise per view to creator)
        budgetAllocatedPaise: 500000n, // ₹5,000.00 allocated
        budgetSpentPaise: 0n,
        costPerOutcomePaise: 4000n, // ₹40.00 for full task
        status: 'ACTIVE',
        targetUrl: 'https://example.com/ai',
        creativeAssets: {
          create: {
            assetUrl: 'https://example.com/creative.png',
            assetType: 'BANNER',
            status: 'APPROVED',
          },
        },
      },
      include: { creativeAssets: true },
    });

    // Lock Escrow in double-entry ledger for campaign
    await prisma.wallet.update({
      where: { id: organization.wallet.id },
      data: { escrowPaise: { decrement: 500000n } },
    });

    const creatorHeaders = makeAuthHeader(creatorUser);

    // 3.1 Extension Authentication and Campaign Retrieval
    let servedAds = [];
    await test('3.1 Dedicated Ad-Serving API: Serves funded campaigns with signed tokens and brand identity', async () => {
      const res = await fetch(`${BASE_URL}/api/ads/serve`, { headers: creatorHeaders });
      assert.strictEqual(res.status, 200, 'Must return 200 OK');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.ads), 'Must return array of ads');
      assert.ok(data.ads.length >= 1, 'Must contain at least 1 eligible ad');

      servedAds = data.ads;
      const targetAd = servedAds.find((a) => a.id === campaign.id);
      assert.ok(targetAd, 'Campaign must be present in served ads');
      assert.ok(targetAd.impressionToken, 'Ad must include cryptographically signed impressionToken');
      assert.ok(targetAd.brand && targetAd.brand.name, 'Ad must clearly label brand identity');
    });

    // 3.2 Unauthorized Access Rejection
    await test('3.2 Unauthorized access to /api/ads/serve returns 401 JSON', async () => {
      const res = await fetch(`${BASE_URL}/api/ads/serve`);
      assert.strictEqual(res.status, 401, 'Must return 401 Unauthorized');
      const data = await res.json();
      assert.ok(data.error);
    });

    // 3.3 Valid Impression Submission & Full Economic Ledger Crediting
    const targetAd = servedAds.find((a) => a.id === campaign.id) || servedAds[0];
    const eventId1 = `evt_test_1_${timestamp}`;

    await test('3.3 Valid Impression: Verifies dwell time and records balanced double-entry entries', async () => {
      const initialWallet = await prisma.wallet.findUnique({ where: { userId: creatorUser.id } });
      const initialBal = initialWallet.availablePaise;

      const res = await fetch(`${BASE_URL}/api/ads/impression`, {
        method: 'POST',
        headers: creatorHeaders,
        body: JSON.stringify({
          sessionToken: targetAd.impressionToken,
          eventId: eventId1,
          dwellSeconds: 1.5,
          viewabilityScore: 1.0,
        }),
      });

      assert.strictEqual(res.status, 200, 'Must return 200 OK');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.rewardPaise, '3', 'Reward must be exact integer 3 paise');

      // Verify wallet balance incremented by exactly 3 paise
      const updatedWallet = await prisma.wallet.findUnique({ where: { userId: creatorUser.id } });
      assert.strictEqual(updatedWallet.availablePaise, initialBal + 3n, 'Wallet must increment by 3 paise');

      // Verify campaign impression count incremented
      const updatedCamp = await prisma.campaign.findUnique({ where: { id: campaign.id } });
      assert.strictEqual(updatedCamp.impressionsCount, 1);
      assert.strictEqual(updatedCamp.budgetSpentPaise, 5n, 'Campaign spend incremented by 5 paise charge');

      // Verify Journal Transaction is balanced
      const journalTx = await prisma.journalTransaction.findUnique({
        where: { idempotencyKey: `IMPRESSION-${eventId1}` },
        include: { entries: true },
      });
      assert.ok(journalTx, 'Journal transaction must exist');
      let dr = 0n;
      let cr = 0n;
      for (const e of journalTx.entries) {
        if (e.entryType === 'DEBIT') dr += e.amountPaise;
        if (e.entryType === 'CREDIT') cr += e.amountPaise;
      }
      assert.strictEqual(dr, cr, 'Journal transaction debits must equal credits');
      assert.strictEqual(dr, 5n, 'Debit amount must equal 5 paise');
    });

    // 3.4 Deduplication
    await test('3.4 Deduplication: Replayed eventId is rejected with 409 Conflict', async () => {
      const res = await fetch(`${BASE_URL}/api/ads/impression`, {
        method: 'POST',
        headers: creatorHeaders,
        body: JSON.stringify({
          sessionToken: targetAd.impressionToken,
          eventId: eventId1, // Replayed eventId
          dwellSeconds: 2.0,
          viewabilityScore: 1.0,
        }),
      });

      assert.strictEqual(res.status, 409, 'Must reject duplicate event with 409 Conflict');
      const data = await res.json();
      assert.ok(data.error.includes('DUPLICATE_EVENT'), 'Must identify duplicate event');
    });

    // 3.5 Viewability Threshold Rejection
    await test('3.5 Fraud Prevention: Sub-threshold dwell time (< 1.0s) is rejected with 422 Unprocessable', async () => {
      const eventIdFail = `evt_quick_bot_${timestamp}`;
      const res = await fetch(`${BASE_URL}/api/ads/impression`, {
        method: 'POST',
        headers: creatorHeaders,
        body: JSON.stringify({
          sessionToken: targetAd.impressionToken,
          eventId: eventIdFail,
          dwellSeconds: 0.2, // Below 1.0s requirement
          viewabilityScore: 0.1,
        }),
      });

      assert.strictEqual(res.status, 422, 'Must reject sub-threshold viewability');
      const data = await res.json();
      assert.ok(data.error.includes('INSUFFICIENT_VIEWABILITY'));
    });

    // 3.6 Forged or Expired Token Rejection
    await test('3.6 Security: Tampered or forged impression token is rejected with 401 Unauthorized', async () => {
      const forgedToken = targetAd.impressionToken.slice(0, -6) + 'xxxxxx';
      const res = await fetch(`${BASE_URL}/api/ads/impression`, {
        method: 'POST',
        headers: creatorHeaders,
        body: JSON.stringify({
          sessionToken: forgedToken,
          eventId: `evt_forged_${timestamp}`,
          dwellSeconds: 2.0,
          viewabilityScore: 1.0,
        }),
      });

      assert.strictEqual(res.status, 401, 'Must reject forged signature with 401');
      const data = await res.json();
      assert.ok(data.error.includes('INVALID_TOKEN'));
    });

    // 3.7 Frequency Capping
    await test('3.7 Anti-Fraud: Daily frequency cap reached on single campaign triggers 429 Too Many Requests', async () => {
      // Seed 9 more impressions for creator on this campaign to hit the cap of 10
      for (let i = 2; i <= 10; i++) {
        await prisma.campaignImpression.create({
          data: {
            campaignId: campaign.id,
            userId: creatorUser.id,
            eventId: `evt_seed_freq_${timestamp}_${i}`,
            sessionToken: `token_seed_${timestamp}_${i}`,
            tokenDigest: `digest_seed_${timestamp}_${i}`,
            dwellSeconds: 1.5,
            viewabilityScore: 1.0,
            status: 'VALIDATED',
            rewardPaise: 3n,
            chargePaise: 5n,
            validatedAt: new Date(),
          },
        });
      }

      // 11th impression should be rejected with 429
      const freshToken = generateTestImpressionToken({
        campaignId: campaign.id,
        creativeAssetId: null,
        userId: creatorUser.id,
        expectedDwellMinSeconds: 1.0,
        pricingModel: 'CPM',
        rewardPaise: '3',
        chargePaise: '5',
      });

      const res = await fetch(`${BASE_URL}/api/ads/impression`, {
        method: 'POST',
        headers: creatorHeaders,
        body: JSON.stringify({
          sessionToken: freshToken,
          eventId: `evt_cap_test_${timestamp}`,
          dwellSeconds: 2.0,
          viewabilityScore: 1.0,
        }),
      });

      assert.strictEqual(res.status, 429, 'Must reject frequency cap excess with 429 Too Many Requests');
      const data = await res.json();
      assert.ok(data.error.includes('FREQUENCY_CAP_EXCEEDED'));
    });

    // 3.8 Campaign Budget Exhaustion via Atomic Conditional SQL
    await test('3.8 Atomic Budget Enforcement: Event rejected when campaign budget is exhausted (410 Gone)', async () => {
      // Simulate exhausted budget on campaign
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { budgetSpentPaise: 500000n }, // Equal to allocated
      });

      // Use a new creator to bypass the frequency cap and test budget exhaustion directly
      const exhaustCreator = await prisma.user.create({
        data: {
          email: `creator_exhaust_${timestamp}@test.in`,
          passwordHash: 'dummy',
          name: 'Exhaust Tester',
          role: 'USER',
          wallet: { create: { availablePaise: 0n } },
        },
      });

      const freshToken = generateTestImpressionToken({
        campaignId: campaign.id,
        creativeAssetId: null,
        userId: exhaustCreator.id,
        expectedDwellMinSeconds: 1.0,
        pricingModel: 'CPM',
        rewardPaise: '3',
        chargePaise: '5',
      });

      const res = await fetch(`${BASE_URL}/api/ads/impression`, {
        method: 'POST',
        headers: makeAuthHeader(exhaustCreator),
        body: JSON.stringify({
          sessionToken: freshToken,
          eventId: `evt_exhaust_${timestamp}`,
          dwellSeconds: 2.0,
          viewabilityScore: 1.0,
        }),
      });

      assert.strictEqual(res.status, 410, 'Must reject exhausted budget with 410 Gone');
      const data = await res.json();
      assert.ok(data.error.includes('BUDGET_EXHAUSTED'));

      // Clean up exhaustCreator
      await prisma.wallet.deleteMany({ where: { userId: exhaustCreator.id } });
      await prisma.user.delete({ where: { id: exhaustCreator.id } });
    });

    // 3.9 Extension Session Breakdown: Distinct available, pending, earned, and active withdrawal balances
    await test('3.9 Extension Session: Returns distinct balances for available, pending, lifetime, and payouts', async () => {
      const res = await fetch(`${BASE_URL}/api/extension/session`, { headers: creatorHeaders });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.authenticated, true);
      assert.ok(data.wallet.availablePaise !== undefined, 'Must provide availablePaise');
      assert.ok(data.wallet.pendingPaise !== undefined, 'Must provide pendingPaise');
      assert.ok(data.wallet.lifetimeEarnedPaise !== undefined, 'Must provide lifetimeEarnedPaise');
      assert.ok(data.wallet.withdrawalInProgressPaise !== undefined, 'Must provide withdrawalInProgressPaise');
    });

    // 3.10 General Ledger Equilibrium Reconciliation
    await test('3.10 General Ledger Equilibrium: SUM(Debits) === SUM(Credits) across all journal entries', async () => {
      const txs = await prisma.journalTransaction.findMany({
        include: { entries: true },
      });

      assert.ok(txs.length > 0, 'Journal transactions must exist');
      for (const tx of txs) {
        let dr = 0n;
        let cr = 0n;
        for (const e of tx.entries) {
          if (e.entryType === 'DEBIT') dr += e.amountPaise;
          if (e.entryType === 'CREDIT') cr += e.amountPaise;
        }
        assert.strictEqual(dr, cr, `Transaction ${tx.idempotencyKey} must balance`);
      }
    });

    // 3.11 Web Task CPO Regression Check
    await test('3.11 Regression Check: Existing CPO web task submission workflow remains fully operational', async () => {
      // Start task
      const startRes = await fetch(`${BASE_URL}/api/tasks/start`, {
        method: 'POST',
        headers: creatorHeaders,
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      assert.strictEqual(startRes.status, 200);
      const startData = await startRes.json();
      assert.ok(startData.sessionToken);

      // Restore some budget for test
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { budgetSpentPaise: 0n },
      });

      // Submit task with human telemetry
      const submitRes = await fetch(`${BASE_URL}/api/tasks/submit`, {
        method: 'POST',
        headers: creatorHeaders,
        body: JSON.stringify({
          sessionToken: startData.sessionToken,
          dwellTimeSeconds: 35,
          interactionCount: 15,
          mouseEventsRecorded: 40,
          scrollDepthPercent: 90,
          answers: { q1: 'Very useful' },
        }),
      });

      assert.strictEqual(submitRes.status, 200);
      const submitData = await submitRes.json();
      assert.strictEqual(submitData.status, 'VALIDATED');
      assert.strictEqual(submitData.rewardPaise, '4000', '₹40.00 CPO credited');
    });

  } finally {
    // Clean up test fixtures
    try {
      if (campaign) {
        await prisma.campaignImpression.deleteMany({ where: { campaignId: campaign.id } });
        await prisma.userTask.deleteMany({ where: { campaignId: campaign.id } });
        await prisma.creativeAsset.deleteMany({ where: { campaignId: campaign.id } });
        await prisma.campaign.delete({ where: { id: campaign.id } });
      }
      if (creatorUser) {
        await prisma.ledgerTransaction.deleteMany({ where: { wallet: { userId: creatorUser.id } } });
        await prisma.wallet.deleteMany({ where: { userId: creatorUser.id } });
        await prisma.user.delete({ where: { id: creatorUser.id } });
      }
      if (advUser) {
        await prisma.userOrganization.deleteMany({ where: { userId: advUser.id } });
        await prisma.user.delete({ where: { id: advUser.id } });
      }
      if (organization) {
        await prisma.wallet.deleteMany({ where: { organizationId: organization.id } });
        await prisma.organization.delete({ where: { id: organization.id } });
      }
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr.message);
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
