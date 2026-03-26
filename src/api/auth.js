/**
 * Trasealla Driver App — Auth & Profile API
 * Endpoints: /driver-app/login, /driver-app/logout, /driver-app/profile, etc.
 */

import apiClient from './client';

const authApi = {
  // ─── Authentication ─────────────────────────────

  /**
   * Login with username, email, or phone + password
   * @param {string} username - username / email / phone
   * @param {string} password
   * @returns {Promise} { token, user, tenant }
   */
  login: (username, password) =>
    apiClient.post('/auth/login', {username, password}),

  /**
   * Logout — sets driver offline, deactivates push tokens
   */
  logout: () => apiClient.post('/driver-app/logout'),

  /**
   * Validate current session (uses profile endpoint)
   * @returns {Promise} { user, tenant }
   */
  getSession: () => apiClient.get('/driver-app/profile'),

  // ─── Password Management ───────────────────────

  /**
   * Change password (authenticated)
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  changePassword: (currentPassword, newPassword) =>
    apiClient.post('/driver-app/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  /**
   * Request password reset (public — sends OTP)
   * @param {string} identifier - username, email, or phone
   */
  forgotPassword: (identifier) =>
    apiClient.post('/driver-app/forgot-password', {identifier}),

  /**
   * Reset password using OTP
   * @param {string} identifier - same as forgot-password
   * @param {string} otp - 6-digit code
   * @param {string} newPassword
   */
  resetPassword: (identifier, otp, newPassword) =>
    apiClient.post('/driver-app/reset-password', {
      identifier,
      otp,
      new_password: newPassword,
    }),

  // ─── Profile ───────────────────────────────────

  /**
   * Get tenant branding (public — no auth needed)
   * @param {string} slug - Tenant slug
   * @returns {Promise} { name, logo_url, logo_url_white }
   */
  getBranding: (slug) =>
    apiClient.get('/auth/branding', {params: {slug}}),

  /**
   * Health check — verify API is running (no auth)
   * @returns {Promise}
   */
  healthCheck: () => apiClient.get('/health'),

  /**
   * Get driver's full profile
   * @returns {Promise} { name, phone, email, photo, vehicle, stats, zone, join_date, status }
   */
  getProfile: () => apiClient.get('/driver-app/profile'),

  /**
   * Update driver profile fields (partial update)
   * @param {object} data - { vehicle_type?, vehicle_plate?, vehicle_model?, vehicle_color?, phone?, email? }
   */
  updateProfile: (data) => apiClient.put('/driver-app/profile', data),

  /**
   * Get driver's ratings, distribution, reviews, and performance stats
   */
  getRatings: () => apiClient.get('/driver-app/ratings'),
};

export default authApi;
