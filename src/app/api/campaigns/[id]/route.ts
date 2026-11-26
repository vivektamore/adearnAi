import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializeBigInts } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isVerified: true,
          },
        },
        creativeAssets: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInts({ campaign }));
  } catch (err: any) {
    console.error('Error fetching campaign detail:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
