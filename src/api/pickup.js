/**
 * Trasealla Driver App — Pickup Workflow API
 * Endpoints: /driver-app/pickups/*
 */

import apiClient, {requireId} from './client';

const pickupApi = {
  /**
   * List driver's pending pickup assignments
   */
  getPickups: () => apiClient.get('/driver-app/pickups'),

  /**
   * Mark en route to pickup location
   * @param {number|string} orderId
   * @param {object} [data] - { lat?, lng? }
   */
  enRoute: (orderId, data = {}) =>
    apiClient.post(`/driver-app/pickups/${requireId(orderId, 'orderId')}/en-route`, data),

  /**
   * Mark arrived at pickup location
   * @param {number|string} orderId
   * @param {object} [data] - { lat?, lng? }
   */
  markArrived: (orderId, data = {}) =>
    apiClient.post(`/driver-app/pickups/${requireId(orderId, 'orderId')}/arrived`, data),

  /**
   * Confirm pickup — packages collected
   * @param {number|string} orderId
   * @param {object} [data] - { barcode_scanned?, notes?, lat?, lng?, scanned_packages? }
   */
  confirmPickup: (orderId, data = {}) =>
    apiClient.post(`/driver-app/pickups/${requireId(orderId, 'orderId')}/confirm`, data),

  /**
   * Report failed pickup
   * @param {number|string} orderId
   * @param {object} data - { reason, lat?, lng? }
   */
  failPickup: (orderId, data) =>
    apiClient.post(`/driver-app/pickups/${requireId(orderId, 'orderId')}/fail`, data),
};

export default pickupApi;
