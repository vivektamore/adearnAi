const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.count();
  const orgs = await prisma.organization.count();
  const campaigns = await prisma.campaign.count();
  const wallets = await prisma.wallet.count();
  const ledger = await prisma.ledgerTransaction.count();
  const tasks = await prisma.userTask.count();
  const payouts = await prisma.payoutRequest.count();
  const moderation = await prisma.moderationRecord.count();
  const fraud = await prisma.fraudIncident.count();
  const audit = await prisma.auditLog.count();
  console.log(JSON.stringify({ users, orgs, campaigns, wallets, ledger, tasks, payouts, moderation, fraud, audit }, null, 2));
}

check()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
