/**
 * TaskCard — Order card matching reference design
 * Shows: order name, company, status badge, date/weight,
 * pickup → destination with route line, distance/time.
 */

import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {showMessage} from 'react-native-flash-message';
import {MapPin, Copy} from 'lucide-react-native';
import {colors, getStatusColor} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {useTranslation} from 'react-i18next';

const TaskCard = ({order, onPress}) => {
  const {t, i18n} = useTranslation();
  const st = order?.status || 'assigned';
  const stColor = getStatusColor(st);
  const stLabel = t('status.' + st, st).toUpperCase();

  const orderName = order?.package_name || order?.order_name || order?.recipient_name || t('dashboard.order');
  const company = order?.sender_name || order?.company_name || order?.merchant_name || '';
  const orderNum = order?.order_number ? `#${order.order_number}` : '';
  const weight = order?.weight ? t('common.weightLbs', {weight: order.weight}) : '';
  const packageType = order?.package_type || order?.vehicle_type || t('dashboard.container');

  const pickupAddress = order?.pickup_address || order?.sender_address || '';
  const pickupArea = order?.pickup_area || order?.sender_area || order?.sender_emirate || '';
  const destAddress = order?.delivery_address || order?.recipient_address || '';
  const destArea = order?.delivery_area || order?.recipient_area || order?.recipient_emirate || '';

  const distance = order?.estimated_distance || order?.distance || '';
  const eta = order?.estimated_time || order?.eta || '';

  const dateStr = order?.created_at
    ? formatDate(order.created_at, t, i18n.language)
    : order?.scheduled_date || t('dashboard.today');

  return (
    <TouchableOpacity style={$.card} onPress={onPress} activeOpacity={0.7}>
      {/* Top row: status badge + name */}
      <View style={$.topRow}>
        <View style={[$.statusBadge, {backgroundColor: stColor + '15'}]}>
          <Text style={[$.statusTxt, {color: stColor}]}>{stLabel}</Text>
        </View>
        <Text style={$.orderName} numberOfLines={1}>{orderName}</Text>
      </View>

      {/* Order number row — copyable */}
      {orderNum ? (
        <TouchableOpacity
          style={$.orderNumRow}
          onPress={() => {
            Clipboard.setString(orderNum);
            showMessage({message: t('common.copied'), type: 'success', duration: 1500});
          }}
          activeOpacity={0.6}>
          <Text style={$.orderNum}>{orderNum}</Text>
          <Copy size={12} color={colors.textMuted} strokeWidth={2} style={{marginStart: 8}} />
        </TouchableOpacity>
      ) : null}

      {/* Company / sender */}
      {company ? (
        <Text style={$.company} numberOfLines={1}>{company}</Text>
      ) : null}

      {/* Meta row: date + package info */}
      <View style={$.metaRow}>
        <Text style={$.metaText}>{dateStr}</Text>
        {packageType ? (
          <>
            <View style={$.metaDot} />
            <Text style={$.metaText}>{packageType}</Text>
          </>
        ) : null}
        {weight ? (
          <>
            <View style={$.metaDot} />
            <Text style={$.metaText}>{weight}</Text>
          </>
        ) : null}
      </View>

      {/* Route section - pickup to destination */}
      <View style={$.routeSection}>
        {/* Pickup */}
        <View style={$.routeRow}>
          <View style={$.routeIconCol}>
            <View style={[$.routeCircle, {backgroundColor: colors.primary}]}>
              <MapPin size={13} color="#FFF" strokeWidth={2.5} />
            </View>
            <View style={$.routeLine} />
          </View>
          <View style={$.routeContent}>
            <Text style={$.routeLabel}>{pickupArea || t('dashboard.pickup')}</Text>
            <Text style={$.routeAddr} numberOfLines={1}>
              {pickupAddress || t('dashboard.warehousePickup')}
            </Text>
          </View>
        </View>

        {/* Distance/time pill */}
        {(distance || eta) ? (
          <View style={$.distPillWrap}>
            <View style={$.distPill}>
              <Text style={$.distText}>
                {distance ? `${distance}` : ''}
                {distance && eta ? ' · ' : ''}
                {eta ? `${eta}` : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Destination */}
        <View style={$.routeRow}>
          <View style={$.routeIconCol}>
            <View style={[$.routeCircle, {backgroundColor: colors.secondary}]}>
              <MapPin size={13} color="#FFF" strokeWidth={2.5} />
            </View>
          </View>
          <View style={$.routeContent}>
            <Text style={$.routeLabel}>{destArea || t('dashboard.destination')}</Text>
            <Text style={$.routeAddr} numberOfLines={1}>
              {destAddress || t('dashboard.deliveryAddress')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

function formatDate(dateStr, t, lang) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return t('dashboard.today');
    const locale = lang === 'ar' ? 'ar-AE' : 'en-US';
    return d.toLocaleDateString(locale, {weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'});
  } catch {
    return t('dashboard.today');
  }
}

const $ = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginEnd: 10,
  },
  statusTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  orderName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
    flex: 1,
  },
  orderNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  orderNum: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.secondary,
  },
  company: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textLight,
    marginHorizontal: 8,
  },

  // Route
  routeSection: {
    marginTop: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeIconCol: {
    width: 28,
    alignItems: 'center',
  },
  routeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeLine: {
    width: 2,
    height: 28,
    backgroundColor: '#D0D5DD',
    marginVertical: 2,
  },
  routeContent: {
    flex: 1,
    paddingBottom: 4,
    marginStart: 12,
  },
  routeLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  routeAddr: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
    lineHeight: 16,
  },

  // Distance pill
  distPillWrap: {
    paddingStart: 28,
    marginStart: 10,
    marginVertical: 2,
  },
  distPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8EDF4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.primary,
  },
});

export default React.memo(TaskCard);
