# Trasealla Driver App — Tasks & Bugs

> Generated: March 6, 2026  
> Total Issues: **57+**  
> Critical: 4 | High: 30+ | Medium: 15+ | Low: 8

---

## CRITICAL (Fix Immediately)

- [x] **BUG: ForgotPasswordScreen broken import** — `import {forgotPassword} from '../../api/auth'` uses named import but `auth.js` only has a default export. Will crash at runtime when "Send Reset Link" is pressed. Fix: `import authApi from '../../api/auth'` then `authApi.forgotPassword(email)`.
- [x] **BUG: Driver status mismatch** — `locationStore` uses `'offline' | 'available' | 'busy'` but `DashboardScreen` checks `driverStatus === 'online'` — the string `'online'` never exists. Dashboard badge always shows "Offline" even when available.
- [x] **BUG: useSocket hook never called** — `useSocket` is fully implemented but never invoked in any component. Real-time order assignments and live notifications are completely dead.
- [x] **BUG: useLocation hook never called** — `useLocation` is fully implemented but never invoked. GPS tracking and location pings never start.

---

## HIGH PRIORITY

### Stub Screens (No Real Content)

- [ ] **MapScreen** — Says "Map integration coming soon." No map rendering, no location data, no delivery markers.
- [ ] **ScannerScreen** — Static QR icon frame. No camera integration, no barcode scanning library. "Enter Code Manually" button has no `onPress`.
- [ ] **MyPickupsScreen** — Only shows "No pickups assigned" empty state. No API call, no FlatList, no data flow.
- [ ] **PickupDetailScreen** — All info values hardcoded as `"—"` and `"0 items"`. No API call, no route param usage.
- [ ] **EarningsScreen** — Hardcoded `$0.00` values. "No transactions yet" static empty state. No API integration.
- [ ] **RatingsScreen** — Hardcoded `0.0` rating, all bars at `0%`, performance badges show `"—"`. No API integration.

### Missing API Integrations

- [x] **EditProfileScreen** — "Save Changes" button has **no `onPress` prop at all**. No profile update API endpoint exists.
- [x] **ChangePasswordScreen** — "Update Password" button has **no `onPress` prop**. `authApi.changePassword()` exists but is unused.
- [x] **ResetPasswordScreen** — "Reset Password" button has **no `onPress` prop**. `authApi.resetPassword()` exists but is unused.
- [x] **DeliveryConfirmScreen** — `handleConfirm` just calls `navigation.goBack()`. No API call to confirm delivery, no photo upload. `ordersApi.updateOrderStatus()` and `uploadsApi.uploadProofPhoto()` exist but unused.
- [x] **FailureReportScreen** — `handleReport` just calls `navigation.goBack()`. No API call to report failure. `ordersApi.updateOrderStatus()` exists but unused.
- [ ] **EarningsScreen** — `walletApi.getCodSummary()` and `walletApi.getCodOrders()` exist but are never called.
- [ ] **RatingsScreen** — `locationApi.getDriverRatings()` exists but is never called.
- [ ] **MyPickupsScreen** — `pickupApi.getMyPickups()` exists but is never called.
- [ ] **PickupDetailScreen** — `pickupApi` has `markArrived`, `confirmPickup`, `failPickup` — all unused. "Navigate to Pickup" button does nothing.

### Missing Zustand Stores

- [ ] **No Pickup Store** — `pickupApi` has 4 endpoints but no Zustand store for pickups.
- [ ] **No Wallet/Earnings Store** — `walletApi` has 3 endpoints but no Zustand store for earnings.
- [ ] **No Ratings Store** — `locationApi.getDriverRatings()` exists but no store to manage rating data.

### Buttons Without Handlers

- [x] **OrderDetailScreen** — "Call", "Navigate", "Copy" action buttons have no real `onPress` implementation.
- [x] **DeliveryConfirmScreen** — "Tap to take a photo" box has no `onPress` to open camera.
- [ ] **PickupDetailScreen** — "Navigate to Pickup" button has no `onPress`.

### State Issues

- [x] **EditProfileScreen** — form fields start empty (`useState('')`). Never loads current user data from `authStore`.
- [ ] **driverId discovery fragile** — `driverId` is only discovered when `useOrders` fetches orders. If first fetch fails, driverId stays null and GPS tracking, status updates, location pings all silently fail.

---

## MEDIUM PRIORITY

### Empty `onPress` Handlers

- [ ] **ProfileScreen** — "Support" menu item: `onPress={() => {}}`.
- [x] **SettingsScreen** — "Notifications" setting: no notification settings UI.
- [x] **SettingsScreen** — "Terms of Service": no navigation to TOS page/webview.
- [x] **SettingsScreen** — "Privacy Policy": no navigation to Privacy Policy page/webview.
- [ ] **ScannerScreen** — "Enter Code Manually" button: no `onPress` logic.
- [x] **FailureReportScreen** — "Add a photo" button: no `onPress` to open camera.
- [x] **EditProfileScreen** — Camera button on avatar: no `onPress` to trigger image picker.

### Navigation Issues

- [ ] **OnboardingScreen not registered** — Imported in `RootNavigator` but never added as a `<Stack.Screen>`. Route `routeNames.Onboarding` exists but leads nowhere.
- [ ] **OnboardingScreen** — Uses string `'Login'` instead of `routeNames.Login` in `navigation.replace()`.

### Unused API Modules

- [ ] `uploadsApi` — fully implemented, never imported by any screen.
- [ ] `walletApi` — fully implemented, never imported by any screen.
- [ ] `pickupApi` — fully implemented, never imported by any screen.
- [ ] `ordersApi.scanOrder()` — exists but ScannerScreen doesn't use it.
- [ ] `ordersApi.searchOrder()` — exists but no search UI in app.
- [ ] `ordersApi.getOrderStats()` — exists but never called.

### Notification Issues

- [ ] `notificationStore.fetchUnreadCount` — exists but never called at startup. Badge count only updates from (non-functional) socket events.
- [ ] `notificationsApi.subscribePush` / `unsubscribePush` — push registration endpoints exist but no FCM integration.

### Missing Error Handling

- [ ] **NotificationsScreen** — `fetchNotifications()` on mount has no `.catch()` and no error UI.
- [ ] **OrderDetailScreen** — `fetchOrderDetail(token)` called without error handling. No error UI if fetch fails.

---

## LOW PRIORITY

### Hardcoded Values

- [x] **SettingsScreen** — Version hardcoded as `"1.0.0"`. Should read from `package.json` or app config.
- [ ] **ProfileScreen** — Footer text `"Trasealla Driver v1.0.0"` is hardcoded.

### Dead Code

- [x] **DashboardScreen** — `const CARD_W = (SW - 40 - 14) / 2` is declared but never used.
- [ ] **routeNames.Splash** — defined in constants but never used as a navigable route (SplashScreen rendered inline).

### Minor Consistency

- [ ] Some unused API methods: `locationApi.getLocation`, `locationApi.getLocationHistory`, `locationApi.getDriverProfile` — exist but no screen calls them.

---

## TOP 5 FIXES TO PRIORITIZE

| # | Issue | Impact |
|---|-------|--------|
| 1 | Fix ForgotPasswordScreen import (runtime crash) | App crashes when user taps "Send Reset Link" |
| 2 | Fix `driverStatus === 'online'` mismatch | Dashboard always shows "Offline" |
| 3 | Wire up `useSocket` + `useLocation` in App.js | Real-time features & GPS completely dead |
| 4 | Add API calls to DeliveryConfirm + FailureReport | Core delivery flow is non-functional |
| 5 | Add `onPress` to ChangePassword, EditProfile, ResetPassword | 3 screens have dead buttons |
