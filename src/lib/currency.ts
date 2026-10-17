/**
 * AdEarn AI Indian Currency Formatting Utility
 * All monetary amounts are stored in integer minor units (paise).
 * 1 INR = 100 paise.
 */

export function paiseToRupees(paise: number | bigint): number {
  return Number(paise) / 100;
}

export function rupeesToPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

export function formatINR(paise: number | bigint | string | null | undefined, showDecimals: boolean = true): string {
  if (paise === null || paise === undefined) return '₹0.00';
  const val = Number(paise) / 100;
  
  // Format using Indian numbering system (e.g. ₹1,25,000.00)
  const parts = val.toFixed(showDecimals ? 2 : 0).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  const isNegative = integerPart.startsWith('-');
  if (isNegative) integerPart = integerPart.substring(1);

  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  
  const result = (isNegative ? '-₹' : '₹') + formattedInteger + (showDecimals ? '.' + decimalPart : '');
  return result;
}

export function formatNumberIN(num: number | bigint | string | null | undefined): string {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-IN');
}
