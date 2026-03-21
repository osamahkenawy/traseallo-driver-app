/**
 * Trasealla Driver App — Dashboard API
 * Endpoints: /driver-app/dashboard
 */

import apiClient from './client';

const dashboardApi = {
  /**
   * Get driver's dashboard summary
   * @returns {Promise} { driver, today, next_stops }
   * driver: { name, status, rating, photo, vehicle_type }
   * today: { active_orders, delivered, failed, returned, earnings, cod_collected, cod_pending, pending_pickups, remaining_stops }
   * next_stops: [{ address, recipient, eta, order_id }]
   */
  getDashboard: () => apiClient.get('/driver-app/dashboard'),
};

export default dashboardApi;
