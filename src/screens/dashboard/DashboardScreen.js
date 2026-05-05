/**
 * DashboardScreen — Redesigned to match the modern reference screenshot.
 * Layout (top → bottom):
 *   1. SafeArea spacer
 *   2. DriverSummaryCard (white pill, status on right)
 *   3. KPI Row (3 white stat cards with colored icons)
 *   4. NextDeliveryBanner (gradient blue with map texture)
 *   5. IncomingOrders section header + OrderCard list
 *   6. Optional active orders banner
 */

import React, {useCallback, useMemo} from 'react';
import {View, ScrollView, RefreshControl, TouchableOpacity, Text, Alert, StyleSheet, StatusBar, Linking, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Package, ArrowRight} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {showMessage} from 'react-native-flash-message';

import {routeNames} from '../../constants/routeNames';
import useDashboard from '../../hooks/useDashboard';
import useOrderStore from '../../store/orderStore';
import useSettingsStore from '../../store/settingsStore';

import DriverSummaryCard from './components/DriverSummaryCard';
import StatsRow from './components/StatsRow';
import NextDeliveryBanner from './components/NextDeliveryBanner';
import IncomingOrdersSection from './components/IncomingOrdersSection';
import {D} from './components/dashboardTheme';

/* ─── Active Orders link banner ─── */
const ActiveOrdersBanner = ({count, t, onPress}) => (
  <Animated.View entering={FadeInDown.springify().damping(16).stiffness(110).delay(100)}>
    <TouchableOpacity style={s.bannerCard} onPress={onPress} activeOpacity={0.7}>
      <View style={s.bannerContent}>
        <View style={s.bannerIcon}>
          <Package size={16} color={D.primary} strokeWidth={2.2} />
        </View>
        <View style={{flex: 1}}>
          <Text style={s.bannerTitle}>
            {t('dashboard.activeOrders', '{{count}} active orders in progress', {count})}
          </Text>
          <Text style={s.bannerSub}>{t('dashboard.tapToView', 'Tap to view')}</Text>
        </View>
        <ArrowRight size={16} color={D.textMuted} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  </Animated.View>
);

const DashboardScreen = ({navigation}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const currency = useSettingsStore(st => st.currency);
  const {
    driverInfo, driverStatus, goOnline,
    todayStats, activeOrders, nextStop, unreadCount,
    isLoading, isRefreshing, onRefresh, fetchAll,
  } = useDashboard();

  const acceptOrder = useOrderStore(st => st.acceptOrder);
  const rejectOrder = useOrderStore(st => st.rejectOrder);

  /* ─── Derived ─── */
  const assignedOrders = useMemo(() => {
    const list = (activeOrders || []).filter(o => o.status === 'assigned');
    // Dedupe by order_id / id / order_number to avoid duplicates from
    // overlapping API sources (dashboard + orders endpoints).
    const seen = new Set();
    const out = [];
    for (const o of list) {
      const key = o?.order_id ?? o?.id ?? o?.order_number;
      if (key == null || seen.has(key)) continue;
      seen.add(key);
      out.push(o);
    }
    return out;
  }, [activeOrders]);

  const stats = useMemo(() => {
    const all = activeOrders || [];
    return {
      assigned: all.filter(o => o.status === 'assigned').length,
      inProgress: all.filter(o => ['accepted', 'picked_up', 'in_transit'].includes(o.status)).length,
      delivered: todayStats?.delivered || 0,
    };
  }, [activeOrders, todayStats]);

  const nextDeliveryCount = stats.inProgress + (nextStop ? 1 : 0) || (stats.assigned > 0 ? 1 : 0);
  const showNextDelivery = stats.inProgress > 0 || !!nextStop || stats.assigned > 0;

  /* ─── Navigation ─── */
  const nav = useCallback(
    (route, params) => navigation.navigate(routeNames[route] || route, params),
    [navigation],
  );
  const goToMyOrders = useCallback(() => navigation.navigate(routeNames.MyOrders), [navigation]);

  const handleOpenOrder = useCallback((order) => {
    const orderId = order?.order_id || order?.id;
    if (orderId) {
      nav('OrderDetail', {
        orderId,
        token: order?.tracking_token,
        orderNumber: order?.order_number,
      });
    }
  }, [nav]);

  /* ─── Order actions ─── */
  const handleAccept = useCallback(async (order) => {
    const orderId = order?.order_id || order?.id;
    if (!orderId) return;
    const result = await acceptOrder(orderId);
    if (result.success) {
      showMessage({
        message: t('dashboard.orderAccepted', 'Order accepted!'),
        description: `#${order?.order_number || orderId}`,
        type: 'success', icon: 'auto', duration: 2500,
      });
      fetchAll(true);
    } else {
      Alert.alert(t('common.error'), result.error || t('dashboard.acceptFailed', 'Failed to accept order'));
    }
  }, [acceptOrder, fetchAll, t]);

  const handleReject = useCallback((order) => {
    const orderId = order?.order_id || order?.id;
    if (!orderId) return;
    Alert.alert(
      t('dashboard.rejectOrder', 'Reject Order'),
      t('dashboard.rejectConfirm', 'Are you sure you want to reject this order?'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('dashboard.reject', 'Reject'),
          style: 'destructive',
          onPress: async () => {
            const result = await rejectOrder(orderId, 'Driver rejected from dashboard');
            if (result.success) {
              showMessage({message: t('dashboard.orderRejected', 'Order rejected'), type: 'warning', icon: 'auto', duration: 2000});
              fetchAll(true);
            } else {
              Alert.alert(t('common.error'), result.error || t('dashboard.rejectFailed', 'Failed to reject order'));
            }
          },
        },
      ],
    );
  }, [rejectOrder, fetchAll, t]);

  const handleNavigate = useCallback((order) => {
    const lat = order?.sender_lat || order?.pickup_lat;
    const lng = order?.sender_lng || order?.pickup_lng;
    if (lat && lng) {
      const url = Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
      Linking.openURL(url).catch(() => nav('MapScreen'));
    } else {
      nav('MapScreen');
    }
  }, [nav]);

  const handleCall = useCallback((order) => {
    const phone = order?.sender_phone || order?.recipient_phone;
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
  }, []);

  const handleNextDelivery = useCallback(() => {
    if (stats.inProgress > 0) {
      nav('MapScreen');
    } else {
      goToMyOrders();
    }
  }, [stats.inProgress, nav, goToMyOrders]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={D.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, {paddingTop: ins.top + 12, paddingBottom: 140}]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={D.primary} />
        }>

        {/* 1. Driver summary card */}
        <DriverSummaryCard
          name={driverInfo?.name}
          photo={driverInfo?.photo}
          vehicle={driverInfo?.vehicleType}
          status={driverStatus}
          onPress={() => nav('Profile')}
        />

        {/* 2. KPI row */}
        <View style={s.statsWrap}>
          <StatsRow
            assigned={stats.assigned}
            inProgress={stats.inProgress}
            delivered={stats.delivered}
            onNewPress={goToMyOrders}
            onActivePress={goToMyOrders}
            onDeliveredPress={() => nav('Earnings')}
            t={t}
          />
        </View>

        {/* 3. Next delivery banner */}
        {showNextDelivery && (
          <NextDeliveryBanner
            count={nextDeliveryCount}
            onPress={handleNextDelivery}
            t={t}
          />
        )}

        {/* 4. Incoming orders */}
        <View style={s.ordersWrap}>
          <IncomingOrdersSection
            orders={assignedOrders}
            currency={currency}
            isLoading={isLoading && assignedOrders.length === 0}
            hasError={false}
            hasActiveOrders={stats.inProgress > 0}
            onAccept={handleAccept}
            onReject={handleReject}
            onPress={handleOpenOrder}
            onNavigate={handleNavigate}
            onCall={handleCall}
            onRetry={() => fetchAll(true)}
            onViewOrders={goToMyOrders}
            onViewAll={goToMyOrders}
            t={t}
          />
        </View>

        {/* 5. Active link */}
        {stats.inProgress > 0 && assignedOrders.length > 0 && (
          <ActiveOrdersBanner count={stats.inProgress} t={t} onPress={goToMyOrders} />
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: D.bg},
  scrollContent: {},
  statsWrap: {
    marginTop: 14,
  },
  ordersWrap: {
    marginTop: 18,
  },
  bannerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: D.surface,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {shadowColor: '#0B1220', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.05, shadowRadius: 8},
      android: {elevation: 2},
    }),
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: D.primarySoft,
  },
  bannerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    color: D.text,
  },
  bannerSub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: D.textMuted,
    marginTop: 1,
  },
});

export default DashboardScreen;
