/**
 * My Orders Screen — Trasealla Driver App
 * Modern card-based order list with chip filters, counts, search & rich cards
 */

import React, {useState, useCallback, useMemo} from 'react';
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useOrders from '../../hooks/useOrders';

const {width: SW} = Dimensions.get('window');
const HP = 20;

const TABS = [
  {key: 'all', label: 'All', icon: 'view-grid-outline'},
  {key: 'assigned', label: 'Assigned', icon: 'clipboard-text-clock-outline'},
  {key: 'picked_up', label: 'Picked Up', icon: 'package-variant'},
  {key: 'in_transit', label: 'In Transit', icon: 'truck-fast-outline'},
  {key: 'delivered', label: 'Delivered', icon: 'check-decagram'},
  {key: 'failed', label: 'Failed', icon: 'close-circle-outline'},
];

/* ── Helpers ── */
const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const getStatusIcon = (st) => {
  switch (st) {
    case 'assigned': return 'clipboard-text-clock-outline';
    case 'picked_up': return 'package-variant';
    case 'in_transit': return 'truck-fast-outline';
    case 'delivered': return 'check-decagram';
    case 'failed': return 'close-circle-outline';
    case 'cancelled': return 'cancel';
    default: return 'package-variant-closed';
  }
};

/* ═══════════════════════════════════════════════════════════ */
const MyOrdersScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const [tab, setTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest | status
  const {orders, isLoading, isRefreshing, onRefresh, tabCounts} = useOrders();

  /* ── Client-side filter by tab ── */
  const tabFiltered = useMemo(() => {
    if (!orders) return [];
    if (tab === 'all') return orders;
    return orders.filter(o => o.status === tab);
  }, [orders, tab]);

  /* ── Search filter ── */
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return tabFiltered;
    const q = searchQuery.trim().toLowerCase();
    return tabFiltered.filter(o =>
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.recipient_name || '').toLowerCase().includes(q) ||
      (o.tracking_token || '').toLowerCase().includes(q) ||
      (o.recipient_emirate || '').toLowerCase().includes(q),
    );
  }, [tabFiltered, searchQuery]);

  /* ── Sort ── */
  const sortedOrders = useMemo(() => {
    const arr = [...searchFiltered];
    if (sortBy === 'newest') {
      arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else {
      const priority = {in_transit: 0, picked_up: 1, assigned: 2, delivered: 3, failed: 4};
      arr.sort((a, b) => (priority[a.status] ?? 5) - (priority[b.status] ?? 5));
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

  return (
    <View style={[$.root, {paddingTop: ins.top}]}>
      {/* ── Header ── */}
      <View style={$.hdr}>
        <View>
          <Text style={$.title}>My Orders</Text>
          <Text style={$.subtitle}>
            {sortedOrders.length} order{sortedOrders.length !== 1 ? 's' : ''}
            {tab !== 'all' ? ` · ${tab.replace(/_/g, ' ')}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={$.sortBtn}
          activeOpacity={0.6}
          onPress={() => setSortBy(p => p === 'newest' ? 'status' : 'newest')}>
          <Icon
            name={sortBy === 'newest' ? 'sort-clock-descending-outline' : 'sort-variant'}
            size={18}
            color={colors.primary}
          />
          <Text style={$.sortTxt}>
            {sortBy === 'newest' ? 'Newest' : 'Priority'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={$.searchWrap}>
        <View style={$.searchRow}>
          <Icon name="magnify" size={18} color={colors.textMuted} />
          <TextInput
            style={$.searchInput}
            placeholder="Search orders, customers, locations..."
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
      </View>

      {/* ── Chip Tabs with Counts ── */}
      <View style={$.tabOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={$.tabWrap}
          style={$.tabScroll}>
          {TABS.map(item => {
            const on = tab === item.key;
            const count = getTabCount(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                style={[$.chip, on && $.chipOn]}
                onPress={() => setTab(item.key)}
                activeOpacity={0.6}>
                <Icon
                  name={item.icon}
                  size={14}
                  color={on ? '#FFF' : colors.textMuted}
                  style={{marginRight: 4}}
                />
                <Text style={[$.chipTxt, on && $.chipTxtOn]}>{item.label}</Text>
                {count > 0 && (
                  <View style={[$.chipCount, on && $.chipCountOn]}>
                    <Text style={[$.chipCountTxt, on && $.chipCountTxtOn]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {isLoading && !isRefreshing ? (
        <View style={$.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={$.loadingTxt}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedOrders}
          keyExtractor={(item, i) => item?.id?.toString() || item?.tracking_token || i.toString()}
          renderItem={({item, index}) => (
            <OrderCard
              order={item}
              index={index}
              onPress={() => goDetail(item)}
            />
          )}
          ListEmptyComponent={<Empty tab={tab} onRefresh={onRefresh} />}
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

/* ─── Order Card ─────────────────────────────────────────── */
const OrderCard = ({order, onPress}) => {
  const st = order?.status || 'assigned';
  const stClr = getStatusColor(st);
  const stBg = getStatusBgColor(st);
  const isCOD = order?.payment_method === 'cod' && parseFloat(order?.cod_amount) > 0;
  const time = timeAgo(order?.created_at || order?.scheduled_date);

  return (
    <TouchableOpacity style={$.card} onPress={onPress} activeOpacity={0.55}>
      {/* Status accent stripe */}
      <View style={[$.cardAccent, {backgroundColor: stClr}]} />

      <View style={$.cardInner}>
        {/* Top row: status + time */}
        <View style={$.cardTopRow}>
          <View style={[$.statusBadge, {backgroundColor: stBg}]}>
            <Icon name={getStatusIcon(st)} size={11} color={stClr} />
            <Text style={[$.statusTxt, {color: stClr}]}>
              {(st || '').replace(/_/g, ' ')}
            </Text>
          </View>
          <View style={$.cardTopRight}>
            {isCOD && (
              <View style={$.codTag}>
                <Icon name="cash" size={10} color="#F9AD28" />
                <Text style={$.codTxt}>
                  COD {order?.cod_amount ? `AED ${order.cod_amount}` : ''}
                </Text>
              </View>
            )}
            {!!time && (
              <Text style={$.timeTxt}>{time}</Text>
            )}
          </View>
        </View>

        {/* Order number + customer */}
        <View style={$.cardMid}>
          <View style={[$.cardIcon, {backgroundColor: stBg}]}>
            <Icon name={st === 'assigned' ? 'store-outline' : 'package-variant'} size={18} color={stClr} />
          </View>
          <View style={$.cardMidText}>
            <Text style={$.orderNum} numberOfLines={1}>
              #{order?.order_number || order?.tracking_token || '---'}
            </Text>
            <Text style={$.custName} numberOfLines={1}>
              {st === 'assigned'
                ? `Pickup: ${order?.sender_name || order?.client_name || 'Client'}`
                : order?.recipient_name || 'Customer'}
            </Text>
          </View>
          <View style={$.arrowCircle}>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </View>
        </View>

        {/* Bottom row: location + emirate + packages + stops */}
        <View style={$.cardBottom}>
          {!!(order?.recipient_emirate || order?.recipient_address) && (
            <View style={$.infoChip}>
              <Icon name="map-marker-outline" size={12} color={colors.textMuted} />
              <Text style={$.infoChipTxt} numberOfLines={1}>
                {order?.recipient_emirate || order?.recipient_address || '---'}
              </Text>
            </View>
          )}
          {order?.packages?.length > 0 && (
            <View style={$.infoChip}>
              <Icon name="package-variant" size={12} color={colors.textMuted} />
              <Text style={$.infoChipTxt}>
                {order.packages.filter(p => p.status === 'delivered').length}/{order.packages.length} pkgs
              </Text>
            </View>
          )}
          {order?.stops?.length > 0 && (
            <View style={$.infoChip}>
              <Icon name="map-marker-path" size={12} color={colors.textMuted} />
              <Text style={$.infoChipTxt}>
                {order.stops.filter(s => s.status === 'completed').length}/{order.stops.length} stops
              </Text>
            </View>
          )}
          {!!order?.scheduled_date && (
            <View style={$.infoChip}>
              <Icon name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={$.infoChipTxt} numberOfLines={1}>
                {new Date(order.scheduled_date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})}
              </Text>
            </View>
          )}
          {!!order?.items_count && (
            <View style={$.infoChip}>
              <Icon name="cube-outline" size={12} color={colors.textMuted} />
              <Text style={$.infoChipTxt}>{order.items_count} items</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ─── Empty State ────────────────────────────────────────── */
const Empty = ({tab, onRefresh}) => (
  <View style={$.empty}>
    <View style={$.emptyIcWrap}>
      <View style={$.emptyIcInner}>
        <Icon name="package-variant-closed" size={36} color={colors.textLight} />
      </View>
    </View>
    <Text style={$.emptyH}>
      {tab === 'all' ? 'No orders yet' : `No ${tab.replace(/_/g, ' ')} orders`}
    </Text>
    <Text style={$.emptyP}>
      {tab === 'all'
        ? 'Your assigned orders will appear here.\nPull down to refresh.'
        : `No orders with "${tab.replace(/_/g, ' ')}" status.\nTry a different filter or pull to refresh.`}
    </Text>
    <TouchableOpacity style={$.emptyBtn} activeOpacity={0.6} onPress={onRefresh}>
      <Icon name="refresh" size={15} color={colors.primary} />
      <Text style={$.emptyBtnTxt}>Refresh</Text>
    </TouchableOpacity>
  </View>
);

export default MyOrdersScreen;

/* ═══════════════════════════════════════════════════════════ */
/*  STYLES                                                     */
/* ═══════════════════════════════════════════════════════════ */
const $ = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F3F5F9'},

  /* Header */
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
    fontSize: 22,
    color: colors.textPrimary,
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
    gap: 5,
    backgroundColor: colors.primary + '0D',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  sortTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
  },

  /* Search */
  searchWrap: {paddingHorizontal: HP, marginBottom: 10},
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
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
  },

  /* Chip Tabs */
  tabOuter: {marginBottom: 4, paddingVertical: 4},
  tabScroll: {},
  tabWrap: {paddingHorizontal: HP, paddingVertical: 4, gap: 8},
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
  chipOn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
  },
  chipTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTxtOn: {color: '#FFF'},
  chipCount: {
    marginLeft: 5,
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

  /* Loading */
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },

  /* List */
  list: {paddingHorizontal: HP, paddingTop: 4, paddingBottom: 24, flexGrow: 1},

  /* Order Card */
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardAccent: {height: 3},
  cardInner: {paddingHorizontal: 16, paddingVertical: 14},

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
    gap: 4,
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
    gap: 8,
  },
  codTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMidText: {
    flex: 1,
    marginLeft: 12,
  },
  orderNum: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  custName: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary + '0D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Card bottom */
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoChipTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
    maxWidth: 120,
  },

  /* Empty */
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8ECF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyH: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 8,
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
    gap: 6,
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
