/**
 * Trasealla Driver App — Delivery Stops API
 * Endpoints: /driver-app/stops/:stopId/*
 */

import apiClient, {requireId} from './client';

const stopsApi = {
  /**
   * Mark arrived at a delivery stop
   * @param {number|string} stopId
   * @param {object} [data] - { lat?, lng? }
   */
  arrivedAtStop: (stopId, data = {}) =>
    apiClient.post(`/driver-app/stops/${requireId(stopId, 'stopId')}/arrived`, data),

  /**
   * Complete a delivery stop
   * @param {number|string} stopId
   * @param {object} [data] - { cod_collected?, signature_url?, proof_photo_url?, notes?, lat?, lng? }
   */
  completeStop: (stopId, data = {}) =>
    apiClient.post(`/driver-app/stops/${requireId(stopId, 'stopId')}/complete`, data),

  /**
   * Fail a delivery stop
   * @param {number|string} stopId
   * @param {object} data - { reason, lat?, lng? }
   */
  failStop: (stopId, data) =>
    apiClient.post(`/driver-app/stops/${requireId(stopId, 'stopId')}/fail`, data),

  /**
   * Skip a delivery stop (revisit later)
   * @param {number|string} stopId
   * @param {object} [data] - { reason? }
   */
  skipStop: (stopId, data = {}) =>
    apiClient.post(`/driver-app/stops/${requireId(stopId, 'stopId')}/skip`, data),

  /**
   * Update stop sequence (reorder) for an order
   * @param {number|string} orderId
   * @param {Array<{stop_id: number|string, sequence: number}>} stopOrder
   */
  updateStopSequence: (orderId, stopOrder) =>
    apiClient.post(`/multi-stop/orders/${requireId(orderId, 'orderId')}/stops/optimize`, {stop_order: stopOrder}),
};

export default stopsApi;
