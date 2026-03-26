/**
 * Trasealla Driver App — Route API
 * Endpoints: /driver-app/route, /driver-app/history, /routing/*
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

  /**
   * Optimize stops using backend TSP solver (up to 25 stops)
   * @param {number} driverLat
   * @param {number} driverLng
   * @param {Array<{lat: number, lng: number, id: number|string}>} stops
   * @returns {Promise} { optimized_order, total_distance_km, total_duration_min, polyline }
   */
  optimizeStops: (driverLat, driverLng, stops) =>
    apiClient.post('/routing/optimize', {
      driver_lat: driverLat,
      driver_lng: driverLng,
      stops,
    }),

  /**
   * Optimize ALL active stops across all orders for this driver
   * @param {number} driverLat
   * @param {number} driverLng
   * @returns {Promise} { optimized_order, total_distance_km, total_duration_min }
   */
  optimizeAll: (driverLat, driverLng) =>
    apiClient.post('/multi-stop/driver/optimize-all', {
      driver_lat: driverLat,
      driver_lng: driverLng,
    }),

  /**
   * Get road distance & ETA between two points
   * @param {number} fromLat
   * @param {number} fromLng
   * @param {number} toLat
   * @param {number} toLng
   * @returns {Promise} { distance_km, duration_min, polyline }
   */
  getDistance: (fromLat, fromLng, toLat, toLng) =>
    apiClient.post('/routing/distance', {
      from_lat: fromLat,
      from_lng: fromLng,
      to_lat: toLat,
      to_lng: toLng,
    }),

  /**
   * Batch up to 50 routes in one call
   * @param {Array<{from_lat, from_lng, to_lat, to_lng}>} routes
   * @returns {Promise} { routes: [{ distance_km, duration_min, polyline }] }
   */
  batchRoutes: (routes) =>
    apiClient.post('/routing/batch-routes', {routes}),
};

export default routeApi;
