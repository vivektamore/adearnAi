# Financial Ledger Architecture & Invariants — AdEarn AI (Authoritative Specification)

## 1. Principles of Financial Accounting

AdEarn AI handles advertiser escrow deposits and user reward payouts with the rigor of an institutional double-entry financial accounting subsystem:

1. **Integer Minor Units Only (`paise`)**:
   - Floating-point arithmetic (`Float`, `Double`) is strictly prohibited in financial entities and ledger calculations.
   - All monetary amounts are stored in database columns as 64-bit BigInt representing integer paise (where ₹1.00 = 100 paise).
2. **Append-Only Immutable Ledger (`ledger_transactions`)**:
   - Rows in `ledger_transactions` are **never updated or deleted**.
   - If an adjustment, reversal, or compensation occurs, an explicit new transaction of type `ADMIN_ADJUSTMENT` or compensating credit/debit is inserted with reason codes and audit references.
3. **Idempotency Guarantee**:
   - Every financial mutation requires a unique `idempotencyKey` constrained at the database level (`@@index([idempotencyKey])`, `@unique`).
   - Retried requests or duplicate payment gateway webhooks return the existing transaction record rather than posting duplicate entries.
4. **ACID Transaction & Overdraft Prevention**:
   - Balance changes execute inside a serialized database transaction (`prisma.$transaction`).
   - Before debiting a wallet for withdrawal or budget allocation, the ledger validates that `availablePaise >= requestedPaise` or `escrowPaise >= requestedPaise`.
   - Any attempt to withdraw more than the available balance throws an `Insufficient available balance` exception and aborts the database transaction.

---

## 2. Authoritative Transaction Types (`LedgerTransactionType`)

| Transaction Type | Target Wallet | Balance Mutation | Description |
|---|---|---|---|
| `ADVERTISER_TOPUP` | Organization Escrow | `escrowPaise += amount` | Direct RTGS/NEFT/UPI nodal pool deposit by advertiser organization. |
| `ESCROW_LOCK` | Organization Escrow | `escrowPaise -= amount` | Allocates and locks escrow budget for an active campaign flight. |
| `ESCROW_RELEASE` | Organization Escrow | `escrowPaise += amount` | Releases unspent campaign budget back to unreserved escrow upon completion. |
| `CREDIT_REWARD` | User Reward Wallet | `availablePaise += amount`, `lifetimeEarnedPaise += amount` | Credits verified task completion reward to user's withdrawable balance. |
| `DEBIT_WITHDRAWAL` | User Reward Wallet | `availablePaise -= amount`, `lifetimePaidPaise += amount` | Debits withdrawable funds upon payout request submission. |
| `ADMIN_ADJUSTMENT` | User / Organization | `availablePaise += amount` | Dual-approved administrative compliance adjustment. |

---

## 3. Escrow Accounting & Dual-Sided Invariants

In accordance with Reserve Bank of India (RBI) nodal and escrow account guidelines for digital intermediaries:

```
Total Nodal Escrow Bank Balance
  = Σ (All Organizations' wallet.escrowPaise)
  + Σ (All Active Campaigns' (budgetAllocatedPaise - budgetSpentPaise))
  + Σ (All Users' wallet.availablePaise)
  + Σ (All In-Flight PayoutRequests where status in ['REQUESTED', 'PROCESSING'])
  + Platform Recognized Margin Retained
```

At all times, the system enforces the invariant:
`Total Platform Liabilities <= Total Authoritative Escrow Pool Funds`
