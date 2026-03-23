/**
 * Trasealla Driver App — Proof of Delivery / Uploads API
 * Endpoints: /driver-app/orders/:id/proof-photo, /driver-app/orders/:id/signature,
 *            /driver-app/stops/:id/proof-photo, /driver-app/stops/:id/signature,
 *            /driver-app/profile/avatar
 */

import apiClient from './client';

/**
 * Create a FormData object from a local file URI
 * @param {string} uri - Local file URI
 * @param {string} fieldName - Form field name (default: 'file')
 * @returns {FormData}
 */
const createFormData = (uri, fieldName = 'file') => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpeg';
  const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  formData.append(fieldName, {
    uri,
    name: filename,
    type,
  });

  return formData;
};

const uploadsApi = {
  // ─── Order-Level POD ───────────────────────────

  /**
   * Upload proof-of-delivery photo for an order
   * @param {number|string} orderId
   * @param {string} uri - Local image file URI
   * @param {function} [onProgress]
   */
  uploadOrderProofPhoto: (orderId, uri, onProgress) => {
    const formData = createFormData(uri);
    return apiClient.post(`/driver-app/orders/${orderId}/proof-photo`, formData, {
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
  },

  /**
   * Upload recipient signature for an order
   * @param {number|string} orderId
   * @param {string} base64DataUrl - data:image/png;base64,... string
   * @param {function} [onProgress]
   */
  uploadOrderSignature: (orderId, base64DataUrl, onProgress) => {
    const formData = new FormData();
    formData.append('file', {
      uri: base64DataUrl,
      name: `signature_${orderId}_${Date.now()}.png`,
      type: 'image/png',
    });
    return apiClient.post(`/driver-app/orders/${orderId}/signature`, formData, {
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
  },

  // ─── Stop-Level POD ────────────────────────────

  /**
   * Upload proof photo for a specific delivery stop
   * @param {number|string} stopId
   * @param {string} uri - Local image file URI
   * @param {function} [onProgress]
   */
  uploadStopProofPhoto: (stopId, uri, onProgress) => {
    const formData = createFormData(uri);
    return apiClient.post(`/driver-app/stops/${stopId}/proof-photo`, formData, {
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
  },

  /**
   * Upload recipient signature for a specific delivery stop
   * @param {number|string} stopId
   * @param {string} base64DataUrl
   * @param {function} [onProgress]
   */
  uploadStopSignature: (stopId, base64DataUrl, onProgress) => {
    const formData = new FormData();
    formData.append('file', {
      uri: base64DataUrl,
      name: `signature_stop_${stopId}_${Date.now()}.png`,
      type: 'image/png',
    });
    return apiClient.post(`/driver-app/stops/${stopId}/signature`, formData, {
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
  },

  // ─── Avatar ────────────────────────────────────

  /**
   * Upload driver profile photo
   * @param {string} uri - Local image file URI
   * @param {function} [onProgress]
   */
  uploadAvatar: (uri, onProgress) => {
    const formData = createFormData(uri);
    return apiClient.post('/driver-app/profile/avatar', formData, {
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
  },

  /**
   * Get file download URL helper
   * @param {string} path - Relative file path
   * @returns {string}
   */
  getFileUrl: (path) => {
    const baseURL = apiClient.defaults.baseURL.replace(/\/api$/, '');
    // path from backend is like "/uploads/drivers/xxx.jpg" — serve directly
    if (path.startsWith('/uploads/')) {
      return `${baseURL}${path}`;
    }
    // Fallback for paths without /uploads/ prefix
    return `${baseURL}/uploads/${path}`;
  },
};

export default uploadsApi;
