# Traseallo Driver App — Developer Guide

> Backend: Express.js + MySQL + Socket.IO  
> Production API: `https://delivery.traseallo.com/api`  
> Local API: `http://localhost:4001/api`  
> Port: 4001

---

## 1. Authentication Flow

```
POST /api/auth/login
Body: { "username": "<email_or_username>", "password": "<password>" }
Response: { success, data: { token, id, role, tenant, full_name, ... } }
```

- Store the **JWT token** securely (Keychain on iOS, EncryptedSharedPrefs on Android)
- Send on every request: `Authorization: Bearer <token>`
- The token includes `user_id`, `tenant_id`, and `role`
- Driver role = `"driver"` — the backend maps `user_id → driver_id` internally
- **To get `driver_id`**: call `GET /api/tracking/my-orders` — it returns `data.driver.id`
- Session validation: `GET /api/auth/session` — use on app launch to check if token is still valid

### Resolving driver_id

The login response gives you a `user_id` (the auth user). The `driver_id` (from the `drivers` table) is different. The mapping is: `users.id → drivers.user_id`.

**Simplest approach**: After login, immediately call:
```
GET /api/tracking/my-orders?status=all
```
The response includes `data.driver.id` — save this as your `driver_id` for all subsequent calls.

---

## 2. Screen-by-Screen API Mapping

### Dashboard Screen
| Action | API Call |
|--------|---------|
| Load dashboard | `GET /api/tracking/my-orders?status=all` |
| Toggle online/offline | `PATCH /api/drivers/{driver_id}/status` with `{ "status": "available" }` or `{ "status": "offline" }` |
| Stats (assigned/in-transit/delivered) | Comes from `my-orders` response: `data.stats` and `data.tabCounts` |
| Today's total orders | `data.stats.active + data.stats.delivered + data.stats.failed` |
| COD collected today | `data.stats.revenue` (today's collected COD) |

### My Orders Screen
| Action | API Call |
|--------|---------|
| All orders | `GET /api/tracking/my-orders?status=all` |
| Active only (default) | `GET /api/tracking/my-orders` |
| Completed tab | `GET /api/tracking/my-orders?status=completed` |
| Failed tab | `GET /api/tracking/my-orders?status=failed` |
| Order detail | `GET /api/tracking/{tracking_token}/order` |
| Update status | `PATCH /api/tracking/{tracking_token}/status` with `{ "status": "picked_up" }` |
| Start all deliveries | `POST /api/tracking/start-trip` |

**Tab badge counts** come from `data.tabCounts: { active, delivered, failed }` — no extra API calls needed.

### Status Transition Rules
```
pending → confirmed → assigned → picked_up → in_transit → delivered
                                                        → failed
                                                        → returned
```
- Driver can only update orders assigned to them
- Must follow valid transitions (can't skip steps)
- Include `lat` + `lng` on every status update for GPS stamping
- On `delivered` with COD: send `cod_collected_amount` in the body

### Live Map Screen
| Action | API Call |
|--------|---------|
| Send GPS ping | `POST /api/drivers/{driver_id}/location` with `{ "latitude": ..., "longitude": ..., "speed": ..., "heading": ... }` |
| Get my last location | `GET /api/drivers/{driver_id}/location` |
| Get my trail | `GET /api/drivers/{driver_id}/location-history?limit=100` |

**GPS frequency**: Send location every **10-30 seconds** when driver is online. Stop when offline.

### Notifications Screen
| Action | API Call |
|--------|---------|
| List notifications | `GET /api/user-notifications?page=1&limit=20` |
| Badge count | `GET /api/user-notifications/unread-count` |
| Mark all read | `POST /api/user-notifications/read-all` |
| Mark one read | `POST /api/user-notifications/{id}/read` |
| Delete one | `DELETE /api/user-notifications/{id}` |
| Clear all | `DELETE /api/user-notifications` |

**Poll unread count** every 30-60 seconds, or use Socket.IO for real-time updates.

### Profile Screen
| Action | API Call |
|--------|---------|
| Get profile | `GET /api/drivers/{driver_id}` |
| Update profile | `PUT /api/drivers/{driver_id}` with changed fields |
| Upload photo | `POST /api/uploads/drivers/{driver_id}/photo` (multipart form-data, field: `file`) |
| Change password | `PUT /api/auth/change-password` with `{ "current_password", "new_password" }` |

### Earnings Screen
| Action | API Call |
|--------|---------|
| Total collected / COD pending | `GET /api/driver-earnings/summary` |
| Earnings list | `GET /api/driver-earnings?driver_id={driver_id}` |
| Wallet balance | `GET /api/wallet` |
| Transaction history | `GET /api/wallet/transactions?page=1&limit=20` |
| Record COD collection | `POST /api/wallet/collect-cod` with `{ "order_id", "amount" }` |

### Ratings Screen
| Action | API Call |
|--------|---------|
| Get all ratings | `GET /api/drivers/{driver_id}/ratings` |
| Average rating | Comes from `GET /api/drivers/{driver_id}` → `data.rating` |

Response includes individual ratings with order details, timestamps, and recipient names.

### Scanner Screen
| Action | API Call |
|--------|---------|
| Scan barcode | `POST /api/tracking/{scanned_barcode}/scan` with `{ "scan_type": "pickup_scan" }` |
| Validate barcode | `POST /api/orders/validate-pregenerated` with `{ "tracking_token": "..." }` |
| Lookup order | `GET /api/tracking/{scanned_barcode}` (public, no auth needed) |

**Scan types** and their auto-transitions:
- `pickup_scan` → auto changes status to `picked_up`
- `delivery_scan` → auto changes status to `delivered`
- `driver_scan` → general scan log (no status change)

### Pickups Screen
| Action | API Call |
|--------|---------|
| My pickups | `GET /api/pickup/driver/my-pickups` |
| Arrived at pickup | `POST /api/pickup/{order_id}/arrived` |
| Confirm collected | `POST /api/pickup/{order_id}/confirm` |
| Mark failed | `POST /api/pickup/{order_id}/fail` with `{ "reason": "..." }` |

---

## 3. Socket.IO (Real-Time Events)

**Connection**: `wss://delivery.traseallo.com` (same server, port 4001)

### Events to Listen For (Client ← Server)
| Event | Data | Description |
|-------|------|-------------|
| `order:updated` | `{ order_id, status, ... }` | Order status changed |
| `order:assigned` | `{ order_id, driver_id, ... }` | New order assigned to driver |
| `notification` | `{ id, title, body, type }` | New notification |

### Events to Emit (Client → Server)
| Event | Data | Description |
|-------|------|-------------|
| `join` | `{ room: "driver:{driver_id}" }` | Join driver-specific room |
| `driver:location` | `{ lat, lng, speed, heading }` | GPS update (alternative to REST) |

### Connection Example (React Native)
```javascript
import io from 'socket.io-client';

const socket = io('https://delivery.traseallo.com', {
  auth: { token: 'JWT_TOKEN_HERE' },
  transports: ['websocket'],
});

socket.on('connect', () => {
  socket.emit('join', { room: `driver:${driverId}` });
  socket.emit('join', { room: `tenant:${tenantId}` });
});

socket.on('order:assigned', (data) => {
  // New order assigned — refresh orders list
});

socket.on('notification', (data) => {
  // Show local notification
});
```

---

## 4. Currency

- All monetary values are in **AED** (UAE Dirham)
- Currency symbol comes from tenant settings: `GET /api/settings` → `data.settings.currency` (typically "AED")
- For the driver app, you can hardcode "AED" or fetch from tenant branding
- The screenshots show "$" — this should be "AED" in production

---

## 5. Error Handling

All API responses follow this format:
```json
// Success
{ "success": true, "data": { ... }, "message": "Optional message" }

// Error
{ "success": false, "message": "Error description", "errors": [] }
```

Common HTTP status codes:
- `200` — Success
- `400` — Bad request (validation error)
- `401` — Unauthorized (token expired/invalid)
- `403` — Forbidden (wrong role)
- `404` — Not found
- `429` — Rate limited (auth endpoints: 5 attempts per 15 min)
- `500` — Server error

**On 401**: Redirect to login screen, clear stored token.

---

## 6. Key Data Models

### Order Object
```json
{
  "id": 30,
  "order_number": "TRS-20260225-3365",
  "tracking_token": "TRS-20260225-3365",
  "status": "assigned",
  "recipient_name": "John Doe",
  "recipient_phone": "+971501234567",
  "recipient_address": "Dubai, Al Barsha",
  "recipient_emirate": "Dubai",
  "recipient_lat": 25.2048,
  "recipient_lng": 55.2708,
  "delivery_fee": 25.00,
  "cod_amount": 150.00,
  "cod_collected": false,
  "weight": 2.5,
  "vehicle_type": "bike",
  "notes": "Handle with care",
  "scheduled_at": "2026-03-07T10:00:00Z",
  "driver_id": 21,
  "client_id": 1,
  "tenant_id": 1,
  "created_at": "2026-03-07T08:00:00Z"
}
```

### Driver Object
```json
{
  "id": 21,
  "full_name": "Ahmed Al-Falasi",
  "phone": "+971501234567",
  "email": "ahmed.alfalasi@yopmail.com",
  "vehicle_type": "bike",
  "vehicle_plate": "D 12345",
  "vehicle_model": "Honda PCX",
  "vehicle_color": "Black",
  "status": "available",
  "rating": 4.5,
  "is_active": true,
  "zone_id": 1,
  "zone_name": "Dubai",
  "active_orders": 3,
  "total_orders": 150,
  "delivered_orders": 140,
  "total_earned": 5000.00
}
```

### Notification Object
```json
{
  "id": 1,
  "title": "New Order Assigned",
  "body": "Order #TRS-20260225-3365 has been assigned to you",
  "type": "order_assigned",
  "is_read": false,
  "data": { "order_id": 30 },
  "created_at": "2026-03-07T08:00:00Z"
}
```

---

## 7. Recommended App Architecture

### State Management
- **Auth state**: token, user_id, driver_id, tenant_id
- **Driver state**: profile, status (online/offline), location
- **Orders state**: list by tab, current order detail
- **Notifications**: list, unread count

### Background Services
1. **GPS Service** — Send location every 15s when online (use `POST /api/drivers/{id}/location`)
2. **Notification Polling** — Check `GET /api/user-notifications/unread-count` every 30s (or use Socket.IO)
3. **Order Refresh** — Auto-refresh active orders on Socket.IO `order:updated` event

### Startup Flow
```
1. Check stored token → GET /api/auth/session
2. If valid → GET /api/tracking/my-orders?status=all (get driver_id + dashboard data)
3. Connect Socket.IO → Join rooms
4. Start GPS service (if driver status is 'available')
5. Show Dashboard
```

### Offline Support
- Cache last fetched orders locally
- Queue status updates when offline, sync when back online
- Always show cached data while fetching fresh data

---

## 8. Push Notifications (Mobile)

The current backend uses **Web Push (VAPID)**. For mobile apps (FCM/APNs), you have two options:

### Option A: Use Existing Web Push
- Works with FCM via web push protocol
- Register using `POST /api/notifications/push/subscribe`

### Option B: Add FCM Support (Recommended)
A new endpoint should be created:
```
POST /api/notifications/register-device
Body: { "device_token": "FCM_TOKEN", "platform": "ios|android" }
```
Then the backend sends push via Firebase Admin SDK.

---

## 9. API Gaps to Address

| Feature | Status | Notes |
|---------|--------|-------|
| `GET /api/drivers/me` | Missing | Convenience endpoint — currently must use driver_id from my-orders |
| Driver earnings access | Restricted | `/api/driver-earnings` is admin-only; driver needs access or a proxy endpoint |
| Driver preferences | Missing | Language, notification toggles — store client-side for now |
| FCM/APNs registration | Missing | Need `POST /api/notifications/register-device` for native push |
| Proof of delivery upload | Exists | `POST /api/uploads/orders/{id}/proof` — make sure to call on delivery |
| Driver signature capture | Missing | Consider adding `POST /api/uploads/orders/{id}/signature` |

---

## 10. Testing Credentials

| Field | Value |
|-------|-------|
| API Base | `https://delivery.traseallo.com/api` |
| Test Driver | Ahmed Al-Falasi (driver_id: 21) |
| Email | ahmed.alfalasi@yopmail.com |
| Tenant | Check with admin for slug |

Import the Postman collection file: `Traseallo_Driver_App_API.postman_collection.json`

---

## 11. Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/auth/login` | 5 attempts / 15 minutes |
| `/api/auth/forgot-password` | 3 attempts / 15 minutes |
| GPS location updates | No limit (but 10-30s interval recommended) |
| All other endpoints | No explicit rate limit |

---

## 12. File Upload Notes

- Max file size: **5MB**
- Accepted formats: JPEG, PNG, WebP
- Use `multipart/form-data` with field name `file`
- Response returns `{ success: true, url: "/uploads/..." }`
- The URL is relative — prepend base URL: `https://delivery.traseallo.com{url}`
