/**
 * IncomingOrdersSection — section header + list of OrderCards (or states).
 * Props: { orders, currency, isLoading, hasError, hasActiveOrders,
 *          onAccept, onReject, onPress, onNavigate, onCall,
 *          onRetry, onViewOrders, onViewAll, t }
 */
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {Inbox, AlertCircle, RefreshCw, ChevronRight} from 'lucide-react-native';
import OrderCard from './OrderCard';
import {D} from './dashboardTheme';

const SectionHeader = ({title, action, onAction}) => (
  <View style={s.header}>
    <Text style={s.headerTitle}>{title}</Text>
    {action ? (
      <TouchableOpacity onPress={onAction} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}} style={s.headerAction}>
        <Text style={s.headerActionTxt}>{action}</Text>
        <ChevronRight size={14} color={D.primary} strokeWidth={2.4} />
      </TouchableOpacity>
    ) : null}
  </View>
);

const EmptyState = ({hasActiveOrders, onViewOrders, t}) => (
  <View style={s.stateBox}>
    <View style={[s.stateIcon, {backgroundColor: D.primarySoft}]}>
      <Inbox size={22} color={D.primary} strokeWidth={2.2} />
    </View>
    <Text style={s.stateTitle}>
      {hasActiveOrders
        ? t('dashboard.noNewOrders', 'No new orders right now')
        : t('dashboard.allCaughtUp', 'You are all caught up')}
    </Text>
    <Text style={s.stateSub}>
      {hasActiveOrders
        ? t('dashboard.checkActive', 'Check your active deliveries to continue.')
        : t('dashboard.waitingOrders', 'New orders will appear here as they arrive.')}
    </Text>
    {hasActiveOrders && onViewOrders ? (
      <TouchableOpacity style={s.statePrimary} onPress={onViewOrders} activeOpacity={0.85}>
        <Text style={s.statePrimaryTxt}>{t('dashboard.viewActive', 'View active orders')}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const ErrorState = ({onRetry, t}) => (
  <View style={s.stateBox}>
    <View style={[s.stateIcon, {backgroundColor: D.redSoft}]}>
      <AlertCircle size={22} color={D.red} strokeWidth={2.2} />
    </View>
    <Text style={s.stateTitle}>{t('dashboard.loadFailed', 'Could not load orders')}</Text>
    <Text style={s.stateSub}>{t('dashboard.tryAgain', 'Please try again in a moment.')}</Text>
    {onRetry ? (
      <TouchableOpacity style={s.statePrimary} onPress={onRetry} activeOpacity={0.85}>
        <RefreshCw size={14} color="#FFF" strokeWidth={2.4} style={{marginRight: 6}} />
        <Text style={s.statePrimaryTxt}>{t('common.retry', 'Retry')}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const LoadingState = () => (
  <View style={s.stateBox}>
    <ActivityIndicator color={D.primary} />
  </View>
);

const IncomingOrdersSection = ({
  orders = [],
  currency,
  isLoading,
  hasError,
  hasActiveOrders,
  onAccept,
  onReject,
  onPress,
  onNavigate,
  onCall,
  onRetry,
  onViewOrders,
  onViewAll,
  t,
}) => {
  const count = orders.length;
  const showViewAll = count > 0 && !!onViewAll;

  return (
    <View style={s.wrap}>
      <SectionHeader
        title={t('dashboard.incomingOrders', 'Incoming Orders')}
        action={showViewAll ? t('common.viewAll', 'View all') : null}
        onAction={onViewAll}
      />

      {isLoading ? (
        <LoadingState />
      ) : hasError ? (
        <ErrorState onRetry={onRetry} t={t} />
      ) : count === 0 ? (
        <EmptyState hasActiveOrders={hasActiveOrders} onViewOrders={onViewOrders} t={t} />
      ) : (
        <View style={s.list}>
          {orders.map((order, index) => (
            <OrderCard
              key={order?.order_id ?? order?.id ?? order?.order_number ?? index}
              order={order}
              currency={currency}
              index={index}
              onAccept={onAccept}
              onReject={onReject}
              onPress={onPress}
              onNavigate={onNavigate}
              onCall={onCall}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {paddingHorizontal: 16, marginTop: 4},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  headerTitle: {fontSize: 15, fontWeight: '700', color: D.text},
  headerAction: {flexDirection: 'row', alignItems: 'center'},
  headerActionTxt: {fontSize: 12, fontWeight: '700', color: D.primary, marginRight: 2},
  list: {gap: 12},
  stateBox: {
    backgroundColor: D.surface,
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  stateIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  stateTitle: {fontSize: 14, fontWeight: '700', color: D.text, textAlign: 'center'},
  stateSub: {fontSize: 12, color: D.textMuted, marginTop: 4, textAlign: 'center'},
  statePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 14,
  },
  statePrimaryTxt: {color: '#FFF', fontSize: 12, fontWeight: '700'},
});

export default React.memo(IncomingOrdersSection);
