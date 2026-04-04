/**
 * DashboardScreen — Matches reference design
 * Header > Driver Card > "My Task" with filter chips > Task cards
 */

import React, {useCallback, useState, useMemo} from 'react';
import {View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity} from 'react-native';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useDashboard from '../../hooks/useDashboard';
import {useTranslation} from 'react-i18next';

import {DashboardHeader} from './components';
import TaskCard from './components/TaskCard';

const FILTERS = ['All', 'Confirmed', 'Assigned', 'On Delivery', 'Delivered'];

const FILTER_KEYS = {
  All: 'dashboard.filterAll',
  Confirmed: 'dashboard.filterConfirmed',
  Assigned: 'dashboard.filterAssigned',
  'On Delivery': 'dashboard.filterOnDelivery',
  Delivered: 'dashboard.filterDelivered',
};

const DashboardScreen = ({navigation}) => {
  const {t} = useTranslation();
  const {
    driverInfo, greeting, displayName, driverStatus,
    goOnline, goOffline, onBreak,
    todayStats, nextStop, routeSummary,
    activeOrders,
    unreadCount, latestNotifications,
    isRefreshing, onRefresh,
  } = useDashboard();

  const [activeFilter, setActiveFilter] = useState('All');

  const nav = useCallback(
    (route, params) => navigation.navigate(routeNames[route] || route, params),
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

  // Filtered orders based on active chip
  const filteredOrders = useMemo(() => {
    const all = activeOrders || [];
    if (activeFilter === 'All') return all;
    const filterMap = {
      Confirmed: ['confirmed'],
      Assigned: ['assigned', 'accepted'],
      'On Delivery': ['picked_up', 'in_transit'],
      Delivered: ['delivered'],
    };
    const statuses = filterMap[activeFilter];
    return statuses ? all.filter(o => statuses.includes(o.status)) : all;
  }, [activeOrders, activeFilter]);

  return (
    <View style={$.root}>
      <DashboardHeader
        greeting={greeting}
        driverName={displayName}
        vehicleType={driverInfo?.vehicleType}
        photo={driverInfo?.photo}
        rating={driverInfo?.rating}
        unreadCount={unreadCount}
        driverStatus={driverStatus}
        onNotificationPress={() => nav('Notifications')}
        onProfilePress={() => nav('Profile')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={$.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>

        {/* ═══ My Task Section ═══ */}
        <View style={$.sectionHeader}>
          <Text style={$.sectionTitle}>{t('dashboard.filterMyTask')}</Text>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={$.chipRow}
          style={$.chipScroll}>
          {FILTERS.map((f) => {
            const active = f === activeFilter;
            return (
              <TouchableOpacity
                key={f}
                style={[$.chip, active && $.chipActive]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.7}>
                <Text style={[$.chipTxt, active && $.chipTxtActive]}>{t(FILTER_KEYS[f])}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Task list */}
        {filteredOrders.length === 0 ? (
          <View style={$.emptyState}>
            <Text style={$.emptyTitle}>{t('dashboard.noTasks')}</Text>
            <Text style={$.emptySub}>
              {activeFilter === 'All'
                ? t('dashboard.goOnlineMsg')
                : t('dashboard.noFilteredTasks', {filter: t(FILTER_KEYS[activeFilter]).toLowerCase()})}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order, idx) => (
            <TaskCard
              key={`task-${order?.id || order?.tracking_token || ''}-${idx}`}
              order={order}
              onPress={() => handleOpenOrder(order)}
            />
          ))
        )}

        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
};

const $ = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F2F4F7'},
  scroll: {paddingBottom: 40, paddingTop: 20},

  // Section header
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.textPrimary,
  },

  // Chips
  chipScroll: {marginBottom: 16},
  chipRow: {paddingHorizontal: 20, gap: 8},
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D0D5DD',
    backgroundColor: '#FFF',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTxtActive: {
    color: '#FFFFFF',
  },

  // Empty
  emptyState: {
    marginHorizontal: 20,
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DashboardScreen;
