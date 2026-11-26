# AdEarn AI — Limitations & Known Operational Constraints

This document details known limitations, architectural boundaries, and operational constraints in the current release.

---

## 1. Banking Integration & Payout Sandbox Constraint

### Description
The application codebase includes full integration adapters for RazorpayX (`RazorpayXPayoutAdapter`) and sandbox simulation (`SandboxPayoutAdapter`).

### Operational Constraint
By design, `PAYOUT_MODE` defaults to `"sandbox"`. Production deployments must **NOT** flip `PAYOUT_MODE` to `"live"` until:
1. Formal RBI-compliant nodal account opening and authorization is finalized with a banking partner (HDFC / ICICI / Axis).
2. Live API keys, webhook signing secrets, and nodal account numbers are verified in an isolated pre-production staging environment.
3. Dual-approval compliance sign-off is granted by the legal and finance teams.

---

## 2. In-Memory Rate Limiting & Multi-Instance Scalability

### Description
Velocity limiting and user rate limiting in `src/lib/ads.ts` query `prisma.campaignImpression.count({ where: { createdAt: { gte: oneMinuteAgo } } })` directly from MySQL InnoDB.

### Known Limitation & Scaling Recommendation
While this is transactionally consistent and prevents race conditions on single-node deployments, in high-throughput multi-region cluster deployments (exceeding 10,000 requests/sec), this pattern places load on MySQL.
- **Future Enhancement**: Migrate velocity rate-limiting counters to a Redis cluster using sliding-window Lua scripts, while retaining MySQL as the authoritative ledger for validated transactions.

---

## 3. Chrome Extension Direct Content Injection Prohibition

### Description
To prevent ad-blocker flagging, browser security rejections, and DOM collisions with host websites (e.g., ChatGPT, YouTube, Google), the Chrome Companion Extension Manifest V3 (`src/extension/manifest.json`) strictly prohibits broad host permissions (`<all_urls>`).

### Operational Constraint
The extension operates purely via dedicated sidecar popup frames and extension tabs communicating with `/api/ads/*`. It does not inject inline overlays or mutate third-party web page DOM trees.

---

## 4. Single-Admin Settings Mutation

### Description
Platform settings (`/api/admin/settings`) can be updated directly by any user holding the `SUPER_ADMIN` role without requiring a second administrator's co-signature (dual authorization).

### Operational Constraint
In the current release, audit logs (`AuditLog`) capture every setting update with actor attribution. For organizations requiring strict Sarbanes-Oxley (SOX) or four-eyes governance, a dual-approval workflow for system settings will be scheduled in v1.1.

