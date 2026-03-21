/**
 * Trasealla Driver App — Color System
 * Extracted from trasealloLandingPage variables.scss
 */

export const colors = {
  // ─── Brand ────────────────────────────────────────
  primary: '#244066',
  primaryLight: '#4E7AB5',
  secondary: '#f94c29',
  accent: '#f94c29',
  success: '#15C7AE',
  info: '#10A6BA',
  warning: '#F9AD28',
  danger: '#EB466D',
  orange: '#D88D0D',
  purple: '#9261C6',

  // ─── Text ─────────────────────────────────────────
  textPrimary: '#022334',
  textSecondary: '#495057',
  textMuted: '#787A7D',
  textLight: '#89A2B5',
  textDisabled: '#ADB5BD',
  textWhite: '#FFFFFF',

  // ─── Backgrounds ──────────────────────────────────
  bgScreen: '#F8FBFF',
  bgCard: '#FFFFFF',
  bgInput: '#EFEFEF',
  bgSoftBlue: '#E6EFFE',
  bgGray: '#F8F9FA',
  bgBody: '#F5F5F5',

  // ─── Borders ──────────────────────────────────────
  border: '#E9ECEF',
  borderLight: '#EFEFEF',
  borderDark: '#D0D5DD',

  // ─── Status (Order States) ────────────────────────
  statusPending: '#F9AD28',
  statusConfirmed: '#10A6BA',
  statusAssigned: '#244066',
  statusPickedUp: '#10A6BA',
  statusInTransit: '#15C7AE',
  statusDelivered: '#15C7AE',
  statusFailed: '#EB466D',
  statusReturned: '#D88D0D',
  statusCancelled: '#787A7D',

  // ─── Gray Scale ───────────────────────────────────
  gray100: '#F8F9FA',
  gray200: '#E9ECEF',
  gray300: '#EFEFEF',
  gray400: '#E6EFFE',
  gray500: '#ADB5BD',
  gray600: '#89A2B5',
  gray700: '#495057',
  gray800: '#2D2D2D',
  gray900: '#1D262D',

  // ─── Misc ─────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  dark: '#022334',
  overlay: 'rgba(36, 42, 53, 0.7)',
  shadowColor: 'rgba(38, 107, 193, 0.08)',
  transparent: 'transparent',

  // ─── Semantic Backgrounds ─────────────────────────
  dangerBg: 'rgba(235, 70, 109, 0.1)',
  successBg: 'rgba(21, 199, 174, 0.1)',
  warningBg: 'rgba(249, 173, 40, 0.1)',
  infoBg: 'rgba(16, 166, 186, 0.1)',
  bgMuted: '#F1F3F5',
};

/**
 * Get the color for an order status string
 * @param {string} status - Order status
 * @returns {string} Hex color
 */
export const getStatusColor = (status) => {
  const map = {
    pending: colors.statusPending,
    confirmed: colors.statusConfirmed,
    assigned: colors.statusAssigned,
    picked_up: colors.statusPickedUp,
    in_transit: colors.statusInTransit,
    delivered: colors.statusDelivered,
    failed: colors.statusFailed,
    returned: colors.statusReturned,
    cancelled: colors.statusCancelled,
  };
  return map[status] || colors.textMuted;
};

/**
 * Get a translucent version of a status color (for badge backgrounds)
 * @param {string} status - Order status
 * @param {number} opacity - 0 to 1
 * @returns {string} rgba color
 */
export const getStatusBgColor = (status, opacity = 0.12) => {
  const hex = getStatusColor(status);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// ─── Dark Mode Colors (Phase 9) ──────────────────────
export const darkColors = {
  ...colors,
  bgScreen: '#1D262D',
  bgCard: '#2D2D2D',
  bgInput: '#3A3A3A',
  bgGray: '#2D2D2D',
  bgBody: '#1D262D',
  textPrimary: '#E9ECEF',
  textSecondary: '#ADB5BD',
  textMuted: '#89A2B5',
  border: '#3A3A3A',
  borderLight: '#2D2D2D',
};
