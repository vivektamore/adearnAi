const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const SYSTEM_ACCOUNTS = {
  NODAL_BANK_ASSET: { code: '1010_NODAL_BANK_ASSET', name: 'Nodal Escrow Bank Account', type: 'ASSET' },
  ADVERTISER_ESCROW_LIABILITY: { code: '2010_ADVERTISER_ESCROW_LIABILITY', name: 'Advertiser Escrow Deposits', type: 'LIABILITY' },
  CAMPAIGN_RESERVE_LIABILITY: { code: '2020_CAMPAIGN_RESERVE_LIABILITY', name: 'Active Campaign Budget Reserves', type: 'LIABILITY' },
  CREATOR_PAYABLE_LIABILITY: { code: '2030_CREATOR_PAYABLE_LIABILITY', name: 'Creator Withdrawable Earnings Payable', type: 'LIABILITY' },
  CREATOR_PENDING_LIABILITY: { code: '2040_CREATOR_PENDING_LIABILITY', name: 'Creator Pending Rewards Reserve', type: 'LIABILITY' },
  PLATFORM_FEE_REVENUE: { code: '4010_PLATFORM_FEE_REVENUE', name: 'Platform Facilitation Revenue', type: 'REVENUE' },
};

async function main() {
  console.log('--- AdEarn AI: Clean Database Baseline for Live Testing ---');

  // Purge all test records and residual dummy data
  await prisma.adEvent.deleteMany({});
  await prisma.adDecision.deleteMany({});
  await prisma.adRequest.deleteMany({});
  await prisma.fraudCase.deleteMany({});
  await prisma.campaignPlacement.deleteMany({});
  await prisma.adPlacement.deleteMany({});
  await prisma.campaignDailyAggregate.deleteMany({});
  await prisma.placementDailyAggregate.deleteMany({});
  await prisma.paymentWebhookRecord.deleteMany({});
  await prisma.campaignImpression.deleteMany({});
  await prisma.creativeAsset.deleteMany({});
  await prisma.moderationRecord.deleteMany({});
  await prisma.userTask.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.payoutRequest.deleteMany({});
  await prisma.fundingOrder.deleteMany({});
  await prisma.payoutMethod.deleteMany({});
  await prisma.fraudIncident.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.journalTransaction.deleteMany({});
  await prisma.ledgerTransaction.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.userPreference.deleteMany({});
  await prisma.consentHistory.deleteMany({});
  await prisma.extensionInstallation.deleteMany({});
  await prisma.userAdPreference.deleteMany({});
  await prisma.userOrganization.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  // Ensure accounts
  const accountMap = new Map();
  for (const def of Object.values(SYSTEM_ACCOUNTS)) {
    const acc = await prisma.account.upsert({
      where: { code: def.code },
      update: { name: def.name, type: def.type },
      create: {
        code: def.code,
        name: def.name,
        type: def.type,
        currency: 'INR',
      },
    });
    accountMap.set(def.code, acc.id);
  }

  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const advertiserPasswordHash = await bcrypt.hash('Advertiser@12345', 10);
  const userPasswordHash = await bcrypt.hash('User@12345', 10);

  // 1. Super Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@adearn.ai',
      passwordHash: adminPasswordHash,
      name: 'Super Administrator',
      role: 'ADMIN',
      kycTier: 'TIER_2',
      kycStatus: 'VERIFIED',
    },
  });

  // 2. Institutional Advertiser
  const advertiser = await prisma.user.create({
    data: {
      email: 'advertiser@zerodha.in',
      passwordHash: advertiserPasswordHash,
      name: 'Vikram Mehta (VP Growth)',
      role: 'ADVERTISER',
      kycTier: 'TIER_2',
      kycStatus: 'VERIFIED',
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: 'Zerodha Advisory Solutions India Pvt. Ltd.',
      gstin: '29AAACZ1234A1Z5',
      pan: 'AAACZ1234A',
      contactEmail: 'growth@zerodha.in',
      isVerified: true,
      users: {
        create: {
          userId: advertiser.id,
          role: 'OWNER',
        },
      },
    },
  });

  const initialEscrowPaise = BigInt(45000000);
  const orgWallet = await prisma.wallet.create({
    data: {
      organizationId: org.id,
      escrowPaise: initialEscrowPaise,
      availablePaise: BigInt(0),
      pendingPaise: BigInt(0),
    },
  });

  await prisma.journalTransaction.create({
    data: {
      referenceId: 'TOPUP-HDFC-90124',
      idempotencyKey: 'SEED-TOPUP-001',
      type: 'ADVERTISER_TOPUP',
      description: 'Initial Nodal Escrow Account Top-Up via HDFC RTGS',
      actorId: admin.id,
      entries: {
        create: [
          {
            accountId: accountMap.get(SYSTEM_ACCOUNTS.NODAL_BANK_ASSET.code),
            entryType: 'DEBIT',
            amountPaise: initialEscrowPaise,
          },
          {
            accountId: accountMap.get(SYSTEM_ACCOUNTS.ADVERTISER_ESCROW_LIABILITY.code),
            entryType: 'CREDIT',
            amountPaise: initialEscrowPaise,
          },
        ],
      },
    },
  });

  await prisma.ledgerTransaction.create({
    data: {
      walletId: orgWallet.id,
      referenceId: 'TOPUP-HDFC-90124',
      type: 'ADVERTISER_TOPUP',
      amountPaise: initialEscrowPaise,
      balanceAfterPaise: initialEscrowPaise,
      idempotencyKey: 'SEED-TOPUP-001',
      reason: 'Initial Nodal Escrow Account Top-Up via HDFC RTGS',
    },
  });

  // 3. User
  const user = await prisma.user.create({
    data: {
      email: 'arun@creator.in',
      passwordHash: userPasswordHash,
      name: 'Arun Kumar',
      role: 'USER',
      kycTier: 'TIER_1',
      kycStatus: 'VERIFIED',
      upiId: 'arun@okaxis',
      bankAccountNumber: '918239019234',
      bankIfsc: 'UTIB0001234',
      bankAccountName: 'Arun Kumar',
    },
  });

  await prisma.wallet.create({
    data: {
      userId: user.id,
      availablePaise: BigInt(0),
      pendingPaise: BigInt(0),
      lifetimeEarnedPaise: BigInt(0),
      lifetimePaidPaise: BigInt(0),
    },
  });

  // 4. Default Ad Placement
  await prisma.adPlacement.create({
    data: {
      key: 'EXT_POPUP_BANNER',
      name: 'Extension Popup Hero Banner',
      surfaceType: 'EXTENSION_POPUP',
      dimensions: '300x250',
      floorCpmPaise: 3000n,
      floorCpcPaise: 150n,
      minDwellSeconds: 1.0,
      status: 'ACTIVE',
      policyText: 'Standard popup banner compliant with Chrome Web Store single-purpose policy.',
    },
  });

  console.log('--- Clean Baseline Ready: Exactly 0 Fake Campaigns ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
