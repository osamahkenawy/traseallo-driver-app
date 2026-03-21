/**
 * TaskCard — Order card matching reference design
 * Shows: order name, company, status badge, date/weight,
 * pickup → destination with route line, distance/time.
 */

import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {MapPin} from 'lucide-react-native';
import {colors, getStatusColor} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';

const TaskCard = ({order, onPress}) => {
  const st = order?.status || 'assigned';
  const stColor = getStatusColor(st);
  const stLabel = (st || '').replace(/_/g, ' ').toUpperCase();

  const orderName = order?.package_name || order?.order_name || order?.recipient_name || 'Order';
  const company = order?.sender_name || order?.company_name || order?.merchant_name || '';
  const orderNum = order?.order_number ? `#${order.order_number}` : '';
  const weight = order?.weight ? `${order.weight} lbs` : '';
  const packageType = order?.package_type || order?.vehicle_type || 'Container';

  const pickupAddress = order?.pickup_address || order?.sender_address || '';
  const pickupArea = order?.pickup_area || order?.sender_area || order?.sender_emirate || '';
  const destAddress = order?.delivery_address || order?.recipient_address || '';
  const destArea = order?.delivery_area || order?.recipient_area || order?.recipient_emirate || '';

  const distance = order?.estimated_distance || order?.distance || '';
  const eta = order?.estimated_time || order?.eta || '';

  const dateStr = order?.created_at
    ? formatDate(order.created_at)
    : order?.scheduled_date || 'Today';

  const isPickup = st === 'confirmed' || st === 'assigned' || st === 'pending';

  return (
    <TouchableOpacity style={$.card} onPress={onPress} activeOpacity={0.7}>
      {/* Top row: name + status badge */}
      <View style={$.topRow}>
        <View style={$.titleArea}>
          <Text style={$.orderName} numberOfLines={1}>{orderName}</Text>
          <View style={$.companyRow}>
            {company ? (
              <Text style={$.company} numberOfLines={1}>{company}</Text>
            ) : null}
            {orderNum ? (
              <Text style={$.orderNum}>{orderNum}</Text>
            ) : null}
          </View>
        </View>
        <View style={[$.statusBadge, {backgroundColor: stColor + '15'}]}>
          <Text style={[$.statusTxt, {color: stColor}]}>{stLabel}</Text>
        </View>
      </View>

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
            <Text style={$.routeLabel}>{pickupArea || 'Pickup'}</Text>
            <Text style={$.routeAddr} numberOfLines={1}>
              {pickupAddress || 'Warehouse Pickup'}
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
            <Text style={$.routeLabel}>{destArea || 'Destination'}</Text>
            <Text style={$.routeAddr} numberOfLines={1}>
              {destAddress || 'Delivery Address'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'Today';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[d.getDay()]} · ${d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`;
  } catch {
    return 'Today';
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleArea: {flex: 1, marginRight: 10},
  orderName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  company: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  orderNum: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.secondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.5,
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
    marginLeft: 10,
    paddingBottom: 4,
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
    paddingLeft: 28,
    marginLeft: 10,
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
