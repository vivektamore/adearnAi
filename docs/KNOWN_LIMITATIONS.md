# AdEarn AI — Known Limitations & Risk Disclosures

## 1. External Payment Gateways & Banking Integrations
- **Live Banking APIs:** Real-time UPI Payouts and Escrow accounts require formal institutional onboarding with an RBI-licensed commercial bank or payment aggregator (e.g., RazorpayX Nodal, Cashfree, ICICI e-Collections). In local and staging environments, the system operates through an audited Sandbox Payout Adapter that mirrors exact external state transitions, response latency, and failure codes.
- **UTR Numbers:** Bank Unique Transaction References (UTRs) in sandbox mode are deterministically generated cryptographic mocks (`UTR-IN-2026-XXXX`).

## 2. Chrome Web Store Deployment
- Screen 20 implements the complete Manifest V3 Chrome Extension source bundle with popup, background service worker, and storage sync. Publishing to the official Chrome Web Store requires a Google Developer account and formal review by Google's extension policy team.

## 3. Indian Regulatory and Tax Guidance (GST & TDS)
- The platform incorporates Indian tax formatting (GSTIN records, 18% GST invoice generation, and section 194R/194C TDS calculation rules), but production tax deduction must be validated by certified Indian Chartered Accountants prior to public financial disbursements.

## 4. Single-Server Deployment vs High Availability
- When initially deployed on a single Ubuntu LTS server using Docker Compose, the single server acts as a single point of failure (SPOF). Moving to multi-server clustering with a dedicated managed database (e.g., AWS Aurora / DigitalOcean Managed Database) is documented in the scaling roadmap for Stage 3 production traffic.
