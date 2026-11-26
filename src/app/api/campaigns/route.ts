import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const actionType = searchParams.get('actionType') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category && category !== 'All') {
      where.category = category;
    }

    if (actionType && actionType !== 'All') {
      where.actionType = actionType;
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: { name: true, isVerified: true },
          },
          creativeAssets: {
            take: 1,
            select: { assetUrl: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    const categories = await prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
      select: { category: true },
      distinct: ['category'],
    });

    return NextResponse.json(
      serializeBigInts({
        campaigns,
        pagination: {
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
        categories: ['All', ...categories.map((c) => c.category)],
      })
    );
  } catch (err: any) {
    console.error('Error fetching campaigns feed:', err);
    return NextResponse.json({ error: 'Failed to retrieve campaigns.' }, { status: 500 });
  }
}
