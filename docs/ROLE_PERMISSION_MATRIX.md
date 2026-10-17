# Role-Based Access Control (RBAC) Matrix — AdEarn AI

AdEarn AI enforces strict least-privilege server-side authorization across three primary role groups.

---

## 1. Access Matrix

| Resource / Capability | User (`USER`) | Advertiser (`ADVERTISER`) | Admin (`ADMIN`) |
|---|:---:|:---:|:---:|
| **User Application** | | | |
| View Feed & Eligible Campaigns | ✅ | ✅ | ✅ |
| Initiate & Complete Tasks | ✅ | ❌ | ✅ |
| View Personal Wallet & Ledger | ✅ (Own) | ❌ | ✅ (All) |
| Request UPI/Bank Payout | ✅ (Own) | ❌ | ❌ |
| Manage Personal Profile & Consents | ✅ (Own) | ❌ | ✅ |
| **Advertiser Portal** | | | |
| View Organization Overview | ❌ | ✅ (Own Org) | ✅ (All Orgs) |
| Create & Edit Campaigns | ❌ | ✅ (Own Org) | ✅ |
| Upload & Review Creative Assets | ❌ | ✅ (Own Org) | ✅ |
| View Attribution Analytics | ❌ | ✅ (Own Org) | ✅ |
| Top-Up Escrow & Download GST Invoices| ❌ | ✅ (Own Org) | ✅ |
| **Admin Operations Portal** | | | |
| View Operations Dashboard | ❌ | ❌ | ✅ |
| Campaign Moderation Queue (Approve/Reject)| ❌ | ❌ | ✅ |
| Fraud & Kinematic Forensic Lab | ❌ | ❌ | ✅ |
| Payout Clearing & Dual Approval | ❌ | ❌ | ✅ |
| Immutable Audit Log Search | ❌ | ❌ | ✅ |
| Platform Unit Economics & Margins | ❌ | ❌ | ✅ |
| System Configuration & API Settings | ❌ | ❌ | ✅ |

---

## 2. Multi-Tenant Organization Isolation

- When an `ADVERTISER` user performs any query or mutation on campaigns, creative assets, or billing records, the server strictly filters by `organizationId` linked to their authenticated session.
- Any attempt to access a campaign belonging to another organization (e.g. IDOR manipulation of `/api/advertiser/campaigns/:id`) returns `403 Forbidden` and records a security audit incident.
