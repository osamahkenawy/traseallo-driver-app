/**
 * StatsRow — Vibrant stat cards with solid accent backgrounds
 */

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {Zap, TrendingUp, CheckCheck} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {spacing} from '../../../theme/spacing';

const AnimTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const StatCard = ({value, label, icon: Icon, bg, bgDark, onPress, delay = 0}) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));

  const onIn = () => { scale.value = withSpring(0.94, {damping: 12, stiffness: 200}); };
  const onOut = () => { scale.value = withSpring(1, {damping: 10, stiffness: 150}); };

  const Wrapper = onPress ? AnimTouchable : Animated.View;
  const wrapperProps = onPress
    ? {onPress, onPressIn: onIn, onPressOut: onOut, activeOpacity: 1}
    : {};

  return (
    <Wrapper
      style={[$.card, {backgroundColor: bg}, animStyle]}
      entering={FadeInDown.duration(400).delay(delay).springify().damping(16)}
      {...wrapperProps}>

      {/* Decorative circles */}
      <View style={[$.decoCircleLg, {backgroundColor: bgDark}]} />
      <View style={[$.decoCircleSm, {backgroundColor: bgDark}]} />

      {/* Icon */}
      <View style={$.iconWrap}>
        <Icon size={20} color="#FFF" strokeWidth={2.5} />
      </View>

      {/* Number */}
      <Text style={$.number}>{value}</Text>

      {/* Label */}
      <Text style={$.label}>{label}</Text>
    </Wrapper>
  );
};

const StatsRow = ({assigned = 0, inProgress = 0, delivered = 0, onNewPress, onActivePress, onDeliveredPress, t}) => (
  <View style={$.row}>
    <StatCard
      value={assigned}
      label={t('dashboard.newOrders', 'New')}
      icon={Zap}
      bg="#F94C29"
      bgDark="rgba(255,255,255,0.15)"
      onPress={onNewPress}
      delay={0}
    />
    <View style={{width: 12}} />
    <StatCard
      value={inProgress}
      label={t('dashboard.inProgress', 'Active')}
      icon={TrendingUp}
      bg="#0EA5E9"
      bgDark="rgba(255,255,255,0.15)"
      onPress={onActivePress}
      delay={80}
    />
    <View style={{width: 12}} />
    <StatCard
      value={delivered}
      label={t('dashboard.delivered', 'Delivered')}
      icon={CheckCheck}
      bg="#10B981"
      bgDark="rgba(255,255,255,0.15)"
      onPress={onDeliveredPress}
      delay={160}
    />
  </View>
);

const $ = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    paddingTop: 16,
    paddingBottom: 14,
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.15,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  decoCircleLg: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  decoCircleSm: {
    position: 'absolute',
    bottom: -12,
    left: -12,
    width: 45,
    height: 45,
    borderRadius: 23,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  number: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    color: '#FFFFFF',
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default React.memo(StatsRow);
