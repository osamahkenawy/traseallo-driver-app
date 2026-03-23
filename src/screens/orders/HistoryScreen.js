/**
 * Trasealla Driver App — History Screen
 * Shows past deliveries with pagination and filters
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import useRouteStore from '../../store/routeStore';
import useSettingsStore from '../../store/settingsStore';
import {routeNames} from '../../constants/routeNames';
import {useTranslation} from 'react-i18next';

const STATUS_COLORS = {
  delivered: '#27AE60',
  failed: '#E74C3C',
  returned: '#F39C12',
  cancelled: '#95A5A6',
};

const HistoryScreen = () => {
  const {t} = useTranslation();
  const currency = useSettingsStore(s => s.currency);
  const navigation = useNavigation();
  const {
    history,
    historyPagination,
    isLoadingHistory,
    fetchHistory,
    loadMoreHistory,
    resetHistory,
  } = useRouteStore();

  const [filter, setFilter] = useState('all');

  useEffect(() => {
    resetHistory();
    fetchHistory({page: 1, status: filter === 'all' ? undefined : filter});
  }, [filter]);

  const onRefresh = useCallback(() => {
    resetHistory();
    fetchHistory({page: 1, status: filter === 'all' ? undefined : filter});
  }, [filter]);

  const onEndReached = useCallback(() => {
    loadMoreHistory();
  }, []);

  const renderItem = useCallback(
    ({item}) => {
      const statusColor = STATUS_COLORS[item.status] || '#95A5A6';
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate(routeNames.OrderDetail, {orderId: item.order_id || item.id})
          }>
          <View style={styles.cardHeader}>
            <Text style={styles.orderNumber}>#{item.order_number || item.id}</Text>
            <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
              <Text style={[styles.statusText, {color: statusColor}]}>
                {t('status.' + (item.status || 'pending'), (item.status || '')).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.address} numberOfLines={1}>
            {item.delivery_address || item.recipient_address || '—'}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.date}>
              {item.delivered_at || item.completed_at || item.created_at
                ? new Date(
                    item.delivered_at || item.completed_at || item.created_at,
                  ).toLocaleDateString()
                : '—'}
            </Text>
            {item.cod_amount ? (
              <Text style={styles.cod}>COD: {currency} {item.cod_amount}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, t],
  );

  const FILTER_LABELS = {all: t('history.filterAll'), delivered: t('history.filterDelivered'), failed: t('history.filterFailed'), returned: t('status.returned')};
  const filters = ['all', 'delivered', 'failed', 'returned'];

  return (
    <View style={styles.container}>
      {/* Filter pills */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {FILTER_LABELS[f] || f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, idx) => `hist-${item.id || idx}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoadingHistory && historyPagination.page === 1} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingHistory && historyPagination.page > 1 ? (
            <ActivityIndicator style={{paddingVertical: 16}} color="#4A90D9" />
          ) : null
        }
        ListEmptyComponent={
          !isLoadingHistory ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('history.noHistory')}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F6FA'},
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterPillActive: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  filterText: {fontSize: 13, color: '#666'},
  filterTextActive: {color: '#FFF', fontWeight: '600'},
  list: {paddingHorizontal: 16, paddingBottom: 24},
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {fontSize: 15, fontWeight: '700', color: '#1A1A2E'},
  statusBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12},
  statusText: {fontSize: 11, fontWeight: '700'},
  address: {fontSize: 13, color: '#666', marginBottom: 8},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {fontSize: 12, color: '#999'},
  cod: {fontSize: 13, fontWeight: '600', color: '#F39C12'},
  empty: {alignItems: 'center', paddingTop: 60},
  emptyText: {fontSize: 15, color: '#999'},
});

export default HistoryScreen;