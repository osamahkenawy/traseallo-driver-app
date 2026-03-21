/**
 * My Pickups Screen — Pickup list from API with pull-to-refresh
 */

import React, {useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import usePickupStore from '../../store/pickupStore';
import {routeNames} from '../../constants/routeNames';

const STATUS_ICONS = {
  pending: 'clock-outline',
  assigned: 'account-arrow-right-outline',
  arrived: 'map-marker-check-outline',
  picked_up: 'package-variant-closed-check',
  completed: 'check-circle-outline',
  failed: 'alert-circle-outline',
};

const MyPickupsScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();

  const {pickups, isLoading: loading, isRefreshing: refreshing, fetchPickups} = usePickupStore();

  useEffect(() => {
    fetchPickups();
  }, [fetchPickups]);

  const onRefresh = () => {
    fetchPickups(true);
  };

  const formatLabel = (status) =>
    (status || 'pending').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const renderItem = ({item}) => {
    const status = item.status || 'pending';
    const ic = STATUS_ICONS[status] || 'package-variant';
    const statusColor = getStatusColor(status);

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate(routeNames.PickupDetail, {pickup: item})}>
        <View style={s.cardTop}>
          <View style={[s.statusBadge, {backgroundColor: getStatusBgColor(status)}]}>
            <Icon name={ic} size={13} color={statusColor} />
            <Text style={[s.statusTxt, {color: statusColor}]}>{formatLabel(status)}</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.textMuted} />
        </View>

        <View style={s.infoRow}>
          <Icon name="store-outline" size={15} color={colors.textMuted} />
          <Text style={s.infoVal} numberOfLines={1}>
            {item.merchant_name || item.store_name || 'Merchant'}
          </Text>
        </View>

        <View style={s.infoRow}>
          <Icon name="map-marker-outline" size={15} color={colors.textMuted} />
          <Text style={s.infoVal} numberOfLines={1}>
            {item.pickup_address || item.address || '—'}
          </Text>
        </View>

        <View style={s.cardBottom}>
          <View style={s.infoRow}>
            <Icon name="package-variant" size={15} color={colors.textMuted} />
            <Text style={s.infoVal}>
              {item.package_count || item.order_count || item.items?.length || 0} package
              {(item.package_count || item.order_count || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
          {item.scheduled_at && (
            <Text style={s.timeTxt}>
              {new Date(item.scheduled_at).toLocaleTimeString('en-AE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>My Pickups</Text>
        <View style={{width: 20}} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : pickups.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIc}>
            <Icon name="truck-fast-outline" size={26} color={colors.textLight} />
          </View>
          <Text style={s.emptyH}>No pickups assigned</Text>
          <Text style={s.emptyP}>Pickup assignments will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={pickups}
          keyExtractor={item => String(item.id || item.order_id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary},
  list: {paddingHorizontal: 20, paddingBottom: 30, gap: 10},

  /* Card */
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusTxt: {fontFamily: fontFamily.semiBold, fontSize: 11},
  infoRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6},
  infoVal: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textSecondary, flex: 1},
  cardBottom: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2},
  timeTxt: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.primary},

  /* Empty & loading */
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyIc: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  emptyH: {fontFamily: fontFamily.semiBold, fontSize: 15, color: colors.textPrimary},
  emptyP: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginTop: 3},
});

export default MyPickupsScreen;
