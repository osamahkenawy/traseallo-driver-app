/**
 * Trasealla Driver App — Notifications Store (Zustand)
 */

import {create} from 'zustand';
import {notificationsApi} from '../api';

const useNotificationStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isRefreshing: false,
  page: 1,
  hasMore: true,

  // ─── Actions ────────────────────────────────────

  /**
   * Fetch notifications (paginated)
   * GET /driver-app/notifications
   * @param {boolean} isRefresh - Reset to page 1
   */
  fetchNotifications: async (isRefresh = false) => {
    const currentPage = isRefresh ? 1 : get().page;
    set(isRefresh ? {isRefreshing: true} : {isLoading: true});

    try {
      const res = await notificationsApi.getNotifications({
        page: currentPage,
        limit: 20,
      });

      const body = res.data || {};
      const newNotifications = Array.isArray(body.data)
        ? body.data
        : Array.isArray(body.notifications)
          ? body.notifications
          : Array.isArray(body)
            ? body
            : [];

      const notifications = isRefresh
        ? newNotifications
        : (() => {
            const merged = [...get().notifications, ...newNotifications];
            const seen = new Set();
            return merged.filter(n => {
              const key = n.id ?? n._id;
              if (key == null) return true;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          })();

      set({
        notifications,
        unreadCount: body.unread ?? body.unread_count ?? get().unreadCount,
        page: currentPage + 1,
        hasMore: newNotifications.length === 20,
        isLoading: false,
        isRefreshing: false,
      });
    } catch (error) {
      if (__DEV__) console.log('Fetch notifications error:', error?.message);
      set({isLoading: false, isRefreshing: false});
    }
  },

  /**
   * Fetch unread count from notifications endpoint
   * We poll the notifications list and extract unread count from it
   */
  fetchUnreadCount: async () => {
    try {
      const res = await notificationsApi.getNotifications({page: 1, limit: 1, unread_only: true});
      const body = res.data || {};
      set({unreadCount: body.unread ?? body.unread_count ?? body.total ?? 0});
    } catch (err) {
      if (__DEV__) console.log('[notif] fetchUnreadCount error:', err?.message);
    }
  },

  /**
   * Mark a single notification as read
   * PATCH /driver-app/notifications/:id/read
   */
  markAsRead: async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      const notifications = get().notifications.map((n) =>
        n.id === id ? {...n, read: true, is_read: true, read_at: new Date().toISOString()} : n,
      );
      set({
        notifications,
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch (err) {
      if (__DEV__) console.warn('[notif] markAsRead error:', err?.message);
    }
  },

  /**
   * Mark all notifications as read
   * POST /driver-app/notifications/read-all
   */
  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      const notifications = get().notifications.map((n) => ({
        ...n,
        read: true,
        is_read: true,
        read_at: new Date().toISOString(),
      }));
      set({notifications, unreadCount: 0});
    } catch (err) {
      if (__DEV__) console.warn('[notif] markAllAsRead error:', err?.message);
    }
  },

  /**
   * Delete a single notification (local-only, no backend endpoint in new API)
   */
  deleteNotification: (id) => {
    const notification = get().notifications.find((n) => n.id === id);
    const notifications = get().notifications.filter((n) => n.id !== id);
    const wasUnread = notification && !notification.read_at && !notification.is_read;
    set({
      notifications,
      unreadCount: wasUnread ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
    });
  },

  /**
   * Clear all notifications (local-only)
   */
  clearAllNotifications: () => {
    set({notifications: [], unreadCount: 0, page: 1, hasMore: true});
  },

  /**
   * Increment unread count (from socket event)
   */
  incrementUnreadCount: () =>
    set({unreadCount: get().unreadCount + 1}),

  /**
   * Add a new notification (from socket/push)
   */
  addNotification: (notification) => {
    set({
      notifications: [notification, ...get().notifications],
      unreadCount: get().unreadCount + 1,
    });
  },
}));

export default useNotificationStore;
