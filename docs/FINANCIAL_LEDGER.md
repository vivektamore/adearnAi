# Financial Ledger Architecture & Invariants — AdEarn AI

## 1. Principles of Financial Accounting

AdEarn AI handles advertiser escrow deposits and user reward payouts with the rigor of a financial accounting subsystem:

1. **Integer Minor Units Only (`paise`)**:
   - Floating-point numbers (`Float`, `Double`) are strictly prohibited in financial entities and calculations.
   - All monetary amounts are stored in database columns as 64-bit BigInt representing integer paise (₹1.00 = 100 paise).
2. **Append-Only Immutable Ledger**:
   - Rows in `ledger_transactions` are **never updated or deleted**.
   - If a reversal, adjustment, or refund is required, a compensating transaction is inserted with explicit references and reason codes.
3. **Idempotency Guarantee**:
   - Every financial state mutation requires an `idempotencyKey` with a unique database constraint.
   - Retried requests or duplicate webhooks return the existing transaction record rather than posting duplicate entries.
4. **ACID Transaction & Overdraft Prevention**:
   - Balance changes execute inside a serialized database transaction (`prisma.$transaction`).
   - Before debiting a wallet for withdrawal or budget allocation, the ledger validates that `availablePaise >= requestedPaise`.
   - Any attempt to withdraw more than the available balance throws an `INSUFFICIENT_FUNDS` exception and aborts the transaction.

---

## 2. Escrow Accounting & Dual-Sided Balance Equations

In accordance with Reserve Bank of India (RBI) nodal and escrow account guidelines for digital intermediaries:

```
Total Advertiser Escrow Deposited
  = [Active Campaign Budgets Reserved]
  + [Advertiser Withdrawable / Unallocated Escrow]
  + [User Pending Rewards Liability]
  + [User Approved Withdrawable Balance]
  + [Completed User Payouts]
  + [Platform Recognized Margin]
```

At all times, the system enforces the invariant:
`Total Platform Liabilities <= Total Authoritative Escrow Pool Funds`
