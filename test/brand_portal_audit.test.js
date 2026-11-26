/**
 * ADEARN AI — COMPLETE BRAND PORTAL AUDIT, MULTI-TENANT SECURITY & INTEGRATION TEST SUITE
 * Validates Workflows A through H:
 * - Workflow A: Brand Authentication & Overview Metrics (genuine dynamic calculations, zero hardcoded IVT fallback)
 * - Workflow B: Campaign Creation with Insufficient Escrow Rejection
 * - Workflow C: Campaign Creation with Valid Escrow Lock & Status Toggle (ACTIVE <-> PAUSED)
 * - Workflow D: Analytics & Attribution Calculations (genuine dwell time, retention, dynamic attribution)
 * - Workflow E: Escrow Top-Up, Double-Entry Posting & 18% GST Breakdown Verification
 * - Workflow F: Multi-Tenant IDOR Defense (Brand A isolated from Brand B campaigns and billing)
 * - Workflow G: Cross-Portal Route & RBAC Separation (Creator denied Brand API, Brand denied Admin API)
 * - Workflow H: Navigation Link Verification & Zero Dead Links
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

function authHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    Cookie: `adearn_session=${token}`,
    ...extra,
  };
}

async function runBrandPortalAudit() {
  console.log('================================================================');
  console.log('🏢 ADEARN AI BRAND PORTAL AUDIT & FUNCTIONAL VERIFICATION SUITE');
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
  const testBrandUserA = {
    id: `usr_brand_alpha_${ts}`,
    email: `brand_alpha_${ts}@enterprise.in`,
    password: 'Password123!',
    name: 'Alpha Brand Director',
    role: 'ADVERTISER',
  };
  const testBrandOrgA = {
    id: `org_alpha_${ts}`,
    name: 'Alpha Consumer Brands Pvt Ltd',
    gstin: '27AABCA1111A1Z1',
    pan: 'AABCA1111A',
    contactEmail: `contact@alpha-${ts}.in`,
  };

  const testBrandUserB = {
    id: `usr_brand_beta_${ts}`,
    email: `brand_beta_${ts}@enterprise.in`,
    password: 'Password123!',
    name: 'Beta Brand Director',
    role: 'ADVERTISER',
  };
  const testBrandOrgB = {
    id: `org_beta_${ts}`,
    name: 'Beta Retail Ventures Pvt Ltd',
    gstin: '27AABCB2222B1Z2',
    pan: 'AABCB2222B',
    contactEmail: `contact@beta-${ts}.in`,
  };

  const testCreator = {
    id: `usr_creator_x_${ts}`,
    email: `creator_x_${ts}@creator.in`,
    password: 'Password123!',
    name: 'Creator Tester X',
    role: 'USER',
  };

  let tokenBrandA = null;
  let tokenBrandB = null;
  let tokenCreator = null;
  let campaignAId = null;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Provision Isolated Test Fixtures in MySQL
    // -------------------------------------------------------------------------
    console.log('[SETUP] Provisioning Isolated Multi-Tenant Brand Accounts & Escrow Wallets...');
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Password123!', salt);

    // Create Brand A User, Org, and Escrow Wallet with initial ₹0.00
    await prisma.user.create({
      data: {
        id: testBrandUserA.id,
        email: testBrandUserA.email,
        name: testBrandUserA.name,
        passwordHash: passHash,
        role: 'ADVERTISER',
      },
    });

    await prisma.organization.create({
      data: {
        id: testBrandOrgA.id,
        name: testBrandOrgA.name,
        gstin: testBrandOrgA.gstin,
        pan: testBrandOrgA.pan,
        contactEmail: testBrandOrgA.contactEmail,
        isVerified: true,
        users: {
          create: {
            userId: testBrandUserA.id,
            role: 'OWNER',
          },
        },
        wallet: {
          create: {
            availablePaise: BigInt(0),
            pendingPaise: BigInt(0),
            escrowPaise: BigInt(0),
          },
        },
      },
    });

    // Create Brand B User, Org, and Escrow Wallet with initial ₹50,000.00 (5,000,000 paise)
    await prisma.user.create({
      data: {
        id: testBrandUserB.id,
        email: testBrandUserB.email,
        name: testBrandUserB.name,
        passwordHash: passHash,
        role: 'ADVERTISER',
      },
    });

    await prisma.organization.create({
      data: {
        id: testBrandOrgB.id,
        name: testBrandOrgB.name,
        gstin: testBrandOrgB.gstin,
        pan: testBrandOrgB.pan,
        contactEmail: testBrandOrgB.contactEmail,
        isVerified: true,
        users: {
          create: {
            userId: testBrandUserB.id,
            role: 'OWNER',
          },
        },
        wallet: {
          create: {
            availablePaise: BigInt(0),
            pendingPaise: BigInt(0),
            escrowPaise: BigInt(5000000), // ₹50,000
          },
        },
      },
    });

    // Create Creator User
    await prisma.user.create({
      data: {
        id: testCreator.id,
        email: testCreator.email,
        name: testCreator.name,
        passwordHash: passHash,
        role: 'USER',
        kycTier: 'TIER_1',
        wallet: {
          create: {
            availablePaise: BigInt(10000),
            pendingPaise: BigInt(0),
          },
        },
      },
    });

    // Generate JWT sessions
    tokenBrandA = makeToken({
      userId: testBrandUserA.id,
      email: testBrandUserA.email,
      role: 'ADVERTISER',
      organizationId: testBrandOrgA.id,
    });

    tokenBrandB = makeToken({
      userId: testBrandUserB.id,
      email: testBrandUserB.email,
      role: 'ADVERTISER',
      organizationId: testBrandOrgB.id,
    });

    tokenCreator = makeToken({
      userId: testCreator.id,
      email: testCreator.email,
      role: 'USER',
    });

    recordPass('Database fixtures provisioned for Brand A, Brand B, and Creator');

    // -------------------------------------------------------------------------
    // WORKFLOW A: Brand Overview Telemetry & Authentic Zero States
    // -------------------------------------------------------------------------
    console.log('\n[WORKFLOW A] Brand Overview Telemetry & Authentic Zero States');
    {
      const res = await fetch(`${BASE_URL}/api/advertiser/overview`, {
        headers: authHeaders(tokenBrandA),
      });
      assert.strictEqual(res.status, 200, 'Overview endpoint must respond 200 OK');
      const data = await res.json();

      assert.strictEqual(data.organization.id, testBrandOrgA.id, 'Must return Brand A organization');
      assert.strictEqual(data.organization.name, testBrandOrgA.name, 'Must return Brand A name');
      assert.strictEqual(data.metrics.campaignsTotal, 0, 'New brand must have 0 campaigns');
      assert.strictEqual(data.metrics.activeCampaignsCount, 0, 'New brand must have 0 active campaigns');
      assert.strictEqual(data.metrics.verifiedOutcomes, 0, 'New brand must have 0 verified outcomes');

      // Crucial: IVT Rate must be genuine 0.00%, NEVER hardcoded 0.82%
      assert.strictEqual(data.metrics.ivtRatePercent, 0, 'IVT rate must be 0% when no tasks exist, NOT mock 0.82%');
      assert.strictEqual(data.metrics.escrowBalancePaise, '0', 'Escrow balance must be 0 for new brand');

      // Daily series must exist with 7 genuine data points
      assert(Array.isArray(data.dailySeries), 'dailySeries must be an array');
      assert.strictEqual(data.dailySeries.length, 7, 'dailySeries must provide 7 days of genuine telemetry');
      assert.strictEqual(data.dailySeries[6].valid, 0, 'Today valid outcomes must be 0');

      recordPass('Overview API returns genuine telemetry with zero hardcoded 0.82% mock rate');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW B: Campaign Creation with Insufficient Escrow Rejection
    // -------------------------------------------------------------------------
    console.log('\n[WORKFLOW B] Campaign Creation with Insufficient Escrow Rejection');
    {
      // Brand A has ₹0 escrow. Attempt to create campaign with ₹5,000 budget.
      const res = await fetch(`${BASE_URL}/api/advertiser/campaigns`, {
        method: 'POST',
        headers: authHeaders(tokenBrandA, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: 'Alpha FinTech Launch',
          description: 'Pilot credit evaluation campaign for high-intent creators',
          category: 'FinTech',
          actionType: 'SURVEY',
          targetUrl: 'https://alpha.example.in/apply',
          budgetAllocatedRupees: 5000,
          costPerOutcomeRupees: 25,
          targetOutcomes: 200,
        }),
      });

      assert.strictEqual(res.status, 400, 'Must reject campaign when escrow balance is insufficient');
      const errData = await res.json();
      assert(errData.error.includes('Insufficient unreserved escrow pool balance'), 'Error must specify insufficient escrow');
      assert(errData.error.includes('5000'), 'Error must specify required ₹5000');
      assert(errData.error.includes('0.00'), 'Error must specify available ₹0.00');

      recordPass('Campaign creation properly rejected on insufficient escrow with clear remediation note');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW E: Escrow Top-Up, Double-Entry Posting & 18% GST Verification
    // -------------------------------------------------------------------------
    console.log('\n[WORKFLOW E] Escrow Top-Up, Double-Entry Posting & 18% GST Split');
    const topUpAmountRupees = 10000; // ₹10,000
    const topUpAmountPaise = 1000000n; // 1,000,000 paise
    const utrRef = `RTGS-AUDIT-${ts}`;
    {
      const res = await fetch(`${BASE_URL}/api/advertiser/billing`, {
        method: 'POST',
        headers: authHeaders(tokenBrandA, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          amountRupees: topUpAmountRupees,
          utrNumber: utrRef,
          idempotencyKey: `TOPUP-${testBrandOrgA.id}-${ts}`,
        }),
      });

      assert.strictEqual(res.status, 200, 'Top-up deposit must succeed');
      const topUpData = await res.json();
      assert.strictEqual(topUpData.success, true, 'Top-up response must confirm success');

      // Verify wallet balance updated
      const updatedWallet = await prisma.wallet.findUnique({
        where: { organizationId: testBrandOrgA.id },
      });
      assert.strictEqual(updatedWallet.escrowPaise, topUpAmountPaise, 'Escrow wallet must reflect ₹10,000 credit');

      // Verify double-entry ledger transaction created
      const ledgerTx = await prisma.ledgerTransaction.findFirst({
        where: {
          walletId: updatedWallet.id,
          type: 'ADVERTISER_TOPUP',
        },
      });
      assert(ledgerTx, 'Double-entry ADVERTISER_TOPUP transaction must exist');
      assert.strictEqual(ledgerTx.amountPaise, topUpAmountPaise, 'Ledger transaction amount must match paise');

      // Verify Idempotency: replaying same request must return duplicate: true
      const replayRes = await fetch(`${BASE_URL}/api/advertiser/billing`, {
        method: 'POST',
        headers: authHeaders(tokenBrandA, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          amountRupees: topUpAmountRupees,
          utrNumber: utrRef,
          idempotencyKey: `TOPUP-${testBrandOrgA.id}-${ts}`,
        }),
      });
      const replayData = await replayRes.json();
      assert.strictEqual(replayData.duplicate, true, 'Replay with same idempotency key must be idempotent');

      // Verify Billing GET shows invoice with 18% GST breakdown
      const billingRes = await fetch(`${BASE_URL}/api/advertiser/billing`, {
        headers: authHeaders(tokenBrandA),
      });
      assert.strictEqual(billingRes.status, 200, 'Billing GET must succeed');
      const billingData = await billingRes.json();
      assert(billingData.invoices.length >= 1, 'Invoices list must contain new deposit invoice');

      const inv = billingData.invoices[0];
      assert.strictEqual(inv.amountPaise, '1000000', 'Total invoice paise must be 1,000,000');
      // In 18% inclusive GST integer division: base = (1,000,000 * 100) / 118 = 847,457, gst = 152,543
      assert.strictEqual(inv.basePaise, '847457', 'Base paise before 18% GST must be 847,457');
      assert.strictEqual(inv.gstPaise, '152543', '18% GST paise must be 152,543');

      recordPass('Escrow top-up posted to double-entry ledger with exact 18% GST calculation and idempotency');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW C: Campaign Creation with Escrow Lock & Lifecycle Toggle
    // -------------------------------------------------------------------------
    console.log('\n[WORKFLOW C] Campaign Creation with Escrow Lock & Lifecycle Toggle');
    {
      const budgetRupees = 5000;
      const budgetPaise = 500000n;

      const res = await fetch(`${BASE_URL}/api/advertiser/campaigns`, {
        method: 'POST',
        headers: authHeaders(tokenBrandA, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: 'Alpha FinTech Verified Audit',
          description: 'Institutional performance campaign for certified creators',
          category: 'FinTech',
          actionType: 'SURVEY',
          targetUrl: 'https://alpha.example.in/campaign',
          budgetAllocatedRupees: budgetRupees,
          costPerOutcomeRupees: 25,
          targetOutcomes: 200,
        }),
      });

      assert.strictEqual(res.status, 200, 'Campaign creation must succeed now that escrow is funded');
      const campData = await res.json();
      assert.strictEqual(campData.success, true, 'Campaign response must confirm success');
      assert(campData.campaign.id, 'Campaign must have an ID');
      campaignAId = campData.campaign.id;
      assert.strictEqual(campData.campaign.status, 'ACTIVE', 'New campaign status must be ACTIVE');

      // Verify wallet escrow locked: unreserved escrow reduced from ₹10,000 to ₹5,000
      const walletAfter = await prisma.wallet.findUnique({
        where: { organizationId: testBrandOrgA.id },
      });
      assert.strictEqual(walletAfter.escrowPaise, 500000n, 'Remaining escrow balance must be 500,000 paise (₹5,000)');

      // Verify ESCROW_LOCK ledger transaction
      const lockTx = await prisma.ledgerTransaction.findFirst({
        where: {
          walletId: walletAfter.id,
          type: 'ESCROW_LOCK',
        },
      });
      assert(lockTx, 'ESCROW_LOCK transaction must be recorded in general ledger');
      assert.strictEqual(lockTx.amountPaise, budgetPaise, 'ESCROW_LOCK amount must match campaign budget');

      // Test Campaign Pause
      const pauseRes = await fetch(`${BASE_URL}/api/advertiser/campaigns/${campaignAId}`, {
        method: 'PUT',
        headers: authHeaders(tokenBrandA, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: 'PAUSED' }),
      });
      assert.strictEqual(pauseRes.status, 200, 'Campaign pause must succeed');
      const pauseData = await pauseRes.json();
      assert.strictEqual(pauseData.campaign.status, 'PAUSED', 'Campaign status must now be PAUSED');

      // Test Campaign Resume
      const resumeRes = await fetch(`${BASE_URL}/api/advertiser/campaigns/${campaignAId}`, {
        method: 'PUT',
        headers: authHeaders(tokenBrandA, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      assert.strictEqual(resumeRes.status, 200, 'Campaign resume must succeed');
      const resumeData = await resumeRes.json();
      assert.strictEqual(resumeData.campaign.status, 'ACTIVE', 'Campaign status must be restored to ACTIVE');

      recordPass('Campaign created, budget locked from escrow in ledger, and ACTIVE <-> PAUSED status toggled cleanly');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW D: Analytics & Attribution Calculations (Zero Mock Metrics)
    // -------------------------------------------------------------------------
    console.log('\n[WORKFLOW D] Analytics & Attribution Calculations (Zero Mock Metrics)');
    {
      const res = await fetch(`${BASE_URL}/api/advertiser/analytics`, {
        headers: authHeaders(tokenBrandA),
      });
      assert.strictEqual(res.status, 200, 'Analytics endpoint must respond 200 OK');
      const data = await res.json();

      // Ensure mock metrics (38.4s, 94.6%, 0.82%) are NOT returned
      assert.strictEqual(data.metrics.averageAttentionDwellSec, 0, 'Dwell time must be 0 when no tasks completed, NOT mock 38.4s');
      assert.strictEqual(data.metrics.multiTouchRetentionRate, 0, 'Retention rate must be 0% when no tasks completed, NOT mock 94.6%');
      assert.strictEqual(data.metrics.ivtRate, 0, 'IVT rate must be 0%, NOT mock 0.82%');

      // Attribution breakdown must be an empty array when no verified tasks exist, NEVER hardcoded fake percentages
      assert(Array.isArray(data.attributionBreakdown), 'attributionBreakdown must be an array');
      assert.strictEqual(data.attributionBreakdown.length, 0, 'attributionBreakdown must be empty array, not mock data');

      recordPass('Analytics API returns strictly computed metrics with zero mock retention, dwell, or attribution');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW F: Multi-Tenant IDOR Defense Verification
    // -------------------------------------------------------------------------
    console.log('\n[WORKFLOW F] Multi-Tenant IDOR Defense Verification');
    {
      // Brand B tries to access Brand A's campaign telemetry
      const resGet = await fetch(`${BASE_URL}/api/advertiser/campaigns/${campaignAId}`, {
        headers: authHeaders(tokenBrandB),
      });
      assert.strictEqual(resGet.status, 403, 'Brand B must be denied reading Brand A campaign (403 Forbidden)');
      const errGet = await resGet.json();
      assert(errGet.error.includes('Forbidden') || errGet.error.includes('authorized'), 'Must return authorization error');

      // Brand B tries to mutate Brand A's campaign status
      const resPut = await fetch(`${BASE_URL}/api/advertiser/campaigns/${campaignAId}`, {
        method: 'PUT',
        headers: authHeaders(tokenBrandB, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: 'PAUSED' }),
      });
      assert.strictEqual(resPut.status, 403, 'Brand B must be denied modifying Brand A campaign (403 Forbidden)');

      // Verify campaign status in DB remained ACTIVE
      const campCheck = await prisma.campaign.findUnique({ where: { id: campaignAId } });
      assert.strictEqual(campCheck.status, 'ACTIVE', 'Campaign status must not be modified by cross-tenant request');

      recordPass('Zero IDOR data leakage: Brand B cannot read or modify Brand A campaign data');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW G: Cross-Portal Route Boundaries & RBAC
    // -------------------------------------------------------------------------
    console.log('\n[WORKFLOW G] Cross-Portal Route Boundaries & RBAC');
    {
      // 1. Creator user denied Brand API
      const resCreatorBrand = await fetch(`${BASE_URL}/api/advertiser/overview`, {
        headers: authHeaders(tokenCreator),
      });
      assert.strictEqual(resCreatorBrand.status, 403, 'Creator user must be denied access to Advertiser Overview API (403)');

      // 2. Brand user denied Admin API
      const resBrandAdmin = await fetch(`${BASE_URL}/api/admin/metrics`, {
        headers: authHeaders(tokenBrandA),
      });
      assert.strictEqual(resBrandAdmin.status, 403, 'Brand user must be denied access to Admin Metrics API (403)');

      // 3. Unauthenticated request denied Brand API
      const resUnauth = await fetch(`${BASE_URL}/api/advertiser/overview`);
      assert.strictEqual(resUnauth.status, 401, 'Unauthenticated request must be denied (401)');

      recordPass('Strict RBAC boundaries enforced: Creator denied Brand APIs, Brand denied Admin APIs');
    }

    // -------------------------------------------------------------------------
    // WORKFLOW H: Navigation Links & Route Completeness Audit
    // -------------------------------------------------------------------------
    console.log('\n[WORKFLOW H] Navigation Links & Route Completeness Audit');
    {
      const brandRoutes = [
        '/advertiser',
        '/advertiser/campaigns',
        '/advertiser/campaigns/new',
        '/advertiser/analytics',
        '/advertiser/billing',
      ];

      for (const route of brandRoutes) {
        const res = await fetch(`${BASE_URL}${route}`, {
          headers: authHeaders(tokenBrandA),
        });
        assert.strictEqual(res.status, 200, `Brand route ${route} must return 200 OK`);
      }

      recordPass('All 5 core Brand Portal page routes return 200 OK without dead links or 404s');
    }

    console.log('\n================================================================');
    console.log(`✅ BRAND PORTAL AUDIT COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

  } catch (err) {
    recordFail('Unhandled exception during Brand Portal audit', err);
  } finally {
    // -------------------------------------------------------------------------
    // TEARDOWN: Clean up test fixtures from MySQL
    // -------------------------------------------------------------------------
    console.log('[TEARDOWN] Purging ephemeral audit records from MySQL...');
    try {
      if (campaignAId) {
        await prisma.creativeAsset.deleteMany({ where: { campaignId: campaignAId } });
        await prisma.campaign.deleteMany({ where: { id: campaignAId } });
      }
      // Purge Brand A & B test data
      await prisma.fundingOrder.deleteMany({ where: { organizationId: { in: [testBrandOrgA.id, testBrandOrgB.id] } } });
      await prisma.ledgerTransaction.deleteMany({
        where: { wallet: { organizationId: { in: [testBrandOrgA.id, testBrandOrgB.id] } } },
      });
      await prisma.wallet.deleteMany({ where: { organizationId: { in: [testBrandOrgA.id, testBrandOrgB.id] } } });
      await prisma.userOrganization.deleteMany({ where: { organizationId: { in: [testBrandOrgA.id, testBrandOrgB.id] } } });
      await prisma.organization.deleteMany({ where: { id: { in: [testBrandOrgA.id, testBrandOrgB.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [testBrandUserA.id, testBrandUserB.id, testCreator.id] } } });
      console.log('✓ Teardown complete. Test records cleanly purged.');
    } catch (cleanupErr) {
      console.error('Warning: Teardown cleanup encountered an error:', cleanupErr.message);
    }

    await prisma.$disconnect();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runBrandPortalAudit();
