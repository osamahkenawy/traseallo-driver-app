/**
 * Trasealla Driver App — useDashboard Hook
 * Aggregates all dashboard-related data from multiple stores/APIs
 * into a single convenient interface for the dashboard screen.
 */

import {useEffect, useCallback, useMemo} from 'react';
import useDashboardStore from '../store/dashboardStore';
import useOrderStore from '../store/orderStore';
import useRouteStore from '../store/routeStore';
import useLocationStore from '../store/locationStore';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import {pickupApi, walletApi, ordersApi} from '../api';

const useDashboard = () => {
  // ─── Stores (individual selectors to prevent over-rendering) ──
  const dashDriver = useDashboardStore(s => s.driver);
  const today = useDashboardStore(s => s.today);
  const nextStops = useDashboardStore(s => s.nextStops);
  const isDashLoading = useDashboardStore(s => s.isLoading);
  const isDashRefreshing = useDashboardStore(s => s.isRefreshing);
  const fetchDashboard = useDashboardStore(s => s.fetchDashboard);

  const orders = useOrderStore(s => s.orders);
  const fetchOrders = useOrderStore(s => s.fetchOrders);
  const isOrdersLoading = useOrderStore(s => s.isLoading);

  const route = useRouteStore(s => s.route);
  const progress = useRouteStore(s => s.progress);
  const fetchRoute = useRouteStore(s => s.fetchRoute);
  const fetchProgress = useRouteStore(s => s.fetchProgress);

  // Only subscribe to what we need — NOT currentPosition
  const driverStatus = useLocationStore(s => s.driverStatus);
  const setDriverStatus = useLocationStore(s => s.setDriverStatus);
  const goOnline = useLocationStore(s => s.goOnline);
  const goOffline = useLocationStore(s => s.goOffline);
  const onBreak = useLocationStore(s => s.onBreak);

  const unreadCount = useNotificationStore(s => s.unreadCount);
  const notifications = useNotificationStore(s => s.notifications);
  const fetchNotifications = useNotificationStore(s => s.fetchNotifications);
  const fetchUnreadCount = useNotificationStore(s => s.fetchUnreadCount);

  const user = useAuthStore(s => s.user);
  const displayName = user?.full_name || user?.name || user?.username || 'Driver';

  // ─── Derived data ──────────────────────────────

  const activeOrders = useMemo(
    () =>
      orders?.filter(o =>
        ['confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered'].includes(o.status),
      ) || [],
    [orders],
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Next stop from dashboard or route
  const nextStop = useMemo(() => {
    // Prefer dashboard next_stops
    if (nextStops?.length > 0) return nextStops[0];
    // Fallback: first pending stop from route (API returns delivery_stops, stop_status)
    const stops = route?.delivery_stops || route?.stops || [];
    return stops.find(s =>
      (s.stop_status || s.status) === 'pending' ||
      (s.stop_status || s.status) === 'en_route',
    ) || null;
  }, [nextStops, route]);

  // Route summary
  const routeSummary = useMemo(() => route?.summary || null, [route]);

  // Today stats from dashboard
  const todayStats = useMemo(() => ({
    active: today?.active_orders ?? activeOrders.length,
    delivered: today?.delivered_today ?? today?.delivered ?? 0,
    failed: today?.failed_today ?? today?.failed ?? 0,
    returned: today?.returned_today ?? today?.returned ?? 0,
    pendingPickups: today?.pending_pickups ?? 0,
    remainingStops: today?.stops_remaining ?? today?.remaining_stops ?? 0,
    earnings: today?.earned_today ?? today?.earnings ?? 0,
    codCollected: today?.cod_collected_today ?? today?.cod_collected ?? 0,
    codPending: today?.cod_pending ?? 0,
  }), [today, activeOrders.length]);

  // Progress
  const routeProgress = useMemo(() => ({
    totalOrders: progress?.total_orders ?? 0,
    delivered: progress?.delivered ?? todayStats.delivered,
    failed: progress?.failed ?? todayStats.failed,
    returned: progress?.returned ?? todayStats.returned,
    remaining: progress?.remaining ?? 0,
    totalStops: progress?.total_stops_all ?? 0,
    completedStops: progress?.completed_stops_all ?? 0,
    earned: progress?.earned ?? todayStats.earnings,
    codCollected: progress?.cod_collected ?? todayStats.codCollected,
    completionPct: progress?.completion_pct ?? 0,
  }), [progress, todayStats]);

  const sessionStartTime = useLocationStore(s => s.sessionStartTime);

  // Driver info merged from dashboard + auth
  const driverInfo = useMemo(() => ({
    name: dashDriver?.full_name || dashDriver?.name || displayName,
    photo: dashDriver?.photo_url || dashDriver?.photo || user?.avatar || user?.photo || null,
    vehicleType: dashDriver?.vehicle_type || user?.vehicle_type || null,
    rating: dashDriver?.rating || user?.rating || null,
    status: driverStatus,
    sessionStartTime,
  }), [dashDriver, displayName, user, driverStatus, sessionStartTime]);

  // Latest unread notifications (max 3)
  const latestNotifications = useMemo(
    () =>
      (notifications || [])
        .filter(n => !n.is_read && !n.read)
        .slice(0, 3),
    [notifications],
  );

  // ─── Fetch all data ────────────────────────────

  const fetchAll = useCallback(async (isRefresh = false) => {
    try {
      const safe = (fn, ...args) =>
        typeof fn === 'function'
          ? Promise.resolve().then(() => fn(...args)).catch(() => null)
          : Promise.resolve(null);

      // Fetch active orders + confirmed + delivered in parallel for dashboard filters
      const fetchDashboardOrders = async () => {
        try {
          const [activeRes, confirmedRes, deliveredRes] = await Promise.all([
            ordersApi.getOrders({status: 'active', page: 1, limit: 50}),
            ordersApi.getOrders({status: 'confirmed', page: 1, limit: 50}),
            ordersApi.getOrders({status: 'delivered', page: 1, limit: 20}),
          ]);
          const extract = (res) => {
            const d = res?.data?.data || res?.data;
            return (Array.isArray(d) ? d : d?.orders || []);
          };
          const combined = [...extract(activeRes), ...extract(confirmedRes), ...extract(deliveredRes)];
          // Deduplicate by id
          const seen = new Set();
          const unique = combined.filter(o => {
            if (seen.has(o.id)) return false;
            seen.add(o.id);
            return true;
          });
          useOrderStore.setState({orders: unique, isLoading: false, isRefreshing: false});
        } catch (e) {
          if (__DEV__) console.warn('[useDashboard] fetchDashboardOrders error:', e?.message);
        }
      };

      await Promise.all([
        safe(fetchDashboard, isRefresh),
        fetchDashboardOrders(),
        safe(fetchRoute, isRefresh),
        safe(fetchProgress),
        safe(fetchUnreadCount),
        safe(fetchNotifications, true),
      ]);

      // Sync driver status from dashboard or auth user into locationStore
      const dashState = useDashboardStore.getState();
      const authState = useAuthStore.getState();
      const apiStatus =
        dashState.driver?.status ||
        authState.user?.status;
      if (apiStatus && apiStatus !== useLocationStore.getState().driverStatus) {
        setDriverStatus(apiStatus);
      }
    } catch (e) {
      if (__DEV__) console.warn('[useDashboard] fetchAll error:', e?.message);
    }
  }, [fetchDashboard, fetchOrders, fetchRoute, fetchProgress, fetchUnreadCount, fetchNotifications, setDriverStatus]);

  // Auto-fetch on mount + sync driver status from auth if available
  useEffect(() => {
    // Immediately sync status from auth user (set during login)
    if (user?.status) {
      const locStore = useLocationStore.getState();
      if (user.status !== locStore.driverStatus) {
        setDriverStatus(user.status);
      }
      // Start session timer if driver is online but no sessionStartTime yet
      if (user.status !== 'offline' && !locStore.sessionStartTime) {
        useLocationStore.setState({sessionStartTime: new Date().toISOString()});
      }
    }
    fetchAll(false).catch(() => {});
  }, []);

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    fetchAll(true);
  }, [fetchAll]);

  const isLoading = isDashLoading || isOrdersLoading;
  const isRefreshing = isDashRefreshing;

  return {
    // Driver
    driverInfo,
    greeting,
    displayName,
    driverStatus,

    // Shift actions
    goOnline,
    goOffline,
    onBreak,

    // Today stats
    todayStats,

    // Next stop
    nextStop,
    nextStops,
    routeSummary,

    // Active orders
    activeOrders,

    // Route progress
    routeProgress,

    // Notifications
    unreadCount,
    latestNotifications,

    // Loading
    isLoading,
    isRefreshing,
    onRefresh,
    fetchAll,
  };
};

export default useDashboard;
