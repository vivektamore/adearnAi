const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding AdEarn AI Database ---');

  // Clean existing seed if any
  await prisma.auditLog.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.payoutRequest.deleteMany({});
  await prisma.userTask.deleteMany({});
  await prisma.creativeAsset.deleteMany({});
  await prisma.moderationRecord.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.ledgerTransaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.userOrganization.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.user.deleteMany({});

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
  console.log('Created Admin:', admin.email);

  // 2. Institutional Advertiser & Organization
  const advertiserUser = await prisma.user.create({
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
          userId: advertiserUser.id,
          role: 'OWNER',
        },
      },
    },
  });

  // Organization Wallet with ₹4,50,000.00 escrow (45,000,000 paise)
  const orgWallet = await prisma.wallet.create({
    data: {
      organizationId: org.id,
      escrowPaise: BigInt(45000000), // ₹4,50,000.00
      availablePaise: BigInt(0),
      pendingPaise: BigInt(0),
    },
  });

  await prisma.ledgerTransaction.create({
    data: {
      walletId: orgWallet.id,
      referenceId: 'TOPUP-HDFC-90124',
      type: 'ADVERTISER_TOPUP',
      amountPaise: BigInt(45000000),
      balanceAfterPaise: BigInt(45000000),
      idempotencyKey: 'SEED-TOPUP-001',
      reason: 'Initial Nodal Escrow Account Top-Up via HDFC RTGS',
    },
  });
  console.log('Created Advertiser Organization & Escrow Wallet:', org.name);

  // 3. User / Digital Creator (Arun Kumar matching Stitch Screen 01)
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

  // User Wallet: Available ₹245.00 (24,500 paise), Pending ₹68.00 (6,800 paise), Total Earned: ₹1,420.00
  const userWallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      availablePaise: BigInt(24500),
      pendingPaise: BigInt(6800),
      lifetimeEarnedPaise: BigInt(142000),
      lifetimePaidPaise: BigInt(110700),
    },
  });

  await prisma.ledgerTransaction.create({
    data: {
      walletId: userWallet.id,
      referenceId: 'REW-CAMP-ZR-091',
      type: 'CREDIT_REWARD',
      amountPaise: BigInt(4000), // ₹40.00
      balanceAfterPaise: BigInt(24500),
      idempotencyKey: 'SEED-USER-TX-001',
      reason: 'Investment Readiness Questionnaire completion reward',
    },
  });
  console.log('Created User & Wallet:', user.name, user.email);

  // 4. Create Active Campaigns
  const campaign1 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      title: 'Investment Readiness Questionnaire 2026',
      description: 'Comprehensive 12-question diagnostic evaluating risk appetite and portfolio diversification preference in accordance with SEBI investor guidelines.',
      category: 'FinTech',
      actionType: 'SURVEY',
      status: 'ACTIVE',
      targetUrl: 'https://zerodha.com/investor-readiness-survey',
      requirementsJson: JSON.stringify({
        minDwellSeconds: 30,
        questionsCount: 12,
        targetAudience: 'Tier 1 & 2 cities, age 21-45',
      }),
      budgetAllocatedPaise: BigInt(15000000), // ₹1,50,000.00
      budgetSpentPaise: BigInt(11245000),     // ₹1,12,450.00
      costPerOutcomePaise: BigInt(4000),      // ₹40.00
      targetOutcomes: 3500,
      verifiedOutcomes: 2811,
      ivtRatePercent: 0.64,
      flightStart: new Date('2026-10-01'),
      flightEnd: new Date('2026-10-31'),
      creativeAssets: {
        create: {
          assetUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
          assetType: 'IMAGE',
          fileSizeBytes: 248000,
          status: 'APPROVED',
        },
      },
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      title: 'SprintFlow SaaS Workflow Trial',
      description: 'Hands-on interactive sandbox trial of SprintFlow automated kanban analytics with team velocity telemetry.',
      category: 'Enterprise SaaS',
      actionType: 'SANDBOX_TRIAL',
      status: 'ACTIVE',
      targetUrl: 'https://sprintflow.io/sandbox',
      requirementsJson: JSON.stringify({
        minDwellSeconds: 45,
        requiredSandboxAction: 'create_workflow',
      }),
      budgetAllocatedPaise: BigInt(10000000), // ₹1,00,000.00
      budgetSpentPaise: BigInt(8600000),      // ₹86,000.00
      costPerOutcomePaise: BigInt(5000),      // ₹50.00
      targetOutcomes: 2000,
      verifiedOutcomes: 1720,
      ivtRatePercent: 0.82,
      flightStart: new Date('2026-10-05'),
      flightEnd: new Date('2026-11-05'),
      creativeAssets: {
        create: {
          assetUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
          assetType: 'IMAGE',
          fileSizeBytes: 312000,
          status: 'APPROVED',
        },
      },
    },
  });

  const campaign3 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      title: 'FinTech ESG Sustainability Survey',
      description: 'Public awareness sentiment survey measuring consumer attitudes toward green bond allocations and sustainable banking in India.',
      category: 'Sustainability',
      actionType: 'SENTIMENT_POLL',
      status: 'ACTIVE',
      targetUrl: 'https://zerodha.com/esg-pulse-2026',
      requirementsJson: JSON.stringify({
        minDwellSeconds: 25,
        questionsCount: 8,
      }),
      budgetAllocatedPaise: BigInt(8000000), // ₹80,000.00
      budgetSpentPaise: BigInt(4550000),     // ₹45,500.00
      costPerOutcomePaise: BigInt(3500),     // ₹35.00
      targetOutcomes: 2200,
      verifiedOutcomes: 1300,
      ivtRatePercent: 0.55,
      flightStart: new Date('2026-10-10'),
      flightEnd: new Date('2026-11-10'),
      creativeAssets: {
        create: {
          assetUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
          assetType: 'IMAGE',
          fileSizeBytes: 180000,
          status: 'APPROVED',
        },
      },
    },
  });

  console.log('Created Approved Campaigns');

  // 5. Seed an active user task
  await prisma.userTask.create({
    data: {
      campaignId: campaign1.id,
      userId: user.id,
      sessionToken: 'SESSION-DEMO-ARUN-ZR091',
      status: 'VALIDATED',
      rewardPaise: BigInt(4000),
      anomalyScore: 0.04,
      fraudVerdict: 'CLEARED',
      telemetryDigest: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      submittedAt: new Date(Date.now() - 3600000),
      validatedAt: new Date(),
    },
  });

  // 6. Seed a completed payout request for history
  await prisma.payoutRequest.create({
    data: {
      userId: user.id,
      amountPaise: BigInt(50000), // ₹500.00
      method: 'UPI',
      destinationAddress: 'arun@okaxis',
      maskedAddress: 'ar**@okaxis',
      status: 'CLEARED',
      utrNumber: 'UTR-NPCI-202610168923412',
      idempotencyKey: 'SEED-PAYOUT-001',
      approvedByUserId: admin.id,
      createdAt: new Date('2026-10-14'),
      clearedAt: new Date('2026-10-14T15:30:00Z'),
    },
  });

  console.log('--- Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
