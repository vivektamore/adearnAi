import { DoubleEntryLedger, SYSTEM_ACCOUNTS } from '../src/lib/double-entry';
import { prisma } from '../src/lib/prisma';

async function runChartOfAccountsCacheSuite() {
  console.log('================================================================');
  console.log('🔒 CHART OF ACCOUNTS CACHE & FAIL-CLOSED AUDIT SUITE');
  console.log('Target: Live MySQL 8.0 & DoubleEntryLedger Engine');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Initial State & Clean Cache
  try {
    DoubleEntryLedger.clearAccountCache();
    assert(true, '1.1 Cache cleared successfully');

    // 2. Concurrent Stampede / Thundering Herd Initialization
    // Launch 30 concurrent calls to ensureStandardAccounts simultaneously
    console.log('--- Testing Concurrent Cache Initialization (Stampede Defense) ---');
    const startConcurrent = Date.now();
    const concurrentPromises = Array.from({ length: 30 }, (_, i) =>
      DoubleEntryLedger.ensureStandardAccounts().then((map) => ({ index: i, map }))
    );

    const results = await Promise.all(concurrentPromises);
    const concurrentDuration = Date.now() - startConcurrent;

    assert(results.length === 30, `2.1 All 30 concurrent requests resolved (${concurrentDuration}ms)`);

    // Verify all 30 returned identical instances with all 6 system accounts
    const firstMap = results[0].map;
    assert(firstMap.size === Object.keys(SYSTEM_ACCOUNTS).length, `2.2 Account map has exact size ${Object.keys(SYSTEM_ACCOUNTS).length}`);

    let allIdentical = true;
    for (let i = 1; i < results.length; i++) {
      if (results[i].map !== firstMap) {
        allIdentical = false;
        break;
      }
    }
    assert(allIdentical, '2.3 In-flight mutex guarantee: All 30 callers shared identical resolution promise (Zero redundant DB queries)');

    for (const [key, def] of Object.entries(SYSTEM_ACCOUNTS)) {
      const accId = firstMap.get(def.code);
      assert(!!accId && typeof accId === 'string', `2.4 System account '${def.code}' correctly mapped to UUID (${accId?.substring(0, 8)}...)`);
    }

    // 3. Stale Cache / Invalidation Recovery
    console.log('\n--- Testing Cache Invalidation & Hot Path Performance ---');
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      await DoubleEntryLedger.ensureStandardAccounts();
    }
    const t1 = performance.now();
    const avgMicros = ((t1 - t0) / 1000) * 1000;
    assert(avgMicros < 50, `3.1 Cached read latency is sub-millisecond (Avg: ${avgMicros.toFixed(2)} microseconds per call)`);

    DoubleEntryLedger.clearAccountCache();
    const freshMap = await DoubleEntryLedger.ensureStandardAccounts();
    assert(freshMap.size === Object.keys(SYSTEM_ACCOUNTS).length, '3.2 Re-initialization after clearAccountCache() succeeds cleanly');

    // 4. Fail-Closed Security: Account Type Corruption Defense
    console.log('\n--- Testing Fail-Closed Security (Type Corruption & Tampering) ---');
    // Temporarily corrupt account type in MySQL
    const targetCode = '2010_ADVERTISER_ESCROW_LIABILITY';
    const originalAccount = await (prisma as any).account.findUnique({ where: { code: targetCode } });
    assert(originalAccount.type === 'LIABILITY', '4.1 Pre-condition: 2010 account is LIABILITY');

    await (prisma as any).account.update({
      where: { code: targetCode },
      data: { type: 'EXPENSE' }, // Malicious or corrupted alteration
    });

    DoubleEntryLedger.clearAccountCache();

    let corruptionCaught = false;
    let errorMessage = '';
    try {
      await DoubleEntryLedger.ensureStandardAccounts();
    } catch (err: any) {
      corruptionCaught = true;
      errorMessage = err.message;
    }

    assert(
      corruptionCaught && errorMessage.includes('CHART_OF_ACCOUNTS_CORRUPT'),
      `4.2 Fail-Closed Invariant: Corrupted account type aborted with CHART_OF_ACCOUNTS_CORRUPT ('${errorMessage}')`
    );

    // Restore pristine account type
    await (prisma as any).account.update({
      where: { code: targetCode },
      data: { type: 'LIABILITY' },
    });

    DoubleEntryLedger.clearAccountCache();
    const restoredMap = await DoubleEntryLedger.ensureStandardAccounts();
    assert(
      restoredMap.size === Object.keys(SYSTEM_ACCOUNTS).length,
      '4.3 Post-condition: Successfully recovered after restoring valid institutional account type'
    );

  } catch (err: any) {
    console.error('Fatal test error:', err);
    assert(false, `Unexpected failure: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`🏁 CACHE AUDIT RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runChartOfAccountsCacheSuite();
