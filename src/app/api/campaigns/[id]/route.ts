import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
            gstin: true,
          },
        },
        creativeAssets: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (err: any) {
    console.error('Error fetching campaign detail:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
