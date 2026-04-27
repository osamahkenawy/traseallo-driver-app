/**
 * StatsRow — 3 KPI cards (New / Active / Delivered) matching screenshot.
 * White surface, colored icon square + decorative illustration shape,
 * dominant number, label + caption, small CTA arrow.
 */

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {Zap, TrendingUp, Check, ChevronRight} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {D} from './dashboardTheme';

const AnimTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const StatCard = ({value, title, caption, Icon, accent, accentSoft, onPress, delay}) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));
  const onIn = () => { scale.value = withSpring(0.96, {damping: 12, stiffness: 220}); };
  const onOut = () => { scale.value = withSpring(1, {damping: 10, stiffness: 160}); };

  const Wrapper = onPress ? AnimTouchable : Animated.View;
  const wrapperProps = onPress
    ? {onPress, onPressIn: onIn, onPressOut: onOut, activeOpacity: 1}
    : {};

  return (
    <Wrapper
      style={[$.card, animStyle]}
      entering={FadeInDown.duration(420).delay(delay).springify().damping(16)}
      {...wrapperProps}>

      {/* Decorative illustration (stacked translucent shapes for 3D feel) */}
      <View style={$.illuWrap} pointerEvents="none">
        <View style={[$.illuShape1, {backgroundColor: accent}]} />
        <View style={[$.illuShape2, {backgroundColor: accentSoft}]} />
        <View style={[$.illuShape3, {backgroundColor: accent}]} />
      </View>

      {/* Top icon square */}
      <View style={[$.iconSq, {backgroundColor: accent}]}>
        <Icon size={18} color="#FFF" strokeWidth={2.6} />
      </View>

      {/* Number */}
      <Text style={[$.number, {color: accent}]}>{value}</Text>

      {/* Title + caption */}
      <View style={$.textWrap}>
        <Text style={$.title} numberOfLines={1}>{title}</Text>
        <Text style={$.caption} numberOfLines={1}>{caption}</Text>
      </View>

      {/* CTA arrow */}
      <View style={[$.cta, {backgroundColor: accent}]}>
        <ChevronRight size={14} color="#FFF" strokeWidth={2.5} />
      </View>
    </Wrapper>
  );
};

const StatsRow = ({
  assigned = 0,
  inProgress = 0,
  delivered = 0,
  onNewPress,
  onActivePress,
  onDeliveredPress,
  t: tProp,
}) => {
  const {t: tHook} = useTranslation();
  const t = tProp || tHook;
  return (
    <View style={$.row}>
      <StatCard
        value={assigned}
        title={t('dashboard.kpiNewTitle', 'New Orders')}
        caption={t('dashboard.kpiNewCaption', 'Received today')}
        Icon={Zap}
        accent={D.orange}
        accentSoft={D.orangeSoft}
        onPress={onNewPress}
        delay={0}
      />
      <View style={{width: 10}} />
      <StatCard
        value={inProgress}
        title={t('dashboard.kpiActiveTitle', 'Active Orders')}
        caption={t('dashboard.kpiActiveCaption', 'In progress')}
        Icon={TrendingUp}
        accent={D.primary}
        accentSoft={D.primarySoft}
        onPress={onActivePress}
        delay={80}
      />
      <View style={{width: 10}} />
      <StatCard
        value={delivered}
        title={t('dashboard.kpiDeliveredTitle', 'Delivered')}
        caption={t('dashboard.kpiDeliveredCaption', 'Completed')}
        Icon={Check}
        accent={D.green}
        accentSoft={D.greenSoft}
        onPress={onDeliveredPress}
        delay={160}
      />
    </View>
  );
};

const $ = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    backgroundColor: D.surface,
    borderRadius: 18,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
    minHeight: 150,
    ...Platform.select({
      ios: {shadowColor: '#0B1220', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.06, shadowRadius: 10},
      android: {elevation: 3},
    }),
  },
  iconSq: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  number: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    lineHeight: 32,
  },
  textWrap: {
    paddingRight: 26,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: D.text,
    marginTop: 2,
  },
  caption: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: D.textMuted,
    marginTop: 1,
  },
  cta: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Decorative shapes (faux-3D)
  illuWrap: {
    position: 'absolute',
    top: 6,
    right: -10,
    width: 70,
    height: 70,
  },
  illuShape1: {
    position: 'absolute',
    top: 8,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 8,
    opacity: 0.18,
    transform: [{rotate: '12deg'}],
  },
  illuShape2: {
    position: 'absolute',
    top: 22,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 12,
    opacity: 0.85,
  },
  illuShape3: {
    position: 'absolute',
    top: 30,
    right: 20,
    width: 20,
    height: 20,
    borderRadius: 6,
    opacity: 0.35,
    transform: [{rotate: '-10deg'}],
  },
});

export default React.memo(StatsRow);
