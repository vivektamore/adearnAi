/**
 * AdEarn AI — Exact Institutional Money Representation & Conversion Engine (JS / CJS Core)
 *
 * INVARIANTS:
 * 1. Zero Floating-Point Arithmetic: Money is NEVER multiplied by 100 via float numbers.
 * 2. Strict Integer Minor Units: All monetary amounts in database & internal services are 64-bit integer paise (BigInt).
 * 3. 1 INR = 100 paise.
 * 4. Disallow Fractional Paise: Any input with more than 2 decimal places is strictly rejected.
 * 5. Upper Bound Limits: Guard against overflow and negative values.
 */

const MAX_MONETARY_PAISE = BigInt('100000000000'); // ₹100,00,00,000 (100 Crore Rupees in paise)

/**
 * Parses a rupee input (string, number, or bigint) into exact integer paise (BigInt)
 * without using floating-point multiplication.
 *
 * @param {string | number | bigint} input Value in Rupees (e.g., "150.50", 150.5, 150, "150")
 * @param {boolean} allowZero Whether zero is acceptable (default: false)
 * @returns {bigint} BigInt paise
 */
function parseRupeesToPaise(input, allowZero = false) {
  if (input === null || input === undefined) {
    throw new Error('Monetary amount is required.');
  }

  // If already BigInt, validate bounds
  if (typeof input === 'bigint') {
    if (input < 0n) throw new Error('Monetary amount cannot be negative.');
    if (!allowZero && input === 0n) throw new Error('Monetary amount must be greater than zero.');
    if (input > MAX_MONETARY_PAISE) throw new Error('Monetary amount exceeds maximum platform limit.');
    return input;
  }

  const rawStr = String(input).trim();
  if (rawStr === '') {
    throw new Error('Monetary amount string cannot be empty.');
  }

  // Reject scientific notation or non-numeric characters (allow only digits and at most one decimal point)
  if (!/^[0-9]+(\.[0-9]+)?$/.test(rawStr)) {
    throw new Error(`Invalid monetary format: "${rawStr}". Must be positive decimal currency string.`);
  }

  const parts = rawStr.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';

  // Policy: values containing more than 2 decimal places are strictly rejected
  if (decimalPart.length > 2) {
    throw new Error(`Fractional paise rejected: "${rawStr}". Maximum 2 decimal places allowed.`);
  }

  // Normalize decimal part to exactly 2 digits
  const normalizedDecimal = decimalPart.padEnd(2, '0');
  const combinedStr = integerPart + normalizedDecimal;

  // Remove leading zeros for clean BigInt parsing
  const cleanStr = combinedStr.replace(/^0+(?=\d)/, '') || '0';
  const paise = BigInt(cleanStr);

  if (paise < 0n) {
    throw new Error('Monetary amount cannot be negative.');
  }

  if (!allowZero && paise === 0n) {
    throw new Error('Monetary amount must be strictly greater than zero.');
  }

  if (paise > MAX_MONETARY_PAISE) {
    throw new Error('Monetary amount exceeds maximum allowable transaction limit (₹100 Crore).');
  }

  return paise;
}

/**
 * Converts integer paise into an exact decimal-rupee string (e.g. 10050n -> "100.50")
 * without floating point drift.
 *
 * @param {bigint | number} paise
 * @returns {string}
 */
function paiseToDecimalRupees(paise) {
  const p = BigInt(paise);
  const isNegative = p < 0n;
  const absPaise = isNegative ? -p : p;

  const str = absPaise.toString().padStart(3, '0');
  const integerPart = str.slice(0, -2);
  const decimalPart = str.slice(-2);

  return `${isNegative ? '-' : ''}${integerPart}.${decimalPart}`;
}

/**
 * Calculates 18% GST split from gross total paise using integer arithmetic.
 *
 * For Inclusive Tax (Gross Total provided):
 *   Base = (Gross * 100) / (100 + Rate)
 *   GST  = Gross - Base
 *
 * @param {bigint} grossTotalPaise
 * @param {number} ratePercent
 */
function calculateGstInclusive(grossTotalPaise, ratePercent = 18) {
  if (grossTotalPaise < 0n) {
    throw new Error('Gross total paise cannot be negative.');
  }

  const multiplier = 100n;
  const divisor = BigInt(100 + ratePercent);

  // Exact integer paise base
  const basePaise = (grossTotalPaise * multiplier) / divisor;
  const gstPaise = grossTotalPaise - basePaise;

  return {
    basePaise,
    gstPaise,
    totalPaise: grossTotalPaise,
    ratePercent,
  };
}

/**
 * Safe BigInt serialization helper for JSON responses.
 */
function serializeBigInts(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object') {
    const res = {};
    for (const [key, val] of Object.entries(obj)) {
      res[key] = serializeBigInts(val);
    }
    return res;
  }
  return obj;
}

module.exports = {
  MAX_MONETARY_PAISE,
  parseRupeesToPaise,
  paiseToDecimalRupees,
  calculateGstInclusive,
  serializeBigInts,
};
