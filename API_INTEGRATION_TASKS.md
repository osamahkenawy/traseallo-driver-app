# Traseallo Driver App — API Integration Tasks

> Cross-referenced from: Postman Collection (47 endpoints), Developer Guide, and full code audit of all 7 API modules, 4 stores, 21 screens, 3 hooks.

---

## Legend

| Icon | Meaning |
|------|---------|
| 🔴 | Not wired — screen is stub / feature missing entirely |
| 🟡 | Partially wired — API exists but screen has bugs or missing calls |
| 🟢 | Fully wired — works end-to-end (verify only) |

---

## PHASE 1 — Critical Fixes (Broken Wiring)

These are things that are **already built** but have bugs that will crash or silently fail.

### T1. Fix Socket.IO URL Port Mismatch
- **File:** `src/hooks/useSocket.js`
- **Bug:** DEV connects to `http://localhost:5000`, but backend is on port `4001`
- **Fix:** Change to `http://localhost:4001` (dev) / `wss://delivery.traseallo.com` (prod)
- **Impact:** Real-time order assignments and notifications are completely broken in dev
- **Severity:** 🔴 Critical

### T2. Fix EditProfile — Calls Non-Existent API Function
- **File:** `src/screens/profile/EditProfileScreen.js`
- **Bug:** Calls `uploadsApi.uploadAvatar(uri)` which **does not exist**. Will crash at runtime.
- **Fix:** Replace with `uploadsApi.uploadDriverPhoto(driverId, uri)`
- **Severity:** 🔴 Critical

### T3. Fix EditProfile — No Server-Side Profile Update
- **File:** `src/screens/profile/EditProfileScreen.js`
- **Bug:** Profile save only updates local Zustand store, never calls API
- **Fix:** Call `locationApi.getDriverProfile(driverId)` to fetch, and add new `PUT /api/drivers/{driverId}` call via `locationApi` (add `updateDriverProfile` function) to persist changes
- **Postman:** `PUT /api/drivers/{driver_id}` with `{ full_name, phone, email, vehicle_type, ... }`
- **Severity:** 🔴 Critical

### T4. Fix Proof of Delivery Upload URL
- **File:** `src/api/uploads.js`
- **Bug:** `uploadProofPhoto` posts to `/uploads/proofs` (generic)
- **Fix:** Should post to `/uploads/orders/{orderId}/proof` per Postman collection
- **Requires:** Pass `orderId` as parameter, update `DeliveryConfirmScreen` and `FailureReportScreen`
- **Severity:** 🟡 High

### T5. Fix Production API URL
- **File:** `src/api/client.js`
- **Bug:** Production URL is `https://api.trasealla.com/api` (old domain, old brand)
- **Fix:** Change to `https://delivery.traseallo.com/api` per developer guide
- **Severity:** 🟡 High (blocks production deployment)

### T6. Fix useOrders Hook — Status Tab Changes Don't Re-fetch
- **File:** `src/hooks/useOrders.js`
- **Bug:** `fetchOrders` and `setDriverId` are not in `useEffect` dependency array — only runs once regardless of `status` changes. Tab switching appears to work but uses stale data.
- **Fix:** Add `status` to useEffect deps, or refetch on tab change
- **Severity:** 🟡 High

### T7. Fix orderStore Response Unwrapping
- **File:** `src/store/orderStore.js`
- **Bug:** `fetchOrderDetail` does `set({selectedOrder: res.data})` but API returns `{ success, data: {...} }` so it should be `res.data.data || res.data`
- **Fix:** Consistent response unwrapping like authStore: `const data = res.data?.data || res.data`
- **Severity:** 🟡 High

### T8. Fix Currency Display — Replace "$" with "AED"
- **Files:** DashboardScreen, EarningsScreen, OrderDetailScreen, and any screen showing prices
- **Bug:** Dollar sign hardcoded, should be AED per developer guide
- **Fix:** Global find/replace `$` → `AED ` in monetary display, or create a `formatCurrency(amount)` utility
- **Severity:** 🟡 Medium

---

## PHASE 2 — Missing API Wiring (Screens Exist, API Not Connected)

### T9. Wire Notifications — Delete Individual + Clear All
- **File:** `src/store/notificationStore.js`, `src/screens/tabs/NotificationsScreen.js`
- **Missing:** `deleteNotification(id)` and `clearAllNotifications()` — API functions exist in Postman but not in `notificationsApi` module or store
- **Postman:** `DELETE /api/user-notifications/{id}`, `DELETE /api/user-notifications`
- **Tasks:**
  1. Add `deleteNotification(id)` and `clearAll()` to `src/api/notifications.js`
  2. Add store actions for both
  3. Add swipe-to-delete or long-press-delete on notification items
  4. Add "Clear All" button to notifications screen header

### T10. Wire Dashboard — COD Collected Today
- **File:** `src/screens/tabs/DashboardScreen.js`
- **Missing:** COD collected card shows hardcoded `$0` — no wallet API call
- **Fix:** Use `data.stats.revenue` from the `my-orders` response (already fetched!) OR call `walletApi.getCodSummary()` for more detail
- **Task:** Map `stats.revenue` to the COD collected card

### T11. Wire Profile Screen — Fetch Real Driver Profile
- **File:** `src/screens/profile/ProfileScreen.js`
- **Missing:** Currently only shows auth user data from `useAuth()`. Missing: vehicle info, zone, rating, delivery stats
- **Postman:** `GET /api/drivers/{driver_id}`
- **Tasks:**
  1. Create a `profileStore` or add `fetchDriverProfile` action to authStore
  2. Fetch on ProfileScreen mount
  3. Display vehicle type, plate, total delivered, rating

### T12. Wire Notifications Badge on Tab Bar
- **File:** `src/navigation/TabNavigator.js`
- **Missing:** No unread count badge on the Notifications tab icon
- **Tasks:**
  1. Use `useNotificationStore.unreadCount` in TabNavigator
  2. Render badge with count on the bell icon
  3. Poll `fetchUnreadCount()` periodically or rely on socket `notification` event

### T13. Wire Notification Unread Count Polling
- **File:** `src/hooks/useSocket.js` or a new `useNotificationPoller.js` hook
- **Missing:** No periodic poll of unread count. Socket event handles new notifications but if missed, count drifts.
- **Fix:** On app focus / every 60s, call `notificationStore.fetchUnreadCount()`

---

## PHASE 3 — Stub Screens (Need Full Implementation)

### T14. 🔴 EarningsScreen — Full Implementation
- **File:** `src/screens/earnings/EarningsScreen.js`
- **Current:** All hardcoded `$0.00`, "No transactions yet"
- **Missing API modules:** `src/api/earnings.js` does not exist, `src/store/earningsStore.js` does not exist
- **Postman Endpoints:**
  - `GET /api/driver-earnings?driver_id={id}` — earnings list
  - `GET /api/driver-earnings/summary` — total base/bonus/deductions/net/paid/pending
  - `GET /api/wallet` — balance, COD pending, held balance
  - `GET /api/wallet/transactions?page=1&limit=20` — transaction history
  - `GET /api/cod/summary` — COD summary per driver
- **Tasks:**
  1. Create `src/api/earnings.js` with: `getEarnings(driverId, params)`, `getEarningSummary()`, `getWallet()`, `getWalletTransactions(params)`, `getCodSummary()`
  2. Create `src/store/earningsStore.js` with state + fetch actions
  3. Rewrite EarningsScreen to:
     - Show wallet balance card (balance, held, COD pending)
     - Show earnings summary (total earned, bonuses, deductions, net)
     - Show transaction history list with pagination
     - Period filter (today/week/month/all)
  4. Wire pull-to-refresh

### T15. 🔴 RatingsScreen — Full Implementation
- **File:** `src/screens/ratings/RatingsScreen.js`
- **Current:** All hardcoded `0.0`, all bar percentages `0`
- **Postman:** `GET /api/drivers/{driver_id}/ratings`
- **API Function:** `locationApi.getDriverRatings(driverId)` — **already exists!**
- **Tasks:**
  1. Fetch ratings on mount using `locationApi.getDriverRatings(driverId)`
  2. Calculate star distribution (5★ → 1★ percentages) from individual ratings
  3. Display average rating, total count, distribution bars
  4. Show individual review cards (reviewer name, date, stars, comment)
  5. Wire pull-to-refresh

### T16. 🔴 ScannerScreen — Full Implementation
- **File:** `src/screens/scanner/ScannerScreen.js`
- **Current:** Static UI only, no camera, no barcode scanning
- **Postman Endpoints:**
  - `POST /api/tracking/{tracking_token}/scan` — log scan event
  - `POST /api/orders/validate-pregenerated` — validate barcode
  - `GET /api/tracking/{tracking_token}` — lookup order (public)
- **API Functions:** `ordersApi.scanOrder()`, `ordersApi.searchOrder()` — **already exist!**
- **Tasks:**
  1. Install `react-native-camera-kit` or `react-native-vision-camera` (RN 0.70 compatible)
  2. Implement camera viewfinder with barcode detection
  3. On barcode detected → call `ordersApi.scanOrder(token, { scan_type: 'driver_scan', lat, lng })`
  4. Show scan result (order details or error)
  5. Add "Enter Code Manually" input → call `ordersApi.searchOrder(code)` or `ordersApi.scanOrder(code, ...)`
  6. Add scan type selector (pickup_scan / delivery_scan / driver_scan)
  7. Handle auto-status-transitions from scan (pickup_scan → picked_up, delivery_scan → delivered)

### T17. 🔴 MyPickupsScreen — Full Implementation
- **File:** `src/screens/pickup/MyPickupsScreen.js`
- **Current:** Only shows empty state ("No pickups assigned"), no API call
- **Postman:** `GET /api/pickup/driver/my-pickups`
- **API Function:** `pickupApi.getMyPickups()` — **already exists!**
- **Tasks:**
  1. Create `src/store/pickupStore.js` with: `fetchMyPickups()`, pickup state
  2. Fetch pickups on mount
  3. Render pickup list cards (sender name, address, item count, scheduled time, status)
  4. Navigate to PickupDetailScreen on tap
  5. Wire pull-to-refresh
  6. Show pickup stats (pending/arrived/completed/failed counts)

### T18. 🔴 PickupDetailScreen — Full Implementation
- **File:** `src/screens/pickup/PickupDetailScreen.js`
- **Current:** All hardcoded placeholders ("—", "0 items", "Pending Pickup")
- **Postman Endpoints:**
  - `POST /api/pickup/{order_id}/arrived` — mark arrived
  - `POST /api/pickup/{order_id}/confirm` — confirm collected
  - `POST /api/pickup/{order_id}/fail` — mark failed
- **API Functions:** All exist in `pickupApi`!
- **Tasks:**
  1. Accept pickup data via route params
  2. Display: sender info, items list, notes, scheduled time, pickup address
  3. "Navigate to Pickup" → open Apple Maps/Google Maps with pickup coordinates
  4. "I've Arrived" button → `pickupApi.markArrived(orderId, { lat, lng })`
  5. "Confirm Pickup" button → `pickupApi.confirmPickup(orderId, { barcode_scanned: true, lat, lng })`
  6. "Failed Pickup" button → show failure reason modal → `pickupApi.failPickup(orderId, { reason, lat, lng })`
  7. Status-based CTA progression (arrive → confirm/fail)
  8. Call customer button

---

## PHASE 4 — Enhancement Features

### T19. Add Tenant Branding to Login Screen
- **File:** `src/screens/auth/LoginScreen.js`
- **Postman:** `GET /api/auth/branding?slug={tenant_slug}` — returns logo and tenant name
- **API Function:** `authApi.getBranding(slug)` — **already exists!**
- **Task:** When user enters subdomain, fetch branding and show tenant logo/name above login form

### T20. Add Notification Delete & Clear-All to UI
- **File:** `src/screens/tabs/NotificationsScreen.js`
- **Tasks:**
  1. Add swipe-to-delete gesture on notification items
  2. Add "Clear All" action in header
  3. Connect to new store actions from T9

### T21. Fix navigator.geolocation — Install Geolocation Package
- **File:** `src/hooks/useLocation.js`
- **Bug:** `navigator.geolocation` was removed from RN core. GPS watching silently fails.
- **Fix:** Install `@react-native-community/geolocation` (or `react-native-geolocation-service`) and import explicitly
- **Impact:** GPS tracking, location pings, and map centering are all broken without this

### T22. Add GPS-Stamping to All Status Updates
- **Files:** `DeliveryConfirmScreen.js`, `FailureReportScreen.js`, `OrderDetailScreen.js`
- **Docs:** "Include lat + lng on every status update for GPS stamping"
- **Task:** Get current position from locationStore and include `lat`, `lng` in all `updateOrderStatus` calls

### T23. Add COD Collection on Delivery
- **Files:** `DeliveryConfirmScreen.js`
- **Docs:** "On delivered with COD: send cod_collected_amount in the body"
- **Task:** If order has `cod_amount > 0`, show COD collection input/confirmation, send `cod_collected_amount` in status update body

### T24. Wire Profile Photo Display
- **Files:** `ProfileScreen.js`, `DashboardScreen.js`
- **Prerequisite:** T11 (fetch driver profile)
- **Task:** If driver has a profile photo, display it using `uploadsApi.getFileUrl(path)`. Currently shows placeholder avatar.

### T25. Add Deep Link Config for ResetPassword
- **File:** Navigation config (linking), `ios/app/Info.plist`, `android/AndroidManifest.xml`
- **Bug:** ResetPasswordScreen can only receive `token` via route params, but no deep link is configured
- **Task:** Configure `traseallo://reset-password?token=...` deep link to navigate to ResetPasswordScreen with the token

### T26. Fix Duplicate Language Row in Settings
- **File:** `src/screens/settings/SettingsScreen.js`
- **Bug:** "Language" row rendered twice (copy-paste bug)
- **Fix:** Remove duplicate

### T27. Cache Auth Headers In-Memory
- **File:** `src/api/client.js`
- **Perf:** 3 async `AsyncStorage.getItem()` calls on every single HTTP request
- **Fix:** Cache token, slug, and tenantId in module-level variables. Update on login/logout. Fall back to AsyncStorage only on cold start.

### T28. Add Profile Screen "Support" Handler
- **File:** `src/screens/profile/ProfileScreen.js`
- **Bug:** "Support" menu item has `onPress={() => {}}` — dead handler
- **Fix:** Navigate to a support screen, open email compose, or open WhatsApp/phone

---

## PHASE 5 — Nice-to-Have / Polish

### T29. Notification Press → Navigate to Related Screen
- **File:** `NotificationsScreen.js`
- **Task:** On notification press, if `data.order_id` exists, navigate to OrderDetail. If it's a pickup notification, navigate to PickupDetail.

### T30. Add Order Search
- **File:** `MyOrdersScreen.js`
- **API:** `ordersApi.searchOrder(orderNumber)` — already exists
- **Task:** Add search bar to orders screen, search by order number or tracking token

### T31. Socket Event — Auto-Refresh on Order Updated
- **File:** `src/hooks/useSocket.js`
- **Missing:** Developer guide mentions `order:updated` event but hook only listens for `order:assigned` and `order:status-changed`
- **Task:** Add `order:updated` listener that refreshes orders and notification count

### T32. Add Push Notification Registration
- **Postman:** `POST /api/notifications/push/subscribe`
- **API Function:** `notificationsApi.subscribePush()` — **already exists**
- **Task:** On login, get FCM token and register it. Requires `@react-native-firebase/messaging` setup.

### T33. Background Location Tracking (iOS)
- **Task:** Enable background location updates so GPS pings continue when app is backgrounded (requires iOS capability + RNConfig)

### T34. Offline Queue for Status Updates
- **Docs:** "Queue status updates when offline, sync when back online"
- **Task:** Detect network state, queue failed status updates in AsyncStorage, sync on reconnect

---

## Summary Table

| # | Task | Phase | Status | Screen(s) Affected |
|---|------|-------|--------|---------------------|
| T1 | Fix Socket URL port | 1 | � Done | All (real-time broken) |
| T2 | Fix EditProfile uploadAvatar crash | 1 | 🟢 Done | EditProfile |
| T3 | Wire EditProfile server-side save | 1 | 🟢 Done | EditProfile |
| T4 | Fix proof-of-delivery upload URL | 1 | 🟢 Done | DeliveryConfirm, FailureReport |
| T5 | Fix production API URL | 1 | 🟢 Done | All |
| T6 | Fix useOrders re-fetch on tab change | 1 | 🟢 Done | MyOrders |
| T7 | Fix orderStore response unwrapping | 1 | 🟢 Done | OrderDetail |
| T8 | Fix currency "$" → "AED" | 1 | 🟢 Done | Dashboard, Orders, Earnings |
| T9 | Add notification delete/clear-all API | 2 | 🟢 Done | Notifications |
| T10 | Wire dashboard COD from stats | 2 | 🟢 Done | Dashboard |
| T11 | Fetch real driver profile | 2 | 🟢 Done | Profile |
| T12 | Add notifications badge on tab | 2 | 🟢 Done | TabNavigator |
| T13 | Add unread count polling | 2 | 🟢 Done | Global |
| T14 | EarningsScreen full implementation | 3 | 🟢 Done | Earnings |
| T15 | RatingsScreen full implementation | 3 | 🟢 Done | Ratings |
| T16 | ScannerScreen full implementation | 3 | 🟢 Done | Scanner |
| T17 | MyPickupsScreen full implementation | 3 | 🟢 Done | MyPickups |
| T18 | PickupDetailScreen full implementation | 3 | 🟢 Done | PickupDetail |
| T19 | Tenant branding on login | 4 | 🟢 Done | Login |
| T20 | Notification delete/clear UI | 4 | 🟢 Done | Notifications |
| T21 | Install geolocation package | 4 | ⏭️ Skipped | useLocation, Map (needs native install) |
| T22 | GPS-stamp all status updates | 4 | 🟢 Done | DeliveryConfirm, FailureReport |
| T23 | COD collection on delivery | 4 | 🟢 Done | DeliveryConfirm |
| T24 | Wire profile photo display | 4 | 🟢 Done | Profile (Dashboard uses app logo) |
| T25 | Deep link for ResetPassword | 4 | ⏭️ Skipped | Navigation (needs native config) |
| T26 | Fix duplicate language row | 4 | 🟢 Done | Settings |
| T27 | Cache auth headers in-memory | 4 | 🟢 Done | client.js |
| T28 | Wire "Support" button | 4 | 🟢 Done | Profile |
| T29 | Notification → navigate to order | 5 | 🟢 Done | Notifications |
| T30 | Add order search | 5 | 🟢 Done | MyOrders |
| T31 | Listen for order:updated socket event | 5 | 🟢 Done | useSocket |
| T32 | Push notification registration (FCM) | 5 | ⏭️ Skipped | Global (needs @react-native-firebase) |
| T33 | Background location tracking | 5 | ⏭️ Skipped | iOS config (needs capability setup) |
| T34 | Offline queue for status updates | 5 | ⏭️ Skipped | Global (complex native architecture) |

---

## API Coverage Matrix

| Postman Endpoint | API Module | Store | Screen | Status |
|------------------|-----------|-------|--------|--------|
| `POST /auth/login` | ✅ authApi | ✅ authStore | ✅ Login | 🟢 Working |
| `GET /auth/session` | ✅ authApi | ✅ authStore | ✅ Splash/Nav | 🟢 Working |
| `POST /auth/logout` | ✅ authApi | ✅ authStore | ✅ Profile | 🟢 Working |
| `POST /auth/forgot-password` | ✅ authApi | — | ✅ ForgotPwd | 🟢 Working |
| `POST /auth/reset-password` | ✅ authApi | — | ✅ ResetPwd | 🟡 No deep link |
| `PUT /auth/change-password` | ✅ authApi | — | ✅ ChangePwd | 🟢 Working |
| `GET /auth/branding` | ✅ authApi | — | ✅ Login | 🟢 Working |
| `GET /tracking/my-orders` | ✅ ordersApi | ✅ orderStore | ✅ Dashboard/Orders | 🟢 Working |
| `GET /tracking/{token}/order` | ✅ ordersApi | ✅ orderStore | ✅ OrderDetail | 🟢 Working |
| `PATCH /tracking/{token}/status` | ✅ ordersApi | ✅ orderStore | ✅ DeliveryConfirm | 🟢 GPS+COD |
| `POST /tracking/start-trip` | ✅ ordersApi | ✅ orderStore | ✅ MapScreen | 🟢 Working |
| `POST /tracking/{token}/scan` | ✅ ordersApi | — | ✅ Scanner | 🟢 Working |
| `GET /tracking/{token}` | ✅ ordersApi | — | ✅ Scanner | 🟢 Working |
| `POST /orders/validate-pregenerated` | ❌ Missing | — | ❌ Scanner | 🟡 Manual search only |
| `PATCH /drivers/{id}/status` | ✅ locationApi | ✅ locationStore | ✅ Dashboard/Map | 🟢 Working |
| `POST /drivers/{id}/location` | ✅ locationApi | ✅ locationStore | ✅ Background | 🟡 GPS pkg missing |
| `GET /drivers/{id}/location` | ✅ locationApi | — | — | 🟡 Not used in UI |
| `GET /drivers/{id}/location-history` | ✅ locationApi | — | — | 🟡 Not used in UI |
| `GET /drivers/{id}` | ✅ locationApi | — | ✅ Profile | 🟢 Working |
| `PUT /drivers/{id}` | ✅ locationApi | — | ✅ EditProfile | 🟢 Working |
| `GET /drivers/{id}/ratings` | ✅ locationApi | — | ✅ Ratings | 🟢 Working |
| `GET /user-notifications` | ✅ notifApi | ✅ notifStore | ✅ Notifs | 🟢 Working |
| `GET /user-notifications/unread-count` | ✅ notifApi | ✅ notifStore | ✅ TabBar | 🟢 Working |
| `POST /user-notifications/{id}/read` | ✅ notifApi | ✅ notifStore | ✅ Notifs | 🟢 Working |
| `POST /user-notifications/read-all` | ✅ notifApi | ✅ notifStore | ✅ Notifs | 🟢 Working |
| `DELETE /user-notifications/{id}` | ✅ notifApi | ✅ notifStore | ✅ Notifs | 🟢 Working |
| `DELETE /user-notifications` | ✅ notifApi | ✅ notifStore | ✅ Notifs | 🟢 Working |
| `POST /notifications/push/subscribe` | ✅ notifApi | — | ❌ — | ⏭️ Needs FCM setup |
| `POST /uploads/drivers/{id}/photo` | ✅ uploadsApi | — | ✅ EditProfile | 🟢 Working |
| `POST /uploads/orders/{id}/proof` | ✅ uploadsApi | — | ✅ DeliveryConfirm | 🟢 Working |
| `GET /driver-earnings` | ✅ walletApi | — | ✅ Earnings | 🟢 Working |
| `GET /driver-earnings/summary` | ✅ walletApi | — | ✅ Earnings | 🟢 Working |
| `GET /wallet` | ✅ walletApi | — | ✅ Earnings | 🟢 Working |
| `GET /wallet/transactions` | ✅ walletApi | — | ✅ Earnings | 🟢 Working |
| `GET /wallet/cod-orders` | ✅ walletApi | — | ✅ Earnings | 🟢 Working |
| `POST /wallet/collect-cod` | ✅ walletApi | — | ✅ DeliveryConfirm | 🟢 Working |
| `GET /cod/summary` | ✅ walletApi | — | ✅ Dashboard | 🟢 Working |
| `GET /pickup/driver/my-pickups` | ✅ pickupApi | — | ✅ MyPickups | 🟢 Working |
| `POST /pickup/{id}/arrived` | ✅ pickupApi | — | ✅ PickupDetail | 🟢 Working |
| `POST /pickup/{id}/confirm` | ✅ pickupApi | — | ✅ PickupDetail | 🟢 Working |
| `POST /pickup/{id}/fail` | ✅ pickupApi | — | ✅ PickupDetail | 🟢 Working |

---

## Recommended Execution Order

1. **T1** → Socket URL fix (unblocks real-time)
2. **T5** → Production URL fix
3. **T2 + T3** → EditProfile crash + server save
4. **T7** → Response unwrapping (prevents data bugs)
5. **T4** → Proof upload URL
6. **T6** → Orders tab re-fetch
7. **T8** → Currency AED
8. **T21** → Geolocation package (unblocks T22)
9. **T22** → GPS stamping
10. **T10 + T11** → Dashboard COD + Profile fetch
11. **T9 + T12 + T13** → Notification improvements
12. **T14** → Earnings screen
13. **T15** → Ratings screen
14. **T17 + T18** → Pickups flow
15. **T16** → Scanner (needs native camera package)
16. **T23** → COD collection flow
17. **T19 - T34** → Enhancement features

**Estimated total: ~34 tasks across 5 phases**
