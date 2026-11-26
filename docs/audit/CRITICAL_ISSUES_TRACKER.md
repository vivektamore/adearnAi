# AdEarn AI — Critical Issues & Remediation Tracker
## Comprehensive Vulnerability Register, Root-Cause Analysis, Code Fixes, and Verification Proof

**Evaluation Standards:** P0 (Critical Financial / Security), P1 (Business Workflow / Reliability), P2 (Operational / Informational)

---

## 1. Master Issue Remediation Matrix

| Issue ID | Severity | Category | Description | Affected Files | Remediation Implemented | Verification Test | Status |
|---|---|---|---|---|---|---|---|
| **ISSUE-01** | **P0** | Financial Accuracy | Floating-point conversion (`Math.round(rupees * 100)`) introducing precision drift and allowing fractional paise. | `src/lib/currency.ts`, `src/app/api/payouts/`, `src/app/api/advertiser/billing/` | Created `src/lib/money.ts` with string-based parser `parseRupeesToPaise()`. Rejects >2 decimals and non-numeric inputs. | `test/money.test.js` | **PASS** |
| **ISSUE-02** | **P0** | Double-Entry Accounting | Single-entry `LedgerTransaction` lacked balanced debits and credits and Chart of Accounts. | `prisma/schema.prisma`, `src/lib/ledger.ts` | Added `Account`, `JournalTransaction`, `JournalEntry` models. Enforced `SUM(debits) === SUM(credits)` per transaction in `DoubleEntryLedger`. | `test/financial_integrity.test.js` | **PASS** |
| **ISSUE-03** | **P0** | Concurrency / Overdraft | Parallel simultaneous withdrawals could bypass balance check and overdraw wallet balance. | `src/lib/double-entry.ts`, `src/lib/ledger.ts` | Implemented database-level atomic conditional SQL updates (`WHERE id = ? AND availablePaise >= ?`). | `test/financial_integrity.test.js` (5 parallel threads) | **PASS** |
| **ISSUE-04** | **P0** | Payout Ambiguity | Network timeout or gateway delay could trigger premature failure and improper balance refund. | `prisma/schema.prisma`, `src/app/api/payouts/route.ts` | Added `RECONCILIATION_PENDING` status. Separated reservation from HTTP dispatch. Holds funds until authoritative webhook. | `test/security_and_payments.test.js` | **PASS** |
| **ISSUE-05** | **P0** | Security / Spoofing | Client-supplied `x-user-*` headers were not explicitly stripped before attaching session headers. | `src/middleware.ts` | Explicitly delete incoming `x-user-id`, `x-user-role`, `x-user-email`, and `x-organization-id` headers at middleware entry. | `test/security_and_payments.test.js` | **PASS** |
| **ISSUE-06** | **P1** | Security / Redirect | Unsanitized `redirect` parameter could potentially allow open redirect to external URLs. | `src/middleware.ts` | Implemented `sanitizeRedirectPath()`: rejects external protocols (`://`) and double-slashes (`//`). | `test/security_and_payments.test.js` | **PASS** |
| **ISSUE-07** | **P0** | Financial Reversals | Concurrent admin rejection could execute duplicate compensating reversals on the same payout. | `src/app/api/admin/payouts/route.ts` | Added conditional status transition `WHERE status IN ('REQUESTED', 'PROCESSING', 'RECONCILIATION_PENDING')`. Blocks double reversals. | `test/financial_integrity.test.js` | **PASS** |

---

## 2. In-Depth Technical Finding Details

### ISSUE-01: Floating-Point Multiplication & Precision Loss
- **Root Cause:** Standard JavaScript IEEE 754 floating-point arithmetic produces precision drift (e.g., `0.1 + 0.2 !== 0.3`). Multiplying user-supplied float rupee numbers by 100 before converting to `BigInt` could cause fractional rounding anomalies.
- **Fix:** Implemented string-based decimal parsing in [`src/lib/money.js`](file:///c:/Users/vivek/Desktop/Selling%20Projects/AdearnAI/src/lib/money.js). Splits string at the decimal point, normalizes the fractional portion to exactly two digits, and casts the combined string directly to `BigInt`.
- **Evidence:** Tested with `100.50`, `100.5`, `0.05`, and verified that inputs with $>2$ decimal places (`100.555`) throw descriptive errors.

### ISSUE-02: Absence of Balanced Double-Entry General Journal
- **Root Cause:** Original schema stored money movements solely in a single-entry table with a single `walletId`, making it impossible to produce a balanced trial balance or audit cash vs liability accounts.
- **Fix:** Introduced standard Chart of Accounts (`1010_NODAL_BANK_ASSET`, `2010_ADVERTISER_ESCROW_LIABILITY`, `2020_CAMPAIGN_RESERVE_LIABILITY`, `2030_CREATOR_PAYABLE_LIABILITY`, `4010_PLATFORM_FEE_REVENUE`). Every business transaction now posts equal Debits and Credits via `DoubleEntryLedger.postBalancedTransaction()`.
- **Evidence:** Automated reconciliation script `scripts/reconcile_ledger.js` audits all transactions and verifies zero imbalance.

### ISSUE-03: Concurrency Race Condition on Simultaneous Withdrawals
- **Root Cause:** In MySQL with default Repeatable Read isolation, consecutive `SELECT` followed by `UPDATE` allows concurrent transactions to read the same starting balance snapshot simultaneously. In a 5-thread concurrent simulation, 5 withdrawals of ₹100 from a ₹100 wallet would all succeed, resulting in a ₹-400 overdraft!
- **Fix:** Replaced non-locking application checks with database-level atomic conditional updates:
  ```sql
  UPDATE Wallet SET availablePaise = availablePaise - :debit WHERE id = :id AND availablePaise >= :debit;
  ```
  MySQL InnoDB acquires an exclusive row-level lock, re-evaluates the condition against the most recent committed state, and returns `affectedRows = 0` for subsequent concurrent transactions.
- **Evidence:** 5 simultaneous parallel requests in `test/financial_integrity.test.js` resulted in exactly 1 success, 4 rejections, and final balance at ₹0.00.
