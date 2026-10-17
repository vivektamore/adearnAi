# Reward Lifecycle State Machine — AdEarn AI (Authoritative Specification)

## 1. Lifecycle Transitions & State Graph

```
[ELIGIBLE] (User discovers campaign in feed /feed)
   │
   │  (POST /api/tasks/start) -> Issues HMAC-SHA256 sessionToken
   ▼
[STARTED]
   │
   │  (User completes interactive task in /task/[id])
   ▼
[SUBMITTED]
   │
   │  (POST /api/tasks/submit with kinematic telemetry)
   ├─── Low confidence / Anomaly score > 0.40 / Bot heuristic ──> [REJECTED]
   │                                                                 │
   │                                                                 └──> [FraudIncident Created]
   ▼
[VALIDATED]
   │
   │  (Authoritative Financial Ledger: CREDIT_REWARD)
   │  (Atomic Wallet Update: increments availablePaise & lifetimeEarnedPaise)
   ▼
[AVAILABLE FOR WITHDRAWAL]
   │
   │  (POST /api/payouts with amount >= ₹100.00 and verified destination)
   ▼
[REQUESTED] (Ledger DEBIT_WITHDRAWAL posted atomically)
   │
   │  (Dispatched to Payout Adapter: UPI 2.0 / IMPS)
   ▼
[PROCESSING]
   │
   ├── Bank Webhook / UTR Confirmation (e.g. UTR-NPCI-...) ──> [CLEARED] (Terminal Success)
   │
   ├── User Cancellation (before clearing) ───────────────────> [CANCELLED] (Refund to availablePaise)
   │
   └── Bank Clearing Timeout / Rejection ─────────────────────> [FAILED] (Compensating Ledger Credit)
```

---

## 2. Guard Conditions & Authoritative Business Rules

| Transition | Actor | Pre-Conditions & Invariants | Financial Ledger Mutation |
|---|---|---|---|
| `ELIGIBLE` -> `STARTED` | Creator User | Campaign `status == ACTIVE`, flight dates valid, user has not already completed task. | None. Task session token generated. |
| `STARTED` -> `SUBMITTED` | Creator User | Valid signed `sessionToken` matching authenticated `userId`. | None. Telemetry payload accepted for inspection. |
| `SUBMITTED` -> `VALIDATED` | Telemetry Engine | Dwell time >= required seconds, cursor movement count > 5, cadence score >= 60. | `CREDIT_REWARD`: increments user `availablePaise` and increments campaign `budgetSpentPaise`. |
| `SUBMITTED` -> `REJECTED` | Telemetry Engine | Bot heuristics triggered (0 interaction, impossible velocity, low dwell). | None. Status set to `REJECTED`, incident created in Fraud Lab. |
| `AVAILABLE` -> `REQUESTED` | Creator User | `amountPaise >= 10000` (₹100.00 min threshold), `wallet.availablePaise >= amountPaise`. | `DEBIT_WITHDRAWAL`: decrements user `availablePaise` atomically. |
| `REQUESTED` -> `PROCESSING`| Payout Adapter | Adapter receives dispatch payload with masked destination. | None. Provider tracking reference recorded. |
| `PROCESSING` -> `CLEARED` | Banking Provider / Admin | Bank UTR received or administrator dual-approves batch clearing. | Payout marked `CLEARED` with `clearedAt` timestamp and UTR number. |
| `PROCESSING` -> `FAILED` | Banking Provider | Invalid VPA, account frozen, or bank network error. | Compensating `CREDIT_REWARD` or refund transaction restores `availablePaise`. |
