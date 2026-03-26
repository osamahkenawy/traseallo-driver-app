/**
 * Trasealla Driver App — Settings API
 * Endpoints: /driver-app/settings
 */

import apiClient from './client';

const settingsApi = {
  /**
   * Get tenant and app settings
   * @returns {Promise} { tenant, settings }
   * tenant: { name, slug, logo_url }
   * settings: { require_signature, require_photo_proof, require_barcode_scan,
   *             auto_cod_collect, navigation_provider, language, currency }
   */
  getSettings: () => apiClient.get('/driver-app/settings'),

  /**
   * Get service area zones
   * @returns {Promise} { zones: [{ id, name, type, polygon, color }] }
   */
  getZones: () => apiClient.get('/zones'),
};

export default settingsApi;
