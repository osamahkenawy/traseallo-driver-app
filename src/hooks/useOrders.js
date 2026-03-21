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
  const {
    orders,
    selectedOrder,
    tabCounts,
    stats,
    allTimeStats,
    pagination,
    isLoading,
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
    resetPagination,
  } = useOrderStore();

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchOrders(params);
    }
  }, [params.status, autoFetch]);

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
