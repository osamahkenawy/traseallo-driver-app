/**
 * Trasealla Driver App — COD Pending Screen
 * Shows pending COD orders for collection and remittance
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
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import useCodStore from '../../store/codStore';
import useSettingsStore from '../../store/settingsStore';
import {routeNames} from '../../constants/routeNames';

const CODPendingScreen = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const currency = useSettingsStore(s => s.currency);
  const {
    pendingOrders: orders,
    summary,
    isLoading,
    isRefreshing,
    isCollecting: storeCollecting,
    fetchPending,
    fetchSummary,
    collectCod,
  } = useCodStore();
  const [collectingId, setCollectingId] = useState(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    await Promise.all([fetchPending(isRefresh), fetchSummary()]);
  }, [fetchPending, fetchSummary]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => fetchData(true), [fetchData]);

  const handleCollect = useCallback(
    (orderId, orderNumber, amount) => {
      Alert.alert(
        t('codPending.collectCod'),
        t('codPending.confirmCollect', {amount, orderNumber}),
        [
          {text: t('common.cancel'), style: 'cancel'},
          {
            text: t('common.confirm'),
            onPress: async () => {
              setCollectingId(orderId);
              try {
                await collectCod(orderId, {amount_collected: amount});
                Alert.alert(t('codPending.success'), t('codPending.collected', {amount}));
              } catch (error) {
                Alert.alert(
                  t('common.error'),
                  error?.response?.data?.message || t('codPending.collectFailed'),
                );
              } finally {
                setCollectingId(null);
              }
            },
          },
        ],
      );
    },
    [collectCod],
  );

  const totalPending = orders.reduce(
    (sum, o) => sum + (parseFloat(o.cod_amount) || 0),
    0,
  );

  const renderItem = useCallback(
    ({item}) => {
      const orderId = item.order_id || item.id;
      const isThisCollecting = collectingId === orderId;

      return (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardBody}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate(routeNames.OrderDetail, {orderId})
            }>
            <Text style={styles.orderNumber}>#{item.order_number || orderId}</Text>
            <Text style={styles.recipient} numberOfLines={1}>
              {item.recipient_name || item.customer_name || '—'}
            </Text>
            <Text style={styles.address} numberOfLines={1}>
              {item.delivery_address || '—'}
            </Text>
          </TouchableOpacity>

          <View style={styles.cardRight}>
            <Text style={styles.amount}>{currency} {item.cod_amount || '0'}</Text>
            <TouchableOpacity
              style={[styles.collectBtn, isThisCollecting && {opacity: 0.5}]}
              disabled={isThisCollecting}
              onPress={() =>
                handleCollect(orderId, item.order_number || orderId, item.cod_amount)
              }>
              {isThisCollecting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.collectBtnText}>{t('codPending.collect')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [collectingId, navigation, handleCollect],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('codPending.pendingCod')}</Text>
            <Text style={styles.summaryValue}>{currency} {totalPending.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t('codPending.orders')}</Text>
            <Text style={styles.summaryValue}>{orders.length}</Text>
          </View>
          {summary?.total_collected != null && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('codPending.collectedToday')}</Text>
              <Text style={[styles.summaryValue, {color: '#27AE60'}]}>
                {currency} {summary.total_collected}
              </Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item, idx) => `cod-${item.order_id || item.id || idx}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('codPending.noPending')}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F6FA'},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  summaryCard: {
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {flexDirection: 'row', justifyContent: 'space-around'},
  summaryItem: {alignItems: 'center'},
  summaryLabel: {fontSize: 12, color: '#999', marginBottom: 4},
  summaryValue: {fontSize: 18, fontWeight: '700', color: '#1A1A2E'},
  list: {padding: 16, paddingBottom: 24},
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBody: {flex: 1, marginEnd: 12},
  orderNumber: {fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4},
  recipient: {fontSize: 13, color: '#333', marginBottom: 2},
  address: {fontSize: 12, color: '#999'},
  cardRight: {alignItems: 'center', justifyContent: 'center'},
  amount: {fontSize: 16, fontWeight: '700', color: '#F39C12', marginBottom: 8},
  collectBtn: {
    backgroundColor: '#27AE60',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  collectBtnText: {fontSize: 13, fontWeight: '700', color: '#FFF'},
  empty: {alignItems: 'center', paddingTop: 60},
  emptyText: {fontSize: 15, color: '#999'},
});

export default CODPendingScreen;
