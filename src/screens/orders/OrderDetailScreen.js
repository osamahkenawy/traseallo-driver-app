/**
 * Order Detail Screen — Modern enhanced UI with WhatsApp, timeline, badges
 */

import React, {useEffect, useCallback, useState, useMemo} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useOrderStore from '../../store/orderStore';
import useSettingsStore from '../../store/settingsStore';
import Icon from '../../utils/LucideIcon';
import {showMessage} from 'react-native-flash-message';
import {useTranslation} from 'react-i18next';

/* ── Helpers ──────────────────────────────────────────────── */
const STATUS_FLOW = ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered'];
// STATUS_LABELS now uses t('status.*') inside component
const STATUS_ICONS = {
  pending: 'clock-outline',
  confirmed: 'check-circle-outline',
  assigned: 'account-check-outline',
  picked_up: 'package-variant',
  in_transit: 'truck-fast-outline',
  delivered: 'check-decagram',
  failed: 'close-circle-outline',
  returned: 'keyboard-return',
  cancelled: 'cancel',
};

const CATEGORY_META = {
  fragile: {icon: 'glass-fragile', color: '#EB466D', bg: '#FEF0F3'},
  standard: {icon: 'package-variant-closed', color: '#244066', bg: '#EEF1F5'},
  electronics: {icon: 'laptop', color: '#10A6BA', bg: '#E6FAFB'},
  documents: {icon: 'file-document-outline', color: '#F9AD28', bg: '#FFF7E6'},
  food: {icon: 'food', color: '#15C7AE', bg: '#E6FBF7'},
  clothing: {icon: 'tshirt-crew-outline', color: '#9261C6', bg: '#F3ECF9'},
};

const PAY_ICONS = {
  cod: 'cash',
  card: 'credit-card-outline',
  online: 'web',
  wallet: 'wallet-outline',
  prepaid: 'check-decagram',
};

const fmtDate = (d) => {
  if (!d) return '---';
  const dt = new Date(d.replace(' ', 'T'));
  if (isNaN(dt)) return d;
  const day = dt.getDate().toString().padStart(2, '0');
  const mon = dt.toLocaleString('en', {month: 'short'});
  const yr = dt.getFullYear();
  const h = dt.getHours();
  const m = dt.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${day} ${mon} ${yr}, ${h12}:${m} ${ampm}`;
};

const fmtTime = (d) => {
  if (!d) return '';
  const dt = new Date(d.replace(' ', 'T'));
  if (isNaN(dt)) return d;
  const h = dt.getHours();
  const m = dt.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
};

const cleanPhone = (p) => (p || '').replace(/[\s\-()]/g, '');

/* ── Main Component ───────────────────────────────────────── */
const OrderDetailScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const currency = useSettingsStore(s => s.currency);
  const {token, trackingToken, orderId: paramOrderId} = route.params || {};
  const tkn = token || trackingToken;
  const orderIdParam = paramOrderId;

  const selectedOrder = useOrderStore(st => st.selectedOrder);
  const isLoading = useOrderStore(st => st.isLoading);
  const fetchOrderDetail = useOrderStore(st => st.fetchOrderDetail);
  const packages = useOrderStore(st => st.packages);
  const packagesLoading = useOrderStore(st => st.packagesLoading);
  const fetchPackages = useOrderStore(st => st.fetchPackages);
  const clearPackages = useOrderStore(st => st.clearPackages);
  const startDeliveryAction = useOrderStore(st => st.startDelivery);
  const isUpdatingStatus = useOrderStore(st => st.isUpdatingStatus);
  const storeError = useOrderStore(st => st.error);
  const [refreshing, setRefreshing] = useState(false);
  const [pkgExpanded, setPkgExpanded] = useState(false);
  const [stopsExpanded, setStopsExpanded] = useState(true);

  const orders = useOrderStore(st => st.orders);
  const setSelectedOrder = useOrderStore(st => st.setSelectedOrder);

  const order = selectedOrder;
  const status = order?.status || 'assigned';
  const stops = order?.stops || [];
  const isPickedUp = ['picked_up', 'in_transit', 'delivered'].includes(status);
  const needsPickup = status === 'assigned' || status === 'confirmed';

  // Resolve order ID — prefer param, fallback to loaded order
  const resolvedOrderId = orderIdParam || order?.id;

  useEffect(() => {
    // Immediately populate from orders list so data shows while detail loads
    if (!selectedOrder || (selectedOrder.id !== orderIdParam && selectedOrder.tracking_token !== tkn)) {
      const listOrder = orders.find(
        o => o.id === orderIdParam || o.id === Number(orderIdParam) || o.tracking_token === tkn,
      );
      if (listOrder) setSelectedOrder(listOrder);
    }

    // Prefer orderId for fetching, fallback to token
    if (orderIdParam) {
      fetchOrderDetail(orderIdParam);
    } else if (tkn) {
      fetchOrderDetail(tkn);
    }
    return () => clearPackages();
  }, [orderIdParam, tkn]);

  // Fetch packages when order is loaded
  useEffect(() => {
    if (order?.id) fetchPackages(order.id);
  }, [order?.id]);

  // Re-fetch packages when screen regains focus (after deliver/fail)
  useFocusEffect(
    useCallback(() => {
      // Only re-fetch if we already have an order (not the initial load)
      if (!order?.id) return;
      fetchPackages(order.id);
    }, [order?.id]),
  );

  const phone = order?.recipient_phone;
  const address = order?.recipient_address || null;
  const catMeta = CATEGORY_META[order?.category] || CATEGORY_META.standard;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (resolvedOrderId) {
      await fetchOrderDetail(resolvedOrderId);
    } else if (tkn) {
      await fetchOrderDetail(tkn);
    }
    if (order?.id) await fetchPackages(order.id);
    setRefreshing(false);
  }, [resolvedOrderId, tkn, order?.id]);

  /* ── Status progress ─── */
  const statusIdx = useMemo(() => {
    if (status === 'failed') return -1;
    return STATUS_FLOW.indexOf(status);
  }, [status]);

  /* ── Actions ─── */
  const handleCall = useCallback(() => {
    if (!phone) return Alert.alert(t('orderDetail.noPhone'), t('orderDetail.noPhoneMsg'));
    Linking.openURL(`tel:${cleanPhone(phone)}`);
  }, [phone]);

  const handleWhatsApp = useCallback(() => {
    if (!phone) return Alert.alert(t('orderDetail.noPhone'), t('orderDetail.noPhoneMsg'));
    const msg = encodeURIComponent(
      `Hi ${order?.recipient_name || ''}, your order ${order?.order_number || ''} is on its way! 🚚`,
    );
    Linking.openURL(`https://wa.me/${cleanPhone(phone)}?text=${msg}`).catch(() =>
      Alert.alert(t('orderDetail.whatsapp'), t('orderDetail.whatsappError')),
    );
  }, [phone, order]);

  const handleSMS = useCallback(() => {
    if (!phone) return Alert.alert(t('orderDetail.noPhone'), t('orderDetail.noPhoneMsg'));
    const body = encodeURIComponent(
      `Hi ${order?.recipient_name || ''}, your order ${order?.order_number || ''} is on its way!`,
    );
    Linking.openURL(`sms:${cleanPhone(phone)}${Platform.OS === 'ios' ? '&' : '?'}body=${body}`);
  }, [phone, order]);

  const handleNavigate = useCallback(() => {
    if (order?.recipient_lat && order?.recipient_lng) {
      const url = Platform.select({
        ios: `maps:0,0?daddr=${order.recipient_lat},${order.recipient_lng}`,
        android: `google.navigation:q=${order.recipient_lat},${order.recipient_lng}`,
      });
      Linking.openURL(url);
      return;
    }
    if (!address) return Alert.alert(t('orderDetail.noAddress'), t('orderDetail.noDeliveryAddress'));
    Linking.openURL(`https://maps.apple.com/?daddr=${encodeURIComponent(address)}`);
  }, [address, order]);

  const handleCopy = useCallback(() => {
    const info = [
      order?.order_number && `Order: ${order.order_number}`,
      order?.awb_number && `AWB: ${order.awb_number}`,
      order?.recipient_name && `Recipient: ${order.recipient_name}`,
      phone && `Phone: ${phone}`,
      address && `Address: ${address}`,
      order?.payment_method && `Payment: ${order.payment_method.toUpperCase()}`,
      order?.total_amount && `Total: ${currency} ${order.total_amount}`,
    ].filter(Boolean).join('\n');
    if (info) {
      Clipboard.setString(info);
      Alert.alert(t('orderDetail.copied'), t('orderDetail.orderCopied'));
    }
  }, [order, phone, address]);

  const handleShare = useCallback(async () => {
    const info = [
      `📦 Order: ${order?.order_number || '---'}`,
      `🔖 AWB: ${order?.awb_number || '---'}`,
      `👤 ${order?.recipient_name || '---'}`,
      `📞 ${phone || '---'}`,
      `📍 ${address || '---'}`,
      `💰 ${order?.payment_method?.toUpperCase() || '---'} — ${currency} ${order?.total_amount || '0.00'}`,
    ].join('\n');
    try {
      await Share.share({message: info, title: `Order ${order?.order_number}`});
    } catch (_) {}
  }, [order, phone, address]);

  const handleCallSender = useCallback(() => {
    const sp = order?.sender_phone;
    if (!sp) return Alert.alert(t('orderDetail.noPhone'), t('orderDetail.noSenderPhone'));
    Linking.openURL(`tel:${cleanPhone(sp)}`);
  }, [order]);

  const handleNavigateToSender = useCallback(() => {
    if (order?.sender_lat && order?.sender_lng) {
      const url = Platform.select({
        ios: `maps:0,0?daddr=${order.sender_lat},${order.sender_lng}`,
        android: `google.navigation:q=${order.sender_lat},${order.sender_lng}`,
      });
      Linking.openURL(url);
      return;
    }
    const sAddr = order?.sender_address;
    if (!sAddr) return Alert.alert(t('orderDetail.noAddress'), t('orderDetail.noPickupAddress'));
    Linking.openURL(`https://maps.apple.com/?daddr=${encodeURIComponent(sAddr)}`);
  }, [order]);

  const handlePickupOrder = useCallback(async () => {
    Alert.alert(
      t('orderDetail.confirmPickup'),
      t('orderDetail.confirmPickupMsg', {sender: order?.sender_name || 'sender'}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('orderDetail.confirmPickupBtn'),
          onPress: async () => {
            if (!resolvedOrderId) return;
            const result = await startDeliveryAction(resolvedOrderId, {});
            if (result.success) {
              showMessage({message: t('orderDetail.orderPickedUp'), description: t('orderDetail.orderPickedUpDesc'), type: 'success'});
              fetchOrderDetail(resolvedOrderId);
            } else {
              Alert.alert(t('orderDetail.error'), result.error || t('orderDetail.failedToUpdate'));
            }
          },
        },
      ],
    );
  }, [order, resolvedOrderId, startDeliveryAction, fetchOrderDetail]);

  const handleNavigateToStop = useCallback((stop) => {
    if (stop?.lat && stop?.lng) {
      const url = Platform.select({
        ios: `maps:0,0?daddr=${stop.lat},${stop.lng}`,
        android: `google.navigation:q=${stop.lat},${stop.lng}`,
      });
      Linking.openURL(url);
      return;
    }
    if (stop?.address) {
      Linking.openURL(`https://maps.apple.com/?daddr=${encodeURIComponent(stop.address)}`);
    }
  }, []);

  /* ── Loading ─── */
  if (isLoading && !order) {
    return (
      <View style={[$.loadWrap, {paddingTop: ins.top}]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={$.loadTxt}>{t('orderDetail.loadingOrder')}</Text>
      </View>
    );
  }

  if (!isLoading && !order) {
    return (
      <View style={[$.loadWrap, {paddingTop: ins.top}]}>
        <Icon name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[$.loadTxt, {fontSize: 15, marginTop: 14}]}>{storeError || t('orderDetail.orderNotFound')}</Text>
        <TouchableOpacity
          style={{marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 10}}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}>
          <Text style={{fontFamily: fontFamily.bold, fontSize: 13, color: '#FFF'}}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCOD = order?.payment_method === 'cod';
  const hasCOD = isCOD && parseFloat(order?.cod_amount) > 0;
  const logs = order?.status_logs || [];

  return (
    <View style={[$.root, {paddingTop: ins.top}]}>
      {/* ── Header ── */}
      <View style={$.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={$.hdrBack}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{flex: 1, alignItems: 'center', marginHorizontal: 8}}>
          <Text style={$.hdrTitle}>{t('orderDetail.title')}</Text>
          <Text style={$.hdrSub}>{order?.order_number || '---'}</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={$.hdrAction}>
          <Icon name="share-variant-outline" size={19} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={$.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>

        {/* ── Hero Card — Status + Order # + Category ── */}
        <View style={$.heroCard}>
          <View style={$.heroTop}>
            <View style={[$.statusPill, {backgroundColor: getStatusBgColor(status)}]}>
              <Icon name={STATUS_ICONS[status] || 'package-variant'} size={13} color={getStatusColor(status)} />
              <Text style={[$.statusTxt, {color: getStatusColor(status)}]}>
                {(t('status.' + status) || status).toUpperCase()}
              </Text>
            </View>
            {order?.category && (
              <View style={[$.catBadge, {backgroundColor: catMeta.bg}]}>
                <Icon name={catMeta.icon} size={12} color={catMeta.color} />
                <Text style={[$.catTxt, {color: catMeta.color}]}>
                  {(order.category || '').charAt(0).toUpperCase() + (order.category || '').slice(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Order number + AWB */}
          <View style={$.heroMid}>
            <Text style={$.heroNum}>{order?.order_number || '---'}</Text>
            {order?.awb_number && (
              <TouchableOpacity
                style={$.awbRow}
                onPress={() => {
                  Clipboard.setString(order.awb_number);
                  Alert.alert(t('orderDetail.copied'), t('orderDetail.awbCopied'));
                }}>
                <Icon name="barcode" size={13} color={colors.textMuted} />
                <Text style={$.awbTxt}>{order.awb_number}</Text>
                <Icon name="content-copy" size={11} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick info row */}
          <View style={$.heroRow}>
            <HeroPill icon="calendar-clock" text={fmtDate(order?.created_at)} />
            <HeroPill
              icon={PAY_ICONS[order?.payment_method] || 'help-circle-outline'}
              text={(order?.payment_method || '---').toUpperCase()}
              accent={isCOD ? colors.warning : colors.info}
            />
            {order?.order_type && (
              <HeroPill icon="flash-outline" text={order.order_type === 'express' ? t('orderDetail.express') : t('orderDetail.standard')} />
            )}
          </View>
        </View>

        {/* ── COD Alert Banner ── */}
        {hasCOD && (
          <View style={$.codBanner}>
            <View style={$.codIc}>
              <Icon name="cash" size={18} color={colors.warning} />
            </View>
            <View style={{flex: 1}}>
              <Text style={$.codLabel}>{t('orderDetail.collectCOD')}</Text>
              <Text style={$.codAmt}>{currency} {parseFloat(order.cod_amount).toFixed(2)}</Text>
            </View>
            <Icon name="alert-circle-outline" size={16} color={colors.warning} style={{marginStart: 12}} />
          </View>
        )}

        {/* ── Financial Summary ── */}
        <View style={$.finCard}>
          <View style={$.finRow}>
            <Text style={$.finLabel}>{t('orderDetail.deliveryFee')}</Text>
            <Text style={$.finVal}>{currency} {parseFloat(order?.delivery_fee || 0).toFixed(2)}</Text>
          </View>
          {isCOD && (
            <View style={$.finRow}>
              <Text style={$.finLabel}>{t('orderDetail.codAmount')}</Text>
              <Text style={[$.finVal, {color: colors.warning}]}>
                {currency} {parseFloat(order?.cod_amount || 0).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={$.finDiv} />
          <View style={$.finRow}>
            <Text style={$.finTotalLabel}>{t('orderDetail.total')}</Text>
            <Text style={$.finTotalVal}>{currency} {parseFloat(order?.total_amount || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* ═══ STEP 1: PICKUP — Client/Sender Card (always shown first) ═══ */}
        <View style={[$.sectionCard, needsPickup && {borderWidth: 2, borderColor: '#1565C0'}]}>
          <View style={$.secHdrRow}>
            <View style={[$.secIc, {backgroundColor: needsPickup ? '#BBDEFB' : '#E3F1FD'}]}>
              <Icon name="store-outline" size={16} color="#1565C0" />
            </View>
            <View style={{flex: 1}}>
              <Text style={$.secH}>
                {needsPickup ? `① ${t('orderDetail.pickupFromClient')}` : t('orderDetail.pickupLocation')}
              </Text>
              {isPickedUp && (
                <Text style={{fontFamily: fontFamily.regular, fontSize: 10, color: colors.success, marginTop: 1}}>
                  ✓ {t('orderDetail.pickedUp')}
                </Text>
              )}
            </View>
            {needsPickup && (
              <View style={{backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10}}>
                <Text style={{fontFamily: fontFamily.bold, fontSize: 9, color: '#1565C0'}}>{t('orderDetail.pickUpFirst')}</Text>
              </View>
            )}
          </View>
          <View style={$.secDiv} />

          <View style={$.personInfo}>
            <View style={[$.avatar, {backgroundColor: '#E3F1FD'}]}>
              <Text style={[$.avatarTxt, {color: '#1565C0'}]}>
                {(order?.sender_name || order?.client_name || 'S').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{flex: 1, marginStart: 12}}>
              <Text style={$.personName}>{order?.sender_name || order?.client_name || '---'}</Text>
              {order?.sender_phone && (
                <TouchableOpacity onPress={handleCallSender} activeOpacity={0.6}>
                  <Text style={[$.personEmail, {color: colors.primary}]}>
                    {order.sender_phone}  <Icon name="phone-outline" size={11} color={colors.primary} />
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {order?.sender_address && (
            <TouchableOpacity style={$.infoRow} onPress={handleNavigateToSender} activeOpacity={0.6}>
              <Icon name="map-marker-outline" size={15} color="#1565C0" />
              <Text style={$.infoTxt} numberOfLines={2}>{order.sender_address}</Text>
              <Icon name="navigation-variant" size={14} color="#1565C0" />
            </TouchableOpacity>
          )}

          {/* Pickup action buttons */}
          {needsPickup && (
            <View style={{flexDirection: 'row', marginTop: 8}}>
              <TouchableOpacity
                style={{flex: 1, height: 40, backgroundColor: '#1565C0', borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}
                onPress={handleNavigateToSender}
                activeOpacity={0.75}>
                <Icon name="navigation-variant" size={15} color="#FFF" />
                <Text style={{fontFamily: fontFamily.bold, fontSize: 12, color: '#FFF', marginStart: 6}}>{t('orderDetail.navigateToPickup')}</Text>
              </TouchableOpacity>
              {order?.sender_phone && (
                <TouchableOpacity
                  style={{width: 40, height: 40, borderRadius: 10, backgroundColor: '#E3F1FD', justifyContent: 'center', alignItems: 'center', marginStart: 8}}
                  onPress={handleCallSender}
                  activeOpacity={0.75}>
                  <Icon name="phone" size={16} color="#1565C0" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ═══ STEP 2: DELIVERY STOPS — All recipients/stops ═══ */}
        {(stops.length > 0 || packages.length > 0) && (
          <View style={[$.sectionCard, isPickedUp && {borderWidth: 1, borderColor: colors.success}]}>
            <TouchableOpacity
              style={$.secHdrRow}
              onPress={() => setStopsExpanded(!stopsExpanded)}
              activeOpacity={0.7}>
              <View style={[$.secIc, {backgroundColor: isPickedUp ? '#E8F5E9' : '#FFF3E0'}]}>
                <Icon name="map-marker-path" size={16} color={isPickedUp ? '#2E7D32' : '#E65100'} />
              </View>
              <View style={{flex: 1}}>
                <Text style={$.secH}>
                  {isPickedUp ? `② ${t('orderDetail.deliveryStops')}` : t('orderDetail.deliveryStops')}
                </Text>
                <Text style={{fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, marginTop: 1}}>
                  {stops.length > 0 ? t('orderDetail.stopsCount', {count: stops.length}) : t('orderDetail.recipientsCount', {count: new Set(packages.map(p => p.recipient_name)).size})}
                </Text>
              </View>
              {(() => {
                const completed = stops.length > 0
                  ? stops.filter(s => s.status === 'completed').length
                  : packages.filter(p => p.status === 'delivered').length;
                const total = stops.length > 0 ? stops.length : new Set(packages.map(p => p.recipient_name)).size;
                return (
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.success}}>
                      {completed}/{total}
                    </Text>
                    <Icon
                      name={stopsExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textMuted}
                      style={{marginStart: 6}}
                    />
                  </View>
                );
              })()}
            </TouchableOpacity>

            {stopsExpanded && (
              <View style={{marginTop: 12}}>
                {/* Render order_stops if available */}
                {stops.length > 0 ? (
                  stops.map((stop, idx) => {
                    const isCompleted = stop.status === 'completed';
                    const isFailed = stop.status === 'failed';
                    const stopColor = isCompleted ? colors.success : isFailed ? colors.danger : colors.textPrimary;
                    return (
                      <View key={stop.id || idx} style={{
                        backgroundColor: isCompleted ? '#F0FFF4' : isFailed ? '#FFF5F5' : '#F8F9FA',
                        borderRadius: 12, padding: 12, marginBottom: 8,
                        borderWidth: 1, borderColor: isCompleted ? '#C6F6D5' : isFailed ? '#FED7D7' : '#EEF1F5',
                      }}>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                          <View style={{
                            width: 24, height: 24, borderRadius: 12,
                            backgroundColor: isCompleted ? colors.success : isFailed ? colors.danger : '#1565C0',
                            justifyContent: 'center', alignItems: 'center', marginEnd: 8,
                          }}>
                            <Text style={{fontFamily: fontFamily.bold, fontSize: 11, color: '#FFF'}}>
                              {isCompleted ? '✓' : isFailed ? '✗' : idx + 1}
                            </Text>
                          </View>
                          <View style={{flex: 1}}>
                            <Text style={{fontFamily: fontFamily.semiBold, fontSize: 13, color: stopColor}}>
                              {stop.contact_name || t('orderDetail.stopFallback', {idx: idx + 1})}
                            </Text>
                            {stop.contact_phone && (
                              <Text style={{fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted}}>
                                {stop.contact_phone}
                              </Text>
                            )}
                          </View>
                          <View style={{
                            backgroundColor: isCompleted ? '#DCFCE7' : isFailed ? '#FEE2E2' : '#E0F2FE',
                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                          }}>
                            <Text style={{
                              fontFamily: fontFamily.bold, fontSize: 9, textTransform: 'uppercase',
                              color: isCompleted ? colors.success : isFailed ? colors.danger : '#0369A1',
                            }}>
                              {t('status.' + (stop.status || 'pending'), (stop.status || 'pending'))}
                            </Text>
                          </View>
                        </View>

                        {stop.address && (
                          <TouchableOpacity
                            onPress={() => handleNavigateToStop(stop)}
                            activeOpacity={0.6}
                            style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                            <Icon name="map-marker-outline" size={13} color={colors.textMuted} />
                            <Text style={{fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, flex: 1, marginHorizontal: 6}} numberOfLines={2}>
                              {stop.address}
                            </Text>
                            <Icon name="navigation-variant" size={12} color={colors.primary} />
                          </TouchableOpacity>
                        )}

                        {parseFloat(stop.cod_amount) > 0 && (
                          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                            <Icon name="cash" size={12} color={colors.warning} />
                            <Text style={{fontFamily: fontFamily.regular, fontSize: 10, color: colors.warning, marginStart: 4}}>
                              COD: {currency} {parseFloat(stop.cod_amount).toFixed(2)}
                            </Text>
                          </View>
                        )}

                        {stop.special_instructions && (
                          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 3}}>
                            <Icon name="information-outline" size={12} color={colors.textMuted} />
                            <Text style={{fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, marginStart: 4}} numberOfLines={2}>
                              {stop.special_instructions}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  /* Fall back to grouping packages by recipient as stops */
                  (() => {
                    const recipientMap = {};
                    packages.forEach(pkg => {
                      const key = pkg.recipient_name || 'Unknown';
                      if (!recipientMap[key]) {
                        recipientMap[key] = {
                          name: pkg.recipient_name,
                          phone: pkg.recipient_phone,
                          address: pkg.address || pkg.recipient_address,
                          packages: [],
                        };
                      }
                      recipientMap[key].packages.push(pkg);
                    });
                    const recipients = Object.values(recipientMap);
                    return recipients.map((r, idx) => {
                      const allDelivered = r.packages.every(p => p.status === 'delivered');
                      const anyFailed = r.packages.some(p => p.status === 'failed');
                      const stopColor = allDelivered ? colors.success : anyFailed ? colors.danger : colors.textPrimary;
                      return (
                        <View key={`rcpt-${r.name || idx}`} style={{
                          backgroundColor: allDelivered ? '#F0FFF4' : '#F8F9FA',
                          borderRadius: 12, padding: 12, marginBottom: 8,
                          borderWidth: 1, borderColor: allDelivered ? '#C6F6D5' : '#EEF1F5',
                        }}>
                          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                            <View style={{
                              width: 24, height: 24, borderRadius: 12,
                              backgroundColor: allDelivered ? colors.success : '#1565C0',
                              justifyContent: 'center', alignItems: 'center', marginEnd: 8,
                            }}>
                              <Text style={{fontFamily: fontFamily.bold, fontSize: 11, color: '#FFF'}}>
                                {allDelivered ? '✓' : idx + 1}
                              </Text>
                            </View>
                            <View style={{flex: 1}}>
                              <Text style={{fontFamily: fontFamily.semiBold, fontSize: 13, color: stopColor}}>
                                {r.name || t('orderDetail.recipientFallback', {idx: idx + 1})}
                              </Text>
                              {r.phone && (
                                <Text style={{fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted}}>
                                  {r.phone}
                                </Text>
                              )}
                            </View>
                            <Text style={{fontFamily: fontFamily.semiBold, fontSize: 10, color: colors.textMuted}}>
                              {r.packages.filter(p => p.status === 'delivered').length}/{r.packages.length} {t('orderDetail.packages').toLowerCase()}
                            </Text>
                          </View>

                          {r.address && (
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                              <Icon name="map-marker-outline" size={13} color={colors.textMuted} />
                              <Text style={{fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, flex: 1, marginStart: 6}} numberOfLines={2}>
                                {r.address}
                              </Text>
                            </View>
                          )}

                          {r.packages.map((pkg, pi) => (
                            <View key={pkg.id || pi} style={{flexDirection: 'row', alignItems: 'center', marginTop: 3}}>
                              <Icon name="barcode" size={11} color={colors.textLight} />
                              <Text style={{fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, flex: 1, marginHorizontal: 6}}>
                                {pkg.barcode || `Pkg ${pi+1}`}
                              </Text>
                              <View style={{
                                backgroundColor: getStatusBgColor(pkg.status),
                                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
                              }}>
                                <Text style={{fontFamily: fontFamily.bold, fontSize: 8, color: getStatusColor(pkg.status), textTransform: 'uppercase'}}>
                                  {t('status.' + (pkg.status || 'pending'), (pkg.status || ''))}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      );
                    });
                  })()
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Recipient Card ── */}
        <View style={$.sectionCard}>
          <View style={$.secHdrRow}>
            <View style={[$.secIc, {backgroundColor: '#E8F5E9'}]}>
              <Icon name="account-outline" size={16} color="#2E7D32" />
            </View>
            <Text style={$.secH}>{t('orderDetail.recipient')}</Text>
          </View>
          <View style={$.secDiv} />

          <View style={$.personInfo}>
            <View style={$.avatar}>
              <Text style={$.avatarTxt}>
                {(order?.recipient_name || 'R').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{flex: 1, marginStart: 12}}>
              <Text style={$.personName}>{order?.recipient_name || '---'}</Text>
              {order?.recipient_email && (
                <Text style={$.personEmail}>{order.recipient_email}</Text>
              )}
            </View>
          </View>

          {/* Phone row — tappable */}
          {order?.recipient_phone && (
            <TouchableOpacity style={$.infoRow} onPress={handleCall} activeOpacity={0.6}>
              <Icon name="phone-outline" size={15} color={colors.primary} />
              <Text style={$.infoTxt}>{order.recipient_phone}</Text>
              <Icon name="chevron-right" size={14} color={colors.textLight} />
            </TouchableOpacity>
          )}

          {/* Address row — tappable */}
          {order?.recipient_address && (
            <TouchableOpacity style={$.infoRow} onPress={handleNavigate} activeOpacity={0.6}>
              <Icon name="map-marker-outline" size={15} color={colors.danger} />
              <Text style={$.infoTxt} numberOfLines={2}>{order.recipient_address}</Text>
              <Icon name="chevron-right" size={14} color={colors.textLight} />
            </TouchableOpacity>
          )}

          {order?.recipient_emirate && (
            <View style={$.infoRow}>
              <Icon name="city-variant-outline" size={15} color={colors.info} />
              <Text style={$.infoTxt}>{order.recipient_emirate}</Text>
            </View>
          )}
        </View>

        {/* ── Quick Actions — 5 buttons ── */}
        <View style={$.actCard}>
          <ActionCircle icon="phone" color="#244066" bg="#EEF1F5" label={t('orderDetail.call')} onPress={handleCall} />
          <ActionCircle icon="whatsapp" color="#25D366" bg="#E8F8EE" label={t('orderDetail.whatsapp')} onPress={handleWhatsApp} />
          <ActionCircle icon="message-text-outline" color="#10A6BA" bg="#E6FAFB" label={t('orderDetail.sms')} onPress={handleSMS} />
          <ActionCircle icon="navigation-variant" color="#15C7AE" bg="#E6FBF7" label={t('orderDetail.navigate')} onPress={handleNavigate} />
          <ActionCircle icon="content-copy" color="#787A7D" bg="#F1F3F5" label={t('orderDetail.copy')} onPress={handleCopy} />
        </View>

        {/* ── Packages Section ── */}
        {packages.length > 0 && (
          <View style={$.sectionCard}>
            <TouchableOpacity
              style={$.secHdrRow}
              onPress={() => setPkgExpanded(!pkgExpanded)}
              activeOpacity={0.7}>
              <View style={[$.secIc, {backgroundColor: '#EDE7F6'}]}>
                <Icon name="package-variant" size={16} color="#7B1FA2" />
              </View>
              <Text style={[$.secH, {flex: 1}]}>{t('orderDetail.packages')} ({packages.length})</Text>
              {/* Progress pill */}
              {(() => {
                const delivered = packages.filter(p => p.status === 'delivered').length;
                return (
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.success}}>
                      {delivered}/{packages.length}
                    </Text>
                    <Icon
                      name={pkgExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textMuted}
                      style={{marginStart: 4}}
                    />
                  </View>
                );
              })()}
            </TouchableOpacity>

            {/* Package progress bar */}
            <View style={{marginTop: 10, marginBottom: pkgExpanded ? 12 : 0}}>
              <View style={$.progressBar}>
                <View
                  style={[
                    $.progressFill,
                    {
                      width: `${Math.max(
                        (packages.filter(p => ['delivered', 'failed', 'returned'].includes(p.status)).length /
                          packages.length) * 100,
                        2,
                      )}%`,
                      backgroundColor: colors.success,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Expanded package cards */}
            {pkgExpanded &&
              packages.map((pkg, idx) => {
                const isTerminal = ['delivered', 'failed', 'returned', 'cancelled'].includes(pkg.status);
                const pkgStatusColor = getStatusColor(pkg.status);
                const pkgStatusBg = getStatusBgColor(pkg.status);
                return (
                  <View
                    key={pkg.id || idx}
                    style={{
                      backgroundColor: '#F8F9FA',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: '#EEF1F5',
                    }}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                      <Icon name="barcode" size={14} color={colors.textMuted} />
                      <Text
                        style={{
                          fontFamily: fontFamily.semiBold,
                          fontSize: 12,
                          color: colors.textPrimary,
                          marginStart: 6,
                          flex: 1,
                        }}>
                        {pkg.barcode || t('orderDetail.pkgFallback', {idx: idx + 1})}
                      </Text>
                      <View
                        style={{
                          backgroundColor: pkgStatusBg,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 10,
                        }}>
                        <Text
                          style={{
                            fontFamily: fontFamily.bold,
                            fontSize: 9,
                            color: pkgStatusColor,
                            textTransform: 'uppercase',
                          }}>
                          {t('status.' + (pkg.status || 'pending'), (pkg.status || ''))}
                        </Text>
                      </View>
                    </View>

                    {pkg.recipient_name && (
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 3}}>
                        <Icon name="account-outline" size={12} color={colors.textMuted} />
                        <Text style={{fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginStart: 6}}>
                          {pkg.recipient_name}
                        </Text>
                      </View>
                    )}
                    {pkg.recipient_address && (
                      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 3}}>
                        <Icon name="map-marker-outline" size={12} color={colors.textMuted} />
                        <Text
                          style={{fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, flex: 1, marginStart: 6}}
                          numberOfLines={1}>
                          {pkg.recipient_address}
                        </Text>
                      </View>
                    )}
                    {(pkg.weight_kg || pkg.cod_amount) && (
                      <View style={{flexDirection: 'row', marginTop: 2}}>
                        {pkg.weight_kg && (
                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Icon name="weight-kilogram" size={12} color={colors.textMuted} />
                            <Text style={{fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, marginStart: 4}}>
                              {pkg.weight_kg} kg
                            </Text>
                          </View>
                        )}
                        {parseFloat(pkg.cod_amount) > 0 && (
                          <View style={{flexDirection: 'row', alignItems: 'center', marginStart: 12}}>
                            <Icon name="cash" size={12} color={colors.warning} />
                            <Text style={{fontFamily: fontFamily.regular, fontSize: 10, color: colors.warning, marginStart: 4}}>
                              {currency} {parseFloat(pkg.cod_amount).toFixed(2)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Per-package CTA buttons */}
                    {!isTerminal && (status === 'in_transit' || status === 'picked_up') && (
                      <View style={{flexDirection: 'row', marginTop: 8}}>
                        <TouchableOpacity
                          style={{
                            flex: 1, height: 34, backgroundColor: colors.success, borderRadius: 8,
                            justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
                          }}
                          onPress={() =>
                            navigation.navigate(routeNames.PackageDeliver, {
                              packageId: pkg.id,
                              orderId: order?.id,
                              token: tkn,
                              codAmount: pkg.cod_amount || 0,
                              recipientName: pkg.recipient_name,
                              recipientAddress: pkg.recipient_address,
                              barcode: pkg.barcode,
                            })
                          }
                          activeOpacity={0.75}>
                          <Icon name="check-circle-outline" size={14} color="#FFF" />
                          <Text style={{fontFamily: fontFamily.bold, fontSize: 11, color: '#FFF', marginStart: 4}}>
                            {t('orderDetail.deliver')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            flex: 1, height: 34, borderRadius: 8,
                            justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
                            borderWidth: 1.5, borderColor: colors.danger, marginStart: 8,
                          }}
                          onPress={() =>
                            navigation.navigate(routeNames.PackageFail, {
                              packageId: pkg.id,
                              orderId: order?.id,
                              token: tkn,
                              barcode: pkg.barcode,
                              recipientName: pkg.recipient_name,
                            })
                          }
                          activeOpacity={0.75}>
                          <Icon name="close-circle-outline" size={14} color={colors.danger} />
                          <Text style={{fontFamily: fontFamily.bold, fontSize: 11, color: colors.danger, marginStart: 4}}>
                            {t('orderDetail.fail')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        )}

        {/* ── Package Details ── */}
        {(order?.category || order?.weight_kg || order?.special_instructions || order?.description) && (
          <View style={$.sectionCard}>
            <View style={$.secHdrRow}>
              <View style={[$.secIc, {backgroundColor: '#FFF3E0'}]}>
                <Icon name="package-variant-closed" size={16} color="#E65100" />
              </View>
              <Text style={$.secH}>{t('orderDetail.packageDetails')}</Text>
            </View>
            <View style={$.secDiv} />
            {order?.category && (
              <InfoRow icon="shape-outline" label={t('orderDetail.category')} value={order.category} />
            )}
            {order?.weight_kg && (
              <InfoRow icon="weight-kilogram" label={t('orderDetail.weight')} value={`${order.weight_kg} kg`} />
            )}
            {order?.dimensions && (
              <InfoRow icon="ruler-square" label={t('orderDetail.dimensions')} value={order.dimensions} />
            )}
            {order?.special_instructions && (
              <View style={$.instrBox}>
                <Icon name="information-outline" size={14} color={colors.warning} style={{marginTop: 2}} />
                <Text style={$.instrTxt}>{order.special_instructions}</Text>
              </View>
            )}
            {order?.description && (
              <View style={$.instrBox}>
                <Icon name="text-box-outline" size={14} color={colors.textMuted} style={{marginTop: 2}} />
                <Text style={[$.instrTxt, {color: colors.textSecondary}]}>{order.description}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Notes ── */}
        {order?.notes && (
          <View style={$.noteCard}>
            <Icon name="note-text-outline" size={15} color={colors.warning} />
            <Text style={$.noteTxt}>{order.notes}</Text>
          </View>
        )}

        {/* ── Status Timeline ── */}
        {logs.length > 0 && (
          <View style={$.sectionCard}>
            <View style={$.secHdrRow}>
              <View style={[$.secIc, {backgroundColor: '#EDE7F6'}]}>
                <Icon name="timeline-clock-outline" size={16} color="#7B1FA2" />
              </View>
              <Text style={$.secH}>{t('orderDetail.trackingTimeline')}</Text>
            </View>
            <View style={$.secDiv} />

            {logs.map((log, i) => {
              const isLast = i === logs.length - 1;
              const logColor = getStatusColor(log.status);
              return (
                <View key={log.id} style={$.tlRow}>
                  <View style={$.tlLeft}>
                    <View style={[$.tlDot, {backgroundColor: isLast ? logColor : colors.textLight}]} />
                    {!isLast && <View style={$.tlLine} />}
                  </View>
                  <View style={[$.tlContent, !isLast && {paddingBottom: 16}]}>
                    <View style={$.tlHdr}>
                      <Text style={[$.tlStatus, isLast && {color: logColor}]}>
                        {t('status.' + log.status) || log.status}
                      </Text>
                      <Text style={$.tlTime}>{fmtTime(log.created_at)}</Text>
                    </View>
                    {log.note && <Text style={$.tlNote}>{log.note}</Text>}
                    {log.changed_by_name && (
                      <Text style={$.tlBy}>{t('orderDetail.by', {name: log.changed_by_name})}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Status Progress Bar ── */}
        {status !== 'failed' && status !== 'cancelled' && status !== 'returned' && (
          <View style={$.progressCard}>
            <Text style={$.progressLabel}>{t('orderDetail.deliveryProgress')}</Text>
            <View style={$.progressBar}>
              <View
                style={[
                  $.progressFill,
                  {
                    width: `${Math.max(((statusIdx + 1) / STATUS_FLOW.length) * 100, 8)}%`,
                    backgroundColor: getStatusColor(status),
                  },
                ]}
              />
            </View>
            <View style={$.progressDots}>
              {STATUS_FLOW.map((s, i) => (
                <View key={s} style={$.progressDotWrap}>
                  <View
                    style={[
                      $.progressDotItem,
                      i <= statusIdx
                        ? {backgroundColor: getStatusColor(status)}
                        : {backgroundColor: '#E0E0E0'},
                    ]}
                  />
                  <Text style={[$.progressDotLabel, i <= statusIdx && {color: colors.textPrimary}]}>
                    {t('status.' + s)?.split(' ')[0] || s}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{height: 20}} />
      </ScrollView>

      {/* ── Bottom CTA ── */}
      {(status === 'assigned' || status === 'confirmed' || status === 'picked_up' || status === 'in_transit') && (
        <View style={[$.bottom, {paddingBottom: ins.bottom + 10}]}>
          {/* Report Failure button for in_transit */}
          {status === 'in_transit' && (
            <TouchableOpacity
              style={$.ctaFail}
              onPress={() => {
                if (packages.length > 0) {
                  const undelivered = packages.find(
                    p => !['delivered', 'failed', 'returned', 'cancelled'].includes(p.status),
                  );
                  if (undelivered) {
                    navigation.navigate(routeNames.PackageFail, {
                      packageId: undelivered.id,
                      orderId: order?.id,
                      token: tkn,
                      barcode: undelivered.barcode,
                      recipientName: undelivered.recipient_name,
                    });
                    return;
                  }
                }
                navigation.navigate(routeNames.FailureReport, {token: tkn, orderId: order?.id});
              }}
              activeOpacity={0.75}>
              <Icon name="close-circle-outline" size={17} color={colors.danger} />
              <Text style={$.ctaFailTxt}>{t('orderDetail.reportFailure')}</Text>
            </TouchableOpacity>
          )}

          {/* Main CTA — changes based on pickup-first workflow */}
          {needsPickup ? (
            /* STEP 1: Pick Up Order from Sender */
            <TouchableOpacity
              style={[$.cta, {backgroundColor: '#1565C0'}]}
              onPress={handlePickupOrder}
              disabled={isUpdatingStatus}
              activeOpacity={0.75}>
              <Icon name="package-variant" size={18} color="#FFF" />
              <Text style={[$.ctaTxt, {marginStart: 8}]}>
                {isUpdatingStatus ? t('orderDetail.pickingUp') : t('orderDetail.pickUpFromClient')}
              </Text>
            </TouchableOpacity>
          ) : (
            /* STEP 2: Deliver packages / stops */
            <TouchableOpacity
              style={$.cta}
              onPress={() => {
                if (packages.length > 0 && (status === 'in_transit' || status === 'picked_up')) {
                  const undelivered = packages.find(
                    p => !['delivered', 'failed', 'returned', 'cancelled'].includes(p.status),
                  );
                  if (undelivered) {
                    navigation.navigate(routeNames.PackageDeliver, {
                      packageId: undelivered.id,
                      orderId: order?.id,
                      token: tkn,
                      codAmount: undelivered.cod_amount || 0,
                      recipientName: undelivered.recipient_name,
                      recipientAddress: undelivered.recipient_address,
                      barcode: undelivered.barcode,
                    });
                    return;
                  }
                }
                navigation.navigate(routeNames.DeliveryConfirm, {
                  token: tkn,
                  orderId: order?.id,
                  codAmount: order?.cod_amount || 0,
                });
              }}
              activeOpacity={0.75}>
              <Text style={$.ctaTxt}>
                {packages.length > 0
                  ? t('orderDetail.deliverNextPkg', {count: packages.filter(p => !['delivered', 'failed', 'returned', 'cancelled'].includes(p.status)).length})
                  : status === 'in_transit'
                    ? t('orderDetail.confirmDelivery')
                    : t('orderDetail.startDelivery')}
              </Text>
              <Icon name="arrow-right" size={18} color="#FFF" style={{marginStart: 8}} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

/* ── Sub-components ───────────────────────────────────────── */
const HeroPill = ({icon, text, accent}) => (
  <View style={$.heroPill}>
    <Icon name={icon} size={12} color={accent || colors.textMuted} />
    <Text style={[$.heroPillTxt, accent && {color: accent}]}>{text}</Text>
  </View>
);

const ActionCircle = ({icon, color, bg, label, onPress}) => (
  <TouchableOpacity style={$.actBtn} activeOpacity={0.6} onPress={onPress}>
    <View style={[$.actIc, {backgroundColor: bg}]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <Text style={$.actLabel}>{label}</Text>
  </TouchableOpacity>
);

const InfoRow = ({icon, label, value}) => (
  <View style={$.detailRow}>
    <Icon name={icon} size={14} color={colors.textMuted} />
    <Text style={$.detailLabel}>{label}</Text>
    <Text style={$.detailVal}>{value}</Text>
  </View>
);

/* ── Styles ───────────────────────────────────────────────── */
const $ = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  loadWrap: {flex: 1, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center'},
  loadTxt: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted, marginTop: 10},

  /* Header */
  hdr: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52,
  },
  hdrBack: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 15, color: colors.textPrimary, textAlign: 'auto'},
  hdrSub: {fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted, marginTop: 1},
  hdrAction: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#EEF1F5',
  },

  scroll: {paddingHorizontal: 16, paddingBottom: 120},

  /* Hero Card */
  heroCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.04, shadowRadius: 8,
    elevation: 2,
  },
  heroTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusTxt: {fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.6, marginStart: 6},
  catBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14,
  },
  catTxt: {fontFamily: fontFamily.semiBold, fontSize: 10, marginStart: 6},
  heroMid: {marginBottom: 12},
  heroNum: {fontFamily: fontFamily.bold, fontSize: 18, color: colors.textPrimary, letterSpacing: 0.3},
  awbRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 4,
  },
  awbTxt: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.textMuted, marginHorizontal: 6},
  heroRow: {flexDirection: 'row', flexWrap: 'wrap'},
  heroPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F7FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    marginEnd: 8, marginBottom: 4,
  },
  heroPillTxt: {fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted, marginStart: 6},

  /* COD Banner */
  codBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF7E6', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFE0B2', marginBottom: 10,
  },
  codIc: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center', marginEnd: 12,
  },
  codLabel: {fontFamily: fontFamily.medium, fontSize: 11, color: '#E65100'},
  codAmt: {fontFamily: fontFamily.bold, fontSize: 18, color: '#E65100', marginTop: 1},

  /* Financial */
  finCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  finRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4,
  },
  finLabel: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted},
  finVal: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.textPrimary},
  finDiv: {height: 1, backgroundColor: '#EEF1F5', marginVertical: 6},
  finTotalLabel: {fontFamily: fontFamily.bold, fontSize: 13, color: colors.textPrimary},
  finTotalVal: {fontFamily: fontFamily.bold, fontSize: 15, color: colors.primary},

  /* Section Card */
  sectionCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.03, shadowRadius: 6,
    elevation: 1,
  },
  secHdrRow: {flexDirection: 'row', alignItems: 'center'},
  secIc: {
    width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    marginEnd: 14,
  },
  secH: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary},
  secDiv: {height: 1, backgroundColor: '#EEF1F5', marginVertical: 12},

  /* Person info */
  personInfo: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarTxt: {fontFamily: fontFamily.bold, fontSize: 16, color: '#2E7D32'},
  personName: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary},
  personEmail: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 1},

  /* Info rows */
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F9FA', borderRadius: 10, padding: 11, marginBottom: 6,
  },
  infoTxt: {flex: 1, fontFamily: fontFamily.medium, fontSize: 12, color: colors.textPrimary, marginHorizontal: 10},

  /* Action buttons */
  actCard: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.03, shadowRadius: 6,
    elevation: 1,
  },
  actBtn: {alignItems: 'center', flex: 1},
  actIc: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  actLabel: {fontFamily: fontFamily.medium, fontSize: 9, color: colors.textSecondary, marginTop: 5},

  /* Detail rows */
  detailRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
  },
  detailLabel: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, flex: 0.4, marginStart: 12},
  detailVal: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.textPrimary, flex: 0.55, textAlign: 'right'},

  /* Instructions box */
  instrBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF7E6', borderRadius: 8, padding: 10, marginTop: 6,
  },
  instrTxt: {flex: 1, fontFamily: fontFamily.regular, fontSize: 11, color: '#E65100', lineHeight: 16, marginStart: 8},

  /* Notes card */
  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFDE7', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFF9C4', marginBottom: 10,
  },
  noteTxt: {flex: 1, fontFamily: fontFamily.regular, fontSize: 12, color: '#827717', lineHeight: 17, marginStart: 10},

  /* Timeline */
  tlRow: {flexDirection: 'row'},
  tlLeft: {width: 24, alignItems: 'center'},
  tlDot: {
    width: 10, height: 10, borderRadius: 5, marginTop: 4,
  },
  tlLine: {
    width: 2, flex: 1, backgroundColor: '#E0E0E0', marginTop: 3,
  },
  tlContent: {flex: 1, marginStart: 10},
  tlHdr: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  tlStatus: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textPrimary},
  tlTime: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted},
  tlNote: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2},
  tlBy: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textLight, marginTop: 1},

  /* Progress bar */
  progressCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  progressLabel: {fontFamily: fontFamily.bold, fontSize: 12, color: colors.textPrimary, marginBottom: 10},
  progressBar: {
    height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden', marginBottom: 10,
  },
  progressFill: {height: '100%', borderRadius: 3},
  progressDots: {flexDirection: 'row', justifyContent: 'space-between'},
  progressDotWrap: {alignItems: 'center', flex: 1},
  progressDotItem: {width: 8, height: 8, borderRadius: 4, marginBottom: 4},
  progressDotLabel: {fontFamily: fontFamily.regular, fontSize: 8, color: colors.textLight, textAlign: 'center'},

  /* Bottom CTA */
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF1F5',
    shadowColor: '#000', shadowOffset: {width: 0, height: -3}, shadowOpacity: 0.05, shadowRadius: 6,
  },
  ctaFail: {
    height: 44, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.danger, marginBottom: 8,
    backgroundColor: '#FFF',
  },
  ctaFailTxt: {fontFamily: fontFamily.bold, fontSize: 13, color: colors.danger, marginStart: 6},
  cta: {
    height: 50, backgroundColor: colors.primary, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.25, shadowRadius: 8,
  },
  ctaTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF'},
});

export default OrderDetailScreen;
