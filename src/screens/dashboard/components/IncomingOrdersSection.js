/**
 * IncomingOrdersSection — FlatList of assigned orders with section header,
 * loading, empty, and error states.
 */

import React from 'react';
import {View, Text, TouchableOpacity, ActivityIndicator, StyleSheet} from 'react-native';
import Animated, {FadeInLeft, FadeIn, FadeInUp} from 'react-native-reanimated';
import {Inbox, Package, ArrowRight, RefreshCw} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/fonts';
import {spacing} from '../../../theme/spacing';
import {borderRadius} from '../../../theme/borderRadius';
import OrderCard from './OrderCard';

/* ─── Empty State ─── */
const EmptyState = ({t, hasActive, onViewOrders}) => (
  <Animated.View entering={FadeIn.duration(400).delay(200)}>
    <View style={$.emptyWrap}>
      <Animated.View entering={FadeInUp.springify().damping(14).delay(350)}>
        <View style={$.emptyIcon}>
          <Package size={28} color={colors.textLight} strokeWidth={1.5} />
        </View>
      </Animated.View>
      <Text style={$.emptyTitle}>
        {t('dashboard.allCaughtUp', 'All caught up!')}
      </Text>
      <Text style={$.emptyDesc}>
        {t('dashboard.noAssignedDesc', 'No pending orders to accept. New orders will appear here automatically.')}
      </Text>
      {hasActive && (
        <TouchableOpacity style={$.viewBtn} onPress={onViewOrders} activeOpacity={0.7}>
          <Text style={[$.viewBtnTxt, {marginRight: 10}]}>
            {t('dashboard.viewMyOrders', 'View My Orders')}
          </Text>
          <ArrowRight size={16} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  </Animated.View>
);

/* ─── Error State ─── */
const ErrorState = ({t, onRetry}) => (
  <View style={$.errorWrap}>
    <Text style={$.errorTxt}>
      {t('dashboard.loadError', 'Could not load orders')}
    </Text>
    <TouchableOpacity style={$.retryBtn} onPress={onRetry} activeOpacity={0.7}>
      <RefreshCw size={14} color={colors.primary} strokeWidth={2} style={{marginRight: 10}} />
      <Text style={$.retryTxt}>{t('common.retry', 'Retry')}</Text>
    </TouchableOpacity>
  </View>
);

/* ─── Section Header ─── */
const SectionHeader = ({count, t}) => (
  <Animated.View entering={FadeInLeft.springify().damping(18).stiffness(130).delay(200)}>
    <View style={$.sectionRow}>
      <View style={$.sectionIcon}>
        <Inbox size={14} color={colors.secondary} strokeWidth={2.5} />
      </View>
      <View style={{flex: 1}}>
        <Text style={$.sectionTitle}>
          {t('dashboard.incomingOrders', 'Incoming Orders')}
        </Text>
        <Text style={$.sectionSub}>
          {count > 0
            ? t('dashboard.ordersWaiting', '{{count}} orders waiting for your response', {count})
            : t('dashboard.noNewOrders', 'No new orders right now')}
        </Text>
      </View>
    </View>
  </Animated.View>
);

/* ═══ Main Component ═══ */
const IncomingOrdersSection = ({
  orders = [],
  currency,
  isLoading,
  hasError,
  hasActiveOrders,
  onAccept,
  onReject,
  onPress,
  onRetry,
  onViewOrders,
  t,
}) => {
  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={$.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (hasError) {
      return <ErrorState t={t} onRetry={onRetry} />;
    }
    return <EmptyState t={t} hasActive={hasActiveOrders} onViewOrders={onViewOrders} />;
  };

  return (
    <View style={$.list}>
      <SectionHeader count={orders.length} t={t} />
      {orders.length > 0
        ? orders.map((item, index) => (
            <OrderCard
              key={`order-${item?.id || item?.order_id || 'x'}-${index}`}
              order={item}
              currency={currency}
              onAccept={onAccept}
              onReject={onReject}
              onPress={onPress}
              index={index}
            />
          ))
        : renderEmpty()}
    </View>
  );
};

const $ = StyleSheet.create({
  list: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  // Section header
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm + 2,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    backgroundColor: colors.secondary + '0F',
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sectionSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  // Empty
  emptyWrap: {
    marginHorizontal: spacing.lg,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 3,
  },
  emptyDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 24,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '0A',
  },
  viewBtnTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
  },
  // Error
  errorWrap: {
    marginHorizontal: spacing.lg,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: borderRadius.md,
  },
  errorTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '0A',
  },
  retryTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
  },
  // Loading
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
});

export default React.memo(IncomingOrdersSection);
