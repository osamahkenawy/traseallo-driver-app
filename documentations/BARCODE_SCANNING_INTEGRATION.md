# Barcode Scanning Integration — Backend API Specification

> **Document Version:** 1.0  
> **Date:** March 24, 2026  
> **Audience:** Backend Development Team  
> **Platform:** Traseallo Driver App (React Native 0.70.6)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Scanning Workflows](#2-scanning-workflows)
3. [API Endpoints Required](#3-api-endpoints-required)
4. [Request / Response Schemas](#4-request--response-schemas)
5. [Database Schema Requirements](#5-database-schema-requirements)
6. [Settings & Configuration](#6-settings--configuration)
7. [WebSocket Events](#7-websocket-events)
8. [Error Codes](#8-error-codes)
9. [Current Frontend State](#9-current-frontend-state)
10. [Integration Checklist](#10-integration-checklist)

---

## 1. Overview

The driver app supports barcode scanning across four key workflows:

| Workflow | When | Purpose |
|---|---|---|
| **Quick Scan** | Anytime | Identify a package/order by scanning its barcode |
| **Load Verification** | During pickup | Verify all assigned packages are loaded into vehicle |
| **Delivery Verification** | At delivery point | Confirm correct package before handing over |
| **Return Scan** | During return | Confirm package being returned to sender |

Barcodes may appear on packages as 1D barcodes (Code128, Code39) or 2D codes (QR, DataMatrix). The app sends the decoded string to the backend — the backend must accept **any** of the following as a barcode value:

- Package barcode (e.g., `PKG-20260324-001`)
- Order number (e.g., `QS-20260324-2001`)
- AWB number (e.g., `AWB123456789`)
- Tracking token (e.g., `trk_abc123`)

---

## 2. Scanning Workflows

### 2.1 Quick Scan (Identify)

```
Driver opens Scanner → Scans barcode → Backend identifies package/order → Shows result card → Driver taps "View" → Opens OrderDetail
```

**API:** `POST /driver-app/scan`

The driver can scan any barcode at any time to quickly identify a package and jump to its order detail. This is a **read-only lookup** with a scan log entry.

### 2.2 Load Verification (Pickup)

```
Driver arrives at pickup → Opens Load Verify → Scans each package barcode → App checks against expected manifest → Shows scanned/missing/unexpected → Driver confirms "Complete Load" → Backend logs pickup scans → Order transitions to in_transit
```

**APIs:**
- `GET /driver-app/orders` (status=assigned,picked_up) → get expected packages
- `GET /packages/scan/:barcode` → lookup each scanned barcode
- `POST /packages/:id/scan` (scan_type=pickup_scan) → log each scan
- `POST /driver-app/scan/batch` → batch verify all scanned barcodes at once (optional optimization)
- `POST /driver-app/orders/:id/start-delivery` → transition order after verification

**Expected Backend Behavior:**
1. Each `pickup_scan` must be logged in `scan_logs` with GPS coordinates and timestamp
2. If `requireBarcodeScan` setting is enabled, the backend should **reject** `start-delivery` requests if not all packages have a `pickup_scan` entry
3. Backend should return packages NOT scanned so the driver can be warned about missing items

### 2.3 Delivery Verification (At Delivery Point)

```
Driver arrives at stop → App prompts "Scan to verify" → Scans package barcode → Backend verifies: correct driver? correct stop? → If verified, proceed to delivery confirm screen
```

**API:** `POST /driver-app/scan/verify-delivery`

**Expected Backend Behavior:**
1. Verify the barcode belongs to a package assigned to this driver
2. Verify the package belongs to the current stop (if `stop_id` provided)
3. Verify the package status is scannable (not already delivered/failed/returned)
4. Return verification result with match details
5. If `requireBarcodeScan` setting is enabled, the `PATCH /packages/:id/status` endpoint should **reject** delivery status updates if no `delivery_scan` exists for that package

### 2.4 Return Scan

```
Driver returns undelivered package → Opens return flow → Scans barcode → Backend confirms package identity → Logs return_scan → Package transitions to returned
```

**API:** `POST /packages/:id/scan` (scan_type=return_scan)

---

## 3. API Endpoints Required

### 3.1 Single Barcode Scan (Identify)

```
POST /driver-app/scan
```

**Purpose:** Universal barcode lookup — finds the matching package or order from any barcode format.

**Auth:** Bearer token required  
**Headers:** `x-tenant-slug` required

### 3.2 Batch Barcode Scan

```
POST /driver-app/scan/batch
```

**Purpose:** Lookup multiple barcodes at once during load verification. More efficient than individual calls.

**Auth:** Bearer token required  
**Headers:** `x-tenant-slug` required

### 3.3 Delivery Verification Scan

```
POST /driver-app/scan/verify-delivery
```

**Purpose:** Cross-verify a scanned barcode against the current delivery stop and driver assignment.

**Auth:** Bearer token required  
**Headers:** `x-tenant-slug` required

### 3.4 Package Barcode Lookup

```
GET /packages/scan/:barcode
```

**Purpose:** Quick package lookup by barcode string. Returns minimal info for display.

**Auth:** Bearer token required  
**Headers:** `x-tenant-slug` required

### 3.5 Log Scan Event

```
POST /packages/:packageId/scan
```

**Purpose:** Record a scan event with type, GPS, and optional notes. May trigger auto-status transitions.

**Auth:** Bearer token required  
**Headers:** `x-tenant-slug` required

### 3.6 Get Package Detail (with Scan Logs)

```
GET /packages/:packageId
```

**Purpose:** Full package detail including scan history. Used to show scan trail.

**Auth:** Bearer token required  
**Headers:** `x-tenant-slug` required

### 3.7 Get Order Packages

```
GET /packages/order/:orderId
```

**Purpose:** All packages for an order with summary counts. Used to build the expected manifest for load verification.

**Auth:** Bearer token required  
**Headers:** `x-tenant-slug` required

---

## 4. Request / Response Schemas

### 4.1 `POST /driver-app/scan`

**Request:**
```json
{
  "barcode": "PKG-20260324-001"
}
```

**Response (Success — Package Found):**
```json
{
  "success": true,
  "type": "package",
  "is_assigned": true,
  "data": {
    "id": 45,
    "barcode": "PKG-20260324-001",
    "order_id": 120,
    "order_number": "QS-20260324-2001",
    "tracking_token": "trk_abc123",
    "status": "assigned",
    "recipient_name": "Ahmad Ali",
    "recipient_address": "Dubai Marina, Tower 5, Apt 1204",
    "recipient_phone": "+971501234567",
    "payment_method": "cod",
    "cod_amount": "150.00",
    "weight_kg": "2.5",
    "category": "standard",
    "driver_id": 25,
    "sibling_count": 3,
    "stop_id": 88,
    "stop_sequence": 2
  }
}
```

**Response (Success — Order Found by Order Number/AWB):**
```json
{
  "success": true,
  "type": "order",
  "is_assigned": true,
  "data": {
    "id": 120,
    "order_number": "QS-20260324-2001",
    "tracking_token": "trk_abc123",
    "status": "assigned",
    "package_count": 3,
    "recipient_name": "Ahmad Ali",
    "sender_name": "Dubai Electronics",
    "payment_method": "cod",
    "total_amount": "450.00"
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "error": "barcode_not_found",
  "message": "No package or order found for this barcode."
}
```

**Response (Not Assigned to This Driver):**
```json
{
  "success": false,
  "type": "package",
  "is_assigned": false,
  "error": "not_assigned",
  "message": "This package is assigned to another driver.",
  "data": {
    "id": 45,
    "barcode": "PKG-20260324-001",
    "order_number": "QS-20260324-2001",
    "status": "assigned",
    "assigned_driver_name": "Khalid M."
  }
}
```

---

### 4.2 `POST /driver-app/scan/batch`

**Request:**
```json
{
  "barcodes": [
    "PKG-20260324-001",
    "PKG-20260324-002",
    "PKG-20260324-003",
    "UNKNOWN-BARCODE-999"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "barcode": "PKG-20260324-001",
      "found": true,
      "is_assigned": true,
      "package_id": 45,
      "order_id": 120,
      "order_number": "QS-20260324-2001",
      "status": "assigned",
      "recipient_name": "Ahmad Ali"
    },
    {
      "barcode": "PKG-20260324-002",
      "found": true,
      "is_assigned": true,
      "package_id": 46,
      "order_id": 120,
      "order_number": "QS-20260324-2001",
      "status": "assigned",
      "recipient_name": "Ahmad Ali"
    },
    {
      "barcode": "PKG-20260324-003",
      "found": true,
      "is_assigned": false,
      "package_id": 50,
      "order_id": 125,
      "order_number": "QS-20260324-2005",
      "status": "assigned",
      "assigned_driver_name": "Khalid M."
    },
    {
      "barcode": "UNKNOWN-BARCODE-999",
      "found": false,
      "is_assigned": false,
      "package_id": null,
      "order_id": null
    }
  ],
  "summary": {
    "total": 4,
    "found": 3,
    "not_found": 1,
    "assigned_to_me": 2,
    "assigned_to_others": 1
  }
}
```

---

### 4.3 `POST /driver-app/scan/verify-delivery`

**Request:**
```json
{
  "barcode": "PKG-20260324-001",
  "stop_id": 88
}
```
> `stop_id` is optional — if provided, cross-checks the package belongs to this stop.

**Response (Verified):**
```json
{
  "success": true,
  "verified": true,
  "is_correct_driver": true,
  "is_correct_stop": true,
  "package": {
    "id": 45,
    "barcode": "PKG-20260324-001",
    "order_id": 120,
    "order_number": "QS-20260324-2001",
    "status": "in_transit",
    "recipient_name": "Ahmad Ali",
    "recipient_address": "Dubai Marina, Tower 5, Apt 1204",
    "cod_amount": "150.00",
    "stop_id": 88,
    "stop_sequence": 2
  }
}
```

**Response (Wrong Stop):**
```json
{
  "success": true,
  "verified": false,
  "is_correct_driver": true,
  "is_correct_stop": false,
  "message": "This package belongs to stop #4, not the current stop.",
  "package": {
    "id": 45,
    "barcode": "PKG-20260324-001",
    "correct_stop_id": 90,
    "correct_stop_sequence": 4,
    "correct_stop_address": "Al Barsha, Villa 12"
  }
}
```

**Response (Wrong Driver):**
```json
{
  "success": true,
  "verified": false,
  "is_correct_driver": false,
  "is_correct_stop": false,
  "message": "This package is not assigned to you."
}
```

**Response (Already Delivered):**
```json
{
  "success": false,
  "verified": false,
  "error": "already_terminal",
  "message": "This package has already been delivered.",
  "package": {
    "id": 45,
    "barcode": "PKG-20260324-001",
    "status": "delivered",
    "delivered_at": "2026-03-24 10:30:00"
  }
}
```

---

### 4.4 `GET /packages/scan/:barcode`

**Response:**
```json
{
  "success": true,
  "id": 45,
  "barcode": "PKG-20260324-001",
  "order_id": 120,
  "order_number": "QS-20260324-2001",
  "tracking_token": "trk_abc123",
  "status": "assigned",
  "recipient_name": "Ahmad Ali",
  "recipient_phone": "+971501234567",
  "recipient_address": "Dubai Marina, Tower 5, Apt 1204",
  "weight_kg": "2.5",
  "cod_amount": "150.00",
  "category": "standard",
  "sibling_count": 3
}
```

---

### 4.5 `POST /packages/:packageId/scan`

**Request:**
```json
{
  "scan_type": "pickup_scan",
  "lat": 25.0657,
  "lng": 55.1713,
  "note": "Scanned during vehicle loading"
}
```

**Valid `scan_type` values:**

| Type | When Used | Auto-Transition |
|---|---|---|
| `driver_scan` | Quick scan / identification | None |
| `pickup_scan` | During load verification at pickup | None (manual start-delivery triggers transition) |
| `delivery_scan` | At delivery point before handover | None (manual deliver triggers transition) |
| `return_scan` | When returning package to sender | None (manual return triggers transition) |
| `load_verify` | Final confirmation during load complete | None |
| `hub_scan` | At hub/warehouse (future) | None |

**Response:**
```json
{
  "success": true,
  "scan_log": {
    "id": 789,
    "package_id": 45,
    "scan_type": "pickup_scan",
    "scanned_by": 25,
    "scanned_by_name": "Yazan Driver",
    "lat": 25.0657,
    "lng": 55.1713,
    "note": "Scanned during vehicle loading",
    "created_at": "2026-03-24 09:15:00"
  },
  "package_status": "assigned"
}
```

---

### 4.6 `GET /packages/:packageId`

**Response:**
```json
{
  "success": true,
  "package": {
    "id": 45,
    "order_id": 120,
    "order_number": "QS-20260324-2001",
    "barcode": "PKG-20260324-001",
    "status": "in_transit",
    "recipient_name": "Ahmad Ali",
    "recipient_phone": "+971501234567",
    "recipient_address": "Dubai Marina, Tower 5, Apt 1204",
    "recipient_lat": 25.0800,
    "recipient_lng": 55.1400,
    "weight_kg": "2.5",
    "dimensions": "30x20x15",
    "cod_amount": "150.00",
    "category": "standard",
    "special_instructions": "Leave at reception",
    "stop_id": 88,
    "stop_sequence": 2,
    "proof_photo_url": null,
    "signature_url": null,
    "delivered_at": null,
    "failed_at": null,
    "failure_reason": null,
    "created_at": "2026-03-24 08:00:00",
    "updated_at": "2026-03-24 09:15:00",
    "scan_logs": [
      {
        "id": 789,
        "scan_type": "pickup_scan",
        "scanned_by": 25,
        "scanned_by_name": "Yazan Driver",
        "lat": 25.0657,
        "lng": 55.1713,
        "note": "Scanned during vehicle loading",
        "created_at": "2026-03-24 09:15:00"
      },
      {
        "id": 790,
        "scan_type": "driver_scan",
        "scanned_by": 25,
        "scanned_by_name": "Yazan Driver",
        "lat": 25.0660,
        "lng": 55.1715,
        "note": null,
        "created_at": "2026-03-24 09:20:00"
      }
    ]
  }
}
```

---

### 4.7 `GET /packages/order/:orderId`

**Response:**
```json
{
  "success": true,
  "packages": [
    {
      "id": 45,
      "barcode": "PKG-20260324-001",
      "status": "in_transit",
      "recipient_name": "Ahmad Ali",
      "recipient_phone": "+971501234567",
      "recipient_address": "Dubai Marina, Tower 5, Apt 1204",
      "weight_kg": "2.5",
      "cod_amount": "150.00",
      "category": "standard",
      "stop_id": 88,
      "has_pickup_scan": true,
      "has_delivery_scan": false
    },
    {
      "id": 46,
      "barcode": "PKG-20260324-002",
      "status": "delivered",
      "recipient_name": "Ahmad Ali",
      "recipient_phone": "+971501234567",
      "recipient_address": "Dubai Marina, Tower 5, Apt 1204",
      "weight_kg": "1.0",
      "cod_amount": "0.00",
      "category": "documents",
      "stop_id": 88,
      "has_pickup_scan": true,
      "has_delivery_scan": true
    }
  ],
  "summary": {
    "total": 2,
    "delivered": 1,
    "failed": 0,
    "in_progress": 1,
    "scanned_at_pickup": 2,
    "scanned_at_delivery": 1
  }
}
```

---

## 5. Database Schema Requirements

### 5.1 `scan_logs` Table

```sql
CREATE TABLE scan_logs (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT NOT NULL,
  package_id    INT NOT NULL,
  order_id      INT NOT NULL,
  scan_type     ENUM('driver_scan','pickup_scan','delivery_scan','return_scan','load_verify','hub_scan') NOT NULL,
  scanned_by    INT NOT NULL COMMENT 'user_id of the driver',
  lat           DECIMAL(10,7) NULL,
  lng           DECIMAL(10,7) NULL,
  note          VARCHAR(500) NULL,
  device_info   VARCHAR(255) NULL COMMENT 'e.g. iPhone 14, iOS 17.2',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_package (package_id),
  INDEX idx_order (order_id),
  INDEX idx_scanned_by (scanned_by),
  INDEX idx_type_package (scan_type, package_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (scanned_by) REFERENCES users(id)
);
```

### 5.2 `packages` Table — Required Columns

Ensure the `packages` table has these columns (add if missing):

```sql
ALTER TABLE packages ADD COLUMN barcode VARCHAR(100) NOT NULL AFTER order_id;
ALTER TABLE packages ADD COLUMN stop_id INT NULL AFTER recipient_address;
ALTER TABLE packages ADD COLUMN stop_sequence INT NULL AFTER stop_id;
ALTER TABLE packages ADD COLUMN proof_photo_url VARCHAR(500) NULL;
ALTER TABLE packages ADD COLUMN signature_url VARCHAR(500) NULL;
ALTER TABLE packages ADD COLUMN delivered_at DATETIME NULL;
ALTER TABLE packages ADD COLUMN failed_at DATETIME NULL;
ALTER TABLE packages ADD COLUMN failure_reason VARCHAR(500) NULL;

ALTER TABLE packages ADD UNIQUE INDEX idx_barcode (barcode, tenant_id);
ALTER TABLE packages ADD INDEX idx_order (order_id);
ALTER TABLE packages ADD INDEX idx_stop (stop_id);
ALTER TABLE packages ADD INDEX idx_status (status);
```

### 5.3 Barcode Generation

Barcodes should be **auto-generated** when a package is created. Suggested format:

```
PKG-{YYYYMMDD}-{ZERO_PADDED_SEQUENCE}
```

Example: `PKG-20260324-000045`

Requirements:
- Unique per tenant
- URL-safe characters only (alphanumeric + hyphens)
- Human-readable (drivers may type manually)
- Printable as Code128 barcode or QR code

---

## 6. Settings & Configuration

The driver app reads a `requireBarcodeScan` flag from the settings API. This enables **mandatory scanning** enforcement on the backend.

### 6.1 Settings Endpoint

The existing `GET /driver-app/settings` response should include:

```json
{
  "settings": {
    "requireBarcodeScan": true,
    "scanEnforcementLevel": "strict"
  }
}
```

**`scanEnforcementLevel` values:**

| Level | Behavior |
|---|---|
| `none` | Scanning is optional — drivers can skip. No backend enforcement. |
| `warn` | App shows warning if scan is skipped, but allows proceeding. Backend logs the skip. |
| `strict` | Backend **rejects** status transitions without matching scan logs. |

### 6.2 Backend Enforcement Rules (when `strict` mode)

| Action | Required Scan |
|---|---|
| `POST /driver-app/orders/:id/start-delivery` | All packages must have at least one `pickup_scan` |
| `PATCH /packages/:id/status` (→ delivered) | Package must have a `delivery_scan` |
| `PATCH /packages/:id/status` (→ returned) | Package must have a `return_scan` |

**Rejection response when scan is missing:**
```json
{
  "success": false,
  "error": "scan_required",
  "message": "Barcode scan is required before delivery.",
  "missing_scans": ["delivery_scan"],
  "package_id": 45,
  "barcode": "PKG-20260324-001"
}
```

---

## 7. WebSocket Events

The backend should emit these socket events for real-time scan tracking:

### 7.1 Scan Logged (to admin/dispatcher dashboard)

```
Event: scan:logged
Room: tenant:{tenantId}
```

```json
{
  "scan_log_id": 789,
  "package_id": 45,
  "order_id": 120,
  "order_number": "QS-20260324-2001",
  "barcode": "PKG-20260324-001",
  "scan_type": "pickup_scan",
  "driver_id": 25,
  "driver_name": "Yazan Driver",
  "lat": 25.0657,
  "lng": 55.1713,
  "created_at": "2026-03-24 09:15:00"
}
```

### 7.2 Load Verification Complete (to admin/dispatcher)

```
Event: load:verified
Room: tenant:{tenantId}
```

```json
{
  "driver_id": 25,
  "driver_name": "Yazan Driver",
  "order_ids": [120, 125],
  "total_packages": 8,
  "scanned": 7,
  "missing": 1,
  "missing_barcodes": ["PKG-20260324-008"],
  "completed_at": "2026-03-24 09:30:00"
}
```

### 7.3 Delivery Scan Verified (to admin/dispatcher)

```
Event: delivery:scan-verified
Room: tenant:{tenantId}
```

```json
{
  "package_id": 45,
  "order_id": 120,
  "barcode": "PKG-20260324-001",
  "driver_id": 25,
  "stop_id": 88,
  "verified": true,
  "lat": 25.0800,
  "lng": 55.1400,
  "verified_at": "2026-03-24 11:45:00"
}
```

---

## 8. Error Codes

| Error Code | HTTP Status | Description |
|---|---|---|
| `barcode_not_found` | 404 | No package or order matches the barcode |
| `not_assigned` | 403 | Package exists but is assigned to a different driver |
| `already_terminal` | 409 | Package is already in a terminal state (delivered/failed/returned/cancelled) |
| `scan_required` | 422 | Required scan type is missing (strict enforcement mode) |
| `duplicate_scan` | 409 | Same scan_type already logged for this package by this driver (optional — may allow duplicates) |
| `invalid_scan_type` | 400 | scan_type value is not in the allowed enum list |
| `package_not_found` | 404 | Package ID does not exist |
| `order_not_found` | 404 | Order ID does not exist |
| `wrong_stop` | 422 | Package does not belong to the specified stop_id |
| `invalid_barcode` | 400 | Barcode string is empty or malformed |

All error responses follow this structure:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable description."
}
```

---

## 9. Current Frontend State

### 9.1 What's Already Built

| Component | Status | Notes |
|---|---|---|
| `src/api/scan.js` | ✅ Complete | 3 endpoints: `scanBarcode`, `batchScan`, `verifyDelivery` |
| `src/api/packages.js` | ✅ Complete | 5 endpoints: `getOrderPackages`, `getPackage`, `scanLookup`, `logScan`, `updateStatus` |
| `src/store/scanStore.js` | ✅ Complete | Zustand store with all scan actions + history |
| `src/store/orderStore.js` | ✅ Complete | Package fetch/update actions |
| `ScannerScreen.js` | ⚠️ Partial | Manual text input works; camera mode is a placeholder |
| `LoadVerifyScreen.js` | ⚠️ Partial | Manual text input only; calls `scanLookup` + `logScan` |
| `PackageDeliverScreen.js` | ✅ Complete | Per-package delivery with photo+signature+COD |
| `PackageFailScreen.js` | ✅ Complete | Per-package failure reporting |
| Navigation routes | ✅ Complete | Scanner, LoadVerify, PackageDeliver, PackageFail all registered |
| `requireBarcodeScan` setting | ⚠️ Stored | Setting loaded from backend but not enforced in app |

### 9.2 Frontend Roadmap (Not Backend Concern)

- Camera integration using `react-native-camera-kit` (already in package.json)
- Enforce `requireBarcodeScan` setting in delivery flow
- Wire `verifyDelivery` API into PackageDeliverScreen
- Use `batchScan` API in LoadVerifyScreen for efficiency
- Add scan history viewer

---

## 10. Integration Checklist

### Backend Must Implement:

- [ ] **`POST /driver-app/scan`** — Universal barcode lookup (package barcode, order number, AWB, tracking token)
- [ ] **`POST /driver-app/scan/batch`** — Batch lookup for multiple barcodes
- [ ] **`POST /driver-app/scan/verify-delivery`** — Cross-verify barcode against driver + stop assignment
- [ ] **`GET /packages/scan/:barcode`** — Quick package lookup by barcode
- [ ] **`POST /packages/:id/scan`** — Log scan event with type + GPS + note
- [ ] **`GET /packages/:id`** — Single package detail with `scan_logs[]` array
- [ ] **`GET /packages/order/:orderId`** — All packages for an order with `summary` and `has_pickup_scan`/`has_delivery_scan` flags per package
- [ ] **`scan_logs` table** — Create per schema above
- [ ] **Barcode column on packages** — Ensure unique, auto-generated barcodes
- [ ] **`requireBarcodeScan` in settings** — Add to `/driver-app/settings` response
- [ ] **`scanEnforcementLevel` in settings** — `none` / `warn` / `strict`
- [ ] **Enforcement logic** — When `strict`, reject `start-delivery` without pickup scans, reject `deliver` without delivery scan
- [ ] **Socket events** — Emit `scan:logged`, `load:verified`, `delivery:scan-verified`
- [ ] **Include `stops[]` in order detail** — `GET /driver-app/orders/:id` must return stops array with `stop_id` for each package

### Integration Testing Scenarios:

| # | Scenario | Expected |
|---|---|---|
| 1 | Scan valid barcode assigned to driver | Returns `type: "package"`, `is_assigned: true` |
| 2 | Scan valid barcode assigned to another driver | Returns `is_assigned: false`, `assigned_driver_name` |
| 3 | Scan unknown barcode | Returns 404 `barcode_not_found` |
| 4 | Scan order number (not package barcode) | Returns `type: "order"` |
| 5 | Scan AWB number | Returns matching order/package |
| 6 | Batch scan: 3 valid + 1 invalid | Returns 4 results, summary counts correct |
| 7 | Verify delivery: correct stop | `verified: true`, `is_correct_stop: true` |
| 8 | Verify delivery: wrong stop | `verified: false`, correct stop info in response |
| 9 | Verify delivery: already delivered package | Returns 409 `already_terminal` |
| 10 | Log pickup_scan | Scan log created, returned in `GET /packages/:id` |
| 11 | Log delivery_scan | Scan log created |
| 12 | Start delivery (strict mode, no pickup scans) | Returns 422 `scan_required` |
| 13 | Start delivery (strict mode, all scanned) | Success |
| 14 | Deliver package (strict mode, no delivery scan) | Returns 422 `scan_required` |
| 15 | Deliver package (strict mode, with delivery scan) | Success |
| 16 | Duplicate scan_type for same package | Either allow (log duplicates) or return 409 |

---

## Appendix: Barcode Format Support

The driver app camera scanner will decode these formats:

| Format | Type | Common Use |
|---|---|---|
| Code128 | 1D | Package labels, AWBs |
| Code39 | 1D | Older label systems |
| QR Code | 2D | Modern package labels, tracking URLs |
| DataMatrix | 2D | Small package labels |
| EAN13 | 1D | Product barcodes |
| UPC-A | 1D | Product barcodes |

The decoded string is sent as-is to the backend. The backend is responsible for:
1. Trimming whitespace
2. Case-insensitive matching
3. Stripping any URL prefix (e.g., `https://track.traseallo.com/PKG-20260324-001` → `PKG-20260324-001`)
4. Matching against: `packages.barcode`, `orders.order_number`, `orders.awb_number`, `orders.tracking_token`
