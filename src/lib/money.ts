/**
 * AdEarn AI — Exact Institutional Money Representation & Conversion Engine (TypeScript Interface)
 */

import moneyJs from './money.js';

export const MAX_MONETARY_PAISE: bigint = moneyJs.MAX_MONETARY_PAISE;

export interface GstBreakdown {
  basePaise: bigint;
  gstPaise: bigint;
  totalPaise: bigint;
  ratePercent: number;
}

export const parseRupeesToPaise: (input: string | number | bigint, allowZero?: boolean) => bigint = moneyJs.parseRupeesToPaise;

export const paiseToDecimalRupees: (paise: bigint | number) => string = moneyJs.paiseToDecimalRupees;

export const calculateGstInclusive: (grossTotalPaise: bigint, ratePercent?: number) => GstBreakdown = moneyJs.calculateGstInclusive;

export const serializeBigInts: <T>(obj: T) => any = moneyJs.serializeBigInts;

export default {
  MAX_MONETARY_PAISE,
  parseRupeesToPaise,
  paiseToDecimalRupees,
  calculateGstInclusive,
  serializeBigInts,
};
