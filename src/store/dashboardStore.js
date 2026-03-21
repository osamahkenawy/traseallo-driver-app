/**
 * Trasealla Driver App — Dashboard Store (Zustand)
 */

import {create} from 'zustand';
import {dashboardApi} from '../api';

const useDashboardStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  driver: null, // { name, status, rating, photo, vehicle_type }
  today: null, // { active_orders, delivered, failed, returned, earnings, cod_collected, cod_pending, pending_pickups, remaining_stops }
  nextStops: [], // [{ address, recipient, eta, order_id }]
  isLoading: false,
  isRefreshing: false,
  error: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Fetch dashboard summary
   */
  fetchDashboard: async (isRefresh = false) => {
    set(isRefresh ? {isRefreshing: true} : {isLoading: true, error: null});
    try {
      const res = await dashboardApi.getDashboard();
      const data = res.data?.data || res.data;

      set({
        driver: data?.driver || null,
        today: data?.today || null,
        nextStops: data?.next_stops || [],
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: error.response?.data?.message || 'Failed to load dashboard',
      });
      return null;
    }
  },
}));

export default useDashboardStore;
