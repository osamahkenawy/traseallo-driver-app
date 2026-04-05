/**
 * My Orders Screen — Trasealla Driver App
 * Premium card-based order list with 7 tabs, search, sort, quick filters & rich cards
 */

import React, {useState, useCallback, useMemo, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import Icon from '../../utils/LucideIcon';
import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useSettingsStore from '../../store/settingsStore';
import useOrders from '../../hooks/useOrders';

const HP = 20;
const {width: SCREEN_W} = Dimensions.get('window');

const AnimTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/* ── Tab Definitions (7 tabs) ── */
const TABS = [
  {key: 'all',        labelKey: 'orders.all',       icon: 'view-grid-outline',              color: colors.primary},
  {key: 'assigned',   labelKey: 'orders.assigned',   icon: 'clipboard-text-clock-outline',   color: colors.statusAssigned},
  {key: 'accepted',   labelKey: 'orders.accepted',   icon: 'clipboard-check-outline',        color: '#1565C0'},
  {key: 'picked_up',  labelKey: 'orders.pickedUp',   icon: 'package-variant',                color: colors.statusPickedUp},
  {key: 'in_transit',  labelKey: 'orders.inTransit',  icon: 'truck-fast-outline',             color: colors.statusInTransit},
  {key: 'delivered',  labelKey: 'orders.completed',  icon: 'check-decagram',                 color: colors.statusDelivered},
  {key: 'failed',     labelKey: 'orders.failed',     icon: 'close-circle-outline',           color: colors.statusFailed},
];

/* ── Sort Options ── */
const SORT_OPTIONS = [
  {key: 'newest',   icon: 'sort-clock-descending-outline', labelKey: 'orders.newest'},
  {key: 'oldest',   icon: 'sort-clock-descending-outline', labelKey: 'orders.oldest'},
  {key: 'status',   icon: 'sort-variant',                  labelKey: 'orders.priority'},
  {key: 'distance', icon: 'map-marker-distance',           labelKey: 'orders.nearest'},
];

/* ── Quick Filters ── */
const QUICK_FILTERS = [
  {key: 'cod',      label: 'COD Only',      icon: 'cash',           color: '#D88D0D'},
  {key: 'high_value', label: 'High Value',  icon: 'star',           color: '#9261C6'},
  {key: 'priority', label: 'Priority',      icon: 'flash-outline',   color: '#EB466D'},
  {key: 'recent',   label: 'Recent',        icon: 'clock-outline',   color: '#10A6BA'},
];

/* ── Helpers ── */
const timeAgo = (dateStr, t) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notifications.justNow');
  if (mins < 60) return t('notifications.minutesAgo', {count: mins});
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('notifications.hoursAgo', {count: hrs});
  const days = Math.floor(hrs / 24);
  return t('notifications.daysAgo', {count: days});
};

const getStatusIcon = (st) => {
  switch (st) {
    case 'assigned':  return 'clipboard-text-clock-outline';
    case 'accepted':  return 'clipboard-check-outline';
    case 'picked_up': return 'package-variant';
    case 'in_transit': return 'truck-fast-outline';
    case 'delivered': return 'check-decagram';
    case 'failed':    return 'close-circle-outline';
    case 'cancelled': return 'cancel';
    default:          return 'package-variant-closed';
  }
};

const getActionForStatus = (status) => {
  switch (status) {
    case 'assigned':  return {labelKey: 'orderDetail.acceptOrder', fallback: 'Accept', icon: 'check', color: colors.success, action: 'accept'};
    case 'accepted':  return {labelKey: 'orderDetail.pickUpFromClient', fallback: 'Start Pickup', icon: 'package-variant', color: '#1565C0', action: 'viewDetail'};
    case 'picked_up': return {labelKey: 'orders.startDelivery', fallback: 'Start Delivery', icon: 'truck-fast-outline', color: colors.statusInTransit, action: 'startDelivery'};
    case 'in_transit': return {labelKey: 'orderDetail.confirmDelivery', fallback: 'Deliver', icon: 'check-decagram', color: colors.success, action: 'viewDetail'};
    default: return null;
  }
};

/* ═══════════════════════════════════════════════════════════ */
const MyOrdersScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const currency = useSettingsStore(s => s.currency);
  const [tab, setTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const {orders, isLoading, isRefreshing, onRefresh, acceptOrder, rejectOrder, startDelivery, isUpdatingStatus} = useOrders();

  const toggleFilter = useCallback((key) => {
    setActiveFilters(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }, []);

  /* ── Client-side filter by tab ── */
  const tabFiltered = useMemo(() => {
    if (!orders) return [];
    if (tab === 'all') return orders;
    return orders.filter(o => o.status === tab);
  }, [orders, tab]);

  /* ── Quick filters ── */
  const quickFiltered = useMemo(() => {
    if (activeFilters.length === 0) return tabFiltered;
    let arr = tabFiltered;
    if (activeFilters.includes('cod')) {
      arr = arr.filter(o => o.payment_method === 'cod' && parseFloat(o.cod_amount) > 0);
    }
    if (activeFilters.includes('high_value')) {
      arr = arr.filter(o => parseFloat(o.cod_amount || 0) >= 500 || parseFloat(o.delivery_fee || 0) >= 50);
    }
    if (activeFilters.includes('priority')) {
      arr = arr.filter(o => o.priority === 'high' || o.priority === 'urgent');
    }
    if (activeFilters.includes('recent')) {
      const oneHourAgo = Date.now() - 3600000;
      arr = arr.filter(o => new Date(o.created_at).getTime() > oneHourAgo);
    }
    return arr;
  }, [tabFiltered, activeFilters]);

  /* ── Search filter ── */
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return quickFiltered;
    const q = searchQuery.trim().toLowerCase();
    return quickFiltered.filter(o =>
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.recipient_name || '').toLowerCase().includes(q) ||
      (o.tracking_token || '').toLowerCase().includes(q) ||
      (o.recipient_emirate || '').toLowerCase().includes(q) ||
      (o.sender_name || '').toLowerCase().includes(q),
    );
  }, [quickFiltered, searchQuery]);

  /* ── Sort ── */
  const sortedOrders = useMemo(() => {
    const arr = [...searchFiltered];
    if (sortBy === 'newest') {
      arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'oldest') {
      arr.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortBy === 'distance') {
      arr.sort((a, b) => {
        const da = parseFloat(a.route_distance_km) || Infinity;
        const db = parseFloat(b.route_distance_km) || Infinity;
        return da - db;
      });
    } else {
      const priority = {in_transit: 0, picked_up: 1, accepted: 2, assigned: 3, delivered: 4, failed: 5};
      arr.sort((a, b) => (priority[a.status] ?? 6) - (priority[b.status] ?? 6));
    }
    return arr;
  }, [searchFiltered, sortBy]);

  /* ── Tab counts from data ── */
  const getTabCount = useCallback((key) => {
    if (!orders) return 0;
    if (key === 'all') return orders.length;
    return orders.filter(o => o.status === key).length;
  }, [orders]);

  const goDetail = useCallback(
    o => navigation.navigate(routeNames.OrderDetail, {
      orderId: o.id,
      token: o.tracking_token,
      orderNumber: o.order_number,
    }),
    [navigation],
  );

  const cycleSortBy = useCallback(() => {
    const keys = SORT_OPTIONS.map(s => s.key);
    const idx = keys.indexOf(sortBy);
    setSortBy(keys[(idx + 1) % keys.length]);
  }, [sortBy]);

  const currentSort = SORT_OPTIONS.find(s => s.key === sortBy) || SORT_OPTIONS[0];

  return (
    <View style={[$.root, {paddingTop: ins.top}]}>
      {/* ── Header ── */}
      <Animated.View entering={FadeIn.duration(300)} style={$.hdr}>
        <View>
          <Text style={$.title}>{t('orders.title')}</Text>
          <Text style={$.subtitle}>
            {sortedOrders.length} {t('orders.ordersLabel', 'orders')}
            {tab !== 'all' ? ` · ${t('status.' + tab, tab)}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={$.sortBtn}
          activeOpacity={0.6}
          onPress={cycleSortBy}>
          <Icon name={currentSort.icon} size={16} color={colors.primary} />
          <Text style={$.sortTxt}>{t(currentSort.labelKey)}</Text>
          <Icon name="chevron-down" size={12} color={colors.primary} style={{marginLeft: 2}} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Search ── */}
      <Animated.View entering={FadeInDown.delay(80).duration(300)} style={$.searchWrap}>
        <View style={$.searchRow}>
          <Icon name="magnify" size={18} color={colors.textMuted} />
          <TextInput
            style={$.searchInput}
            placeholder={t('orders.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ── Filter Tabs (7 tabs) ── */}
      <Animated.View entering={FadeInDown.delay(120).duration(300)} style={$.tabOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={$.tabWrap}>
          {TABS.map((item, idx) => {
            const on = tab === item.key;
            const count = getTabCount(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  $.chip,
                  on && {backgroundColor: item.color, shadowColor: item.color, shadowOpacity: 0.25},
                  idx > 0 && {marginLeft: 8},
                ]}
                onPress={() => setTab(item.key)}
                activeOpacity={0.6}>
                <Icon
                  name={item.icon}
                  size={13}
                  color={on ? '#FFF' : colors.textMuted}
                />
                <Text style={[$.chipTxt, on && $.chipTxtOn, {marginLeft: 5}]}>
                  {t(item.labelKey)}
                </Text>
                {count > 0 && (
                  <View style={[$.chipCount, on && $.chipCountOn, {marginLeft: 6}]}>
                    <Text style={[$.chipCountTxt, on && $.chipCountTxtOn]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ── Quick Filters ── */}
      <Animated.View entering={FadeInDown.delay(160).duration(300)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={$.quickWrap}>
          {QUICK_FILTERS.map((f, idx) => {
            const on = activeFilters.includes(f.key);
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  $.quickChip,
                  on && {backgroundColor: f.color + '18', borderColor: f.color},
                  idx > 0 && {marginLeft: 8},
                ]}
                onPress={() => toggleFilter(f.key)}
                activeOpacity={0.6}>
                <Icon name={f.icon} size={12} color={on ? f.color : colors.textMuted} />
                <Text style={[$.quickTxt, on && {color: f.color}, {marginLeft: 5}]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ── List ── */}
      {isLoading && !isRefreshing ? (
        <View style={$.loadingWrap}>
          <View style={$.loadingCircle}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={$.loadingTxt}>{t('orders.loadingOrders')}</Text>
        </View>
      ) : (
        <FlatList
          data={sortedOrders}
          keyExtractor={(item, i) => `order-${item?.id || ''}-${item?.tracking_token || i}`}
          renderItem={({item, index}) => (
            <OrderCard
              order={item}
              index={index}
              onPress={() => goDetail(item)}
              onAction={async (action) => {
                if (action === 'accept') {
                  const res = await acceptOrder(item.id);
                  if (res.success) onRefresh();
                } else if (action === 'reject') {
                  const res = await rejectOrder(item.id, 'Rejected from orders list');
                  if (res.success) onRefresh();
                } else if (action === 'startDelivery') {
                  const res = await startDelivery(item.id);
                  if (res.success) onRefresh();
                } else {
                  goDetail(item);
                }
              }}
              t={t}
              currency={currency}
              isUpdatingStatus={isUpdatingStatus}
            />
          )}
          ListEmptyComponent={<Empty tab={tab} onRefresh={onRefresh} t={t} searchQuery={searchQuery} />}
          contentContainerStyle={$.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{height: 12}} />}
        />
      )}
    </View>
  );
};

/* ─── Order Card (Premium) ───────────────────────────────── */
const OrderCard = ({order, index, onPress, onAction, t, currency, isUpdatingStatus}) => {
  const st = order?.status || 'assigned';
  const stClr = getStatusColor(st);
  const stBg = getStatusBgColor(st);
  const isCOD = order?.payment_method === 'cod' && parseFloat(order?.cod_amount) > 0;
  const time = timeAgo(order?.created_at || order?.scheduled_date, t);
  const routeDistKm = order?.route_distance_km ? parseFloat(order.route_distance_km) : null;
  const routeDurMin = order?.route_duration_min ? Math.round(parseFloat(order.route_duration_min)) : null;
  const actionConfig = getActionForStatus(st);

  return (
    <AnimTouchable
      entering={FadeInDown.delay(60 * Math.min(index, 8)).duration(350).springify()}
      style={$.card}
      onPress={onPress}
      activeOpacity={0.55}>
      {/* Left accent strip */}
      <View style={[$.cardAccent, {backgroundColor: stClr}]} />

      <View style={$.cardInner}>
        {/* Row 1: Status + COD + Time */}
        <View style={$.cardTopRow}>
          <View style={[$.statusBadge, {backgroundColor: stBg}]}>
            <Icon name={getStatusIcon(st)} size={11} color={stClr} />
            <Text style={[$.statusTxt, {color: stClr, marginLeft: 4}]}>
              {t('status.' + st, st)}
            </Text>
          </View>
          <View style={$.cardTopRight}>
            {isCOD && (
              <View style={$.codTag}>
                <Icon name="cash" size={10} color="#D88D0D" />
                <Text style={[$.codTxt, {marginLeft: 4}]}>
                  COD {order?.cod_amount ? `${currency} ${order.cod_amount}` : ''}
                </Text>
              </View>
            )}
            {!!time && <Text style={[$.timeTxt, isCOD && {marginLeft: 8}]}>{time}</Text>}
          </View>
        </View>

        {/* Row 2: Icon + Order # + Customer + Arrow */}
        <View style={$.cardMid}>
          <View style={[$.cardIcon, {backgroundColor: stBg}]}>
            <Icon
              name={st === 'assigned' ? 'store-outline' : st === 'accepted' ? 'clipboard-check-outline' : 'package-variant'}
              size={20}
              color={stClr}
            />
          </View>
          <View style={[$.cardMidText, {marginLeft: 12}]}>
            <Text style={$.orderNum} numberOfLines={1}>
              #{order?.order_number || order?.tracking_token || '---'}
            </Text>
            <Text style={$.custName} numberOfLines={1}>
              {st === 'assigned' || st === 'accepted'
                ? `${t('orders.pickup')} ${order?.sender_name || order?.client_name || t('orders.client')}`
                : order?.recipient_name || t('orders.customer')}
            </Text>
          </View>
          <View style={$.arrowCircle}>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </View>
        </View>

        {/* Row 3: Meta chips */}
        <View style={$.cardBottom}>
          {(routeDistKm != null || routeDurMin != null) && (
            <View style={[$.infoChip, {backgroundColor: '#E6F4EA'}]}>
              <Icon name="map-marker-distance" size={11} color={colors.success} />
              <Text style={[$.infoChipTxt, {color: colors.success, marginLeft: 4}]}>
                {routeDistKm != null ? `${routeDistKm.toFixed(1)} km` : ''}
                {routeDistKm != null && routeDurMin != null ? ' · ' : ''}
                {routeDurMin != null ? `${routeDurMin} min` : ''}
              </Text>
            </View>
          )}
          {!!(order?.recipient_emirate || order?.recipient_address) && (
            <View style={[$.infoChip, {marginLeft: 6}]}>
              <Icon name="map-marker-outline" size={11} color={colors.textMuted} />
              <Text style={[$.infoChipTxt, {marginLeft: 4}]} numberOfLines={1}>
                {order?.recipient_emirate || order?.recipient_address || '---'}
              </Text>
            </View>
          )}
          {Array.isArray(order?.packages) && order.packages.length > 0 && (
            <View style={[$.infoChip, {marginLeft: 6}]}>
              <Icon name="package-variant" size={11} color={colors.textMuted} />
              <Text style={[$.infoChipTxt, {marginLeft: 4}]}>
                {order.packages.filter(p => p.status === 'delivered').length}/{order.packages.length} {t('orders.pkgs')}
              </Text>
            </View>
          )}
          {Array.isArray(order?.stops) && order.stops.length > 0 && (
            <View style={[$.infoChip, {marginLeft: 6}]}>
              <Icon name="map-marker-path" size={11} color={colors.textMuted} />
              <Text style={[$.infoChipTxt, {marginLeft: 4}]}>
                {order.stops.filter(s => s.status === 'completed').length}/{order.stops.length} {t('orders.stops')}
              </Text>
            </View>
          )}
          {!!order?.scheduled_date && (
            <View style={[$.infoChip, {marginLeft: 6}]}>
              <Icon name="calendar-outline" size={11} color={colors.textMuted} />
              <Text style={[$.infoChipTxt, {marginLeft: 4}]} numberOfLines={1}>
                {new Date(order.scheduled_date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})}
              </Text>
            </View>
          )}
          {!!order?.items_count && (
            <View style={[$.infoChip, {marginLeft: 6}]}>
              <Icon name="cube-outline" size={11} color={colors.textMuted} />
              <Text style={[$.infoChipTxt, {marginLeft: 4}]}>{order.items_count} {t('orders.items')}</Text>
            </View>
          )}
        </View>

        {/* Row 4: Action button (for actionable statuses) */}
        {actionConfig && (
          <View style={$.actionRow}>
            <TouchableOpacity
              style={[$.actionBtn, {backgroundColor: actionConfig.color}]}
              activeOpacity={0.7}
              disabled={isUpdatingStatus}
              onPress={() => onAction(actionConfig.action)}>
              {isUpdatingStatus ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Icon name={actionConfig.icon} size={14} color="#FFF" />
                  <Text style={[$.actionBtnTxt, {marginLeft: 6}]}>{t(actionConfig.labelKey, actionConfig.fallback)}</Text>
                </>
              )}
            </TouchableOpacity>
            {st === 'assigned' && (
              <TouchableOpacity
                style={$.rejectBtn}
                activeOpacity={0.6}
                onPress={() => onAction('reject')}>
                <Icon name="close" size={14} color={colors.danger} />
                <Text style={[$.rejectBtnTxt, {marginLeft: 4}]}>Reject</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </AnimTouchable>
  );
};

/* ─── Empty State ────────────────────────────────────────── */
const Empty = ({tab, onRefresh, t, searchQuery}) => (
  <View style={$.empty}>
    <Animated.View entering={FadeInDown.duration(400).springify()} style={$.emptyContent}>
      <View style={$.emptyIcWrap}>
        <View style={$.emptyIcRing}>
          <Icon
            name={searchQuery ? 'magnify' : 'package-variant-closed'}
            size={32}
            color={colors.textLight}
          />
        </View>
      </View>
      <Text style={$.emptyH}>
        {searchQuery
          ? t('orders.noSearchResults', 'No results found')
          : tab === 'all'
            ? t('orders.noOrdersYet')
            : t('orders.noFilteredOrders', {tab: t('status.' + tab, tab)})}
      </Text>
      <Text style={$.emptyP}>
        {searchQuery
          ? t('orders.tryDifferentSearch', 'Try a different search term or clear filters')
          : tab === 'all'
            ? t('orders.emptyMessage')
            : t('orders.emptyFilteredMessage', {tab: t('status.' + tab, tab)})}
      </Text>
      <TouchableOpacity style={$.emptyBtn} activeOpacity={0.6} onPress={onRefresh}>
        <Icon name="refresh" size={15} color={colors.primary} />
        <Text style={[$.emptyBtnTxt, {marginLeft: 6}]}>{t('orders.refresh')}</Text>
      </TouchableOpacity>
    </Animated.View>
  </View>
);

export default MyOrdersScreen;

/* ═══════════════════════════════════════════════════════════ */
/*  STYLES                                                     */
/* ═══════════════════════════════════════════════════════════ */
const $ = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F3F5F9'},

  /* ── Header ── */
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HP,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '0D',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  sortTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
    marginLeft: 5,
  },

  /* ── Search ── */
  searchWrap: {paddingHorizontal: HP, marginBottom: 10},
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
    marginLeft: 10,
  },

  /* ── Filter Tabs ── */
  tabOuter: {marginBottom: 4, paddingVertical: 4},
  tabWrap: {paddingHorizontal: HP, paddingVertical: 4},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chipTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTxtOn: {color: '#FFF'},
  chipCount: {
    backgroundColor: '#E8ECF0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  chipCountOn: {backgroundColor: 'rgba(255,255,255,0.25)'},
  chipCountTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.textMuted,
  },
  chipCountTxtOn: {color: '#FFF'},

  /* ── Quick Filters ── */
  quickWrap: {paddingHorizontal: HP, paddingTop: 2, paddingBottom: 8},
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  quickTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },

  /* ── Loading ── */
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '0A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  loadingTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },

  /* ── List ── */
  list: {paddingHorizontal: HP, paddingTop: 4, paddingBottom: 120, flexGrow: 1},

  /* ── Order Card ── */
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#1B2838',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardAccent: {width: 4},
  cardInner: {flex: 1, paddingHorizontal: 16, paddingVertical: 14},

  /* Card top row */
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FFF4E0',
  },
  codTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: '#D88D0D',
  },
  timeTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
  },

  /* Card middle */
  cardMid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMidText: {flex: 1},
  orderNum: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  custName: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '0D',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  /* Card bottom */
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  infoChipTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
    maxWidth: 120,
  },

  /* ── Action Row ── */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: '#FFF',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.danger + '10',
    marginLeft: 10,
  },
  rejectBtnTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.danger,
  },

  /* ── Empty ── */
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyContent: {alignItems: 'center'},
  emptyIcWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8ECF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyH: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyP: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    backgroundColor: colors.primary + '08',
  },
  emptyBtnTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
});
