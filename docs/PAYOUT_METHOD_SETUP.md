# CREATOR PAYOUT METHOD CONFIGURATION & INTEGRATION MANUAL
**AdEarn AI — Payout Destination Management (Screen 05 & Screen 06)**  
**Document Version:** 1.0.0  
**Effective Date:** October 18, 2026  

---

## 1. Overview & Data Model

Creators on AdEarn AI can configure and manage verified Indian disbursement destinations without ever leaving the application. Payout destinations are stored in a dedicated relational entity with automatic masking, audit logging, and tenant isolation.

### Prisma Schema Definition (`PayoutMethod`):

```prisma
enum PayoutMethodType {
  UPI
  BANK_ACCOUNT
}

enum PayoutMethodStatus {
  NOT_CONFIGURED
  PENDING_VERIFICATION
  VERIFIED
  REJECTED
  REMOVED
}

model PayoutMethod {
  id                 String             @id @default(cuid())
  userId             String
  type               PayoutMethodType   @default(UPI)
  accountHolderName  String
  destinationAddress String
  maskedAddress      String
  ifscCode           String?
  bankName           String?
  status             PayoutMethodStatus @default(VERIFIED)
  isDefault          Boolean            @default(false)
  verifiedAt         DateTime?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  user               User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  payoutRequests     PayoutRequest[]

  @@index([userId])
  @@index([status])
}
```

---

## 2. Validation & Masking Rules

### A. Unified Payments Interface (UPI 2.0 / VPA)
- **Validation Regex:** `/^[\w.-]+@[\w.-]+$/`
- **Permitted Handles:** Any standard bank/PSP provider (`@okhdfcbank`, `@oksbi`, `@okaxis`, `@paytm`, `@ybl`, etc.).
- **Masking Standard:** Retains the first two characters and last two characters of the handle, masking the middle characters with asterisks:
  $$\text{rohansharma@okhdfcbank} \longrightarrow \text{ro*******ma@okhdfcbank}$$
  $$\text{arun@okaxis} \longrightarrow \text{ar**@okaxis}$$

### B. Indian Bank Account (IMPS / NEFT)
- **Account Number:** Cleaned of whitespace; constrained to 9 to 18 digits (`/^\d{9,18}$/`).
- **IFSC Code:** Exact 11-character Indian Financial System Code (`/^[A-Z]{4}0[A-Z0-9]{6}$/`).
- **Masking Standard:** All digits masked except the last 4:
  $$\text{50100293848123} \longrightarrow \text{••••••••8123}$$

### C. Security Policy
- **Zero PIN Storage:** AdEarn AI strictly never requests or stores UPI PINs, ATM PINs, banking passwords, or card CVVs.
- **Masked by Default:** All frontend responses from `/api/payout-methods` and `/api/payouts` deliver `maskedAddress`. The raw `destinationAddress` is protected and accessed solely by the institutional payment adapter when submitting clearing batches.

---

## 3. Payout Method API Endpoints

### 1. List Payout Methods
- **Endpoint:** `GET /api/payout-methods`
- **Authorization:** `USER` or `ADMIN`
- **Response Example:**
  ```json
  {
    "payoutMethods": [
      {
        "id": "cmve89a10001...",
        "type": "UPI",
        "accountHolderName": "Arun Kumar",
        "maskedAddress": "ar*******ut@okhdfcbank",
        "bankName": null,
        "ifscCode": null,
        "status": "VERIFIED",
        "isDefault": true,
        "createdAt": "2026-10-18T15:10:00.000Z"
      }
    ],
    "count": 1
  }
  ```

### 2. Add New Payout Destination
- **Endpoint:** `POST /api/payout-methods`
- **Payload (UPI):**
  ```json
  {
    "type": "UPI",
    "accountHolderName": "Arun Kumar",
    "upiId": "arun.payout@okhdfcbank",
    "makeDefault": true
  }
  ```
- **Payload (Bank Account):**
  ```json
  {
    "type": "BANK_ACCOUNT",
    "accountHolderName": "Arun Kumar",
    "accountNumber": "50100293848123",
    "ifscCode": "HDFC0001234",
    "bankName": "HDFC Bank Ltd.",
    "makeDefault": true
  }
  ```

### 3. Set Default Payout Method
- **Endpoint:** `PUT /api/payout-methods`
- **Payload:** `{"payoutMethodId": "cmve89a...", "makeDefault": true}`

### 4. Remove Payout Destination
- **Endpoint:** `DELETE /api/payout-methods?id=cmve89a...`
- **Action:** Soft-deletes the method (`status: 'REMOVED'`), preserving historical links on existing `PayoutRequest` records.

---

## 4. UI Screen Integrations

### Screen 05: Withdrawals & Payout History (`/withdrawals`)
1. **Dynamic Selector:** Displays all configured methods as interactive cards showing type, masked address, and default status.
2. **Inline Add Modal:** Allows adding a new UPI VPA or Bank Account without leaving the page.
3. **Instant Validation:** Pre-validates format before API dispatch.
4. **Confirmation Modal:** Displays withdrawal amount, fee disclosure (₹0.00 zero fee), and masked destination before disbursement.

### Screen 06: Profile & Preferences (`/profile`)
1. **Configured Payout Methods List:** Displays all active verified payout methods.
2. **Direct Management Link:** Provides 1-click access to manage and add destinations on `/withdrawals`.
