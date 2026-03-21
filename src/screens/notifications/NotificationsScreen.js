/**
 * Notifications Screen — Trasealla Driver App
 * Shows in-app + generated order-event notifications with rich cards
 */

import React, {useEffect, useCallback, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from '../../utils/LucideIcon';
import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useNotificationStore from '../../store/notificationStore';
import useOrders from '../../hooks/useOrders';

/* ── Helpers ── */
const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'});
};

const notifMeta = {
  assigned: {
    icon: 'clipboard-text-clock-outline',
    color: colors.primary,
    bg: '#E8EDF4',
    title: 'New Order Assigned',
    template: (o) => `Order #${o.order_number} has been assigned to you. Deliver to ${o.recipient_name || 'customer'} in ${o.recipient_emirate || 'the area'}.`,
  },
  picked_up: {
    icon: 'package-variant',
    color: '#10A6BA',
    bg: '#E0F5F7',
    title: 'Order Picked Up',
    template: (o) => `You picked up order #${o.order_number}. Head to ${o.recipient_emirate || 'the delivery address'}.`,
  },
  in_transit: {
    icon: 'truck-fast-outline',
    color: '#15C7AE',
    bg: '#E0F8F3',
    title: 'In Transit',
    template: (o) => `Order #${o.order_number} is on its way to ${o.recipient_name || 'customer'}.`,
  },
  delivered: {
    icon: 'check-decagram',
    color: '#15C7AE',
    bg: '#E0F8F3',
    title: 'Delivery Completed',
    template: (o) => `Order #${o.order_number} delivered successfully to ${o.recipient_name || 'customer'}.`,
  },
  failed: {
    icon: 'close-circle-outline',
    color: colors.danger,
    bg: '#FDE8EE',
    title: 'Delivery Failed',
    template: (o) => `Order #${o.order_number} delivery attempt failed.`,
  },
};

/* ═══════════════════════════════════════════════════════════ */
const NotificationsScreen = () => {
  const ins = useSafeAreaInsets();
  const navigation = useNavigation();

  // Server notifications
  const serverNotifs = useNotificationStore(st => st.notifications);
  const isLoading = useNotificationStore(st => st.isLoading);
  const fetchNotifications = useNotificationStore(st => st.fetchNotifications);
  const fetchUnreadCount = useNotificationStore(st => st.fetchUnreadCount);
  const markAsRead = useNotificationStore(st => st.markAsRead);
  const markAllAsRead = useNotificationStore(st => st.markAllAsRead);
  const clearAllNotifications = useNotificationStore(st => st.clearAllNotifications);
  const deleteNotification = useNotificationStore(st => st.deleteNotification);

  // Orders — generate local notifications from order events
  const {orders} = useOrders();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  /* ── Merge server notifs with order-derived notifs ── */
  const allNotifications = useMemo(() => {
    // Convert orders into notification-like items
    const orderNotifs = (orders || []).map((o, idx) => {
      const meta = notifMeta[o.status] || notifMeta.assigned;
      return {
        id: `order-${o.tracking_token || o.order_number || o.id || idx}`,
        type: 'order',
        title: meta.title,
        body: meta.template(o),
        icon: meta.icon,
        iconColor: meta.color,
        iconBg: meta.bg,
        status: o.status,
        created_at: o.updated_at || o.created_at,
        read_at: null, // treat as unread
        data: {
          tracking_token: o.tracking_token,
          order_number: o.order_number,
        },
      };
    });

    // Map server notifications
    const serverItems = (serverNotifs || []).map(n => ({
      ...n,
      type: 'server',
      icon: n.read_at ? 'bell-outline' : 'bell-ring-outline',
      iconColor: n.read_at ? colors.textMuted : colors.primary,
      iconBg: n.read_at ? '#F0F2F5' : colors.primary + '0D',
    }));

    // Merge & sort by date (newest first)
    const all = [...serverItems, ...orderNotifs];
    all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return all;
  }, [serverNotifs, orders]);

  const handleRefresh = useCallback(() => {
    fetchNotifications(true);
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const handleClearAll = useCallback(() => {
    if (!serverNotifs?.length) return;
    Alert.alert(
      'Clear All',
      'Delete all server notifications?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Clear All', style: 'destructive', onPress: clearAllNotifications},
      ],
    );
  }, [serverNotifs, clearAllNotifications]);

  const handlePress = useCallback((item) => {
    // Mark server notifications as read
    if (item.type === 'server' && !item.read_at && item.id) {
      markAsRead(item.id);
    }
    // Navigate to order detail if data contains tracking info
    if (item.data?.tracking_token) {
      navigation.navigate(routeNames.OrderDetail, {
        token: item.data.tracking_token,
        orderNumber: item.data.order_number,
      });
    }
  }, [markAsRead, navigation]);

  const handleDelete = useCallback((item) => {
    if (item.type === 'server' && item.id) {
      Alert.alert('Delete', 'Remove this notification?', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item.id)},
      ]);
    }
  }, [deleteNotification]);

  return (
    <View style={[$.root, {paddingTop: ins.top}]}>
      {/* ── Header ── */}
      <View style={$.hdr}>
        <View>
          <Text style={$.title}>Notifications</Text>
          <Text style={$.subtitle}>
            {allNotifications.length} notification{allNotifications.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={$.hdrActions}>
          <TouchableOpacity style={$.hdrBtn} onPress={markAllAsRead} activeOpacity={0.6}>
            <Icon name="check-all" size={14} color={colors.primary} />
            <Text style={$.hdrBtnTxt}>Read all</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[$.hdrBtn, $.hdrBtnDanger]} onPress={handleClearAll} activeOpacity={0.6}>
            <Icon name="trash-can-outline" size={14} color={colors.danger} />
            <Text style={[$.hdrBtnTxt, {color: colors.danger}]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={allNotifications}
        keyExtractor={(item, i) => item?.id?.toString() || i.toString()}
        renderItem={({item}) => (
          <NotifCard
            item={item}
            onPress={() => handlePress(item)}
            onLongPress={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={<Empty />}
        contentContainerStyle={$.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{height: 10}} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
};

/* ─── Notification Card ──────────────────────────────────── */
const NotifCard = ({item, onPress, onLongPress}) => {
  const unread = !item.read_at;
  const time = timeAgo(item.created_at);
  const stColor = item.status ? getStatusColor(item.status) : null;

  return (
    <TouchableOpacity
      style={[$.card, unread && $.cardUnread]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.55}>
      {/* Left icon */}
      <View style={[$.cardIc, {backgroundColor: item.iconBg || '#F0F2F5'}]}>
        <Icon
          name={item.icon || 'bell-outline'}
          size={18}
          color={item.iconColor || colors.textMuted}
        />
      </View>

      {/* Content */}
      <View style={$.cardContent}>
        <View style={$.cardTopRow}>
          <Text style={[$.cardTitle, unread && $.cardTitleBold]} numberOfLines={1}>
            {item.title || 'Notification'}
          </Text>
          {!!time && <Text style={$.cardTime}>{time}</Text>}
        </View>
        <Text style={$.cardBody} numberOfLines={2}>
          {item.body || item.message || ''}
        </Text>
        {/* Status tag + action hint */}
        <View style={$.cardFooter}>
          {!!stColor && (
            <View style={[$.statusTag, {backgroundColor: getStatusBgColor(item.status)}]}>
              <View style={[$.statusDot, {backgroundColor: stColor}]} />
              <Text style={[$.statusTagTxt, {color: stColor}]}>
                {(item.status || '').replace(/_/g, ' ')}
              </Text>
            </View>
          )}
          {item.data?.tracking_token && (
            <View style={$.actionHint}>
              <Text style={$.actionHintTxt}>View order</Text>
              <Icon name="chevron-right" size={12} color={colors.primary} />
            </View>
          )}
        </View>
      </View>

      {/* Unread dot */}
      {unread && <View style={$.unreadDot} />}
    </TouchableOpacity>
  );
};

/* ─── Empty State ────────────────────────────────────────── */
const Empty = () => (
  <View style={$.empty}>
    <View style={$.emptyIcWrap}>
      <View style={$.emptyIcInner}>
        <Icon name="bell-check-outline" size={32} color={colors.textLight} />
      </View>
    </View>
    <Text style={$.emptyH}>No notifications</Text>
    <Text style={$.emptyP}>
      You're all caught up! Notifications will appear{'\n'}when orders are assigned or updated.
    </Text>
  </View>
);

export default NotificationsScreen;

/* ═══════════════════════════════════════════════════════════ */
/*  STYLES                                                     */
/* ═══════════════════════════════════════════════════════════ */
const $ = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F3F5F9'},

  /* Header */
  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  hdrActions: {flexDirection: 'row', alignItems: 'center', gap: 10},
  hdrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '0D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hdrBtnDanger: {backgroundColor: colors.danger + '0D'},
  hdrBtnTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
  },

  /* List */
  list: {paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, flexGrow: 1},

  /* Card */
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#F6FAFF',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  cardIc: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  cardContent: {flex: 1},
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  cardTitleBold: {fontFamily: fontFamily.bold},
  cardTime: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  cardBody: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: {width: 5, height: 5, borderRadius: 2.5},
  statusTagTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    textTransform: 'capitalize',
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionHintTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginLeft: 6,
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
});

