# PAYMENT PROVIDER & CLEARING GATEWAY CONFIGURATION
**AdEarn AI — Payment Adapter & Nodal Clearing Documentation**  
**Document Version:** 1.0.0  
**Effective Date:** October 18, 2026  

---

## 1. Adapter Architecture & Interface

All disbursement and clearing operations run through the institutional `IPayoutAdapter` interface (`src/lib/payout-adapter.ts`). This isolates the core application from specific banking APIs and enables testing in development while maintaining complete production fidelity.

### Interface Contract:

```typescript
export interface PayoutRequestPayload {
  payoutId: string;
  amountPaise: bigint;
  destinationAddress: string;
  destinationType: 'UPI' | 'BANK_ACCOUNT';
  name: string;
  notes?: string;
}

export interface PayoutResult {
  success: boolean;
  status: 'CLEARED' | 'PROCESSING' | 'FAILED';
  utrNumber?: string;
  failureReason?: string;
  rawResponse: Record<string, any>;
}

export interface IPayoutAdapter {
  initiatePayout(payload: PayoutRequestPayload): Promise<PayoutResult>;
  verifyStatus(payoutId: string, utrNumber?: string): Promise<PayoutResult>;
}
```

---

## 2. Supported Adapters

### A. Institutional Sandbox Adapter (`SandboxPayoutAdapter`)
- **Default Mode:** Active when `PAYOUT_MODE=sandbox` or live credentials are omitted.
- **Behavior:**
  - Validates destination syntax (UPI VPA or Bank Account).
  - Deterministically generates Indian banking UTR references: `UTR-NPCI-${timestamp}${randomSuffix}` matching standard 12-digit Indian Bank UTR conventions.
  - Returns `CLEARED` status with full banking clearing metadata.
  - Simulates NPCI IMPS / UPI 2.0 clearing pipeline.

### B. Production Live Adapter (RazorpayX / HDFC Nodal)
- **Active Mode:** Enabled when `PAYOUT_MODE=live` and credentials are configured.
- **Protocol:** REST API calls with Basic Authentication over TLS 1.3.
- **Webhook Signature:** Webhook endpoints verify HMAC-SHA256 signatures using the configured webhook secret.

---

## 3. Environment Variables & Safe Placeholders

Below are the required environment variables documented in `.env.example`:

```bash
# ==========================================
# FINANCIAL & PAYMENT GATEWAY CONFIGURATION
# ==========================================

# Operating Mode: 'sandbox' or 'live'
PAYOUT_MODE="sandbox"

# Minimum creator withdrawal threshold in minor units (paise)
# 10000 paise = ₹100.00
MIN_WITHDRAWAL_THRESHOLD_PAISE="10000"

# RazorpayX / Banking Gateway Credentials (Production Only)
RAZORPAYX_KEY_ID="rzp_test_placeholder_key"
RAZORPAYX_KEY_SECRET="placeholder_secret_key"
RAZORPAYX_ACCOUNT_NUMBER="2323230000000000"
RAZORPAYX_WEBHOOK_SECRET="whsec_placeholder_secret"

# HDFC Nodal Reserve Clearing
HDFC_NODAL_ACCOUNT_NUMBER="00010912000045"
HDFC_NODAL_IFSC="HDFC0000001"
HDFC_NODAL_POOL_NAME="AdEarn AI Marketplace Escrow Reserve Pool"
```

---

## 4. Webhook Security & Idempotent Handling

Production webhook endpoints implement:
1. **Signature Verification:** Rejects any webhook payload that does not match the provider's HMAC-SHA256 signature header.
2. **Event Deduplication:** Checks `idempotencyKey` against `LedgerTransaction` before processing. Duplicate events return `HTTP 200 OK` with `duplicate: true` without double-crediting.
3. **Compensating Failure Recovery:** If a webhook reports a terminal payout failure (`payout.failed` / `payout.reversed`), the handler automatically executes `FinancialLedger.postTransaction` with `type: 'PAYOUT_REVERSAL'`.

---

## 5. Transition to Live Production Checklist

- [x] Institutional `IPayoutAdapter` interface implemented.
- [x] Compensating failure recovery tested and operational.
- [x] Integer paise math verified across all balances.
- [ ] Complete formal banking KYC onboarding with nodal bank or payment aggregator.
- [ ] Populate genuine `RAZORPAYX_KEY_ID` and `RAZORPAYX_KEY_SECRET` in production `.env`.
- [ ] Configure live webhook URL (`https://adearn.ai/api/webhooks/payouts`) in provider dashboard.
- [ ] Switch `PAYOUT_MODE="live"`.
