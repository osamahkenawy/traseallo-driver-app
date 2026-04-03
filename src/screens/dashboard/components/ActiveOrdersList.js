/**
 * ActiveOrdersList — Shows 2-3 active order cards with "View All" link
 * Each card: order number, customer, status, area, COD, stops, action
 */

import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from '../../../utils/LucideIcon';
import useSettingsStore from '../../../store/settingsStore';
import {colors, getStatusColor, getStatusBgColor} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';

const ActiveOrdersList = ({orders = [], onOrderPress, onViewAll}) => {
  const {t} = useTranslation();
  const currency = useSettingsStore(s => s.currency);

  return (
    <View style={$.root}>
      {/* Section header */}
      <View style={$.header}>
        <Text style={$.sectionTitle}>{t('dashboard.activeOrdersTitle')}</Text>
        {orders.length > 0 && (
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
            <Text style={$.viewAll}>{t('dashboard.viewAll')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {orders.length === 0 ? (
        <View style={$.emptyCard}>
          <View style={$.emptyIcon}>
            <Icon name="package-variant-closed" size={28} color={colors.textLight} />
          </View>
          <Text style={$.emptyTitle}>{t('dashboard.noActiveDeliveries')}</Text>
          <Text style={$.emptySub}>
            {t('dashboard.noActiveDeliveriesDesc')}
          </Text>
        </View>
      ) : (
        <View style={$.list}>
          {orders.slice(0, 3).map((order, idx) => (
            <OrderCard
              key={`order-${order?.id || order?.tracking_token || ''}-${idx}`}
              order={order}
              onPress={() => onOrderPress?.(order)}
              t={t}
            />
          ))}
        </View>
      )}
    </View>
  );
};

/* ── Order Card ── */
const OrderCard = ({order, onPress, t}) => {
  const st = order?.status || 'assigned';
  const stClr = getStatusColor(st);
  const stBg = getStatusBgColor(st);
  const isCOD = order?.payment_method === 'cod' && parseFloat(order?.cod_amount) > 0;
  const stopCount = order?.stops_count || order?.total_stops || 0;
  const remainStops = order?.remaining_stops || 0;

  return (
    <TouchableOpacity style={$.card} onPress={onPress} activeOpacity={0.6}>
      <View style={[$.cardAccent, {backgroundColor: stClr}]} />
      <View style={$.cardBody}>
        {/* Row 1: Status + COD */}
        <View style={$.cardTopRow}>
          <View style={[$.statusBadge, {backgroundColor: stBg}]}>
            <View style={[$.statusDot, {backgroundColor: stClr}]} />
            <Text style={[$.statusTxt, {color: stClr}]}>
              {t('status.' + st, st)}
            </Text>
          </View>
          {isCOD && (
            <View style={$.codTag}>
              <Icon name="cash" size={11} color="#F9AD28" />
              <Text style={$.codTxt}>{currency} {order.cod_amount}</Text>
            </View>
          )}
        </View>

        {/* Row 2: Order num + customer */}
        <Text style={$.orderNum}>#{order?.order_number || '---'}</Text>
        <Text style={$.customer} numberOfLines={1}>
          {order?.recipient_name || t('dashboard.customer')}
        </Text>

        {/* Row 3: location + stops */}
        <View style={$.bottomRow}>
          <View style={$.locRow}>
            <Icon name="map-marker" size={13} color={colors.textMuted} />
            <Text style={$.locTxt} numberOfLines={1}>
              {order?.recipient_emirate || order?.recipient_area || order?.recipient_address || '---'}
            </Text>
          </View>
          {stopCount > 0 && (
            <View style={$.stopsTag}>
              <Icon name="map-marker-path" size={11} color={colors.textMuted} />
              <Text style={$.stopsTxt}>
                {remainStops > 0 ? t('dashboard.left', {count: remainStops}) : t('dashboard.stops', {count: stopCount})}
              </Text>
            </View>
          )}
        </View>

        {/* Arrow */}
        <View style={$.arrowBtn}>
          <Icon name="chevron-right" size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const $ = StyleSheet.create({
  root: {
    marginTop: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  viewAll: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
  list: {
    paddingHorizontal: 20,
    gap: 14,
  },
  // Card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  cardAccent: {height: 4, borderTopLeftRadius: 18, borderTopRightRadius: 18},
  cardBody: {padding: 16},
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {width: 6, height: 6, borderRadius: 3},
  statusTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    textTransform: 'capitalize',
  },
  codTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#FFF4E0',
  },
  codTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#D88D0D',
  },
  orderNum: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  customer: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  locTxt: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  stopsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F0F2F5',
  },
  stopsTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  arrowBtn: {
    position: 'absolute',
    top: 16,
    end: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 22,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default React.memo(ActiveOrdersList);
