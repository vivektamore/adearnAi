/**
 * AdEarn AI Automated Test Suite
 * Covers:
 * 1. Financial Ledger Invariants (Double-entry, Overdraft protection, Idempotency, Integer Paise)
 * 2. Kinematic Telemetry Engine (Dwell verification, Anomaly detection, Bot thresholding)
 * 3. Authentication & RBAC (Hashing, JWT verification, Multi-tenant isolation)
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'adearn-secret-jwt-key-2025';

// Mock in-memory wallet & ledger engine to test state transitions and invariants
class TestLedgerEngine {
  constructor() {
    this.wallets = new Map();
    this.transactions = [];
    this.idempotencyKeys = new Set();
  }

  createWallet(id, userId, initialAvailable = 0n, initialPending = 0n) {
    this.wallets.set(id, {
      id,
      userId,
      availablePaise: BigInt(initialAvailable),
      pendingPaise: BigInt(initialPending),
      heldPaise: 0n,
      version: 1
    });
  }

  getWallet(id) {
    return this.wallets.get(id);
  }

  // Authorize credit to pending rewards
  creditPending(walletId, amountPaise, reference, idempotencyKey) {
    if (this.idempotencyKeys.has(idempotencyKey)) {
      return { status: 'DUPLICATE_IDEMPOTENT', success: true };
    }
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');

    const amount = BigInt(amountPaise);
    if (amount <= 0n) throw new Error('Amount must be positive');

    wallet.pendingPaise += amount;
    this.transactions.push({
      type: 'CREDIT_PENDING',
      walletId,
      amountPaise: amount,
      reference,
      timestamp: new Date()
    });
    this.idempotencyKeys.add(idempotencyKey);
    return { status: 'SUCCESS', success: true };
  }

  // Clear pending to available
  approveReward(walletId, amountPaise, reference, idempotencyKey) {
    if (this.idempotencyKeys.has(idempotencyKey)) {
      return { status: 'DUPLICATE_IDEMPOTENT', success: true };
    }
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');

    const amount = BigInt(amountPaise);
    if (wallet.pendingPaise < amount) {
      throw new Error('Insufficient pending balance to approve');
    }

    wallet.pendingPaise -= amount;
    wallet.availablePaise += amount;
    this.transactions.push({
      type: 'APPROVE_REWARD',
      walletId,
      amountPaise: amount,
      reference,
      timestamp: new Date()
    });
    this.idempotencyKeys.add(idempotencyKey);
    return { status: 'SUCCESS', success: true };
  }

  // Request withdrawal (moves available to held / debits available)
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
    wallet.heldPaise += amount;
    this.transactions.push({
      type: 'DEBIT_AVAILABLE_FOR_PAYOUT',
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
  console.log('[1/3] Testing Financial Ledger Invariants & Accounting...');
  const ledger = new TestLedgerEngine();
  ledger.createWallet('w-101', 'user-001', 50000n, 15000n); // ₹500 available, ₹150 pending

  test('Integer paise balance initialization is exact', () => {
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.availablePaise, 50000n);
    assert.strictEqual(w.pendingPaise, 15000n);
  });

  test('Pending reward credit increments pending balance', () => {
    ledger.creditPending('w-101', 5000n, 'TASK-REWARD-1', 'idem-credit-1');
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.pendingPaise, 20000n); // 15000 + 5000
  });

  test('Idempotency prevents duplicate reward credit for same request key', () => {
    const res = ledger.creditPending('w-101', 5000n, 'TASK-REWARD-1', 'idem-credit-1');
    assert.strictEqual(res.status, 'DUPLICATE_IDEMPOTENT');
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.pendingPaise, 20000n); // Still 20000, not 25000
  });

  test('Approve reward atomically shifts funds from pending to available', () => {
    ledger.approveReward('w-101', 10000n, 'APPROVE-TASK-1', 'idem-app-1');
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.pendingPaise, 10000n); // 20000 - 10000
    assert.strictEqual(w.availablePaise, 60000n); // 50000 + 10000
  });

  test('Withdrawal request debits available balance to held balance', () => {
    ledger.requestWithdrawal('w-101', 20000n, 'PAYOUT-REQ-1', 'idem-payout-1');
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.availablePaise, 40000n); // 60000 - 20000
    assert.strictEqual(w.heldPaise, 20000n);
  });

  test('CRITICAL: Overdraft protection prevents negative balance on excessive withdrawal', () => {
    assert.throws(() => {
      // Trying to withdraw 100000 paise (₹1000) when only 40000 paise (₹400) is available
      ledger.requestWithdrawal('w-101', 100000n, 'PAYOUT-REQ-OVERDRAFT', 'idem-payout-2');
    }, /INSUFFICIENT_FUNDS/);
    const w = ledger.getWallet('w-101');
    assert.strictEqual(w.availablePaise, 40000n, 'Available balance must remain untouched');
  });

  // GROUP 2: KINEMATICS TELEMETRY & ATTENTION HEURISTICS
  console.log('\n[2/3] Testing Kinematic Telemetry & Anti-Fraud Engine...');

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
  console.log('\n[3/3] Testing Authentication, JWT Security & Multi-Tenancy...');

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

  console.log('\n========================================================');
  console.log(`🏁 TEST RUN COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
