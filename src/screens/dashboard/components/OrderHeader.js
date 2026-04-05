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
      <Package size={16} color={colors.primary} strokeWidth={2} />
    </View>

    <View style={{flex: 1}}>
      <View style={$.row}>
        <Text style={$.orderNum}>#{orderNumber}</Text>
        {!!isExpress && (
          <View style={$.expressBadge}>
            <Truck size={10} color="#FFF" strokeWidth={2.5} style={{marginRight: 6}} />
            <Text style={$.expressTxt}>{t('dashboard.express', 'EXPRESS')}</Text>
          </View>
        )}
        {!!isCOD && (
          <View style={$.codBadge}>
            <Banknote size={10} color={colors.warning} strokeWidth={2} style={{marginRight: 6}} />
            <Text style={$.codTxt}>COD</Text>
          </View>
        )}
      </View>
      {!!senderName && (
        <Text numberOfLines={1} style={$.sender}>{senderName}</Text>
      )}
    </View>

    {!!timeLabel && <Text style={$.time}>{timeLabel}</Text>}
  </TouchableOpacity>
);

const $ = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '0C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  orderNum: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: 8,
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
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textLight,
  },
});

export default React.memo(OrderHeader);
