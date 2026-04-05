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
const STATUS_FLOW = ['pending', 'confirmed', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'];
// STATUS_LABELS now uses t('status.*') inside component
const STATUS_ICONS = {
  pending: 'clock-outline',
  confirmed: 'check-circle-outline',
  assigned: 'account-check-outline',
  accepted: 'check-decagram',
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

const fmtDate = (d, lang) => {
  if (!d) return '---';
  const dt = new Date(d.replace(' ', 'T'));
  if (isNaN(dt)) return d;
  const locale = lang === 'ar' ? 'ar-AE' : 'en-AE';
  return dt.toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtTime = (d) => {
  if (!d) return '';
  const dt = new Date(d.replace(' ', 'T'));
  if (isNaN(dt)) return d;
  return dt.toLocaleTimeString('en-AE', {hour: '2-digit', minute: '2-digit'});
};

const fmtDateTime = (d, lang) => {
  if (!d) return '';
  const dt = new Date(d.replace(' ', 'T'));
  if (isNaN(dt)) return d;
  const locale = lang === 'ar' ? 'ar-AE' : 'en-AE';
  return dt.toLocaleDateString(locale, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const cleanPhone = (p) => (p || '').replace(/[\s\-()]/g, '');

/* ── Main Component ───────────────────────────────────────── */
const OrderDetailScreen = ({navigation, route}) => {
  const {t, i18n} = useTranslation();
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
  const acceptOrderAction = useOrderStore(st => st.acceptOrder);
  const returnOrderAction = useOrderStore(st => st.returnOrder);
  const isUpdatingStatus = useOrderStore(st => st.isUpdatingStatus);
  const storeError = useOrderStore(st => st.error);
  const [refreshing, setRefreshing] = useState(false);
  const [pkgExpanded, setPkgExpanded] = useState(false);
  const [stopsExpanded, setStopsExpanded] = useState(true);

  const orders = useOrderStore(st => st.orders);
  const setSelectedOrder = useOrderStore(st => st.setSelectedOrder);

  const order = selectedOrder;
  const status = order?.status || 'pending';
  const stops = order?.stops || [];
  const isPickedUp = ['picked_up', 'in_transit', 'delivered'].includes(status);
  const needsPickup = status === 'assigned' || status === 'confirmed' || status === 'accepted';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdParam, tkn, fetchOrderDetail, clearPackages]);

  // Fetch packages when order is loaded — clear stale packages first
  useEffect(() => {
    if (order?.id) {
      clearPackages();
      fetchPackages(order.id);
    }
  }, [order?.id, fetchPackages, clearPackages]);

  // Re-fetch packages when screen regains focus (after deliver/fail)
  useFocusEffect(
    useCallback(() => {
      // Only re-fetch if we already have an order (not the initial load)
      if (!order?.id) return;
      fetchPackages(order.id);
    }, [order?.id, fetchPackages]),
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
      `Total: ${currency} ${(parseFloat(order?.total_amount || 0) || (parseFloat(order?.delivery_fee || 0) + parseFloat(order?.cod_amount || 0))).toFixed(2)}`,
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
      `💰 ${order?.payment_method?.toUpperCase() || '---'} — ${currency} ${(parseFloat(order?.total_amount || 0) || (parseFloat(order?.delivery_fee || 0) + parseFloat(order?.cod_amount || 0))).toFixed(2)}`,
    ].join('\n');
    try {
      await Share.share({message: info, title: `Order ${order?.order_number}`});
    } catch (_) {}
  }, [order, phone, address]);

  const handleCallSender = useCallback(() => {
    const sp = order?.sender_phone;
    if (!sp) return Alert.alert(t('orderDetail.noPhone'), t('orderDetail.noSenderPhone'));
    Linking.openURL(`tel:${cleanPhone(sp)}`).catch(() => {});
  }, [order]);

  const handleNavigateToSender = useCallback(() => {
    if (order?.sender_lat && order?.sender_lng) {
      const url = Platform.select({
        ios: `maps:0,0?daddr=${order.sender_lat},${order.sender_lng}`,
        android: `google.navigation:q=${order.sender_lat},${order.sender_lng}`,
      });
      Linking.openURL(url).catch(() => {});
      return;
    }
    const sAddr = order?.sender_address;
    if (!sAddr) return Alert.alert(t('orderDetail.noAddress'), t('orderDetail.noPickupAddress'));
    Linking.openURL(`https://maps.apple.com/?daddr=${encodeURIComponent(sAddr)}`).catch(() => {});
  }, [order]);

  const handleAcceptOrder = useCallback(async () => {
    if (!resolvedOrderId) return;
    const result = await acceptOrderAction(resolvedOrderId);
    if (result.success) {
      showMessage({message: t('orderDetail.orderAccepted'), type: 'success'});
      fetchOrderDetail(resolvedOrderId);
    } else {
      Alert.alert(t('common.error'), result.error || t('orderDetail.acceptFailed'));
    }
  }, [resolvedOrderId, acceptOrderAction, fetchOrderDetail]);

  const handleStartDelivery = useCallback(async () => {
    if (!resolvedOrderId) return;
    const result = await startDeliveryAction(resolvedOrderId);
    if (result.success) {
      showMessage({message: t('orderDetail.deliveryStarted'), type: 'success'});
      fetchOrderDetail(resolvedOrderId);
    } else {
      Alert.alert(t('common.error'), result.error || t('orderDetail.startDeliveryFailed'));
    }
  }, [resolvedOrderId, startDeliveryAction, fetchOrderDetail]);

  const handleReturnOrder = useCallback(() => {
    navigation.navigate(routeNames.ReturnOrder, {token: tkn, orderId: order?.id});
  }, [navigation, order, tkn]);

  const handleReportFailure = useCallback(() => {
    if (packages.length > 0 && (status === 'in_transit' || status === 'picked_up')) {
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
  }, [navigation, order, tkn, packages, status]);

  const handleConfirmDelivery = useCallback(async () => {
    // Auto-transition picked_up → in_transit silently before delivery flow
    if (status === 'picked_up') {
      try {
        await startDeliveryAction(order?.id, {
          lat: undefined, lng: undefined,
        });
      } catch (_) {
        // Continue even if transition fails — backend /deliver also accepts picked_up
      }
    }

    if (packages.length > 0) {
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
      // All packages already in terminal state — order may already be delivered
      showMessage({message: t('orderDetail.allPackagesComplete', 'All packages have been processed'), type: 'success'});
      fetchOrderDetail(order?.id);
      return;
    }
    navigation.navigate(routeNames.DeliveryConfirm, {
      token: tkn,
      orderId: order?.id,
      codAmount: order?.cod_amount || 0,
      orderStatus: 'in_transit', // Always pass in_transit since we auto-transitioned
    });
  }, [navigation, order, tkn, packages, status, startDeliveryAction, fetchOrderDetail, t]);

  const handlePickupOrder = useCallback(async () => {
    // Navigate to the proper pickup workflow screen
    navigation.navigate(routeNames.PickupDetail, {
      pickup: {
        id: resolvedOrderId,
        order_id: resolvedOrderId,
        order_number: order?.order_number,
        status: order?.pickup_status || 'pending',
        sender_name: order?.sender_name,
        sender_phone: order?.sender_phone,
        sender_address: order?.sender_address,
        sender_lat: order?.sender_lat,
        sender_lng: order?.sender_lng,
        recipient_name: order?.recipient_name,
        recipient_address: order?.recipient_address,
        pickup_notes: order?.pickup_notes,
        pickup_scheduled_at: order?.pickup_scheduled_at,
        scheduled_at: order?.scheduled_at || order?.pickup_scheduled_at,
        client_name: order?.client_name,
        category: order?.category,
        total_packages: order?.total_packages,
        weight_kg: order?.weight_kg,
        description: order?.description,
        payment_method: order?.payment_method,
      },
    });
  }, [order, resolvedOrderId, navigation]);

  const handleNavigateToStop = useCallback((stop) => {
    if (stop?.lat && stop?.lng) {
      const url = Platform.select({
        ios: `maps:0,0?daddr=${stop.lat},${stop.lng}`,
        android: `google.navigation:q=${stop.lat},${stop.lng}`,
      });
      Linking.openURL(url).catch(() => {});
      return;
    }
    if (stop?.address) {
      Linking.openURL(`https://maps.apple.com/?daddr=${encodeURIComponent(stop.address)}`).catch(() => {});
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
            <HeroPill icon="calendar-clock" text={fmtDate(order?.created_at, i18n.language)} />
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
            <Text style={$.finTotalVal}>{currency} {(parseFloat(order?.total_amount || 0) || (parseFloat(order?.delivery_fee || 0) + parseFloat(order?.cod_amount || 0))).toFixed(2)}</Text>
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
                      <View key={`stop-${stop.id || idx}-${idx}`} style={{
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
        {(order?.category || order?.weight_kg || order?.special_instructions || order?.description || packages.length > 0) && (
          <View style={$.sectionCard}>
            <View style={$.secHdrRow}>
              <View style={[$.secIc, {backgroundColor: '#FFF3E0'}]}>
                <Icon name="package-variant-closed" size={16} color="#E65100" />
              </View>
              <Text style={$.secH}>
                {packages.length > 1
                  ? t('orderDetail.packageDetailsPlural', 'Package(s) Details')
                  : t('orderDetail.packageDetails')}
              </Text>
              {packages.length > 1 && (
                <View style={$.pkgCountBadge}>
                  <Text style={$.pkgCountTxt}>{packages.length}</Text>
                </View>
              )}
            </View>
            <View style={$.secDiv} />

            {packages.length > 1 ? (
              /* ── Multi-package: show each package's details ── */
              packages.map((pkg, idx) => {
                const pkgStatusColor = getStatusColor(pkg.status);
                const pkgStatusBg = getStatusBgColor(pkg.status);
                return (
                  <View key={pkg.id || idx} style={$.pkgDetailCard}>
                    <View style={$.pkgDetailHeader}>
                      <View style={$.pkgDetailHeaderLeft}>
                        <Icon name="package-variant" size={14} color={colors.primary} />
                        <Text style={$.pkgDetailTitle}>
                          {pkg.barcode || t('orderDetail.pkgFallback', {idx: idx + 1})}
                        </Text>
                      </View>
                      <View style={[$.pkgStatusChip, {backgroundColor: pkgStatusBg}]}>
                        <Text style={[$.pkgStatusTxt, {color: pkgStatusColor}]}>
                          {t('status.' + (pkg.status || 'pending'), (pkg.status || ''))}
                        </Text>
                      </View>
                    </View>

                    {(pkg.category || order?.category) && (
                      <InfoRow icon="shape-outline" label={t('orderDetail.category')} value={pkg.category || order.category} />
                    )}
                    {(pkg.weight_kg || order?.weight_kg) && (
                      <InfoRow icon="weight-kilogram" label={t('orderDetail.weight')} value={`${pkg.weight_kg || order.weight_kg} kg`} />
                    )}
                    {(pkg.dimensions || order?.dimensions) && (
                      <InfoRow icon="ruler-square" label={t('orderDetail.dimensions')} value={pkg.dimensions || order.dimensions} />
                    )}
                    {pkg.recipient_name && (
                      <InfoRow icon="account-outline" label={t('orderDetail.recipient')} value={pkg.recipient_name} />
                    )}
                    {parseFloat(pkg.cod_amount) > 0 && (
                      <InfoRow icon="cash" label={t('orderDetail.codAmount')} value={`${currency} ${parseFloat(pkg.cod_amount).toFixed(2)}`} />
                    )}
                    {pkg.description && (
                      <View style={$.instrBox}>
                        <Icon name="text-box-outline" size={14} color={colors.textMuted} style={{marginTop: 2}} />
                        <Text style={[$.instrTxt, {color: colors.textSecondary}]}>{pkg.description}</Text>
                      </View>
                    )}
                    {idx < packages.length - 1 && <View style={$.pkgDivider} />}
                  </View>
                );
              })
            ) : (
              /* ── Single package / order-level details ── */
              <>
                {order?.category && (
                  <InfoRow icon="shape-outline" label={t('orderDetail.category')} value={order.category} />
                )}
                {order?.weight_kg && (
                  <InfoRow icon="weight-kilogram" label={t('orderDetail.weight')} value={`${order.weight_kg} kg`} />
                )}
                {order?.dimensions && (
                  <InfoRow icon="ruler-square" label={t('orderDetail.dimensions')} value={order.dimensions} />
                )}
              </>
            )}

            {/* Order-level instructions & description — only for single-package view */}
            {packages.length <= 1 && (
              <>
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
              </>
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

            {[...logs].reverse().map((log, i, arr) => {
              const isFirst = i === 0;
              const isLast = i === arr.length - 1;

              // Derive a display label — pickup actions log the order status but the
              // note describes what actually happened, so use the note as label instead
              const pickupNoteMap = {
                'Driver en route to pickup': {label: t('orderDetail.tlEnRoute', 'En Route to Pickup'), icon: 'truck-fast-outline', color: '#1565C0'},
                'Driver arrived at pickup location': {label: t('orderDetail.tlArrived', 'Arrived at Pickup'), icon: 'map-marker-check-outline', color: '#00796B'},
                'Pickup confirmed by driver.': {label: t('status.picked_up'), icon: 'package-variant-closed', color: getStatusColor('picked_up')},
              };
              const override = pickupNoteMap[log.note];
              const displayLabel = override?.label || (t('status.' + log.status) || log.status);
              const logColor = override?.color || getStatusColor(log.status);

              return (
                <View key={`log-${log.id}-${i}`} style={$.tlRow}>
                  <View style={$.tlLeft}>
                    <View style={[
                      $.tlDot,
                      {backgroundColor: logColor},
                      isFirst && $.tlDotActive,
                    ]} />
                    {!isLast && <View style={[$.tlLine, {backgroundColor: logColor + '30'}]} />}
                  </View>
                  <View style={[$.tlContent, !isLast && {paddingBottom: 18}]}>
                    <View style={$.tlHdr}>
                      <Text style={[$.tlStatus, {color: logColor}]}>
                        {displayLabel}
                      </Text>
                      <Text style={$.tlTime}>{fmtDateTime(log.created_at, i18n.language)}</Text>
                    </View>
                    {log.note && !override && <Text style={$.tlNote}>{log.note}</Text>}
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
      {(status === 'assigned' || status === 'accepted' || status === 'confirmed' || status === 'picked_up' || status === 'in_transit') && (
        <View style={[$.bottom, {paddingBottom: ins.bottom + 10}]}>

          {/* ── STATUS: assigned ── */}
          {status === 'assigned' && (
            <>
              <TouchableOpacity
                style={$.ctaPrimary}
                onPress={handleAcceptOrder}
                disabled={isUpdatingStatus}
                activeOpacity={0.85}>
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <View style={$.ctaInner}>
                    <View style={$.ctaIconCircle}>
                      <Icon name="check-decagram" size={20} color="#FFF" />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={$.ctaPrimaryTxt}>{t('orderDetail.acceptOrder')}</Text>
                      <Text style={$.ctaSubTxt}>{t('orderDetail.navigateToPickup')}</Text>
                    </View>
                    <Icon name="arrow-right" size={22} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={$.ctaSecondaryRow}>
                <TouchableOpacity style={$.ctaSecondary} onPress={handleNavigateToSender} activeOpacity={0.7}>
                  <View style={[$.ctaSecIcon, {backgroundColor: colors.primary + '12'}]}>
                    <Icon name="navigation-variant" size={16} color={colors.primary} />
                  </View>
                  <Text style={$.ctaSecTxt}>{t('orderDetail.navigate')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[$.ctaSecondary, {marginLeft: 10}]} onPress={handleReportFailure} activeOpacity={0.7}>
                  <View style={[$.ctaSecIcon, {backgroundColor: colors.danger + '12'}]}>
                    <Icon name="alert-circle-outline" size={16} color={colors.danger} />
                  </View>
                  <Text style={[$.ctaSecTxt, {color: colors.danger}]}>{t('orderDetail.reportProblem')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── STATUS: accepted / confirmed ── */}
          {(status === 'accepted' || status === 'confirmed') && (
            <>
              <TouchableOpacity
                style={[$.ctaPrimary, {backgroundColor: '#1565C0'}]}
                onPress={handlePickupOrder}
                activeOpacity={0.85}>
                <View style={$.ctaInner}>
                  <View style={[$.ctaIconCircle, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                    <Icon name="package-variant" size={20} color="#FFF" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={$.ctaPrimaryTxt}>{t('orderDetail.pickUpFromClient')}</Text>
                    <Text style={$.ctaSubTxt}>{t('orderDetail.navigateToPickup')}</Text>
                  </View>
                  <Icon name="arrow-right" size={22} color="#FFF" />
                </View>
              </TouchableOpacity>
              <View style={$.ctaSecondaryRow}>
                <TouchableOpacity style={$.ctaSecondary} onPress={handleNavigateToSender} activeOpacity={0.7}>
                  <View style={[$.ctaSecIcon, {backgroundColor: colors.primary + '12'}]}>
                    <Icon name="navigation-variant" size={16} color={colors.primary} />
                  </View>
                  <Text style={$.ctaSecTxt}>{t('orderDetail.navigate')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[$.ctaSecondary, {marginLeft: 10}]} onPress={handleReportFailure} activeOpacity={0.7}>
                  <View style={[$.ctaSecIcon, {backgroundColor: colors.danger + '12'}]}>
                    <Icon name="alert-circle-outline" size={16} color={colors.danger} />
                  </View>
                  <Text style={[$.ctaSecTxt, {color: colors.danger}]}>{t('orderDetail.reportProblem')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── STATUS: picked_up OR in_transit — unified "Confirm Delivery" ── */}
          {(status === 'picked_up' || status === 'in_transit') && (
            <>
              <TouchableOpacity
                style={[$.ctaPrimary, {backgroundColor: '#15C7AE'}]}
                onPress={handleConfirmDelivery}
                activeOpacity={0.85}>
                <View style={$.ctaInner}>
                  <View style={[$.ctaIconCircle, {backgroundColor: 'rgba(255,255,255,0.25)'}]}>
                    <Icon name="check-circle-outline" size={20} color="#FFF" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={$.ctaPrimaryTxt}>
                      {packages.length > 0 && packages.filter(p => !['delivered', 'failed', 'returned', 'cancelled'].includes(p.status)).length > 0
                        ? t('orderDetail.deliverNextPkg', {count: packages.filter(p => !['delivered', 'failed', 'returned', 'cancelled'].includes(p.status)).length})
                        : t('orderDetail.confirmDelivery')}
                    </Text>
                    <Text style={$.ctaSubTxt}>
                      {packages.length > 0 && packages.filter(p => !['delivered', 'failed', 'returned', 'cancelled'].includes(p.status)).length > 0
                        ? t('orderDetail.navigateToRecipient')
                        : t('orderDetail.allPkgsDone', 'All packages done — confirm now')}
                    </Text>
                  </View>
                  <Icon name="arrow-right" size={22} color="#FFF" />
                </View>
              </TouchableOpacity>
              <View style={$.ctaQuickActions}>
                <TouchableOpacity style={$.ctaQuickBtn} onPress={handleNavigate} activeOpacity={0.7}>
                  <View style={[$.ctaQuickIcon, {backgroundColor: '#E8F4FD'}]}>
                    <Icon name="navigation-variant" size={18} color="#1976D2" />
                  </View>
                  <Text style={[$.ctaQuickLabel, {color: '#1976D2'}]}>{t('orderDetail.navigate')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={$.ctaQuickBtn} onPress={handleCall} activeOpacity={0.7}>
                  <View style={[$.ctaQuickIcon, {backgroundColor: '#E8F5E9'}]}>
                    <Icon name="phone-outline" size={18} color="#2E7D32" />
                  </View>
                  <Text style={[$.ctaQuickLabel, {color: '#2E7D32'}]}>{t('orderDetail.call')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={$.ctaQuickBtn} onPress={handleWhatsApp} activeOpacity={0.7}>
                  <View style={[$.ctaQuickIcon, {backgroundColor: '#E8F5E9'}]}>
                    <Icon name="whatsapp" size={18} color="#25D366" />
                  </View>
                  <Text style={[$.ctaQuickLabel, {color: '#25D366'}]}>{t('orderDetail.whatsapp')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={$.ctaQuickBtn} onPress={handleSMS} activeOpacity={0.7}>
                  <View style={[$.ctaQuickIcon, {backgroundColor: '#FFF3E0'}]}>
                    <Icon name="message-text-outline" size={18} color="#E65100" />
                  </View>
                  <Text style={[$.ctaQuickLabel, {color: '#E65100'}]}>{t('orderDetail.sms')}</Text>
                </TouchableOpacity>
              </View>
              <View style={{flexDirection: 'row'}}>
                <TouchableOpacity
                  style={[$.ctaOutline, {flex: 1, borderColor: colors.danger + '40'}]}
                  onPress={handleReportFailure}
                  activeOpacity={0.7}>
                  <Icon name="close-circle-outline" size={16} color={colors.danger} />
                  <Text style={[$.ctaOutlineTxt, {color: colors.danger}]}>{t('orderDetail.reportFailure')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[$.ctaOutline, {flex: 1, borderColor: colors.warning + '40', marginLeft: 10}]}
                  onPress={handleReturnOrder}
                  activeOpacity={0.7}>
                  <Icon name="keyboard-return" size={16} color={colors.warning} />
                  <Text style={[$.ctaOutlineTxt, {color: colors.warning}]}>{t('orderDetail.returnOrder')}</Text>
                </TouchableOpacity>
              </View>
            </>
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

  /* Package count badge */
  pkgCountBadge: {
    backgroundColor: '#E65100',
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    marginStart: 8, paddingHorizontal: 6,
  },
  pkgCountTxt: {
    fontFamily: fontFamily.bold, fontSize: 11, color: '#FFFFFF',
  },

  /* Multi-package detail cards */
  pkgDetailCard: {
    marginBottom: 4,
  },
  pkgDetailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6, marginTop: 4,
  },
  pkgDetailHeaderLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
  },
  pkgDetailTitle: {
    fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary, marginLeft: 8,
  },
  pkgStatusChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  pkgStatusTxt: {
    fontFamily: fontFamily.bold, fontSize: 9, textTransform: 'uppercase',
  },
  pkgDivider: {
    height: 1, backgroundColor: '#EEF1F5', marginVertical: 10,
  },

  /* Notes card */
  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFDE7', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFF9C4', marginBottom: 10,
  },
  noteTxt: {flex: 1, fontFamily: fontFamily.regular, fontSize: 12, color: '#827717', lineHeight: 17, marginStart: 10},

  /* Timeline */
  tlRow: {flexDirection: 'row'},
  tlLeft: {width: 28, alignItems: 'center'},
  tlDot: {
    width: 12, height: 12, borderRadius: 6, marginTop: 4,
  },
  tlDotActive: {
    width: 14, height: 14, borderRadius: 7, marginTop: 3,
    borderWidth: 2.5, borderColor: '#FFF',
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 3,
  },
  tlLine: {
    width: 2, flex: 1, marginTop: 4,
  },
  tlContent: {flex: 1, marginStart: 10},
  tlHdr: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  tlStatus: {fontFamily: fontFamily.semiBold, fontSize: 12.5},
  tlTime: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted},
  tlNote: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textSecondary, marginTop: 3},
  tlBy: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textLight, marginTop: 2},

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
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 14,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.08, shadowRadius: 12,
    elevation: 12,
  },
  ctaPrimary: {
    height: 56, backgroundColor: colors.primary, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.2, shadowRadius: 12,
    elevation: 8, marginBottom: 10,
  },
  ctaInner: {
    flexDirection: 'row', alignItems: 'center', flex: 1,
  },
  ctaIconCircle: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center', marginEnd: 12,
  },
  ctaPrimaryTxt: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF', letterSpacing: 0.2},
  ctaSubTxt: {fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1},
  ctaSecondaryRow: {
    flexDirection: 'row', marginBottom: 8,
  },
  ctaSecondary: {
    flex: 1, height: 48, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F7FA',
  },
  ctaSecIcon: {
    width: 30, height: 30, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginEnd: 8,
  },
  ctaSecTxt: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.primary},
  ctaQuickActions: {
    flexDirection: 'row', marginBottom: 10,
  },
  ctaQuickBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
  },
  ctaQuickIcon: {
    width: 40, height: 40, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  ctaQuickLabel: {fontFamily: fontFamily.semiBold, fontSize: 10, textAlign: 'center'},
  ctaOutline: {
    height: 42, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, marginBottom: 6, backgroundColor: '#FFF',
  },
  ctaOutlineTxt: {fontFamily: fontFamily.semiBold, fontSize: 12, marginLeft: 6},
});

export default OrderDetailScreen;
