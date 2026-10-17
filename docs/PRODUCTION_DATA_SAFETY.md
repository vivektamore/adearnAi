# Production Data Safety & Environment Separation Policy — AdEarn AI

**Classification:** Critical Financial Systems Policy  
**Scope:** MySQL 8.0 Relational Database, Ledger Subsystem, Backup Procedures

---

## 1. Core Principles of Production Data Safety

1. **Strict Non-Destructive Migrations**:
   - `prisma migrate reset`, `DROP DATABASE`, and `TRUNCATE TABLE` commands are strictly forbidden in production, staging, and shared testing environments.
   - All database evolution must follow the **Non-Destructive Expand-Contract Pattern**. Schema additions must be backwards-compatible (nullable columns or sensible default values).
2. **Preservation of Genuine Relational Records**:
   - Removing dummy values from the user interface must be achieved by updating frontend rendering and backend queries, **never by wiping production tables**.
   - If an existing record's provenance is uncertain, the record must be preserved and flagged for human compliance review.
3. **Mandatory Pre-Migration Snapshots**:
   - Before executing schema modifications or deployment scripts on production servers, an automated, single-transaction database dump must be taken:
     ```bash
     /home/adearn/scripts/backup_db.sh
     ```
   - Backups must generate SHA-256 integrity checksums and replicate to offsite encrypted object storage.

---

## 2. Environment Separation & Data Isolation Policy

| Environment | Database Target | Financial Payment Provider | Allowed Test Data Behavior |
|---|---|---|---|
| **Development** (`NODE_ENV=development`) | Local MySQL (`localhost:3306/adearn_ai`) | Sandbox Adapter (`SandboxPayoutAdapter`) | Explicit seeding permitted via `node scripts/seed.js`. Seed scripts must never be triggered automatically. |
| **Automated Tests** (`NODE_ENV=test`) | Dedicated Test DB / Isolated Fixtures | Sandbox Adapter (Mock UTR Generation) | Tests create ephemeral records with unique timestamps and cleanly prune **only** the records created during that run. |
| **Staging** (`NODE_ENV=staging`) | Staging Cloud RDS / Private MySQL | Sandbox / Banking Test Environments | Authoritative test data clearly marked as simulated. Nodal escrow balances verified against sandbox accounts. |
| **Production** (`NODE_ENV=production`) | Dedicated Private MySQL 8.0 Cluster | Live Provider (Cashfree / RazorpayX) | **Zero test credentials or dummy data.** Hardcoded fallbacks strictly removed. Failed API requests display honest error states. |

---

## 3. Statutory Data Retention & DPDP Act Compliance

Under Indian financial compliance guidelines (RBI Nodal Account Regulations, Prevention of Money Laundering Act, and Income Tax Act):

- **7-Year Mandatory Financial Retention**: All rows in `ledger_transactions` and `payout_requests` must be retained in immutable storage for a minimum of 7 statutory fiscal years.
- **Right to Erasure (DPDP Act, 2023)**:
  - When a user exercises their right to account deletion, personal identifiers (`email`, `name`, `upiId`, `bankAccountNumber`) are permanently scrubbed or pseudonymized.
  - Relational transaction records are detached from personal identity but retained in anonymized format to preserve double-entry balance reconciliation invariants.
