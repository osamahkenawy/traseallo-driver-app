/**
 * Traseallo Driver App — Image Assets Index
 * Central registry for all image assets with proper require() references
 */

export const images = {
  // ─── Splash & Launch ──────────────────────────────
  splash: require('./splash-screen.png'),

  // ─── Traseallo Logos ──────────────────────────────
  logoFullColored: require('./full_logo_240_80_colored.png'),
  logoFullWhite: require('./full_logo_24_80_white.png'),
  logoIcon: require('./logo-icon-colored.png'),
  logoFullColor2x: require('./logo-full-color-2x.png'),
  logoFullColor3x: require('./logo-full-color-3x.png'),
  logoBig: require('./logo_big_2000_2000_px.png'),
  logoBigOneLine: require('./logo_big_2000_2000_px_but_in_one_line.png'),
  logoBigWhite: require('./logo_big_white_2000_2000_px.png'),
  appIcon: require('./icon_big_1024_1024.png'),

  // ─── Trasealla (Platform) Logo ────────────────────
  traseallaLogo: require('./trasealla_logo.png'),

  // ─── Onboarding ───────────────────────────────────
  onboarding1: require('./onboarding-1.png'),

  // ─── Placeholders ─────────────────────────────────
  avatarPlaceholder: require('./avatar-placeholder.png'),
};

export default images;
