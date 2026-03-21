/**
 * Trasealla Driver App — Pickup Store (Zustand)
 */

import {create} from 'zustand';
import {pickupApi} from '../api';

const usePickupStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  pickups: [],
  selectedPickup: null,
  isLoading: false,
  isRefreshing: false,
  isActing: false,
  error: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Fetch all pending pickup assignments
   */
  fetchPickups: async (isRefresh = false) => {
    set(isRefresh ? {isRefreshing: true} : {isLoading: true, error: null});
    try {
      const res = await pickupApi.getPickups();
      const data = res.data?.data || res.data;
      const items = data?.pickups || data || [];

      set({
        pickups: items,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      return items;
    } catch (error) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: error.response?.data?.message || 'Failed to load pickups',
      });
      return [];
    }
  },

  /**
   * Mark en route to pickup
   */
  enRoute: async (orderId, data = {}) => {
    set({isActing: true, error: null});
    try {
      const res = await pickupApi.enRoute(orderId, data);
      set(state => ({
        pickups: state.pickups.map(p =>
          p.id === orderId || p.order_id === orderId
            ? {...p, pickup_status: 'en_route'}
            : p,
        ),
        isActing: false,
      }));
      return res.data;
    } catch (error) {
      set({isActing: false, error: error.response?.data?.message || 'Failed to mark en route'});
      throw error;
    }
  },

  /**
   * Mark arrived at pickup
   */
  markArrived: async (orderId, data = {}) => {
    set({isActing: true, error: null});
    try {
      const res = await pickupApi.markArrived(orderId, data);
      set(state => ({
        pickups: state.pickups.map(p =>
          p.id === orderId || p.order_id === orderId
            ? {...p, pickup_status: 'at_pickup'}
            : p,
        ),
        isActing: false,
      }));
      return res.data;
    } catch (error) {
      set({isActing: false, error: error.response?.data?.message || 'Failed to mark arrived'});
      throw error;
    }
  },

  /**
   * Confirm pickup — packages collected
   */
  confirmPickup: async (orderId, data = {}) => {
    set({isActing: true, error: null});
    try {
      const res = await pickupApi.confirmPickup(orderId, data);
      set(state => ({
        pickups: state.pickups.filter(p => p.id !== orderId && p.order_id !== orderId),
        isActing: false,
      }));
      return res.data;
    } catch (error) {
      set({isActing: false, error: error.response?.data?.message || 'Failed to confirm pickup'});
      throw error;
    }
  },

  /**
   * Fail pickup
   */
  failPickup: async (orderId, data) => {
    set({isActing: true, error: null});
    try {
      const res = await pickupApi.failPickup(orderId, data);
      set(state => ({
        pickups: state.pickups.map(p =>
          p.id === orderId || p.order_id === orderId
            ? {...p, pickup_status: 'pickup_failed'}
            : p,
        ),
        isActing: false,
      }));
      return res.data;
    } catch (error) {
      set({isActing: false, error: error.response?.data?.message || 'Failed to fail pickup'});
      throw error;
    }
  },

  /** Select a pickup for detail view */
  selectPickup: (pickup) => set({selectedPickup: pickup}),

  /** Clear selection */
  clearSelectedPickup: () => set({selectedPickup: null}),

  /** Clear error */
  clearError: () => set({error: null}),
}));

export default usePickupStore;
