/**
 * DeliverySummaryScreen — Shown after all packages in an order reach terminal status
 * Displays delivered/failed/returned breakdown per package
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {packagesApi} from '../../api';
import {routeNames} from '../../constants/routeNames';
import {CommonActions} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

// STATUS_LABELS now uses t('status.*') inside component

const STATUS_ICONS = {
  delivered: 'check-decagram',
  failed: 'close-circle-outline',
  returned: 'keyboard-return',
};

const DeliverySummaryScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const {orderId, token} = route.params || {};
  const [packages, setPackages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await packagesApi.getOrderPackages(orderId);
        if (cancelled) return;
        const data = res.data?.data || res.data;
        setPackages(data?.packages || data || []);
        setSummary(data?.summary || null);
      } catch {
        // fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (orderId) load();
    return () => { cancelled = true; };
  }, [orderId]);

  const delivered = summary?.delivered ?? packages.filter(p => p.status === 'delivered').length;
  const failed = summary?.failed ?? packages.filter(p => p.status === 'failed').length;
  const returned = packages.filter(p => p.status === 'returned').length;
  const total = summary?.total ?? packages.length;

  const allDelivered = delivered === total;
  const heroColor = allDelivered ? colors.success : colors.warning;
  const heroIcon = allDelivered ? 'check-circle' : 'alert-circle';
  const heroTitle = allDelivered ? t('deliverySummary.orderDelivered') : t('deliverySummary.title');
  const heroSub = allDelivered
    ? `${total} ${t('orderDetail.packages').toLowerCase()} ✓`
    : `${delivered} / ${total}`;

  if (loading) {
    return (
      <View style={[s.root, {paddingTop: ins.top, justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hdrBack}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('deliverySummary.title')}</Text>
        <View style={{width: 36}} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[s.heroCard, {borderColor: heroColor + '40'}]}>
          <View style={[s.heroIcWrap, {backgroundColor: heroColor + '15'}]}>
            <Icon name={heroIcon} size={40} color={heroColor} />
          </View>
          <Text style={s.heroTitle}>{heroTitle}</Text>
          <Text style={s.heroSub}>{heroSub}</Text>

          {/* Stats Row */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <View style={[s.statDot, {backgroundColor: colors.success}]} />
              <Text style={s.statVal}>{delivered}</Text>
              <Text style={s.statLabel}>{t('status.delivered')}</Text>
            </View>
            {failed > 0 && (
              <View style={s.statItem}>
                <View style={[s.statDot, {backgroundColor: colors.danger}]} />
                <Text style={s.statVal}>{failed}</Text>
                <Text style={s.statLabel}>{t('status.failed')}</Text>
              </View>
            )}
            {returned > 0 && (
              <View style={s.statItem}>
                <View style={[s.statDot, {backgroundColor: colors.orange}]} />
                <Text style={s.statVal}>{returned}</Text>
                <Text style={s.statLabel}>{t('status.returned')}</Text>
              </View>
            )}
            <View style={s.statItem}>
              <View style={[s.statDot, {backgroundColor: colors.primary}]} />
              <Text style={s.statVal}>{total}</Text>
              <Text style={s.statLabel}>{t('orderDetail.total')}</Text>
            </View>
          </View>
        </View>

        {/* Package Cards */}
        <Text style={s.secTitle}>{t('orderDetail.packages')}</Text>
        {packages.map((pkg, idx) => {
          const pkgStatus = pkg.status || 'assigned';
          const isDelivered = pkgStatus === 'delivered';
          const isFailed = pkgStatus === 'failed';
          const statusColor = getStatusColor(pkgStatus);
          return (
            <View key={pkg.id || idx} style={s.pkgCard}>
              <View style={s.pkgTop}>
                <View style={[s.pkgNumBadge, {backgroundColor: statusColor + '15'}]}>
                  <Text style={[s.pkgNum, {color: statusColor}]}>#{idx + 1}</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={s.pkgBarcode}>{pkg.barcode || t('deliverySummary.packageFallback', {num: idx + 1})}</Text>
                  <Text style={s.pkgRecipient}>{pkg.recipient_name || '---'}</Text>
                </View>
                <View style={[s.pkgStatusBadge, {backgroundColor: getStatusBgColor(pkgStatus)}]}>
                  <Icon
                    name={STATUS_ICONS[pkgStatus] || 'package-variant'}
                    size={12}
                    color={statusColor}
                  />
                  <Text style={[s.pkgStatusTxt, {color: statusColor}]}>
                    {t('status.' + pkgStatus) || pkgStatus}
                  </Text>
                </View>
              </View>
              {isFailed && pkg.failure_reason && (
                <View style={s.pkgReason}>
                  <Icon name="information-outline" size={13} color={colors.danger} />
                  <Text style={s.pkgReasonTxt}>
                    {pkg.failure_reason.replace(/_/g, ' ')}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{height: 100}} />
      </ScrollView>

      {/* Bottom */}
      <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
        <TouchableOpacity
          style={s.continueBtn}
          onPress={() => {
            // Reset to main tabs with Orders tab active
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{name: routeNames.MainTabs}],
              }),
            );
          }}
          activeOpacity={0.75}>
          <Text style={s.continueTxt}>{t('deliverySummary.backToOrders')}</Text>
          <Icon name="arrow-right" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 52, gap: 8,
  },
  hdrBack: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary, textAlign: 'auto'},
  scroll: {paddingHorizontal: 20, paddingBottom: 120},

  /* Hero */
  heroCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1.5, marginBottom: 20,
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: {width: 0, height: 4}},
      android: {elevation: 3},
    }),
  },
  heroIcWrap: {
    width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {fontFamily: fontFamily.bold, fontSize: 20, color: colors.textPrimary, marginBottom: 4},
  heroSub: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted, marginBottom: 20},
  statsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 24,
  },
  statItem: {alignItems: 'center'},
  statDot: {width: 8, height: 8, borderRadius: 4, marginBottom: 6},
  statVal: {fontFamily: fontFamily.bold, fontSize: 22, color: colors.textPrimary},
  statLabel: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2},

  secTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary, marginBottom: 12},

  /* Package card */
  pkgCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  pkgTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  pkgNumBadge: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  pkgNum: {fontFamily: fontFamily.bold, fontSize: 12},
  pkgBarcode: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary},
  pkgRecipient: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 1},
  pkgStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  pkgStatusTxt: {fontFamily: fontFamily.bold, fontSize: 10},
  pkgReason: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.dangerBg, borderRadius: 8, padding: 8, marginTop: 8,
  },
  pkgReasonTxt: {
    fontFamily: fontFamily.regular, fontSize: 11, color: colors.danger,
    textTransform: 'capitalize',
  },

  /* Bottom */
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF1F5',
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: {width: 0, height: -4}},
      android: {elevation: 8},
    }),
  },
  continueBtn: {
    height: 50, backgroundColor: colors.primary, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  continueTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF'},
});

export default DeliverySummaryScreen;
