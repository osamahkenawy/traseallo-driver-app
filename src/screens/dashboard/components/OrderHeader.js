/**
 * OrderHeader — Order ID, badges (Express / COD), sender name, time label.
 * Tappable to navigate to order detail.
 */

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Package, Truck, Banknote} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/fonts';
import {spacing} from '../../../theme/spacing';
import {borderRadius} from '../../../theme/borderRadius';

const OrderHeader = ({
  orderNumber,
  senderName,
  timeLabel,
  isExpress,
  isCOD,
  onPress,
  t,
}) => (
  <TouchableOpacity style={$.wrap} onPress={onPress} activeOpacity={0.6}>
    <View style={$.iconWrap}>
      <Package size={18} color={colors.primary} strokeWidth={2} />
    </View>

    <View style={{flex: 1}}>
      <View style={$.row}>
        <Text style={$.orderNum}>#{orderNumber}</Text>
        {!!timeLabel && <Text style={$.time}>{timeLabel}</Text>}
      </View>
      <View style={$.badgeRow}>
        {!!senderName && (
          <Text numberOfLines={1} style={$.sender}>{senderName}</Text>
        )}
        {!!isExpress && (
          <View style={$.expressBadge}>
            <Truck size={10} color="#FFF" strokeWidth={2.5} style={{marginRight: 4}} />
            <Text style={$.expressTxt}>{t('dashboard.express', 'EXPRESS')}</Text>
          </View>
        )}
        {!!isCOD && (
          <View style={$.codBadge}>
            <Banknote size={10} color={colors.warning} strokeWidth={2} style={{marginRight: 4}} />
            <Text style={$.codTxt}>COD</Text>
          </View>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

const $ = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '0C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  orderNum: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  expressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.secondary,
  },
  expressTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 8,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  codBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.warningBg,
  },
  codTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 8,
    color: colors.orange,
    letterSpacing: 0.3,
  },
  sender: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
  },
  time: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textLight,
  },
});

export default React.memo(OrderHeader);
