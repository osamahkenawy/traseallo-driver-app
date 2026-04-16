/**
 * StopMarker — Numbered delivery stop marker with status colors
 */
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Marker, Callout} from 'react-native-maps';
import {useTranslation} from 'react-i18next';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/fonts';

const STOP_COLORS = {
  pending: colors.primary,
  assigned: colors.primary,
  accepted: '#1565C0',
  picked_up: colors.info,
  in_transit: colors.info,
  en_route: colors.info,
  arrived: colors.warning,
  completed: colors.success,
  delivered: colors.success,
  failed: colors.danger,
  returned: colors.orange,
  skipped: colors.textMuted,
  cancelled: colors.textMuted,
};

const StopMarker = ({stop, index, isSelected, onPress, isPickup, dimmed, isNext}) => {
  const {t} = useTranslation();
  const lat = parseFloat(stop.lat || stop.recipient_lat);
  const lng = parseFloat(stop.lng || stop.recipient_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const status = stop.stop_status || stop.status || 'pending';
  const markerColor = STOP_COLORS[status] || colors.primary;
  const isCompleted = status === 'completed' || status === 'delivered';
  const isFailed = status === 'failed';
  const isInTransit = status === 'in_transit' || status === 'en_route';
  const seq = stop.sequence_number || index + 1;
  const name = stop.contact_name || stop.recipient_name || '—';
  const orderNum = stop.order_number || '';
  const isCod = stop.payment_method === 'cod' && parseFloat(stop.cod_amount) > 0;

  return (
    <Marker
      coordinate={{latitude: lat, longitude: lng}}
      onPress={() => onPress?.(stop)}
      tracksViewChanges={false}
      anchor={{x: 0.5, y: 1}}
      opacity={dimmed ? 0.4 : 1}
      zIndex={isNext ? 999 : dimmed ? 1 : 10}>
      <View style={$.wrap}>
        {/* Next-stop pulse ring */}
        {isNext && <View style={$.nextRing} />}
        {/* Pin body */}
        <View style={[
          $.pin,
          {backgroundColor: markerColor},
          isSelected && $.pinSelected,
          dimmed && $.pinDimmed,
          isNext && $.pinNext,
        ]}>
          {isCompleted ? (
            <Icon name="check" size={12} color={colors.white} />
          ) : isFailed ? (
            <Icon name="close" size={12} color={colors.white} />
          ) : isPickup ? (
            <Icon name="store-outline" size={12} color={colors.white} />
          ) : isInTransit ? (
            <Icon name="truck-delivery-outline" size={11} color={colors.white} />
          ) : (
            <Text style={[$.seq, isNext && $.seqNext]}>{seq}</Text>
          )}
        </View>
        {/* Pin tail */}
        <View style={[$.tail, {borderTopColor: dimmed ? (markerColor + '66') : markerColor}]} />

        {/* COD badge */}
        {isCod && !isCompleted && !dimmed && (
          <View style={$.codBadge}>
            <Text style={$.codText}>$</Text>
          </View>
        )}
      </View>

      <Callout tooltip>
        <View style={$.callout}>
          <Text style={$.calloutTitle} numberOfLines={1}>{name}</Text>
          {orderNum ? <Text style={$.calloutSub}>{orderNum}</Text> : null}
          <View style={[$.calloutStatus, {backgroundColor: markerColor + '20'}]}>
            <Text style={[$.calloutStatusText, {color: markerColor}]}>
              {t('status.' + (status || 'pending'), (status || 'pending')).toUpperCase()}
            </Text>
          </View>
        </View>
      </Callout>
    </Marker>
  );
};

const $ = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: 48,
    height: 56,
  },
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  pinSelected: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
  pinDimmed: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    opacity: 0.6,
  },
  pinNext: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#FFA726',
  },
  nextRing: {
    position: 'absolute',
    top: -4,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFA72680',
    backgroundColor: '#FFA72615',
  },
  seq: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.white,
  },
  seqNext: {
    fontSize: 13,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  codBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  codText: {
    fontFamily: fontFamily.bold,
    fontSize: 8,
    color: colors.white,
  },
  callout: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 140,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  calloutTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  calloutSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  calloutStatus: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  calloutStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 8,
  },
});

export default React.memo(StopMarker);
