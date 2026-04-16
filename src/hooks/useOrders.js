/**
 * Trasealla Driver App — useOrders Hook
 * Convenience wrapper around orderStore with auto-fetch
 */

import {useEffect, useCallback} from 'react';
import useOrderStore from '../store/orderStore';

/**
 * @param {object}  [params]               - Filter / pagination params
 * @param {string}  [params.status]        - 'active' | 'completed' | 'failed' | 'all'
 * @param {boolean} [autoFetch=true]
 */
const useOrders = (params = {}, autoFetch = true) => {
  const orders = useOrderStore(s => s.orders);
  const selectedOrder = useOrderStore(s => s.selectedOrder);
  const tabCounts = useOrderStore(s => s.tabCounts);
  const stats = useOrderStore(s => s.stats);
  const allTimeStats = useOrderStore(s => s.allTimeStats);
  const pagination = useOrderStore(s => s.pagination);
  const isLoading = useOrderStore(s => s.isLoading);
  const isLoadingDetail = useOrderStore(s => s.isLoadingDetail);
  const isRefreshing = useOrderStore(s => s.isRefreshing);
  const isActing = useOrderStore(s => s.isActing);
  const isUpdatingStatus = useOrderStore(s => s.isUpdatingStatus);
  const error = useOrderStore(s => s.error);
  const fetchOrders = useOrderStore(s => s.fetchOrders);
  const fetchOrderDetail = useOrderStore(s => s.fetchOrderDetail);
  const acceptOrder = useOrderStore(s => s.acceptOrder);
  const rejectOrder = useOrderStore(s => s.rejectOrder);
  const startDelivery = useOrderStore(s => s.startDelivery);
  const deliverOrder = useOrderStore(s => s.deliverOrder);
  const failOrder = useOrderStore(s => s.failOrder);
  const returnOrder = useOrderStore(s => s.returnOrder);
  const setSelectedOrder = useOrderStore(s => s.setSelectedOrder);
  const clearSelectedOrder = useOrderStore(s => s.clearSelectedOrder);
  const clearError = useOrderStore(s => s.clearError);
  const resetPagination = useOrderStore(s => s.resetPagination);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchOrders(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.status, params.page, params.limit, autoFetch]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    fetchOrders({...params, page: 1}, true);
  }, [params]);

  // Load more (next page)
  const onLoadMore = useCallback(() => {
    if (isLoading || !pagination.hasMore) return;
    fetchOrders({...params, page: pagination.page + 1});
  }, [params, pagination, isLoading]);

  return {
    orders,
    selectedOrder,
    tabCounts,
    stats,
    allTimeStats,
    pagination,
    isLoading,
    isLoadingDetail,
    isRefreshing,
    isActing,
    isUpdatingStatus,
    error,
    fetchOrders,
    fetchOrderDetail,
    acceptOrder,
    rejectOrder,
    startDelivery,
    deliverOrder,
    failOrder,
    returnOrder,
    setSelectedOrder,
    clearSelectedOrder,
    clearError,
    onRefresh,
    onLoadMore,
  };
};

export default useOrders;
