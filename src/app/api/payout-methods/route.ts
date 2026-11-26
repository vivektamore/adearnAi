import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


function maskUpi(vpa: string): string {
  const parts = vpa.split('@');
  if (parts.length !== 2) return '••••@upi';
  const handle = parts[0];
  const provider = parts[1];
  const maskedHandle = handle.length <= 2 ? `${handle[0] || '*'}*` : `${handle.slice(0, 2)}${'*'.repeat(Math.max(1, handle.length - 4))}${handle.slice(-2)}`;
  return `${maskedHandle}@${provider}`;
}

function maskBankAccount(acc: string): string {
  const clean = acc.replace(/\s+/g, '');
  if (clean.length <= 4) return '••••' + clean;
  return '••••••••' + clean.slice(-4);
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;

  const methods = await prisma.payoutMethod.findMany({
    where: {
      userId,
      status: { not: 'REMOVED' },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      type: true,
      accountHolderName: true,
      maskedAddress: true,
      ifscCode: true,
      bankName: true,
      status: true,
      isDefault: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    payoutMethods: methods,
    count: methods.length,
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const body = await req.json();
  const { type, accountHolderName, ifscCode, bankName, makeDefault } = body;
  const upiId = body.upiId || body.destinationAddress;
  const accountNumber = body.accountNumber || body.destinationAddress;

  if (!accountHolderName || accountHolderName.trim().length < 2) {
    return NextResponse.json({ error: 'Please provide a valid account holder name as per bank records.' }, { status: 400 });
  }

  let finalType: 'UPI' | 'BANK_ACCOUNT' = type === 'BANK_ACCOUNT' ? 'BANK_ACCOUNT' : 'UPI';
  let destinationAddress = '';
  let maskedAddress = '';
  let finalIfsc = null;
  let finalBankName = bankName || null;

  if (finalType === 'UPI') {
    if (!upiId || typeof upiId !== 'string') {
      return NextResponse.json({ error: 'A valid UPI ID (e.g. user@okhdfcbank) is required.' }, { status: 400 });
    }
    const cleanUpi = upiId.trim().toLowerCase();
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(cleanUpi)) {
      return NextResponse.json({ error: 'Invalid UPI ID format. Expected format: username@bank' }, { status: 400 });
    }
    destinationAddress = cleanUpi;
    maskedAddress = maskUpi(cleanUpi);
  } else {
    if (!accountNumber || typeof accountNumber !== 'string') {
      return NextResponse.json({ error: 'Valid bank account number is required.' }, { status: 400 });
    }
    const cleanAcc = accountNumber.trim().replace(/[-\s]/g, '');
    if (!/^\d{9,18}$/.test(cleanAcc)) {
      return NextResponse.json({ error: 'Bank account number must be between 9 and 18 digits.' }, { status: 400 });
    }
    if (!ifscCode || typeof ifscCode !== 'string') {
      return NextResponse.json({ error: 'Valid 11-character Bank IFSC Code is required.' }, { status: 400 });
    }
    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      return NextResponse.json({ error: 'Invalid IFSC code format (e.g. HDFC0001234).' }, { status: 400 });
    }
    destinationAddress = cleanAcc;
    maskedAddress = maskBankAccount(cleanAcc);
    finalIfsc = cleanIfsc;
  }

  // Check if this method already exists for this user
  const existing = await prisma.payoutMethod.findFirst({
    where: {
      userId,
      destinationAddress,
      status: { not: 'REMOVED' },
    },
  });

  if (existing) {
    return NextResponse.json({ error: 'This payout destination is already configured on your account.' }, { status: 409 });
  }

  // Count existing methods to determine default
  const existingCount = await prisma.payoutMethod.count({
    where: { userId, status: { not: 'REMOVED' } },
  });

  const shouldBeDefault = Boolean(makeDefault || existingCount === 0);

  if (shouldBeDefault) {
    // Unset current default
    await prisma.payoutMethod.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  const payoutMethod = await prisma.payoutMethod.create({
    data: {
      userId,
      type: finalType,
      accountHolderName: accountHolderName.trim(),
      destinationAddress,
      maskedAddress,
      ifscCode: finalIfsc,
      bankName: finalBankName,
      status: 'VERIFIED',
      isDefault: shouldBeDefault,
      verifiedAt: new Date(),
    },
  });

  // Sync to legacy user fields for backward compatibility
  if (shouldBeDefault) {
    if (finalType === 'UPI') {
      await prisma.user.update({
        where: { id: userId },
        data: { upiId: destinationAddress },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          bankAccountNumber: destinationAddress,
          bankIfsc: finalIfsc,
          bankAccountName: accountHolderName.trim(),
        },
      });
    }
  }

  await recordAuditLog({
    actorId: userId,
    actorRole: auth.session!.role,
    action: 'PAYOUT_METHOD_ADDED',
    entityType: 'PayoutMethod',
    entityId: payoutMethod.id,
    newState: {
      type: finalType,
      maskedAddress,
      isDefault: shouldBeDefault,
    },
  });

  return NextResponse.json({
    success: true,
    message: `${finalType === 'UPI' ? 'UPI Destination' : 'Bank Account'} verified and added successfully.`,
    payoutMethod: {
      id: payoutMethod.id,
      type: payoutMethod.type,
      accountHolderName: payoutMethod.accountHolderName,
      maskedAddress: payoutMethod.maskedAddress,
      ifscCode: payoutMethod.ifscCode,
      bankName: payoutMethod.bankName,
      status: payoutMethod.status,
      isDefault: payoutMethod.isDefault,
    },
  });
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const { payoutMethodId, makeDefault } = await req.json();

  if (!payoutMethodId) {
    return NextResponse.json({ error: 'Payout method ID required.' }, { status: 400 });
  }

  const method = await prisma.payoutMethod.findFirst({
    where: { id: payoutMethodId, userId, status: { not: 'REMOVED' } },
  });

  if (!method) {
    return NextResponse.json({ error: 'Payout method not found or unauthorized.' }, { status: 404 });
  }

  if (makeDefault) {
    await prisma.payoutMethod.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    const updated = await prisma.payoutMethod.update({
      where: { id: payoutMethodId },
      data: { isDefault: true },
    });

    // Sync to user table
    if (updated.type === 'UPI') {
      await prisma.user.update({
        where: { id: userId },
        data: { upiId: updated.destinationAddress },
      });
    }

    return NextResponse.json({ success: true, message: 'Default payout destination updated.' });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req, ['USER', 'ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = auth.session!.userId;
  const { searchParams } = new URL(req.url);
  const payoutMethodId = searchParams.get('id');

  if (!payoutMethodId) {
    return NextResponse.json({ error: 'Payout method ID is required.' }, { status: 400 });
  }

  const method = await prisma.payoutMethod.findFirst({
    where: { id: payoutMethodId, userId },
  });

  if (!method) {
    return NextResponse.json({ error: 'Payout method not found or unauthorized.' }, { status: 404 });
  }

  await prisma.payoutMethod.update({
    where: { id: payoutMethodId },
    data: { status: 'REMOVED', isDefault: false },
  });

  await recordAuditLog({
    actorId: userId,
    actorRole: auth.session!.role,
    action: 'PAYOUT_METHOD_REMOVED',
    entityType: 'PayoutMethod',
    entityId: payoutMethodId,
    newState: { status: 'REMOVED' },
  });

  return NextResponse.json({ success: true, message: 'Payout method removed.' });
}
