/**
 * Driver App SVG Icons — Driver-specific icons
 */

import React from 'react';
import Svg, {Path, Circle, Rect, G} from 'react-native-svg';
import {colors} from '../../theme';

// ─── Package / Box Icon ─────────────────────────────
export const PackageSvg = ({size = 24, color = colors.textPrimary}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3.17 7.44L12 12.55l8.77-5.08M12 21.61V12.54"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M9.93 2.48L4.59 5.45c-1.21.67-2.2 2.35-2.2 3.73v5.65c0 1.38.99 3.06 2.2 3.73l5.34 2.97c1.14.63 3.01.63 4.15 0l5.34-2.97c1.21-.67 2.2-2.35 2.2-3.73V9.18c0-1.38-.99-3.06-2.2-3.73l-5.34-2.97c-1.15-.64-3.01-.64-4.15 0z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

// ─── Truck / Delivery Icon ──────────────────────────
export const TruckSvg = ({size = 24, color = colors.textPrimary}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 2H2v13h13V2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 8h4l3 3v4h-7V8z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={5.5} cy={18.5} r={2.5} stroke={color} strokeWidth={1.5} />
    <Circle cx={18.5} cy={18.5} r={2.5} stroke={color} strokeWidth={1.5} />
  </Svg>
);

// ─── Navigation Arrow ───────────────────────────────
export const NavigationSvg = ({size = 24, color = colors.primary}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12l14-9-4 9 4 9L5 12z"
      fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round"
    />
  </Svg>
);

// ─── Phone Call ─────────────────────────────────────
export const PhoneCallSvg = ({size = 24, color = colors.primary}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21.97 18.33c0 .36-.08.73-.25 1.09-.17.36-.39.7-.68 1.02-.49.54-1.03.93-1.64 1.18-.6.25-1.25.38-1.95.38-1.02 0-2.11-.24-3.26-.73s-2.3-1.15-3.44-1.98a28.75 28.75 0 01-3.28-2.8 28.414 28.414 0 01-2.79-3.27c-.82-1.14-1.48-2.28-1.96-3.41C2.24 8.67 2 7.58 2 6.54c0-.68.12-1.33.36-1.93.24-.61.62-1.17 1.15-1.67C4.15 2.31 4.85 2 5.59 2c.28 0 .56.06.81.18.26.12.49.3.67.56l2.32 3.27c.18.25.31.48.4.7.09.21.14.42.14.61 0 .24-.07.48-.21.71-.13.23-.32.47-.56.71l-.76.79c-.11.11-.16.24-.16.4 0 .08.01.15.04.23.04.08.07.14.09.2.18.33.49.76.93 1.28.45.52.93 1.05 1.45 1.58.54.53 1.06 1.02 1.59 1.47.52.44.95.74 1.29.92.05.02.11.05.18.08.08.04.16.05.25.05.17 0 .3-.06.41-.17l.76-.75c.25-.25.49-.44.72-.56.23-.14.46-.21.71-.21.19 0 .4.04.61.13.22.09.45.22.7.39l3.31 2.35c.26.18.44.39.55.64.1.25.16.5.16.78z"
      stroke={color} strokeWidth={1.5} strokeMiterlimit={10}
    />
  </Svg>
);

// ─── Scanner / Barcode Icon ─────────────────────────
export const ScannerSvg = ({size = 24, color = colors.textPrimary}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 9V6a4 4 0 014-4h3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 2h3a4 4 0 014 4v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 15v3a4 4 0 01-4 4h-3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 22H6a4 4 0 01-4-4v-3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 12h10" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ─── Camera Icon ────────────────────────────────────
export const CameraIconSvg = ({size = 24, color = colors.textPrimary}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6.76 22h10.48C19.6 22 21 20.61 21 18.24V9.76C21 7.39 19.6 6 17.24 6h-1.01c-.72 0-1.4-.37-1.79-.99l-.72-1.08a2.488 2.488 0 00-3.44 0l-.72 1.08c-.39.62-1.07.99-1.79.99H6.76C4.39 6 3 7.39 3 9.76v8.48C3 20.61 4.39 22 6.76 22z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
    <Circle cx={12} cy={13.5} r={3.5} stroke={color} strokeWidth={1.5} />
  </Svg>
);

// ─── Wallet / Money Icon ────────────────────────────
export const WalletSvg = ({size = 24, color = colors.orange}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 12v5c0 3-2 5-5 5H7c-3 0-5-2-5-5v-5c0-2.72 1.64-4.62 4.19-4.94.24-.04.49-.06.81-.06h10c.26 0 .51.01.75.05C20.33 7.35 22 9.26 22 12z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M17.75 7.05c-.24-.04-.49-.05-.75-.05H7c-.32 0-.57.02-.81.06.14-.28.34-.54.57-.77l3.35-3.35a3.525 3.525 0 014.96 0l1.75 1.77c.64.63 1.02 1.43 1.12 2.29.01.02.01.04-.14.05z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path d="M22 12.5H19c-1.1 0-2 .9-2 2s.9 2 2 2h3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── COD / Cash Icon ────────────────────────────────
export const CodSvg = ({size = 24, color = colors.orange}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Online Dot ─────────────────────────────────────
export const OnlineDotSvg = ({size = 12}) => (
  <Svg width={size} height={size} viewBox="0 0 12 12">
    <Circle cx={6} cy={6} r={6} fill={colors.success} />
    <Circle cx={6} cy={6} r={3} fill={colors.white} opacity={0.4} />
  </Svg>
);

// ─── Offline Dot ────────────────────────────────────
export const OfflineDotSvg = ({size = 12}) => (
  <Svg width={size} height={size} viewBox="0 0 12 12">
    <Circle cx={6} cy={6} r={6} fill={colors.danger} />
    <Circle cx={6} cy={6} r={3} fill={colors.white} opacity={0.4} />
  </Svg>
);

// ─── Checkmark / Delivery Confirm ───────────────────
export const CheckmarkCircleSvg = ({size = 24, color = colors.success}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7.75 12l2.83 2.83 5.67-5.66" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Failed / X Circle ──────────────────────────────
export const FailedCircleSvg = ({size = 24, color = colors.danger}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9.17 14.83l5.66-5.66M14.83 14.83L9.17 9.17" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Return Arrow ───────────────────────────────────
export const ReturnSvg = ({size = 24, color = colors.orange}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9.57 5.93L3.5 12l6.07 6.07M20.5 12H3.67" stroke={color} strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Star / Rating ──────────────────────────────────
export const StarSvg = ({size = 24, color = colors.warning, filled = false}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <Path
      d="M13.73 3.51l1.76 3.52c.24.49.88.96 1.42 1.05l3.19.53c2.04.34 2.52 1.82 1.05 3.28l-2.48 2.48c-.42.42-.65 1.23-.52 1.81l.71 3.07c.56 2.43-.73 3.37-2.88 2.1l-2.99-1.77c-.54-.32-1.43-.32-1.98 0l-2.99 1.77c-2.14 1.27-3.44.32-2.88-2.1l.71-3.07c.13-.58-.1-1.39-.52-1.81L2.85 11.9c-1.46-1.46-.99-2.94 1.05-3.28l3.19-.53c.53-.09 1.17-.56 1.41-1.05l1.76-3.52c.96-1.91 2.52-1.91 3.47-.01z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

// ─── Settings Gear ──────────────────────────────────
export const SettingsGearSvg = ({size = 24, color = colors.textPrimary}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
      stroke={color} strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M2 12.88v-1.76c0-1.04.85-1.9 1.9-1.9 1.81 0 2.55-1.28 1.64-2.85-.52-.9-.21-2.07.7-2.59l1.73-.99c.79-.47 1.81-.19 2.28.6l.11.19c.9 1.57 2.38 1.57 3.29 0l.11-.19c.47-.79 1.49-1.07 2.28-.6l1.73.99c.91.52 1.22 1.69.7 2.59-.91 1.57-.17 2.85 1.64 2.85 1.04 0 1.9.85 1.9 1.9v1.76c0 1.04-.85 1.9-1.9 1.9-1.81 0-2.55 1.28-1.64 2.85.52.91.21 2.07-.7 2.59l-1.73.99c-.79.47-1.81.19-2.28-.6l-.11-.19c-.9-1.57-2.38-1.57-3.29 0l-.11.19c-.47.79-1.49 1.07-2.28.6l-1.73-.99a1.9 1.9 0 01-.7-2.59c.91-1.57.17-2.85-1.64-2.85-1.05 0-1.9-.86-1.9-1.9z"
      stroke={color} strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

// ─── Logout ─────────────────────────────────────────
export const LogoutSvg = ({size = 24, color = colors.danger}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8.9 7.56c.31-3.6 2.16-5.07 6.21-5.07h.13c4.47 0 6.26 1.79 6.26 6.26v6.52c0 4.47-1.79 6.26-6.26 6.26h-.13c-4.02 0-5.87-1.45-6.2-4.99" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 12H3.62M5.85 8.65L2.5 12l3.35 3.35" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Support / Headset ──────────────────────────────
export const SupportSvg = ({size = 24, color = colors.primary}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 18.86h-.76c-.8 0-1.56.31-2.12.87L13.06 21.8c-.58.59-1.53.59-2.12 0l-2.06-2.07c-.56-.56-1.33-.87-2.12-.87H6c-1.66 0-3-1.33-3-2.97V4.98c0-1.64 1.34-2.97 3-2.97h12c1.66 0 3 1.33 3 2.97v11.01c0 1.63-1.34 2.87-3 2.87z" stroke={color} strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 11.36v-.21c0-.68.42-1.04.84-1.33.41-.28.82-.64.82-1.3 0-.92-.74-1.66-1.66-1.66-.92 0-1.66.74-1.66 1.66M11.995 13.75h.009" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Chevron Right ──────────────────────────────────
export const ChevronRightSvg = ({size = 24, color = colors.textMuted}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8.91 19.92l6.52-6.52c.77-.77.77-2.03 0-2.8L8.91 4.08" stroke={color} strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Back Arrow ─────────────────────────────────────
export const BackArrowSvg = ({size = 24, color = colors.textPrimary}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 19.92L8.48 13.4c-.77-.77-.77-2.03 0-2.8L15 4.08" stroke={color} strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Copy Icon ──────────────────────────────────────
export const CopyIconSvg = ({size = 20, color = colors.textMuted}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M16 12.9v4.2c0 3.5-1.4 4.9-4.9 4.9H6.9C3.4 22 2 20.6 2 17.1v-4.2C2 9.4 3.4 8 6.9 8h4.2c3.5 0 4.9 1.4 4.9 4.9z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 6.9v4.2c0 3.5-1.4 4.9-4.9 4.9H16v-3.1C16 9.4 14.6 8 11.1 8H8V6.9C8 3.4 9.4 2 12.9 2h4.2C20.6 2 22 3.4 22 6.9z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Clock / Timer Icon ─────────────────────────────
export const ClockSvg = ({size = 20, color = colors.textMuted}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15.71 15.18l-3.1-1.85c-.54-.32-.98-1.09-.98-1.72V7.51" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
