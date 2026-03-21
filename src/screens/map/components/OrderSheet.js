/**
 * OrderSheet — Enhanced bottom sheet for selected order/stop
 */
import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../../utils/LucideIcon';
import {colors, getStatusColor, getStatusBgColor} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/fonts';

const cleanPhone = (p) => (p || '').replace(/[\s\-()]/g, '');

const OrderSheet = ({
  stop,
  driverPosition,
  sheetY,
  panHandlers,
  onDismiss,
  onNavigate,
  onViewDetail,
  haversine,
  estimateETA,
  t,
}) => {
  const ins = useSafeAreaInsets();
  if (!stop) return null;

  const name = stop.contact_name || stop.recipient_name || '—';
  const address = stop.address || stop.recipient_address || '—';
  const phone = stop.contact_phone || stop.recipient_phone;
  const orderNum = stop.order_number || '';
  const status = stop.stop_status || stop.status || 'pending';
  const statusColor = getStatusColor(status === 'pending' ? 'assigned' : status);
  const isCod = stop.payment_method === 'cod' && parseFloat(stop.cod_amount) > 0;
  const area = stop.area || stop.recipient_area;
  const seq = stop.sequence_number;
  const isPickup = stop.stop_type === 'pickup';

  // Distance & ETA
  const distInfo = useMemo(() => {
    if (!driverPosition) return null;
    const lat = parseFloat(stop.lat || stop.recipient_lat);
    const lng = parseFloat(stop.lng || stop.recipient_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const dist = haversine(driverPosition.latitude, driverPosition.longitude, lat, lng);
    return {km: dist.toFixed(1), eta: estimateETA(dist)};
  }, [stop, driverPosition, haversine, estimateETA]);

  const handleCall = () => {
    if (!phone) return;
    const url = Platform.OS === 'ios' ? `telprompt:${cleanPhone(phone)}` : `tel:${cleanPhone(phone)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleWhatsApp = () => {
    if (!phone) return;
    const num = cleanPhone(phone).replace(/^0/, '971');
    const msg = encodeURIComponent(`Hi ${name}, your order ${orderNum} is on its way! 🚚`);
    Linking.openURL(`https://wa.me/${num}?text=${msg}`).catch(() => {});
  };

  return (
    <Animated.View
      style={[$.sheet, {transform: [{translateY: sheetY}], paddingBottom: ins.bottom + 8}]}
      {...panHandlers}>
      {/* Handle */}
      <View style={$.handleBar}>
        <View style={$.handle} />
      </View>

      <View style={$.body}>
        {/* Header: order # + status + close */}
        <View style={$.header}>
          <View style={$.headerLeft}>
            {seq && (
              <View style={[$.seqBadge, {backgroundColor: statusColor}]}>
                <Text style={$.seqText}>{seq}</Text>
              </View>
            )}
            <View style={{flex: 1}}>
              <Text style={$.orderNum} numberOfLines={1}>{orderNum || name}</Text>
              {isPickup && <Text style={$.pickupTag}>PICKUP</Text>}
            </View>
            <View style={[$.statusBadge, {backgroundColor: getStatusBgColor(status, 0.12)}]}>
              <Text style={[$.statusText, {color: statusColor}]}>
                {(status || 'pending').replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onDismiss} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Person row */}
        <View style={$.infoRow}>
          <View style={[$.avatar, {backgroundColor: isPickup ? '#E3F1FD' : colors.successBg}]}>
            <Text style={[$.avatarText, {color: isPickup ? colors.primary : colors.success}]}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={$.personName} numberOfLines={1}>{name}</Text>
            {area ? <Text style={$.area}>{area}</Text> : null}
          </View>
          {phone && (
            <View style={$.contactBtns}>
              <TouchableOpacity style={$.miniBtn} onPress={handleCall}>
                <Icon name="phone" size={14} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity style={$.miniBtn} onPress={handleWhatsApp}>
                <Icon name="whatsapp" size={14} color="#25D366" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Address */}
        <View style={$.addressRow}>
          <Icon name="map-marker-outline" size={14} color={colors.textMuted} />
          <Text style={$.addressText} numberOfLines={2}>{address}</Text>
        </View>

        {/* Info chips: ETA, distance, COD */}
        <View style={$.chipRow}>
          {distInfo && (
            <>
              <View style={$.chip}>
                <Icon name="clock-outline" size={12} color={colors.info} />
                <Text style={$.chipText}>{distInfo.eta} min</Text>
              </View>
              <View style={$.chip}>
                <Icon name="map-marker-distance" size={12} color={colors.info} />
                <Text style={$.chipText}>{distInfo.km} km</Text>
              </View>
            </>
          )}
          {isCod && (
            <View style={[$.chip, {backgroundColor: colors.warningBg}]}>
              <Icon name="cash" size={12} color={colors.warning} />
              <Text style={[$.chipText, {color: colors.warning}]}>
                AED {parseFloat(stop.cod_amount).toFixed(0)}
              </Text>
            </View>
          )}
          {stop.special_instructions && (
            <View style={[$.chip, {backgroundColor: colors.dangerBg}]}>
              <Icon name="alert-circle-outline" size={12} color={colors.danger} />
              <Text style={[$.chipText, {color: colors.danger}]}>Note</Text>
            </View>
          )}
        </View>

        {/* Special instructions */}
        {stop.special_instructions && (
          <View style={$.noteRow}>
            <Text style={$.noteText} numberOfLines={2}>📝 {stop.special_instructions}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={$.actions}>
          <TouchableOpacity
            style={[$.actionBtn, $.navBtn]}
            onPress={() => onNavigate?.(stop)}
            activeOpacity={0.7}>
            <Icon name="navigation-variant" size={16} color={colors.white} />
            <Text style={[$.actionText, {color: colors.white}]}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[$.actionBtn, $.detailBtn]}
            onPress={() => onViewDetail?.(stop)}
            activeOpacity={0.7}>
            <Icon name="file-document-outline" size={16} color={colors.primary} />
            <Text style={[$.actionText, {color: colors.primary}]}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const $ = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -3},
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12,
  },
  handleBar: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  body: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 10,
  },
  seqBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.white,
  },
  orderNum: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  pickupTag: {
    fontFamily: fontFamily.bold,
    fontSize: 8,
    color: colors.info,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
  },
  personName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  area: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  contactBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  miniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
    paddingLeft: 2,
  },
  addressText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.info,
  },
  noteRow: {
    backgroundColor: '#FFF8E6',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  noteText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  navBtn: {
    backgroundColor: colors.primary,
  },
  detailBtn: {
    backgroundColor: colors.bgSoftBlue,
  },
  actionText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
});

export default React.memo(OrderSheet);
