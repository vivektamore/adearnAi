# Role-Based Access Control (RBAC) Matrix — AdEarn AI (Authoritative Specification)

AdEarn AI enforces strict least-privilege server-side authorization through a 3-tier system role hierarchy (`USER`, `ADVERTISER`, `ADMIN`) coupled with organization tenancy isolation via `UserOrganization`.

---

## 1. System Role Hierarchy

1. **`USER` (Creator / Consumer)**:
   - Discovers sponsored campaigns on `/feed`.
   - Completes interactive tasks with kinematic attention telemetry verification.
   - Accumulates verified rewards in personal wallet (`Wallet.userId`).
   - Initiates voluntary payouts to masked UPI IDs / Indian Bank Accounts.
   - Manages DPDP Act privacy consents and personal data export requests.
2. **`ADVERTISER` (Enterprise Brand / Agency Partner)**:
   - Manages tenant organization (`Organization.id`).
   - Creates and funds advertising campaigns from unreserved nodal escrow.
   - Inspects live telemetry, dwell distributions, and conversion attribution.
   - Tops up escrow balance and downloads GST tax invoices (18% GST).
3. **`ADMIN` (Platform Operations & Compliance Desk)**:
   - Superintends platform health and operations control room (`/admin`).
   - Moderates submitted campaigns (Approve / Reject with reason / Request changes).
   - Forensic inspection of kinematic bot anomalies and fraud quarantine actions.
   - Dual-approves and dispatches payout clearing batches.
   - Inspects HMAC-SHA256 tamper-evident audit logs and unit economics.

---

## 2. Granular Permissions Matrix

| Capability / API Route | User (`USER`) | Advertiser (`ADVERTISER`) | Admin (`ADMIN`) | Enforcement Layer |
|---|:---:|:---:|:---:|---|
| **User Application Features** | | | | |
| Browse Feed & Campaign Detail (`GET /api/campaigns`) | ✅ | ✅ | ✅ | Public / Authenticated |
| Initiate Task Session (`POST /api/tasks/start`) | ✅ | ❌ | ✅ | `requireAuth(['USER', 'ADMIN'])` |
| Submit Task Telemetry (`POST /api/tasks/submit`) | ✅ | ❌ | ✅ | `requireAuth(['USER', 'ADMIN'])` |
| View Personal Wallet (`GET /api/wallet`) | ✅ (Own) | ❌ | ✅ (All) | Scoped to `auth.session.userId` |
| Request Payout (`POST /api/payouts`) | ✅ (Own) | ❌ | ❌ | `requireAuth(['USER'])` |
| Manage Profile & Consents (`PUT /api/user/profile`)| ✅ (Own) | ❌ | ✅ | Scoped to `auth.session.userId` |
| **Advertiser Portal Features** | | | | |
| View Organization Flight (`GET /api/advertiser/overview`)| ❌ | ✅ (Own Org) | ✅ (All) | Scoped to `auth.session.organizationId` |
| Create & Fund Campaign (`POST /api/advertiser/campaigns`) | ❌ | ✅ (Own Org) | ✅ | Tenant Isolated via `UserOrganization` |
| Real-time Telemetry (`GET /api/advertiser/campaigns/:id`)| ❌ | ✅ (Own Org) | ✅ | Checked against campaign `organizationId` |
| Multi-touch Attribution (`GET /api/advertiser/analytics`)| ❌ | ✅ (Own Org) | ✅ | Scoped to tenant organization |
| Escrow Top-Up & GST Invoices (`/api/advertiser/billing`) | ❌ | ✅ (Own Org) | ✅ | Scoped to organization wallet |
| **Admin Operations Features** | | | | |
| Control Room Metrics (`GET /api/admin/overview`) | ❌ | ❌ | ✅ | `requireAuth(['ADMIN'])` |
| Campaign Moderation (`POST /api/admin/moderation`) | ❌ | ❌ | ✅ | `requireAuth(['ADMIN'])` + Audit Log |
| Fraud Lab & Bot Actions (`POST /api/admin/fraud`) | ❌ | ❌ | ✅ | `requireAuth(['ADMIN'])` + Audit Log |
| Payout Batch Clearing (`POST /api/admin/payouts`) | ❌ | ❌ | ✅ | `requireAuth(['ADMIN'])` + Audit Log |
| Cryptographic Audit Search (`GET /api/admin/audit-logs`) | ❌ | ❌ | ✅ | `requireAuth(['ADMIN'])` |
| Unit Economics Dashboard (`GET /api/admin/unit-economics`)| ❌ | ❌ | ✅ | `requireAuth(['ADMIN'])` |
| Platform & Key Settings (`PUT /api/admin/settings`) | ❌ | ❌ | ✅ | `requireAuth(['ADMIN'])` |
