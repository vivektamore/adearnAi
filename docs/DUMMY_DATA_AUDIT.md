# Dummy Data Audit & Elimination Report — AdEarn AI

**Audit Date:** 2026-10-17  
**Principle:** Zero Simulated Financials in Production. Silent fallbacks to fake balances or campaigns are strictly eliminated.

---

## 1. Classification Taxonomy

All data sources across the repository have been classified into four explicit categories:

1. **Category 1: Production Mock Data (REMOVED)**:
   - Hardcoded numbers, static metric fallbacks (e.g. `?? 24500`, `?? 34528000`), or fake balance cards embedded in UI components.
   - *Action*: Permanently replaced with honest empty states, `0` defaults, and live database-backed API queries.
2. **Category 2: Automated Test Fixtures (ISOLATED)**:
   - Ephemeral mock objects and assertions used in `test/run_tests.js` and `test/e2e_workflows.test.js`.
   - *Action*: Strictly isolated to `test/` directory. All test data created during test runs is automatically pruned at completion.
3. **Category 3: Development Seed Data (ISOLATED BEHIND EXPLICIT COMMAND)**:
   - Fixtures in `scripts/seed.js` creating initial test organizations (Zerodha Advisory Solutions), initial active campaigns, and test accounts.
   - *Action*: Isolated behind `node scripts/seed.js`. Never executed automatically in production environments.
4. **Category 4: Genuine Database Records (PRESERVED)**:
   - Persisted user records, active campaigns, escrow balances, and audit logs stored in the live MySQL 8.0 database.
   - *Action*: Preserved with non-destructive integrity. No database drop or truncate commands executed.

---

## 2. Complete Inventory of Identified & Cleaned Mock Locations

| File Path | Original Line Content | Classification | Remediation Applied |
|---|---|:---:|---|
| `src/app/page.tsx:115` | `formatINR(data?.metrics?.availableBalancePaise ?? 24500)` | Category 1 | Replaced with `formatINR(data?.metrics?.availableBalancePaise ?? 0)` |
| `src/app/page.tsx:149` | `formatINR(data?.metrics?.pendingBalancePaise ?? 6800)` | Category 1 | Replaced with `formatINR(data?.metrics?.pendingBalancePaise ?? 0)` |
| `src/app/page.tsx:178` | `formatINR(data?.metrics?.lifetimeEarnedPaise ?? 142000)` | Category 1 | Replaced with `formatINR(data?.metrics?.lifetimeEarnedPaise ?? 0)` |
| `src/app/page.tsx:201` | `formatINR(data?.metrics?.lifetimePaidPaise ?? 110700)` | Category 1 | Replaced with `formatINR(data?.metrics?.lifetimePaidPaise ?? 0)` |
| `src/app/page.tsx:317` | `Browse {data?.metrics?.activeCampaignsAvailable ?? 4}` | Category 1 | Replaced with `Browse {data?.metrics?.activeCampaignsAvailable ?? 0}` |
| `src/app/wallet/page.tsx:106` | `formatINR(wallet?.availablePaise ?? 24500)` | Category 1 | Replaced with `formatINR(wallet?.availablePaise ?? 0)` |
| `src/app/wallet/page.tsx:122` | `formatINR(wallet?.pendingPaise ?? 6800)` | Category 1 | Replaced with `formatINR(wallet?.pendingPaise ?? 0)` |
| `src/app/wallet/page.tsx:133` | `formatINR(wallet?.lifetimeEarnedPaise ?? 142000)` | Category 1 | Replaced with `formatINR(wallet?.lifetimeEarnedPaise ?? 0)` |
| `src/app/withdrawals/page.tsx:106` | `formatINR(wallet?.availablePaise ?? 24500)` | Category 1 | Replaced with `formatINR(wallet?.availablePaise ?? 0)` |
| `src/app/withdrawals/page.tsx:154` | `setAmountRupees(((Number(wallet?.availablePaise ?? 24500)) / 100).toFixed(0))` | Category 1 | Replaced with `setAmountRupees(((Number(wallet?.availablePaise ?? 0)) / 100).toFixed(0))` |
| `src/app/extension/page.tsx:80` | `formatINR(session?.wallet?.availablePaise ?? 24500)` | Category 1 | Replaced with `formatINR(session?.wallet?.availablePaise ?? 0)` |
| `src/app/extension/page.tsx:83` | `Pending Hold: {formatINR(session?.wallet?.pendingPaise ?? 6800)}` | Category 1 | Replaced with `Pending Hold: {formatINR(session?.wallet?.pendingPaise ?? 0)}` |
| `src/app/extension/page.tsx:94` | `{session?.companionTelemetry?.eligibleCampaignsCount ?? 4}` | Category 1 | Replaced with `{session?.companionTelemetry?.eligibleCampaignsCount ?? 0}` |
| `extension/popup.html:93` | `<div class="card-balance" id="balance">₹245.00</div>` | Category 1 | Replaced with `<div class="card-balance" id="balance">Loading...</div>` |
| `extension/popup.html:94` | `<div id="pending">Pending Hold: ₹68.00</div>` | Category 1 | Replaced with `<div id="pending">Syncing with platform...</div>` |
| `extension/popup.html:99` | `<div id="user-info">Arun Kumar · Tier 1 KYC</div>` | Category 1 | Replaced with `<div id="user-info">Connecting to local session...</div>` |
| `extension/popup.js:1` | Static fallback on unauthenticated fetch | Category 1 | Added explicit unauthenticated & offline states (`₹0.00` with sign-in prompt) |
| `src/app/advertiser/page.tsx:141` | `formatINR(data?.metrics?.totalSpendPaise ?? 34528000)` | Category 1 | Replaced with `formatINR(data?.metrics?.totalSpendPaise ?? 0)` |
| `src/app/advertiser/page.tsx:161` | `formatINR(data?.metrics?.escrowBalancePaise ?? 45000000)` | Category 1 | Replaced with `formatINR(data?.metrics?.escrowBalancePaise ?? 0)` |
| `src/app/advertiser/page.tsx:178` | `(data?.metrics?.verifiedOutcomes ?? 8642)` | Category 1 | Replaced with `(data?.metrics?.verifiedOutcomes ?? 0)` |
| `src/app/advertiser/page.tsx:198` | `formatINR(data?.metrics?.effectiveCpoPaise ?? 3995)` | Category 1 | Replaced with `formatINR(data?.metrics?.effectiveCpoPaise ?? 0)` |
| `src/app/advertiser/page.tsx:218` | `{data?.metrics?.ivtRatePercent ?? 0.82}%` | Category 1 | Replaced with `{data?.metrics?.ivtRatePercent ?? 0}%` |
| `src/app/advertiser/page.tsx:223` | `{data?.metrics?.blockedIVTCount ?? 712} blocks` | Category 1 | Replaced with `{data?.metrics?.blockedIVTCount ?? 0} blocks` |
| `src/app/advertiser/page.tsx:235` | Static `₹18,450.00` in SLA Recon | Category 1 | Replaced with dynamic `{data?.campaigns?.length ?? 0} Active` |
| `src/app/advertiser/page.tsx:260` | `Valid ({data?.metrics?.verifiedOutcomes ?? 8642})` | Category 1 | Replaced with `Valid ({data?.metrics?.verifiedOutcomes ?? 0})` |
| `src/app/advertiser/page.tsx:264` | `Blocked IVT ({data?.metrics?.blockedIVTCount ?? 712})` | Category 1 | Replaced with `Blocked IVT ({data?.metrics?.blockedIVTCount ?? 0})` |
| `src/app/advertiser/billing/page.tsx:78` | `formatINR(data?.wallet?.escrowPaise ?? 45000000)` | Category 1 | Replaced with `formatINR(data?.wallet?.escrowPaise ?? 0)` |
| `src/app/advertiser/analytics/page.tsx:44` | `{analytics?.metrics?.validatedOutcomes ?? 8642}` | Category 1 | Replaced with `{analytics?.metrics?.validatedOutcomes ?? 0}` |
| `src/app/advertiser/analytics/page.tsx:52` | `{analytics?.metrics?.averageAttentionDwellSec ?? 38.4}s`| Category 1 | Replaced with `{analytics?.metrics?.averageAttentionDwellSec ?? 0}s` |
| `src/app/advertiser/analytics/page.tsx:60` | `{analytics?.metrics?.multiTouchRetentionRate ?? 94.6}%` | Category 1 | Replaced with `{analytics?.metrics?.multiTouchRetentionRate ?? 0}%` |
| `src/app/advertiser/analytics/page.tsx:68` | `{analytics?.metrics?.ivtRate ?? 0.82}%` | Category 1 | Replaced with `{analytics?.metrics?.ivtRate ?? 0}%` |
| `src/app/admin/page.tsx:64` | `formatINR(data?.metrics?.totalEscrowPaise ?? 45000000)` | Category 1 | Replaced with `formatINR(data?.metrics?.totalEscrowPaise ?? 0)` |
| `src/app/admin/page.tsx:72` | `formatINR(data?.metrics?.totalAvailablePaise ?? 24500)` | Category 1 | Replaced with `formatINR(data?.metrics?.totalAvailablePaise ?? 0)` |
| `src/app/admin/page.tsx:80` | `{data?.metrics?.activeCampaigns ?? 4}` | Category 1 | Replaced with `{data?.metrics?.activeCampaigns ?? 0}` |
| `src/app/admin/payouts/page.tsx:71` | `formatINR(data?.nodalPoolSummary?.totalDisbursedPaise ?? 110700)` | Category 1 | Replaced with `formatINR(data?.nodalPoolSummary?.totalDisbursedPaise ?? 0)` |
| `src/app/admin/analytics/page.tsx:45` | `formatINR(data?.metrics?.totalGrossCampaignSpendPaise ?? 34528000)`| Category 1 | Replaced with `formatINR(data?.metrics?.totalGrossCampaignSpendPaise ?? 0)` |
| `src/app/admin/analytics/page.tsx:53` | `formatINR(data?.metrics?.totalUserRewardLiabilitiesPaise ?? 25965100)`| Category 1 | Replaced with `formatINR(data?.metrics?.totalUserRewardLiabilitiesPaise ?? 0)` |
| `src/app/admin/analytics/page.tsx:61` | `formatINR(data?.metrics?.platformGrossMarginPaise ?? 8562900)`| Category 1 | Replaced with `formatINR(data?.metrics?.platformGrossMarginPaise ?? 0)` |

---

## 3. Empty & Error State Handling Policy

1. **Empty State Fidelity**: When an authenticated user has 0 tasks or 0 balance, the dashboard renders an honest `₹0.00` and displays the clear call-to-action: `"No recent activity yet. Explore campaigns below to begin!"`.
2. **Failure Transparency**: If an API request fails with a 500 error or network disconnect, the UI surfaces an inline error notification or retry trigger rather than falling back to fictitious financial figures.
3. **Zero Accidental Demo Mode**: No environment flags exist that allow production to toggle simulated data fallbacks.
