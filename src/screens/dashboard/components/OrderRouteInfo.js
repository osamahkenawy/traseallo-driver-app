/**
 * OrderRouteInfo — Pickup → Delivery route visualization
 * Vertical dots + connecting line with address details.
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Clock} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/fonts';
import {spacing} from '../../../theme/spacing';

const OrderRouteInfo = ({
  pickupArea,
  pickupAddress,
  destArea,
  destAddress,
  recipientName,
  distance,
  eta,
  t,
}) => (
  <View style={$.wrap}>
    {/* Pickup */}
    <View style={$.routeRow}>
      <View style={$.dotCol}>
        <View style={[$.dot, $.dotPickup]} />
        <View style={$.line} />
      </View>
      <View style={$.addrCol}>
        <Text style={$.label}>{t('dashboard.pickup', 'PICKUP')}</Text>
        <Text numberOfLines={2} style={$.address}>
          {pickupArea ? `${pickupArea} — ` : ''}{pickupAddress || t('dashboard.pickupAddress', 'Pickup')}
        </Text>
      </View>
    </View>

    {/* Distance / ETA pill */}
    {(distance || eta) ? (
      <View style={$.etaRow}>
        <View style={$.etaLineStub} />
        <View style={$.etaPill}>
          {!!distance && <Text style={[$.etaTxt, {marginRight: 4}]}>{distance}</Text>}
          {distance && eta ? <Text style={$.etaSep}>·</Text> : null}
          {!!eta && (
            <>
              <Clock size={10} color={colors.textMuted} strokeWidth={2} style={{marginRight: 5}} />
              <Text style={$.etaTxt}>{eta}</Text>
            </>
          )}
        </View>
      </View>
    ) : null}

    {/* Destination */}
    <View style={$.routeRow}>
      <View style={$.dotCol}>
        <View style={[$.dot, $.dotDest]} />
      </View>
      <View style={$.addrCol}>
        <Text style={$.label}>{t('dashboard.delivery', 'DELIVERY')}</Text>
        <Text numberOfLines={2} style={$.address}>
          {destArea ? `${destArea} — ` : ''}{destAddress || t('dashboard.deliveryAddress', 'Delivery')}
        </Text>
        {!!recipientName && <Text style={$.recipient}>{recipientName}</Text>}
      </View>
    </View>
  </View>
);

const $ = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dotCol: {
    width: 18,
    alignItems: 'center',
    paddingTop: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  dotPickup: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  dotDest: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  line: {
    width: 1,
    height: 18,
    backgroundColor: colors.borderLight,
    marginVertical: 2,
    borderRadius: 0.5,
  },
  addrCol: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  address: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
    marginTop: 1,
  },
  recipient: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.success,
    marginTop: 2,
  },
  // ETA pill
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 7,
  },
  etaLineStub: {
    width: 1,
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 0.5,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  etaTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  etaSep: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textLight,
  },
});

export default React.memo(OrderRouteInfo);
