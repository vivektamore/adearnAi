# Production Database Migrations & Data Safety Guide — AdEarn AI
## Safe Prisma Schema Migrations, Invariant Verification, and Disaster Recovery for MySQL 8.0

This runbook establishes strict procedures for applying database migrations to production and staging environments without downtime or data destruction.

---

## 1. Core Principles & Data Safety Invariants

1. **Zero Data Loss:** Never drop, truncate, or reset existing tables in production.
2. **Integer Paise Guarantee:** All financial amounts (`balancePaise`, `lockedPaise`, `allocatedPaise`, `lifetimeEarningsPaise`, `dailyCapPaise`) must strictly remain `BigInt` minor units (integer paise).
3. **No Automatic Dev Seeds:** Never execute `scripts/seed.js` automatically during production startup or migration.
4. **Mandatory Pre-Migration Snapshot:** Always create a verifiable `mysqldump` backup before applying any schema modification.

---

## 2. Pre-Migration Checklist

Before running any migration on a production or staging host:

```bash
# 1. Verify you are in the correct environment (do not accidentally point to production during tests)
echo "Target DATABASE_URL host:"
grep DATABASE_URL .env | sed 's/:.*@/@/'

# 2. Verify Docker DB container is healthy
docker compose ps db

# 3. Create a safety snapshot of the database
bash ./scripts/backup_db.sh ./backups/pre_migration
```

Verify that the generated `.sql.gz` snapshot file exists and is non-zero size before proceeding.

---

## 3. Production Migration Procedure

In production, run the non-destructive schema synchronization using an ephemeral container:

```bash
# Apply Prisma schema updates to MySQL without clearing data
docker compose run --rm app npx prisma db push --skip-generate
```

### Why `prisma db push --skip-generate`?
- Prisma client generation (`prisma generate`) is already completed during the Docker image build stage.
- `db push` ensures that new models (such as `PayoutMethod` or new indexing) are created in MySQL without destroying existing user records, ledger balances, or campaign data.
- If a destructive change is detected (e.g., column drop), Prisma will halt and warn before making any changes.

---

## 4. Initializing a New / Empty Database

If deploying to a completely clean, empty MySQL instance:

```bash
# 1. Start MySQL service
docker compose up -d db

# 2. Wait until healthy
docker compose ps db

# 3. Initialize schema structure
docker compose run --rm app npx prisma db push --skip-generate

# 4. Bootstrap Initial Admin User (Controlled Seed)
# Note: In production, modify scripts/seed.js or insert authoritative credentials directly.
docker compose run --rm app node scripts/seed.js

# 5. Verify database integrity
docker compose run --rm app node scripts/verify_db.js
```

---

## 5. Post-Migration Verification

Run automated database verification queries:

```bash
# Check table count and row presence
docker compose exec db mysql -u adearn_user -p"$(grep DB_PASSWORD .env | cut -d '=' -f2)" -e "
  SELECT table_name, table_rows 
  FROM information_schema.tables 
  WHERE table_schema = 'adearn_ai' 
  ORDER BY table_name;
"
```

Expected tables:
- `User`
- `CreatorProfile`
- `AdvertiserProfile`
- `Organization`
- `Campaign`
- `CampaignCreative`
- `CampaignEscrowLock`
- `TaskSession`
- `TaskEngagementLog`
- `UserReward`
- `LedgerTransaction`
- `PayoutMethod`
- `PayoutRequest`
- `FundingOrder`
- `AuditLog`
- `FraudDetectionEvent`

---

## 6. Migration Rollback & Emergency Forward-Recovery

If a schema migration introduces an unexpected defect:

### Scenario A: Additive Migration (New table or nullable column added)
No rollback required. Simply deploy a corrected application container with `./scripts/rollback.sh`.

### Scenario B: Breaking Schema Conflict
Restore the pre-migration database snapshot:

```bash
# Locate the pre-migration snapshot:
LATEST_BACKUP=$(ls -t ./backups/pre_migration/*.sql.gz | head -n 1)

# Execute restoration:
bash ./scripts/restore_db.sh "${LATEST_BACKUP}" --force

# Roll back application container:
bash ./scripts/rollback.sh
```
