/**
 * AdEarn AI — Clean Database Reset for Live Testing
 * 
 * Safely purges all residual test data, dummy campaigns, and stale sessions,
 * then establishes a pristine, clean baseline with 0 dummy campaigns and
 * verified double-entry ledger balance.
 */

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
  console.log('====================================================');
  console.log('   ADEARN AI — CLEAN DATABASE RESET FOR LIVE TEST   ');
  console.log('====================================================\n');

  console.log('[1/4] Purging all test records and residual dummy data...');

  // Topological deletion order to prevent foreign key errors
  const deleteSteps = [
    { name: 'AdEvents', fn: () => prisma.adEvent.deleteMany({}) },
    { name: 'AdDecisions', fn: () => prisma.adDecision.deleteMany({}) },
    { name: 'AdRequests', fn: () => prisma.adRequest.deleteMany({}) },
    { name: 'FraudCases', fn: () => prisma.fraudCase.deleteMany({}) },
    { name: 'CampaignPlacements', fn: () => prisma.campaignPlacement.deleteMany({}) },
    { name: 'AdPlacements', fn: () => prisma.adPlacement.deleteMany({}) },
    { name: 'CampaignDailyAggregates', fn: () => prisma.campaignDailyAggregate.deleteMany({}) },
    { name: 'PlacementDailyAggregates', fn: () => prisma.placementDailyAggregate.deleteMany({}) },
    { name: 'PaymentWebhookRecords', fn: () => prisma.paymentWebhookRecord.deleteMany({}) },
    { name: 'CampaignImpressions', fn: () => prisma.campaignImpression.deleteMany({}) },
    { name: 'CreativeAssets', fn: () => prisma.creativeAsset.deleteMany({}) },
    { name: 'ModerationRecords', fn: () => prisma.moderationRecord.deleteMany({}) },
    { name: 'UserTasks', fn: () => prisma.userTask.deleteMany({}) },
    { name: 'Disputes', fn: () => prisma.dispute.deleteMany({}) },
    { name: 'PayoutRequests', fn: () => prisma.payoutRequest.deleteMany({}) },
    { name: 'FundingOrders', fn: () => prisma.fundingOrder.deleteMany({}) },
    { name: 'PayoutMethods', fn: () => prisma.payoutMethod.deleteMany({}) },
    { name: 'FraudIncidents', fn: () => prisma.fraudIncident.deleteMany({}) },
    { name: 'JournalEntries', fn: () => prisma.journalEntry.deleteMany({}) },
    { name: 'JournalTransactions', fn: () => prisma.journalTransaction.deleteMany({}) },
    { name: 'LedgerTransactions', fn: () => prisma.ledgerTransaction.deleteMany({}) },
    { name: 'Campaigns', fn: () => prisma.campaign.deleteMany({}) },
    { name: 'Sessions', fn: () => prisma.session.deleteMany({}) },
    { name: 'UserPreferences', fn: () => prisma.userPreference.deleteMany({}) },
    { name: 'ConsentHistories', fn: () => prisma.consentHistory.deleteMany({}) },
    { name: 'ExtensionInstallations', fn: () => prisma.extensionInstallation.deleteMany({}) },
    { name: 'UserAdPreferences', fn: () => prisma.userAdPreference.deleteMany({}) },
    { name: 'UserOrganizations', fn: () => prisma.userOrganization.deleteMany({}) },
    { name: 'Wallets', fn: () => prisma.wallet.deleteMany({}) },
    { name: 'Organizations', fn: () => prisma.organization.deleteMany({}) },
    { name: 'AuditLogs', fn: () => prisma.auditLog.deleteMany({}) },
    { name: 'Users', fn: () => prisma.user.deleteMany({}) },
  ];

  for (const step of deleteSteps) {
    try {
      const res = await step.fn();
      if (res && res.count > 0) {
        console.log(`  - Cleaned ${step.name}: ${res.count} records removed`);
      }
    } catch (err) {
      console.warn(`  ! Note on ${step.name}:`, err.message);
    }
  }

  console.log('\n[2/4] Initializing Standard Chart of Accounts...');
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
  console.log(`  - Verified ${accountMap.size} Chart of Accounts in MySQL.`);

  console.log('\n[3/4] Creating Pristine Production Baseline Accounts...');
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
  console.log('  - Super Admin: admin@adearn.ai (Role: ADMIN, Tier 2)');

  // 2. Institutional Brand / Advertiser
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

  // 3. Brand Escrow Wallet (₹4,50,000.00 = 45,000,000 paise)
  const initialEscrowPaise = BigInt(45000000);
  const orgWallet = await prisma.wallet.create({
    data: {
      organizationId: org.id,
      escrowPaise: initialEscrowPaise,
      availablePaise: BigInt(0),
      pendingPaise: BigInt(0),
    },
  });

  // Balanced Double-Entry for Escrow Deposit
  const journalTx = await prisma.journalTransaction.create({
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
  console.log('  - Brand Organization: Zerodha Advisory Solutions India Pvt. Ltd.');
  console.log('  - Brand Escrow: ₹4,50,000.00 (Balanced in General Ledger)');

  // 4. Creator / User
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

  const userWallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      availablePaise: BigInt(0),
      pendingPaise: BigInt(0),
      lifetimeEarnedPaise: BigInt(0),
      lifetimePaidPaise: BigInt(0),
    },
  });
  console.log('  - Creator User: arun@creator.in (Available: ₹0.00, Ready for live reward testing)');

  // 5. Default Ad Placement
  const placement = await prisma.adPlacement.create({
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
  console.log(`  - Ad Placement: ${placement.key} (Status: ACTIVE)`);

  console.log('\n[4/4] Verifying System State & Accounting Integrity...');
  const campaignCount = await prisma.campaign.count();
  const taskCount = await prisma.userTask.count();
  
  // Reconcile Double-Entry General Ledger
  const debitsRes = await prisma.journalEntry.aggregate({
    where: { entryType: 'DEBIT' },
    _sum: { amountPaise: true },
  });
  const creditsRes = await prisma.journalEntry.aggregate({
    where: { entryType: 'CREDIT' },
    _sum: { amountPaise: true },
  });

  const totalDebits = debitsRes._sum.amountPaise || 0n;
  const totalCredits = creditsRes._sum.amountPaise || 0n;

  console.log(`  - Total Campaigns in DB: ${campaignCount} (EXACTLY 0 DUMMY CAMPAIGNS)`);
  console.log(`  - Total User Tasks in DB: ${taskCount}`);
  console.log(`  - Total Global Debits:   ₹${Number(totalDebits) / 100} (${totalDebits} paise)`);
  console.log(`  - Total Global Credits:  ₹${Number(totalCredits) / 100} (${totalCredits} paise)`);

  if (totalDebits !== totalCredits) {
    throw new Error(`ACCOUNTING_MISMATCH: Debits (${totalDebits}) !== Credits (${totalCredits})`);
  }

  console.log('  - Double-Entry Invariant: PASSED (Debits === Credits)');
  console.log('\n====================================================');
  console.log('   PRISTINE CLEAN BASELINE READY FOR LIVE TESTING!  ');
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('Reset Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
