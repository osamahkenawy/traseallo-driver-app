/**
 * Trasealla Driver App — Route Store (Zustand)
 */

import {create} from 'zustand';
import {routeApi, locationApi} from '../api';

const useRouteStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  route: null, // { summary, stops: [] }
  progress: null, // { completed, total, percentage, current_stop }
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
}));

export default useRouteStore;
