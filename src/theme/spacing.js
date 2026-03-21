/**
 * Trasealla Driver App — Spacing System
 * 4px base grid
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
  giant: 64,
};

/**
 * Common layout padding/margin patterns
 */
export const layout = {
  screenPaddingH: spacing.lg,      // 16px horizontal padding for screen content
  screenPaddingV: spacing.xl,      // 20px vertical padding
  cardPadding: spacing.lg,         // 16px inner card padding
  cardGap: spacing.md,             // 12px gap between cards
  sectionGap: spacing.xl,         // 20px gap between sections
  inputHeight: 52,                 // Standard input height
  buttonHeight: 52,                // Standard button height
  buttonHeightSmall: 40,           // Small button height
  headerHeight: 56,                // Header/nav bar height
  tabBarHeight: 64,                // Bottom tab bar height
  bottomSheetHandle: 4,            // Bottom sheet handle height
  iconSize: 24,                    // Default icon size
  iconSizeSm: 20,                  // Small icon size
  iconSizeLg: 28,                  // Large icon size
  avatarSm: 36,                    // Small avatar
  avatarMd: 48,                    // Medium avatar
  avatarLg: 64,                    // Large avatar
  avatarXl: 96,                    // Extra large avatar (profile)
  statusBarLeftBorder: 4,          // Order card left status border width
  minTouchTarget: 48,              // Minimum touch target (accessibility)
};
