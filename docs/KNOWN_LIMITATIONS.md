# AdEarn AI — Known Limitations & Operational Risk Disclosures
## Production Constraints, Regulatory Dependencies, and Topology Boundaries

This document details explicit technical and operational limitations that must be acknowledged before cutting over to public production operations.

---

## 1. Single-Server Deployment vs High Availability (SPOF)
- **Current Topology:** The baseline production release topology runs on a single Ubuntu LTS server utilizing Docker Engine, Docker Compose, and persistent Docker volumes (`db_data`, `redis_data`, `app_uploads`).
- **Limitation:** A single-server architecture is **not high availability (HA)**. Any hardware failure, power loss, or host network disruption will render the entire application temporarily offline until the host reboots or is recovered.
- **Mitigation:** Daily offsite backup synchronization (per `docs/deployment/BACKUP_AND_RESTORE.md`) ensures complete recoverability within 30 minutes (RTO < 30m, RPO < 24h). Horizontal scaling with AWS Aurora / Managed MySQL is mapped in the scaling roadmap.

---

## 2. External Payment Gateways & Live Nodal Account Status
- **Current Mode:** The application runs in `PAYOUT_MODE=sandbox` using an audited sandbox payout adapter.
- **Limitation:** Real bank account disbursements and instant UPI transfers cannot be executed until corporate banking contracts, KYC verification, and RBI-mandated nodal escrow accounts (via RazorpayX or Cashfree) are approved and active.
- **Safety Guarantee:** Live payouts remain disabled. Test transactions generate deterministic cryptographic mock UTR references (`UTR-IN-2026-XXXX`). Never mark a payout as paid without authoritative provider webhooks.

---

## 3. Chrome Web Store Packaging & Distribution
- **Current Status:** Screen 20 implements the complete Manifest V3 Chrome Extension source bundle in `extension/` (popup, background service worker, secure storage auth sync).
- **Limitation:** In local development and staging environments, the extension is installed via Chrome Developer Mode (`chrome://extensions` -> "Load unpacked").
- **Public Requirement:** Public deployment requires creating a Google Chrome Web Store developer account, submitting the zipped bundle, and passing Google's automated and manual security review.

---

## 4. Indian Regulatory and Tax Guidance (GST & TDS)
- **Current Status:** The billing engine accurately calculates the standard 18% Indian Goods and Services Tax (GST) on advertiser funding orders using integer paise (`BigInt` math) and records GSTIN numbers.
- **Limitation:** Production TDS (Tax Deducted at Source) deductions under Section 194R (benefit/perquisite to creators) and Section 194C/194J must be formally reviewed by certified Indian Chartered Accountants (CA) to align with platform annual disbursement thresholds.

---

## 5. Public DNS & External VPS Provisioning
- **Current Status:** Deployment files, Nginx reverse proxy configuration, and automated release scripts are verified and tested.
- **Limitation:** Final public host deployment requires external server IP addresses, SSH keys, and registrar DNS A-records (`adearn.ai` / `www.adearn.ai`) which must be provisioned by the user/organization.
