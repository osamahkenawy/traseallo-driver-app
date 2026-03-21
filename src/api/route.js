/**
 * Trasealla Driver App — Route API
 * Endpoints: /driver-app/route, /driver-app/history
 */

import apiClient from './client';

const routeApi = {
  /**
   * Get today's delivery route — ordered stops list
   * @returns {Promise} { summary, stops[] }
   * summary: { total_stops, completed, remaining, next_address }
   * stops[]: { sequence, recipient, address, status, lat, lng, order_id }
   */
  getRoute: () => apiClient.get('/driver-app/route'),

  /**
   * Get delivery history (past completed deliveries)
   * @param {object} [params] - { status?, date_from?, date_to?, page?, limit? }
   */
  getHistory: (params = {}) =>
    apiClient.get('/driver-app/history', {params: {page: 1, limit: 30, ...params}}),
};

export default routeApi;
