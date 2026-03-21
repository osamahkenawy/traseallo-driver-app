# Trasealla Driver App — React Native Mobile Development Plan

> **Platform:** React Native (Expo or bare workflow)  
> **Backend:** Trasealla Delivery Service API (`/api/*`)  
> **Auth:** JWT Bearer Token (cookie + header support)  
> **Real-time:** Socket.io for live updates  
> **Target:** iOS + Android

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
1.1. [Color Palette](#11-color-palette-matching-landing-page)
2. [Project Structure](#2-project-structure)
3. [Screens & Navigation](#3-screens--navigation)
4. [Features & Tasks Breakdown](#4-features--tasks-breakdown)
5. [API Reference (All Endpoints Used)](#5-api-reference-all-endpoints-used)
6. [Socket.io Events](#6-socketio-events)
7. [Push Notifications Setup](#7-push-notifications-setup)
8. [Offline Support & Caching](#8-offline-support--caching)
9. [Development Phases](#9-development-phases)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Tech Stack

| Category | Technology |
|---|---|
| Framework | React Native (Expo SDK 52+) |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| State Management | Zustand or React Query |
| HTTP Client | Axios |
| Real-time | socket.io-client |
| Maps | react-native-maps (Google Maps) |
| Location | expo-location (background + foreground) |
| Camera | expo-camera / expo-image-picker |
| Barcode Scanner | expo-barcode-scanner |
| Push Notifications | expo-notifications + Firebase FCM |
| Secure Storage | expo-secure-store (JWT tokens) |
| Biometrics | expo-local-authentication |
| Offline Storage | @react-native-async-storage/async-storage |
| Forms | React Hook Form + Zod |
| UI Kit | NativeWind (Tailwind) or React Native Paper |
| Localization | i18next + react-i18next (Arabic RTL support) |

---

## 1.1 Color Palette (Matching Landing Page)

> Extracted from `trasealloLandingPage/src/assets/scss/_variables.scss`

### Core Brand Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Primary** | `#244066` | `rgb(36, 64, 102)` | Main brand color — headers, nav bar, primary buttons, active tab |
| **Success** | `#15C7AE` | `rgb(21, 199, 174)` | Delivered status, positive actions, online indicator, CTA buttons |
| **Info** | `#10A6BA` | `rgb(16, 166, 186)` | In-transit status, informational badges, links |
| **Warning** | `#F9AD28` | `rgb(249, 173, 40)` | Pending/assigned status, COD alerts, attention badges |
| **Danger** | `#EB466D` | `rgb(235, 70, 109)` | Failed/cancelled status, errors, delete actions |
| **Orange** | `#D88D0D` | `rgb(216, 141, 13)` | COD collection, earnings highlights |
| **Purple** | `#9261C6` | `rgb(146, 97, 198)` | Special badges, premium features |
| **Dark** | `#022334` | `rgb(2, 35, 52)` | Body text, headings, primary text |
| **Muted** | `#787A7D` | `rgb(120, 122, 125)` | Secondary text, labels, placeholders |
| **White** | `#FFFFFF` | `rgb(255, 255, 255)` | Backgrounds, card surfaces, button text on dark |
| **Light** | `#F8FBFF` | `rgb(248, 251, 255)` | Screen background, subtle sections |

### Gradients

| Name | Value | Usage |
|------|-------|-------|
| **Brand Gradient** | `linear-gradient(to bottom, #15C7AE, #244066)` | Splash screen, onboarding, header overlays |
| **Button Gradient** | `linear-gradient(180deg, #4E7AB5 10%, #244066 100%)` | Primary CTA buttons, elevated actions |
| **Premium Gradient** | `linear-gradient(135deg, #244066, #6366F1)` | Premium/upgrade badges |

### Gray Scale

| Name | Hex | Usage |
|------|-----|-------|
| **Gray 100** | `#F8F9FA` | Card backgrounds, list item hover |
| **Gray 200** | `#E9ECEF` | Borders, dividers |
| **Gray 300** | `#EFEFEF` | Input backgrounds |
| **Gray 400** | `#E6EFFE` | Soft primary background (assigned order cards) |
| **Gray 500** | `#ADB5BD` | Disabled text, placeholder text |
| **Gray 600** | `#89A2B5` | Subtle labels |
| **Gray 700** | `#495057` | Secondary text |
| **Gray 800** | `#2D2D2D` | Dark mode text alternative |
| **Gray 900** | `#1D262D` | Dark backgrounds |

### Status Colors (Order States)

| Status | Color | Hex |
|--------|-------|-----|
| `pending` | Warning | `#F9AD28` |
| `confirmed` | Info | `#10A6BA` |
| `assigned` | Primary | `#244066` |
| `picked_up` | Info | `#10A6BA` |
| `in_transit` | Success (light) | `#15C7AE` |
| `delivered` | Success | `#15C7AE` |
| `failed` | Danger | `#EB466D` |
| `returned` | Orange | `#D88D0D` |
| `cancelled` | Muted | `#787A7D` |

### React Native Theme Object

```typescript
export const colors = {
  // Brand
  primary:    '#244066',
  primaryLight: '#4E7AB5',
  success:    '#15C7AE',
  info:       '#10A6BA',
  warning:    '#F9AD28',
  danger:     '#EB466D',
  orange:     '#D88D0D',
  purple:     '#9261C6',

  // Text
  textPrimary:   '#022334',
  textSecondary: '#495057',
  textMuted:     '#787A7D',
  textLight:     '#89A2B5',
  textDisabled:  '#ADB5BD',
  textWhite:     '#FFFFFF',

  // Backgrounds
  bgScreen:    '#F8FBFF',
  bgCard:      '#FFFFFF',
  bgInput:     '#EFEFEF',
  bgSoftBlue:  '#E6EFFE',
  bgGray:      '#F8F9FA',
  bgBody:      '#F5F5F5',

  // Borders
  border:      '#E9ECEF',
  borderLight: '#EFEFEF',
  borderDark:  '#D0D5DD',

  // Status
  statusPending:   '#F9AD28',
  statusConfirmed: '#10A6BA',
  statusAssigned:  '#244066',
  statusPickedUp:  '#10A6BA',
  statusInTransit: '#15C7AE',
  statusDelivered: '#15C7AE',
  statusFailed:    '#EB466D',
  statusReturned:  '#D88D0D',
  statusCancelled: '#787A7D',

  // Shadows
  shadowColor: 'rgba(38, 107, 193, 0.08)',

  // Misc
  overlay:   'rgba(36, 42, 53, 0.7)',
  transparent: 'transparent',
} as const;

export const gradients = {
  brand:   ['#15C7AE', '#244066'],     // top → bottom
  button:  ['#4E7AB5', '#244066'],     // primary CTA
  premium: ['#244066', '#6366F1'],     // premium badge
} as const;

// Font family (match landing page)
export const fonts = {
  regular:  'Poppins_400Regular',
  medium:   'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  arabic:   'NotoSansArabic_400Regular',
  arabicMedium: 'NotoSansArabic_500Medium',
  arabicSemiBold: 'NotoSansArabic_600SemiBold',
} as const;
```

### Shadows

```typescript
export const shadows = {
  card: {
    shadowColor: '#266BC1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
} as const;
```

---

## 2. Project Structure

```
driver-app/
├── app/                        # Expo Router or navigation
├── src/
│   ├── api/                    # API client, interceptors, endpoints
│   │   ├── client.ts           # Axios instance + auth interceptor
│   │   ├── auth.ts             # Login, session, password APIs
│   │   ├── orders.ts           # Order-related APIs
│   │   ├── tracking.ts         # Driver tracking APIs
│   │   ├── pickup.ts           # Pickup workflow APIs
│   │   ├── location.ts         # GPS location APIs
│   │   ├── notifications.ts    # Notification APIs
│   │   ├── wallet.ts           # COD & wallet APIs
│   │   └── uploads.ts          # Photo upload APIs
│   ├── components/             # Reusable UI components
│   │   ├── OrderCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── MapView.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── CODCollectionModal.tsx
│   │   └── ...
│   ├── screens/                # All screen components
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useLocation.ts
│   │   ├── useSocket.ts
│   │   └── useOrders.ts
│   ├── store/                  # Zustand stores
│   │   ├── authStore.ts
│   │   ├── orderStore.ts
│   │   └── locationStore.ts
│   ├── utils/                  # Helpers, constants
│   ├── i18n/                   # Localization (en, ar)
│   └── theme/                  # Colors, typography, spacing
├── assets/                     # Icons, images, splash
└── app.json                    # Expo config
```

---

## 3. Screens & Navigation

### 3.1 Auth Stack (Unauthenticated)

| # | Screen | Description |
|---|--------|-------------|
| 1 | **Login Screen** | Username/email + password login. Tenant subdomain auto-resolved. Shows tenant branding/logo. |
| 2 | **Forgot Password Screen** | Enter email → sends reset link. |
| 3 | **Reset Password Screen** | Deep link from email → set new password. |

### 3.2 Main Tab Navigator (Authenticated)

| Tab | Icon | Screen |
|-----|------|--------|
| 🏠 Home | `home` | Dashboard / Today's Summary |
| 📦 Orders | `package` | My Orders (Active / Completed / Failed tabs) |
| 🗺️ Map | `map` | Live Map with route & delivery points |
| 🔔 Notifications | `bell` | In-app notifications list |
| 👤 Profile | `user` | Driver profile & settings |

### 3.3 All Screens (Detailed)

#### A. Dashboard / Home Screen
- **Today's stats**: active orders, delivered, failed, revenue
- **All-time stats**: total orders, total delivered, total revenue
- **Quick actions**: Start Trip, Go Online/Offline
- **Current status indicator** (available / busy / offline)
- **Next delivery card** with navigation button

#### B. My Orders Screen (Tabbed)
- **Active Tab**: Orders with status `assigned`, `picked_up`, `in_transit`
- **Completed Tab**: Orders with status `delivered`
- **Failed Tab**: Orders with status `failed`, `returned`, `cancelled`
- Each tab shows count badge from API
- Pull-to-refresh
- Search by order number

#### C. Order Detail Screen
- Full order info: order number, AWB, tracking token
- Recipient info: name, phone (tap to call), address, area, emirate
- Sender info: name, phone, address
- Order meta: type, category, weight, payment method, COD amount
- Special instructions / notes
- Status timeline (status logs)
- Scan logs history
- **Action buttons** (contextual based on current status):
  - `assigned` → **Pick Up** / **Start Delivery**
  - `picked_up` → **Start Delivery** (in_transit)
  - `in_transit` → **Deliver** / **Mark Failed**
  - On delivery: COD collection modal, proof of delivery photo
  - On fail: Failure reason input
- **Navigate** button → opens Google Maps / Apple Maps
- **Call Recipient** / **Call Sender** buttons
- **Scan Barcode** button

#### D. Pickup Screen (My Pickups)
- List of assigned pickup tasks
- Each card shows: sender name, address, scheduled time, order details
- Actions per pickup:
  - **Arrived** at pickup location
  - **Confirm Pickup** (with optional barcode scan)
  - **Fail Pickup** (with reason)

#### E. Map / Navigation Screen
- Google Map showing:
  - Driver's current location
  - All active delivery points (pins)
  - All active pickup points (different color pins)
  - Route optimization (ordered stops)
- Tap pin → shows order summary card
- **Navigate** button → external maps app
- Current order highlighted

#### F. Barcode Scanner Screen
- Camera-based barcode/QR scanner
- Scans tracking token or AWB number
- Auto-navigates to order detail on successful scan
- Logs scan event to backend

#### G. Delivery Confirmation Screen
- Proof of delivery photo capture
- Signature pad (optional)
- COD amount input (if payment_method = 'cod')
- Notes field
- GPS coordinates auto-captured
- **Confirm Delivery** button

#### H. Failure Report Screen
- Predefined failure reasons dropdown:
  - Recipient not available
  - Wrong address
  - Recipient refused
  - Package damaged
  - Other (free text)
- Optional photo
- GPS coordinates auto-captured
- **Submit Failure** button

#### I. COD Collection Screen
- Shows COD amount due
- Input field for actual collected amount
- Mark as collected
- COD summary: total pending, total collected today

#### J. Notifications Screen
- List of in-app notifications (order updates, new assignments, system alerts)
- Unread count badge
- Mark as read (single / all)
- Tap notification → navigate to relevant order

#### K. Profile Screen
- Driver info: name, phone, email, vehicle details
- Avatar/photo
- Performance stats: total deliveries, rating, success rate
- **Go Online / Offline** toggle

#### L. Settings Screen
- Change password
- Language toggle (English / Arabic)
- Push notification preferences
- GPS tracking toggle
- App version info
- Logout

#### M. Earnings Screen
- Today's earnings
- Weekly / monthly summary
- COD collection history
- Earnings breakdown (delivery fee per order)

#### N. Rating / Reviews Screen
- Driver's average rating
- List of ratings received per order

---

## 4. Features & Tasks Breakdown

### Phase 1 — Core (MVP)

| # | Task | Priority |
|---|------|----------|
| 1.1 | Project setup: Expo, navigation, theme, i18n | 🔴 Critical |
| 1.2 | API client setup: Axios instance, auth interceptors, token storage | 🔴 Critical |
| 1.3 | Login screen + auth flow (token in SecureStore) | 🔴 Critical |
| 1.4 | Session persistence (auto-login on app reopen) | 🔴 Critical |
| 1.5 | Dashboard / Home screen with today's stats | 🔴 Critical |
| 1.6 | My Orders screen with 3 tabs (active/completed/failed) | 🔴 Critical |
| 1.7 | Order Detail screen with full info display | 🔴 Critical |
| 1.8 | Status update flow: picked_up → in_transit → delivered/failed | 🔴 Critical |
| 1.9 | COD collection modal on delivery | 🔴 Critical |
| 1.10 | Tap-to-call recipient/sender | 🔴 Critical |
| 1.11 | Navigate to address (open external maps) | 🔴 Critical |
| 1.12 | Pull-to-refresh on all list screens | 🔴 Critical |

### Phase 2 — Location & Maps

| # | Task | Priority |
|---|------|----------|
| 2.1 | Foreground GPS tracking (send location every 30s) | 🔴 Critical |
| 2.2 | Background GPS tracking (when app is minimized) | 🔴 Critical |
| 2.3 | Map screen with delivery pins | 🟡 High |
| 2.4 | Driver status toggle (online/offline/available) | 🔴 Critical |
| 2.5 | Auto-set busy when orders assigned, available when all delivered | 🟡 High |

### Phase 3 — Scanning & Proof

| # | Task | Priority |
|---|------|----------|
| 3.1 | Barcode scanner screen (tracking token / AWB) | 🟡 High |
| 3.2 | Scan event logging to backend | 🟡 High |
| 3.3 | Proof of delivery photo capture | 🟡 High |
| 3.4 | Photo upload to `/api/uploads/proofs` | 🟡 High |
| 3.5 | Failure report with photo + reason | 🟡 High |

### Phase 4 — Pickup Workflow

| # | Task | Priority |
|---|------|----------|
| 4.1 | My Pickups screen (assigned pickups list) | 🟡 High |
| 4.2 | Arrived at pickup action | 🟡 High |
| 4.3 | Confirm pickup with barcode scan | 🟡 High |
| 4.4 | Fail pickup with reason | 🟡 High |

### Phase 5 — Notifications & Real-time

| # | Task | Priority |
|---|------|----------|
| 5.1 | Socket.io connection + join tenant/user rooms | 🟡 High |
| 5.2 | Real-time new order assignment notification | 🟡 High |
| 5.3 | In-app notifications list screen | 🟡 High |
| 5.4 | Push notifications (Firebase FCM) | 🟡 High |
| 5.5 | Notification badge on tab icon | 🟢 Medium |
| 5.6 | Mark as read (single + all) | 🟢 Medium |

### Phase 6 — Profile & Settings

| # | Task | Priority |
|---|------|----------|
| 6.1 | Profile screen with driver info + stats | 🟢 Medium |
| 6.2 | Change password | 🟢 Medium |
| 6.3 | Language toggle (EN/AR with RTL) | 🟢 Medium |
| 6.4 | Logout | 🟢 Medium |

### Phase 7 — Earnings & Advanced

| # | Task | Priority |
|---|------|----------|
| 7.1 | Earnings summary screen | 🟢 Medium |
| 7.2 | Ratings/reviews screen | 🟢 Medium |
| 7.3 | Start Trip (batch start all assigned orders) | 🟢 Medium |
| 7.4 | Offline mode (queue status updates when no internet) | 🟠 Low |
| 7.5 | Biometric unlock | 🟠 Low |
| 7.6 | Dark mode | 🟠 Low |

---

## 5. API Reference — Unified Driver App API (`/api/driver-app/*`)

> **Base URL:** `https://api.trasealla.com` (production) or `http://localhost:4001` (development)
>
> **All authenticated endpoints require:** `Authorization: Bearer <token>` header
>
> The mobile app uses the **dedicated `/api/driver-app/*` route group** which provides a complete, self-contained API for the driver workflow. No need to call scattered `/api/auth`, `/api/tracking`, `/api/drivers` etc. — everything is under one prefix.

### 5.1 Authentication & Profile (6 endpoints)

| # | Method | Endpoint | Auth | Body / Params | Description |
|---|--------|----------|------|--------------|-------------|
| 1 | `POST` | `/api/driver-app/login` | ❌ None | `{ username, password }` — accepts username, email, or phone | Driver-only login. Returns JWT `token`, `user` object (id, username, email, full_name, role, tenant info with logos), and `driver` object (id, full_name, phone, email, photo_url, vehicle_type/plate/model/color, status, rating, zone, national_id, license_number, total_deliveries). Auto-sets driver `available`. Checks tenant status & subscription. |
| 2 | `POST` | `/api/driver-app/forgot-password` | ❌ None | `{ identifier }` — username, email, or phone | Generates 6-digit OTP. Returns `_dev_otp` in non-production for testing. |
| 3 | `POST` | `/api/driver-app/reset-password` | ❌ None | `{ identifier, otp, new_password }` | Reset password using OTP received from forgot-password. |
| 4 | `GET` | `/api/driver-app/profile` | ✅ Bearer | — | Returns full driver profile: id, user_id, full_name, phone, email, photo_url, vehicle info, national_id, license_number, status, is_active, rating, zone (id, name, city), stats (total_orders, delivered, failed, returned, active, total_earned, earned_today), joined_at. |
| 5 | `PUT` | `/api/driver-app/profile` | ✅ Bearer | `{ vehicle_type?, vehicle_plate?, vehicle_model?, vehicle_color?, phone?, email? }` | Update driver profile. All fields optional — only provided fields are updated. |
| 6 | `POST` | `/api/driver-app/profile/avatar` | ✅ Bearer | `file` (multipart/form-data, max 5MB, jpg/png/webp) | Upload or update driver avatar photo. Returns `{ url }`. |
| 7 | `POST` | `/api/driver-app/change-password` | ✅ Bearer | `{ current_password, new_password }` | Change password. New password must be ≥ 6 characters. |

### 5.2 Dashboard (1 endpoint)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 8 | `GET` | `/api/driver-app/dashboard` | ✅ Bearer | Returns `driver` (id, full_name, status, rating, photo_url, vehicle_type), `today` (active_orders, delivered_today, failed_today, returned_today, assigned_today, earned_today, cod_collected_today, cod_pending, pending_pickups, stops_remaining), and `next_stops` (up to 3 upcoming delivery stops with address, contact, lat/lng, cod_amount, order_number, tracking_token). |

### 5.3 Orders & Route (5 endpoints)

| # | Method | Endpoint | Auth | Body / Query | Description |
|---|--------|----------|------|-------------|-------------|
| 9 | `GET` | `/api/driver-app/orders` | ✅ Bearer | `?status=all\|active\|completed\|assigned\|picked_up\|in_transit\|delivered\|failed\|returned&date=YYYY-MM-DD&page=1&limit=50` | List driver's assigned orders. `active` = assigned+picked_up+in_transit. `completed` = delivered+failed+returned. Sorted by priority. Returns `orders[]`, pagination. |
| 10 | `GET` | `/api/driver-app/orders/:id` | ✅ Bearer | — | Full order detail: order info, recipient details, all packages with barcodes, delivery stops with sequence/status, and status history logs. |
| 11 | `POST` | `/api/driver-app/orders/:id/accept` | ✅ Bearer | — | Accept an assigned order. Only works on `assigned` status. |
| 12 | `POST` | `/api/driver-app/orders/:id/reject` | ✅ Bearer | `{ reason }` | Reject an assigned order. Returns it to the dispatch pool. |
| 13 | `GET` | `/api/driver-app/route` | ✅ Bearer | — | Today's full route: pickups + delivery stops (multi-stop + single-stop). Returns `summary` (total_stops, completed, remaining, next_address) and `stops[]` (ordered delivery points with recipient info, coordinates, status). |

### 5.4 Pickup Flow (5 endpoints)

| # | Method | Endpoint | Auth | Body | Description |
|---|--------|----------|------|------|-------------|
| 14 | `GET` | `/api/driver-app/pickups` | ✅ Bearer | — | List all pending pickup assignments for this driver. |
| 15 | `POST` | `/api/driver-app/pickups/:orderId/en-route` | ✅ Bearer | `{ lat?, lng? }` | Mark driver heading to pickup. Sets `pickup_status = 'en_route'`. |
| 16 | `POST` | `/api/driver-app/pickups/:orderId/arrived` | ✅ Bearer | `{ lat?, lng? }` | Mark arrived at pickup. Sets `pickup_status = 'at_pickup'`. |
| 17 | `POST` | `/api/driver-app/pickups/:orderId/confirm` | ✅ Bearer | `{ barcode_scanned?, notes?, lat?, lng?, scanned_packages?: [barcode1, barcode2] }` | Confirm pickup — packages collected. Transitions order to `picked_up`. |
| 18 | `POST` | `/api/driver-app/pickups/:orderId/fail` | ✅ Bearer | `{ reason, lat?, lng? }` | Report pickup failure with reason. |

### 5.5 Delivery Stops — Multi-Stop Orders (7 endpoints)

| # | Method | Endpoint | Auth | Body | Description |
|---|--------|----------|------|------|-------------|
| 19 | `POST` | `/api/driver-app/orders/:orderId/start-delivery` | ✅ Bearer | `{ lat?, lng? }` | Transition order from `picked_up`/`assigned` → `in_transit`. Sets driver status to `busy`. |
| 20 | `GET` | `/api/driver-app/orders/:orderId/stops` | ✅ Bearer | — | List all delivery stops for an order. Ordered by sequence_number with contact info, address, GPS, COD, and status. |
| 21 | `POST` | `/api/driver-app/stops/:stopId/arrived` | ✅ Bearer | `{ lat?, lng? }` | Mark arrival at delivery stop. Sets stop status to `arrived` with timestamp. |
| 22 | `POST` | `/api/driver-app/stops/:stopId/complete` | ✅ Bearer | `{ cod_collected?, signature_url?, proof_photo_url?, notes?, lat?, lng? }` | Complete a delivery stop. **When all stops completed → auto-marks entire order as `delivered`**. |
| 23 | `POST` | `/api/driver-app/stops/:stopId/fail` | ✅ Bearer | `{ reason, lat?, lng? }` | Mark delivery stop as failed with reason. |
| 24 | `POST` | `/api/driver-app/stops/:stopId/skip` | ✅ Bearer | `{ reason? }` | Skip a stop to revisit later. |

### 5.6 Barcode Scanning (3 endpoints)

| # | Method | Endpoint | Auth | Body | Description |
|---|--------|----------|------|------|-------------|
| 25 | `POST` | `/api/driver-app/scan` | ✅ Bearer | `{ barcode }` | Scan a barcode — accepts package barcodes, order numbers, or tracking tokens. Returns `{ type: 'package'\|'order', is_assigned: bool, data: {...} }`. |
| 26 | `POST` | `/api/driver-app/scan/batch` | ✅ Bearer | `{ barcodes: [barcode1, barcode2, ...] }` | Batch scan multiple barcodes (during pickup). Returns per-barcode results + summary (total, found, not_found, assigned, unassigned). |
| 27 | `POST` | `/api/driver-app/scan/verify-delivery` | ✅ Bearer | `{ barcode, stop_id? }` | Verify correct package at delivery point. Returns `{ verified, is_correct_driver, is_correct_stop }`. |

### 5.7 Proof of Delivery — POD (4 endpoints)

| # | Method | Endpoint | Auth | Body | Description |
|---|--------|----------|------|------|-------------|
| 28 | `POST` | `/api/driver-app/orders/:orderId/proof-photo` | ✅ Bearer | `file` (multipart, max 10MB) | Upload proof-of-delivery photo for an order. Returns `{ url }`. |
| 29 | `POST` | `/api/driver-app/orders/:orderId/signature` | ✅ Bearer | `file` (multipart, max 5MB) | Upload recipient's signature for an order. Returns `{ url }`. |
| 30 | `POST` | `/api/driver-app/stops/:stopId/proof-photo` | ✅ Bearer | `file` (multipart, max 10MB) | Upload proof photo for a specific delivery stop. Returns `{ url }`. |
| 31 | `POST` | `/api/driver-app/stops/:stopId/signature` | ✅ Bearer | `file` (multipart, max 5MB) | Upload recipient's signature for a specific stop. Returns `{ url }`. |

### 5.8 COD — Cash on Delivery (3 endpoints)

| # | Method | Endpoint | Auth | Body / Query | Description |
|---|--------|----------|------|-------------|-------------|
| 32 | `GET` | `/api/driver-app/cod/pending` | ✅ Bearer | — | List all pending COD orders for this driver. Returns `orders[]` + `total_pending` amount. |
| 33 | `POST` | `/api/driver-app/cod/:orderId/collect` | ✅ Bearer | `{ amount_collected?, payment_method_detail?, notes? }` | Mark COD as collected. `amount_collected` defaults to `cod_amount`. `payment_method_detail`: `'cash'` or `'card'`. COD states: 0=not collected, 1=collected, 2=settled with admin. |
| 34 | `GET` | `/api/driver-app/cod/summary` | ✅ Bearer | `?date=YYYY-MM-DD` | Daily COD summary. Returns `total_cod_orders`, `collected`, `pending`, `settled`, `unsettled_carry_over`. Defaults to today. |

### 5.9 Order Outcomes — Single-Stop Orders (3 endpoints)

| # | Method | Endpoint | Auth | Body | Description |
|---|--------|----------|------|------|-------------|
| 35 | `POST` | `/api/driver-app/orders/:orderId/deliver` | ✅ Bearer | `{ signature_url?, proof_photo_url?, cod_collected?, notes?, lat?, lng? }` | Mark order as delivered. Auto-collects COD if applicable. Increments `total_deliveries`. Releases driver to `available` if no more active orders. |
| 36 | `POST` | `/api/driver-app/orders/:orderId/fail` | ✅ Bearer | `{ reason, lat?, lng? }` | Mark order as failed. Common reasons: Customer refused, Wrong address, Customer not available, Damaged package. |
| 37 | `POST` | `/api/driver-app/orders/:orderId/return` | ✅ Bearer | `{ reason?, lat?, lng? }` | Mark order for return to sender. Reason defaults to "Returned by driver". |

### 5.10 Route Progress (1 endpoint)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 38 | `GET` | `/api/driver-app/progress` | ✅ Bearer | Today's route progress: `total_orders`, `delivered`, `failed`, `returned`, `remaining`, `total_stops_all`, `completed_stops_all`, `earned`, `cod_collected`, `completion_pct`. |

### 5.11 Live Location Tracking (2 endpoints)

| # | Method | Endpoint | Auth | Body | Description |
|---|--------|----------|------|------|-------------|
| 39 | `POST` | `/api/driver-app/location` | ✅ Bearer | `{ lat, lng, speed?, heading?, accuracy?, order_id? }` | Update GPS location. Call every **10–30 seconds**. Speed in km/h, heading 0–360°, accuracy in meters. |
| 40 | `POST` | `/api/driver-app/location/batch` | ✅ Bearer | `{ points: [{ lat, lng, speed?, heading?, accuracy?, recorded_at }] }` | Batch submit GPS points (offline buffer flush). Returns count of inserted points. |

### 5.12 Notifications & Push (4 endpoints)

| # | Method | Endpoint | Auth | Body / Query | Description |
|---|--------|----------|------|-------------|-------------|
| 41 | `GET` | `/api/driver-app/notifications` | ✅ Bearer | `?page=1&limit=30&unread_only=true` | Get driver's notifications. Returns notifications with `title`, `body`, `type`, `icon`, `order_id`, `is_read`, plus `unread_count`. |
| 42 | `PATCH` | `/api/driver-app/notifications/:id/read` | ✅ Bearer | — | Mark a single notification as read. |
| 43 | `POST` | `/api/driver-app/notifications/read-all` | ✅ Bearer | — | Mark all notifications as read. |
| 44 | `POST` | `/api/driver-app/device-token` | ✅ Bearer | `{ device_token, platform: 'ios'\|'android', device_info? }` | Register FCM push notification device token. Auto-deactivates old tokens for same user. |

### 5.13 Delivery History (1 endpoint)

| # | Method | Endpoint | Auth | Query | Description |
|---|--------|----------|------|-------|-------------|
| 45 | `GET` | `/api/driver-app/history` | ✅ Bearer | `?status=delivered\|failed\|returned&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&page=1&limit=30` | Completed deliveries archive with date and status filters. |

### 5.14 Earnings & Wallet (2 endpoints)

| # | Method | Endpoint | Auth | Query | Description |
|---|--------|----------|------|-------|-------------|
| 46 | `GET` | `/api/driver-app/earnings` | ✅ Bearer | `?date_from=&date_to=&page=1&limit=30` | Earnings list + summary (total_earned, total_paid, total_pending). |
| 47 | `GET` | `/api/driver-app/earnings/daily` | ✅ Bearer | `?days=7` (max 30) | Daily breakdown: array of `{ date, deliveries, earned, cod_collected }`. |

### 5.15 Settings (1 endpoint)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 48 | `GET` | `/api/driver-app/settings` | ✅ Bearer | Returns tenant config: `tenant` (name, slug, logo URLs), `settings` (require_signature, require_photo_proof, require_barcode_scan, auto_cod_collect, navigation_provider: google_maps/waze, language: en/ar, currency: AED). |

### 5.16 Shift & Availability (4 endpoints)

| # | Method | Endpoint | Auth | Body | Description |
|---|--------|----------|------|------|-------------|
| 49 | `POST` | `/api/driver-app/go-online` | ✅ Bearer | `{ lat?, lng? }` | Set driver status → `available`. Ready to receive assignments. |
| 50 | `POST` | `/api/driver-app/go-offline` | ✅ Bearer | — | Set driver status → `offline`. ⚠️ **Blocked if driver has active `in_transit` or `picked_up` orders.** |
| 51 | `POST` | `/api/driver-app/on-break` | ✅ Bearer | — | Set driver status → `on_break`. Pauses new assignments, keeps current orders active. |
| 52 | `POST` | `/api/driver-app/logout` | ✅ Bearer | — | Sets driver `offline`, deactivates all push device tokens. Client must clear stored JWT. |

### 5.17 Support & Help (4 endpoints)

| # | Method | Endpoint | Auth | Body / Query | Description |
|---|--------|----------|------|-------------|-------------|
| 53 | `POST` | `/api/driver-app/support/ticket` | ✅ Bearer | `{ subject, description?, category?, priority?, order_id? }` | Create support ticket. Categories: `bug`, `feature_request`, `billing`, `account`, `technical`, `other`. Priorities: `low`, `medium`, `high`, `critical`. |
| 54 | `POST` | `/api/driver-app/support/report-issue` | ✅ Bearer | `{ issue_type, description?, order_id?, lat?, lng? }` | Quick issue report. Types: `vehicle_breakdown`, `accident`, `wrong_package`, `app_bug`, `safety_concern`, `other`. |
| 55 | `GET` | `/api/driver-app/support/tickets` | ✅ Bearer | `?page=1&limit=20&status=` | List driver's own support tickets. |
| 56 | `GET` | `/api/driver-app/help` | ✅ Bearer | — | FAQ/Help content organized by category: Getting Started, Pickup, Delivery, COD, Account & Support. |

### 5.18 General / Health

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 57 | `GET` | `/api/health` | ❌ None | Health check — verify API is running. |
| 58 | `GET` | `/api/auth/branding?slug=xxx` | ❌ None | Public — get tenant name, logo_url, logo_url_white for the login screen branding. |

### 5.19 Supplementary Endpoints (used by admin panel, available to drivers)

These endpoints are **not required** for the mobile app primary flow but may be useful for advanced features:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tracking/my-orders` | Legacy: Get driver orders with stats. Query: `?status=active\|completed\|failed\|all`. Use `/api/driver-app/orders` instead. |
| `GET` | `/api/tracking/:token/order` | Look up order by tracking token or package barcode. Returns full order + items + status logs + scan logs. |
| `PATCH` | `/api/tracking/:token/status` | Update order status by tracking token. Body: `{ status, note?, lat?, lng?, cod_collected_amount? }`. |
| `POST` | `/api/tracking/:token/scan` | Log scan event by tracking token. Body: `{ scan_type, lat?, lng?, note? }`. Auto-transitions: `pickup_scan→picked_up`, `delivery_scan→delivered`. |
| `GET` | `/api/driver-earnings/my` | Driver earnings with date filters. Query: `?date_from=&date_to=&status=&page=1&limit=20`. |
| `GET` | `/api/user-notifications/unread-count` | Quick unread badge count. |
| `DELETE` | `/api/user-notifications/:id` | Delete a single notification. |
| `DELETE` | `/api/user-notifications/` | Clear all notifications. |
| `POST` | `/api/notifications/register-device` | Alias: Register FCM device token (same as `/api/driver-app/device-token`). |
| `DELETE` | `/api/notifications/unregister-device` | Remove FCM token(s) on logout. |

---

## 6. Socket.io Events

### Connection Setup

```javascript
import io from 'socket.io-client';

const socket = io('https://api.trasealla.com', {
  auth: { token: 'Bearer <jwt_token>' },
  transports: ['websocket'],
});

// Join rooms on connect
socket.emit('join-tenant', tenantId);   // Receive tenant-wide events (driver locations, order updates)
socket.emit('join-user', userId);       // Receive personal notifications
// Optional: join tracking room for a specific order
socket.emit('join-tracking', trackingToken);
```

### Events to Listen (Server → App)

| Event | Room | Payload | Usage |
|-------|------|---------|-------|
| `notification:new` | `user:{userId}` | `{ id, title, body, type, icon, link, order_id, created_at }` | Personal in-app notification → update badge, show toast, add to list |
| `order:status-changed` | `tenant:{tenantId}` | `{ order_id, order_number, status, previous_status, timestamp }` | Order status changed (by admin/system) → refresh order detail if viewing |
| `order:driver-assigned` | `tenant:{tenantId}` | `{ order_id, order_number, driver_id, driver_name }` | New order assigned to driver → show push notification + refresh orders list |
| `order:cod-collected` | `tenant:{tenantId}` | `{ order_id, order_number, amount, driver_id }` | COD collection confirmed → update COD summary |
| `package:status-changed` | `tenant:{tenantId}` | `{ package_id, order_id, barcode, status, previous_status, delivered, total }` | Package-level status change → update package tracking in order detail |
| `driver:location` | `tenant:{tenantId}` / `track:{token}` | `{ driver_id, lat, lng, speed, heading, timestamp }` | Driver location broadcast — useful for seeing own location on map, or customer tracking |

### Events to Emit (App → Server)

| Event | Payload | Usage |
|-------|---------|-------|
| `join-tenant` | `tenantId` (number) | Join tenant room on connect — required for order updates |
| `join-user` | `userId` (number) | Join personal notification room — required for push notifications |
| `join-tracking` | `trackingToken` (string) | Join order tracking room — optional, for live tracking view |

### Reconnection Handling

```javascript
socket.on('connect', () => {
  // Re-join rooms after reconnect
  socket.emit('join-tenant', tenantId);
  socket.emit('join-user', userId);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
  // socket.io-client auto-reconnects by default
});
```

---

## 7. Push Notifications Setup

### Firebase Cloud Messaging (FCM)

1. Create Firebase project → get `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
2. Install `expo-notifications` and configure
3. On app launch, get FCM token and register with backend via `POST /api/driver-app/device-token`
4. On logout, the backend auto-deactivates device tokens via `POST /api/driver-app/logout`
5. Handle notification taps → deep link to order detail

### Device Token Registration

```javascript
// After login, register FCM token
const token = await Notifications.getExpoPushTokenAsync();
await api.post('/driver-app/device-token', {
  device_token: token.data,
  platform: Platform.OS,  // 'ios' or 'android'
  device_info: `${Device.modelName} - ${Device.osName} ${Device.osVersion}`,
});
```

### Notification Types to Handle

| Type | Trigger | Action on Tap |
|------|---------|---------------|
| `order_assigned` | New order assigned to driver | Navigate to Order Detail |
| `order_status_changed` | Admin changed order status | Navigate to Order Detail |
| `pickup_assigned` | New pickup assigned | Navigate to Pickup Screen |
| `cod_reminder` | COD pending reminder | Navigate to COD Screen |
| `system` | General system message | Navigate to Notifications |

---

## 8. Offline Support & Caching

| Feature | Strategy |
|---------|----------|
| Order list | Cache last fetched orders in AsyncStorage. Show cached + fetch fresh. |
| Status updates | Queue status changes in local DB when offline. Sync when connection restored. |
| GPS tracking | Buffer location pings locally, batch-send when online. |
| Scan events | Queue scan logs locally, sync on reconnect. |
| Photos | Save proof photos locally, upload queue in background. |
| Auth token | Stored in SecureStore, persist across app restarts. |

---

## 9. Development Phases

### Phase 1 — Foundation & Auth (Week 1)
- [ ] Expo project init + folder structure
- [ ] React Navigation setup (Auth Stack + Main Tabs)
- [ ] Theme system (colors, typography, spacing)
- [ ] i18n setup (English + Arabic RTL)
- [ ] Axios client with interceptors
- [ ] SecureStore token management
- [ ] Login screen + branding
- [ ] Forgot password screen
- [ ] Session validation on app open

### Phase 2 — Core Order Flow (Week 2)
- [ ] Dashboard / Home screen
- [ ] My Orders screen (3 tabs)
- [ ] Order Detail screen (full layout)
- [ ] Status update actions (pick up → deliver / fail)
- [ ] COD collection modal
- [ ] Call recipient / sender
- [ ] Navigate to address
- [ ] Pull-to-refresh everywhere

### Phase 3 — GPS & Maps (Week 3)
- [ ] Foreground location tracking
- [ ] Background location tracking (expo-task-manager)
- [ ] Send GPS pings to `/api/drivers/:id/location` every 30s
- [ ] Driver online/offline toggle
- [ ] Map screen with delivery point markers
- [ ] Route display on map

### Phase 4 — Scanning & Proof (Week 3-4)
- [ ] Barcode scanner screen
- [ ] Scan event API integration
- [ ] Camera for proof-of-delivery
- [ ] Photo upload integration
- [ ] Failure report screen with photo + reason

### Phase 5 — Pickup Workflow (Week 4)
- [ ] My Pickups screen
- [ ] Arrived at pickup action
- [ ] Confirm pickup with barcode
- [ ] Fail pickup with reason
- [ ] Pickup-related notifications

### Phase 6 — Notifications (Week 4-5)
- [ ] Socket.io client setup
- [ ] Real-time order assignment alerts
- [ ] In-app notifications screen
- [ ] Push notifications (FCM)
- [ ] Badge count on tab bar
- [ ] Mark read functionality

### Phase 7 — Profile & Settings (Week 5)
- [ ] Profile screen with stats
- [ ] Change password
- [ ] Language toggle
- [ ] Notification preferences
- [ ] Logout
- [ ] App version display

### Phase 8 — Earnings & Advanced (Week 5-6)
- [ ] Earnings summary screen
- [ ] Ratings/reviews screen
- [ ] Start Trip (batch action)
- [ ] Offline queue for status updates
- [ ] Biometric unlock
- [ ] Dark mode support

### Phase 9 — Testing & Polish (Week 6)
- [ ] End-to-end flow testing
- [ ] Error handling & edge cases
- [ ] Loading states & skeletons
- [ ] Empty states
- [ ] Network error handling + retry
- [ ] App icons & splash screen
- [ ] Performance optimization

### Phase 10 — Deployment (Week 7)
- [ ] App Store (iOS) submission
- [ ] Google Play Store submission
- [ ] OTA update setup (Expo EAS Update)
- [ ] Crash & analytics (Sentry or Crashlytics)
- [ ] Production environment config

---

## 10. Testing Checklist

### Auth Flow
- [ ] Login with username + password
- [ ] Login with email + password
- [ ] Incorrect credentials error
- [ ] Inactive account blocked
- [ ] Suspended tenant blocked
- [ ] Session persistence (close & reopen app)
- [ ] Token expiry → redirect to login
- [ ] Forgot password email sent
- [ ] Change password works

### Order Flow
- [ ] View active orders
- [ ] View completed orders
- [ ] View failed orders
- [ ] Order detail displays all info
- [ ] Status: assigned → picked_up
- [ ] Status: picked_up → in_transit
- [ ] Status: in_transit → delivered
- [ ] Status: in_transit → failed
- [ ] Status: failed → returned
- [ ] Invalid transitions rejected
- [ ] COD amount collected on delivery
- [ ] Proof of delivery photo upload
- [ ] Failure reason submitted
- [ ] Start Trip batch action

### Pickup Flow
- [ ] View assigned pickups
- [ ] Mark arrived at pickup
- [ ] Confirm pickup
- [ ] Fail pickup with reason
- [ ] Barcode scan on pickup

### GPS & Location
- [ ] Location permission request
- [ ] Foreground tracking works
- [ ] Background tracking works
- [ ] Location pings sent every 30s
- [ ] Location visible on admin dashboard (Socket.io)
- [ ] Map shows delivery points
- [ ] Navigate to external maps app

### Barcode Scanning
- [ ] Camera permission request
- [ ] Scan tracking token → open order
- [ ] Scan AWB number → open order
- [ ] Scan event logged to backend

### Notifications
- [ ] Socket.io connects on app open
- [ ] New order assignment notification
- [ ] Push notification received (app in background)
- [ ] Tap notification → navigate to order
- [ ] In-app notification list loads
- [ ] Unread count badge displays
- [ ] Mark single as read
- [ ] Mark all as read

### Offline
- [ ] App shows cached orders when offline
- [ ] Status update queued when offline
- [ ] Queued actions sync when back online
- [ ] Proper offline indicator shown

### Profile & Settings
- [ ] Driver profile info displays
- [ ] Stats display correctly
- [ ] Change password works
- [ ] Language switch (EN ↔ AR)
- [ ] RTL layout works in Arabic
- [ ] Logout clears all data

---

## Status Transition Map (Driver-Side)

```
pending    → confirmed, cancelled
confirmed  → picked_up, cancelled
assigned   → picked_up, in_transit, cancelled
picked_up  → in_transit, failed, returned
in_transit → delivered, failed, returned
delivered  → (terminal)
failed     → returned, confirmed
returned   → (terminal)
cancelled  → (terminal)
```

## Pickup Status Flow

```
none → pending_pickup → pickup_scheduled → en_route → at_pickup → picked_up
                                                                 → pickup_failed
```

---

## Key Implementation Notes

1. **Unified API Prefix**: All mobile endpoints are under **`/api/driver-app/*`**. This is a dedicated route group for the mobile app — no need to use `/api/auth`, `/api/tracking`, `/api/drivers`, etc. separately.

2. **Login & Driver Discovery**: `POST /api/driver-app/login` returns everything in one call: JWT `token`, `user` object (with tenant branding), and `driver` object (with id, stats, vehicle info). Store `token`, `user.id`, `user.tenant_id`, and `driver.id` in app state immediately.

3. **Tenant Resolution**: The JWT token contains `tenant_id`. The backend resolves the tenant automatically from the token. No need to send `x-tenant-slug` or `x-tenant-id` headers.

4. **Authentication Header**: Send JWT as `Authorization: Bearer <token>` header on all authenticated requests.

5. **Location Tracking Interval**: Send GPS pings via `POST /api/driver-app/location` every **10–30 seconds**. Include `speed`, `heading`, and `accuracy` if available from the device. When offline, buffer points and flush via `POST /api/driver-app/location/batch`.

6. **COD Handling**: When delivering a COD order, use `POST /api/driver-app/cod/:orderId/collect` to record collection. For single-stop orders, `POST /api/driver-app/orders/:orderId/deliver` with `cod_collected: true` also works. For multi-stop, complete the stop with `cod_collected: true`.

7. **Multi-Stop vs Single-Stop Orders**: 
   - **Single-stop**: Use `/api/driver-app/orders/:orderId/deliver` or `/fail` or `/return`.
   - **Multi-stop**: Use `/api/driver-app/stops/:stopId/complete` or `/fail` or `/skip` for each stop. When all stops complete, the order auto-transitions to `delivered`.

8. **Status Timestamps**: The backend auto-sets `picked_up_at`, `in_transit_at`, `delivered_at`, `failed_at` etc. No need to send timestamps from the app.

9. **Barcode Scanning**: Use the unified `POST /api/driver-app/scan` endpoint. It accepts package barcodes, order numbers, and tracking tokens. The response tells you the type (`package` or `order`) and whether it's assigned to this driver.

10. **Auto-Status Management**: 
    - Login → driver set to `available` automatically
    - Start delivery → driver set to `busy`
    - All orders reach terminal status → driver set back to `available`
    - Logout → driver set to `offline`, push tokens deactivated

11. **Settings-Driven Requirements**: Call `GET /api/driver-app/settings` at startup to know what the tenant requires: `require_signature`, `require_photo_proof`, `require_barcode_scan`. Enforce these in the UI before allowing delivery completion.

12. **File Uploads**: Use `multipart/form-data` with field name `file` for all upload endpoints (avatar, proof photos, signatures). Max sizes: avatar 5MB, proof 10MB, signature 5MB.

13. **Subscription Checks**: Login returns `subscription_blocked: true` with a message if the tenant's trial expired or subscription is suspended. Show this message and prevent app usage.

14. **Pickup Flow Order**: en-route → arrived → confirm/fail. The `en-route` step is new — it sets `pickup_status = 'en_route'`. The `confirm` step supports `scanned_packages` array for barcode verification.

15. **Offline Buffer Strategy**: For location, scans, and status updates — queue locally and flush when connectivity returns. Use `POST /api/driver-app/location/batch` for buffered GPS points.
