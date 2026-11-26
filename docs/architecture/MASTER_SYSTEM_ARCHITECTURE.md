# AdEarn AI — Master System Architecture Specification
## Institutional Tier Technical Blueprint, Component Topography, and Trust Boundaries

**Target Release:** AdEarn AI v1.0.0-PROD  
**Document Revision:** 2.0 (Post-Financial Remediation & Double-Entry General Ledger Audit)  
**Standard:** Enterprise Financial Systems & RBI Nodal Escrow Safeguard Architecture

---

## 1. System Overview & Architectural Topography

AdEarn AI is an institutional-grade, India-focused sponsored-content and voluntary user-rewards marketplace. It connects verified corporate advertisers with digital creators and consumers while enforcing statutory compliance with Indian advertising mandates (ASCI), regulatory payment safeguards (RBI Nodal account standards), and verifiable human attention telemetry.

```
                              [ PUBLIC INTERNET ]
                                       │
                                 Ports 80 / 443
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │                         EDGE PROXY & SECURITY GATEWAY                         │
 │                               (adearn-nginx)                                  │
 │  - TLS 1.2 / 1.3 Termination (Modern Cipher Profile)                          │
 │  - Rate Limiting: Auth (5 r/s), API (15 r/s), General (30 r/s)                 │
 │  - Security Headers: HSTS (63072000s), SAMEORIGIN, nosniff, Referrer-Policy   │
 │  - Static Asset Edge Caching (/_next/static/ max-age=1y immutable)            │
 │  - Let's Encrypt Certbot ACME HTTP-01 Challenge Passthrough                   │
 └──────────────────────────────────────┬────────────────────────────────────────┘
                                        │ internal_net (Private Docker Bridge)
                                        ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │                       APPLICATION LAYER (Next.js 14 / Node 20)                │
 │                                (adearn-app)                                   │
 │                                                                               │
 │  ┌─────────────────────────────────────────────────────────────────────────┐  │
 │  │ EDGE MIDDLEWARE (src/middleware.ts)                                     │  │
 │  │ - WebCrypto Native HMAC-SHA256 Token Verification                       │  │
 │  │ - Client-Supplied Header Stripping (Strips spoofed x-user-* headers)    │  │
 │  │ - RBAC Route Guardrails (USER, ADVERTISER, ADMIN portal isolation)      │  │
 │  │ - Open-Redirect Sanitization on Login Redirects                         │  │
 │  └─────────────────────────────────────────────────────────────────────────┘  │
 │                                      │                                        │
 │  ┌───────────────────────────────────┴─────────────────────────────────────┐  │
 │  │ CORE BUSINESS SERVICES & API ENGINES                                    │  │
 │  │ - Double-Entry General Ledger Engine (src/lib/double-entry.ts)          │  │
 │  │ - Exact String-Based Money Representation (src/lib/money.ts)            │  │
 │  │ - Campaign Escrow & Drawdown Engine (src/app/api/advertiser/campaigns/) │  │
 │  │ - Kinematic Attention Telemetry Engine (src/lib/telemetry.ts)           │  │
 │  │ - Payout Outbox Dispatch & Reversal Adapter (src/app/api/payouts/)      │  │
 │  │ - Cryptographic Tamper-Evident Audit Logger (src/lib/audit.ts)          │  │
 │  └─────────────────────────────────────────────────────────────────────────┘  │
 └───────────────────────┬───────────────────────────────┬───────────────────────┘
                         │                               │ internal_net
                         ▼ internal_net                  ▼
 ┌────────────────────────────────────────┐ ┌───────────────────────────────────┐
 │       PRIMARY DATABASE CLUSTER         │ │       DISTRIBUTED CACHE & QUEUE   │
 │        MySQL 8.0 (adearn-db)           │ │        Redis 7 (adearn-redis)     │
 │  - InnoDB Engine, utf8mb4_unicode_ci   │ │  - Password-Protected AUTH        │
 │  - Balanced General Journal Ledger     │ │  - Append-Only File (AOF)         │
 │  - Atomic Conditional Row Updates      │ │  - LRU Eviction (512MB limit)     │
 │  - Zero Host Ports Bound               │ │  - Zero Host Ports Bound          │
 └────────────────────────────────────────┘ └───────────────────────────────────┘
```

---

## 2. Component Responsibilities & Domain Segregation

| Component | Technology | Primary Responsibilities |
|---|---|---|
| **Client Layer (Screens 01-07)** | Next.js 14 App Router, Tailwind CSS | Creator experience: Voluntary ad discovery, task engagement, wallet ledger review, and withdrawal execution. |
| **Client Layer (Screens 08-12)** | Next.js 14 App Router, Tailwind CSS | Brand/Advertiser experience: Campaign creation wizard, audience targeting, live telemetry, and GST billing. |
| **Client Layer (Screens 13-19)** | Next.js 14 App Router, Tailwind CSS | System Administrator & Compliance Desk: Campaign moderation, Fraud Lab, payout clearing console, audit log verification. |
| **Client Companion (Screen 20)** | Manifest V3 Chrome Extension | Browser extension companion: Session bridging, real-time wallet sync, and sponsored campaign alerts. |
| **Edge Reverse Proxy** | Nginx Alpine 1.25+ | TLS termination, DDoS request buffering, rate-limiting zones, and static asset caching. |
| **Edge Middleware** | Next.js WebCrypto Middleware | Zero-trust authentication verification, spoofed header scrubbing, and RBAC portal enforcement. |
| **Double-Entry Ledger** | TypeScript Core / MySQL | General Journal balancing (`SUM(debits) === SUM(credits)`), conditional atomic wallet projection updates. |
| **Exact Money Engine** | `src/lib/money.ts` | String-based currency parsing, fractional paise rejection, exact 18% GST integer splits. |
| **Kinematic Anti-Fraud** | `src/lib/telemetry.ts` | Multi-factor verification: minimum dwell time, cursor velocity vectors, interaction cadence, and anomaly scoring. |
| **Payout Outbox Adapter** | `src/lib/payout-adapter.ts` | Non-blocking payment dispatch, `RECONCILIATION_PENDING` timeout holds, and atomic compensating reversals (`PAYOUT_REVERSAL`). |

---

## 3. Relational Schema & Entity Relationships

```
┌─────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│      User       │1──────1│      Wallet      │1──────*│LedgerTransaction │
│ (Creator/Admin) │        │(Balance Proj.)   │        │(Legacy Proj.)    │
└────────┬────────┘        └──────────────────┘        └──────────────────┘
         │1                         │1
         │                          │
         │*                         │*
┌────────┴────────┐        ┌────────┴─────────┐        ┌──────────────────┐
│  PayoutMethod   │        │     Account      │1──────*│   JournalEntry   │
│ (Masked Dest.)  │        │(Chart of Accounts│        │ (Debits/Credits) │
└────────┬────────┘        └──────────────────┘        └────────┬─────────┘
         │1                                                     │*
         │*                                                     │
┌────────┴────────┐                                             │1
│  PayoutRequest  │                                    ┌────────┴─────────┐
│ (Outbox / UTR)  │                                    │JournalTransaction│
└─────────────────┘                                    │(Master Journal)  │
                                                       └──────────────────┘
```

### Core Schema Invariants:
1. **64-bit Integer Minor Units:** Every balance and money field is stored as `BigInt` paise ($₹1.00 = 100$ paise).
2. **Double-Entry General Journal:** `JournalTransaction` references multiple `JournalEntry` records where `SUM(entryType == 'DEBIT') === SUM(entryType == 'CREDIT')`.
3. **Wallet Projections:** `Wallet.availablePaise` and `Wallet.escrowPaise` act as performant balance projections synchronized atomically inside the journal posting transaction.
4. **Conditional Database Locking:** Overdrafts are physically blocked at the database engine level via conditional SQL queries (`WHERE id = ? AND availablePaise >= ?`).

---

## 4. Trust Boundaries & Security Enclaves

```
[ Public Network (Untrusted) ]
               │
───────────────┼────────────────── TRUST BOUNDARY 1: Edge Proxy (Nginx)
               ▼
[ Docker Bridge Network: internal_net ]
  - Ingress traffic has Host, Real-IP, and Forwarded headers set by Nginx.
               │
───────────────┼────────────────── TRUST BOUNDARY 2: Edge Middleware
               ▼
[ Next.js Application Core ]
  - Strips client-supplied x-user-id, x-user-role, and x-organization-id headers.
  - Verifies cryptographic HMAC-SHA256 session token.
  - Attaches verified session claims to request headers.
               │
───────────────┼────────────────── TRUST BOUNDARY 3: Route Handlers & Data Access
               ▼
[ Institutional Services (Ledger, DB, Payouts) ]
  - Re-verifies session independently (Defense-in-Depth).
  - Enforces resource ownership (User cannot access other users' payout methods or wallets).
  - Database credentials never exposed outside internal Docker bridge.
```
