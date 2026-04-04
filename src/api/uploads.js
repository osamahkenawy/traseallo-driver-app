/**
 * Trasealla Driver App — Proof of Delivery / Uploads API
 * Endpoints: POST /driver-app/orders/:id/proof-photo (file upload)
 *            POST /driver-app/orders/:id/signature (base64 or file)
 *            POST /uploads/drivers/:id/photo (avatar)
 */

import apiClient from './client';

/**
 * Create a FormData object from a local file URI with optional metadata
 * @param {string} uri - Local file URI
 * @param {string} fieldName - Form field name (default: 'file')
 * @param {Object} [meta] - Extra fields to attach (photo_type, caption, lat, lng)
 * @returns {FormData}
 */
const createFormData = (uri, fieldName = 'file', meta) => {
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

  if (meta) {
    if (meta.photo_type) formData.append('photo_type', meta.photo_type);
    if (meta.caption) formData.append('caption', meta.caption);
    if (meta.lat != null) formData.append('lat', String(meta.lat));
    if (meta.lng != null) formData.append('lng', String(meta.lng));
  }

  return formData;
};

const uploadsApi = {
  // ─── Order-Level POD ───────────────────────────

  /**
   * Upload proof-of-delivery photo for an order (multi-photo)
   * @param {number|string} orderId
   * @param {string} uri - Local image file URI
   * @param {Object} [meta] - {photo_type, caption, lat, lng}
   * @param {function} [onProgress]
   */
  uploadOrderProofPhoto: (orderId, uri, meta, onProgress) => {
    // Support old signature: (orderId, uri, onProgress)
    if (typeof meta === 'function') {
      onProgress = meta;
      meta = undefined;
    }
    const formData = createFormData(uri, 'file', meta);
    return apiClient.post(`/driver-app/orders/${orderId}/proof-photo`, formData, {
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
  },

  /**
   * Get all photos for an order
   * @param {number|string} orderId
   */
  getOrderPhotos: (orderId) =>
    apiClient.get(`/driver-app/orders/${orderId}/photos`),

  /**
   * Delete a proof photo
   * @param {number|string} photoId
   */
  deletePhoto: (photoId) =>
    apiClient.delete(`/uploads/photos/${photoId}`),

  /**
   * Upload recipient signature for an order
   * @param {number|string} orderId
   * @param {string} base64DataUrl - data:image/png;base64,... string
   * @param {function} [onProgress]
   */
  uploadOrderSignature: async (orderId, base64DataUrl) => {
    // Send signature as base64 JSON to the driver-app signature endpoint
    return apiClient.post(`/driver-app/orders/${orderId}/signature`, {
      signature: base64DataUrl,
      photo_type: 'signature',
      filename: `signature_${orderId}_${Date.now()}.png`,
    });
  },

  // ─── Stop-Level POD ────────────────────────────

  /**
   * Upload proof photo for a specific delivery stop (multi-photo)
   * @param {number|string} stopId
   * @param {string} uri - Local image file URI
   * @param {Object} [meta] - {photo_type, caption, lat, lng}
   * @param {function} [onProgress]
   */
  uploadStopProofPhoto: (stopId, uri, meta, onProgress) => {
    if (typeof meta === 'function') {
      onProgress = meta;
      meta = undefined;
    }
    const formData = createFormData(uri, 'file', meta);
    return apiClient.post(`/driver-app/stops/${stopId}/proof-photo`, formData, {
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
  },

  /**
   * Get all photos for a stop
   * @param {number|string} stopId
   */
  getStopPhotos: (stopId) =>
    apiClient.get(`/driver-app/stops/${stopId}/photos`),

  /**
   * Upload recipient signature for a specific delivery stop
   * @param {number|string} stopId
   * @param {string} base64DataUrl
   * @param {function} [onProgress]
   */
  uploadStopSignature: async (stopId, base64DataUrl) => {
    return apiClient.post(`/driver-app/stops/${stopId}/signature`, {
      signature: base64DataUrl,
      photo_type: 'signature',
      filename: `signature_stop_${stopId}_${Date.now()}.png`,
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
    return apiClient.post('/uploads/drivers/avatar', formData, {
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
    // S3 URLs are already absolute — return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const baseURL = apiClient.defaults.baseURL.replace(/\/api$/, '');
    // S3 proxy paths: /api/s3-file/... — serve via backend
    if (path.startsWith('/api/')) {
      return `${baseURL}${path}`;
    }
    // path from backend is like "/uploads/drivers/xxx.jpg" — serve directly
    if (path.startsWith('/uploads/')) {
      return `${baseURL}${path}`;
    }
    // Fallback for paths without /uploads/ prefix
    return `${baseURL}/uploads/${path}`;
  },
};

export default uploadsApi;
