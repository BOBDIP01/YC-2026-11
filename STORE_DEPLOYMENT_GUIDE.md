# YouConnect — App Store & Google Play Store Deployment & Launch Guide

This guide details the exact steps to build, configure, test, and submit **YouConnect** (`com.youconnect.app`) to the **Apple App Store** and **Google Play Store** using **Firebase** and **RevenueCat**.

---

## 1. Prerequisites & Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Populate the required secrets in `.env`:
```env
# 1. Google Gemini AI & Public Host
GEMINI_API_KEY="AIzaSy..."
APP_URL="https://youconnect.app"
VITE_API_BASE_URL="https://api.youconnect.app"
VITE_PUBLIC_WEB_ORIGIN="https://youconnect.app"

# 2. Firebase Project Credentials (from Firebase Console -> Project Settings)
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="youconnect-prod.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="youconnect-prod"
VITE_FIREBASE_STORAGE_BUCKET="youconnect-prod.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
VITE_FIREBASE_APP_ID="1:1234567890:web:abcdef..."
VITE_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"

# 3. RevenueCat Public API Keys (from RevenueCat Dashboard -> Project Settings -> API Keys)
VITE_REVENUECAT_APPLE_API_KEY="appl_xxxxxxxxxxxxxxxxxxxxxxxxxx"
VITE_REVENUECAT_GOOGLE_API_KEY="goog_xxxxxxxxxxxxxxxxxxxxxxxxxx"
VITE_REVENUECAT_WEB_API_KEY="rcob_xxxxxxxxxxxxxxxxxxxxxxxxxx"
REVENUECAT_WEBHOOK_AUTH_SECRET="rc_whsec_xxxxxxxxxxxxxxxxxxxx"

# 4. Universal Links & App Links
APPLE_TEAM_ID="YOUR_10_CHAR_TEAM_ID"
ANDROID_CERT_SHA256="FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
```

---

## 2. Firebase Console Configuration

1. **Enable Authentication Providers** (in *Firebase Console &rarr; Build &rarr; Authentication &rarr; Sign-in method*):
   - **Email/Password**: Enable.
   - **Apple** (Mandatory for App Store Guideline 4.8):
     - Enable Apple sign-in.
     - Add your Apple Services ID (`com.youconnect.app.signin`), Team ID, and Key ID.
   - **Google**:
     - Enable Google sign-in and configure support email.
2. **Deploy Cloud Firestore Security Rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```
   *(Uses [firestore.rules](file:///Users/roberto/YC-2026-11/firestore.rules) with UID-scoped security and document size bounds).*
3. **Deploy Firebase Cloud Storage Security Rules**:
   ```bash
   firebase deploy --only storage
   ```
   *(Uses [storage.rules](file:///Users/roberto/YC-2026-11/storage.rules) restricting uploads to 10 MB images/videos/PDFs).*

---

## 3. RevenueCat Configuration

1. **Create Entitlements** (in *RevenueCat Dashboard &rarr; Project &rarr; Entitlements*):
   - Identifier: `basic_access` (Description: *Unlocks Basic Tier Features*)
   - Identifier: `business_access` (Description: *Unlocks Business Pro Tier & CRM*)
2. **Create Products in App Store Connect & Google Play Console**:
   - `youconnect_basic_monthly`: Auto-Renewable Subscription (\$12.00 / month)
     - Attached Entitlement: `basic_access`
   - `youconnect_business_monthly`: Auto-Renewable Subscription (\$29.00 / month)
     - Attached Entitlement: `business_access`
   - `youconnect_ai_booster_50`: Consumable In-App Purchase (\$14.99)
     - Consumable granting +50 AI Quota Coins (valid 90 days)
3. **Configure RevenueCat Offerings**:
   - Create an Offering with identifier `default`
   - Add packages:
     - Package `$rc_monthly` &rarr; `youconnect_business_monthly` (or `youconnect_basic_monthly`)
     - Custom Package `ai_booster_50` &rarr; `youconnect_ai_booster_50`
4. **Configure Server-to-Server Webhook**:
   - In *RevenueCat &rarr; Project &rarr; Integrations &rarr; Webhooks*:
     - Webhook URL: `https://api.youconnect.app/api/webhooks/revenuecat`
     - Authorization Header: `Bearer rc_whsec_xxxxxxxxxxxxxxxxxxxx` (matches `REVENUECAT_WEBHOOK_AUTH_SECRET`)

---

## 4. Install Dependencies & Build Mobile Shells

Run the following commands in your terminal:

```bash
# 1. Install all dependencies (Capacitor, Firebase, RevenueCat)
npm install

# 2. Build the production React/Vite bundle
npm run build

# 3. Initialize native iOS & Android projects (first time only)
npx cap add ios
npx cap add android

# 4. Generate native icons & splash screens from public/ PNGs
npx @capacitor/assets generate

# 5. Sync the web bundle and plugins into Xcode & Android Studio
npm run cap:sync
```

---

## 5. Apple App Store Submission (iOS)

1. **Open Xcode**:
   ```bash
   npm run cap:open:ios
   ```
2. **Signing & Capabilities**:
   - Select the `App` target &rarr; *Signing & Capabilities*.
   - Set your **Development Team**.
   - Confirm the following Capabilities are active:
     - **Sign in with Apple**
     - **Near Field Communication Tag Reading**
     - **Associated Domains**: `applinks:youconnect.app`
3. **Verify Privacy Manifest (`PrivacyInfo.xcprivacy`)**:
   - Ensure [ios/App/App/PrivacyInfo.xcprivacy](file:///Users/roberto/YC-2026-11/ios/App/App/PrivacyInfo.xcprivacy) is included in the *Copy Bundle Resources* build phase (declaring `CA92.1`, `C617.1`, `35F9.1`, and `E174.1`).
4. **App Store Connect Metadata**:
   - **Privacy Policy URL**: `https://youconnect.app/privacy`
   - **Terms of Use (EULA) URL**: `https://youconnect.app/terms`
   - **Account Deletion URL**: `https://youconnect.app/delete-account`
   - **App Review Demo Credentials**: Provide a test email and password created in Firebase Auth.
5. **Archive & Upload**:
   - In Xcode: *Product &rarr; Archive &rarr; Distribute App &rarr; App Store Connect*.

---

## 6. Google Play Store Submission (Android)

1. **Open Android Studio**:
   ```bash
   npm run cap:open:android
   ```
2. **Google Play Billing Setup**:
   - RevenueCat automatically injects the `com.android.vending.BILLING` permission via `@revenuecat/purchases-capacitor`.
3. **Add `google-services.json`**:
   - Download `google-services.json` from Firebase Console and place it into `android/app/google-services.json`.
4. **Google Play Console Data Safety Declaration**:
   - **Name, Email, Phone**: Collected for App Functionality (Account & Contact Sharing).
   - **Financial Info**: Purchases handled natively by Google Play Billing.
   - **Ephemeral Biometrics**: Transient KYC liveness; raw frames are never stored or transferred.
   - **Account Deletion Link**: Enter `https://youconnect.app/delete-account`.
5. **Build Release AAB (Android App Bundle)**:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   - Upload `android/app/build/outputs/bundle/release/app-release.aab` to Google Play Console (*Production* or *Internal Testing*).

---

## 7. Post-Launch Verification

- [ ] Perform a test subscription purchase using Apple StoreKit 2 Sandbox.
- [ ] Perform a test purchase using Google Play License Testing.
- [ ] Verify that RevenueCat webhooks deliver to `/api/webhooks/revenuecat`.
- [ ] Test NFC tag write & scan on physical iPhone (iOS 13+) and Android devices.
- [ ] Verify that scanning `/p/:slug` opens the native app via Universal Links / App Links.
- [ ] Verify account deletion from within the app and via the external `/delete-account` portal.

