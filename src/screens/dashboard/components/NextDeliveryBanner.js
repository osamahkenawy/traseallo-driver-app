/**
 * NextDeliveryBanner — Full-width gradient banner highlighting next delivery.
 * Calendar icon (left), title + count (center), arrow circle (right).
 * Decorative map texture overlay using react-native-svg.
 */

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Circle, Defs, LinearGradient as SvgGrad, Stop} from 'react-native-svg';
import {Calendar, ChevronRight} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {D} from './dashboardTheme';

/* ─── SVG decorative map texture (subtle grid + curved route) ─── */
const MapTexture = () => (
  <Svg
    width="220"
    height="120"
    viewBox="0 0 220 120"
    style={$.svg}
    pointerEvents="none">
    <Defs>
      <SvgGrad id="rg" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
        <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
      </SvgGrad>
    </Defs>
    {/* Faint grid lines */}
    {[20, 50, 80, 110].map(y => (
      <Path key={`h${y}`} d={`M0 ${y} H220`} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
    ))}
    {[30, 80, 130, 180].map(x => (
      <Path key={`v${x}`} d={`M${x} 0 V120`} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
    ))}
    {/* Wavy route path */}
    <Path
      d="M10 95 C 50 95, 60 40, 110 50 S 190 40, 210 15"
      stroke="url(#rg)"
      strokeWidth="2.2"
      fill="none"
      strokeDasharray="0"
      strokeLinecap="round"
    />
    <Circle cx="210" cy="15" r="4" fill="#FFFFFF" />
  </Svg>
);

const NextDeliveryBanner = ({count = 1, onPress, t: tProp}) => {
  const {t: tHook} = useTranslation();
  const t = tProp || tHook;

  return (
    <Animated.View entering={FadeInDown.springify().damping(16).stiffness(120).delay(180)}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={$.wrap}>
        <LinearGradient
          colors={['#16294A', '#244066']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={$.card}>
          <MapTexture />

          {/* Left icon circle */}
          <View style={$.iconCircle}>
            <Calendar size={20} color={D.primary} strokeWidth={2.4} />
          </View>

          {/* Text */}
          <View style={{flex: 1, marginLeft: 12}}>
            <Text style={$.title}>{t('dashboard.nextDelivery', 'Next Delivery')}</Text>
            <Text style={$.subtitle}>
              {count === 1
                ? t('dashboard.nextDeliveryOne', '1 order ready for delivery')
                : t('dashboard.nextDeliveryMany', '{{count}} orders ready for delivery', {count})}
            </Text>
          </View>

          {/* Arrow */}
          <View style={$.arrowCircle}>
            <ChevronRight size={20} color={D.primary} strokeWidth={2.6} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const $ = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {shadowColor: D.primary, shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.25, shadowRadius: 16},
      android: {elevation: 6},
    }),
  },
  svg: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default React.memo(NextDeliveryBanner);
