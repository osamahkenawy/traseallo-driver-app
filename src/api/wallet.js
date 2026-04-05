/**
 * Trasealla Driver App — COD & Earnings API
 * Endpoints: /driver-app/cod/*, /driver-app/earnings/*
 */

import apiClient from './client';

const walletApi = {
  // ─── COD Handling ──────────────────────────────

  /**
   * List pending COD orders
   */
  getCodPending: () => apiClient.get('/driver-app/cod/pending'),

  /**
   * Record COD collection for an order
   * @param {number|string} orderId
   * @param {object} data - { amount_collected?, payment_method_detail?, notes? }
   */
  collectCod: (orderId, data = {}) =>
    apiClient.post(`/driver-app/cod/${orderId}/collect`, data),

  /**
   * Get daily COD summary
   * @param {string} [date] - YYYY-MM-DD (defaults to today)
   */
  getCodSummary: (date) =>
    apiClient.get('/driver-app/cod/summary', {params: date ? {date} : {}}),

  // ─── Earnings ──────────────────────────────────

  /**
   * Get earnings list + summary (paginated)
   * @param {object} [params] - { page?, limit? }
   */
  getEarnings: (params = {}) =>
    apiClient.get('/driver-app/earnings', {params: {page: 1, limit: 30, ...params}}),

  /**
   * Get daily earnings breakdown
   * @param {number} [days=7] - Number of days (max 30)
   */
  getDailyEarnings: (days = 7) =>
    apiClient.get('/driver-app/earnings/daily', {params: {days}}),

  /**
   * Get all-time earnings summary (total_earned, total_paid, total_pending)
   * Uses a wide date range to capture everything.
   */
  getTotalEarnings: () =>
    apiClient.get('/driver-app/earnings', {params: {date_from: '2020-01-01', date_to: '2030-12-31'}}),
};

export default walletApi;
