/**
 * Tests for MapScreen pure helpers and data-processing logic
 *
 * Covers:
 *   - isValidCoord: coordinate validation
 *   - toNum: safe string-to-number conversion
 *   - haversine: distance calculation
 *   - estimateETA: time estimation from distance
 *   - Zone polygon filtering (iOS crash fix)
 *   - Marker key generation (stable keys, no idx)
 *   - Route stops merging / allStops computation
 *   - assignedCount / activeCount computation
 */

// ── Extract pure helpers from MapScreen ──────────────
// These are module-level functions, so we replicate them here for unit testing
// (they're not exported from MapScreen.js)

const isValidCoord = (lat, lng) => {
  const la = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lo = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (la === 0 && lo === 0) return false;
  return la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
};

const toNum = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateETA = (distKm) => Math.max(1, Math.round((distKm / 30) * 60));

// ── Zone polygon filtering logic (replicated from MapScreen render) ──
const filterValidZones = (zones) => {
  return zones.filter((zone) => {
    const pts = zone.polygon || zone.coordinates || [];
    return pts.filter((p) => {
      const lat = p.lat || p[0] || p.latitude;
      const lng = p.lng || p[1] || p.longitude;
      return isValidCoord(lat, lng);
    }).length >= 3;
  });
};

const buildZoneCoords = (zone) => {
  return (zone.polygon || zone.coordinates || [])
    .map((p) => ({
      latitude: p.lat || p[0] || p.latitude,
      longitude: p.lng || p[1] || p.longitude,
    }))
    .filter((c) => isValidCoord(c.latitude, c.longitude));
};

// ── Marker key logic (replicated from MapScreen) ──
const activeMarkerKey = (stop) =>
  `stop-${stop.stop_id || stop.id}-${stop.stop_type || 'd'}`;

const completedMarkerKey = (stop) =>
  `done-${stop.stop_id || stop.id}-${stop.stop_type || 'd'}`;

// ── Stop classification ──
const INACTIVE_STATUSES = ['completed', 'delivered', 'failed', 'returned', 'cancelled'];

const classifyStops = (allStops) => {
  const active = allStops.filter(
    (s) => !INACTIVE_STATUSES.includes(s.stop_status || s.status || 'pending'),
  );
  const mapStops = active.map((s, idx) => ({...s, sequence_number: idx + 1}));
  const completed = allStops.filter(
    (s) => INACTIVE_STATUSES.includes(s.stop_status || s.status || 'pending'),
  );
  return {mapStops, completedStops: completed};
};

// ══════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════

describe('isValidCoord', () => {
  test('accepts valid numeric coordinates', () => {
    expect(isValidCoord(25.276987, 55.296249)).toBe(true);
  });

  test('accepts string coordinates (parsed as floats)', () => {
    expect(isValidCoord('25.276987', '55.296249')).toBe(true);
  });

  test('rejects null/undefined latitude', () => {
    expect(isValidCoord(null, 55.29)).toBe(false);
    expect(isValidCoord(undefined, 55.29)).toBe(false);
  });

  test('rejects null/undefined longitude', () => {
    expect(isValidCoord(25.27, null)).toBe(false);
    expect(isValidCoord(25.27, undefined)).toBe(false);
  });

  test('rejects NaN', () => {
    expect(isValidCoord(NaN, 55.29)).toBe(false);
    expect(isValidCoord(25.27, NaN)).toBe(false);
    expect(isValidCoord(NaN, NaN)).toBe(false);
  });

  test('rejects Infinity', () => {
    expect(isValidCoord(Infinity, 55.29)).toBe(false);
    expect(isValidCoord(25.27, -Infinity)).toBe(false);
  });

  test('rejects 0,0 (null island)', () => {
    expect(isValidCoord(0, 0)).toBe(false);
  });

  test('accepts lat=0 with non-zero lng', () => {
    // Only 0,0 is rejected — 0+something is technically valid
    // But our helper rejects any (0 && 0) — let's verify
    expect(isValidCoord(0, 55.29)).toBe(true);
  });

  test('rejects out-of-range latitude (> 90)', () => {
    expect(isValidCoord(91, 55.0)).toBe(false);
    expect(isValidCoord(-91, 55.0)).toBe(false);
  });

  test('rejects out-of-range longitude (> 180)', () => {
    expect(isValidCoord(25.0, 181)).toBe(false);
    expect(isValidCoord(25.0, -181)).toBe(false);
  });

  test('accepts edge-case lat=90, lng=180', () => {
    expect(isValidCoord(90, 180)).toBe(true);
    expect(isValidCoord(-90, -180)).toBe(true);
  });

  test('rejects non-parseable strings', () => {
    expect(isValidCoord('abc', '55.29')).toBe(false);
    expect(isValidCoord('25.27', 'xyz')).toBe(false);
  });

  test('rejects empty strings', () => {
    expect(isValidCoord('', '')).toBe(false);
  });
});

describe('toNum', () => {
  test('converts valid number string', () => {
    expect(toNum('25.276')).toBe(25.276);
  });

  test('passes through finite numbers', () => {
    expect(toNum(42)).toBe(42);
    expect(toNum(-3.14)).toBe(-3.14);
  });

  test('returns null for NaN', () => {
    expect(toNum(NaN)).toBeNull();
  });

  test('returns null for Infinity', () => {
    expect(toNum(Infinity)).toBeNull();
    expect(toNum(-Infinity)).toBeNull();
  });

  test('returns null for null', () => {
    expect(toNum(null)).toBeNull();
  });

  test('returns null for undefined', () => {
    expect(toNum(undefined)).toBeNull();
  });

  test('returns null for non-numeric string', () => {
    expect(toNum('hello')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(toNum('')).toBeNull();
  });

  test('returns 0 for "0"', () => {
    expect(toNum('0')).toBe(0);
  });

  test('returns 0 for numeric 0', () => {
    expect(toNum(0)).toBe(0);
  });
});

describe('haversine', () => {
  test('returns 0 for identical points', () => {
    expect(haversine(25.27, 55.29, 25.27, 55.29)).toBe(0);
  });

  test('calculates ~12,550 km from Dubai to New York roughly', () => {
    // Dubai: 25.27, 55.29; New York: 40.71, -74.01
    const dist = haversine(25.27, 55.29, 40.71, -74.01);
    expect(dist).toBeGreaterThan(10000);
    expect(dist).toBeLessThan(15000);
  });

  test('short distance within same city is small', () => {
    // Two points ~1 km apart in Dubai
    const dist = haversine(25.276, 55.296, 25.285, 55.296);
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(2);
  });

  test('antipodal points are ~20,000 km apart', () => {
    const dist = haversine(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(19000);
    expect(dist).toBeLessThan(21000);
  });
});

describe('estimateETA', () => {
  test('returns minimum 1 minute for very short distances', () => {
    expect(estimateETA(0)).toBe(1);
    expect(estimateETA(0.001)).toBe(1);
  });

  test('30 km → 60 minutes (30 km/h assumed)', () => {
    expect(estimateETA(30)).toBe(60);
  });

  test('15 km → 30 minutes', () => {
    expect(estimateETA(15)).toBe(30);
  });

  test('1 km → 2 minutes', () => {
    expect(estimateETA(1)).toBe(2);
  });

  test('fractional km rounds correctly', () => {
    // 2.5 km → (2.5/30)*60 = 5 min
    expect(estimateETA(2.5)).toBe(5);
  });
});

// ══════════════════════════════════════════════════════
// Zone Polygon Filtering (iOS RCTFatal crash fix)
// ══════════════════════════════════════════════════════

describe('Zone polygon filtering (iOS crash fix)', () => {
  test('keeps zones with 3+ valid coordinates', () => {
    const zones = [{
      id: 1,
      polygon: [
        {lat: 25.27, lng: 55.29},
        {lat: 25.28, lng: 55.30},
        {lat: 25.29, lng: 55.31},
      ],
    }];
    expect(filterValidZones(zones)).toHaveLength(1);
  });

  test('filters out zones with fewer than 3 valid coordinates', () => {
    const zones = [{
      id: 2,
      polygon: [
        {lat: 25.27, lng: 55.29},
        {lat: 25.28, lng: 55.30},
      ],
    }];
    expect(filterValidZones(zones)).toHaveLength(0);
  });

  test('filters out zones with all-invalid coordinates', () => {
    const zones = [{
      id: 3,
      polygon: [
        {lat: NaN, lng: NaN},
        {lat: null, lng: null},
        {lat: 0, lng: 0},
      ],
    }];
    expect(filterValidZones(zones)).toHaveLength(0);
  });

  test('handles empty polygon array', () => {
    const zones = [{id: 4, polygon: []}];
    expect(filterValidZones(zones)).toHaveLength(0);
  });

  test('handles missing polygon property (falls back to coordinates)', () => {
    const zones = [{
      id: 5,
      coordinates: [
        {lat: 25.27, lng: 55.29},
        {lat: 25.28, lng: 55.30},
        {lat: 25.29, lng: 55.31},
        {lat: 25.30, lng: 55.32},
      ],
    }];
    expect(filterValidZones(zones)).toHaveLength(1);
  });

  test('handles zone with no polygon or coordinates property', () => {
    const zones = [{id: 6}];
    expect(filterValidZones(zones)).toHaveLength(0);
  });

  test('handles mixed valid/invalid coords — keeps zone if 3+ valid', () => {
    const zones = [{
      id: 7,
      polygon: [
        {lat: 25.27, lng: 55.29},
        {lat: NaN, lng: 55.30},     // invalid
        {lat: 25.28, lng: 55.30},
        {lat: 25.29, lng: 55.31},
      ],
    }];
    expect(filterValidZones(zones)).toHaveLength(1);
  });

  test('filters out zone where valid count is exactly 2', () => {
    const zones = [{
      id: 8,
      polygon: [
        {lat: 25.27, lng: 55.29},
        {lat: NaN, lng: 55.30},
        {lat: 25.28, lng: 55.30},
        {lat: Infinity, lng: 55.31},
      ],
    }];
    expect(filterValidZones(zones)).toHaveLength(0);
  });

  test('buildZoneCoords returns only valid coord objects', () => {
    const zone = {
      polygon: [
        {lat: 25.27, lng: 55.29},
        {lat: NaN, lng: 55.30},
        {lat: 25.28, lng: 55.30},
      ],
    };
    const coords = buildZoneCoords(zone);
    expect(coords).toHaveLength(2);
    expect(coords[0]).toEqual({latitude: 25.27, longitude: 55.29});
    expect(coords[1]).toEqual({latitude: 25.28, longitude: 55.30});
  });

  test('buildZoneCoords handles array format [lat, lng]', () => {
    const zone = {
      coordinates: [
        [25.27, 55.29],
        [25.28, 55.30],
        [25.29, 55.31],
      ],
    };
    const coords = buildZoneCoords(zone);
    expect(coords).toHaveLength(3);
    expect(coords[0].latitude).toBe(25.27);
    expect(coords[0].longitude).toBe(55.29);
  });

  test('filter-then-map never returns null (prevents removedChildren crash)', () => {
    const zones = [
      {id: 1, polygon: [{lat: NaN, lng: NaN}]},             // invalid
      {id: 2, polygon: []},                                   // empty
      {id: 3, polygon: [                                      // valid
        {lat: 25.27, lng: 55.29},
        {lat: 25.28, lng: 55.30},
        {lat: 25.29, lng: 55.31},
      ]},
    ];

    const validZones = filterValidZones(zones);
    // Only zone 3 passes
    expect(validZones).toHaveLength(1);
    expect(validZones[0].id).toBe(3);

    // The key invariant: .map() on filtered array never needs to return null
    const results = validZones.map((zone) => {
      const coords = buildZoneCoords(zone);
      return {key: `zone-${zone.id}`, coords};
    });

    // No null entries
    expect(results.every((r) => r !== null)).toBe(true);
    expect(results.every((r) => r.coords.length >= 3)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Marker key stability (iOS crash fix — no idx in keys)
// ══════════════════════════════════════════════════════

describe('Marker key generation', () => {
  test('active marker key uses stop_id, not index', () => {
    const stop = {stop_id: 42, stop_type: 'delivery'};
    expect(activeMarkerKey(stop)).toBe('stop-42-delivery');
  });

  test('completed marker key uses stop_id, not index', () => {
    const stop = {stop_id: 99, stop_type: 'pickup'};
    expect(completedMarkerKey(stop)).toBe('done-99-pickup');
  });

  test('falls back to stop.id when stop_id is missing', () => {
    const stop = {id: 7, stop_type: 'delivery'};
    expect(activeMarkerKey(stop)).toBe('stop-7-delivery');
  });

  test('falls back to "d" when stop_type is missing', () => {
    const stop = {stop_id: 5};
    expect(activeMarkerKey(stop)).toBe('stop-5-d');
  });

  test('keys are stable across re-renders (no idx dependency)', () => {
    const stops = [
      {stop_id: 10, stop_type: 'delivery'},
      {stop_id: 20, stop_type: 'delivery'},
      {stop_id: 30, stop_type: 'pickup'},
    ];

    const keysRender1 = stops.map(activeMarkerKey);

    // Simulate reorder (server returns different order)
    const reordered = [stops[2], stops[0], stops[1]];
    const keysRender2 = reordered.map(activeMarkerKey);

    // Keys should be the same set regardless of order
    expect(new Set(keysRender1)).toEqual(new Set(keysRender2));

    // Each stop's key is unchanged
    expect(activeMarkerKey(stops[0])).toBe(activeMarkerKey(reordered[1]));
  });

  test('active and completed keys are distinct for same stop', () => {
    const stop = {stop_id: 42, stop_type: 'delivery'};
    expect(activeMarkerKey(stop)).not.toBe(completedMarkerKey(stop));
  });

  test('no duplicate keys across a set of stops', () => {
    const stops = [
      {stop_id: 1, stop_type: 'delivery'},
      {stop_id: 2, stop_type: 'delivery'},
      {stop_id: 3, stop_type: 'pickup'},
      {stop_id: 1, stop_type: 'pickup'},  // same id, different type
    ];
    const keys = stops.map(activeMarkerKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ══════════════════════════════════════════════════════
// Stop classification (active vs completed)
// ══════════════════════════════════════════════════════

describe('Stop classification', () => {
  test('separates active and completed stops', () => {
    const allStops = [
      {id: 1, stop_status: 'pending', stop_type: 'delivery'},
      {id: 2, stop_status: 'delivered', stop_type: 'delivery'},
      {id: 3, stop_status: 'in_transit', stop_type: 'delivery'},
      {id: 4, stop_status: 'failed', stop_type: 'delivery'},
      {id: 5, stop_status: 'assigned', stop_type: 'pickup'},
    ];

    const {mapStops, completedStops} = classifyStops(allStops);

    expect(mapStops).toHaveLength(3); // pending, in_transit, assigned
    expect(completedStops).toHaveLength(2); // delivered, failed
  });

  test('assigns sequential sequence_numbers to active stops only', () => {
    const allStops = [
      {id: 1, stop_status: 'pending'},
      {id: 2, stop_status: 'completed'},
      {id: 3, stop_status: 'accepted'},
      {id: 4, stop_status: 'cancelled'},
      {id: 5, stop_status: 'picked_up'},
    ];

    const {mapStops} = classifyStops(allStops);

    expect(mapStops).toHaveLength(3);
    expect(mapStops[0].sequence_number).toBe(1);
    expect(mapStops[1].sequence_number).toBe(2);
    expect(mapStops[2].sequence_number).toBe(3);
  });

  test('empty input returns empty arrays', () => {
    const {mapStops, completedStops} = classifyStops([]);
    expect(mapStops).toHaveLength(0);
    expect(completedStops).toHaveLength(0);
  });

  test('all completed returns no active stops', () => {
    const allStops = [
      {id: 1, stop_status: 'delivered'},
      {id: 2, stop_status: 'failed'},
      {id: 3, stop_status: 'cancelled'},
    ];
    const {mapStops} = classifyStops(allStops);
    expect(mapStops).toHaveLength(0);
  });

  test('stops without stop_status default to pending (active)', () => {
    const allStops = [{id: 1}, {id: 2}];
    const {mapStops} = classifyStops(allStops);
    expect(mapStops).toHaveLength(2);
  });

  test('respects status field when stop_status is missing', () => {
    const allStops = [{id: 1, status: 'delivered'}];
    const {mapStops, completedStops} = classifyStops(allStops);
    expect(mapStops).toHaveLength(0);
    expect(completedStops).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════════════
// Order count computations
// ══════════════════════════════════════════════════════

describe('Order count computations', () => {
  const ACTIVE_STATUSES = ['assigned', 'accepted', 'picked_up', 'in_transit'];

  const computeCounts = (orders) => {
    const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
    const assignedCount = orders.filter((o) => o.status === 'assigned').length;
    return {activeCount, assignedCount};
  };

  test('counts assigned orders for Start Trip button', () => {
    const orders = [
      {id: 1, status: 'assigned'},
      {id: 2, status: 'assigned'},
      {id: 3, status: 'in_transit'},
      {id: 4, status: 'delivered'},
    ];
    const {assignedCount} = computeCounts(orders);
    expect(assignedCount).toBe(2);
  });

  test('counts active orders correctly', () => {
    const orders = [
      {id: 1, status: 'assigned'},
      {id: 2, status: 'accepted'},
      {id: 3, status: 'picked_up'},
      {id: 4, status: 'in_transit'},
      {id: 5, status: 'delivered'},
      {id: 6, status: 'cancelled'},
    ];
    const {activeCount} = computeCounts(orders);
    expect(activeCount).toBe(4);
  });

  test('returns 0 for empty orders', () => {
    const {activeCount, assignedCount} = computeCounts([]);
    expect(activeCount).toBe(0);
    expect(assignedCount).toBe(0);
  });

  test('all delivered → assignedCount is 0 (Start Trip hidden)', () => {
    const orders = [
      {id: 1, status: 'delivered'},
      {id: 2, status: 'delivered'},
    ];
    const {assignedCount} = computeCounts(orders);
    expect(assignedCount).toBe(0);
  });
});
