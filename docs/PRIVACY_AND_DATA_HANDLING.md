# Privacy, Data Handling & DPDP Act Compliance — AdEarn AI

AdEarn AI is designed to comply with the Indian **Digital Personal Data Protection (DPDP) Act, 2023** and **Advertising Standards Council of India (ASCI)** regulations.

---

## 1. Consent Management Architecture

- **Granular Consent**: Users provide explicit consent for account creation, sponsored ad targeting, and transaction notifications.
- **Notice & Withdrawability**: Screen 06 (`/profile`) provides immediate access for users to review active consents or revoke targeted advertising permissions.
- **Audited Consent Changes**: Every consent toggle creates an audit log entry with timestamp and user ID.

---

## 2. Right to Data Erasure & Portability

Under the DPDP Act, data principals hold the right to request erasure and access their data:

1. **Data Portability**: Users can trigger an automated JSON data export containing their profile, task completion history, and financial statements.
2. **Right to Erasure (Account Closure)**:
   - When a user requests account deletion, personal identifiers (name, email, phone number, masked UPI ID) are permanently scrubbed.
   - Authoritative financial transaction records are retained in pseudonymized form for a mandatory 7-year statutory period as required by Indian income tax and RBI financial compliance laws.

---

## 3. Financial & Sensitive Data Masking

- Bank account numbers and UPI IDs are stored and displayed strictly in masked format (e.g. `arun****@okaxis`, `SBIN000****1234`).
- Banking passwords, ATM PINs, and UPI PINs are **never requested, accepted, or stored** anywhere on the platform.
