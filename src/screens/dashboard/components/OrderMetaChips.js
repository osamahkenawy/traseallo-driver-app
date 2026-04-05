/**
 * OrderMetaChips — COD amount, delivery fee, package count chips.
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Banknote, Package} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {spacing} from '../../../theme/spacing';

const OrderMetaChips = ({isCOD, codAmount, deliveryFee, totalPackages, currency = 'AED', t}) => {
  const showFee = parseFloat(deliveryFee) > 0;
  const showPkgs = totalPackages > 0;

  if (!isCOD && !showFee && !showPkgs) return null;

  return (
    <View style={$.row}>
      {!!isCOD && (
        <View style={$.chipCod}>
          <Banknote size={12} color={colors.warning} strokeWidth={2} style={{marginRight: 8}} />
          <Text style={$.chipCodTxt}>{currency} {parseFloat(codAmount).toFixed(2)}</Text>
        </View>
      )}
      {showFee && (
        <View style={$.chip}>
          <Text style={$.chipTxt}>{t('dashboard.fee', 'Fee')}: {currency} {parseFloat(deliveryFee).toFixed(2)}</Text>
        </View>
      )}
      {showPkgs && (
        <View style={$.chip}>
          <Package size={12} color={colors.textMuted} strokeWidth={2} style={{marginRight: 8}} />
          <Text style={$.chipTxt}>
            {totalPackages === 1
              ? t('orders.pkg', '1 pkg')
              : t('orders.pkgs', '{{count}} pkgs', {count: totalPackages})}
          </Text>
        </View>
      )}
    </View>
  );
};

const $ = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chipCod: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.warningBg,
    marginRight: 8,
  },
  chipCodTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.orange,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.bgGray,
    marginRight: 8,
  },
  chipTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default React.memo(OrderMetaChips);
