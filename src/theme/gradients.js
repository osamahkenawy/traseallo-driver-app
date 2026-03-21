/**
 * Trasealla Driver App — Gradient Definitions
 * For use with expo-linear-gradient / react-native-linear-gradient
 */

export const gradients = {
  /** Brand gradient — splash, onboarding, header overlays */
  brand: {
    colors: ['#15C7AE', '#244066'],
    start: {x: 0.5, y: 0},
    end: {x: 0.5, y: 1},
  },

  /** Primary CTA button gradient */
  button: {
    colors: ['#4E7AB5', '#244066'],
    start: {x: 0.5, y: 0},
    end: {x: 0.5, y: 1},
  },

  /** Premium/upgrade badge gradient */
  premium: {
    colors: ['#244066', '#6366F1'],
    start: {x: 0, y: 0},
    end: {x: 1, y: 1},
  },

  /** Success action gradient — deliver, confirm */
  success: {
    colors: ['#15C7AE', '#0EA693'],
    start: {x: 0, y: 0},
    end: {x: 1, y: 1},
  },

  /** Danger/failure gradient — fail, cancel */
  danger: {
    colors: ['#EB466D', '#D32F52'],
    start: {x: 0, y: 0},
    end: {x: 1, y: 1},
  },

  /** Header gradient (dark) — dashboard header */
  header: {
    colors: ['#4E7AB5', '#244066'],
    start: {x: 0, y: 0},
    end: {x: 0, y: 1},
  },

  /** Card accent gradient — stat card accent bar */
  cardAccent: {
    colors: ['#15C7AE', '#10A6BA'],
    start: {x: 0, y: 0},
    end: {x: 1, y: 0},
  },

  /** Skeleton shimmer gradient */
  skeleton: {
    colors: ['#E9ECEF', '#F8F9FA', '#E9ECEF'],
    start: {x: 0, y: 0.5},
    end: {x: 1, y: 0.5},
  },
};
