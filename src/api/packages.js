/**
 * Trasealla Driver App — Packages API
 * Per-package endpoints: list, detail, scan, status update
 */

import apiClient, {requireId} from './client';

const packagesApi = {
  /**
   * Get all packages for an order
   * @param {number|string} orderId
   * @returns {Promise} { packages[], summary: { total, delivered, failed, in_progress } }
   */
  getOrderPackages: (orderId) =>
    apiClient.get(`/packages/order/${requireId(orderId, 'orderId')}`),

  /**
   * Get single package detail (with scan_logs)
   * @param {number|string} packageId
   * @returns {Promise} package with scan_logs[]
   */
  getPackage: (packageId) =>
    apiClient.get(`/packages/${requireId(packageId, 'packageId')}`),

  /**
   * Lookup package by barcode (scanner)
   * @param {string} barcode
   * @returns {Promise} { id, order_id, order_number, tracking_token, status, recipient_name, sibling_count }
   */
  scanLookup: (barcode) => {
    if (!barcode || typeof barcode !== 'string' || !barcode.trim()) {
      throw new Error('Missing required barcode');
    }
    return apiClient.get(`/packages/scan/${encodeURIComponent(barcode.trim())}`);
  },

  /**
   * Log a scan event for a package (triggers auto-status transition)
   * @param {number|string} packageId
   * @param {object} data - { scan_type: 'driver_scan'|'pickup_scan'|'delivery_scan'|'return_scan', lat?, lng?, note? }
   */
  logScan: (packageId, data) =>
    apiClient.post(`/packages/${requireId(packageId, 'packageId')}/scan`, data),

  /**
   * Update package status (deliver, fail, return, etc.)
   * @param {number|string} packageId
   * @param {object} data - { status, lat?, lng?, proof_photo_url?, signature_url?, cod_collected?, failure_reason?, notes? }
   */
  updateStatus: (packageId, data) =>
    apiClient.patch(`/packages/${requireId(packageId, 'packageId')}/status`, data),
};

export default packagesApi;
