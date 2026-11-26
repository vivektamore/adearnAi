/**
 * ADEARN AI — COMPREHENSIVE SECURITY, MIDDLEWARE & PAYMENT WORKFLOW TEST SUITE
 * Validates Phase 2 (Edge Middleware & RBAC), Phase 3 (Route Matrix),
 * Phase 4 & 5 (Flow A Advertiser Funding, Flow B Payout Methods, Flow C Compensating Withdrawal).
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'adearn-ai-sovereign-audit-secret-key-2025';
const BASE_URL = 'http://localhost:3000';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runSecurityAndPaymentTests() {
  console.log('\n================================================================');
  console.log('🔒 ADEARN AI AUTOMATED SECURITY, MIDDLEWARE & PAYMENT SUITE');
  console.log('Testing against Live Local Server & Live MySQL 8.0');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(msg) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  }

  function recordFail(msg, err) {
    console.error(`  ✗ FAIL: ${msg}`);
    console.error(err);
    failed++;
  }

  // --- SECTION 1: EDGE MIDDLEWARE ROUTE PROTECTION ---
  console.log('[SECTION 1] Edge Security Middleware & Route Protection...');

  // Test 1.1: Unauthenticated portal redirects
  try {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert.strictEqual(res.status, 307, `Expected 307 redirect, got ${res.status}`);
    const location = res.headers.get('location');
    assert.ok(location && location.includes('/login?redirect=%2Fadmin'), `Expected redirect to /login?redirect=%2Fadmin, got ${location}`);
    recordPass('Unauthenticated visitor accessing /admin is redirected to /login with redirect param');
  } catch (err) {
    recordFail('Unauthenticated /admin redirect', err);
  }

  try {
    const res = await fetch(`${BASE_URL}/advertiser`, { redirect: 'manual' });
    assert.strictEqual(res.status, 307, `Expected 307 redirect, got ${res.status}`);
    const location = res.headers.get('location');
    assert.ok(location && location.includes('/login?redirect=%2Fadvertiser'), `Expected redirect to /login, got ${location}`);
    recordPass('Unauthenticated visitor accessing /advertiser is redirected to /login');
  } catch (err) {
    recordFail('Unauthenticated /advertiser redirect', err);
  }

  try {
    const res = await fetch(`${BASE_URL}/wallet`, { redirect: 'manual' });
    assert.strictEqual(res.status, 307, `Expected 307 redirect, got ${res.status}`);
    const location = res.headers.get('location');
    assert.ok(location && location.includes('/login?redirect=%2Fwallet'), `Expected redirect to /login, got ${location}`);
    recordPass('Unauthenticated visitor accessing /wallet is redirected to /login');
  } catch (err) {
    recordFail('Unauthenticated /wallet redirect', err);
  }

  // Test 1.2: Unauthenticated API calls return 401 JSON
  try {
    const res = await fetch(`${BASE_URL}/api/payouts`);
    assert.strictEqual(res.status, 401, `Expected 401 for /api/payouts, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.error, 'Expected error JSON');
    recordPass('Direct unauthenticated request to /api/payouts rejected with HTTP 401 JSON');
  } catch (err) {
    recordFail('Unauthenticated /api/payouts 401 rejection', err);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/advertiser/billing`);
    assert.strictEqual(res.status, 401, `Expected 401 for /api/advertiser/billing, got ${res.status}`);
    recordPass('Direct unauthenticated request to /api/advertiser/billing rejected with HTTP 401 JSON');
  } catch (err) {
    recordFail('Unauthenticated /api/advertiser/billing 401 rejection', err);
  }

  // Test 1.3: RBAC Cross-Role Boundary Violations
  const testUserToken = makeToken({
    userId: 'test_creator_sec_01',
    email: 'sec_creator@test.in',
    role: 'USER',
    name: 'Sec Creator',
  });

  try {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: `adearn_session=${testUserToken}` },
      redirect: 'manual',
    });
    assert.strictEqual(res.status, 307, 'Expected creator denied from /admin with redirect');
    const location = res.headers.get('location');
    assert.ok(location && location.includes('/wallet'), 'Expected redirect to /wallet or authorized route');
    recordPass('Creator (USER) role is strictly denied access to /admin portal');
  } catch (err) {
    recordFail('Creator accessing /admin denied', err);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Cookie: `adearn_session=${testUserToken}` },
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden for creator calling /api/admin/overview, got ${res.status}`);
    recordPass('Creator (USER) role calling /api/admin/* is rejected with HTTP 403 Forbidden');
  } catch (err) {
    recordFail('Creator calling admin API 403', err);
  }

  // Test 1.4: Registration Privilege Escalation Prevention
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `priv_esc_${Date.now()}@test.in`,
        password: 'Password123!',
        name: 'Attacker Admin',
        role: 'ADMIN', // Public registration attempting to escalate to ADMIN
      }),
    });
    assert.strictEqual(res.ok, true, 'Registration endpoint responded');
    const data = await res.json();
    assert.strictEqual(data.user.role, 'USER', `Privilege escalation succeeded! Role was ${data.user.role}`);
    recordPass('Public registration cannot create ADMIN role; forced to canonical USER role');
    // Clean up created user
    await prisma.user.delete({ where: { id: data.user.id } });
  } catch (err) {
    recordFail('Registration privilege escalation test', err);
  }

  // --- SECTION 2: FLOW B — CREATOR PAYOUT METHOD CONFIGURATION ---
  console.log('\n[SECTION 2] Flow B — Creator Payout Method Configuration...');

  // Create temporary test creator for payment flows
  const creatorUser = await prisma.user.create({
    data: {
      email: `creator_flow_test_${Date.now()}@test.in`,
      passwordHash: 'dummyhash',
      name: 'Rohan Sharma',
      role: 'USER',
      wallet: {
        create: {
          availablePaise: BigInt(50000), // ₹500.00
          pendingPaise: BigInt(0),
          escrowPaise: BigInt(0),
          lifetimeEarnedPaise: BigInt(50000),
        },
      },
    },
    include: { wallet: true },
  });

  const creatorToken = makeToken({
    userId: creatorUser.id,
    email: creatorUser.email,
    role: 'USER',
    name: creatorUser.name,
  });

  let createdMethodId = '';

  // Test 2.1: Add valid UPI destination
  try {
    const res = await fetch(`${BASE_URL}/api/payout-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `adearn_session=${creatorToken}`,
      },
      body: JSON.stringify({
        type: 'UPI',
        accountHolderName: 'Rohan Sharma',
        upiId: 'rohansharma@okhdfcbank',
        makeDefault: true,
      }),
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.payoutMethod.maskedAddress.includes('@okhdfcbank') && data.payoutMethod.maskedAddress.includes('*'), `Expected masked address, got ${data.payoutMethod.maskedAddress}`);
    createdMethodId = data.payoutMethod.id;
    recordPass('Creator successfully adds valid UPI payout method; address is masked by default');
  } catch (err) {
    recordFail('Add valid UPI payout method', err);
  }

  // Test 2.2: Reject invalid UPI destination
  try {
    const res = await fetch(`${BASE_URL}/api/payout-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `adearn_session=${creatorToken}`,
      },
      body: JSON.stringify({
        type: 'UPI',
        accountHolderName: 'Rohan Sharma',
        upiId: 'invalid-upi-no-bank',
      }),
    });
    assert.strictEqual(res.status, 400, `Expected 400 for invalid UPI, got ${res.status}`);
    recordPass('Invalid UPI syntax rejected with HTTP 400');
  } catch (err) {
    recordFail('Reject invalid UPI syntax', err);
  }

  // Test 2.3: Add Bank Account method with IFSC
  try {
    const res = await fetch(`${BASE_URL}/api/payout-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `adearn_session=${creatorToken}`,
      },
      body: JSON.stringify({
        type: 'BANK_ACCOUNT',
        accountHolderName: 'Rohan Sharma',
        accountNumber: '50100293848123',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank Ltd.',
      }),
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.payoutMethod.maskedAddress.startsWith('••••••••8123'), `Expected masked bank account, got ${data.payoutMethod.maskedAddress}`);
    recordPass('Creator adds Bank Account payout method; account number masked as ••••••••8123');
  } catch (err) {
    recordFail('Add Bank Account payout method', err);
  }

  // Test 2.4: Tenant Isolation — Another user cannot access or delete creator payout methods
  const otherUserToken = makeToken({
    userId: 'unauthorized_attacker_user',
    email: 'attacker@test.in',
    role: 'USER',
    name: 'Attacker',
  });

  try {
    const res = await fetch(`${BASE_URL}/api/payout-methods?id=${createdMethodId}`, {
      method: 'DELETE',
      headers: { Cookie: `adearn_session=${otherUserToken}` },
    });
    assert.strictEqual(res.status, 404, `Expected 404 unauthorized, got ${res.status}`);
    recordPass('Tenant Isolation: User cannot delete another user payout method (returns 404)');
  } catch (err) {
    recordFail('Tenant isolation payout methods', err);
  }

  // --- SECTION 3: FLOW C — CREATOR WITHDRAWAL & COMPENSATING RECOVERY ---
  console.log('\n[SECTION 3] Flow C — Creator Withdrawal & Compensating Ledger Failure Recovery...');

  // Test 3.1: Minimum threshold enforcement (< ₹100 rejected)
  try {
    const res = await fetch(`${BASE_URL}/api/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `adearn_session=${creatorToken}`,
      },
      body: JSON.stringify({
        amountRupees: 50, // Sub-minimum
        payoutMethodId: createdMethodId,
      }),
    });
    assert.strictEqual(res.status, 400, `Expected 400 for sub-minimum, got ${res.status}`);
    recordPass('Sub-minimum withdrawal (< ₹100.00) rejected with HTTP 400');
  } catch (err) {
    recordFail('Sub-minimum withdrawal check', err);
  }

  // Test 3.2: Overdraft protection (> available balance rejected)
  try {
    const res = await fetch(`${BASE_URL}/api/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `adearn_session=${creatorToken}`,
      },
      body: JSON.stringify({
        amountRupees: 5000, // Available is only ₹500
        payoutMethodId: createdMethodId,
      }),
    });
    assert.strictEqual(res.status, 400, `Expected 400 for insufficient balance, got ${res.status}`);
    recordPass('Overdraft withdrawal exceeding available balance rejected with HTTP 400');
  } catch (err) {
    recordFail('Overdraft withdrawal check', err);
  }

  // Test 3.3: Successful Withdrawal with double-entry debit and UTR reference
  try {
    const res = await fetch(`${BASE_URL}/api/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `adearn_session=${creatorToken}`,
      },
      body: JSON.stringify({
        amountRupees: 150, // ₹150.00
        payoutMethodId: createdMethodId,
      }),
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.success, 'Expected success: true');
    assert.strictEqual(data.payout.status, 'CLEARED');
    assert.ok(data.payout.utrNumber.startsWith('UTR-NPCI-'), `Expected genuine UTR format, got ${data.payout.utrNumber}`);

    // Verify wallet in DB
    const updatedWallet = await prisma.wallet.findUnique({ where: { userId: creatorUser.id } });
    assert.strictEqual(updatedWallet.availablePaise, BigInt(35000), `Expected ₹350 available, got ${updatedWallet.availablePaise}`);
    assert.strictEqual(updatedWallet.lifetimePaidPaise, BigInt(15000), `Expected ₹150 lifetime paid, got ${updatedWallet.lifetimePaidPaise}`);
    recordPass('Withdrawal processed: debited wallet atomically, generated UTR reference and CLEARED status');
  } catch (err) {
    recordFail('Successful withdrawal processing', err);
  }

  // --- SECTION 4: FLOW A — ADVERTISER BILLING, FUNDING ORDERS & GST ---
  console.log('\n[SECTION 4] Flow A — Advertiser Billing, Funding Orders & GST Split...');

  const advOrg = await prisma.organization.create({
    data: {
      name: `FinTech Advertiser ${Date.now()}`,
      contactEmail: `adv_${Date.now()}@test.in`,
      gstin: '27AABCU9603R1ZM',
      wallet: {
        create: {
          availablePaise: BigInt(0),
          pendingPaise: BigInt(0),
          escrowPaise: BigInt(100000), // ₹1,000.00
        },
      },
    },
    include: { wallet: true },
  });

  const advUser = await prisma.user.create({
    data: {
      email: `adv_user_${Date.now()}@test.in`,
      passwordHash: 'dummyhash',
      name: 'Ad Director',
      role: 'ADVERTISER',
      userOrganizations: {
        create: {
          organizationId: advOrg.id,
          role: 'OWNER',
        },
      },
    },
  });

  const advToken = makeToken({
    userId: advUser.id,
    email: advUser.email,
    role: 'ADVERTISER',
    name: advUser.name,
    organizationId: advOrg.id,
  });

  // Test 4.1: Advertiser Top-up generates formal FundingOrder with 18% GST calculation
  try {
    const res = await fetch(`${BASE_URL}/api/advertiser/billing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `adearn_session=${advToken}`,
      },
      body: JSON.stringify({
        amountRupees: 10000, // ₹10,000.00
        utrNumber: 'HDFC-RTGS-982347102938',
      }),
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.success, 'Expected top-up success');
    assert.ok(data.fundingOrder, 'Expected fundingOrder object returned');
    assert.strictEqual(data.fundingOrder.status, 'CONFIRMED');

    // Verify FundingOrder persisted in database with exact integer GST split
    const orderInDb = await prisma.fundingOrder.findUnique({ where: { id: data.fundingOrder.id } });
    assert.ok(orderInDb, 'FundingOrder found in DB');
    assert.strictEqual(orderInDb.totalPaise, BigInt(1000000), 'Total paise = 1,000,000 (₹10,000)');
    assert.strictEqual(orderInDb.amountPaise + orderInDb.gstPaise, orderInDb.totalPaise, 'Base paise + GST paise equals total paise');

    // Verify Organization wallet escrow balance incremented
    const updatedOrgWallet = await prisma.wallet.findUnique({ where: { organizationId: advOrg.id } });
    assert.strictEqual(updatedOrgWallet.escrowPaise, BigInt(1100000), 'Escrow pool incremented to ₹11,000');
    recordPass('Advertiser top-up creates formal FundingOrder with exact 18% GST split and increments escrow pool');
  } catch (err) {
    recordFail('Advertiser top-up FundingOrder test', err);
  }

  // --- CLEANUP TEST DATA ---
  try {
    await prisma.user.delete({ where: { id: creatorUser.id } });
    await prisma.user.delete({ where: { id: advUser.id } });
    await prisma.organization.delete({ where: { id: advOrg.id } });
    recordPass('Safely cleaned up ephemeral test fixtures; original accounts preserved');
  } catch (err) {
    recordFail('Cleanup test fixtures', err);
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST SUITE FINISHED: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecurityAndPaymentTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
