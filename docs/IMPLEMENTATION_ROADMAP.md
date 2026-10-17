# AdEarn AI — Implementation Roadmap & Execution Phases

## Phase 1 — Discovery, Audit & Architecture
- [x] Inspect existing workspace environment (MySQL 8.0 running, Docker available, Node v22).
- [x] Extract and catalog all 20 Stitch reference screens (`/stitch_reference/*.html`).
- [x] Formulate architecture, data schemas, financial ledger specification, and threat models.
- [x] Document audit, architecture, roadmap, and limitations.

## Phase 2 — System Foundation & Core Engine
- [ ] Initialize Next.js 14 / TypeScript application structure.
- [ ] Install Prisma ORM, bcryptjs, jsonwebtoken, zod, lucide-react / material symbols.
- [ ] Define comprehensive `prisma/schema.prisma` targeting MySQL with integer paise money fields.
- [ ] Generate Prisma client, apply database migrations to local MySQL `adearn_ai` database.
- [ ] Configure Tailwind CSS with the exact design tokens of `AdEarn Financial Narrative`.
- [ ] Implement JWT/Cookie authentication with RBAC (`USER`, `ADVERTISER`, `ADMIN`).
- [ ] Implement foundational API utilities, error handlers, and audit logging engine.

## Phase 3 — Advertiser Portal & Campaign Engine (Screens 08–12)
- [ ] Screen 08: Advertiser Overview Dashboard with telemetry cards, SVG spend curve, and active campaign portfolio.
- [ ] Screen 09: 9-step Campaign Creation Wizard with validation and escrow budget reservation.
- [ ] Screen 10: Creative Review & Campaign Live Telemetry.
- [ ] Screen 11: Attribution & Invalid Traffic (IVT) Analytics.
- [ ] Screen 12: Billing, GST Invoicing, and Escrow Top-up.

## Phase 4 — Creator / User Portal & Task Engine (Screens 01–07)
- [ ] Screen 01: User Dashboard with authenticated metrics (Available Balance, Pending, Lifetime Paid).
- [ ] Screen 02: Sponsored Ad Feed with search, vertical filters, and ASCI disclosure tags.
- [ ] Screen 03: Task Execution Sandbox with client telemetry capture and server verification.
- [ ] Screen 04: Reward Wallet & Ledger with transaction filtering and statement downloads.
- [ ] Screen 05: Withdrawals & Payout History with UPI/IMPS validation and duplicate protection.
- [ ] Screen 06: Profile, KYC verification tier, and privacy consents.
- [ ] Screen 07: Help Centre, Reward Disputes, and Ticket Submission.

## Phase 5 — Financial Operations & Ledger Core
- [ ] Transaction-safe append-only ledger in integer paise.
- [ ] Concurrency control and row-locking on balance updates.
- [ ] Idempotent withdrawal queue with dual-approval workflow.
- [ ] Sandbox and production-ready payout provider adapters (UPI/IMPS/RazorpayX interface).

## Phase 6 — Admin Operations & Forensic Control (Screens 13–19)
- [ ] Screen 13: Admin Operations Dashboard with system telemetry and operational alerts.
- [ ] Screen 14: Moderation & Campaign Ad Approval Queue.
- [ ] Screen 15: Fraud & Kinematics Forensic Lab with anomaly flags and velocity monitors.
- [ ] Screen 16: Payout Clearing & Nodal Pool Reconciliation.
- [ ] Screen 17: Immutable Audit Trails with cryptographic digests.
- [ ] Screen 18: Analytics & Unit Economics Dashboard.
- [ ] Screen 19: Platform Settings, Role Permissions, and API Configurations.

## Phase 7 — Chrome Extension Companion (Screen 20)
- [ ] Screen 20: Chrome Extension Popup & Browser Companion (Manifest V3) with live session sync.

## Phase 8 — Comprehensive Testing Suite
- [ ] Unit tests for ledger invariants, money conversions, and math correctness.
- [ ] Integration tests for authentication, campaign lifecycle, task submission, and payout clearing.
- [ ] End-to-end verification of User, Advertiser, and Admin workflows.

## Phase 9 — DevOps, Docker & Ubuntu Server Runbooks
- [ ] Multi-stage production `Dockerfile` and `docker-compose.yml`.
- [ ] Production Nginx reverse-proxy configuration with SSL/TLS and security headers.
- [ ] Complete Ubuntu server setup guides, backup scripts, and rollback runbooks.

## Phase 10 — Performance, Load Testing & Production Readiness
- [ ] Load test simulation scripts measuring requests/sec, p95 latencies, and db connection pool.
- [ ] Final production verification report and readiness checklist.
