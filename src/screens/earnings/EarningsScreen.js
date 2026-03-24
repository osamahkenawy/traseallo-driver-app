/**
 * Earnings Screen — Daily chart + COD summary + earnings history
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
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

// ─── Mini Bar Chart (pure RN, no library) ────────────
const DailyChart = ({data, currency, t}) => {
  if (!data || data.length === 0) return null;

  // Take last 7 days, sorted ascending
  const sorted = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const maxVal = Math.max(...sorted.map(d => Number(d.earned || 0)), 1);
  const BAR_MAX_H = 100;

  return (
    <View style={cs.chartCard}>
      <View style={cs.chartHeader}>
        <Text style={cs.chartTitle}>{t('earnings.breakdown')}</Text>
        <Text style={cs.chartSub}>{t('earnings.last7Days')}</Text>
      </View>
      <View style={cs.barsRow}>
        {sorted.map((d, i) => {
          const val = Number(d.earned || 0);
          const h = Math.max((val / maxVal) * BAR_MAX_H, 4);
          const dt = new Date(d.date + 'T00:00:00');
          const label = dt.toLocaleDateString(undefined, {weekday: 'short'}).slice(0, 3);
          const isToday = d.date === new Date().toISOString().slice(0, 10);
          return (
            <View key={d.date || i} style={cs.barCol}>
              <Text style={cs.barVal}>
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val > 0 ? val.toFixed(0) : ''}
              </Text>
              <View style={[cs.bar, {height: h}, isToday && cs.barToday]} />
              <Text style={[cs.barLabel, isToday && cs.barLabelToday]}>{label}</Text>
              {isToday && <View style={cs.todayDot} />}
            </View>
          );
        })}
      </View>
      {/* Totals row */}
      <View style={cs.chartTotals}>
        <View style={cs.chartTotalItem}>
          <Icon name="package-variant" size={13} color={colors.primary} />
          <Text style={cs.chartTotalVal}>
            {sorted.reduce((s, d) => s + Number(d.deliveries || 0), 0)}
          </Text>
          <Text style={cs.chartTotalLabel}>{t('ratings.deliveries')}</Text>
        </View>
        <View style={cs.chartTotalItem}>
          <Icon name="cash-multiple" size={13} color={colors.success} />
          <Text style={cs.chartTotalVal}>
            {currency} {sorted.reduce((s, d) => s + Number(d.earned || 0), 0).toFixed(0)}
          </Text>
          <Text style={cs.chartTotalLabel}>{t('earnings.title')}</Text>
        </View>
        <View style={cs.chartTotalItem}>
          <Icon name="wallet-outline" size={13} color={colors.orange} />
          <Text style={cs.chartTotalVal}>
            {currency} {sorted.reduce((s, d) => s + Number(d.cod_collected || 0), 0).toFixed(0)}
          </Text>
          <Text style={cs.chartTotalLabel}>{t('earnings.codCollected')}</Text>
        </View>
      </View>
    </View>
  );
};

const EarningsScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const currency = useSettingsStore(s => s.currency);

  const PERIODS = [t('earnings.today'), t('earnings.thisWeek'), t('earnings.thisMonth'), t('earnings.allTime')];

  const earningsData = useEarningsStore(s => s.earnings);
  const earningSummary = useEarningsStore(s => s.summary);
  const dailyBreakdown = useEarningsStore(s => s.dailyBreakdown);
  const isLoading = useEarningsStore(s => s.isLoading);
  const isRefreshing = useEarningsStore(s => s.isRefreshing);
  const fetchEarnings = useEarningsStore(s => s.fetchEarnings);
  const fetchDailyBreakdown = useEarningsStore(s => s.fetchDailyBreakdown);

  const transactions = useCodStore(s => s.pendingOrders);
  const codSummary = useCodStore(s => s.summary);
  const fetchPending = useCodStore(s => s.fetchPending);
  const fetchSummary = useCodStore(s => s.fetchSummary);
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

  const onRefresh = () => fetchData(true);

  const getEarningsForPeriod = () => {
    const total = Number(earningSummary?.total_earned ?? 0);
    if (selectedPeriod === 3) return total.toFixed(2);
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

  // Combine earnings + COD transactions for display
  const allTransactions = useMemo(() => {
    const items = [];
    // Add earnings data
    earningsData.forEach(e => items.push({...e, _type: 'earning'}));
    // Add COD data
    transactions.forEach(t => items.push({...t, _type: 'cod'}));
    // Sort by date desc
    items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return items.slice(0, 20);
  }, [earningsData, transactions]);

  const renderTransaction = (item) => {
    const isEarning = item._type === 'earning';
    const isCollected = item.status === 'collected' || item.status === 'settled' || item.status === 'paid';
    const statusColor = isCollected ? colors.success : colors.warning;
    const statusIcon = isEarning ? 'cash-multiple' : isCollected ? 'check-circle-outline' : 'clock-outline';
    const amount = item.net_amount || item.amount || item.cod_amount || 0;

    return (
      <View style={s.txRow}>
        <View style={[s.txIcon, {backgroundColor: (isEarning ? colors.success : statusColor) + '12'}]}>
          <Icon name={statusIcon} size={18} color={isEarning ? colors.success : statusColor} />
        </View>
        <View style={{flex: 1}}>
          <Text style={s.txTitle} numberOfLines={1}>
            {item.order_number || t('orders.orderNumber', {num: item.order_id || item.id})}
          </Text>
          <Text style={s.txDate}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString('en-AE', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })
              : '—'}
          </Text>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <Text style={[s.txAmount, {color: isEarning ? colors.success : statusColor}]}>
            {isEarning ? '+' : ''}{currency} {formatAmount(amount)}
          </Text>
          <Text style={[s.txStatus, {color: isEarning ? colors.success : statusColor}]}>
            {isEarning ? t('earnings.deliveryFee') : t('status.' + (item.status || 'pending'))}
          </Text>
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
              <Text style={[s.periodTxt, selectedPeriod === idx && s.periodTxtActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Earnings Hero */}
        <View style={s.earningsHero}>
          <Text style={s.earningsLabel}>{PERIODS[selectedPeriod]} {t('earnings.title')}</Text>
          <Text style={s.earningsVal}>{currency} {getEarningsForPeriod()}</Text>
          {earningSummary && (
            <View style={s.heroMeta}>
              <View style={s.heroPill}>
                <Icon name="arrow-up-bold" size={10} color={colors.success} />
                <Text style={s.heroPillTxt}>{currency} {formatAmount(earningSummary.total_paid)} {t('earnings.paid')}</Text>
              </View>
              <View style={[s.heroPill, {backgroundColor: colors.warning + '12'}]}>
                <Icon name="clock-outline" size={10} color={colors.warning} />
                <Text style={[s.heroPillTxt, {color: colors.warning}]}>{currency} {formatAmount(earningSummary.total_pending)} {t('earnings.pendingLabel')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Daily Chart */}
        <DailyChart data={dailyBreakdown} currency={currency} t={t} />

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

        {/* Transactions */}
        <Text style={s.secTitle}>{t('earnings.recentTransactions')}</Text>

        {loading ? (
          <View style={s.emptyCard}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : allTransactions.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIc}>
              <Icon name="receipt" size={22} color={colors.textLight} />
            </View>
            <Text style={s.emptyH}>{t('earnings.noTransactions')}</Text>
            <Text style={s.emptyP}>{t('earnings.noTransactionsDesc')}</Text>
          </View>
        ) : (
          <View style={s.txCard}>
            {allTransactions.map((item, idx) => (
              <React.Fragment key={`${item._type}-${item.id || idx}`}>
                {idx > 0 && <View style={s.txSep} />}
                {renderTransaction(item)}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Chart Styles ────────────────────────────────────
const cs = StyleSheet.create({
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  chartHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  chartTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary},
  chartSub: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted},
  barsRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130, paddingHorizontal: 4},
  barCol: {alignItems: 'center', flex: 1},
  barVal: {fontFamily: fontFamily.semiBold, fontSize: 9, color: colors.textMuted, marginBottom: 4},
  bar: {width: 22, borderRadius: 6, backgroundColor: colors.primary + '30'},
  barToday: {backgroundColor: colors.primary},
  barLabel: {fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted, marginTop: 6},
  barLabelToday: {color: colors.primary, fontFamily: fontFamily.bold},
  todayDot: {width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 3},
  chartTotals: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
  },
  chartTotalItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
  chartTotalVal: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textPrimary},
  chartTotalLabel: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted},
});

// ─── Main Styles ─────────────────────────────────────
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 52,
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary, textAlign: 'auto'},
  scroll: {paddingHorizontal: 20, paddingBottom: 40},

  periodScroll: {marginBottom: 16},
  periodPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEF1F5',
  },
  periodActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  periodTxt: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.textSecondary},
  periodTxtActive: {color: '#FFF'},

  earningsHero: {alignItems: 'center', marginBottom: 20},
  earningsLabel: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginBottom: 4},
  earningsVal: {fontFamily: fontFamily.bold, fontSize: 34, color: colors.textPrimary},
  heroMeta: {flexDirection: 'row', gap: 8, marginTop: 10},
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.success + '12', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  heroPillTxt: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.success},

  row: {flexDirection: 'row', gap: 10, marginBottom: 20},
  sumCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#EEF1F5', gap: 4,
  },
  sumIc: {width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4},
  sumVal: {fontFamily: fontFamily.bold, fontSize: 18},
  sumLabel: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted},

  secTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary, marginBottom: 10},

  txCard: {backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEF1F5', padding: 14},
  txRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6},
  txIcon: {width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center'},
  txTitle: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary},
  txDate: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2},
  txAmount: {fontFamily: fontFamily.bold, fontSize: 14},
  txStatus: {fontFamily: fontFamily.regular, fontSize: 10, marginTop: 1},
  txSep: {height: 1, backgroundColor: '#EEF1F5', marginVertical: 4},

  emptyCard: {
    backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 40,
    alignItems: 'center', borderWidth: 1, borderColor: '#EEF1F5',
  },
  emptyIc: {width: 52, height: 52, borderRadius: 26, backgroundColor: '#F0F2F5', justifyContent: 'center', alignItems: 'center', marginBottom: 12},
  emptyH: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary},
  emptyP: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 3},
});

export default EarningsScreen;
