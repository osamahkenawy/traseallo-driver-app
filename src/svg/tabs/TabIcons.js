/**
 * Driver App SVG Icons — Dashboard Tab
 */

import React from 'react';
import Svg, {Path, Circle} from 'react-native-svg';
import {colors} from '../../theme';

export const DashboardTabSvg = ({focused, size = 24}) => {
  const color = focused ? colors.primary : colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.02 2.84L3.63 7.04c-.78.62-1.28 1.93-1.11 2.91l1.33 7.96c.24 1.42 1.6 2.57 3.04 2.57h11.22c1.43 0 2.8-1.16 3.04-2.57l1.33-7.96c.16-.98-.34-2.29-1.11-2.91l-5.39-4.2c-1.1-.86-2.88-.86-3.96 0z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 15.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const OrdersTabSvg = ({focused, size = 24}) => {
  const color = focused ? colors.primary : colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.17 7.44L12 12.55l8.77-5.08M12 21.61V12.54"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.93 2.48L4.59 5.45c-1.21.67-2.2 2.35-2.2 3.73v5.65c0 1.38.99 3.06 2.2 3.73l5.34 2.97c1.14.63 3.01.63 4.15 0l5.34-2.97c1.21-.67 2.2-2.35 2.2-3.73V9.18c0-1.38-.99-3.06-2.2-3.73l-5.34-2.97c-1.15-.64-3.01-.64-4.15 0z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const MapTabSvg = ({focused, size = 24}) => {
  const color = focused ? colors.primary : colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 13.43a3.12 3.12 0 100-6.24 3.12 3.12 0 000 6.24z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 01-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05z"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
};

export const NotificationsTabSvg = ({focused, size = 24}) => {
  const color = focused ? colors.primary : colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12.02 2.91c-3.31 0-6 2.69-6 6v2.89c0 .61-.26 1.54-.57 2.06L4.3 15.77c-.71 1.18-.22 2.49 1.08 2.93 4.31 1.44 8.96 1.44 13.27 0 1.21-.4 1.74-1.83 1.08-2.93l-1.15-1.91c-.3-.52-.56-1.45-.56-2.06V8.91c0-3.3-2.7-6-6-6z"
        stroke={color}
        strokeWidth={1.5}
        strokeMiterlimit={10}
        strokeLinecap="round"
      />
      <Path
        d="M13.87 3.2a6.754 6.754 0 00-3.7 0c.29-.74 1.01-1.26 1.85-1.26.84 0 1.56.52 1.85 1.26z"
        stroke={color}
        strokeWidth={1.5}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15.02 19.06c0 1.65-1.35 3-3 3-.82 0-1.58-.34-2.12-.88a3.01 3.01 0 01-.88-2.12"
        stroke={color}
        strokeWidth={1.5}
        strokeMiterlimit={10}
      />
    </Svg>
  );
};

export const ProfileTabSvg = ({focused, size = 24}) => {
  const color = focused ? colors.primary : colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12.12 12.78a.963.963 0 00-.24 0 3.27 3.27 0 01-3.16-3.27c0-1.81 1.46-3.28 3.28-3.28a3.276 3.276 0 01.12 6.55zM18.74 19.38A9.934 9.934 0 0112 22c-2.6 0-4.96-.99-6.74-2.62.1-.94.7-1.86 1.77-2.58 2.74-1.82 7.22-1.82 9.94 0 1.07.72 1.67 1.64 1.77 2.58z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
