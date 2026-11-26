# AdEarn AI — Institutional Financial Ledger Specification
## Double-Entry General Journal, Chart of Accounts, Exact Currency Engine, and Reconciliation Formulas

---

## 1. Foundational Accounting Principles

AdEarn AI implements institutional **Double-Entry General Ledger Accounting**. Every economic event affecting the platform produces an atomic set of debit and credit entries such that:

$$\sum \text{Debits} \equiv \sum \text{Credits}$$

### Core Financial Invariants:
1. **Integer Minor Units:** All financial values are expressed in Indian paise ($1\text{ INR} = 100\text{ paise}$) as 64-bit integer (`BigInt`) values. Floating-point mathematics is strictly prohibited.
2. **Fractional Paise Rejection:** Inputs with more than two decimal digits (e.g. `10.555`) are rejected as malformed.
3. **No Overdraft Guarantee:** Wallet balances can never drop below zero. Enforced via database-level conditional queries:
   ```sql
   UPDATE Wallet SET availablePaise = availablePaise - ? WHERE id = ? AND availablePaise >= ?;
   ```
4. **Append-Only Immutability:** Journal transactions and entries are strictly append-only. Corrections and reversals are posted as explicit compensating entries.
5. **Separation of Reservation and Settlement:** Withdrawing funds debits the available balance immediately to prevent double-spending, while the external bank clearing operates asynchronously.

---

## 2. Standard Chart of Accounts

| Account Code | Account Name | Account Type | Normal Balance | Economic Purpose |
|---|---|---|---|---|
| `1010_NODAL_BANK_ASSET` | Nodal Escrow Bank Account | **ASSET** | Debit | Cash held in authorized institutional nodal settlement bank account (HDFC / ICICI). |
| `2010_ADVERTISER_ESCROW_LIABILITY` | Advertiser Escrow Deposits | **LIABILITY** | Credit | Unallocated escrow funds deposited by corporate advertisers awaiting campaign flight allocation. |
| `2020_CAMPAIGN_RESERVE_LIABILITY` | Active Campaign Budget Reserves | **LIABILITY** | Credit | Escrow funds locked to active campaigns, reserved for creator task reward obligations. |
| `2030_CREATOR_PAYABLE_LIABILITY` | Creator Withdrawable Earnings | **LIABILITY** | Credit | Withdrawable earnings verified and owed to creators. Reconciles to sum of creator available wallets. |
| `2040_CREATOR_PENDING_LIABILITY` | Creator Pending Rewards Reserve | **LIABILITY** | Credit | Tasks submitted and awaiting SLA validation hold. |
| `4010_PLATFORM_FEE_REVENUE` | Platform Facilitation Revenue | **REVENUE** | Credit | Platform margins, campaign service fees, and GST collections. |

---

## 3. General Journal Posting Matrix

| Business Event | Debited Account (Dr) | Credited Account (Cr) | Wallet Projection Updates |
|---|---|---|---|
| **Advertiser Top-Up (RTGS/UPI)** | `1010_NODAL_BANK_ASSET` | `2010_ADVERTISER_ESCROW_LIABILITY` | Advertiser Wallet `escrowPaise` $(+A)$ |
| **Campaign Escrow Lock** | `2010_ADVERTISER_ESCROW_LIABILITY` | `2020_CAMPAIGN_RESERVE_LIABILITY` | Advertiser Wallet `escrowPaise` $(-A)$ |
| **Campaign Expiry / Escrow Release** | `2020_CAMPAIGN_RESERVE_LIABILITY` | `2010_ADVERTISER_ESCROW_LIABILITY` | Advertiser Wallet `escrowPaise` $(+A)$ |
| **Creator Reward Approval (CPO Web Tasks)** | `2020_CAMPAIGN_RESERVE_LIABILITY` | `2030_CREATOR_PAYABLE_LIABILITY` | Creator Wallet `availablePaise` $(+A)$, `lifetimeEarnedPaise` $(+A)$ |
| **Creator Impression Reward (CPM Extension)** | `2020_CAMPAIGN_RESERVE_LIABILITY` (Total Charge: $C$) | `2030_CREATOR_PAYABLE_LIABILITY` (Creator Reward: $R$)<br>`4010_PLATFORM_FEE_REVENUE` (Platform Margin: $C - R$) | Creator Wallet `availablePaise` $(+R)$, `lifetimeEarnedPaise` $(+R)$ |
| **Creator Withdrawal Request** | `2030_CREATOR_PAYABLE_LIABILITY` | `1010_NODAL_BANK_ASSET` | Creator Wallet `availablePaise` $(-A)$, `lifetimePaidPaise` $(+A)$ |
| **Payout Definitive Failure** | `1010_NODAL_BANK_ASSET` | `2030_CREATOR_PAYABLE_LIABILITY` | Creator Wallet `availablePaise` $(+A)$, `lifetimePaidPaise` $(-A)$ |
| **Administrative Adjustment (Credit)**| `1010_NODAL_BANK_ASSET` | `2030_CREATOR_PAYABLE_LIABILITY` | Creator Wallet `availablePaise` $(+A)$ |

---

## 4. Payout State Machine & Failure Recovery

```
                      [ Creator Submits Withdrawal ]
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             ATOMIC RESERVATION & DEBIT                 │
       │  1. Conditional Check: availablePaise >= amountPaise   │
       │  2. Post Double-Entry Journal (Dr 2030, Cr 1010)       │
       │  3. Create PayoutRequest (status: PROCESSING)          │
       │     outboxStatus: PENDING_DISPATCH                     │
       └────────────────────────────┬───────────────────────────┘
                                    │
                        [ Dispatched to Gateway ]
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
 (Immediate Success)         (Network Timeout)         (Definitive Rejection)
         ▼                          ▼                          ▼
 ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
 │    CLEARED    │          │ RECONCILIATION│          │    FAILED     │
 │ Store UTR     │          │    PENDING    │          │ Atomic Comp.  │
 │ outboxStatus: │          │ outboxStatus: │          │ Reversal:     │
 │ COMPLETED     │          │ RETRY_RECON   │          │ Dr 1010       │
 └───────────────┘          │ (NO REFUND!)  │          │ Cr 2030       │
                            └───────┬───────┘          │ outboxStatus: │
                                    │                  │ TERM_FAILED   │
                            [ Authoritative ]          └───────────────┘
                            [ Webhook / UTR ]
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
              [ Confirmed ]                 [ Definitive Fail ]
              Status -> CLEARED             Status -> FAILED + Reversal
```

### Invariants:
1. **No False Reversals:** A gateway timeout or transient HTTP 504 error MUST NOT trigger an automatic refund. The request enters `RECONCILIATION_PENDING` until an authoritative webhook or bank portal query confirms terminal failure.
2. **At Most One Reversal:** Payout failure recovery uses a database-level conditional transition:
   ```sql
   UPDATE PayoutRequest SET status = 'FAILED' WHERE id = ? AND status IN ('REQUESTED', 'PROCESSING', 'RECONCILIATION_PENDING');
   ```
   If zero rows are updated, duplicate reversals are strictly prevented.

---

## 5. Mathematical Reconciliation Equations

Automated daily reconciliation (`scripts/reconcile_ledger.js`) evaluates these exact equations across MySQL:

### 1. General Journal Equilibrium:
$$\sum_{\text{All Entries}} \text{Amount}_{\text{DEBIT}} - \sum_{\text{All Entries}} \text{Amount}_{\text{CREDIT}} \equiv 0$$

### 2. Creator Withdrawable Liability Reconciliation:
$$\sum \text{Wallet.availablePaise} \equiv \text{Net Credits to } `2030\_CREATOR\_PAYABLE\_LIABILITY`$$

### 3. Advertiser Escrow Liability Reconciliation:
$$\sum \text{Wallet.escrowPaise} \equiv \text{Net Credits to } `2010\_ADVERTISER\_ESCROW\_LIABILITY`$$

### 4. Conservation of Cash:
$$\text{Bank Balance} \ge \sum \text{Creator Available} + \sum \text{Advertiser Escrow} + \sum \text{Campaign Reserves}$$

---

## 6. CPM Monetary Arithmetic & Cumulative Delta Aggregation

To guarantee zero fractional paise loss when serving ads on a per-impression basis, AdEarn AI employs **Cumulative Marginal Delta Aggregation** using pure `BigInt` integer arithmetic.

### 1. Cumulative Valuation Formula:
For $N$ validated impressions at rate $C$ (in paise per 1,000 impressions):
$$\text{CumulativePaise}(N, C) = \left\lfloor \frac{N \times C}{1000} \right\rfloor$$

### 2. Marginal Delta per Batch / Impression:
When transitioning a campaign from $N_{\text{prior}}$ impressions by adding $k$ new impressions:
$$\Delta \text{ChargePaise} = \left\lfloor \frac{(N_{\text{prior}} + k) \times C_{\text{advertiser}}}{1000} \right\rfloor - \left\lfloor \frac{N_{\text{prior}} \times C_{\text{advertiser}}}{1000} \right\rfloor$$
$$\Delta \text{RewardPaise} = \left\lfloor \frac{(N_{\text{prior}} + k) \times R_{\text{creator}}}{1000} \right\rfloor - \left\lfloor \frac{N_{\text{prior}} \times R_{\text{creator}}}{1000} \right\rfloor$$
$$\Delta \text{PlatformFeePaise} = \Delta \text{ChargePaise} - \Delta \text{RewardPaise}$$

### 3. Zero Fractional-Loss Theorem:
Over any sequence of $M$ individual impression arrivals:
$$\sum_{i=1}^M \Delta \text{ChargePaise}_i \equiv \left\lfloor \frac{M \times C_{\text{advertiser}}}{1000} \right\rfloor$$
Residual fractional paise are retained implicitly within the integer division state across flights and reconciled upon campaign completion. Fractional paise are never rounded up or gifted without backing escrow reserves.

---

## 7. Transaction Concurrency, Locking Strategy & Idempotency Model

### 1. MySQL InnoDB Row Locking Strategy
To prevent race conditions where simultaneous impressions read stale prior impression counts, AdEarn AI employs exclusive row-level locking:
```sql
SELECT id, title, status, pricingModel, cpmRatePaise, creatorImpressionRewardPaise, 
       budgetAllocatedPaise, budgetSpentPaise, impressionsCount, organizationId
FROM Campaign 
WHERE id = ? 
FOR UPDATE;
```
- **Execution Invariant:** All concurrent impression arrivals for a given campaign are serialized at the database engine level.
- **Authoritative Prior State:** Each transaction reads the incremented `impressionsCount` committed by the preceding transaction, guaranteeing that marginal delta charges and rewards are computed from the true serialized sequence.
- **Unified Transaction Boundary:** The lock acquisition, budget check, campaign update, impression insertion, General Journal entry creation, and creator wallet credit execute within a single atomic database transaction (`isolationLevel: 'ReadCommitted'`, `maxWait: 10000`, `timeout: 15000`).

### 2. Multi-Tier Idempotency Model
1. **Event Identifier Uniqueness:** Every impression is identified by a client-provided `eventId` backed by a database-enforced unique index (`@unique @db.VarChar(64)`).
2. **Token Digest Anti-Replay Defense:** To prevent replaying identical signed tokens under fabricated event IDs, the SHA-256 digest of the raw session token is indexed with a database-enforced unique index (`@unique @db.VarChar(64)`). Replays return HTTP 409 Conflict.
3. **Ledger Transaction Idempotency:** Financial journal postings declare an `idempotencyKey = IMPRESSION-${eventId}`. Replayed requests detect existing journal transactions and abort duplicate ledger postings.

### 3. Compensating Reversals & Failure Recovery
AdEarn AI adheres to strict append-only financial accounting:
1. **No Destructive Edits:** Historical journal entries and ledger records are never updated or deleted.
2. **Atomic Compensating Entries:**
   - If an external banking payout definitively fails, the system executes an atomic compensating transaction:
     - Debit `1010_NODAL_BANK_ASSET` for the refunded principal.
     - Credit `2030_CREATOR_PAYABLE_LIABILITY` for the refunded principal.
     - Atomically credit the creator's wallet `availablePaise`.
3. **Ambiguous Timeout Treatment:**
   - Network timeouts and transient gateway HTTP 504 errors transition to `RECONCILIATION_PENDING`. Funds remain reserved, preventing double-spending while awaiting authoritative bank clearing reconciliation.


