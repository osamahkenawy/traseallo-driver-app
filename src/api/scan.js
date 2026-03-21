/**
 * Trasealla Driver App — Barcode Scanning API
 * Endpoints: /driver-app/scan, /driver-app/scan/batch, /driver-app/scan/verify-delivery
 */

import apiClient from './client';

const scanApi = {
  /**
   * Scan a single barcode to identify package/order
   * @param {string} barcode - Package barcode, order number, or tracking token
   * @returns {Promise} { type, is_assigned, data }
   */
  scanBarcode: (barcode) =>
    apiClient.post('/driver-app/scan', {barcode}),

  /**
   * Batch scan multiple barcodes (during pickup)
   * @param {string[]} barcodes - Array of barcode strings
   * @returns {Promise} { results[], summary: { total, found, not_found, assigned, unassigned } }
   */
  batchScan: (barcodes) =>
    apiClient.post('/driver-app/scan/batch', {barcodes}),

  /**
   * Verify barcode at delivery point
   * @param {string} barcode
   * @param {number|string} [stopId] - Optional stop ID for cross-verification
   * @returns {Promise} { verified, is_correct_driver, is_correct_stop }
   */
  verifyDelivery: (barcode, stopId) =>
    apiClient.post('/driver-app/scan/verify-delivery', {barcode, stop_id: stopId}),
};

export default scanApi;
