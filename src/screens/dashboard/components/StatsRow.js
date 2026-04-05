/**
 * StatsRow — Premium glassmorphic stat cards
 * Bold number overlay, floating icon, accent glow ring.
 */

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Animated, {
  FadeIn,
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

const StatCard = ({value, label, icon: Icon, accent, bgTint, onPress, delay = 0}) => {
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
      style={[$.card, {backgroundColor: bgTint}, animStyle]}
      entering={FadeInDown.duration(400).delay(delay).springify().damping(16)}
      {...wrapperProps}>

      {/* Background glow circle */}
      <View style={[$.bgGlow, {backgroundColor: accent + '10'}]} />

      {/* Floating icon with glow ring */}
      <View style={[$.iconRing, {borderColor: accent + '25'}]}>
        <View style={[$.iconFill, {backgroundColor: accent}]}>
          <Icon size={16} color="#FFF" strokeWidth={2.5} />
        </View>
      </View>

      {/* Big number */}
      <Text style={[$.number, {color: accent}]}>{value}</Text>

      {/* Label */}
      <Text style={$.label}>{label}</Text>

      {/* Bottom accent bar */}
      <View style={[$.bottomBar, {backgroundColor: accent}]} />
    </Wrapper>
  );
};

const StatsRow = ({assigned = 0, inProgress = 0, delivered = 0, onNewPress, onActivePress, onDeliveredPress, t}) => (
  <View style={$.row}>
    <StatCard
      value={assigned}
      label={t('dashboard.newOrders', 'New')}
      icon={Zap}
      accent={colors.warning}
      bgTint={colors.warningBg}
      onPress={onNewPress}
      delay={0}
    />
    <View style={{width: 10}} />
    <StatCard
      value={inProgress}
      label={t('dashboard.inProgress', 'Active')}
      icon={TrendingUp}
      accent={colors.info}
      bgTint={colors.infoBg}
      onPress={onActivePress}
      delay={80}
    />
    <View style={{width: 10}} />
    <StatCard
      value={delivered}
      label={t('dashboard.delivered', 'Delivered')}
      icon={CheckCheck}
      accent={colors.success}
      bgTint={colors.successBg}
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
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  bgGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconFill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    lineHeight: 36,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: 2,
    opacity: 0.4,
  },
});

export default React.memo(StatsRow);
