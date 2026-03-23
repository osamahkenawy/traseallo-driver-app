/**
 * Trasealla Driver App — Earnings Store (Zustand)
 */

import {create} from 'zustand';
import {walletApi} from '../api';

const useEarningsStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  earnings: [],
  summary: null, // { total_earned, total_paid, total_pending }
  dailyBreakdown: [], // [{ date, deliveries, earned, cod_collected }]
  pagination: {page: 1, limit: 30, total: 0, hasMore: true},
  isLoading: false,
  isRefreshing: false,
  isLoadingDaily: false,
  error: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Fetch earnings (paginated)
   */
  fetchEarnings: async (params = {}, isRefresh = false) => {
    const {pagination} = get();
    const page = isRefresh ? 1 : (params.page || pagination.page);
    const limit = params.limit || pagination.limit;

    set(isRefresh ? {isRefreshing: true} : {isLoading: true, error: null});
    try {
      const res = await walletApi.getEarnings({page, limit, ...params});
      const data = res.data?.data || res.data;
      const items = data?.earnings || data?.items || [];
      const summary = data?.summary || null;
      const total = data?.total || data?.pagination?.total || 0;

      set(state => ({
        earnings: isRefresh || page === 1 ? items : [...state.earnings, ...items],
        summary: summary || state.summary,
        pagination: {page: page + 1, limit, total, hasMore: items.length === limit},
        isLoading: false,
        isRefreshing: false,
        error: null,
      }));

      return data;
    } catch (error) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: error.response?.data?.message || 'Failed to load earnings',
      });
      return null;
    }
  },

  /**
   * Fetch daily earnings breakdown
   */
  fetchDailyBreakdown: async (days = 7) => {
    set({isLoadingDaily: true});
    try {
      const res = await walletApi.getDailyEarnings(days);
      const data = res.data?.data || res.data;
      const breakdown = data?.daily || data || [];

      set({dailyBreakdown: breakdown, isLoadingDaily: false});
      return breakdown;
    } catch (error) {
      set({isLoadingDaily: false});
      if (__DEV__) console.warn('[EarningsStore] fetchDailyBreakdown error:', error?.message);
      return [];
    }
  },

  /** Load next page */
  loadMore: async (params = {}) => {
    if (get().isLoading || !get().pagination.hasMore) return;
    return get().fetchEarnings({...params, page: get().pagination.page});
  },

  /** Clear error */
  clearError: () => set({error: null}),
}));

export default useEarningsStore;
