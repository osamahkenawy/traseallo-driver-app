/**
 * AssignedOrderCard — Reanimated animated card for assigned orders
 * Incoming assigned order with Accept / Reject actions
 */

import React, {useState, useCallback} from 'react';
import {View, Text, TouchableOpacity, ActivityIndicator, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Banknote,
  Truck,
} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {useTranslation} from 'react-i18next';

const AssignedOrderCard = ({order, onAccept, onReject, onPress, currency = 'AED'}) => {
  const {t} = useTranslation();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const busy = accepting || rejecting;

  const pickupAddress = order?.sender_address || order?.pickup_address || '';
  const pickupArea = order?.sender_emirate || order?.sender_area || '';
  const destAddress = order?.recipient_address || order?.delivery_address || '';
  const destArea = order?.recipient_emirate || order?.recipient_area || '';
  const senderName = order?.sender_name || order?.client_name || t('dashboard.client');
  const recipientName = order?.recipient_name || t('dashboard.recipient');
  const orderNum = order?.order_number || '';
  const isCOD = order?.payment_method === 'cod' && parseFloat(order?.cod_amount) > 0;
  const codAmount = parseFloat(order?.cod_amount || 0).toFixed(2);
  const deliveryFee = parseFloat(order?.delivery_fee || 0).toFixed(2);
  const distance = order?.route_distance_km
    ? `${parseFloat(order.route_distance_km).toFixed(1)} km`
    : null;
  const eta = order?.route_duration_min
    ? `${Math.round(parseFloat(order.route_duration_min))} min`
    : null;
  const isExpress = order?.order_type === 'express';
  const totalPkgs = order?.total_packages || 0;

  const timeLabel = (() => {
    const timestamp = order?.assigned_at || order?.created_at;
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('notifications.justNow', 'Just now');
    if (mins < 60) return t('notifications.minutesAgo', '{{count}} min ago', {count: mins});
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('notifications.hoursAgo', '{{count}}h ago', {count: hrs});
    return '';
  })();

  const handleAccept = useCallback(async () => {
    if (busy) return;
    setAccepting(true);
    try { await onAccept?.(order); } finally { setAccepting(false); }
  }, [busy, onAccept, order]);

  const handleReject = useCallback(async () => {
    if (busy) return;
    setRejecting(true);
    try { await onReject?.(order); } finally { setRejecting(false); }
  }, [busy, onReject, order]);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(140)}
      style={$.cardOuter}>

      <View style={$.card}>
        {/* Accent bar */}
        <View style={$.accentBar} />

        {/* Header */}
        <TouchableOpacity
          style={$.header}
          onPress={() => onPress?.(order)}
          activeOpacity={0.6}>
          <View style={$.headerIconWrap}>
            <Package size={20} color={colors.primary} strokeWidth={2} />
          </View>

          <View style={{flex: 1}}>
            <View style={$.headerRow}>
              <Text style={$.orderNum}>#{orderNum}</Text>
              {isExpress && (
                <View style={$.expressBadge}>
                  <Truck size={10} color="#FFF" strokeWidth={2.5} />
                  <Text style={$.expressTxt}>{t('dashboard.express', 'EXPRESS')}</Text>
                </View>
              )}
              {isCOD && (
                <View style={$.codBadge}>
                  <Banknote size={10} color={colors.warning} strokeWidth={2} />
                  <Text style={$.codBadgeTxt}>COD</Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1} style={$.senderName}>{senderName}</Text>
          </View>

          {!!timeLabel && <Text style={$.timeLabel}>{timeLabel}</Text>}
        </TouchableOpacity>

        {/* Route: Pickup → Destination */}
        <View style={$.routeSection}>
          {/* Pickup */}
          <View style={$.routeRow}>
            <View style={$.dotCol}>
              <View style={[$.dot, {backgroundColor: '#1565C0'}]} />
              <View style={$.dotLine} />
            </View>
            <View style={{flex: 1, marginLeft: 14}}>
              <Text style={$.routeLabel}>{t('dashboard.pickup', 'Pickup')}</Text>
              <Text numberOfLines={1} style={$.routeAddr}>
                {pickupArea ? `${pickupArea} — ` : ''}{pickupAddress || t('dashboard.pickupAddress')}
              </Text>
            </View>
          </View>

          {/* Distance / ETA pill */}
          {(distance || eta) && (
            <View style={$.etaRow}>
              <View style={$.etaLine} />
              <View style={$.etaPill}>
                {distance && <Text style={$.etaTxt}>{distance}</Text>}
                {distance && eta && <Text style={$.etaDot}>·</Text>}
                {eta && (
                  <>
                    <Clock size={10} color={colors.textMuted} strokeWidth={2} />
                    <Text style={$.etaTxt}>{eta}</Text>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Destination */}
          <View style={$.routeRow}>
            <View style={$.dotCol}>
              <View style={[$.dot, {backgroundColor: colors.success}]} />
            </View>
            <View style={{flex: 1, marginLeft: 14}}>
              <Text style={$.routeLabel}>{t('dashboard.delivery', 'Delivery')}</Text>
              <Text numberOfLines={1} style={$.routeAddr}>
                {destArea ? `${destArea} — ` : ''}{destAddress || t('dashboard.deliveryAddress')}
              </Text>
              <Text style={$.recipientName}>{recipientName}</Text>
            </View>
          </View>
        </View>

        {/* Info chips */}
        <View style={$.chipsRow}>
          {isCOD && (
            <View style={$.chipCod}>
              <Banknote size={12} color={colors.warning} strokeWidth={2} />
              <Text style={$.chipCodTxt}>{currency} {codAmount}</Text>
            </View>
          )}
          {parseFloat(deliveryFee) > 0 && (
            <View style={$.chip}>
              <Text style={$.chipTxt}>{t('dashboard.fee', 'Fee')}: {currency} {deliveryFee}</Text>
            </View>
          )}
          {totalPkgs > 0 && (
            <View style={$.chip}>
              <Package size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={$.chipTxt}>{t('orders.pkgs', '{{count}} pkgs', {count: totalPkgs})}</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={$.actions}>
          {/* Reject */}
          <TouchableOpacity
            style={[$.rejectBtn, busy && {opacity: 0.5}]}
            onPress={handleReject}
            disabled={busy}
            activeOpacity={0.7}>
            {rejecting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <XCircle size={18} color={colors.danger} strokeWidth={2} />
                <Text style={$.rejectTxt}>{t('dashboard.reject', 'Reject')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Accept */}
          <TouchableOpacity
            style={[$.acceptBtn, busy && {opacity: 0.5}]}
            onPress={handleAccept}
            disabled={busy}
            activeOpacity={0.7}>
            {accepting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <CheckCircle size={18} color="#FFF" strokeWidth={2} />
                <Text style={$.acceptTxt}>{t('dashboard.accept', 'Accept')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const $ = StyleSheet.create({
  cardOuter: {marginHorizontal: 20, marginBottom: 16},
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  accentBar: {height: 4, backgroundColor: colors.secondary},

  // Header
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12},
  headerIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primary + '12',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerRow: {flexDirection: 'row', alignItems: 'center'},
  orderNum: {fontFamily: fontFamily.bold, fontSize: 15, color: colors.textPrimary, marginRight: 8},
  expressBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, backgroundColor: colors.secondary, marginRight: 6,
  },
  expressTxt: {fontFamily: fontFamily.bold, fontSize: 9, color: '#FFF', letterSpacing: 0.5, marginLeft: 4},
  codBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#FCECC4', marginRight: 6,
  },
  codBadgeTxt: {fontFamily: fontFamily.bold, fontSize: 9, color: '#B8860B', letterSpacing: 0.5, marginLeft: 4},
  senderName: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginTop: 2},
  timeLabel: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textLight},

  // Route
  routeSection: {paddingHorizontal: 16, paddingBottom: 12},
  routeRow: {flexDirection: 'row', alignItems: 'flex-start'},
  dotCol: {width: 20, alignItems: 'center', paddingTop: 2},
  dot: {width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 1},
  dotLine: {width: 2, height: 28, backgroundColor: '#E5E7EB', marginVertical: 2, borderRadius: 1},
  routeLabel: {fontFamily: fontFamily.bold, fontSize: 11, color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.6},
  routeAddr: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary, lineHeight: 18, marginTop: 2},
  recipientName: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.success, marginTop: 2},

  // ETA
  etaRow: {flexDirection: 'row', alignItems: 'center', marginLeft: 8},
  etaLine: {width: 2, height: 14, backgroundColor: '#E5E7EB', borderRadius: 1},
  etaPill: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8, marginLeft: 12},
  etaTxt: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.textMuted},
  etaDot: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.textLight},

  // Chips
  chipsRow: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 12},
  chipCod: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, backgroundColor: '#FFF7E6', borderWidth: 1, borderColor: '#FCECC4', marginRight: 8,
  },
  chipCodTxt: {fontFamily: fontFamily.medium, fontSize: 11, color: '#B8860B', marginLeft: 4},
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8,
  },
  chipTxt: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.textMuted, marginLeft: 4},

  // Actions
  actions: {flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 16},
  rejectBtn: {
    flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, borderWidth: 2, backgroundColor: colors.danger + '10', borderColor: colors.danger + '30',
  },
  rejectTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.danger, marginLeft: 8},
  acceptBtn: {
    flex: 1.5, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: '#244066',
    shadowColor: '#244066', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  acceptTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF', marginLeft: 8},
});

export default React.memo(AssignedOrderCard);
