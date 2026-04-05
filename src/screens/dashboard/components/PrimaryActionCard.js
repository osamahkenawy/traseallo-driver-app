/**
 * PrimaryActionCard — Premium contextual CTA
 * Solid-colored card with icon, title, subtitle, and chevron arrow.
 * Strong visual impact — feels like THE primary action.
 */

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Navigation, Play, WifiOff, ChevronRight} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {borderRadius} from '../../../theme/borderRadius';
import {spacing} from '../../../theme/spacing';

const PrimaryActionCard = ({
  type, // 'continue_route' | 'start_delivery' | 'go_online' | null
  subtitle,
  onPress,
  t,
}) => {
  if (!type) return null;

  const configs = {
    continue_route: {
      icon: Navigation,
      title: t('dashboard.continueRoute', 'Continue Route'),
      color: '#FFF',
      bg: colors.info,
      iconBg: 'rgba(255,255,255,0.20)',
    },
    start_delivery: {
      icon: Play,
      title: t('dashboard.nextDelivery', 'Next Delivery'),
      color: '#FFF',
      bg: colors.success,
      iconBg: 'rgba(255,255,255,0.20)',
    },
    go_online: {
      icon: WifiOff,
      title: t('dashboard.goOnline', 'Go Online'),
      color: '#FFF',
      bg: colors.secondary,
      iconBg: 'rgba(255,255,255,0.20)',
    },
  };

  const cfg = configs[type] || configs.go_online;
  const Icon = cfg.icon;

  return (
    <Animated.View entering={FadeInDown.springify().damping(16).stiffness(120).delay(120)}>
      <TouchableOpacity
        style={[$.card, {backgroundColor: cfg.bg}]}
        onPress={onPress}
        activeOpacity={0.8}>
        <View style={[$.iconWrap, {backgroundColor: cfg.iconBg}]}>
          <Icon size={18} color={cfg.color} strokeWidth={2} />
        </View>
        <View style={{flex: 1}}>
          <Text style={$.title}>{cfg.title}</Text>
          {!!subtitle && <Text style={$.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        <View style={$.chevron}>
          <ChevronRight size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const $ = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: '#FFF',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});

export default React.memo(PrimaryActionCard);
