/**
 * Trasealla Driver App — COD Store (Zustand)
 */

import {create} from 'zustand';
import {walletApi} from '../api';

const useCodStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  pendingOrders: [],
  totalPending: 0,
  summary: null, // { total_cod_orders, collected, pending, settled, unsettled_carry_over }
  isLoading: false,
  isRefreshing: false,
  isCollecting: false,
  error: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Fetch pending COD orders
   */
  fetchPending: async (isRefresh = false) => {
    set(isRefresh ? {isRefreshing: true} : {isLoading: true, error: null});
    try {
      const res = await walletApi.getCodPending();
      const data = res.data?.data || res.data;
      const orders = data?.orders || data || [];
      const totalPending = data?.total_pending || 0;

      set({
        pendingOrders: orders,
        totalPending,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: error.response?.data?.message || 'Failed to load COD data',
      });
      return null;
    }
  },

  /**
   * Collect COD for an order
   */
  collectCod: async (orderId, data = {}) => {
    set({isCollecting: true, error: null});
    try {
      const res = await walletApi.collectCod(orderId, data);

      // Remove from pending list
      set(state => ({
        pendingOrders: state.pendingOrders.filter(o => o.id !== orderId && o.order_id !== orderId),
        totalPending: Math.max(0, state.totalPending - 1),
        isCollecting: false,
      }));

      return res.data;
    } catch (error) {
      set({isCollecting: false, error: error.response?.data?.message || 'Failed to collect COD'});
      throw error;
    }
  },

  /**
   * Fetch daily COD summary
   */
  fetchSummary: async (date) => {
    try {
      const res = await walletApi.getCodSummary(date);
      const data = res.data?.data || res.data;
      set({summary: data || null});
      return data;
    } catch (error) {
      if (__DEV__) console.warn('[CodStore] fetchSummary error:', error?.message);
      return null;
    }
  },

  /** Clear error */
  clearError: () => set({error: null}),
}));

export default useCodStore; 