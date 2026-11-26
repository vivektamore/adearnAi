# ADEARN AI — CHATGPT ADS AUTONOMOUS CAMPAIGN WORKFLOW
## Architecture, Technical Implementation & Verification Report

**Date:** November 2026  
**System:** AdEarn AI — Brand Studio Multi-Channel Advertising Engine  
**Channel 1:** `ADEARN_EXTENSION` (AdEarn-owned inventory, BigInt paise, nodal escrow, CPO verification, creator rewards)  
**Channel 2:** `OPENAI_CHATGPT` (Official OpenAI Advertiser API, integer micros, native OpenAI auction, native cards below ChatGPT responses)

---

## 1. Executive Summary & Core Guarantees

In response to the advertiser request to run native campaigns directly inside ChatGPT conversational inventory, AdEarn has introduced **Channel 2: OPENAI_CHATGPT** as a first-class autonomous workflow inside AdEarn Brand Studio.

### The 4 Non-Negotiable Guarantees:
1. **Zero DOM Manipulation & Chrome Web Store Compliance:**
   - AdEarn does **not** inject banners, cards, or scripts into `chatgpt.com` DOM.
   - All unauthorized content script files (`chatgpt_content.js`, `chatgpt_content.css`) have been permanently purged.
   - The AdEarn Chrome extension maintains strict Manifest V3 popup/sidePanel boundaries.
2. **Channel & Financial Unit Isolation:**
   - AdEarn money values strictly remain `BigInt` integer **paise** ($₹1.00 = 100\text{ paise}$).
   - OpenAI campaign budgets and bids strictly use integer **micros** ($1\text{ unit} = 1,000,000\text{ micros}$).
   - **Zero mixing of monetary units.** AdEarn escrow reservations are never represented as external OpenAI deposits.
   - OpenAI traffic events are never credited to AdEarn creator reward ledgers.
3. **OpenAI Ads Manager Hierarchy Alignment:**
   - Matches official hierarchy: `OpenAI Ad Account → Campaign → Ad Group → Ad`.
   - Ad Groups define `bidStrategy`, `maxBidMicros`, and `contextHints` (descriptive relevance guidance, not exact-match prompt triggers).
   - All external resources are created strictly in `PAUSED` state. Explicit advertiser confirmation is required for activation.
4. **Billing Event Mapping:**
   - Impressions: `impressions` $\rightarrow$ `impression`
   - Clicks: `clicks` $\rightarrow$ `click`
   - Conversions: `conversions` $\rightarrow$ `click` (no fictitious CPO billing event).

---

## 2. Chrome Extension Policy & Inventory Demarcation

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CHROME BROWSER ENVIRONMENT                      │
├───────────────────────────────────┬────────────────────────────────────┤
│       chatgpt.com Web Page        │    AdEarn MV3 Chrome Extension     │
│                                   │                                    │
│  • OpenAI native conversation     │  • Popup window ONLY               │
│  • OpenAI native ad card served   │  • SidePanel user dashboard        │
│    by OpenAI ad auction below     │  • Zero content scripts            │
│    assistant responses            │  • Zero chatgpt.com permissions    │
│  • AdEarn does NOT touch DOM      │  • AdEarn internal CPO tasks       │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Database Schema Foundation (`prisma/schema.prisma`)

The following relational models were added to isolate OpenAI channel resources from AdEarn's core escrow ledger:

1. **`OpenaiCampaign`**:
   - `id`: Internal UUID
   - `organizationId`: Associated brand organization
   - `campaignId`: Linked parent AdEarn campaign record (`channel: OPENAI_CHATGPT`)
   - `externalCampaignId`: External OpenAI identifier (e.g. `camp_openai_...`)
   - `name`: Campaign title
   - `objective`: `IMPRESSIONS` | `CLICKS` | `CONVERSIONS`
   - `status`: `PAUSED` | `ACTIVE` | `ARCHIVED`
   - `budgetType`: `DAILY` | `LIFETIME` (mutually exclusive)
   - `budgetMicros`: BigInt integer micros in account currency
   - `currency`: e.g. `INR` or `USD`
   - `geoTargetingJson`, `platformsJson`, `landingPageUrl`, `complianceJson`
2. **`OpenaiAdGroup`**:
   - `externalAdGroupId`: External OpenAI identifier
   - `contextHintsJson`: Descriptive relevance keywords
   - `bidStrategy`: `LOWEST_COST`, `COST_CAP`, `BID_CAP`
   - `billingEvent`: `impression` or `click`
3. **`OpenaiAd`**:
   - `externalAdId`: External OpenAI identifier
   - `brandName`, `faviconUrl`, `headline` (max 60 chars), `description` (max 120 chars), `imageUrl`, `landingPageUrl`, `utmParameters`
4. **`OpenaiInsightReport`**:
   - Historical snapshot of `impressions`, `clicks`, `spendMicros`, `ctrPercent`, `avgCpcMicros`, `avgCpmMicros`, `conversions`, `cpaMicros`, `roas`, `freshnessTimestamp`.
5. **`OpenaiConversionConfig`**:
   - `pixelId`, `pixelCode`, `conversionsApiEnabled`, `attributionWindowDays` (default 7-day click, 1-day view).

---

## 4. API Client & Backend Routes

| Route | Method | Description |
|---|---|---|
| `/api/advertiser/openai` | `GET` | Fetches connected account status, capabilities, and all campaigns with ad groups, ads, and latest insights. |
| `/api/advertiser/openai` | `POST` | Autonomous campaign pipeline: verifies account, creates campaign, ad group, and ad in `PAUSED` state, records audit log. |
| `/api/advertiser/openai/[id]/activate` | `POST` | Handles explicit advertiser state transition to `ACTIVE` or `PAUSED`. |
| `/api/advertiser/openai/ai-assistant` | `POST` | Generates 3 headlines (<=60 chars), 3 descriptions (<=120 chars), context hints, and runs ASCI / OpenAI ad policy pre-flight scan. |
| `/api/advertiser/openai/sync` | `POST` | Polls OpenAI Insights endpoints, stores snapshots, and returns fresh metrics with timestamp and processing delay notes. |
| `/api/advertiser/openai/conversions` | `GET` / `POST` | Generates embeddable first-party JavaScript tracking pixel and CAPI server-to-server payload specifications. |

---

## 5. Brand Studio User Interface

### 3-Step Wizard (`/advertiser/chatgpt-ads/new`)
- **Step 1: Create Campaign:**
  - Campaign name, objective (`clicks`, `impressions`, `conversions`), budget type (Daily vs Lifetime), budget amount with micros preview, dates, locations (e.g. India), platforms (Android, iOS, Web).
- **Step 2: Create Ad Group & Ads:**
  - Ad group context hints (descriptive guidance), bid strategy, and max bid.
  - Ad creative with live character counters (headline max 60 chars, description max 120 chars).
  - **AI Creative Assistant:** 1-click generation of headlines, descriptions, and pre-flight policy compliance verification.
  - **Live ChatGPT Native Preview:** Dark mode preview card rendering below assistant response exactly like official sponsored cards.
- **Step 3: Review & Summary (Screenshot 4 Alignment):**
  - Displays complete campaign summary, location, platforms, daily budget, creative enhancements.
  - Terms acknowledgment and explicit **Publish** action submitting resources to OpenAI in `PAUSED` state.

### Reporting Dashboard (`/advertiser/chatgpt-ads`)
- Top alert banners matching OpenAI Ads Manager:
  - *"Conversion reporting is delayed. Recent conversion data in Ads Manager may be incomplete..."*
  - *"Channel Separation Guarantee: AdEarn never serves ads directly inside ChatGPT DOM..."*
- Timezone and currency indicators (`Timezone: India Standard Time • Billing uses UTC`).
- Source-labeled metric cards (`Total Spend`, `Impressions`, `Clicks & CTR`, `Conversions`).
- Interactive campaign table with state toggles (`ACTIVE` / `PAUSED`), "Sync with OpenAI" button, and Conversion Pixel modal.

---

## 6. Automated Verification Results

Test suite executed via `test/openai_ads_pipeline.test.js`:
- ✅ **Test 1: Account capability & status retrieval** — Passed
- ✅ **Test 2: Monetary conversion: major units to integer micros** — Passed (₹2,900.50 = 2,900,500,000 micros)
- ✅ **Test 3: OpenAI billing event mapping** — Passed (conversions map to click billing)
- ✅ **Test 4: Headline (<=60) & description (<=120) boundary checks** — Passed
- ✅ **Test 5: Campaign hierarchy creation in PAUSED state** — Passed
- ✅ **Test 6: Explicit state transition from PAUSED to ACTIVE** — Passed
- ✅ **Test 7: Campaign insights calculation & freshness** — Passed
- ✅ **Test 8: Conversion tracking snippet & CAPI generation** — Passed

**Result:** 8 / 8 tests passing. TypeScript compilation verified with zero errors (`0 errors`).
