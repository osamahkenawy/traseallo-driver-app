/**
 * Trasealla Driver App — useSocket Hook
 * Socket.io connection for real-time events
 */

import {useEffect, useRef, useCallback} from 'react';
import io from 'socket.io-client';
import useAuthStore from '../store/authStore';
import useOrderStore from '../store/orderStore';
import useNotificationStore from '../store/notificationStore';
import useDashboardStore from '../store/dashboardStore';
import useLocationStore from '../store/locationStore';
import i18n from '../i18n';

const SOCKET_URL = 'https://api.traseallo.com';

const useSocket = () => {
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const token = useAuthStore((s) => s.token);
  const tenantId = useAuthStore((s) => s.tenantId);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard);
  const setPosition = useLocationStore((s) => s.setPosition);

  // Debounced refresh — coalesces rapid socket events into a single fetch
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      fetchOrders();
      fetchDashboard();
      refreshTimerRef.current = null;
    }, 500);
  }, [fetchOrders, fetchDashboard]);

  /**
   * Connect to Socket.io server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    if (!token || !isAuthenticated) return;

    const socket = io(SOCKET_URL, {
      auth: {token: `Bearer ${token}`},
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      if (__DEV__) console.log('🔌 Socket connected');

      // Join rooms
      if (tenantId) socket.emit('join-tenant', tenantId);
      if (user?.id) socket.emit('join-user', user.id);
    });

    socket.on('disconnect', (reason) => {
      if (__DEV__) console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      if (__DEV__) console.log('🔌 Socket error:', error.message);
    });

    // ─── Listen for events ──────────────────────────
    socket.on('order:assigned', (data) => {
      if (__DEV__) console.log('📦 New order assigned:', data);
      scheduleRefresh();
      addNotification({
        id: `socket-assigned-${Date.now()}`,
        title: i18n.t('notifications.newOrderAssigned', 'New Order Assigned'),
        body: i18n.t('notifications.orderAssignedBody', {orderNumber: data?.order_number || '', defaultValue: `Order #${data?.order_number || ''} has been assigned to you.`}),
        created_at: new Date().toISOString(),
        read_at: null,
        is_read: false,
        data: {order_id: data?.order_id, order_number: data?.order_number},
      });
    });

    socket.on('order:status-changed', (data) => {
      if (__DEV__) console.log('📦 Order status changed:', data);
      scheduleRefresh();
      const statusLabel = i18n.t('status.' + (data?.status || ''), data?.status || '');
      addNotification({
        id: `socket-status-${Date.now()}`,
        title: `${i18n.t('dashboard.order', 'Order')} ${statusLabel}`,
        body: `${i18n.t('dashboard.order', 'Order')} #${data?.order_number || ''} ${statusLabel}.`,
        created_at: new Date().toISOString(),
        read_at: null,
        is_read: false,
        data: {order_id: data?.order_id, order_number: data?.order_number},
      });
    });

    socket.on('order:updated', (data) => {
      if (__DEV__) console.log('📦 Order updated:', data);
      scheduleRefresh();
    });

    socket.on('notification', (data) => {
      if (__DEV__) console.log('🔔 Notification:', data);
      addNotification(data);
    });

    // ─── Package-level status changes ───────────
    socket.on('package:status-changed', (data) => {
      if (__DEV__) console.log('📦 Package status changed:', data);
      scheduleRefresh();
    });

    // ─── COD collection confirmation ────────────
    socket.on('order:cod-collected', (data) => {
      if (__DEV__) console.log('💵 COD collected:', data);
      scheduleRefresh();
      addNotification({
        id: `socket-cod-${Date.now()}`,
        title: i18n.t('notifications.codCollected', 'COD Collected'),
        body: i18n.t('notifications.codCollectedBody', {amount: data?.amount || '', orderNumber: data?.order_number || '', defaultValue: `AED ${data?.amount || ''} collected for Order #${data?.order_number || ''}`}),
        created_at: new Date().toISOString(),
        read_at: null,
        is_read: false,
        data: {order_id: data?.order_id, order_number: data?.order_number},
      });
    });

    // ─── Driver location broadcast (own position from server) ──
    socket.on('driver:location', (data) => {
      // Only process own location echoed back by server
      if (data?.driver_id && user?.driver_id && data.driver_id === user.driver_id) {
        if (__DEV__) console.log('📍 Own location echo:', data.lat, data.lng);
      }
    });

    socketRef.current = socket;
  }, [token, tenantId, user, isAuthenticated, scheduleRefresh, addNotification]);

  /**
   * Disconnect from Socket.io server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  /**
   * Emit driver location (real-time broadcast)
   */
  const emitLocation = useCallback((locationData) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('driver:location', locationData);
    }
  }, []);

  // Auto-connect when authenticated, disconnect on logout
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
      // Poll unread notification count every 60 seconds
      fetchUnreadCount();
      pollRef.current = setInterval(() => {
        fetchUnreadCount();
      }, 60000);
    } else {
      disconnect();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      disconnect();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated, token]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    connect,
    disconnect,
    emitLocation,
  };
};

export default useSocket;
