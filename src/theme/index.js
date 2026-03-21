/**
 * Trasealla Driver App — Unified Theme Export
 *
 * Usage:
 *   import { colors, fonts, spacing, shadows } from '../theme';
 *   // or
 *   import theme from '../theme';
 *   // theme.colors.primary, theme.fonts.H2, etc.
 */

import {Dimensions} from 'react-native';
import {colors, darkColors, getStatusColor, getStatusBgColor} from './colors';
import {fonts, fontFamily, fontSize, lineHeight} from './fonts';
import {spacing, layout} from './spacing';
import {shadows, applyShadow} from './shadows';
import {gradients} from './gradients';
import {borderRadius} from './borderRadius';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const theme = {
  colors,
  darkColors,
  fonts,
  fontFamily,
  fontSize,
  lineHeight,
  spacing,
  layout,
  shadows,
  gradients,
  borderRadius,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};

export {
  colors,
  darkColors,
  getStatusColor,
  getStatusBgColor,
  fonts,
  fontFamily,
  fontSize,
  lineHeight,
  spacing,
  layout,
  shadows,
  applyShadow,
  gradients,
  borderRadius,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};

export default theme;
