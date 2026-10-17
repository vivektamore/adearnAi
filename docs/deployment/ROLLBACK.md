# Release Rollback Procedure — AdEarn AI

When a production release causes severe unexpected errors, regressions, or service degradation, follow this emergency rollback procedure.

---

## 1. Fast Container Rollback (Previous Docker Image)

If the release only involved code changes without breaking database migrations:

```bash
cd /home/adearn/app

# Revert git branch to previous stable release tag
git checkout v1.0.0

# Rebuild and restart application container
docker compose build app
docker compose up -d --no-deps app

# Verify container health
docker compose ps app
```

---

## 2. Database Migration Rollback Rules

AdEarn AI strictly follows **Non-Destructive Expand-Contract Migration Architecture**:

- **Never write destructive down-migrations** that drop columns or delete tables in a live financial system.
- If a new column was added in the failed release, keep the column (with `NULL` default) and deploy the prior application code. The previous version ignores unused columns safely.
- If an erroneous data mutation occurred, apply a forward-fixing compensating migration or restore from the pre-release backup snapshot.

---

## 3. Pre-Release Snapshot Protocol

Before applying any production deployment or migration:

```bash
# Take immediate snapshot
/home/adearn/scripts/backup_db.sh

# Tag git commit
git tag -a "pre-deploy-$(date +%Y%m%d%H%M)" -m "Pre-deployment stable state"
```
