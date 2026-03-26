/**
 * Road-following route utility using OSRM (self-hosted via backend proxy)
 *
 * Fetches actual road geometry between an ordered list of waypoints
 * and returns decoded coordinates ready for react-native-maps <Polyline>.
 *
 * The OSRM server is self-hosted (GCC States map data) and proxied
 * through the backend. Falls back to public OSRM if backend is unreachable.
 */

import { API_BASE_URL } from '../config';

const OSRM_SELF_HOSTED = API_BASE_URL
  ? `${API_BASE_URL.replace(/\/api\/?$/, '')}/osrm`
  : 'https://delivery.traseallo.com/osrm';
const OSRM_PUBLIC = 'https://router.project-osrm.org';
const ROUTE_URL = `${OSRM_SELF_HOSTED}/route/v1/driving`;
const ROUTE_URL_FALLBACK = `${OSRM_PUBLIC}/route/v1/driving`;
const TRIP_URL = `${OSRM_SELF_HOSTED}/trip/v1/driving`;
const TRIP_URL_FALLBACK = `${OSRM_PUBLIC}/trip/v1/driving`;

/**
 * Decode Google-encoded polyline string into array of {latitude, longitude}.
 * OSRM returns geometry in this format by default (polyline precision 5).
 */
function decodePolyline(encoded) {
  const coords = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({latitude: lat / 1e5, longitude: lng / 1e5});
  }
  return coords;
}

/**
 * Fetch a road-following route between ordered waypoints.
 *
 * @param {Array<{latitude: number, longitude: number}>} waypoints
 *   At least 2 points. First is typically the driver position.
 * @param {Object} [options]
 * @param {number} [options.timeout=8000]  Fetch timeout in ms.
 * @returns {Promise<{coordinates: Array, distance: number, duration: number} | null>}
 *   coordinates: decoded polyline for <Polyline>,
 *   distance: total in meters,
 *   duration: total in seconds,
 *   or null if the request fails (caller should fall back to straight lines).
 */
export async function fetchRoadRoute(waypoints, options = {}) {
  if (!waypoints || waypoints.length < 2) return null;

  // OSRM expects "lng,lat;lng,lat;..." format
  const coordStr = waypoints
    .map((w) => `${w.longitude},${w.latitude}`)
    .join(';');

  // Try self-hosted OSRM first, then fall back to public
  const urls = [
    `${ROUTE_URL}/${coordStr}?overview=full&geometries=polyline`,
    `${ROUTE_URL_FALLBACK}/${coordStr}?overview=full&geometries=polyline`,
  ];

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 8000);

    try {
      const res = await fetch(url, {signal: controller.signal});
      clearTimeout(timeout);

      if (!res.ok) continue;

      const json = await res.json();
      if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
        continue;
      }

      const route = json.routes[0];
      const coordinates = decodePolyline(route.geometry);

      return {
        coordinates,
        distance: route.distance, // meters
        duration: route.duration, // seconds
      };
    } catch {
      clearTimeout(timeout);
      continue;
    }
  }
  return null;
}

/**
 * For many waypoints (>25, OSRM limit per request), chunk the request
 * and stitch the resulting polylines together.
 */
export async function fetchRoadRouteChunked(waypoints, options = {}) {
  if (!waypoints || waypoints.length < 2) return null;

  const MAX_PER_REQUEST = 25;

  // If within limit, single request
  if (waypoints.length <= MAX_PER_REQUEST) {
    return fetchRoadRoute(waypoints, options);
  }

  // Chunk with overlap so segments connect
  const allCoords = [];
  let totalDist = 0;
  let totalDur = 0;

  for (let i = 0; i < waypoints.length - 1; i += MAX_PER_REQUEST - 1) {
    const chunk = waypoints.slice(i, i + MAX_PER_REQUEST);
    if (chunk.length < 2) break;

    const result = await fetchRoadRoute(chunk, options);
    if (!result) return null; // fail → caller falls back to straight lines

    // Skip first point of subsequent chunks to avoid duplicate
    const coords = i === 0 ? result.coordinates : result.coordinates.slice(1);
    allCoords.push(...coords);
    totalDist += result.distance;
    totalDur += result.duration;
  }

  return allCoords.length >= 2
    ? {coordinates: allCoords, distance: totalDist, duration: totalDur}
    : null;
}

/**
 * Fetch a navigation route from driver to a single destination with
 * step-by-step turn instructions from OSRM.
 *
 * @param {{latitude: number, longitude: number}} origin   Driver position
 * @param {{latitude: number, longitude: number}} dest     Destination stop
 * @param {Object} [options]
 * @returns {Promise<{coordinates: Array, distance: number, duration: number, steps: Array} | null>}
 *   steps: array of { instruction, distance, duration, maneuver, name }
 */
export async function fetchNavigationRoute(origin, dest, options = {}) {
  if (!origin || !dest) return null;

  const coordStr = `${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}`;
  const urls = [
    `${ROUTE_URL}/${coordStr}?overview=full&geometries=polyline&steps=true`,
    `${ROUTE_URL_FALLBACK}/${coordStr}?overview=full&geometries=polyline&steps=true`,
  ];

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 8000);

    try {
      const res = await fetch(url, {signal: controller.signal});
      clearTimeout(timeout);
      if (!res.ok) continue;

      const json = await res.json();
      if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) continue;

      const route = json.routes[0];
      const coordinates = decodePolyline(route.geometry);

      // Extract human-readable steps
      const steps = [];
      for (const leg of route.legs || []) {
        for (const s of leg.steps || []) {
          if (s.maneuver) {
            steps.push({
              maneuver: s.maneuver.type,
              modifier: s.maneuver.modifier,
              name: s.name || '',
              distance: s.distance,
              duration: s.duration,
              location: s.maneuver.location
                ? {longitude: s.maneuver.location[0], latitude: s.maneuver.location[1]}
                : null,
            });
          }
        }
      }

      return {coordinates, distance: route.distance, duration: route.duration, steps};
    } catch {
      clearTimeout(timeout);
      continue;
    }
  }
  return null;
}

/**
 * Fetch an optimized route (TSP) using OSRM's /trip endpoint.
 * The first waypoint (driver position) is fixed as start; the rest are
 * reordered to minimize total travel distance.
 *
 * @param {Array<{latitude: number, longitude: number}>} waypoints
 * @param {Object} [options]
 * @returns {Promise<{coordinates: Array, distance: number, duration: number, optimizedOrder: number[]} | null>}
 *   optimizedOrder: reordered indices of the input waypoints (0-based)
 */
export async function fetchOptimizedRoute(waypoints, options = {}) {
  if (!waypoints || waypoints.length < 2) return null;

  const coordStr = waypoints
    .map((w) => `${w.longitude},${w.latitude}`)
    .join(';');

  // source=first: fix driver position as start; roundtrip=false: don't return to start
  const urls = [
    `${TRIP_URL}/${coordStr}?overview=full&geometries=polyline&source=first&roundtrip=false`,
    `${TRIP_URL_FALLBACK}/${coordStr}?overview=full&geometries=polyline&source=first&roundtrip=false`,
  ];

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);

    try {
      const res = await fetch(url, {signal: controller.signal});
      clearTimeout(timeout);

      if (!res.ok) continue;

      const json = await res.json();
      if (json.code !== 'Ok' || !json.trips || json.trips.length === 0) {
        continue;
      }

      const trip = json.trips[0];
      const coordinates = decodePolyline(trip.geometry);

      const optimizedOrder = (json.waypoints || [])
        .sort((a, b) => a.trips_index - b.trips_index || a.waypoint_index - b.waypoint_index)
        .map((w) => w.waypoint_index);

      return {
        coordinates,
        distance: trip.distance,
        duration: trip.duration,
        optimizedOrder,
      };
    } catch {
      clearTimeout(timeout);
      continue;
    }
  }
  return null;
}
