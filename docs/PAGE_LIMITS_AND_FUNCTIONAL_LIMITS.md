# AdEarn AI — Page Limits, Thresholds & Functional Constraints

This document defines all operational limits, rate limits, monetary thresholds, and pagination limits across the platform.

---

## 1. Monetary Thresholds & Limits

| Parameter | Configuration Key / Location | Value in Paise | Value in INR | Description |
|---|---|---|---|---|
| Minimum Withdrawal | `MIN_WITHDRAWAL_THRESHOLD_PAISE` | `10000` | ₹100.00 | Minimum amount allowed for a voluntary withdrawal request |
| Maximum Daily Earning Cap | `MAX_DAILY_EARNING_CAP_PAISE` | `500000` | ₹5,000.00 | Maximum rewards a creator can accumulate in a 24-hour window |
| Minimum Campaign Budget | `src/app/api/advertiser/campaigns` | `100000` | ₹1,000.00 | Minimum flight budget required to launch a new campaign |
| GST Rate on Escrow Deposits | `src/lib/money.ts` | 18% | 18% | Statutory Indian Goods and Services Tax added to escrow deposits |

---

## 2. Telemetry, Dwell & Anti-Fraud Limits

| Parameter | Location | Threshold | Action on Violation |
|---|---|---|---|
| Minimum Task Dwell Time | `src/lib/telemetry.ts` | 5.0 seconds | Task rejected with `LOW_DWELL_TIME` (HTTP 400) |
| Minimum Impression Dwell | `src/lib/ads.ts` | 1.0 second | Impression rejected with `INSUFFICIENT_VIEWABILITY` (HTTP 422) |
| Anomaly Score Quarantine | `src/app/api/admin/fraud` | `> 0.30` | Session routed to Admin Forensic Lab for review |
| User Impression Velocity Cap | `src/lib/ads.ts` | 15 impressions / minute | Rejected with `RATE_LIMIT_EXCEEDED` (HTTP 429) |
| Campaign Daily Frequency Cap | `src/lib/ads.ts` | 10 impressions / 24 hours | Rejected with `FREQUENCY_CAP_EXCEEDED` (HTTP 429) |

---

## 3. UI, API & Pagination Limits

| Endpoint / Page | Parameter | Default Limit | Maximum Ceiling | Description |
|---|---|:---:|:---:|---|
| `/api/admin/audit-logs` | `limit` | 25 | 100 | Audit logs per page query |
| `/api/admin/fraud` | `take` | 25 | 50 | Flagged sessions loaded into forensic workbench |
| `/api/admin/payouts` | `take` | All | 200 | Batch clearance queue query |
| `/api/wallet/transactions` | `limit` | 20 | 100 | Creator wallet sub-ledger transactions per page |
| `/api/campaigns` | `take` | 20 | 50 | Public active campaigns in creator discovery feed |
| Creative Asset Upload | File Size | 5 MB | 10 MB | Maximum banner or image asset file size |

