    # Driver App Tasks & Roadmap

> Last Updated: April 14, 2026

---

## 🎯 Current Sprint Tasks

### High Priority (This Week)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Fix email OTP delivery for Forgot Password | ✅ Done | Backend now sends email with OTP |
| 2 | Add resend cooldown (60s) to prevent spam | ✅ Done | Client-side rate limiting added |
| 3 | Test password reset flow end-to-end | ⬜ Pending | Test with real email |
| 4 | Map bottom sheet stale data issue | ⬜ Pending | `selectedOrder` shows old data after refresh |
| 5 | Add tab-focus refresh to Map screen | ⬜ Pending | Use `useFocusEffect` |

### Medium Priority (This Month)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6 | Add loading indicator on Map initial load | ⬜ Pending | |
| 7 | Add "Fit all markers" button to Map | ⬜ Pending | |
| 8 | Add call-customer button in bottom sheet | ⬜ Pending | |
| 9 | Add ETA/distance display on Map | ⬜ Pending | |
| 10 | Add confirmation dialog for status cycling | ⬜ Pending | |
| 11 | Localize Map screen (currently hardcoded EN) | ⬜ Pending | |
| 12 | Custom driver marker icon | ⬜ Pending | |
| 13 | Fix `getOrderCoords` returning (0,0) for "0" | ⬜ Pending | String conversion bug |

---

## 📋 Feature Completion Status

### ✅ Fully Implemented (Production Ready)

- [x] Login with tenant branding
- [x] Forgot/Reset password with email OTP
- [x] Profile view with driver stats
- [x] Edit profile with photo upload
- [x] Change password
- [x] Settings (language AR/EN, RTL support, notifications)
- [x] Dashboard with today's stats, shift toggle
- [x] My Orders with tab filters (active/pending/delivered/failed)
- [x] Order Detail with package list, tracking timeline
- [x] Package-level delivery with photo + signature + COD
- [x] Package-level failure with 6 failure reasons
- [x] Delivery Summary (partial delivery breakdown)
- [x] Order search functionality
- [x] Return Order flow
- [x] Route Progress with stops
- [x] Stop Detail for multi-stop orders
- [x] History with date filters
- [x] Barcode Scanner with camera viewfinder + manual entry
- [x] Load Verify (manifest verification scanning)
- [x] Live map with delivery markers
- [x] Driver location tracking
- [x] Navigate to customer (Google Maps intent)
- [x] My Pickups list
- [x] Pickup Detail with arrived/confirm/fail workflow
- [x] Earnings with wallet balance, transactions, period filters
- [x] COD collection on delivery
- [x] Support ticket creation
- [x] Ticket list and detail view
- [x] Help/FAQ
- [x] Real-time Socket.IO integration
- [x] Push notifications (FCM)
- [x] Ratings screen with star distribution

### 🟡 Partially Complete / Needs Polish

| Feature | What's Missing |
|---------|---------------|
| Map Module | Tab-focus refresh, loading states, i18n |
| Offline Support | No offline queue for status updates |
| Background Location | Needs native iOS configuration |
| Deep Links | ResetPassword deep link not configured |

### 🔴 Not Started (Future Phases)

| Feature | Priority | Effort |
|---------|----------|--------|
| Route Optimization (OSRM/TSP) | High | Large |
| Shopify/WooCommerce integration | High | Large |
| Mid-route stop additions | Medium | Medium |
| Voice input for notes | Medium | Small |
| OCR label scanning | Medium | Medium |
| Apple Pay / Google Pay wallet | Low | Medium |

---

## 🐛 Known Bugs

| Severity | Bug | File | Status |
|----------|-----|------|--------|
| Medium | Bottom sheet can flash on initial render | `MapScreen.js` | ⬜ Open |
| Medium | `selectedOrder` shows stale data after background refresh | `MapScreen.js` | ⬜ Open |
| Medium | Status cycling has no confirmation dialog | `MapScreen.js` | ⬜ Open |
| Low | `getOrderCoords` can return (0, 0) for string "0" lat/lng | `mapUtils.js` | ⬜ Open |
| Low | ForgotPasswordScreen had no resend rate limiting | `ForgotPasswordScreen.js` | ✅ Fixed |

---

## 📱 Screen Inventory (35 Total)

```
src/screens/
├── auth/               (6 screens)
│   ├── LoginScreen.js
│   ├── ForgotPasswordScreen.js
│   ├── ResetPasswordScreen.js
│   ├── ChangePasswordScreen.js
│   ├── ProfileScreen.js
│   └── EditProfileScreen.js
│
├── dashboard/          (3 screens)
│   ├── DashboardScreen.js
│   ├── NotificationsScreen.js
│   └── SettingsScreen.js
│
├── orders/             (8 screens)
│   ├── MyOrdersScreen.js
│   ├── OrderDetailScreen.js
│   ├── PackageDeliverScreen.js
│   ├── PackageFailScreen.js
│   ├── DeliverySummaryScreen.js
│   ├── OrderSearchScreen.js
│   ├── ReturnOrderScreen.js
│   └── HistoryScreen.js
│
├── routes/             (3 screens)
│   ├── RouteProgressScreen.js
│   ├── StopDetailScreen.js
│   └── RouteMapScreen.js
│
├── scan/               (2 screens)
│   ├── ScannerScreen.js
│   └── LoadVerifyScreen.js
│
├── map/                (1 screen)
│   └── MapScreen.js
│
├── pickups/            (2 screens)
│   ├── MyPickupsScreen.js
│   └── PickupDetailScreen.js
│
├── financial/          (2 screens)
│   ├── EarningsScreen.js
│   └── WalletScreen.js
│
├── support/            (3 screens)
│   ├── SupportScreen.js
│   ├── TicketDetailScreen.js
│   └── HelpScreen.js
│
└── ratings/            (1 screen)
    └── RatingsScreen.js
```

---

## 🔧 API Modules (16 Total)

| Module | Endpoints | Status |
|--------|-----------|--------|
| `auth.js` | login, forgotPassword, resetPassword, logout | ✅ |
| `dashboard.js` | getDashboardStats, getRecentActivity | ✅ |
| `orders.js` | getOrders, getOrderDetail, updateOrderStatus | ✅ |
| `deliveries.js` | submitDelivery, uploadProof, uploadSignature | ✅ |
| `packages.js` | getPackages, updatePackageStatus | ✅ |
| `pickups.js` | getPickups, confirmPickup, failPickup | ✅ |
| `routes.js` | getRoutes, getRouteStops, updateStopStatus | ✅ |
| `scan.js` | scanBarcode, verifyManifest | ✅ |
| `location.js` | updateLocation, getDriverLocation | ✅ |
| `earnings.js` | getEarnings, getTransactions | ✅ |
| `cod.js` | submitCOD, getCODSummary | ✅ |
| `support.js` | getTickets, createTicket, getTicketDetail | ✅ |
| `notifications.js` | getNotifications, markRead | ✅ |
| `profile.js` | getProfile, updateProfile, uploadPhoto | ✅ |
| `settings.js` | getSettings, updateSettings | ✅ |
| `ratings.js` | getRatings, getRatingsSummary | ✅ |

---

## 📦 Dependencies to Add (Deferred)

These require native configuration and were deferred:

| Package | Purpose | Why Deferred |
|---------|---------|--------------|
| `@react-native-firebase/messaging` | Push notifications | Needs Firebase config |
| `react-native-background-geolocation` | Background tracking | Needs iOS entitlements |
| `react-native-deep-linking` | Deep links | Needs native URL schemes |

---

## 📝 Testing Checklist

### Authentication Flow
- [ ] Login with valid credentials
- [ ] Login with invalid credentials shows error
- [ ] Forgot password sends OTP email
- [ ] Reset password with valid OTP works
- [ ] Reset password with expired OTP fails
- [ ] Change password validates current password
- [ ] Logout clears session

### Order Flow
- [ ] Dashboard shows today's stats
- [ ] My Orders filters work correctly
- [ ] Order detail loads all packages
- [ ] Package delivery captures photo
- [ ] Package delivery captures signature
- [ ] COD amount validation works
- [ ] Package failure records reason
- [ ] Partial delivery calculates correctly

### Map Flow
- [ ] Map loads with driver location
- [ ] Order markers appear correctly
- [ ] Bottom sheet shows order info
- [ ] Navigate button opens Google Maps
- [ ] Status update reflects on marker

---

## 🚀 Deployment Notes

**Current Version:** 1.0.0  
**Target Platforms:** iOS 13+, Android 8+  
**API Base URL:** `https://dispatch.traseallo.com/api/driver-app`

### Build Commands
```bash
# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android

# Release builds
cd android && ./gradlew assembleRelease
```

---

## 📞 Contacts

- **Backend API:** `/delivery-service-backend/src/routes/driver-app.js`
- **API Docs:** `/driver_app/app/documentations/`
- **Postman Collection:** `/driver_app/app/documentations/Traseallo_Driver_App_API.postman_collection.json`
