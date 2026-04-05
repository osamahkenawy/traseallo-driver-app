/**
 * DashboardScreen — Production-ready dashboard
 * Component tree:
 *   DashboardHeader → DriverSummaryCard → StatsRow → PrimaryActionCard → IncomingOrdersSection
 * Uses ScrollView (outer) with nested FlatList (scrollEnabled=false) for the orders list.
 */

import React, {useCallback, useMemo} from 'react';
import {View, ScrollView, RefreshControl, TouchableOpacity, Text, Alert, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Package, ArrowRight} from 'lucide-react-native';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {spacing} from '../../theme/spacing';
import {shadows} from '../../theme/shadows';
import {borderRadius} from '../../theme/borderRadius';
import {routeNames} from '../../constants/routeNames';
import useDashboard from '../../hooks/useDashboard';
import useOrderStore from '../../store/orderStore';
import useSettingsStore from '../../store/settingsStore';
import {useTranslation} from 'react-i18next';
import {showMessage} from 'react-native-flash-message';

import DashboardHeader from './components/DashboardHeader';
import DriverSummaryCard from './components/DriverSummaryCard';
import StatsRow from './components/StatsRow';
import PrimaryActionCard from './components/PrimaryActionCard';
import IncomingOrdersSection from './components/IncomingOrdersSection';

/* ─── Active Orders Banner ──────────────────────── */
const ActiveOrdersBanner = ({count, t, onPress}) => (
  <Animated.View entering={FadeInDown.springify().damping(16).stiffness(110).delay(100)}>
    <TouchableOpacity style={s.bannerCard} onPress={onPress} activeOpacity={0.7}>
      <View style={s.bannerAccent} />
      <View style={s.bannerContent}>
        <View style={s.bannerIcon}>
          <Package size={16} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{flex: 1}}>
          <Text style={s.bannerTitle}>
            {t('dashboard.activeOrders', '{{count}} active orders in progress', {count})}
          </Text>
          <Text style={s.bannerSub}>
            {t('dashboard.tapToView', 'Tap to view')}
          </Text>
        </View>
        <ArrowRight size={16} color={colors.textMuted} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  </Animated.View>
);

/* ═══════════════════════════════════════════════════
   DashboardScreen
   ═══════════════════════════════════════════════════ */
const DashboardScreen = ({navigation}) => {
  const {t} = useTranslation();
  const currency = useSettingsStore(s => s.currency);
  const {
    driverInfo, driverStatus,
    goOnline,
    todayStats, activeOrders, nextStop, unreadCount,
    isLoading, isRefreshing, onRefresh, fetchAll,
  } = useDashboard();

  const acceptOrder = useOrderStore(s => s.acceptOrder);
  const rejectOrder = useOrderStore(s => s.rejectOrder);

  // ─── Derived data ───
  const assignedOrders = useMemo(
    () => (activeOrders || []).filter(o => o.status === 'assigned'),
    [activeOrders],
  );

  const stats = useMemo(() => {
    const all = activeOrders || [];
    return {
      assigned: all.filter(o => o.status === 'assigned').length,
      inProgress: all.filter(o => ['accepted', 'picked_up', 'in_transit'].includes(o.status)).length,
      delivered: todayStats?.delivered || 0,
    };
  }, [activeOrders, todayStats]);

  // Smart primary action logic
  const primaryAction = useMemo(() => {
    if (stats.inProgress > 0 && nextStop) {
      return {type: 'continue_route', subtitle: nextStop?.address || nextStop?.recipient_name || ''};
    }
    if (stats.assigned > 0) {
      return {type: 'start_delivery', subtitle: t('dashboard.ordersReady', '{{count}} orders ready', {count: stats.assigned})};
    }
    if (driverStatus === 'offline') {
      return {type: 'go_online', subtitle: t('dashboard.startShift', 'Start accepting orders')};
    }
    return null;
  }, [stats, nextStop, driverStatus, t]);

  // ─── Navigation ───
  const nav = useCallback(
    (route, params) => navigation.navigate(routeNames[route] || route, params),
    [navigation],
  );

  const goToMyOrders = useCallback(
    () => navigation.navigate(routeNames.MyOrders),
    [navigation],
  );

  const handleOpenOrder = useCallback(
    (order) => {
      const orderId = order?.order_id || order?.id;
      if (orderId) {
        nav('OrderDetail', {
          orderId,
          token: order?.tracking_token,
          orderNumber: order?.order_number,
        });
      }
    },
    [nav],
  );

  // ─── Order Actions ───
  const handleAccept = useCallback(async (order) => {
    const orderId = order?.order_id || order?.id;
    if (!orderId) return;
    const result = await acceptOrder(orderId);
    if (result.success) {
      showMessage({
        message: t('dashboard.orderAccepted', 'Order accepted!'),
        description: `#${order?.order_number || orderId}`,
        type: 'success',
        icon: 'auto',
        duration: 2500,
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

  // Primary action handler
  const handlePrimaryAction = useCallback(() => {
    if (!primaryAction) return;
    switch (primaryAction.type) {
      case 'continue_route':
        nav('MapScreen');
        break;
      case 'start_delivery':
        // Scroll to orders — already visible below
        break;
      case 'go_online':
        goOnline?.();
        break;
    }
  }, [primaryAction, nav, goOnline]);

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }>

        {/* Header */}
        <DashboardHeader
          notificationCount={unreadCount}
          onNotificationPress={() => nav('Notifications')}
        />

        {/* Driver Summary Card (overlaps header) */}
        <DriverSummaryCard
          name={driverInfo?.name}
          photo={driverInfo?.photo}
          vehicle={driverInfo?.vehicleType}
          status={driverStatus}
          onPress={() => nav('Profile')}
        />

        <View style={s.body}>
          {/* Stats Row */}
          <StatsRow
            assigned={stats.assigned}
            inProgress={stats.inProgress}
            delivered={stats.delivered}
            onActivePress={goToMyOrders}
            t={t}
          />

          {/* Primary Action CTA */}
          {primaryAction && (
            <View style={s.ctaWrap}>
              <PrimaryActionCard
                type={primaryAction.type}
                subtitle={primaryAction.subtitle}
                onPress={handlePrimaryAction}
                t={t}
              />
            </View>
          )}

          {/* Incoming Orders (FlatList, scrollEnabled=false) */}
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
              onRetry={() => fetchAll(true)}
              onViewOrders={goToMyOrders}
              t={t}
            />
          </View>

          {/* Active Orders Link */}
          {stats.inProgress > 0 && assignedOrders.length > 0 && (
            <ActiveOrdersBanner count={stats.inProgress} t={t} onPress={goToMyOrders} />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bgScreen},
  scrollContent: {paddingBottom: 150},
  body: {
    marginTop: spacing.md,
  },
  ctaWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  ordersWrap: {
    marginTop: spacing.md,
  },

  // Active orders banner — matches OrderCard style
  bannerCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: '#FFF',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  bannerAccent: {
    height: 3,
    backgroundColor: colors.primary,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  bannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    backgroundColor: colors.primary + '10',
  },
  bannerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  bannerSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

export default DashboardScreen;
