/**
 * OrderCard — Composite card for an incoming assigned order.
 * Composes: OrderHeader + OrderRouteInfo + OrderMetaChips + OrderActions
 */

import React, {useCallback, useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useTranslation} from 'react-i18next';
import {colors} from '../../../theme/colors';
import {spacing} from '../../../theme/spacing';
import {shadows} from '../../../theme/shadows';
import {borderRadius} from '../../../theme/borderRadius';
import OrderHeader from './OrderHeader';
import OrderRouteInfo from './OrderRouteInfo';
import OrderMetaChips from './OrderMetaChips';
import OrderActions from './OrderActions';

const OrderCard = ({order, currency = 'AED', onAccept, onReject, onPress, index = 0}) => {
  const {t} = useTranslation();

  const pickupAddress = order?.sender_address || order?.pickup_address || '';
  const pickupArea = order?.sender_emirate || order?.sender_area || '';
  const destAddress = order?.recipient_address || order?.delivery_address || '';
  const destArea = order?.recipient_emirate || order?.recipient_area || '';
  const senderName = order?.sender_name || order?.client_name || t('dashboard.client');
  const recipientName = order?.recipient_name || t('dashboard.recipient');
  const orderNum = order?.order_number || '';
  const isCOD = order?.payment_method === 'cod' && parseFloat(order?.cod_amount) > 0;
  const codAmount = order?.cod_amount || 0;
  const deliveryFee = order?.delivery_fee || 0;
  const isExpress = order?.order_type === 'express';
  const totalPkgs = order?.total_packages || 0;

  const distance = order?.route_distance_km
    ? `${parseFloat(order.route_distance_km).toFixed(1)} km`
    : null;
  const eta = order?.route_duration_min
    ? `${Math.round(parseFloat(order.route_duration_min))} min`
    : null;

  const timeLabel = useMemo(() => {
    // Use assigned_at (when order was assigned to driver) if available, fallback to created_at
    const timestamp = order?.assigned_at || order?.created_at;
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('notifications.justNow', 'Just now');
    if (mins < 60) return t('notifications.minutesAgo', '{{count}} min ago', {count: mins});
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('notifications.hoursAgo', '{{count}}h ago', {count: hrs});
    return '';
  }, [order?.assigned_at, order?.created_at, t]);

  const handlePress = useCallback(() => onPress?.(order), [onPress, order]);
  const handleAccept = useCallback(() => onAccept?.(order), [onAccept, order]);
  const handleReject = useCallback(() => onReject?.(order), [onReject, order]);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(140).delay(index * 60)}
      style={$.outer}>
      <View style={$.card}>
        <View style={$.accent} />

        <OrderHeader
          orderNumber={orderNum}
          senderName={senderName}
          timeLabel={timeLabel}
          isExpress={isExpress}
          isCOD={isCOD}
          onPress={handlePress}
          t={t}
        />

        <OrderRouteInfo
          pickupArea={pickupArea}
          pickupAddress={pickupAddress}
          destArea={destArea}
          destAddress={destAddress}
          recipientName={recipientName}
          distance={distance}
          eta={eta}
          t={t}
        />

        <OrderMetaChips
          isCOD={isCOD}
          codAmount={codAmount}
          deliveryFee={deliveryFee}
          totalPackages={totalPkgs}
          currency={currency}
          t={t}
        />

        <OrderActions
          onAccept={handleAccept}
          onReject={handleReject}
          t={t}
        />
      </View>
    </Animated.View>
  );
};

const $ = StyleSheet.create({
  outer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.card,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  accent: {
    height: 3.5,
    backgroundColor: colors.secondary,
  },
});

export default React.memo(OrderCard);
