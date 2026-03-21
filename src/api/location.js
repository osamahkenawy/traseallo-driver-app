/**
 * Trasealla Driver App — Location & Shift API
 * Endpoints: /driver-app/location, /driver-app/go-online, etc.
 */

import apiClient from './client';

const locationApi = {
  // ─── GPS Tracking ──────────────────────────────

  /**
   * Send single GPS update (every 10-30s)
   * @param {object} data - { lat, lng, speed?, heading?, accuracy?, order_id? }
   */
  sendLocation: (data) =>
    apiClient.post('/driver-app/location', data),

  /**
   * Batch upload GPS points (offline buffer flush)
   * @param {Array} points - [{ lat, lng, speed?, heading?, accuracy?, recorded_at }]
   */
  sendLocationBatch: (points) =>
    apiClient.post('/driver-app/location/batch', {points}),

  // ─── Shift / Availability ─────────────────────

  /**
   * Go online — set status to 'available'
   * @param {object} [data] - { lat?, lng? }
   */
  goOnline: (data = {}) =>
    apiClient.post('/driver-app/go-online', data),

  /**
   * Go offline — set status to 'offline'
   * Blocked if active in-transit/picked-up orders exist
   */
  goOffline: () =>
    apiClient.post('/driver-app/go-offline'),

  /**
   * Take a break — set status to 'on_break'
   */
  onBreak: () =>
    apiClient.post('/driver-app/on-break'),

  // ─── Route Progress ────────────────────────────

  /**
   * Get overall delivery progress for today
   * @returns {Promise} { total_orders, delivered, failed, returned, remaining, completion_pct, ... }
   */
  getProgress: () =>
    apiClient.get('/driver-app/progress'),
};

export default locationApi;
