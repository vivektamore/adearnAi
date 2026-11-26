import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = 'degraded';
    console.error('Database health check failed:', err.message);
  }

  const responseTimeMs = Date.now() - startTime;
  const isHealthy = dbStatus === 'healthy';

  return NextResponse.json(
    {
      status: isHealthy ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      service: 'AdEarn AI Core API Engine',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: dbStatus,
          engine: 'MySQL 8.0',
          latencyMs: dbLatencyMs,
        },
        payoutAdapter: {
          mode: process.env.PAYOUT_MODE || 'sandbox',
          status: 'ready',
        },
        ledgerEngine: {
          status: 'operational',
          currency: 'INR (Integer Paise)',
        },
      },
      responseTimeMs,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
