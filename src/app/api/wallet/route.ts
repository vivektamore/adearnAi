import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get('type') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '15', 10);
  const skip = (page - 1) * limit;

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  const where: any = { walletId: wallet.id };
  if (typeFilter && typeFilter !== 'ALL') {
    where.type = typeFilter;
  }

  const [transactions, total] = await Promise.all([
    prisma.ledgerTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ledgerTransaction.count({ where }),
  ]);

  return NextResponse.json({
    wallet,
    transactions,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  });
}
