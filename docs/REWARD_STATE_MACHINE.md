# Reward Lifecycle State Machine — AdEarn AI

## 1. Lifecycle Transitions

```
[ELIGIBLE]
   │  (User initiates task session)
   ▼
[STARTED]
   │  (User completes interactive task with telemetry)
   ▼
[SUBMITTED]
   │  (Server telemetry validation: dwell time + kinematics)
   ├─── Low confidence / Bot detected ──> [REJECTED]
   ▼
[VALIDATED] (Accrues to Pending Balance)
   │  (Cooling off period / Advertiser verification / Auto-approval)
   ▼
[APPROVED] (Atomically moves from Pending to Available Balance)
   │  (User requests withdrawal)
   ▼
[WITHDRAWAL_REQUESTED] (Moves Available to Held Balance)
   │  (Dispatched to UPI / IMPS payout provider adapter)
   ▼
[PROCESSING]
   ├─── Bank UTR / Webhook confirmation ─> [PAID] (Terminal)
   └─── Bank rejection / Network failure ─> [FAILED] (Funds refunded to Available)
```

---

## 2. Guard Conditions & Permissions

| Transition | Permitted Actor | Validation Rules | Ledger Action |
|---|---|---|---|
| `ELIGIBLE` -> `STARTED` | User | Campaign is `ACTIVE`; user has not exceeded daily cap | None |
| `STARTED` -> `SUBMITTED` | User | Valid task session token; answers provided | None |
| `SUBMITTED` -> `VALIDATED` | Server Engine | Telemetry score >= 60; dwell time >= threshold | Credit Pending Balance |
| `VALIDATED` -> `APPROVED` | System / Admin | Verification timeout cleared or manual clearance | Shift Pending to Available |
| `APPROVED` -> `WITHDRAWAL_REQUESTED` | User | Amount >= Minimum Payout (₹50.00); Available >= Amount | Shift Available to Held |
| `WITHDRAWAL_REQUESTED` -> `PAID` | Bank Webhook / Dual Admin | Provider returns valid UTR confirmation | Debit Held Balance |
| `PROCESSING` -> `FAILED` | Bank Webhook / Provider Adapter | Rejection error code received | Recredit Held to Available |
