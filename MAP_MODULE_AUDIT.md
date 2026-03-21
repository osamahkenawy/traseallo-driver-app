# Map Module Audit

## Bugs

| # | Severity | Issue | File | Detail |
|---|----------|-------|------|--------|
| B1 | Medium | Bottom sheet visible on initial render | MapScreen.js | `Animated.View` is always mounted — the white container with rounded corners sits just off-screen and can flash on short devices or intercept touch events at the bottom edge |
| B2 | Low | `getOrderCoords` can return `(0, 0)` | MapScreen.js | If API returns `"0"` as a string for lat/lng it passes the truthy filter and places a marker at Null Island (Atlantic Ocean) |
| B3 | Medium | `selectedOrder` stale data | MapScreen.js | `selectedOrder` is a `useState` snapshot. If orders refresh in the background (socket event / 30s poll), the bottom sheet still shows old data — not synced to updated `orders` array |
| B4 | Low | Unused `SW` constant | MapScreen.js | `const {width: SW} = Dimensions.get('window')` imported but never used — lint warning |
| B5 | Low | Unused `getOrderCoords` prop on `OrderSheet` | MapScreen.js | Passed as prop but never consumed inside the component |
| B6 | Low | `fetchOrders` missing from useEffect deps | MapScreen.js | `useEffect(() => { fetchOrders('active'); }, [])` — function in closure but not in dependency array — React lint warning |
| B7 | Low | Status chip bg uses raw hex suffix `'14'` | MapScreen.js | `colors.success + '14'` creates 8-digit hex (`#15C7AE14` ≈ 8% alpha). Works in RN but inconsistent with the rest of the app which uses `rgba()` or semantic tokens like `successBg` |
| B8 | Medium | Status cycling has no confirmation | MapScreen.js | Accidentally tapping the chip cycles through offline/available/busy and fires an API call. Going offline stops GPS tracking — no undo or "are you sure?" prompt |

## Missing Features

| # | Priority | Feature | Detail |
|---|----------|---------|--------|
| M1 | High | No tab-focus refresh | When user navigates away and returns to Map tab, orders are not refetched. Need `useFocusEffect` from `@react-navigation/native` to call `fetchOrders('active')` on focus |
| M2 | High | No loading indicator | No activity indicator on initial load or refresh. The refresh FAB fires `fetchOrders` silently with no visual feedback |
| M3 | Medium | No "Fit all markers" button | When multiple deliveries exist, no way to zoom out to see all of them. Should add a FAB that calls `mapRef.fitToCoordinates(...)` |
| M4 | Medium | No call-customer button in sheet | The bottom sheet shows the phone number but has no quick "Call" action. Only Navigate + View Detail buttons exist |
| M5 | Low | No marker clustering | If two orders share the same lat/lng (same building), markers overlap with no indication. Need clustering or a count bubble |
| M6 | Medium | No real-time socket location emit | Map reads `currentPosition` from store but never emits it to the socket (`useSocket.emitLocation`). HTTP pings happen via `locationStore.sendPing`, but real-time broadcast is not triggered |
| M7 | Low | No ETA / distance display | No estimated time or distance shown from driver to selected delivery in the bottom sheet |
| M8 | Low | No swipe-to-dismiss on bottom sheet | Only the small handle bar tap and map press dismiss it. No `PanResponder` drag gesture |
| M9 | Low | No custom map style | Map uses default Apple/Google styling. No custom map JSON for a branded look |
| M10 | Medium | No "Start Trip" action on map | `orderStore.startTrip()` exists but there's no button to batch-start all assigned orders (assigned → in_transit) from the map |
| M11 | Medium | No i18n | All strings are hardcoded English. Other screens use `useTranslation` from i18next |
| M12 | Low | No custom driver marker | Uses default blue dot via `showsUserLocation`. A custom driver icon (car/truck) would be more professional |
