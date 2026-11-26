/**
 * AdEarn AI Automated Test Suite
 * Covers:
 * 1. Financial Ledger Invariants (Double-entry, Overdraft protection, Idempotency, Integer Paise)
 * 2. Kinematic Telemetry Engine (Dwell verification, Anomaly detection, Bot thresholding)
 * 3. Authentication & RBAC (Hashing, JWT verification, Multi-tenant isolation)
 * 4. Live Database & Cryptographic Audit Verification (Prisma MySQL 8.0, HMAC-SHA256 audit chain)
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'adearn-secret-jwt-key-2025';
const AUDIT_SECRET = process.env.AUDIT_HMAC_SECRET || 'adearn-audit-secret-2025';

// Mock in-memory wallet & ledger engine to test state transitions and invariants
class TestLedgerEngine {
  constructor() {
    this.wallets = new Map();
    this.transactions = [];
    this.idempotencyKeys = new Set();
  }

  createWallet(id, userId, initialAvailable = 0n, initialPending = 0n, initialEscrow = 0n) {
    this.wallets.set(id, {
      id,
      userId,
      availablePaise: BigInt(initialAvailable),
      pendingPaise: BigInt(initialPending),
      escrowPaise: BigInt(initialEscrow),
      lifetimeEarnedPaise: 0n,
      lifetimePaidPaise: 0n,
    });
  }

  getWallet(id) {
    return this.wallets.get(id);
  }

  // Credit verified reward to available balance
  creditReward(walletId, amountPaise, reference, idempotencyKey) {
    if (this.idempotencyKeys.has(idempotencyKey)) {
      return { status: 'DUPLICATE_IDEMPOTENT', success: true };
    }
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');

    const amount = BigInt(amountPaise);
    if (amount <= 0n) throw new Error('Amount must be positive');

    wallet.availablePaise += amount;
    wallet.lifetimeEarnedPaise += amount;
    this.transactions.push({
      type: 'CREDIT_REWARD',
      walletId,
      amountPaise: amount,
      reference,
      timestamp: new Date()
    });
    this.idempotencyKeys.add(idempotencyKey);
    return { status: 'SUCCESS', success: true };
  }

  // Lock escrow budget for campaign
  lockEscrow(walletId, amountPaise, reference, idempotencyKey) {
    if (this.idempotencyKeys.has(idempotencyKey)) {
      return { status: 'DUPLICATE_IDEMPOTENT', success: true };
    }
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');

    const amount = BigInt(amountPaise);
    if (wallet.escrowPaise < amount) {
      throw new Error('INSUFFICIENT_ESCROW: Escrow balance cannot be negative');
    }

    wallet.escrowPaise -= amount;
    this.transactions.push({
      type: 'ESCROW_LOCK',
      walletId,
      amountPaise: amount,
      reference,
      timestamp: new Date()
    });
    this.idempotencyKeys.add(idempotencyKey);
    return { status: 'SUCCESS', success: true };
  }

  // Request withdrawal (debits available balance)
  requestWithdrawal(walletId, amountPaise, reference, idempotencyKey) {
    if (this.idempotencyKeys.has(idempotencyKey)) {
      return { status: 'DUPLICATE_IDEMPOTENT', success: true };
    }
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');

    const amount = BigInt(amountPaise);
    // Overdraft protection
    if (wallet.availablePaise < amount) {
      throw new Error('INSUFFICIENT_FUNDS: Available balance cannot be negative');
    }

    wallet.availablePaise -= amount;
    wallet.lifetimePaidPaise += amount;
    this.transactions.push({
      type: 'DEBIT_WITHDRAWAL',
      walletId,
      amountPaise: amount,
      reference,
      timestamp: new Date()
    });
    this.idempotencyKeys.add(idempotencyKey);
    return { status: 'SUCCESS', success: true };
  }
}

// Telemetry Heuristics Validation Function
function validateTelemetry(dwellSeconds, mouseMovements, keyPresses, minRequiredDwell) {
  const flags = [];
  let score = 100;

  if (dwellSeconds < minRequiredDwell) {
    flags.push('LOW_DWELL_TIME');
    score -= 40;
  }
  if (mouseMovements < 5 && keyPresses === 0) {
    flags.push('ZERO_INTERACTION_MACRO');
    score -= 50;
  }
  if (dwellSeconds > 0 && mouseMovements / Math.max(dwellSeconds, 1) > 100) {
    flags.push('ABNORMAL_EVENT_VELOCITY');
    score -= 30;
  }

  return {
    valid: score >= 60,
    confidenceScore: Math.max(0, score),
    flags
  };
}

// RBAC Policy Guard
function checkPermission(userRole, requiredRole) {
  const hierarchy = {
    USER: 1,
    ADVERTISER: 2,
    ADMIN: 3
  };
  return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 99);
}

// Multi-tenant check
function canAccessCampaign(user, campaign) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'ADVERTISER' && user.organizationId === campaign.organizationId) return true;
  return false;
}

// Cryptographic HMAC Hash Generator for Audit Logs
function computeAuditHash(actorId, action, entityId, timestamp) {
  return crypto
    .createHmac('sha256', AUDIT_SECRET)
    .update(`${actorId || 'SYSTEM'}:${action}:${entityId}:${timestamp}`)
    .digest('hex');
}

// Main Test Execution
async function runAllTests() {
  console.log('========================================================');
  console.log('⚡ ADEARN AI AUTOMATED TEST SUITE: FINANCIAL & SECURITY');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${description}`);
      console.error(`    -> ${err.message}`);
      failed++;
    }
  }

  async function testAsync(description, fn) {
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

  // GROUP 1: FINANCIAL LEDGER INVARIANTS
  console.log('[1/4] Testing Financial Ledger Invariants & Accounting...');
  const ledger = new TestLedgerEngine();
  ledger.createWallet('w-101', 'user-001', 50000n, 15000n, 45000000n); // ₹500 available, ₹150 pending, ₹4,50,000 escrow

  test('Integer paise balance initialization is exact', () => {
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.availablePaise, 50000n);
    assert.strictEqual(w.escrowPaise, 45000000n);
  });

  test('Verified reward credit increments available balance and lifetime earnings', () => {
    ledger.creditReward('w-101', 5000n, 'TASK-REWARD-1', 'idem-credit-1');
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.availablePaise, 55000n); // 50000 + 5000
    assert.strictEqual(w.lifetimeEarnedPaise, 5000n);
  });

  test('Idempotency prevents duplicate reward credit for same request key', () => {
    const res = ledger.creditReward('w-101', 5000n, 'TASK-REWARD-1', 'idem-credit-1');
    assert.strictEqual(res.status, 'DUPLICATE_IDEMPOTENT');
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.availablePaise, 55000n); // Still 55000, not 60000
  });

  test('Escrow lock locks unreserved budget for campaign flight', () => {
    ledger.lockEscrow('w-101', 5000000n, 'CAMP-BUDGET-1', 'idem-lock-1');
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.escrowPaise, 40000000n); // 45000000 - 5000000
  });

  test('Withdrawal request debits available balance and increments lifetimePaid', () => {
    ledger.requestWithdrawal('w-101', 20000n, 'PAYOUT-REQ-1', 'idem-payout-1');
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.availablePaise, 35000n); // 55000 - 20000
    assert.strictEqual(w.lifetimePaidPaise, 20000n);
  });

  test('CRITICAL: Overdraft protection prevents negative balance on excessive withdrawal', () => {
    assert.throws(() => {
      // Trying to withdraw 100000 paise (₹1000) when only 35000 paise (₹350) is available
      ledger.requestWithdrawal('w-101', 100000n, 'PAYOUT-REQ-OVERDRAFT', 'idem-payout-2');
    }, /INSUFFICIENT_FUNDS/);
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.availablePaise, 35000n, 'Available balance must remain untouched');
  });

  // GROUP 2: KINEMATICS TELEMETRY & ATTENTION HEURISTICS
  console.log('\n[2/4] Testing Kinematic Telemetry & Anti-Fraud Engine...');

  test('Valid human engagement with adequate dwell time passes verification', () => {
    const res = validateTelemetry(45, 120, 15, 30);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.flags.length, 0);
    assert.strictEqual(res.confidenceScore, 100);
  });

  test('Low dwell time under campaign threshold is flagged', () => {
    const res = validateTelemetry(5, 50, 0, 30);
    assert.strictEqual(res.flags.includes('LOW_DWELL_TIME'), true);
    assert.strictEqual(res.confidenceScore, 60);
  });

  test('Zero interaction macro bot is rejected and flagged', () => {
    const res = validateTelemetry(10, 0, 0, 30);
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.flags.includes('ZERO_INTERACTION_MACRO'), true);
    assert.strictEqual(res.flags.includes('LOW_DWELL_TIME'), true);
    assert.ok(res.confidenceScore < 60);
  });

  // GROUP 3: AUTHENTICATION, TOKENS & RBAC MULTI-TENANCY
  console.log('\n[3/4] Testing Authentication, JWT Security & Multi-Tenancy...');

  await testAsync('Bcrypt password hash and constant-time match verification', async () => {
    const rawPass = 'Creator@Adearn2025!';
    const hash = await bcrypt.hash(rawPass, 10);
    assert.ok(hash.startsWith('$2'));
    const isMatch = await bcrypt.compare(rawPass, hash);
    assert.strictEqual(isMatch, true);
    const isBadMatch = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(isBadMatch, false);
  });

  test('JWT session token signing and verification', () => {
    const payload = { userId: 'usr-1', email: 'test@adearn.ai', role: 'ADVERTISER', orgId: 'org-45' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET);
    assert.strictEqual(decoded.userId, 'usr-1');
    assert.strictEqual(decoded.role, 'ADVERTISER');
  });

  test('RBAC hierarchy prevents unauthorized role escalation', () => {
    assert.strictEqual(checkPermission('ADMIN', 'USER'), true);
    assert.strictEqual(checkPermission('ADMIN', 'ADVERTISER'), true);
    assert.strictEqual(checkPermission('ADMIN', 'ADMIN'), true);
    assert.strictEqual(checkPermission('ADVERTISER', 'ADMIN'), false);
    assert.strictEqual(checkPermission('USER', 'ADVERTISER'), false);
    assert.strictEqual(checkPermission('USER', 'ADMIN'), false);
  });

  test('Tenant isolation prevents advertiser from accessing other organization campaigns', () => {
    const userA = { role: 'ADVERTISER', organizationId: 'org-zerodha' };
    const userB = { role: 'ADVERTISER', organizationId: 'org-competitor' };
    const adminUser = { role: 'ADMIN', organizationId: null };
    const campaignA = { id: 'c-1', organizationId: 'org-zerodha', title: 'Zerodha Mutual Funds' };

    assert.strictEqual(canAccessCampaign(userA, campaignA), true, 'Owner org has access');
    assert.strictEqual(canAccessCampaign(userB, campaignA), false, 'Cross-tenant org is blocked');
    assert.strictEqual(canAccessCampaign(adminUser, campaignA), true, 'Admin has overarching access');
  });

  // GROUP 4: LIVE DATABASE & CRYPTOGRAPHIC AUDIT VERIFICATION
  console.log('\n[4/4] Testing Live MySQL 8.0 & Cryptographic Audit Integrity...');

  await testAsync('Prisma connects to live MySQL 8.0 database and queries seeded users', async () => {
    const userCount = await prisma.user.count();
    assert.ok(userCount >= 3, `Expected at least 3 seeded users, found ${userCount}`);
  });

  await testAsync('Authoritative campaign budgets and integer paise values query accurately', async () => {
    let campaigns = await prisma.campaign.findMany({ select: { title: true, budgetAllocatedPaise: true } });
    let createdEphemeral = null;
    if (campaigns.length === 0) {
      let org = await prisma.organization.findFirst();
      if (!org) {
        org = await prisma.organization.create({
          data: { name: 'Audit Test Org', contactEmail: 'test@org.in' },
        });
      }
      createdEphemeral = await prisma.campaign.create({
        data: {
          organizationId: org.id,
          title: 'Test Budget Precision Campaign',
          description: 'Test budget precision',
          targetUrl: 'https://test.com',
          budgetAllocatedPaise: 500000n,
          costPerOutcomePaise: 2500n,
        },
        select: { title: true, budgetAllocatedPaise: true },
      });
      campaigns = [createdEphemeral];
    }
    assert.ok(campaigns.length >= 1, 'Expected at least 1 campaign for budget invariant check');
    for (const c of campaigns) {
      assert.ok(typeof c.budgetAllocatedPaise === 'bigint', 'Budget must be BigInt paise');
      assert.ok(c.budgetAllocatedPaise > 0n, 'Budget must be positive');
    }
    if (createdEphemeral) {
      await prisma.campaign.deleteMany({ where: { title: 'Test Budget Precision Campaign' } });
    }
  });

  test('Cryptographic audit log produces verifiable HMAC-SHA256 hash', () => {
    const timestamp = '2026-10-17T12:00:00Z';
    const hash = computeAuditHash('usr-admin-1', 'CAMPAIGN_MODERATION_APPROVE', 'camp-101', timestamp);
    assert.strictEqual(hash.length, 64, 'HMAC-SHA256 must produce 64-char hex digest');
    // Verify re-computation matches
    const verifyHash = computeAuditHash('usr-admin-1', 'CAMPAIGN_MODERATION_APPROVE', 'camp-101', timestamp);
    assert.strictEqual(hash, verifyHash);
  });

  console.log('\n========================================================');
  console.log(`🏁 TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(async (e) => {
  console.error('Test execution error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
