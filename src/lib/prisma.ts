import { PrismaClient } from '@prisma/client';

// Polyfill BigInt serialization to JSON string so API responses serialize gracefully
if (typeof BigInt !== 'undefined') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
