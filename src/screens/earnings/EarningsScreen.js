/**
 * Earnings Screen — COD summary + earnings history from API
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import useEarningsStore from '../../store/earningsStore';
import useCodStore from '../../store/codStore';
import useSettingsStore from '../../store/settingsStore';
import {useTranslation} from 'react-i18next';

const EarningsScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const currency = useSettingsStore(s => s.currency);

  const PERIODS = [t('earnings.today'), t('earnings.thisWeek'), t('earnings.thisMonth'), t('earnings.allTime')];

  const {earnings: earningsData, summary: earningSummary, dailyBreakdown, isLoading, isRefreshing, fetchEarnings, fetchDailyBreakdown} = useEarningsStore();
  const {pendingOrders: transactions, summary: codSummary, fetchPending, fetchSummary} = useCodStore();
  const [selectedPeriod, setSelectedPeriod] = useState(0);

  const loading = isLoading;
  const refreshing = isRefreshing;

  const fetchData = useCallback(async (isRefresh = false) => {
    await Promise.allSettled([
      fetchSummary(),
      fetchEarnings({}, isRefresh),
      fetchDailyBreakdown(30),
      fetchPending(isRefresh),
    ]);
  }, [fetchSummary, fetchEarnings, fetchDailyBreakdown, fetchPending]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    fetchData(true);
  };

  const getEarningsForPeriod = () => {
    const total = Number(earningSummary?.total_earned ?? 0);
    if (selectedPeriod === 3) return total.toFixed(2); // All Time
    // Compute from daily breakdown
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    let sum = 0;
    for (const day of dailyBreakdown) {
      const d = day.date;
      if (selectedPeriod === 0 && d === todayStr) sum += Number(day.earned || 0);
      else if (selectedPeriod === 1 && d >= weekAgo.toISOString().slice(0, 10)) sum += Number(day.earned || 0);
      else if (selectedPeriod === 2 && d >= monthAgo.toISOString().slice(0, 10)) sum += Number(day.earned || 0);
    }
    return sum.toFixed(2);
  };

  const formatAmount = (v) => Number(v || 0).toFixed(2);

  const renderTransaction = ({item}) => {
    const isCollected = item.status === 'collected' || item.status === 'settled';
    const statusColor = isCollected ? colors.success : colors.warning;
    const statusIcon = isCollected ? 'check-circle-outline' : 'clock-outline';
    const statusLabel = t('status.' + (item.status || 'pending'));
    return (
      <View style={s.txRow}>
        <View style={[s.txIcon, {backgroundColor: statusColor + '12'}]}>
          <Icon name={statusIcon} size={18} color={statusColor} />
        </View>
        <View style={{flex: 1}}>
          <Text style={s.txTitle} numberOfLines={1}>
            {t('orders.orderNumber', {num: item.order_number || item.order_id || item.id})}
          </Text>
          <Text style={s.txDate}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString('en-AE', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </Text>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <Text style={[s.txAmount, {color: statusColor}]}>
            {currency} {formatAmount(item.amount || item.cod_amount)}
          </Text>
          <Text style={[s.txStatus, {color: statusColor}]}>{statusLabel}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('earnings.title')}</Text>
        <View style={{width: 20}} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.periodScroll}
          contentContainerStyle={{gap: 8}}>
          {PERIODS.map((p, idx) => (
            <TouchableOpacity
              key={p}
              style={[s.periodPill, selectedPeriod === idx && s.periodActive]}
              onPress={() => setSelectedPeriod(idx)}
              activeOpacity={0.7}>
              <Text style={[s.periodTxt, selectedPeriod === idx && s.periodTxtActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Earnings Header */}
        <View style={s.earningsHero}>
          <Text style={s.earningsLabel}>{PERIODS[selectedPeriod]} {t('earnings.title')}</Text>
          <Text style={s.earningsVal}>{currency} {getEarningsForPeriod()}</Text>
        </View>

        {/* Summary cards */}
        <View style={s.row}>
          <View style={s.sumCard}>
            <View style={[s.sumIc, {backgroundColor: colors.orange + '0D'}]}>
              <Icon name="wallet-outline" size={18} color={colors.orange} />
            </View>
            <Text style={[s.sumVal, {color: colors.orange}]}>
              {currency} {formatAmount(codSummary?.total_collected || codSummary?.collected)}
            </Text>
            <Text style={s.sumLabel}>{t('earnings.codCollected')}</Text>
          </View>
          <View style={s.sumCard}>
            <View style={[s.sumIc, {backgroundColor: colors.success + '0D'}]}>
              <Icon name="cash-multiple" size={18} color={colors.success} />
            </View>
            <Text style={[s.sumVal, {color: colors.success}]}>
              {currency} {formatAmount(codSummary?.total_pending || codSummary?.pending)}
            </Text>
            <Text style={s.sumLabel}>{t('earnings.codPending')}</Text>
          </View>
        </View>

        {/* Transaction History */}
        <Text style={s.secTitle}>{t('earnings.recentTransactions')}</Text>

        {loading ? (
          <View style={s.emptyCard}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : transactions.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIc}>
              <Icon name="receipt" size={22} color={colors.textLight} />
            </View>
            <Text style={s.emptyH}>{t('earnings.noTransactions')}</Text>
            <Text style={s.emptyP}>{t('earnings.noTransactionsDesc')}</Text>
          </View>
        ) : (
          <View style={s.txCard}>
            {transactions.map((item, idx) => (
              <React.Fragment key={item.id || idx}>
                {idx > 0 && <View style={s.txSep} />}
                {renderTransaction({item})}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>
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
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary, textAlign: 'auto'},
  scroll: {paddingHorizontal: 20, paddingBottom: 40},

  /* Period pills */
  periodScroll: {marginBottom: 16},
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  periodActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  periodTxt: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.textSecondary},
  periodTxtActive: {color: '#FFF'},

  /* Earnings hero */
  earningsHero: {alignItems: 'center', marginBottom: 20},
  earningsLabel: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginBottom: 4},
  earningsVal: {fontFamily: fontFamily.bold, fontSize: 32, color: colors.textPrimary},

  /* Summary cards */
  row: {flexDirection: 'row', gap: 10, marginBottom: 20},
  sumCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    gap: 4,
  },
  sumIc: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sumVal: {fontFamily: fontFamily.bold, fontSize: 18},
  sumLabel: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted},

  secTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary, marginBottom: 10},

  /* Transaction list */
  txCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    padding: 14,
  },
  txRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6},
  txIcon: {width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center'},
  txTitle: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary},
  txDate: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2},
  txAmount: {fontFamily: fontFamily.bold, fontSize: 14},
  txStatus: {fontFamily: fontFamily.regular, fontSize: 10, marginTop: 1},
  txSep: {height: 1, backgroundColor: '#EEF1F5', marginVertical: 4},

  /* Empty */
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  emptyIc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyH: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary},
  emptyP: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 3},
});

export default EarningsScreen;
