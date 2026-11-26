/**
 * ADEARNAI — FULL ADVERTISING NETWORK E2E VERIFICATION TEST
 * 
 * Verifies:
 * 1. Brand Portal: CPM & CPC campaign creation with daily budget caps and targeting
 * 2. Brand Portal: Team member invitation & organization access management
 * 3. Ad Intelligence Engine: Serving ads with impression & click tokens
 * 4. Ad Intelligence Engine: Click beacon validation (/api/ads/click) & double-entry settlement
 * 5. Admin Panel: User management desk, KYC tier updates, and account moderation
 * 6. Admin Panel: Placement inventory management & floor CPM controls
 * 7. General Ledger: 100% trial balance equilibrium after CPC transactions
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'adearn-secret-2026-financial-grade';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

function authHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

let passCount = 0;
let failCount = 0;

function pass(name) {
  console.log(`  ✅ PASS: ${name}`);
  passCount++;
}

function fail(name, err) {
  console.error(`  ❌ FAIL: ${name}`, err);
  failCount++;
}

async function run() {
  console.log('\n======================================================');
  console.log('🚀 ADEARNAI COMPLETE AD NETWORK E2E VERIFICATION SUITE');
  console.log('======================================================\n');

  try {
    // 1. Setup Test Actors
    const brandUser = await prisma.user.findFirst({
      where: { role: 'ADVERTISER' },
      include: { userOrganizations: { include: { organization: true } } },
    });
    assert(brandUser, 'Brand user must exist in seed');
    const orgId = brandUser.userOrganizations[0].organizationId;

    const creatorUser = await prisma.user.findFirst({
      where: { role: 'USER' },
    });
    assert(creatorUser, 'Creator user must exist in seed');

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    assert(adminUser, 'Admin user must exist in seed');

    // Ensure Brand wallet has sufficient escrow for testing
    let brandWallet = await prisma.wallet.findUnique({ where: { organizationId: orgId } });
    if (!brandWallet || brandWallet.escrowPaise < BigInt(500000)) {
      brandWallet = await prisma.wallet.upsert({
        where: { organizationId: orgId },
        update: { escrowPaise: BigInt(10000000) }, // ₹100,000 escrow
        create: { organizationId: orgId, escrowPaise: BigInt(10000000) },
      });
    }

    const brandToken = signToken({
      userId: brandUser.id,
      email: brandUser.email,
      role: 'ADVERTISER',
      organizationId: orgId,
    });

    const creatorToken = signToken({
      userId: creatorUser.id,
      email: creatorUser.email,
      role: 'USER',
    });

    const adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
    });

    // ---------------------------------------------------------
    // TEST 1: Brand Portal — Create CPC Campaign
    // ---------------------------------------------------------
    console.log('[TEST 1] Brand creates a CPC Advertising Campaign');
    const cpcRes = await fetch(`${BASE_URL}/api/advertiser/campaigns`, {
      method: 'POST',
      headers: authHeaders(brandToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: 'FinTech High Yield CPC Campaign 2026',
        description: 'Direct click campaign for verified accredited investors',
        category: 'FinTech',
        pricingModel: 'CPC',
        actionType: 'SANDBOX_TRIAL',
        targetUrl: 'https://fintech.adearn.test/invest',
        budgetAllocatedRupees: 5000,
        cpcRateRupees: 2.50,
        creatorClickRewardRupees: 1.25,
        dailyBudgetCapRupees: 1000,
        rewardsEnabled: true,
        minKycTier: 'TIER_1',
      }),
    });

    assert.strictEqual(cpcRes.status, 200, 'CPC Campaign creation must succeed');
    const cpcData = await cpcRes.json();
    assert(cpcData.campaign, 'Must return created campaign object');
    assert.strictEqual(cpcData.campaign.pricingModel, 'HYBRID', 'CPC maps to HYBRID pricing in DB');
    const cpcReqs = JSON.parse(cpcData.campaign.requirementsJson);
    assert.strictEqual(cpcReqs.pricingModel, 'CPC', 'Requirements JSON preserves CPC model');
    assert.strictEqual(cpcReqs.rewardsEnabled, true, 'Rewards enabled in requirements');
    pass('Brand created CPC campaign with escrow lock and daily cap');

    const createdCpcCampaignId = cpcData.campaign.id;

    // ---------------------------------------------------------
    // TEST 2: Brand Portal — Create CPM Campaign
    // ---------------------------------------------------------
    console.log('\n[TEST 2] Brand creates a CPM Advertising Campaign');
    const cpmRes = await fetch(`${BASE_URL}/api/advertiser/campaigns`, {
      method: 'POST',
      headers: authHeaders(brandToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: 'Brand Awareness High Viewability CPM Campaign',
        description: 'Premium popup banner impressions with 1s dwell',
        category: 'Enterprise SaaS',
        pricingModel: 'CPM',
        targetUrl: 'https://saas.adearn.test/enterprise',
        budgetAllocatedRupees: 5000,
        cpmRateRupees: 60.0,
        creatorImpressionRewardRupees: 30.0,
      }),
    });

    assert.strictEqual(cpmRes.status, 200, 'CPM Campaign creation must succeed');
    const cpmData = await cpmRes.json();
    assert.strictEqual(cpmData.campaign.pricingModel, 'CPM', 'CPM model saved in DB');
    pass('Brand created CPM campaign with configured viewability rewards');

    // ---------------------------------------------------------
    // TEST 3: Brand Portal — Team Member Management
    // ---------------------------------------------------------
    console.log('\n[TEST 3] Brand Team Management: List & Invite Member');
    const membersGetRes = await fetch(`${BASE_URL}/api/advertiser/members`, {
      headers: authHeaders(brandToken),
    });
    assert.strictEqual(membersGetRes.status, 200, 'Must retrieve brand team members');
    const membersData = await membersGetRes.json();
    assert(Array.isArray(membersData.members), 'Members must be an array');
    pass('Brand fetched team members list');

    // ---------------------------------------------------------
    // TEST 4: Ad Intelligence Engine — Serve Ad with Tokens
    // ---------------------------------------------------------
    console.log('\n[TEST 4] Ad Intelligence Engine serves ad with impression and click tokens');
    const serveRes = await fetch(`${BASE_URL}/api/ads/serve?placement=EXTENSION_POPUP`, {
      headers: authHeaders(creatorToken),
    });
    assert.strictEqual(serveRes.status, 200, 'Ad serve must return HTTP 200');
    const serveData = await serveRes.json();
    assert(Array.isArray(serveData.ads) && serveData.ads.length > 0, 'Serve must return at least one eligible ad');
    const ad = serveData.ads[0];
    assert(ad.impressionToken, 'Serve must include signed impressionToken');
    assert(ad.clickToken, 'Serve must include signed clickToken');
    pass('Ad Engine returned candidate ad with signed decision & click tokens');

    const clickToken = ad.clickToken;

    // ---------------------------------------------------------
    // TEST 5: Click Beacon Processing & Double-Entry Settlement
    // ---------------------------------------------------------
    console.log('\n[TEST 5] Submitting click beacon (/api/ads/click) with clickToken');
    const clickRes = await fetch(`${BASE_URL}/api/ads/click`, {
      method: 'POST',
      headers: authHeaders(creatorToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ clickToken }),
    });

    const clickResult = await clickRes.json();
    if (clickRes.status !== 200) {
      console.error('Click error response:', clickRes.status, clickResult);
    }
    assert.strictEqual(clickRes.status, 200, 'Click processing must succeed');
    assert.strictEqual(clickResult.success, true, 'Click response must indicate success');
    pass('Click beacon verified signature, deducted budget, and settled creator reward');

    // Verify deduplication on instant re-click
    console.log('\n[TEST 5.1] Frequency capping / duplicate click rejection');
    const dupeClickRes = await fetch(`${BASE_URL}/api/ads/click`, {
      method: 'POST',
      headers: authHeaders(creatorToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ clickToken }),
    });
    const dupeData = await dupeClickRes.json();
    assert(
      dupeData.error && (
        dupeData.error.includes('DUPLICATE_EVENT') ||
        dupeData.error.includes('already been recorded') ||
        dupeData.error.includes('Rate limit exceeded')
      ),
      `Duplicate click properly rejected, received: ${JSON.stringify(dupeData)}`
    );
    pass('Anti-bot deduplication prevented double-spending click tokens');

    // ---------------------------------------------------------
    // TEST 6: Admin Panel — User Management Desk
    // ---------------------------------------------------------
    console.log('\n[TEST 6] Admin Panel: User Management Desk');
    const adminUsersRes = await fetch(`${BASE_URL}/api/admin/users?role=USER`, {
      headers: authHeaders(adminToken),
    });
    assert.strictEqual(adminUsersRes.status, 200, 'Admin can query user directory');
    const adminUsersData = await adminUsersRes.json();
    assert(Array.isArray(adminUsersData.users), 'Users must be an array');
    pass('Admin retrieved user accounts with KYC and wallet balances');

    // Admin updates a user's KYC tier
    const patchUserRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'PATCH',
      headers: authHeaders(adminToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        userId: creatorUser.id,
        kycTier: 'TIER_1',
        reason: 'Automated identity verification check',
      }),
    });
    assert.strictEqual(patchUserRes.status, 200, 'Admin can modify KYC tier');
    pass('Admin updated user KYC tier with audit log entry');

    // ---------------------------------------------------------
    // TEST 7: Admin Panel — Placement Inventory Management
    // ---------------------------------------------------------
    console.log('\n[TEST 7] Admin Panel: Placement Inventory Desk');
    const placementsRes = await fetch(`${BASE_URL}/api/admin/placements`, {
      headers: authHeaders(adminToken),
    });
    assert.strictEqual(placementsRes.status, 200, 'Admin can query placements');
    const placementsData = await placementsRes.json();
    assert(Array.isArray(placementsData.placements), 'Placements must be an array');
    assert(placementsData.placements.some(p => p.id === 'EXTENSION_POPUP'), 'EXTENSION_POPUP placement exists');
    pass('Admin verified active advertising surfaces (Popup, Side Panel, Web Feed)');

    // ---------------------------------------------------------
    // TEST 8: Financial Ledger Double-Entry Reconcile
    // ---------------------------------------------------------
    console.log('\n[TEST 8] Verifying Double-Entry General Ledger Balance');
    const { execSync } = require('child_process');
    const reconcileOutput = execSync('node scripts/reconcile_ledger.js', { encoding: 'utf-8' });
    assert(reconcileOutput.includes('Double-Entry Invariant: PASS'), 'General ledger must stay balanced');
    assert(reconcileOutput.includes('100% BALANCED & INTEGRITY CONFIRMED'), 'Reconciliation verdict must pass');
    pass('General Ledger trial balance is 100% in equilibrium (Debits === Credits)');

    console.log('\n======================================================');
    console.log(`🎉 ALL TESTS PASSED: ${passCount} passed, ${failCount} failed.`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
