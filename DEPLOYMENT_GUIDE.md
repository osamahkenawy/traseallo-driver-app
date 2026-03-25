# Traseallo Driver App — Deployment Guide

> **Company**: Trasealla Solutions Limited (UAE, Masdar City Free Zone)  
> **Licence No.**: MC 14272 — Valid until 15 December 2026  
> **Legal Status**: Limited Liability Company  
> **Manager**: Osama Alaaeldin Mahmoud Ramadan Kenawy  
> **System**: Traseallo — Delivery & Dispatch System  
> **App**: Traseallo Driver App — for delivery drivers to manage pickups, deliveries, routes, and proof of delivery  
>
> Full step-by-step guide to publish the app on **Apple App Store** and **Google Play Store**.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Pre-Deployment Checklist](#2-pre-deployment-checklist)
3. [Version & Build Number Management](#3-version--build-number-management)
4. [Apple App Store Deployment (iOS)](#4-apple-app-store-deployment-ios)
   - 4.1 [Apple Developer Account Setup](#41-apple-developer-account-setup)
   - 4.2 [Certificates & Provisioning Profiles](#42-certificates--provisioning-profiles)
   - 4.3 [Xcode Project Configuration](#43-xcode-project-configuration)
   - 4.4 [Build the Release Archive](#44-build-the-release-archive)
   - 4.5 [Upload to App Store Connect](#45-upload-to-app-store-connect)
   - 4.6 [App Store Connect Submission](#46-app-store-connect-submission)
   - 4.7 [App Review & Release](#47-app-review--release)
5. [Google Play Store Deployment (Android)](#5-google-play-store-deployment-android)
   - 5.1 [Google Developer Account Setup](#51-google-developer-account-setup)
   - 5.2 [Create Release Signing Key](#52-create-release-signing-key)
   - 5.3 [Configure Gradle for Release Signing](#53-configure-gradle-for-release-signing)
   - 5.4 [Build the Release AAB](#54-build-the-release-aab)
   - 5.5 [Google Play Console Setup](#55-google-play-console-setup)
   - 5.6 [Upload & Submit to Play Store](#56-upload--submit-to-play-store)
   - 5.7 [Play Store Review & Release](#57-play-store-review--release)
6. [Post-Release Tasks](#6-post-release-tasks)
7. [Common Issues & Fixes](#7-common-issues--fixes)
8. [Current Project Warnings](#8-current-project-warnings)

---

## 1. Prerequisites

### Accounts Required

| Account | URL | Cost |
|---------|-----|------|
| Apple Developer Program | https://developer.apple.com/programs/ | $99/year |
| Google Play Developer Console | https://play.google.com/console/ | $25 one-time |

### Tools Required

| Tool | Required Version | Purpose |
|------|-----------------|---------|
| Xcode | 14+ (latest recommended) | iOS build & archive |
| Android Studio | Latest | Android build tools & SDK |
| Java JDK | 11+ | Android signing |
| Node.js | 16+ | React Native CLI |
| CocoaPods | Latest | iOS dependency manager |
| Ruby | 2.7+ | For CocoaPods / Gemfile |

### Installed on your machine

```bash
# Verify all tools
node --version         # Should be 16+
npx react-native --version
xcodebuild -version    # Xcode version
java -version          # JDK 11+
pod --version          # CocoaPods
ruby --version
```

---

## 2. Pre-Deployment Checklist

- [ ] **App icon** — All sizes generated for iOS and Android (use `generate_icons.py`)
- [ ] **Splash screen** — Configured and displays correctly
- [ ] **App name** — Finalized: `Traseallo Driver` (or `Traseallo`)
- [ ] **Bundle identifiers** — Finalized and consistent
  - iOS: `com.trasealla.driver`
  - Android: **Change `com.app` → `com.trasealla.driver`** (see [Section 8](#8-current-project-warnings))
- [ ] **API endpoints** — Pointing to **production** server (not staging/localhost)
- [ ] **Firebase** — Production `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are in place
- [ ] **Push notifications** — Working on production Firebase project
- [ ] **Maps API key** — Production key with proper restrictions
- [ ] **Permissions** — Only requesting permissions the app actually uses
- [ ] **Console logs / debug code** — Removed or disabled for release
- [ ] **Error tracking** — Crashlytics / Sentry configured (recommended)
- [ ] **Privacy policy URL** — Required by both stores
- [ ] **Terms of service URL** — Recommended
- [ ] **Support email / URL** — Required by both stores
- [ ] **Screenshots** — Prepared for all required device sizes
- [ ] **App description** — Written (short + full)
- [ ] **Test on real devices** — iOS and Android physical devices

---

## 3. Version & Build Number Management

### Understanding versioning

| Field | iOS Name | Android Name | Purpose |
|-------|----------|-------------|---------|
| User-visible version | `MARKETING_VERSION` | `versionName` | Shown on store (e.g. `1.0.0`) |
| Internal build number | `CURRENT_PROJECT_VERSION` | `versionCode` | Must increment every upload |

### Current values

- **iOS** (`com.trasealla.driver`): `CURRENT_PROJECT_VERSION = 1`, `MARKETING_VERSION = not set` → need to set
- **Android** (`com.trasealla.driver`): `versionCode = 1`, `versionName = "1.0"`

### Rules
- **versionCode** (Android): Must be a unique **integer** that increases with every Play Store upload. E.g. `1, 2, 3...`
- **CURRENT_PROJECT_VERSION** (iOS): Must increase with every App Store Connect upload. E.g. `1, 2, 3...`
- **versionName / MARKETING_VERSION**: Semantic versioning `MAJOR.MINOR.PATCH` (e.g. `1.0.0`, `1.1.0`, `2.0.0`)

---

## 4. Apple App Store Deployment (iOS)

### 4.1 Apple Developer Account Setup

1. **Enroll in the Apple Developer Program**
   - Go to https://developer.apple.com/programs/
   - Sign in with your Apple ID (or create one)
   - Click "Enroll" and follow the steps
   - Pay the **$99/year** fee
   - Approval can take 24-48 hours

   **Your enrollment details:**

   | Field | Value |
   |-------|-------|
   | Legal Entity Name | `Trasealla Solutions Limited` |
   | Entity Type | Limited Liability Company |
   | D-U-N-S Number | *(see below)* |
   | Country | United Arab Emirates |
   | Address | Smart Station, First Floor, Incubator Building, Masdar City, Abu Dhabi, UAE |
   | Phone | +971522200730 |
   | Work Email | Must be `@trasealla.com` domain (not Gmail) |

   **Getting your D-U-N-S Number:**
   - Apple requires a D-U-N-S number to verify your organization
   - Check if Trasealla Solutions Limited already has one:
     1. On the enrollment page, Apple provides a **"Look up"** or **"Check now"** link
     2. Search: Business Name = `Trasealla Solutions Limited`, Country = `United Arab Emirates`, City = `Abu Dhabi`
   - If **not found**, request one for free through Apple's D&B partnership (takes **5-14 business days**)
   - Once issued, return to the enrollment page and enter it

   > ⚠️ **Work Email**: Apple requires an email on your company domain (e.g. `osama@trasealla.com`). A Gmail address like `osamaalaa133@gmail.com` will **not** be accepted for organization enrollment. You need to set up email on your `trasealla.com` domain first.

2. **Create an App ID**
   - Go to https://developer.apple.com/account/resources/identifiers/list
   - Click the **+** button
   - Select **App IDs** → **App**
   - Description: `Traseallo Driver App`
   - Bundle ID: **Explicit** → `com.trasealla.driver`
   - Enable capabilities:
     - ✅ Push Notifications
     - ✅ Maps (if used via entitlements)
     - ✅ Background Modes (for location tracking)
   - Click **Continue** → **Register**

3. **Create the App in App Store Connect**
   - Go to https://appstoreconnect.apple.com/
   - Click **My Apps** → **+** → **New App**
   - Fill in:
     - Platform: **iOS**
     - Name: `Traseallo Driver`
     - Primary Language: English
     - Bundle ID: Select `com.trasealla.driver`
     - SKU: `trasealla-driver-1` (unique identifier, not shown to users)
   - Click **Create**

### 4.2 Certificates & Provisioning Profiles

#### Option A: Automatic Signing (Recommended)

1. Open Xcode: `open ios/app.xcworkspace`
2. Select the **app** target
3. Go to **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** (Trasealla — your Apple Developer account)
6. Xcode will automatically create:
   - Development certificate
   - Distribution certificate
   - Provisioning profiles

#### Option B: Manual Signing

1. **Create a Distribution Certificate**
   - Go to https://developer.apple.com/account/resources/certificates/list
   - Click **+** → Select **Apple Distribution**
   - Follow the CSR (Certificate Signing Request) steps using Keychain Access
   - Download and double-click to install in Keychain

2. **Create a Provisioning Profile**
   - Go to https://developer.apple.com/account/resources/profiles/list
   - Click **+** → Select **App Store Connect**
   - Select App ID: `com.trasealla.driver`
   - Select your Distribution certificate
   - Name: `Traseallo Driver App Store`
   - Download and double-click to install

### 4.3 Xcode Project Configuration

1. **Open the project**
   ```bash
   cd /Users/usama/Desktop/trasealla/delivery_service/driver_app/app
   cd ios && pod install && cd ..
   open ios/app.xcworkspace
   ```

2. **Set the version numbers** in Xcode:
   - Select the **app** target → **General** tab
   - **Display Name**: `Traseallo Driver`
   - **Bundle Identifier**: `com.trasealla.driver`
   - **Version** (Marketing Version): `1.0.0`
   - **Build**: `1`

3. **Set the deployment target**
   - **Minimum Deployments**: iOS 13.0 or higher (recommended; currently set to 12.4)

4. **Select Release scheme**
   - In the top toolbar: **app** → **Edit Scheme**
   - Under **Run** → set Build Configuration to **Release**
   - Under **Archive** → confirm it's set to **Release**

5. **Set the build device**
   - In the top toolbar, select: **Any iOS Device (arm64)** (not a simulator)

6. **Add required capabilities** (Signing & Capabilities tab):
   - Push Notifications
   - Background Modes → Location updates (if tracking driver location)

7. **Info.plist permissions** — Ensure all usage description strings are present:
   - `NSLocationWhenInUseUsageDescription`
   - `NSLocationAlwaysAndWhenInUseUsageDescription`
   - `NSCameraUsageDescription`
   - `NSPhotoLibraryUsageDescription`
   - Any other permissions your app uses

### 4.4 Build the Release Archive

#### Using Xcode (GUI)

1. In Xcode, select **Product** → **Clean Build Folder** (⇧⌘K)
2. Select **Product** → **Archive**
3. Wait for the build to complete (can take 5-15 minutes)
4. The **Organizer** window will open automatically with your archive

#### Using Command Line

```bash
cd /Users/usama/Desktop/trasealla/delivery_service/driver_app/app

# Clean
cd ios && xcodebuild clean -workspace app.xcworkspace -scheme app

# Archive
xcodebuild archive \
  -workspace app.xcworkspace \
  -scheme app \
  -configuration Release \
  -archivePath ../build/Traseallo.xcarchive

cd ..
```

### 4.5 Upload to App Store Connect

#### Using Xcode Organizer (Recommended)

1. In the **Organizer** (Window → Organizer), select your archive
2. Click **"Distribute App"**
3. Select **"App Store Connect"**
4. Select **"Upload"**
5. Options:
   - ✅ Include bitcode (if applicable)
   - ✅ Upload your app's symbols
   - ✅ Manage version and build number
6. Select your **Distribution certificate** and **Provisioning profile**
7. Click **Upload**
8. Wait for upload and processing (5-30 minutes)

#### Using Transporter App (Alternative)

1. Export the archive as an `.ipa` from Xcode Organizer:
   - Select archive → **Distribute App** → **App Store Connect** → **Export**
2. Open the **Transporter** app (download from Mac App Store)
3. Drag and drop the `.ipa` file
4. Click **Deliver**

### 4.6 App Store Connect Submission

Go to https://appstoreconnect.apple.com/ and select your app.

#### App Information Tab

- **Name**: `Traseallo Driver`
- **Subtitle**: e.g. "Delivery & Dispatch Driver App"
- **Category**: Business or Navigation
- **Content Rights**: Confirm you have the rights

#### Pricing & Availability Tab

- **Price**: Free (or your pricing)
- **Availability**: Select countries/regions

#### App Privacy Tab

- **Privacy Policy URL**: `https://your-domain.com/privacy-policy` (REQUIRED)
- **Data collection**: Declare all data types your app collects:
  - Location (for delivery tracking)
  - Contact info (name, email, phone)
  - Identifiers (user ID)
  - Usage data
  - Photos (for proof of delivery)

#### Version Details (under "iOS App" section)

1. **Screenshots** (REQUIRED for each device size):

   | Device | Size (pixels) | Required |
   |--------|--------------|----------|
   | iPhone 6.7" (15 Pro Max) | 1290 × 2796 | Yes |
   | iPhone 6.5" (11 Pro Max) | 1242 × 2688 | Yes |
   | iPhone 5.5" (8 Plus) | 1242 × 2208 | Yes (if supporting) |
   | iPad 12.9" (if iPad support) | 2048 × 2732 | If universal |

   - Minimum **3 screenshots** per device size
   - Maximum **10 screenshots** per device size
   - You can take these on simulators:
     ```bash
     # Run on specific simulator for screenshots
     npx react-native run-ios --simulator="iPhone 15 Pro Max"
     # Take screenshot: ⌘+S in Simulator
     ```

2. **Promotional Text**: Short marketing text (can be updated without review)

3. **Description**: Full app description (max 4000 chars)

4. **Keywords**: Comma-separated (max 100 chars total). E.g.:
   `delivery,driver,tracking,logistics,dispatch,courier,traseallo,trasealla`

5. **Support URL**: `https://your-domain.com/support`

6. **Marketing URL**: (optional)

7. **Build**: Select the build you uploaded

8. **App Review Information**:
   - **Contact**: Your name, phone, email
   - **Demo Account**: Provide login credentials for the review team
     - Username: `review@example.com`
     - Password: `ReviewPassword123`
   - **Notes**: Any special instructions for the reviewer
     - E.g. "This is the driver-side app for the Traseallo delivery & dispatch system by Trasealla. Use the demo account to test order management, route navigation, and proof-of-delivery features."

#### Submit for Review

1. Click **"Add for Review"**
2. Review the submission summary
3. Click **"Submit to App Review"**

### 4.7 App Review & Release

- **Review time**: Typically **24-48 hours** (can be longer for first submission)
- **Possible outcomes**:
  - ✅ **Approved** → App goes live (or scheduled for release)
  - ❌ **Rejected** → You'll get a detailed reason and can resubmit
- **Common rejection reasons**:
  - Missing privacy policy
  - Crashes or bugs during review
  - Incomplete features
  - Missing permission usage descriptions
  - Guideline violations

---

## 5. Google Play Store Deployment (Android)

### 5.1 Google Developer Account Setup

1. **Register for Google Play Developer account**
   - Go to https://play.google.com/console/signup
   - Sign in with your Google account
   - Pay the **$25 one-time** registration fee
   - Fill in developer profile details
   - Verify your identity (may take a few days)

### 5.2 Create Release Signing Key

> ⚠️ **CRITICAL**: Your current release build is using the **debug keystore**. You MUST create a proper release keystore.

#### Generate the keystore

```bash
cd /Users/usama/Desktop/trasealla/delivery_service/driver_app/app/android/app

keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore traseallo-release.keystore \
  -alias traseallo-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You will be prompted for:
- **Keystore password**: Choose a strong password (SAVE THIS)
- **Key password**: Same as keystore password or different (SAVE THIS)
- **First and Last Name**: Your name
- **Organizational Unit**: Your team
- **Organization**: Your company name
- **City, State, Country**: Your location

#### ⚠️ BACKUP YOUR KEYSTORE ⚠️

> **NEVER lose this keystore file or passwords!**
> Without it, you can NEVER update your app on Play Store.

- Copy `traseallo-release.keystore` to a **secure backup** (encrypted cloud storage, password manager)
- Save passwords in a **password manager**
- Store a copy outside the project directory

### 5.3 Configure Gradle for Release Signing

1. **Create `android/gradle.properties` entries** (or use a separate file):

   Add to `android/gradle.properties`:
   ```properties
   TRASEALLO_UPLOAD_STORE_FILE=traseallo-release.keystore
   TRASEALLO_UPLOAD_KEY_ALIAS=traseallo-key
   TRASEALLO_UPLOAD_STORE_PASSWORD=your_keystore_password
   TRASEALLO_UPLOAD_KEY_PASSWORD=your_key_password
   ```

   > ⚠️ **Never commit passwords to git.** Add `gradle.properties` to `.gitignore` or use environment variables.

2. **Update `android/app/build.gradle`**:

   Replace the signing config:
   ```gradle
   android {
       ...
       defaultConfig {
           applicationId "com.trasealla.driver"   // ← FIX: change from "com.app"
           versionCode 1
           versionName "1.0.0"
           ...
       }

       signingConfigs {
           debug {
               storeFile file('debug.keystore')
               storePassword 'android'
               keyAlias 'androiddebugkey'
               keyPassword 'android'
           }
           release {
               if (project.hasProperty('TRASEALLO_UPLOAD_STORE_FILE')) {
                   storeFile file(TRASEALLO_UPLOAD_STORE_FILE)
                   storePassword TRASEALLO_UPLOAD_STORE_PASSWORD
                   keyAlias TRASEALLO_UPLOAD_KEY_ALIAS
                   keyPassword TRASEALLO_UPLOAD_KEY_PASSWORD
               }
           }
       }

       buildTypes {
           debug {
               signingConfig signingConfigs.debug
           }
           release {
               signingConfig signingConfigs.release  // ← Uses release keystore now
               minifyEnabled true                     // ← Enable ProGuard/R8
               shrinkResources true                   // ← Remove unused resources
               proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
           }
       }
   }
   ```

3. **Update ProGuard rules** (`android/app/proguard-rules.pro`):

   Ensure these rules are present for React Native:
   ```proguard
   # React Native
   -keep class com.facebook.hermes.unicode.** { *; }
   -keep class com.facebook.jni.** { *; }

   # Keep native methods
   -keepclassmembers class * {
       @com.facebook.react.bridge.ReactMethod *;
   }

   # OkHttp
   -dontwarn okhttp3.**
   -dontwarn okio.**

   # Firebase
   -keep class com.google.firebase.** { *; }
   ```

### 5.4 Build the Release AAB

> Google Play Store requires **AAB (Android App Bundle)** format, not APK.

```bash
cd /Users/usama/Desktop/trasealla/delivery_service/driver_app/app

# Clean previous builds
cd android && ./gradlew clean

# Build release AAB
./gradlew bundleRelease

cd ..
```

The AAB file will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

#### Verify the AAB

```bash
# Check the AAB size and validity
ls -la android/app/build/outputs/bundle/release/app-release.aab

# (Optional) Build an APK to test on device before uploading
cd android && ./gradlew assembleRelease && cd ..

# Install and test the release APK on a connected device
adb install android/app/build/outputs/apk/release/app-release.apk
```

### 5.5 Google Play Console Setup

1. **Create a new app** in Google Play Console
   - Go to https://play.google.com/console/
   - Click **"Create app"**
   - Fill in:
     - **App name**: `Traseallo Driver`
     - **Default language**: English
     - **App or game**: App
     - **Free or paid**: Free (or Paid)
   - Accept the declarations
   - Click **"Create app"**

2. **Set up your app** — Complete ALL sections in the Dashboard:

   #### Store listing (Main store listing)
   - **App name**: `Traseallo Driver`
   - **Short description** (max 80 chars): e.g. "Trasealla's driver app for managing pickups, deliveries & dispatch"
   - **Full description** (max 4000 chars): Write detailed app description
   - **App icon**: 512 × 512 PNG (32-bit, with alpha)
   - **Feature graphic**: 1024 × 500 PNG or JPEG
   - **Phone screenshots**: Minimum **2**, recommended **8**
     - Minimum size: 320px, Maximum: 3840px
     - Aspect ratio between 16:9 and 9:16
   - **Tablet screenshots**: (if supporting tablets)
   - **Category**: Business or Maps & Navigation
   - **Contact email**: Required
   - **Privacy policy URL**: Required

   #### App content (Content and target audience)
   - **Privacy policy**: Enter URL
   - **App access**: Does the app require login? → Yes → Provide test credentials
   - **Ads**: Does your app contain ads? → Declare
   - **Content rating**: Complete the IARC questionnaire
   - **Target audience**: Select age groups
   - **News apps**: Is this a news app? → No
   - **COVID-19 apps**: Is this a COVID app? → No
   - **Data safety**: Declare all data your app collects:
     - Location (approximate & precise)
     - Personal info (name, email, phone)
     - Photos/videos (proof of delivery)
     - App activity
     - Device identifiers

   #### App signing
   - **Google Play App Signing**: Enroll (RECOMMENDED)
     - Google manages your app signing key
     - You upload with your "upload key" (the keystore you created)
     - If you ever lose your upload key, Google can help reset it

### 5.6 Upload & Submit to Play Store

1. **Go to Release** → **Production** (or start with Internal/Closed testing)

   > 💡 **Recommended**: Do an **Internal testing** release first
   > - Go to **Testing** → **Internal testing** → **Create new release**
   > - Add up to 100 testers by email
   > - This lets you verify everything works before going public

2. **Create a new release**
   - Click **"Create new release"**
   - Upload the AAB file: `android/app/build/outputs/bundle/release/app-release.aab`
   - **Release name**: `1.0.0 (1)` (auto-populated)
   - **Release notes**: Write what's new in this version

3. **Review and roll out**
   - Fix any errors/warnings shown
   - Click **"Review release"**
   - Click **"Start rollout to Production"** (or internal testing)

### 5.7 Play Store Review & Release

- **Review time**: Typically **1-7 days** (first submission can take longer)
- **Possible outcomes**:
  - ✅ **Approved** → App goes live
  - ❌ **Rejected** → You'll get a detailed reason via email
- **Common rejection reasons**:
  - Missing privacy policy
  - Excessive permissions without justification
  - Crashes or ANRs
  - App doesn't match store listing description
  - Data safety form incomplete
  - Missing content ratings

---

## 6. Post-Release Tasks

### After Going Live

- [ ] **Verify the app** is downloadable and works correctly from both stores
- [ ] **Set up monitoring**:
  - Firebase Crashlytics for crash reports
  - Google Play Console's Android Vitals
  - App Store Connect's crash reports
- [ ] **Enable auto-reply** for user reviews in both consoles
- [ ] **Monitor reviews and ratings** — respond to user feedback

### For Future Updates

1. **Increment version numbers**:
   - Bump `versionCode` / `CURRENT_PROJECT_VERSION` (integer, must always increase)
   - Update `versionName` / `MARKETING_VERSION` (e.g. `1.0.0` → `1.1.0`)
2. **Build new archive/AAB**
3. **Upload to App Store Connect / Play Console**
4. **Write release notes**
5. **Submit for review**

### Staged Rollout (Android)

Google Play supports staged rollout — release to a percentage of users first:
- Start at 5-10%
- Monitor crash rate and ANR rate
- Gradually increase to 100%

---

## 7. Common Issues & Fixes

### iOS

| Issue | Fix |
|-------|-----|
| `Provisioning profile doesn't match` | Enable automatic signing or regenerate profile |
| `No accounts with App Store Connect access` | Ensure developer account is enrolled and team is selected |
| `Icon has alpha channel (1024)` | Run the `generate_icons.py` script — it creates an opaque 1024 icon |
| `Missing compliance information` | Set `ITSAppUsesNonExemptEncryption = NO` in Info.plist (if no custom encryption) |
| `Upload stuck at "Authenticating"` | Sign out/in of Apple ID in Xcode → Preferences → Accounts |
| Build fails with signing error | Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData` |

### Android

| Issue | Fix |
|-------|-----|
| `Keystore was tampered with or password incorrect` | Double-check password, ensure correct keystore file |
| `App not approved — deceptive behavior` | Remove all debug code, ensure production API endpoints |
| `AAB too large (>150MB)` | Enable ProGuard, use `enableProguardInReleaseBuilds = true`, split native libs |
| `Version code already used` | Increment `versionCode` in `build.gradle` |
| `Target API level requirement` | Google requires `targetSdkVersion 34` (as of 2025) — update in `android/build.gradle` |
| `64-bit requirement` | React Native supports 64-bit by default, but verify `ndk.abiFilters` includes `arm64-v8a` |

---

## 8. Current Project Warnings

> **Issues in the current project that MUST be fixed before deployment:**

### 🔴 Critical

1. **Android applicationId is generic**: Currently `com.app` — must change to `com.trasealla.driver`
   - File: `android/app/build.gradle` → `defaultConfig.applicationId`
   - ⚠️ Changing applicationId after first Play Store upload means it's a NEW app

2. **Android release uses debug keystore**: Release builds are signed with `debug.keystore`
   - File: `android/app/build.gradle` → `signingConfigs.release`
   - Follow [Section 5.2](#52-create-release-signing-key) and [Section 5.3](#53-configure-gradle-for-release-signing)

3. **ProGuard / R8 disabled for release**: `minifyEnabled false`
   - Should be `true` for release builds (smaller APK, code obfuscation)

### 🟡 Important

4. **iOS MARKETING_VERSION not set**: Must set in Xcode before archiving

5. **targetSdkVersion is 31**: Google Play requires **targetSdkVersion 34** (as of August 2024)
   - File: `android/build.gradle` → update `targetSdkVersion = 34`
   - Also update `compileSdkVersion = 34`

6. **React Native 0.70.6**: Consider upgrading for latest security patches and features
   - Minimum recommended: 0.72+ for production apps

### 🟢 Recommended

7. **Add `ITSAppUsesNonExemptEncryption`** to `Info.plist`:
   ```xml
   <key>ITSAppUsesNonExemptEncryption</key>
   <false/>
   ```
   This avoids export compliance questions on every upload.

8. **Add crash reporting**: Integrate Firebase Crashlytics if not already done

9. **Disable console.log in production**: Add to `babel.config.js`:
   ```js
   plugins: [
     ...(process.env.NODE_ENV === 'production' ? ['transform-remove-console'] : []),
   ],
   ```

---

## Quick Command Reference

```bash
# === iOS ===

# Install pods
cd ios && pod install && cd ..

# Open Xcode workspace
open ios/app.xcworkspace

# Build release from command line
cd ios && xcodebuild archive \
  -workspace app.xcworkspace \
  -scheme app \
  -configuration Release \
  -archivePath ../build/Traseallo.xcarchive
cd ..

# === Android ===

# Clean build
cd android && ./gradlew clean && cd ..

# Build release AAB (for Play Store)
cd android && ./gradlew bundleRelease && cd ..
# Output: android/app/build/outputs/bundle/release/app-release.aab

# Build release APK (for testing)
cd android && ./gradlew assembleRelease && cd ..
# Output: android/app/build/outputs/apk/release/app-release.apk

# Install release APK on connected device
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## Asset Checklist Summary

| Asset | iOS Requirement | Android Requirement |
|-------|----------------|-------------------|
| App Icon | 1024×1024 (no alpha) | 512×512 PNG |
| Feature Graphic | — | 1024×500 PNG/JPG |
| Screenshots (Phone) | 3-10 per size | 2-8 |
| Screenshots (Tablet) | If supporting | If supporting |
| Privacy Policy URL | Required | Required |
| App Description | Max 4000 chars | Max 4000 chars |
| Short Description | Max 30 chars (subtitle) | Max 80 chars |
| Keywords | Max 100 chars total | Not applicable (uses description) |
| Demo Account | Required for review | Required for review |
| Support URL/Email | Required | Required |

---

*Last updated: March 25, 2026*
