/**
 * Trasealla Driver App — Stops Store (Zustand)
 */

import {create} from 'zustand';
import {stopsApi, ordersApi, uploadsApi} from '../api';

const useStopsStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  stops: [], // stops for current/active order
  currentStopId: null,
  isLoading: false,
  isActing: false, // for arrived/complete/fail/skip actions
  error: null,
  needsReoptimize: false, // set after stop complete/fail/skip

  // ─── Actions ────────────────────────────────────

  /**
   * Fetch all stops for an order
   */
  fetchStops: async orderId => {
    set({isLoading: true, error: null});
    try {
      const res = await ordersApi.getStops(orderId);
      const data = res.data?.data || res.data;
      const items = data?.stops || data || [];

      set({
        stops: items,
        isLoading: false,
        error: null,
      });

      return items;
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to load stops',
      });
      return [];
    }
  },

  /**
   * Mark arrived at a stop
   */
  arrivedAtStop: async (stopId, data = {}) => {
    set({isActing: true, error: null});
    try {
      const res = await stopsApi.arrivedAtStop(stopId, data);

      // Update stop in local list
      set(state => ({
        stops: state.stops.map(s =>
          s.id === stopId ? {...s, status: 'arrived', ...res.data?.data} : s,
        ),
        currentStopId: stopId,
        isActing: false,
      }));

      return res.data;
    } catch (error) {
      set({
        isActing: false,
        error: error.response?.data?.message || 'Failed to mark arrived',
      });
      throw error;
    }
  },

  /**
   * Complete a stop with optional POD
   */
  completeStop: async (stopId, data = {}) => {
    set({isActing: true, error: null});
    try {
      const res = await stopsApi.completeStop(stopId, data);

      set(state => ({
        stops: state.stops.map(s =>
          s.id === stopId ? {...s, status: 'completed', ...res.data?.data} : s,
        ),
        currentStopId: null,
        isActing: false,
        needsReoptimize: true,
      }));

      return res.data;
    } catch (error) {
      set({
        isActing: false,
        error: error.response?.data?.message || 'Failed to complete stop',
      });
      throw error;
    }
  },

  /**
   * Fail a stop
   */
  failStop: async (stopId, data = {}) => {
    set({isActing: true, error: null});
    try {
      const res = await stopsApi.failStop(stopId, data);

      set(state => ({
        stops: state.stops.map(s =>
          s.id === stopId ? {...s, status: 'failed', ...res.data?.data} : s,
        ),
        currentStopId: null,
        isActing: false,
        needsReoptimize: true,
      }));

      return res.data;
    } catch (error) {
      set({
        isActing: false,
        error: error.response?.data?.message || 'Failed to fail stop',
      });
      throw error;
    }
  },

  /**
   * Skip a stop
   */
  skipStop: async (stopId, data = {}) => {
    set({isActing: true, error: null});
    try {
      const res = await stopsApi.skipStop(stopId, data);

      set(state => ({
        stops: state.stops.map(s =>
          s.id === stopId ? {...s, status: 'skipped', ...res.data?.data} : s,
        ),
        currentStopId: null,
        isActing: false,
        needsReoptimize: true,
      }));

      return res.data;
    } catch (error) {
      set({
        isActing: false,
        error: error.response?.data?.message || 'Failed to skip stop',
      });
      throw error;
    }
  },

  /**
   * Upload proof photo for a stop
   */
  uploadStopPhoto: async (stopId, uri) => {
    try {
      const res = await uploadsApi.uploadStopProofPhoto(stopId, uri);
      return res.data;
    } catch (error) {
      if (__DEV__) console.warn('[StopsStore] uploadStopPhoto error:', error?.message);
      throw error;
    }
  },

  /**
   * Upload signature for a stop
   */
  uploadStopSignature: async (stopId, base64) => {
    try {
      const res = await uploadsApi.uploadStopSignature(stopId, base64);
      return res.data;
    } catch (error) {
      if (__DEV__) console.warn('[StopsStore] uploadStopSignature error:', error?.message);
      throw error;
    }
  },

  /**
   * Set current active stop
   */
  setCurrentStop: stopId => set({currentStopId: stopId}),

  /**
   * Clear reoptimize flag after route has been recalculated
   */
  clearReoptimize: () => set({needsReoptimize: false}),

  /**
   * Reset stops state
   */
  resetStops: () =>
    set({
      stops: [],
      currentStopId: null,
      isLoading: false,
      isActing: false,
      error: null,
      needsReoptimize: false,
    }),
}));

export default useStopsStore;
