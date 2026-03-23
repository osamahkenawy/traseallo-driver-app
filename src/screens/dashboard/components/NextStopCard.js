/**
 * NextStopCard — Priority 2 dashboard widget
 * Shows the next delivery/pickup stop with action buttons.
 * If no next stop, shows an empty state.
 */

import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity, Linking, Platform} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from '../../../utils/LucideIcon';
import useSettingsStore from '../../../store/settingsStore';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';

const NextStopCard = ({
  stop,
  routeSummary,
  onOpenOrder,
  onNavigate,
}) => {
  const {t} = useTranslation();
  const currency = useSettingsStore(s => s.currency);

  if (!stop) {
    return (
      <View style={$.root}>
        <Text style={$.sectionTitle}>{t('dashboard.nextStop')}</Text>
        <View style={$.emptyCard}>
          <View style={$.emptyIcon}>
            <Icon name="map-marker-check-outline" size={28} color={colors.textLight} />
          </View>
          <Text style={$.emptyTitle}>{t('dashboard.noUpcomingStops')}</Text>
          <Text style={$.emptySub}>{t('dashboard.allCaughtUp')}</Text>
        </View>
      </View>
    );
  }

  const orderNumber = stop.order_number || stop.order_id
    ? `#${stop.order_number || stop.order_id}`
    : '';
  const recipientName = stop.recipient_name || stop.recipient || stop.merchant || t('dashboard.recipientFallback');
  const address = stop.address || stop.recipient_address || '---';
  const codAmount = parseFloat(stop.cod_amount) || 0;
  const isPickup = stop.type === 'pickup';
  const sequence = stop.sequence;
  const totalStops = routeSummary?.total_stops || 0;

  const handleCall = () => {
    const phone = stop.recipient_phone || stop.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(stop);
      return;
    }
    const lat = stop.lat || stop.latitude;
    const lng = stop.lng || stop.longitude;
    if (lat && lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}`,
      });
      Linking.openURL(url);
    }
  };

  return (
    <View style={$.root}>
      <Text style={$.sectionTitle}>{t('dashboard.nextStop')}</Text>
      <View style={$.card}>
        {/* Type tag + order number */}
        <View style={$.topRow}>
          <View style={[$.typeBadge, isPickup ? $.pickupBadge : $.deliveryBadge]}>
            <Icon
              name={isPickup ? 'store-outline' : 'truck-delivery-outline'}
              size={12}
              color={isPickup ? '#4E7AB5' : '#15C7AE'}
            />
            <Text style={[$.typeTxt, {color: isPickup ? '#4E7AB5' : '#15C7AE'}]}>
              {isPickup ? t('dashboard.pickupType') : t('dashboard.deliveryType')}
            </Text>
          </View>
          {orderNumber ? (
            <Text style={$.orderNum}>{orderNumber}</Text>
          ) : null}
        </View>

        {/* Recipient */}
        <Text style={$.recipient}>{recipientName}</Text>

        {/* Address */}
        <View style={$.addressRow}>
          <Icon name="map-marker-outline" size={15} color={colors.textMuted} />
          <Text style={$.addressTxt} numberOfLines={2}>{address}</Text>
        </View>

        {/* Meta row: COD + Sequence */}
        <View style={$.metaRow}>
          {codAmount > 0 && (
            <View style={$.codBadge}>
              <Icon name="cash" size={13} color="#F9AD28" />
              <Text style={$.codTxt}>{currency} {codAmount}</Text>
            </View>
          )}
          {sequence && totalStops > 0 && (
            <View style={$.seqBadge}>
              <Icon name="format-list-numbered" size={12} color={colors.textMuted} />
              <Text style={$.seqTxt}>{t('dashboard.stopOf', {seq: sequence, total: totalStops})}</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={$.btnRow}>
          <TouchableOpacity
            style={$.btnPrimary}
            onPress={() => onOpenOrder?.(stop)}
            activeOpacity={0.7}>
            <Icon name="eye-outline" size={15} color="#FFF" />
            <Text style={$.btnPrimaryTxt}>{t('dashboard.openOrder')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={$.btnOutline}
            onPress={handleNavigate}
            activeOpacity={0.7}>
            <Icon name="navigation-variant-outline" size={15} color={colors.primary} />
          </TouchableOpacity>

          {(stop.recipient_phone || stop.phone) && (
            <TouchableOpacity
              style={$.btnOutline}
              onPress={handleCall}
              activeOpacity={0.7}>
              <Icon name="phone-outline" size={15} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  root: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pickupBadge: {backgroundColor: 'rgba(78,122,181,0.1)'},
  deliveryBadge: {backgroundColor: 'rgba(21,199,174,0.1)'},
  typeTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  orderNum: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  recipient: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginBottom: 12,
  },
  addressTxt: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  codBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFF4E0',
  },
  codTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: '#D88D0D',
  },
  seqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F0F2F5',
  },
  seqTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnPrimaryTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: '#FFF',
  },
  btnOutline: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary + '25',
    backgroundColor: colors.primary + '08',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty state
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default React.memo(NextStopCard);
