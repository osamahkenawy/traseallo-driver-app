/**
 * Trasealla Driver App — Route Store (Zustand)
 */

import {create} from 'zustand';
import {routeApi, locationApi} from '../api';
import {fetchOptimizedRoute, fetchRoadRouteChunked} from '../utils/routing';

const useRouteStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  route: null, // { summary, stops: [] }
  progress: null, // { completed, total, percentage, current_stop }
  optimizedCoords: null, // latest reoptimized polyline coordinates
  optimizedRouteInfo: null, // { distance, duration }
  history: [],
  historyPagination: {page: 1, limit: 20, total: 0, hasMore: true},
  isLoading: false,
  isRefreshing: false,
  isLoadingHistory: false,
  error: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Fetch current active route
   */
  fetchRoute: async (isRefresh = false) => {
    set(isRefresh ? {isRefreshing: true} : {isLoading: true, error: null});
    try {
      const res = await routeApi.getRoute();
      const data = res.data?.data || res.data;

      set({
        route: data || null,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: error.response?.data?.message || 'Failed to load route',
      });
      return null;
    }
  },

  /**
   * Fetch route progress
   */
  fetchProgress: async () => {
    try {
      const res = await locationApi.getProgress();
      const data = res.data?.data || res.data;

      set({progress: data || null});
      return data;
    } catch (error) {
      if (__DEV__) console.warn('[RouteStore] fetchProgress error:', error?.message);
      return null;
    }
  },

  /**
   * Fetch delivery history (paginated)
   */
  fetchHistory: async (params = {}) => {
    const {historyPagination} = get();
    const page = params.page || historyPagination.page;
    const limit = params.limit || historyPagination.limit;

    set({isLoadingHistory: true});
    try {
      const res = await routeApi.getHistory({page, limit, ...params});
      const data = res.data?.data || res.data;
      const items = data?.items || data?.history || [];
      const total = data?.total || 0;

      set(state => ({
        history: page === 1 ? items : [...state.history, ...items],
        historyPagination: {
          page,
          limit,
          total,
          hasMore: items.length === limit,
        },
        isLoadingHistory: false,
      }));

      return data;
    } catch (error) {
      set({isLoadingHistory: false});
      if (__DEV__) console.warn('[RouteStore] fetchHistory error:', error?.message);
      return null;
    }
  },

  /**
   * Load next page of history
   */
  loadMoreHistory: async () => {
    const {historyPagination, isLoadingHistory} = get();
    if (isLoadingHistory || !historyPagination.hasMore) return;
    return get().fetchHistory({page: historyPagination.page + 1});
  },

  /**
   * Reset history pagination
   */
  resetHistory: () =>
    set({
      history: [],
      historyPagination: {page: 1, limit: 20, total: 0, hasMore: true},
    }),

  /**
   * Re-optimize route after a stop is completed/failed/skipped.
   * Attempts backend optimize, falls back to local OSRM TSP.
   * @param {{latitude, longitude}} driverPosition
   * @param {Array<{latitude, longitude}>} remainingWaypoints
   */
  reoptimize: async (driverPosition, remainingWaypoints) => {
    if (!driverPosition || !remainingWaypoints || remainingWaypoints.length < 1) return;

    const waypoints = [
      {latitude: driverPosition.latitude, longitude: driverPosition.longitude},
      ...remainingWaypoints,
    ];

    try {
      // Try backend optimize first
      const stops = remainingWaypoints.map((w, i) => ({
        lat: w.latitude, lng: w.longitude, id: w.id || i,
      }));
      const res = await routeApi.optimizeStops(
        driverPosition.latitude,
        driverPosition.longitude,
        stops,
      );
      const data = res.data?.data || res.data;
      if (data?.polyline && Array.isArray(data.polyline)) {
        const coords = data.polyline.map(p => ({
          latitude: p[0] || p.lat,
          longitude: p[1] || p.lng,
        }));
        set({
          optimizedCoords: coords,
          optimizedRouteInfo: {
            distance: (data.total_distance_km || 0) * 1000,
            duration: (data.total_duration_min || 0) * 60,
          },
        });
        return;
      }
    } catch {
      // Fall through to local OSRM
    }

    try {
      let result = waypoints.length <= 25
        ? await fetchOptimizedRoute(waypoints)
        : null;
      if (!result) {
        result = await fetchRoadRouteChunked(waypoints);
      }
      if (result) {
        set({
          optimizedCoords: result.coordinates,
          optimizedRouteInfo: {distance: result.distance, duration: result.duration},
        });
      }
    } catch {
      // Silent fail — map keeps previous polyline
    }
  },

  /**
   * Insert new stops from a newly assigned order into current route data
   * @param {Array} newStops - stops from the new order
   */
  insertNewStops: (newStops) => {
    const current = get().route;
    if (!current) return;
    const deliveryStops = [...(current.delivery_stops || []), ...newStops];
    set({
      route: {...current, delivery_stops: deliveryStops},
    });
  },

  /**
   * Clear optimized route data
   */
  clearOptimized: () => set({optimizedCoords: null, optimizedRouteInfo: null}),
}));

export default useRouteStore;
