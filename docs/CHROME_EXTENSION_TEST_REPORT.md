# Chrome Extension Manifest V3 Companion Test Report — AdEarn AI

**Component Scope:** Chrome Manifest V3 Browser Companion Popup (Stitch Screen 20)  
**Location:** `extension/` (`manifest.json`, `popup.html`, `popup.js`) & Web Simulator (`/extension`)  
**Backend Bridge:** `GET /api/extension/session`

---

## 1. Extension Architecture & Security Posture

The AdEarn AI Chrome Extension is designed strictly as a lightweight account-linking companion to the primary web platform:

- **Manifest Version**: Manifest V3 (`"manifest_version": 3`).
- **Narrow Permissions**: Requests `storage` only for local session caching. **Zero invasive permissions**: no `tabs`, no `<all_urls>`, no `webNavigation`, and no web request interception.
- **Zero Ad Injection**: Does not alter DOM on third-party websites or inject advertisements into browsing sessions.
- **Shared Authoritative Truth**: All displayed balances (`availablePaise`, `pendingPaise`) and eligible campaign counts are queried directly from the primary Next.js backend and live MySQL database.
- **Cookie-Based Identity**: Uses existing browser session cookies with HttpOnly security, preventing token theft from untrusted client scripts.

---

## 2. Test Scenarios Executed & Verified

| Test Scenario | Expected Behavior | Actual Observed Result | Status |
|---|---|---|:---:|
| **1. Unauthenticated State** | Shows `"₹0.00"`, `"Please log in to your account"`, and link to web platform | Popup rendered unauthenticated state; balance displayed ₹0.00 | **PASS** |
| **2. Authenticated State** | Queries `/api/extension/session` with session cookie; displays live creator balance | Popup displayed creator name, KYC tier, available balance, and pending hold | **PASS** |
| **3. Live Task Update Reflection** | Completing task on web platform immediately reflects in extension balance | After task submission, re-querying session endpoint displayed incremented balance | **PASS** |
| **4. Eligible Campaigns Count** | Dynamic query of active campaigns in database | Returned exact count of active approved campaigns matching live feed | **PASS** |
| **5. Platform Deep-Link** | Clicking "Open Full Web Platform" launches `http://localhost:3000` | Browser tab opened to target portal without credential exposure | **PASS** |
| **6. Offline / API Error** | Server down or network disconnected shows honest error | Displayed `"Offline - Could not connect to AdEarn API"`; zero fake fallback values | **PASS** |
| **7. Manifest V3 Validation** | Valid JSON schema adhering to Google Chrome Web Store policies | Manifest validated without deprecated V2 fields or security warnings | **PASS** |

---

## 3. Extension Installation & Verification Instructions

To test the extension live in Google Chrome:

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** in the top-left toolbar.
4. Select the `extension/` directory within this project:
   `c:\Users\vivek\Desktop\Selling Projects\AdearnAI\extension`
5. The **AdEarn AI Companion** icon will appear in the Chrome toolbar.
6. Click the extension icon to open the popup. It connects dynamically to `http://localhost:3000/api/extension/session`.
