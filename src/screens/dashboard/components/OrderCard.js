/**
 * OrderCard — Modern incoming-order card.
 * Layout (matches reference screenshot):
 *  ┌─────────────────────────────────────┐
 *  │ [EXPRESS ribbon]  #9012     · time  │
 *  │  [📦] Sender Name                   │
 *  │  [EXPRESS] [COD]                    │
 *  │  ┌────────────────────┬───────┐     │
 *  │  │ pickup → delivery  │ map   │     │
 *  │  │ timeline + addr    │ +btns │     │
 *  │  └────────────────────┴───────┘     │
 *  │  [recipient · phone]                │
 *  │  [AED 150] [Fee] [1 pkg]            │
 *  │  [Reject]   [Accept Order]          │
 *  └─────────────────────────────────────┘
 */

import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import Svg, {Path, Circle, Defs, LinearGradient as SvgGrad, Stop} from 'react-native-svg';
import {
  Package, Truck, Banknote, Clock, MapPin, Navigation as NavIcon,
  Phone, User, CheckCircle, XCircle, Wallet, CreditCard, Box,
} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {D} from './dashboardTheme';

/* ─── Mini map illustration (svg) ─── */
const MiniMap = () => (
  <Svg width="100%" height="100%" viewBox="0 0 110 150" preserveAspectRatio="xMidYMid slice">
    <Defs>
      <SvgGrad id="route" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#244066" stopOpacity="1" />
        <Stop offset="1" stopColor="#244066" stopOpacity="0.5" />
      </SvgGrad>
    </Defs>
    {/* Background */}
    <Path d="M0 0 H110 V150 H0 Z" fill="#EEF2F8" />
    {/* Faint streets */}
    {[18, 36, 54, 72, 90, 108, 126].map(y => (
      <Path key={`h${y}`} d={`M0 ${y} H110`} stroke="#DCE2EB" strokeWidth="1" />
    ))}
    {[15, 40, 65, 90].map(x => (
      <Path key={`v${x}`} d={`M${x} 0 V150`} stroke="#DCE2EB" strokeWidth="1" />
    ))}
    {/* Route path */}
    <Path
      d="M58 18 C 58 50, 30 70, 50 100 S 70 130, 60 145"
      stroke="url(#route)"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    {/* Pickup dot */}
    <Circle cx="58" cy="18" r="5" fill="#244066" />
    <Circle cx="58" cy="18" r="2" fill="#FFFFFF" />
    {/* Delivery pin */}
    <Path d="M55 95 C 55 90, 65 90, 65 95 C 65 102, 60 110, 60 110 C 60 110, 55 102, 55 95 Z" fill="#18B67A" />
    <Circle cx="60" cy="96" r="2.2" fill="#FFFFFF" />
  </Svg>
);

/* ─── Diagonal EXPRESS Ribbon ─── */
const ExpressRibbon = ({label}) => (
  <View style={$.ribbonWrap} pointerEvents="none">
    <View style={$.ribbon}>
      <Text style={$.ribbonTxt}>⚡ {label}</Text>
    </View>
  </View>
);

/* ═══ Main Component ═══ */
const OrderCard = ({order, currency = 'AED', onAccept, onReject, onPress, onNavigate, onCall, index = 0}) => {
  const {t} = useTranslation();

  const orderNum = order?.order_number || '';
  const senderName = order?.sender_name || order?.client_name || t('dashboard.client', 'Client');
  const recipientName = order?.recipient_name || t('dashboard.recipient', 'Recipient');
  const recipientPhone = order?.recipient_phone || '';
  const pickupAddress = order?.sender_address || order?.pickup_address || '';
  const pickupArea = order?.sender_emirate || order?.sender_area || '';
  const destAddress = order?.recipient_address || order?.delivery_address || '';
  const destArea = order?.recipient_emirate || order?.recipient_area || '';
  const isExpress = order?.order_type === 'express';
  const isCOD = order?.payment_method === 'cod' && parseFloat(order?.cod_amount) > 0;
  const codAmount = parseFloat(order?.cod_amount || 0);
  const totalAmount = parseFloat(order?.total_amount || order?.cod_amount || 0);
  const deliveryFee = parseFloat(order?.delivery_fee || 0);
  const totalPkgs = order?.total_packages || 0;

  const timeLabel = useMemo(() => {
    const ts = order?.assigned_at || order?.created_at;
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('notifications.justNow', 'Just now');
    if (mins < 60) return t('notifications.minutesAgo', '{{count}} min ago', {count: mins});
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('notifications.hoursAgo', '{{count}}h ago', {count: hrs});
    return '';
  }, [order?.assigned_at, order?.created_at, t]);

  const handlePress = useCallback(() => onPress?.(order), [onPress, order]);

  const handleNavigate = useCallback(() => {
    if (onNavigate) return onNavigate(order);
    // Fallback: open external maps
    const lat = order?.sender_lat || order?.pickup_lat;
    const lng = order?.sender_lng || order?.pickup_lng;
    if (lat && lng) {
      const url = Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
      Linking.openURL(url).catch(() => {});
    }
  }, [onNavigate, order]);

  const handleCall = useCallback(() => {
    if (onCall) return onCall(order);
    const phone = order?.sender_phone || order?.recipient_phone;
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
  }, [onCall, order]);

  /* ─── Accept / Reject internal busy state ─── */
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const busy = accepting || rejecting;

  const doAccept = useCallback(async () => {
    if (busy) return;
    setAccepting(true);
    try { await onAccept?.(order); } finally { setAccepting(false); }
  }, [busy, onAccept, order]);

  const doReject = useCallback(async () => {
    if (busy) return;
    setRejecting(true);
    try { await onReject?.(order); } finally { setRejecting(false); }
  }, [busy, onReject, order]);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(140).delay(index * 60)}
      style={$.outer}>
      <View style={$.card}>
        {isExpress && <ExpressRibbon label={t('dashboard.express', 'EXPRESS')} />}

        {/* Header */}
        <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={$.headerRow}>
          <View style={{flex: 1, paddingLeft: isExpress ? 70 : 0}}>
            <View style={$.titleRow}>
              <Text style={$.orderNum}>{t('dashboard.order', 'Order')} #{orderNum}</Text>
              {!!timeLabel && <Text style={$.time}>{timeLabel}</Text>}
            </View>
            <Text style={$.senderName} numberOfLines={1}>{senderName}</Text>
            <View style={$.chipsRow}>
              {isExpress && (
                <View style={[$.chip, {backgroundColor: D.orangeSoft}]}>
                  <Truck size={10} color={D.orange} strokeWidth={2.4} style={{marginRight: 4}} />
                  <Text style={[$.chipTxt, {color: D.orange}]}>{t('dashboard.express', 'EXPRESS')}</Text>
                </View>
              )}
              {isCOD && (
                <View style={[$.chip, {backgroundColor: D.yellowSoft}]}>
                  <Wallet size={10} color={D.yellow} strokeWidth={2.4} style={{marginRight: 4}} />
                  <Text style={[$.chipTxt, {color: D.yellow}]}>COD</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Body: route info + mini map + action buttons */}
        <View style={$.bodyRow}>
          {/* Left — pickup/delivery timeline */}
          <View style={$.routeCol}>
            <View style={$.routeRow}>
              <View style={$.dotCol}>
                <View style={[$.dot, {backgroundColor: D.primary}]} />
                <View style={$.dottedLine} />
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={[$.routeLabel, {color: D.primary}]}>{t('dashboard.pickup', 'PICKUP')}</Text>
                <Text style={$.routeAddr} numberOfLines={3}>
                  {pickupArea ? `${pickupArea}, ` : ''}{pickupAddress || '—'}
                </Text>
              </View>
            </View>
            <View style={$.routeRow}>
              <View style={$.dotCol}>
                <View style={[$.pinIcon, {backgroundColor: D.green}]}>
                  <MapPin size={9} color="#FFF" strokeWidth={3} />
                </View>
              </View>
              <View style={{flex: 1, marginLeft: 8}}>
                <Text style={[$.routeLabel, {color: D.green}]}>{t('dashboard.delivery', 'DELIVERY')}</Text>
                <Text style={$.routeAddr} numberOfLines={3}>
                  {destArea ? `${destArea}, ` : ''}{destAddress || '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Right — mini map + Navigate + Call */}
          <View style={$.rightCol}>
            <View style={$.mapBox}>
              <MiniMap />
            </View>
            <TouchableOpacity onPress={handleNavigate} activeOpacity={0.8} style={[$.sideBtn, {backgroundColor: D.primarySoft}]}>
              <NavIcon size={16} color={D.primary} strokeWidth={2.4} />
              <Text style={[$.sideBtnTxt, {color: D.primary}]}>{t('dashboard.navigate', 'Navigate')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCall} activeOpacity={0.8} style={[$.sideBtn, {backgroundColor: D.greenSoft}]}>
              <Phone size={15} color={D.green} strokeWidth={2.4} />
              <Text style={[$.sideBtnTxt, {color: D.green}]}>{t('dashboard.call', 'Call')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recipient row */}
        {(recipientName || recipientPhone) && (
          <View style={$.recipientRow}>
            <User size={12} color={D.green} strokeWidth={2.2} style={{marginRight: 5}} />
            <Text style={$.recipientName} numberOfLines={1}>{recipientName}</Text>
            {!!recipientPhone && (
              <>
                <View style={$.recipientSep} />
                <Text style={$.recipientPhone} numberOfLines={1}>{recipientPhone}</Text>
              </>
            )}
          </View>
        )}

        {/* Price row */}
        <View style={$.pillsRow}>
          <View style={[$.pricePill, {backgroundColor: D.orangeSoft}]}>
            <Wallet size={14} color={D.orange} strokeWidth={2.2} style={{marginRight: 6}} />
            <View>
              <Text style={[$.priceTxt, {color: D.orange}]}>
                {currency} {(totalAmount || codAmount).toFixed(2)}
              </Text>
              <Text style={$.priceCaption}>{t('dashboard.totalAmount', 'Total Amount')}</Text>
            </View>
          </View>
          {deliveryFee > 0 && (
            <View style={[$.pricePill, {backgroundColor: '#F2F4F8'}]}>
              <CreditCard size={14} color={D.textMuted} strokeWidth={2.2} style={{marginRight: 6}} />
              <View>
                <Text style={[$.priceTxt, {color: D.text}]}>{t('dashboard.fee', 'Fee')}: {currency} {deliveryFee.toFixed(2)}</Text>
                <Text style={$.priceCaption}>{t('dashboard.serviceFee', 'Service Fee')}</Text>
              </View>
            </View>
          )}
          {totalPkgs > 0 && (
            <View style={[$.pricePill, {backgroundColor: '#F2F4F8'}]}>
              <Box size={14} color={D.textMuted} strokeWidth={2.2} style={{marginRight: 6}} />
              <View>
                <Text style={[$.priceTxt, {color: D.text}]}>{totalPkgs} {totalPkgs === 1 ? 'pkg' : 'pkgs'}</Text>
                <Text style={$.priceCaption}>{t('dashboard.package', 'Package')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={$.actionsRow}>
          <TouchableOpacity
            onPress={doReject}
            disabled={busy}
            activeOpacity={0.8}
            style={[$.rejectBtn, busy && {opacity: 0.5}]}>
            {rejecting
              ? <ActivityIndicator size="small" color={D.red} />
              : (
                <>
                  <XCircle size={16} color={D.red} strokeWidth={2.2} style={{marginRight: 6}} />
                  <Text style={$.rejectTxt}>{t('dashboard.reject', 'Reject')}</Text>
                </>
              )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={doAccept}
            disabled={busy}
            activeOpacity={0.85}
            style={[$.acceptBtn, busy && {opacity: 0.7}]}>
            {accepting
              ? <ActivityIndicator size="small" color="#FFF" />
              : (
                <>
                  <CheckCircle size={16} color="#FFF" strokeWidth={2.4} style={{marginRight: 6}} />
                  <Text style={$.acceptTxt}>{t('dashboard.acceptOrder', 'Accept Order')}</Text>
                </>
              )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const $ = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: D.surface,
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: {shadowColor: '#0B1220', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.07, shadowRadius: 14},
      android: {elevation: 4},
    }),
  },
  /* Diagonal ribbon — wraps the top-left corner */
  ribbonWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 110,
    height: 110,
    overflow: 'hidden',
    zIndex: 2,
  },
  ribbon: {
    position: 'absolute',
    top: 16,
    left: -32,
    width: 130,
    paddingVertical: 4,
    backgroundColor: D.orange,
    transform: [{rotate: '-45deg'}],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonTxt: {
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNum: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    color: D.text,
  },
  time: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    color: D.textLight,
  },
  senderName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: D.textMuted,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  chipTxt: {
    fontFamily: 'Poppins-Bold',
    fontSize: 9,
    letterSpacing: 0.4,
  },
  /* Body */
  bodyRow: {
    flexDirection: 'row',
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
  },
  routeCol: {
    flex: 1,
    paddingRight: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  dotCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  dottedLine: {
    width: 1.5,
    flex: 1,
    minHeight: 18,
    marginVertical: 3,
    backgroundColor: D.border,
    borderRadius: 1,
  },
  pinIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLabel: {
    fontFamily: 'Poppins-Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  routeAddr: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    color: D.text,
    marginTop: 2,
    lineHeight: 15,
  },
  /* Right column */
  rightCol: {
    width: 84,
    alignItems: 'stretch',
  },
  mapBox: {
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  sideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 4,
  },
  sideBtnTxt: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
    marginLeft: 4,
  },
  /* Recipient row */
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  recipientName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: D.text,
  },
  recipientSep: {
    width: 1,
    height: 11,
    backgroundColor: D.border,
    marginHorizontal: 8,
  },
  recipientPhone: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    color: D.green,
  },
  /* Price pills */
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    minHeight: 40,
  },
  priceTxt: {
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
  },
  priceCaption: {
    fontFamily: 'Poppins-Regular',
    fontSize: 9,
    color: D.textMuted,
    marginTop: -1,
  },
  /* Actions */
  actionsRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  rejectBtn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: D.red,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  rejectTxt: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: D.red,
  },
  acceptBtn: {
    flex: 1.6,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: D.green,
    ...Platform.select({
      ios: {shadowColor: D.green, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8},
      android: {elevation: 4},
    }),
  },
  acceptTxt: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});

export default React.memo(OrderCard);
