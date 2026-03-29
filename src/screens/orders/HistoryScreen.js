/**
 * Trasealla Driver App — History Screen
 * Past deliveries with status filters, date range, and pagination
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
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from '../../utils/LucideIcon';
import useRouteStore from '../../store/routeStore';
import useSettingsStore from '../../store/settingsStore';
import {routeNames} from '../../constants/routeNames';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {useTranslation} from 'react-i18next';

const STATUS_COLORS = {
  accepted: '#1565C0',
  delivered: colors.success,
  failed: colors.danger,
  returned: colors.orange,
  cancelled: colors.textMuted,
};

const STATUS_ICONS = {
  accepted: 'check-bold',
  delivered: 'check-circle-outline',
  failed: 'close-circle-outline',
  returned: 'undo-variant',
  cancelled: 'cancel',
};

// ─── Date Range Picker (simple modal with preset ranges) ───
const DATE_PRESETS = [
  {labelKey: 'history.dateToday', days: 0},
  {labelKey: 'history.dateWeek', days: 7},
  {labelKey: 'history.dateMonth', days: 30},
  {labelKey: 'history.date3Months', days: 90},
  {labelKey: 'history.dateAll', days: null},
];

const HistoryScreen = () => {
  const ins = useSafeAreaInsets();
  const {t, i18n} = useTranslation();
  const currency = useSettingsStore(s => s.currency);
  const navigation = useNavigation();
  const {
    history,
    historyPagination,
    isLoadingHistory,
    fetchHistory,
    resetHistory,
  } = useRouteStore();

  const [filter, setFilter] = useState('all');
  const [datePreset, setDatePreset] = useState(null); // null = all time
  const [showDateModal, setShowDateModal] = useState(false);

  const getDateParams = useCallback(() => {
    if (datePreset === null || datePreset === undefined) return {};
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - datePreset);
    return {
      date_from: from.toISOString().slice(0, 10),
      date_to: now.toISOString().slice(0, 10),
    };
  }, [datePreset]);

  const loadData = useCallback(() => {
    resetHistory();
    fetchHistory({
      page: 1,
      status: filter === 'all' ? undefined : filter,
      ...getDateParams(),
    });
  }, [filter, getDateParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => loadData(), [loadData]);

  const onEndReached = useCallback(() => {
    const params = {
      status: filter === 'all' ? undefined : filter,
      ...getDateParams(),
    };
    const {historyPagination, isLoadingHistory} = useRouteStore.getState();
    if (isLoadingHistory || !historyPagination.hasMore) return;
    fetchHistory({page: historyPagination.page + 1, ...params});
  }, [filter, getDateParams, fetchHistory]);

  const getDateLabel = () => {
    if (datePreset === null || datePreset === undefined) return t('history.dateAll');
    const preset = DATE_PRESETS.find(p => p.days === datePreset);
    return preset ? t(preset.labelKey) : '';
  };

  const renderItem = useCallback(
    ({item}) => {
      const rawStatus = (item.status || 'pending').toLowerCase();
      const statusColor = STATUS_COLORS[rawStatus] || colors.textMuted;
      const statusIcon = STATUS_ICONS[rawStatus] || 'help-circle-outline';

      return (
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate(routeNames.OrderDetail, {orderId: item.order_id || item.id})
          }>
          <View style={s.cardRow}>
            <View style={[s.cardIc, {backgroundColor: statusColor + '12'}]}>
              <Icon name={statusIcon} size={18} color={statusColor} />
            </View>
            <View style={{flex: 1}}>
              <View style={s.cardTop}>
                <Text style={s.orderNum}>#{item.order_number || item.id}</Text>
                <View style={[s.statusPill, {backgroundColor: statusColor + '14'}]}>
                  <Text style={[s.statusTxt, {color: statusColor}]}>
                    {t('status.' + rawStatus, rawStatus)}
                  </Text>
                </View>
              </View>
              <Text style={s.address} numberOfLines={1}>
                {item.delivery_address || item.recipient_address || '—'}
              </Text>
              <View style={s.cardBot}>
                <View style={s.datePill}>
                  <Icon name="calendar" size={11} color={colors.textMuted} />
                  <Text style={s.dateText}>
                    {item.delivered_at || item.completed_at || item.created_at
                      ? new Date(
                          item.delivered_at || item.completed_at || item.created_at,
                        ).toLocaleDateString(i18n.language === 'ar' ? 'ar-AE' : 'en-AE', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : '—'}
                  </Text>
                </View>
                {item.cod_amount ? (
                  <View style={s.codPill}>
                    <Icon name="cash-multiple" size={11} color={colors.orange} />
                    <Text style={s.codText}>COD {currency} {item.cod_amount}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textLight} />
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, t, currency, i18n.language],
  );

  const FILTER_LABELS = {
    all: t('history.filterAll'),
    delivered: t('history.filterDelivered'),
    failed: t('history.filterFailed'),
    returned: t('status.returned'),
  };
  const filters = ['all', 'delivered', 'failed', 'returned'];

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('history.title')}</Text>
        <TouchableOpacity
          onPress={() => setShowDateModal(true)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="calendar-range" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Range + Status Filters */}
      <View style={s.filterArea}>
        {/* Date indicator */}
        <TouchableOpacity style={s.dateBtn} activeOpacity={0.7} onPress={() => setShowDateModal(true)}>
          <Icon name="calendar" size={13} color={colors.primary} />
          <Text style={s.dateBtnTxt}>{getDateLabel()}</Text>
          <Icon name="chevron-down" size={12} color={colors.primary} />
        </TouchableOpacity>

        {/* Status pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsRow}>
          {filters.map(f => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s.pill, active && s.pillActive]}
                activeOpacity={0.7}
                onPress={() => setFilter(f)}>
                <Text style={[s.pillTxt, active && s.pillTxtActive]}>
                  {FILTER_LABELS[f] || f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, idx) => `hist-${item.id || idx}`}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingHistory && historyPagination.page === 1}
            onRefresh={onRefresh}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingHistory && historyPagination.page > 1 ? (
            <ActivityIndicator style={{paddingVertical: 16}} color={colors.primary} />
          ) : null
        }
        ListEmptyComponent={
          !isLoadingHistory ? (
            <View style={s.empty}>
              <View style={s.emptyIc}>
                <Icon name="package-variant" size={28} color={colors.textLight} />
              </View>
              <Text style={s.emptyH}>{t('history.noHistory')}</Text>
              <Text style={s.emptyP}>{t('history.noHistoryDesc')}</Text>
            </View>
          ) : null
        }
      />

      {/* Date Range Modal */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setShowDateModal(false)}>
          <View style={[s.modal, {paddingBottom: ins.bottom + 16}]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t('history.selectPeriod')}</Text>
            {DATE_PRESETS.map(preset => {
              const active = datePreset === preset.days;
              return (
                <TouchableOpacity
                  key={String(preset.days)}
                  style={[s.modalRow, active && s.modalRowActive]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setDatePreset(preset.days);
                    setShowDateModal(false);
                  }}>
                  <Text style={[s.modalRowTxt, active && s.modalRowTxtActive]}>
                    {t(preset.labelKey)}
                  </Text>
                  {active && <Icon name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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

  filterArea: {paddingHorizontal: 20, marginBottom: 4},
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '0D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    marginBottom: 10,
  },
  dateBtnTxt: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.primary},

  pillsRow: {gap: 8, paddingBottom: 10},
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  pillActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  pillTxt: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.textSecondary},
  pillTxtActive: {color: '#FFF'},

  list: {paddingHorizontal: 20, paddingBottom: 30},

  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  cardRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  cardIc: {width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center'},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  orderNum: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary},
  statusPill: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8},
  statusTxt: {fontFamily: fontFamily.bold, fontSize: 9, letterSpacing: 0.4},
  address: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginTop: 4},
  cardBot: {flexDirection: 'row', gap: 10, marginTop: 6},
  datePill: {flexDirection: 'row', alignItems: 'center', gap: 4},
  dateText: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted},
  codPill: {flexDirection: 'row', alignItems: 'center', gap: 4},
  codText: {fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.orange},

  empty: {alignItems: 'center', paddingTop: 70, gap: 8},
  emptyIc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyH: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary},
  emptyP: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted},

  // Modal
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end'},
  modal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {fontFamily: fontFamily.bold, fontSize: 15, color: colors.textPrimary, marginBottom: 12},
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  modalRowActive: {borderBottomColor: colors.primary + '20'},
  modalRowTxt: {fontFamily: fontFamily.medium, fontSize: 14, color: colors.textSecondary},
  modalRowTxtActive: {color: colors.primary, fontFamily: fontFamily.semiBold},
});

export default HistoryScreen;