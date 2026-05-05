/**
 * Trasealla Driver App — Orders API
 * Endpoints: /driver-app/orders, /driver-app/orders/:id, etc.
 */

import apiClient, {requireId} from './client';

const ordersApi = {
  /**
   * List driver's assigned orders (paginated, filterable, searchable, sortable)
   * @param {object} [params] - { status, page, limit, search, sort, has_cod, payment_method, priority }
   */
  getOrders: (params = {}) =>
    apiClient.get('/driver-app/orders', {params: {status: 'all', page: 1, limit: 20, ...params}}),

  /**
   * Get full order detail by ID
   * @param {number|string} orderId
   */
  getOrderDetail: (orderId) =>
    apiClient.get(`/driver-app/orders/${requireId(orderId, 'orderId')}`),

  /**
   * Accept an assigned order
   * @param {number|string} orderId
   */
  acceptOrder: (orderId) =>
    apiClient.post(`/driver-app/orders/${requireId(orderId, 'orderId')}/accept`),

  /**
   * Reject an assigned order
   * @param {number|string} orderId
   * @param {string} reason
   */
  rejectOrder: (orderId, reason) =>
    apiClient.post(`/driver-app/orders/${requireId(orderId, 'orderId')}/reject`, {reason}),

  /**
   * Start delivery — transition order to in_transit
   * @param {number|string} orderId
   * @param {object} [data] - { lat?, lng? }
   */
  startDelivery: (orderId, data = {}) =>
    apiClient.post(`/driver-app/orders/${requireId(orderId, 'orderId')}/start-delivery`, data),

  /**
   * Mark order as delivered (single-delivery orders)
   * @param {number|string} orderId
   * @param {object} [data] - { signature_url?, proof_photo_url?, cod_collected?, notes?, lat?, lng? }
   */
  deliverOrder: (orderId, data = {}) =>
    apiClient.post(`/driver-app/orders/${requireId(orderId, 'orderId')}/deliver`, data),

  /**
   * Mark order as failed
   * @param {number|string} orderId
   * @param {object} data - { reason, lat?, lng? }
   */
  failOrder: (orderId, data) =>
    apiClient.post(`/driver-app/orders/${requireId(orderId, 'orderId')}/fail`, data),

  /**
   * Mark order for return to sender
   * @param {number|string} orderId
   * @param {object} [data] - { reason?, lat?, lng? }
   */
  returnOrder: (orderId, data = {}) =>
    apiClient.post(`/driver-app/orders/${requireId(orderId, 'orderId')}/return`, data),

  /**
   * Get delivery stops for a multi-stop order
   * @param {number|string} orderId
   */
  getStops: (orderId) =>
    apiClient.get(`/driver-app/orders/${requireId(orderId, 'orderId')}/stops`),
};

export default ordersApi;
