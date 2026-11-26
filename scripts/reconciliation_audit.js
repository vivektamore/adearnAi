const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  console.log('================================================================');
  console.log('ADEARN AI DETAILED FINANCIAL RECONCILIATION AUDIT');
  console.log('================================================================\n');

  // 1. Chart of Accounts Trial Balance
  console.log('--- 1. GENERAL LEDGER TRIAL BALANCE ---');
  const accounts = await prisma.account.findMany({
    include: { journalEntries: true },
    orderBy: { code: 'asc' }
  });

  let totalDebits = 0n;
  let totalCredits = 0n;

  for (const acc of accounts) {
    let dr = 0n;
    let cr = 0n;
    for (const e of acc.journalEntries) {
      if (e.entryType === 'DEBIT') dr += e.amountPaise;
      if (e.entryType === 'CREDIT') cr += e.amountPaise;
    }
    totalDebits += dr;
    totalCredits += cr;
    const net = cr - dr; // For liabilities/revenues, Cr > Dr is positive; for assets Dr > Cr is positive
    console.log(`${acc.code.padEnd(35)} | Type: ${acc.type.padEnd(9)} | Entries: ${String(acc.journalEntries.length).padStart(3)} | Dr: ₹${(Number(dr)/100).toFixed(2).padStart(10)} | Cr: ₹${(Number(cr)/100).toFixed(2).padStart(10)} | Net(Cr-Dr): ₹${(Number(net)/100).toFixed(2).padStart(10)}`);
  }
  console.log('------------------------------------------------------------------------------------------------------------------------');
  console.log(`TOTAL GENERAL LEDGER: Debits: ₹${(Number(totalDebits)/100).toFixed(2)} | Credits: ₹${(Number(totalCredits)/100).toFixed(2)} | Balance Difference: ₹${(Number(totalDebits - totalCredits)/100).toFixed(2)}\n`);

  // 2. Wallets Sub-ledger
  console.log('--- 2. WALLET SUB-LEDGER BALANCES ---');
  const wallets = await prisma.wallet.findMany({
    include: { user: true, organization: true },
    orderBy: { createdAt: 'asc' }
  });

  let totalCreatorAvailable = 0n;
  let totalCreatorPending = 0n;
  let totalAdvertiserEscrow = 0n;

  for (const w of wallets) {
    const owner = w.user ? `${w.user.name} <${w.user.email}> (${w.user.role})` : `Org: ${w.organization?.name}`;
    console.log(`Wallet ${w.id.padEnd(28)} | ${owner.padEnd(50)} | Avail: ₹${(Number(w.availablePaise)/100).toFixed(2).padStart(8)} | Pending: ₹${(Number(w.pendingPaise)/100).toFixed(2).padStart(8)} | Escrow: ₹${(Number(w.escrowPaise)/100).toFixed(2).padStart(10)}`);
    if (w.user?.role === 'USER') {
      totalCreatorAvailable += w.availablePaise;
      totalCreatorPending += w.pendingPaise;
    }
    if (w.organization || w.escrowPaise > 0n) {
      totalAdvertiserEscrow += w.escrowPaise;
    }
  }
  console.log('------------------------------------------------------------------------------------------------------------------------');
  console.log(`Sub-Ledger Creator Available: ₹${(Number(totalCreatorAvailable)/100).toFixed(2)} | Creator Pending: ₹${(Number(totalCreatorPending)/100).toFixed(2)} | Advertiser Escrow: ₹${(Number(totalAdvertiserEscrow)/100).toFixed(2)}\n`);

  // 3. Trace All Entries for 2030 (Creator Payables)
  console.log('--- 3. DETAILED TRANSACTION AUDIT: 2030_CREATOR_PAYABLE_LIABILITY ---');
  const acc2030 = accounts.find(a => a.code === '2030_CREATOR_PAYABLE_LIABILITY');
  if (acc2030) {
    const entries2030 = await prisma.journalEntry.findMany({
      where: { accountId: acc2030.id },
      include: { journalTransaction: true },
      orderBy: { createdAt: 'asc' }
    });

    let runningCrMinusDr = 0n;
    for (const [idx, e] of entries2030.entries()) {
      const delta = e.entryType === 'CREDIT' ? e.amountPaise : -e.amountPaise;
      runningCrMinusDr += delta;
      console.log(`[${String(idx + 1).padStart(2)}] ${e.createdAt.toISOString()} | ${e.entryType.padEnd(6)} ₹${(Number(e.amountPaise)/100).toFixed(2).padStart(8)} | Running Net: ₹${(Number(runningCrMinusDr)/100).toFixed(2).padStart(8)} | Type: ${e.journalTransaction.type.padEnd(25)} | Ref: ${e.journalTransaction.referenceId.padEnd(35)} | ${e.journalTransaction.description}`);
    }
    console.log(`Closing Net Balance (Cr - Dr) for 2030: ₹${(Number(runningCrMinusDr)/100).toFixed(2)}\n`);
  }

  // 4. Trace All Entries for 2010 (Advertiser Escrow Liability) & 2020 (Campaign Reserve)
  console.log('--- 4. DETAILED TRANSACTION AUDIT: 2010 & 2020 ---');
  const acc2010 = accounts.find(a => a.code === '2010_ADVERTISER_ESCROW_LIABILITY');
  const acc2020 = accounts.find(a => a.code === '2020_CAMPAIGN_RESERVE_LIABILITY');

  const entries2010 = await prisma.journalEntry.findMany({
    where: { accountId: acc2010?.id },
    include: { journalTransaction: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`2010 Entries Count: ${entries2010.length}`);
  for (const e of entries2010) {
    console.log(`  2010: ${e.entryType} ₹${(Number(e.amountPaise)/100).toFixed(2)} | Tx: ${e.journalTransaction.type} | Ref: ${e.journalTransaction.referenceId} | Desc: ${e.journalTransaction.description}`);
  }

  const entries2020 = await prisma.journalEntry.findMany({
    where: { accountId: acc2020?.id },
    include: { journalTransaction: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`\n2020 Entries Count: ${entries2020.length}`);
  for (const e of entries2020) {
    console.log(`  2020: ${e.entryType} ₹${(Number(e.amountPaise)/100).toFixed(2)} | Tx: ${e.journalTransaction.type} | Ref: ${e.journalTransaction.referenceId} | Desc: ${e.journalTransaction.description}`);
  }

  // 5. Campaigns per-campaign breakdown
  console.log('\n--- 5. CAMPAIGNS BREAKDOWN ---');
  const campaigns = await prisma.campaign.findMany({
    include: { organization: true },
    orderBy: { createdAt: 'asc' }
  });

  for (const c of campaigns) {
    console.log(`Campaign: ${c.id} | "${c.title}" | Status: ${c.status} | Model: ${c.pricingModel}`);
    console.log(`  Allocated: ₹${(Number(c.budgetAllocatedPaise)/100).toFixed(2)} | Spent: ₹${(Number(c.budgetSpentPaise)/100).toFixed(2)} | Remaining: ₹${(Number(c.budgetAllocatedPaise - c.budgetSpentPaise)/100).toFixed(2)} | Impressions: ${c.impressionsCount}`);
  }
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
