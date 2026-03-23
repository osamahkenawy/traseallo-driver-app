/**
 * Trasealla Driver App — Route Progress Screen
 * Shows current route with stops and real-time progress
 */

import React, {useEffect, useCallback} from 'react';
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
import useStopsStore from '../../store/stopsStore';
import {routeNames} from '../../constants/routeNames';
import {useTranslation} from 'react-i18next';

const STATUS_COLORS = {
  pending: '#F39C12',
  arrived: '#3498DB',
  completed: '#27AE60',
  failed: '#E74C3C',
  skipped: '#95A5A6',
  in_transit: '#9B59B6',
};

const RouteProgressScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {route, progress, isLoading, isRefreshing, fetchRoute, fetchProgress} =
    useRouteStore();

  useEffect(() => {
    fetchRoute();
    fetchProgress();
  }, []);

  const onRefresh = useCallback(() => {
    fetchRoute(true);
    fetchProgress();
  }, []);

  const stops = route?.stops || [];
  const completedCount = progress?.completed || stops.filter(s => s.status === 'completed').length;
  const totalCount = progress?.total || stops.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const renderStop = useCallback(
    ({item, index}) => {
      const color = STATUS_COLORS[item.status] || '#95A5A6';
      const isCompleted = item.status === 'completed';
      const isCurrent = item.status === 'arrived' || item.status === 'in_transit';

      return (
        <TouchableOpacity
          style={[styles.stopCard, isCurrent && styles.stopCardCurrent]}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate(routeNames.StopDetail, {
              stop: item,
              orderId: item.order_id,
            })
          }>
          {/* Timeline connector */}
          <View style={styles.timeline}>
            {index > 0 && (
              <View
                style={[
                  styles.lineUp,
                  {backgroundColor: isCompleted || isCurrent ? '#27AE60' : '#E0E0E0'},
                ]}
              />
            )}
            <View
              style={[
                styles.dot,
                {backgroundColor: color},
                isCurrent && styles.dotCurrent,
              ]}
            />
            {index < stops.length - 1 && (
              <View
                style={[
                  styles.lineDown,
                  {backgroundColor: isCompleted ? '#27AE60' : '#E0E0E0'},
                ]}
              />
            )}
          </View>

          {/* Stop info */}
          <View style={styles.stopInfo}>
            <View style={styles.stopHeader}>
              <Text style={styles.stopSequence}>{t('routeProgress.title')} {item.sequence || index + 1}</Text>
              <View style={[styles.statusPill, {backgroundColor: color + '20'}]}>
                <Text style={[styles.statusPillText, {color}]}>
                  {t('status.' + (item.status || 'pending'), (item.status || 'pending')).toUpperCase()}
                </Text>
              </View>
            </View>
            {item.recipient_name && (
              <Text style={styles.recipient}>{item.recipient_name}</Text>
            )}
            <Text style={styles.address} numberOfLines={1}>
              {item.address || '—'}
            </Text>
            {item.eta && <Text style={styles.eta}>{t('routeProgress.eta', {time: item.eta})}</Text>}
          </View>
        </TouchableOpacity>
      );
    },
    [stops.length, navigation],
  );

  if (isLoading && !route) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>{t('routeProgress.title')}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, {width: `${percentage}%`}]} />
        </View>
        <View style={styles.progressStats}>
          <Text style={styles.progressText}>
            {completedCount} {t('routeProgress.completed')} / {totalCount} {t('routeProgress.totalStops')}
          </Text>
          <Text style={styles.progressPercent}>{percentage}%</Text>
        </View>
        {route?.summary && (
          <Text style={styles.summaryText}>{route.summary}</Text>
        )}
      </View>

      {/* Stops List */}
      <FlatList
        data={stops}
        keyExtractor={(item, idx) => `stop-${item.id || item.stop_number || idx}`}
        renderItem={renderStop}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('routeProgress.noStops')}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F6FA'},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  progressCard: {
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
  progressTitle: {fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12},
  progressBarBg: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#27AE60',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {fontSize: 13, color: '#666'},
  progressPercent: {fontSize: 14, fontWeight: '700', color: '#27AE60'},
  summaryText: {fontSize: 12, color: '#999', marginTop: 8},
  list: {padding: 16, paddingBottom: 24},
  stopCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  stopCardCurrent: {
    borderWidth: 1.5,
    borderColor: '#3498DB',
  },
  timeline: {
    width: 30,
    alignItems: 'center',
    paddingVertical: 2,
  },
  lineUp: {width: 2, flex: 1, marginBottom: 4},
  lineDown: {width: 2, flex: 1, marginTop: 4},
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#3498DB',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  stopInfo: {flex: 1, marginStart: 10},
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopSequence: {fontSize: 14, fontWeight: '700', color: '#1A1A2E'},
  statusPill: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10},
  statusPillText: {fontSize: 10, fontWeight: '700'},
  recipient: {fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 2},
  address: {fontSize: 12, color: '#666'},
  eta: {fontSize: 11, color: '#4A90D9', marginTop: 4},
  empty: {alignItems: 'center', paddingTop: 40},
  emptyText: {fontSize: 15, color: '#999'},
});

export default RouteProgressScreen;
