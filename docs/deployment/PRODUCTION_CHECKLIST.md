# Pre-Flight Production Readiness Checklist — AdEarn AI

Before cutting over production traffic to AdEarn AI, verify that every item on this checklist is marked **PASSED**.

---

## 1. Security & Credentials
- [ ] Root SSH login disabled; password authentication disabled; key-based SSH only.
- [ ] UFW firewall active; only ports 22, 80, and 443 are allowed incoming.
- [ ] Port 3306 (MySQL) and Port 6379 (Redis) are NOT exposed to the public internet.
- [ ] All default development passwords (`12345`, `Admin@12345`) replaced with high-entropy cryptographic secrets.
- [ ] `JWT_SECRET`, `COOKIE_SECRET`, and `AUDIT_HMAC_SECRET` set via secure environment variables.
- [ ] No `.env` files or secret keys committed to Git repositories.

---

## 2. Infrastructure & Containers
- [ ] Docker and Docker Compose v2 installed on supported Ubuntu 22.04/24.04 LTS.
- [ ] All four Docker containers (`app`, `db`, `redis`, `nginx`) running and reporting `healthy`.
- [ ] Nginx rate limiting active on `/api/auth/` (5r/s) and `/api/` (15r/s).
- [ ] SSL certificate active and valid with A+ rating on SSL Labs; auto-renewal cron configured.
- [ ] Application and database automatically restart on server reboot (`restart: always`).

---

## 3. Database & Financial Accounting
- [ ] MySQL character set verified as `utf8mb4` with `utf8mb4_unicode_ci` collation.
- [ ] Prisma database migrations applied successfully with zero schema divergence.
- [ ] Authoritative financial values stored strictly as integer minor units (`paise`).
- [ ] Append-only double-entry ledger verified: every credit has a corresponding debit or source liability.
- [ ] Overdraft protection verified: available balance cannot become negative under concurrent withdrawal load.
- [ ] Daily automated backup script tested with SHA-256 checksum verification and offsite sync.

---

## 4. Business Logic & Compliance
- [ ] India advertising disclosures active: all ads explicitly labelled `#Sponsored` per ASCI guidelines.
- [ ] Kinematic telemetry anti-bot engine verified: tasks require minimum dwell time and human cursor interaction.
- [ ] Escrow balance check enforced: campaigns cannot be launched without verified advertiser funding.
- [ ] Dual-approval workflow active for high-value administrative financial actions.
- [ ] Immutable audit log engine active with SHA-256 tamper-evident integrity hashes.
