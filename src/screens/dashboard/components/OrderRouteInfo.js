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
    <View style={$.container}>
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
          <View style={$.etaLineCol}>
            <View style={$.etaLineSeg} />
          </View>
          <View style={$.etaPill}>
            {!!distance && <Text style={$.etaTxt}>{distance}</Text>}
            {distance && eta ? <Text style={$.etaSep}> · </Text> : null}
            {!!eta && (
              <>
                <Clock size={10} color={colors.textMuted} strokeWidth={2} style={{marginRight: 3}} />
                <Text style={$.etaTxt}>{eta}</Text>
              </>
            )}
          </View>
        </View>
      ) : null}

      {/* Destination */}
      <View style={[$.routeRow, {marginTop: 2}]}>
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
  </View>
);

const $ = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  container: {
    backgroundColor: '#F8FAFB',
    borderRadius: 14,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dotCol: {
    width: 20,
    alignItems: 'center',
    paddingTop: 3,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  dotPickup: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 2,
  },
  dotDest: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 2,
  },
  line: {
    width: 1.5,
    flex: 1,
    minHeight: 20,
    backgroundColor: colors.borderLight,
    marginVertical: 3,
    borderRadius: 1,
  },
  addrCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  address: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  recipient: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.success,
    marginTop: 3,
  },
  // ETA pill
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  etaLineCol: {
    width: 20,
    alignItems: 'center',
  },
  etaLineSeg: {
    width: 1.5,
    height: 10,
    backgroundColor: colors.borderLight,
    borderRadius: 1,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1F4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: spacing.md,
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
