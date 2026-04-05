/**
 * DashboardHeader — Modern gradient-feel header with greeting, date, bell.
 * Layered shapes for depth, warm accent glow.
 */

import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Bell} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {spacing} from '../../../theme/spacing';
import {useTranslation} from 'react-i18next';

const DashboardHeader = ({
  notificationCount = 0,
  onNotificationPress,
}) => {
  const ins = useSafeAreaInsets();
  const {t, i18n} = useTranslation();

  const now = new Date();
  const hour = now.getHours();
  const greetingText =
    hour < 12 ? t('dashboard.goodMorning') : hour < 17 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening');
  const locale = i18n.language === 'ar' ? 'ar-AE' : 'en-US';
  const dateLine = now.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={[$.header, {paddingTop: ins.top + 14}]}>
      {/* Background shapes */}
      <View style={$.shape1} />
      <View style={$.shape2} />
      <View style={$.shape3} />

      {/* Content */}
      <View style={$.row}>
        <View style={{flex: 1}}>
          <Text style={$.date}>{dateLine}</Text>
          <Text style={$.greeting}>{greetingText}</Text>
        </View>
        <TouchableOpacity style={$.bellBtn} onPress={onNotificationPress} activeOpacity={0.7}>
          <Bell size={19} color="#FFF" strokeWidth={2} />
          {notificationCount > 0 && (
            <View style={$.badge}>
              <Text style={$.badgeTxt}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
    overflow: 'hidden',
  },
  /* Layered decorative shapes for depth */
  shape1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  shape2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  shape3: {
    position: 'absolute',
    top: 10,
    right: 60,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(249,76,41,0.08)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  greeting: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: '#FFFFFF',
    lineHeight: 30,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#FFF',
  },
});

export default React.memo(DashboardHeader);
