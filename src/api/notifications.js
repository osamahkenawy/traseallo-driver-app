/**
 * Trasealla Driver App — Notifications API
 * Endpoints: /driver-app/notifications, /driver-app/device-token
 */

import apiClient from './client';

const notificationsApi = {
  /**
   * Get driver's in-app notifications (paginated)
   * @param {object} [params] - { page?, limit?, unread_only? }
   */
  getNotifications: (params) =>
    apiClient.get('/driver-app/notifications', {params}),

  /**
   * Mark a single notification as read
   * @param {number} id
   */
  markAsRead: (id) =>
    apiClient.patch(`/driver-app/notifications/${id}/read`),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: () =>
    apiClient.post('/driver-app/notifications/read-all'),

  /**
   * Register push notification device token (FCM / APNS)
   * @param {string} deviceToken
   * @param {string} platform - 'ios' or 'android'
   * @param {string} [deviceInfo] - device model info
   */
  registerDeviceToken: (deviceToken, platform, deviceInfo) =>
    apiClient.post('/driver-app/device-token', {
      device_token: deviceToken,
      platform: platform || require('react-native').Platform.OS,
      device_info: deviceInfo,
    }),
};

export default notificationsApi;
