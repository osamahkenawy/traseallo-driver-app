/**
 * Trasealla Driver App — Delivery Stops API
 * Endpoints: /driver-app/stops/:stopId/*
 */

import apiClient from './client';

const stopsApi = {
  /**
   * Mark arrived at a delivery stop
   * @param {number|string} stopId
   * @param {object} [data] - { lat?, lng? }
   */
  arrivedAtStop: (stopId, data = {}) =>
    apiClient.post(`/driver-app/stops/${stopId}/arrived`, data),

  /**
   * Complete a delivery stop
   * @param {number|string} stopId
   * @param {object} [data] - { cod_collected?, signature_url?, proof_photo_url?, notes?, lat?, lng? }
   */
  completeStop: (stopId, data = {}) =>
    apiClient.post(`/driver-app/stops/${stopId}/complete`, data),

  /**
   * Fail a delivery stop
   * @param {number|string} stopId
   * @param {object} data - { reason, lat?, lng? }
   */
  failStop: (stopId, data) =>
    apiClient.post(`/driver-app/stops/${stopId}/fail`, data),

  /**
   * Skip a delivery stop (revisit later)
   * @param {number|string} stopId
   * @param {object} [data] - { reason? }
   */
  skipStop: (stopId, data = {}) =>
    apiClient.post(`/driver-app/stops/${stopId}/skip`, data),
};

export default stopsApi;
