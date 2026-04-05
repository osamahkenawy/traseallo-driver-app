/**
 * Trasealla Driver App — Orders Store (Zustand)
 */

import {create} from 'zustand';
import {ordersApi, packagesApi} from '../api';

const useOrderStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  orders: [],
  selectedOrder: null,
  stats: null,
  allTimeStats: null,
  tabCounts: {all: 0, assigned: 0, accepted: 0, picked_up: 0, in_transit: 0, delivered: 0, failed: 0, returned: 0},
  isLoading: false,
  isRefreshing: false,
  isUpdatingStatus: false,
  error: null,
  pagination: {page: 1, limit: 20, total: 0, hasMore: true},

  // ─── Actions ────────────────────────────────────

  /**
   * Fetch orders by status tab (paginated)
   * @param {string} status - 'all' | 'active' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'returned'
   * @param {boolean} isRefresh - If true, reset page to 1
   */
  fetchOrders: async (statusOrParams = 'all', isRefresh = false) => {
    // Support both fetchOrders('active') and fetchOrders({status: 'all', page: 1})
    const status = typeof statusOrParams === 'object' ? (statusOrParams.status || 'all') : statusOrParams;
    const forcePage = typeof statusOrParams === 'object' ? statusOrParams.page : undefined;
    const page = forcePage || (isRefresh ? 1 : get().pagination.page);
    set(isRefresh ? {isRefreshing: true} : {isLoading: true, error: null});
    try {
      let allOrders = [];
      let stats = null;
      let tabCounts = null;
      let allTimeStats = null;
      let driver = null;
      let total = 0;
      let hasMore = false;

      if (status === 'all') {
        // Backend does not support status=all — fetch multiple statuses in parallel
        const [activeRes, deliveredRes, failedRes] = await Promise.all([
          ordersApi.getOrders({status: 'active', page: 1, limit: 30}),
          ordersApi.getOrders({status: 'delivered', page: 1, limit: 30}),
          ordersApi.getOrders({status: 'failed', page: 1, limit: 30}),
        ]);
        const extract = (res) => {
          const d = res.data?.data || res.data;
          return Array.isArray(d) ? d : (d?.orders || []);
        };
        const active = extract(activeRes);
        const delivered = extract(deliveredRes);
        const failed = extract(failedRes);
        // Merge & deduplicate by id
        const map = new Map();
        for (const o of [...active, ...delivered, ...failed]) {
          if (o?.id && !map.has(o.id)) map.set(o.id, o);
        }
        allOrders = Array.from(map.values());
        total = allOrders.length;
        // Extract stats from any response that has them
        const firstData = activeRes.data?.data || activeRes.data;
        if (!Array.isArray(firstData)) {
          stats = firstData?.stats || null;
          tabCounts = firstData?.tabCounts || firstData?.tab_counts || null;
          allTimeStats = firstData?.allTimeStats || firstData?.all_time_stats || null;
          driver = firstData?.driver || null;
        }
      } else {
        const res = await ordersApi.getOrders({status, page, limit: 20});
        const responseData = res.data?.data || res.data;
        allOrders = responseData?.orders || (Array.isArray(responseData) ? responseData : []);
        stats = responseData?.stats || null;
        tabCounts = responseData?.tabCounts || responseData?.tab_counts || null;
        allTimeStats = responseData?.allTimeStats || responseData?.all_time_stats || null;
        driver = responseData?.driver || null;
        total = responseData?.pagination?.total || responseData?.total || allOrders.length;
        hasMore = allOrders.length === 20;
      }

      set({
        orders: (isRefresh || status === 'all') ? allOrders : [...get().orders, ...allOrders],
        stats: stats || get().stats,
        allTimeStats: allTimeStats || get().allTimeStats,
        tabCounts: tabCounts || get().tabCounts,
        pagination: {page: page + 1, limit: 20, total, hasMore},
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      return driver;
    } catch (error) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: error.response?.data?.message || 'Failed to load orders',
      });
      return null;
    }
  },

  /**
   * Fetch full order detail by order ID
   * @param {number|string} orderId
   */
  fetchOrderDetail: async (orderId) => {
    set({isLoading: true, error: null});
    try {
      const res = await ordersApi.getOrderDetail(orderId);
      const data = res.data?.data || res.data;
      set({selectedOrder: data, isLoading: false});
      return data;
    } catch (error) {
      // Fallback: use order from the already-loaded list if detail API fails
      const fallback = get().orders.find(
        o => o.id === orderId || o.id === Number(orderId) || o.tracking_token === orderId,
      );
      set({
        selectedOrder: fallback || get().selectedOrder,
        isLoading: false,
        error: error.response?.data?.message || 'Failed to load order',
      });
      return fallback || null;
    }
  },

  /**
   * Accept an assigned order
   * @param {number|string} orderId
   */
  acceptOrder: async (orderId) => {
    set({isUpdatingStatus: true});
    try {
      const res = await ordersApi.acceptOrder(orderId);
      // Update selected order + list
      const selected = get().selectedOrder;
      if (selected?.id === orderId || selected?.id === Number(orderId)) {
        set({selectedOrder: {...selected, status: 'accepted'}});
      }
      const orders = get().orders.map(o =>
        (o.id === orderId || o.id === Number(orderId)) ? {...o, status: 'accepted'} : o,
      );
      set({orders, isUpdatingStatus: false});
      return {success: true, data: res.data};
    } catch (error) {
      set({isUpdatingStatus: false});
      return {success: false, error: error.response?.data?.message || 'Failed to accept order'};
    }
  },

  /**
   * Reject an assigned order
   * @param {number|string} orderId
   * @param {string} reason
   */
  rejectOrder: async (orderId, reason) => {
    set({isUpdatingStatus: true});
    try {
      const res = await ordersApi.rejectOrder(orderId, reason);
      const orders = get().orders.filter(o => o.id !== orderId && o.id !== Number(orderId));
      set({orders, isUpdatingStatus: false});
      return {success: true, data: res.data};
    } catch (error) {
      set({isUpdatingStatus: false});
      return {success: false, error: error.response?.data?.message || 'Failed to reject order'};
    }
  },

  /**
   * Start delivery — transition order to in_transit
   * @param {number|string} orderId
   * @param {object} [data] - { lat?, lng? }
   */
  startDelivery: async (orderId, data = {}) => {
    set({isUpdatingStatus: true});
    try {
      const res = await ordersApi.startDelivery(orderId, data);
      const selected = get().selectedOrder;
      if (selected?.id === orderId || selected?.id === Number(orderId)) {
        set({selectedOrder: {...selected, status: 'in_transit'}});
      }
      const orders = get().orders.map(o =>
        (o.id === orderId || o.id === Number(orderId)) ? {...o, status: 'in_transit'} : o,
      );
      set({orders, isUpdatingStatus: false});
      return {success: true, data: res.data};
    } catch (error) {
      set({isUpdatingStatus: false});
      return {success: false, error: error.response?.data?.message || 'Failed to start delivery'};
    }
  },

  /**
   * Deliver order (single-delivery)
   * @param {number|string} orderId
   * @param {object} [data]
   */
  deliverOrder: async (orderId, data = {}) => {
    set({isUpdatingStatus: true});
    try {
      const res = await ordersApi.deliverOrder(orderId, data);
      const selected = get().selectedOrder;
      if (selected?.id === orderId || selected?.id === Number(orderId)) {
        set({selectedOrder: {...selected, status: 'delivered'}});
      }
      const orders = get().orders.map(o =>
        (o.id === orderId || o.id === Number(orderId)) ? {...o, status: 'delivered'} : o,
      );
      set({orders, isUpdatingStatus: false});
      return {success: true, data: res.data};
    } catch (error) {
      set({isUpdatingStatus: false});
      return {success: false, error: error.response?.data?.message || 'Failed to deliver order'};
    }
  },

  /**
   * Fail order
   * @param {number|string} orderId
   * @param {object} data - { reason, lat?, lng? }
   */
  failOrder: async (orderId, data) => {
    set({isUpdatingStatus: true});
    try {
      const res = await ordersApi.failOrder(orderId, data);
      const selected = get().selectedOrder;
      if (selected?.id === orderId || selected?.id === Number(orderId)) {
        set({selectedOrder: {...selected, status: 'failed'}});
      }
      const orders = get().orders.map(o =>
        (o.id === orderId || o.id === Number(orderId)) ? {...o, status: 'failed'} : o,
      );
      set({orders, isUpdatingStatus: false});
      return {success: true, data: res.data};
    } catch (error) {
      set({isUpdatingStatus: false});
      return {success: false, error: error.response?.data?.message || 'Failed to fail order'};
    }
  },

  /**
   * Return order to sender
   * @param {number|string} orderId
   * @param {object} [data]
   */
  returnOrder: async (orderId, data = {}) => {
    set({isUpdatingStatus: true});
    try {
      const res = await ordersApi.returnOrder(orderId, data);
      const selected = get().selectedOrder;
      if (selected?.id === orderId || selected?.id === Number(orderId)) {
        set({selectedOrder: {...selected, status: 'returned'}});
      }
      const orders = get().orders.map(o =>
        (o.id === orderId || o.id === Number(orderId)) ? {...o, status: 'returned'} : o,
      );
      set({orders, isUpdatingStatus: false});
      return {success: true, data: res.data};
    } catch (error) {
      set({isUpdatingStatus: false});
      return {success: false, error: error.response?.data?.message || 'Failed to return order'};
    }
  },

  /**
   * Set selected order (for navigation)
   */
  setSelectedOrder: (order) => set({selectedOrder: order}),

  /**
   * Clear selected order
   */
  clearSelectedOrder: () => set({selectedOrder: null}),

  /**
   * Clear error
   */
  clearError: () => set({error: null}),

  /**
   * Reset pagination (e.g. on tab change)
   */
  resetPagination: () => set({pagination: {page: 1, limit: 20, total: 0, hasMore: true}, orders: []}),

  // ─── Package State ──────────────────────────────────
  packages: [],
  packageSummary: null,
  packagesLoading: false,

  /**
   * Fetch packages for an order
   * @param {number|string} orderId
   */
  fetchPackages: async (orderId) => {
    set({packagesLoading: true});
    try {
      const res = await packagesApi.getOrderPackages(orderId);
      const data = res.data?.data || res.data;
      const packages = data?.packages || data || [];
      const summary = data?.summary || null;
      set({packages: Array.isArray(packages) ? packages : [], packageSummary: summary, packagesLoading: false});
      return {packages, summary};
    } catch (error) {
      set({packagesLoading: false});
      return {packages: [], summary: null};
    }
  },

  /**
   * Update a single package status in local state after API call
   */
  updatePackageLocal: (packageId, newStatus) => {
    const packages = get().packages.map(p =>
      p.id === packageId ? {...p, status: newStatus} : p,
    );
    set({packages});
  },

  /**
   * Clear packages
   */
  clearPackages: () => set({packages: [], packageSummary: null}),
}));

export default useOrderStore;
