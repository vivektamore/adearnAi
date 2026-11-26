const assert = require('assert');
// Compile ts or require ts-node or compiled js
// Since we are running in Node, let's write a self-contained test of money functions or load with ts-node/transpile
const { parseRupeesToPaise, paiseToDecimalRupees, calculateGstInclusive } = require('../src/lib/money');

console.log('Testing exact money representation and arithmetic invariants...');

// 1. Valid conversions
assert.strictEqual(parseRupeesToPaise('100.50'), 10050n, '100.50 should be 10050 paise');
assert.strictEqual(parseRupeesToPaise('100.5'), 10050n, '100.5 should be 10050 paise');
assert.strictEqual(parseRupeesToPaise('100'), 10000n, '100 should be 10000 paise');
assert.strictEqual(parseRupeesToPaise('0.05'), 5n, '0.05 should be 5 paise');
assert.strictEqual(parseRupeesToPaise('0.01'), 1n, '0.01 should be 1 paise');
assert.strictEqual(parseRupeesToPaise('0', true), 0n, '0 should be allowed when allowZero is true');
assert.strictEqual(parseRupeesToPaise(250), 25000n, 'number 250 should be 25000 paise');
assert.strictEqual(parseRupeesToPaise(50000n), 50000n, 'BigInt should be preserved');

// 2. Exact formatting
assert.strictEqual(paiseToDecimalRupees(10050n), '100.50');
assert.strictEqual(paiseToDecimalRupees(5n), '0.05');
assert.strictEqual(paiseToDecimalRupees(0n), '0.00');
assert.strictEqual(paiseToDecimalRupees(100000000n), '1000000.00');

// 3. Rejection of fractional paise (>2 decimals)
assert.throws(() => parseRupeesToPaise('100.555'), /Fractional paise rejected/);
assert.throws(() => parseRupeesToPaise('0.001'), /Fractional paise rejected/);
assert.throws(() => parseRupeesToPaise('12.3456'), /Fractional paise rejected/);

// 4. Rejection of negative amounts
assert.throws(() => parseRupeesToPaise('-50'), /Invalid monetary format/);
assert.throws(() => parseRupeesToPaise(-50n), /cannot be negative/);

// 5. Rejection of malformed / scientific inputs
assert.throws(() => parseRupeesToPaise('1e5'), /Invalid monetary format/);
assert.throws(() => parseRupeesToPaise('abc'), /Invalid monetary format/);
assert.throws(() => parseRupeesToPaise(''), /cannot be empty/);
assert.throws(() => parseRupeesToPaise('100.50.20'), /Invalid monetary format/);

// 6. GST Calculation
const gst = calculateGstInclusive(11800n, 18);
assert.strictEqual(gst.basePaise, 10000n, 'Base should be 10000 paise on 11800 gross');
assert.strictEqual(gst.gstPaise, 1800n, 'GST should be 1800 paise on 11800 gross');
assert.strictEqual(gst.basePaise + gst.gstPaise, gst.totalPaise, 'Base + GST must exactly equal total');

console.log('✓ All money invariant tests passed successfully.');
