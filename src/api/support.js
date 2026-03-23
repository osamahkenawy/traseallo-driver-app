/**
 * Trasealla Driver App — Support & Help API
 * Endpoints: /driver-app/support/*, /driver-app/help
 */

import apiClient from './client';

const supportApi = {
  /**
   * Create a support ticket
   * @param {object} data - { subject, description?, category?, priority?, order_id? }
   * category: 'bug' | 'feature_request' | 'billing' | 'account' | 'technical' | 'other'
   * priority: 'low' | 'medium' | 'high' | 'critical'
   */
  createTicket: (data) =>
    apiClient.post('/driver-app/support/ticket', data),

  /**
   * Report an issue (quick report)
   * @param {object} data - { issue_type, description?, order_id?, lat?, lng? }
   * issue_type: 'vehicle_breakdown' | 'accident' | 'wrong_package' | 'app_bug' | 'safety_concern' | 'other'
   */
  reportIssue: (data) =>
    apiClient.post('/driver-app/support/report-issue', data),

  /**
   * List driver's own support tickets (paginated)
   * @param {object} [params] - { page?, limit?, status? }
   */
  getTickets: (params = {}) =>
    apiClient.get('/driver-app/support/tickets', {params: {page: 1, limit: 20, ...params}}),

  /**
   * Get ticket detail with replies
   * @param {number} id - Ticket ID
   */
  getTicketDetail: (id) =>
    apiClient.get(`/driver-app/support/tickets/${id}`),

  /**
   * Reply to a ticket
   * @param {number} id - Ticket ID
   * @param {object} data - { message }
   */
  replyToTicket: (id, data) =>
    apiClient.post(`/driver-app/support/tickets/${id}/reply`, data),

  /**
   * Get FAQ and help content
   * @returns {Promise} { categories: [{ title, faqs: [{ question, answer }] }] }
   */
  getHelp: () => apiClient.get('/driver-app/help'),
};

export default supportApi;
