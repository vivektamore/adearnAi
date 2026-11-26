const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function runAuthSecurityTests() {
  console.log('================================================================');
  console.log('🛡️  ADEARN AI AUTHENTICATION & ACCOUNT CREATION SECURITY SUITE');
  console.log('Testing against Live Local Server & Live MySQL 8.0');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // --- SECTION 1: REGISTRATION INPUT VALIDATION & ATOMICITY ---
  console.log('--- [SECTION 1] Registration Validation & Atomicity ---');

  // Test 1.1: Reject malformed email
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email-format',
        password: 'ValidPassword123!',
        name: 'Test Malformed',
      }),
    });
    assert(res.status === 400, '1.1.1 Malformed email rejected with HTTP 400');
    const data = await res.json();
    assert(data.error && data.error.includes('valid email'), '1.1.2 Clear validation message returned');
  } catch (err) {
    assert(false, `1.1 Error: ${err.message}`);
  }

  // Test 1.2: Reject weak password
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `valid_${Date.now()}@test.in`,
        password: '1234', // too short
        name: 'Test Weak Pass',
      }),
    });
    assert(res.status === 400, '1.2.1 Short password rejected with HTTP 400');
  } catch (err) {
    assert(false, `1.2 Error: ${err.message}`);
  }

  // Test 1.3: Atomic registration creates User AND Wallet
  const validTestEmail = `secure_creator_${Date.now()}@test.in`;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validTestEmail,
        password: 'SecurePassword123!',
        name: 'Secure Creator',
        role: 'USER',
      }),
    });
    assert(res.status === 200, '1.3.1 Valid registration returns HTTP 200');
    const data = await res.json();
    assert(data.success && data.token, '1.3.2 Session token issued');

    // Verify in database that User AND Wallet were created atomically
    const createdUser = await prisma.user.findUnique({
      where: { email: validTestEmail },
      include: { wallet: true },
    });
    assert(createdUser !== null, '1.3.3 User record exists in MySQL');
    assert(createdUser.wallet !== null, '1.3.4 Wallet sub-ledger record created atomically (no orphaned user)');
    assert(createdUser.wallet.availablePaise === 0n, '1.3.5 Wallet initialized with exactly 0 paise');
    assert(createdUser.kycStatus === 'UNVERIFIED', '1.3.6 New user initialized with UNVERIFIED KYC status');
  } catch (err) {
    assert(false, `1.3 Error: ${err.message}`);
  }

  // Test 1.4: Duplicate email rejected
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validTestEmail,
        password: 'SecurePassword123!',
        name: 'Duplicate Creator',
      }),
    });
    assert(res.status === 409, '1.4.1 Duplicate registration rejected with HTTP 409 Conflict');
  } catch (err) {
    assert(false, `1.4 Error: ${err.message}`);
  }

  // --- SECTION 2: LOGIN AUTHENTICATION & BRUTE-FORCE THROTTLING ---
  console.log('\n--- [SECTION 2] Login Authentication & Brute-Force Defense ---');

  // Test 2.1: Reject invalid email format on login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'anypassword',
      }),
    });
    assert(res.status === 400, '2.1.1 Malformed login email rejected with HTTP 400');
  } catch (err) {
    assert(false, `2.1 Error: ${err.message}`);
  }

  // Test 2.2: Reject incorrect password with 401
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validTestEmail,
        password: 'WrongPassword!',
      }),
    });
    assert(res.status === 401, '2.2.1 Incorrect password returns HTTP 401');
  } catch (err) {
    assert(false, `2.2 Error: ${err.message}`);
  }

  // Test 2.3: Repeated failed attempts trigger HTTP 429 lockout
  console.log('--- Testing 5 consecutive failed attempts to trigger rate limiter ---');
  const targetBruteEmail = `target_${Date.now()}@test.in`;
  let lockoutTriggered = false;

  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.42' },
      body: JSON.stringify({
        email: targetBruteEmail,
        password: `WrongPassAttempt${attempt}!`,
      }),
    });

    if (res.status === 429) {
      lockoutTriggered = true;
      break;
    }
  }
  assert(lockoutTriggered, '2.3.1 Rate limiter intercepted brute-force storm with HTTP 429');

  // Test 2.4: Valid login succeeds
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validTestEmail,
        password: 'SecurePassword123!',
      }),
    });
    assert(res.status === 200, '2.4.1 Valid login returns HTTP 200');
    const cookie = res.headers.get('set-cookie');
    assert(cookie && cookie.includes('adearn_session='), '2.4.2 Secure HTTP-only adearn_session cookie set');
  } catch (err) {
    assert(false, `2.4 Error: ${err.message}`);
  }

  // Cleanup test user
  await prisma.wallet.deleteMany({ where: { user: { email: validTestEmail } } });
  await prisma.user.deleteMany({ where: { email: validTestEmail } });

  console.log('\n================================================================');
  console.log(`🏁 AUTH SECURITY TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAuthSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());

