/**
 * Trasealla Driver App — Shadow Presets
 */

import {Platform} from 'react-native';

export const shadows = {
  /** Subtle card shadow — for order cards, stat cards */
  card: {
    shadowColor: '#266BC1',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  /** Medium elevated shadow — for modals, bottom sheets */
  elevated: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },

  /** Soft shadow — for inputs, inactive cards */
  soft: {
    shadowColor: '#266BC1',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  /** Strong shadow — for floating action buttons, overlays */
  strong: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 12,
  },

  /** Top shadow — for bottom tab bar */
  tabBar: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },

  /** No shadow — reset */
  none: {
    shadowColor: 'transparent',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

/**
 * Platform-aware shadow helper.
 * On Android, only elevation works. On iOS, shadow* properties work.
 * This helper ensures cross-platform consistency.
 */
export const applyShadow = (preset = 'card') => {
  const shadow = shadows[preset] || shadows.card;
  if (Platform.OS === 'android') {
    return {elevation: shadow.elevation};
  }
  return shadow;
};
