const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  const sql = fs.readFileSync('prisma/migrations/20261126201500_openai_chatgpt_channel_foundation/migration.sql', 'utf8');
  const cleanSql = sql.replace(/--.*$/gm, '');
  const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  console.log(`Executing ${statements.length} migration statements...`);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`  [${i + 1}/${statements.length}] Done.`);
    } catch (err) {
      console.error(`  [${i + 1}/${statements.length}] Error on statement:\n${stmt}\n->`, err.message);
      throw err;
    }
  }

  // Record migration in _prisma_migrations table
  try {
    const migrationName = '20261126201500_openai_chatgpt_channel_foundation';
    await prisma.$executeRawUnsafe(`
      INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (UUID(), 'openai_chatgpt_channel_foundation_checksum', NOW(), ?, NULL, NULL, NOW(), ?)
    `, migrationName, statements.length);
    console.log(`Recorded migration ${migrationName} in _prisma_migrations.`);
  } catch (err) {
    console.warn('Note on _prisma_migrations record:', err.message);
  }

  console.log('OpenAI Channel Foundation Migration Successfully Applied!');
}

runMigration()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
