/**
 * Trasealla Driver App — Typography System
 * Font: Mulish (Latin) + NotoSansArabic (Arabic)
 */

export const fontFamily = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  light: 'Poppins-Light',
  extraBold: 'Poppins-ExtraBold',
  black: 'Poppins-Black',
  arabic: 'NotoSansArabic-Regular',
  arabicMedium: 'NotoSansArabic-Medium',
  arabicSemiBold: 'NotoSansArabic-SemiBold',
};

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
};

export const lineHeight = {
  xs: 14,
  sm: 18,
  base: 20,
  md: 24,
  lg: 26,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
  '5xl': 48,
};

/**
 * Pre-composed heading & text styles
 * Usage: style={{ ...fonts.H1 }}
 */
export const fonts = {
  // ─── Headings ─────────────────────────────────────
  H1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
  },
  H2: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
  },
  H3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
  },
  H4: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },
  H5: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },

  // ─── Body ─────────────────────────────────────────
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },

  // ─── Labels ───────────────────────────────────────
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  labelLarge: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },

  // ─── Caption ──────────────────────────────────────
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },

  // ─── Button ───────────────────────────────────────
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  buttonLarge: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },

  // ─── Badge ────────────────────────────────────────
  badge: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ─── Tab Bar ──────────────────────────────────────
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },

  // ─── Reference to fontFamily for convenience ──────
  fontFamily,
};
