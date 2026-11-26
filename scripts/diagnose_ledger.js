const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function trace() {
  console.log('=== ACCOUNTS ===');
  const accounts = await prisma.account.findMany({ include: { journalEntries: true } });
  for (const a of accounts) {
    let dr = 0n, cr = 0n;
    for (const e of a.journalEntries) {
      if (e.entryType === 'DEBIT') dr += e.amountPaise;
      if (e.entryType === 'CREDIT') cr += e.amountPaise;
    }
    console.log(a.code, a.type, 'Total entries:', a.journalEntries.length, 'Dr:', dr, 'Cr:', cr, 'Net (Cr-Dr):', cr - dr);
  }

  console.log('\n=== WALLETS ===');
  const wallets = await prisma.wallet.findMany({ include: { user: true, organization: true } });
  for (const w of wallets) {
    console.log('Wallet ID:', w.id, w.user ? 'User: ' + w.user.email + ' (' + w.user.role + ')' : 'Org: ' + w.organization?.name,
      'Available:', w.availablePaise, 'Escrow:', w.escrowPaise, 'LifetimeEarned:', w.lifetimeEarnedPaise, 'LifetimePaid:', w.lifetimePaidPaise);
  }

  console.log('\n=== CAMPAIGNS ===');
  const campaigns = await prisma.campaign.findMany();
  for (const c of campaigns) {
    console.log('Campaign:', c.id, c.title, 'Status:', c.status, 'Allocated:', c.budgetAllocatedPaise, 'Spent:', c.budgetSpentPaise, 'Impressions:', c.impressionsCount);
  }

  console.log('\n=== JOURNAL TRANSACTIONS ===');
  const jtxs = await prisma.journalTransaction.findMany({ include: { entries: { include: { account: true } } }, orderBy: { postedAt: 'asc' } });
  console.log('Total transactions:', jtxs.length);
  for (const tx of jtxs) {
    console.log(`[${tx.type}] ${tx.idempotencyKey} | Ref: ${tx.referenceId} | ${tx.description}`);
    for (const e of tx.entries) {
      console.log(`    ${e.entryType} ${e.account.code}: ${e.amountPaise} paise`);
    }
  }

  console.log('\n=== FUNDING ORDERS ===');
  const fundingOrders = await prisma.fundingOrder.findMany();
  for (const fo of fundingOrders) {
    console.log('Funding Order:', fo.id, fo.status, 'Amount:', fo.amountPaise, 'Total:', fo.totalPaise, 'UTR:', fo.utrNumber);
  }

  console.log('\n=== PAYOUT REQUESTS ===');
  const payouts = await prisma.payoutRequest.findMany();
  for (const p of payouts) {
    console.log('Payout:', p.id, p.status, 'Amount:', p.amountPaise, 'UTR:', p.utrNumber, 'User:', p.userId);
  }

  console.log('\n=== USER TASKS (CPO) ===');
  const tasks = await prisma.userTask.findMany();
  for (const t of tasks) {
    console.log('Task:', t.id, t.status, 'Reward:', t.rewardPaise, 'User:', t.userId, 'Campaign:', t.campaignId);
  }

  console.log('\n=== CAMPAIGN IMPRESSIONS ===');
  const impressions = await prisma.campaignImpression.findMany();
  console.log('Total Campaign Impressions:', impressions.length);
  let totalImpressionReward = 0n;
  let totalImpressionCharge = 0n;
  for (const imp of impressions) {
    totalImpressionReward += imp.rewardPaise;
    totalImpressionCharge += imp.chargePaise;
  }
  console.log(`Total Impression Charges: ${totalImpressionCharge} paise, Total Rewards: ${totalImpressionReward} paise`);
}

trace()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
