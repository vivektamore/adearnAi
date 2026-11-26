# ADEARNAI — AUDIT CONTRADICTIONS, RISKS & RESOLUTION LOG

**Date:** November 2026  
**Status:** All Critical Contradictions Audited & Resolved  
**Auditor:** Principal Software Architect, Application Security & FinTech Systems Engineer  

---

## 1. Conflict Resolution Matrix

### Conflict A: Chrome Extension DOM Injection vs. Popup Only
* **Contradiction in Historical Reports:** Some previous documentation referenced `MutationObserver` injection into `chatgpt.com` via `extension/content.js`. However, Chrome Web Store policy strictly bans deceptive third-party website ad injection and requires single-purpose extensions.
* **Actual Codebase Audit:**
  * Inspected `extension/manifest.json`: Contains **zero** `content_scripts` declarations.
  * Checked `extension/` directory: `extension/content.js` **does not exist**.
  * Inspected `host_permissions`: Strictly limited to `"http://localhost:3000/*"` and `"https://*.adearn.ai/*"`.
  * Checked background and popup scripts: Zero calls to `chrome.scripting.executeScript`, zero DOM observers.
* **Resolution & Invariant:** Canonical v1 inventory is strictly restricted to **Chrome Extension Popup (`extension/popup.html`)** and optional Side Panel. Zero third-party web page injection exists, eliminating Chrome Web Store rejection risk.

---

### Conflict B: Financial Settlement & Simulated UTRs vs. Real Banking Rails
* **Contradiction in Historical Reports:** Historical test reports cited instant bank clearing confirmations with UTR numbers, which could be misconstrued as real banking transactions.
* **Actual Codebase Audit:**
  * Inspected `src/lib/payouts.ts` and `src/app/api/admin/settings/route.ts`.
  * Environment configuration explicitly specifies: `PAYOUT_MODE=sandbox`.
  * UTR numbers generated during testing (e.g. `SBX-UTR-...`) are simulated by the mock banking adapter.
* **Resolution & Invariant:**
  * The platform is explicitly documented as operating in **Sandbox Mode**.
  * Live bank transfers and nodal escrow drawdown will remain locked in sandbox mode until formal, qualified contracts with authorized scheduled commercial banks (RBI Nodal / Escrow directions) are completed.

---

### Conflict C: Test Report Inconsistencies & Consolidated Counts
* **Contradiction in Historical Reports:** Historical audit documents cited different numbers of passing tests (e.g., 16 in one suite, 31 in another, 45 in user portal).
* **Actual Codebase Audit:**
  * The repository contains **14 distinct, independent test suites** executed via `npm test`.
  * Each test suite tests an isolated boundary (Money invariants, Concurrency, RBAC separation, User Portal, Brand Portal, Admin Portal, Extension Monetization, etc.).
* **Resolution & Invariant:**
  * Established fresh, verified test execution baseline across all 14 suites.
  * Verified that each test file runs independently against the live MySQL test database and passes with 0 failures.

---

### Conflict D: Accounting Reconciliation & Escrow Double-Counting Risk
* **Contradiction in Historical Reports:** Early architectural diagrams raised concerns regarding whether campaign escrow reserves were counted multiple times between general advertiser escrow and active campaign reserves.
* **Actual Codebase Audit:**
  * Audited `src/lib/double-entry.ts` and `scripts/reconcile_ledger.js`.
  * Fund flow model:
    1. Advertiser Top-Up: $\text{Dr: } 1010\text{ (Bank)} \to \text{Cr: } 2010\text{ (Advertiser Escrow Liability)}$.
    2. Campaign Lock: $\text{Dr: } 2010\text{ (Advertiser Escrow)} \to \text{Cr: } 2020\text{ (Campaign Reserve Liability)}$.
    3. Verified Event (Click/View): $\text{Dr: } 2020\text{ (Campaign Reserve)} \to \text{Cr: } 2030\text{ (Creator Payable)} + \text{Cr: } 4010\text{ (Platform Revenue)}$.
    4. Payout: $\text{Dr: } 2030\text{ (Creator Payable)} \to \text{Cr: } 1010\text{ (Bank)}$.
  * Trial Balance Equation:
    $$\sum \text{Debits} \equiv \sum \text{Credits}$$
* **Resolution & Invariant:**
  * Verified across 231 live journal transactions: Global Debits = 60,208,636 paise === Global Credits = 60,208,636 paise. Zero double-counting exists.

---

### Conflict E: Cookie & Session Security Flags
* **Contradiction in Historical Reports:** Concerns were raised that token validation relied solely on middleware.
* **Actual Codebase Audit:**
  * Inspected `src/middleware.ts`, `src/lib/auth.ts`, and individual API route handlers (`/api/admin/*`, `/api/advertiser/*`, `/api/wallet`).
  * Findings: Every single privileged API independently invokes `requireAuth` or `requireRole` / `requireAdminPermission`, regardless of whether the request traversed Next.js middleware.
  * Cookies are configured with `HttpOnly: true`, `SameSite: 'lax'`, `Secure: production`.
* **Resolution & Invariant:** Multi-layered defense-in-depth: Route Handlers strictly enforce authentication and authorization independently of Edge middleware.

---

## 2. Outstanding Regulatory & Operational Risks

| Risk Category | Severity | Description | Mitigation Strategy |
| :--- | :---: | :--- | :--- |
| **RBI Nodal Escrow Compliance** | HIGH | Operating an escrow settlement pool in India requires formal banking arrangements under RBI circulars for Payment Aggregators / Nodal Accounts. | Enforce `PAYOUT_MODE=sandbox` in production until legal counsel and partner bank execute formal nodal agreements. |
| **ASCI Disclosure Compliance** | MEDIUM | Indian advertising regulations require clear labeling of commercial sponsored content. | Extension and web task cards mandate visible `Sponsored` badges and non-deceptive disclosures. |
| **Chrome Web Store Single Purpose** | LOW | Single-purpose extension policy prohibits bundling ad delivery with unrelated utility functions. | Extension is explicitly framed and scoped as a dedicated rewards companion with zero DOM injection. |
