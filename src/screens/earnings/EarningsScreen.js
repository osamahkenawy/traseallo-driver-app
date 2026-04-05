/**
 * Earnings Screen — Premium financial dashboard
 * Total earnings summary + daily chart + COD cards + transaction history
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
import {borderRadius} from '../../theme/borderRadius';
import {shadows} from '../../theme/shadows';
import {spacing} from '../../theme/spacing';
import useEarningsStore from '../../store/earningsStore';
import useCodStore from '../../store/codStore';
import useSettingsStore from '../../store/settingsStore';
import {useTranslation} from 'react-i18next';

/* ─── Total Earnings Hero Card ─────────────────────── */
const TotalEarningsCard = ({totalSummary, currency, t}) => {
  const earned = Number(totalSummary?.total_earned ?? 0);
  const paid = Number(totalSummary?.total_paid ?? 0);
  const pending = Number(totalSummary?.total_pending ?? 0);
  const fmt = (v) => Number(v || 0).toFixed(2);

  return (
    <View style={hs.card}>
      <View style={hs.orb} />
      <View style={hs.orbSm} />
      <Text style={hs.label}>{t('earnings.totalEarned', 'Total Earned')}</Text>
      <Text style={hs.value}>{currency} {fmt(earned)}</Text>
      <View style={hs.pillRow}>
        <View style={hs.pill}>
          <Icon name="arrow-up-bold" size={10} color="#FFF" style={{marginRight: 6}} />
          <Text style={hs.pillTxt}>{currency} {fmt(paid)} {t('earnings.paid', 'Paid')}</Text>
        </View>
        <View style={[hs.pill, hs.pillPending]}>
          <Icon name="clock-outline" size={10} color="#FFF" style={{marginRight: 6}} />
          <Text style={hs.pillTxt}>{currency} {fmt(pending)} {t('earnings.pendingLabel', 'Pending')}</Text>
        </View>
      </View>
    </View>
  );
};

/* ─── Mini Bar Chart ───────────────────────────────── */
const DailyChart = ({data, currency, t}) => {
  if (!data || data.length === 0) return null;

  const sorted = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const maxVal = Math.max(...sorted.map(d => Number(d.earned || 0)), 1);
  const BAR_MAX_H = 90;

  return (
    <View style={cs.chartCard}>
      <View style={cs.chartHeader}>
        <Text style={cs.chartTitle}>{t('earnings.breakdown', 'Breakdown')}</Text>
        <Text style={cs.chartSub}>{t('earnings.last7Days', 'Last 7 days')}</Text>
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
      <View style={cs.chartTotals}>
        <View style={cs.totalItem}>
          <Icon name="package-variant" size={14} color={colors.primary} />
          <Text style={cs.totalVal}>
            {sorted.reduce((s, d) => s + Number(d.deliveries || 0), 0)}
          </Text>
          <Text style={cs.totalLabel}>{t('ratings.deliveries', 'Deliveries')}</Text>
        </View>
        <View style={cs.totalItem}>
          <Icon name="cash-multiple" size={14} color={colors.success} />
          <Text style={cs.totalVal}>
            {currency} {sorted.reduce((s, d) => s + Number(d.earned || 0), 0).toFixed(0)}
          </Text>
          <Text style={cs.totalLabel}>{t('earnings.title', 'Earnings')}</Text>
        </View>
        <View style={cs.totalItem}>
          <Icon name="wallet-outline" size={14} color={colors.orange} />
          <Text style={cs.totalVal}>
            {currency} {sorted.reduce((s, d) => s + Number(d.cod_collected || 0), 0).toFixed(0)}
          </Text>
          <Text style={cs.totalLabel}>{t('earnings.codCollected', 'COD')}</Text>
        </View>
      </View>
    </View>
  );
};

/* ═══ Main Component ═══ */
const EarningsScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const currency = useSettingsStore(s => s.currency);

  const PERIODS = [
    t('earnings.today', 'Today'),
    t('earnings.thisWeek', 'This Week'),
    t('earnings.thisMonth', 'This Month'),
    t('earnings.allTime', 'All Time'),
  ];

  const earningsData = useEarningsStore(s => s.earnings);
  const earningSummary = useEarningsStore(s => s.summary);
  const totalSummary = useEarningsStore(s => s.totalSummary);
  const dailyBreakdown = useEarningsStore(s => s.dailyBreakdown);
  const isLoading = useEarningsStore(s => s.isLoading);
  const isRefreshing = useEarningsStore(s => s.isRefreshing);
  const fetchEarnings = useEarningsStore(s => s.fetchEarnings);
  const fetchDailyBreakdown = useEarningsStore(s => s.fetchDailyBreakdown);
  const fetchTotalEarnings = useEarningsStore(s => s.fetchTotalEarnings);

  const transactions = useCodStore(s => s.pendingOrders);
  const codSummary = useCodStore(s => s.summary);
  const fetchPending = useCodStore(s => s.fetchPending);
  const fetchSummary = useCodStore(s => s.fetchSummary);
  const [selectedPeriod, setSelectedPeriod] = useState(0);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      const safe = (fn) => fn ? fn().catch(() => null) : Promise.resolve(null);
      await Promise.all([
        safe(() => fetchTotalEarnings()),
        safe(() => fetchSummary()),
        safe(() => fetchEarnings({}, isRefresh)),
        safe(() => fetchDailyBreakdown(30)),
        safe(() => fetchPending(isRefresh)),
      ]);
    } catch (e) {
      if (__DEV__) console.warn('[EarningsScreen] fetchData error:', e?.message);
    }
  }, [fetchTotalEarnings, fetchSummary, fetchEarnings, fetchDailyBreakdown, fetchPending]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => fetchData(true);

  const getEarningsForPeriod = () => {
    const total = Number(totalSummary?.total_earned ?? earningSummary?.total_earned ?? 0);
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

  const fmt = (v) => Number(v || 0).toFixed(2);

  const allTransactions = useMemo(() => {
    const items = [];
    earningsData.forEach(e => items.push({...e, _type: 'earning'}));
    transactions.forEach(tx => items.push({...tx, _type: 'cod'}));
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
        <View style={[s.txIcon, {backgroundColor: (isEarning ? colors.success : statusColor) + '10'}]}>
          <Icon name={statusIcon} size={18} color={isEarning ? colors.success : statusColor} />
        </View>
        <View style={s.txInfo}>
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
            {isEarning ? '+' : ''}{currency} {fmt(amount)}
          </Text>
          <Text style={[s.txStatus, {color: isEarning ? colors.success : statusColor}]}>
            {isEarning ? t('earnings.deliveryFee', 'Delivery fee') : t('status.' + (item.status || 'pending'))}
          </Text>
        </View>
      </View>
    );
  };

  const effectiveTotal = totalSummary || earningSummary;

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('earnings.title', 'Earnings')}</Text>
        <View style={{width: 20}} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}>

        {/* Total Earnings Hero */}
        {effectiveTotal && (
          <TotalEarningsCard totalSummary={effectiveTotal} currency={currency} t={t} />
        )}

        {/* Period Selector */}
        <View style={s.periodRow}>
          {PERIODS.map((p, idx) => (
            <TouchableOpacity
              key={p}
              style={[s.periodPill, selectedPeriod === idx && s.periodActive]}
              onPress={() => setSelectedPeriod(idx)}
              activeOpacity={0.7}>
              <Text style={[s.periodTxt, selectedPeriod === idx && s.periodTxtActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Period Earnings */}
        <View style={s.periodHero}>
          <Text style={s.periodLabel}>{PERIODS[selectedPeriod]}</Text>
          <Text style={s.periodVal}>{currency} {getEarningsForPeriod()}</Text>
        </View>

        {/* Daily Chart */}
        <DailyChart data={dailyBreakdown} currency={currency} t={t} />

        {/* COD Summary Cards */}
        <View style={s.codRow}>
          <View style={[s.codCard, {marginEnd: 6}]}>
            <View style={[s.codIc, {backgroundColor: colors.orange + '12'}]}>
              <Icon name="wallet-outline" size={18} color={colors.orange} />
            </View>
            <Text style={[s.codVal, {color: colors.orange}]}>
              {currency} {fmt(codSummary?.total_collected || codSummary?.collected)}
            </Text>
            <Text style={s.codLabel}>{t('earnings.codCollected', 'COD Collected')}</Text>
          </View>
          <View style={[s.codCard, {marginStart: 6}]}>
            <View style={[s.codIc, {backgroundColor: colors.warning + '12'}]}>
              <Icon name="cash-multiple" size={18} color={colors.warning} />
            </View>
            <Text style={[s.codVal, {color: colors.warning}]}>
              {currency} {fmt(codSummary?.total_pending || codSummary?.pending)}
            </Text>
            <Text style={s.codLabel}>{t('earnings.codPending', 'COD Pending')}</Text>
          </View>
        </View>

        {/* Transactions */}
        <View style={s.secRow}>
          <Text style={s.secTitle}>{t('earnings.recentTransactions', 'Recent Transactions')}</Text>
        </View>

        {isLoading ? (
          <View style={s.emptyCard}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : allTransactions.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIc}>
              <Icon name="receipt" size={24} color={colors.textLight} />
            </View>
            <Text style={s.emptyH}>{t('earnings.noTransactions', 'No transactions yet')}</Text>
            <Text style={s.emptyP}>{t('earnings.noTransactionsDesc', 'Your earnings will appear here after deliveries.')}</Text>
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

/* ─── Total Earnings Hero Styles ─── */
const hs = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  orbSm: {
    position: 'absolute',
    bottom: -15,
    left: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    color: '#FFF',
    marginTop: 2,
    lineHeight: 40,
  },
  pillRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    marginRight: 8,
  },
  pillPending: {
    backgroundColor: 'rgba(249,173,40,0.3)',
  },
  pillTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#FFF',
  },
});

/* ─── Chart Styles ─── */
const cs = StyleSheet.create({
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...shadows.card,
    shadowOpacity: 0.05,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary},
  chartSub: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted},
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 2,
  },
  barCol: {alignItems: 'center', flex: 1},
  barVal: {fontFamily: fontFamily.semiBold, fontSize: 9, color: colors.textMuted, marginBottom: 4},
  bar: {width: 24, borderRadius: 8, backgroundColor: colors.primary + '20'},
  barToday: {backgroundColor: colors.primary},
  barLabel: {fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted, marginTop: 6},
  barLabelToday: {color: colors.primary, fontFamily: fontFamily.bold},
  todayDot: {width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 3},
  chartTotals: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  totalItem: {flexDirection: 'row', alignItems: 'center'},
  totalVal: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textPrimary, marginLeft: 6},
  totalLabel: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, marginStart: 2},
});

/* ─── Main Styles ─── */
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F3F4F6'},
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    height: 52,
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 17, color: colors.textPrimary},
  scroll: {paddingHorizontal: spacing.lg, paddingBottom: 40},

  periodRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FFF',
    alignItems: 'center',
    marginHorizontal: 3,
    ...shadows.soft,
    shadowOpacity: 0.03,
  },
  periodActive: {
    backgroundColor: colors.primary,
    ...shadows.card,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
  },
  periodTxt: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.textMuted},
  periodTxtActive: {color: '#FFF', fontFamily: fontFamily.semiBold},

  periodHero: {
    alignItems: 'center',
    marginBottom: 18,
  },
  periodLabel: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted},
  periodVal: {fontFamily: fontFamily.bold, fontSize: 28, color: colors.textPrimary, marginTop: 2},

  codRow: {flexDirection: 'row', marginBottom: 18},
  codCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: borderRadius.md,
    padding: 16,
    alignItems: 'center',
    ...shadows.card,
    shadowOpacity: 0.05,
  },
  codIc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  codVal: {fontFamily: fontFamily.bold, fontSize: 17},
  codLabel: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 8},

  secRow: {marginBottom: 10},
  secTitle: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary},

  txCard: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.md,
    ...shadows.card,
    shadowOpacity: 0.04,
    padding: 14,
  },
  txRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 8},
  txIcon: {width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center'},
  txInfo: {flex: 1, marginHorizontal: 16},
  txTitle: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary},
  txDate: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2},
  txAmount: {fontFamily: fontFamily.bold, fontSize: 14},
  txStatus: {fontFamily: fontFamily.regular, fontSize: 10, marginTop: 1},
  txSep: {height: 1, backgroundColor: '#F0F2F5', marginVertical: 2},

  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.md,
    paddingVertical: 40,
    alignItems: 'center',
    ...shadows.soft,
  },
  emptyIc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyH: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary},
  emptyP: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 3},
});

export default EarningsScreen;
