# Release Rollback & Disaster Recovery Runbook — AdEarn AI
## Emergency Reversion, Safe State Recovery, and Forward-Fix Guidelines

When a production deployment causes severe regressions, financial ledger errors, or application service unavailability, follow this deterministic rollback protocol.

---

## 1. Automated Fast Rollback (`scripts/rollback.sh`)

AdEarn AI packages an automated rollback utility that reverts to the previous Docker image in seconds.

### Case A: Application Code Rollback Only
When the defect is purely within the application code or frontend assets and database schema changes are backward-compatible:

```bash
cd /home/adearn/app
bash ./scripts/rollback.sh
```

**Actions executed:**
1. Verifies existence of `adearn-app:previous` container image.
2. Re-tags `adearn-app:previous` as `adearn-app:latest`.
3. Performs rolling container restart (`docker compose up -d --no-deps app`).
4. Probes `/api/health` to confirm the restored build is healthy.
5. Reloads Nginx reverse proxy.

---

## 2. Full Rollback with Database State Restoration

### Case B: Critical Data Corruption or Schema Incompatibility
When an erroneous deployment corrupted live ledger state or applied breaking changes:

```bash
cd /home/adearn/app

# Restore previous image and latest pre-deployment database snapshot:
bash ./scripts/rollback.sh --with-db-restore

# Or restore an explicit snapshot:
bash ./scripts/rollback.sh --with-db-restore ./backups/pre_deploy/adearn_ai_backup_20261018_210000.sql.gz
```

**Actions executed:**
1. Tags previous Docker container image.
2. Prompts confirmation or safely replaces database from pre-deployment snapshot.
3. Restores application container.
4. Validates `/api/health` probe.
5. Reloads Nginx reverse proxy.

---

## 3. Database Migration Rollback Strategy

AdEarn AI adheres to the **Expand-Contract (Parallel Run) Migration Pattern**:

1. **Non-Destructive Additions:** All database migrations must be additive (new tables, nullable columns, or indexed foreign keys).
2. **Never Drop Live Columns in Lockstep:** Never delete or rename columns simultaneously with code changes. 
3. **Forward-Fix vs Reversal:**
   - If an additive migration was applied (e.g. adding `PayoutMethod`), the previous application version will simply ignore the new table or column without errors. Reverting database schema is **unnecessary**.
   - If corrupt data records were created, execute an explicit compensating transaction (`PAYOUT_REVERSAL`, `DISPUTE_ADJUSTMENT`) rather than manual SQL deletions.

---

## 4. Post-Rollback Verification Checklist

Immediately after rollback completion, verify:

- [ ] `/api/health` returns HTTP 200 `{"status": "UP"}`.
- [ ] User login and session issuance (`/login`).
- [ ] Creator portal route access (`/dashboard`, `/tasks`, `/wallet`).
- [ ] Advertiser portal route access (`/advertiser`, `/advertiser/campaigns`).
- [ ] Admin portal route access (`/admin`).
- [ ] Review live application logs:
  ```bash
  docker compose logs -f --tail=50 app
  docker compose logs -f --tail=50 nginx
  ```
- [ ] Notify team in incident response channel with rollback summary and root cause investigation plan.
