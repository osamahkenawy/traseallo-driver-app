/**
 * Trasealla Driver App — Stop Detail Screen
 * Shows details of a single delivery stop with actions
 */

import React, {useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import useStopsStore from '../../store/stopsStore';
import useSettingsStore from '../../store/settingsStore';
import {routeNames} from '../../constants/routeNames';
import {useTranslation} from 'react-i18next';

const STATUS_COLORS = {
  pending: '#F39C12',
  arrived: '#3498DB',
  completed: '#27AE60',
  failed: '#E74C3C',
  skipped: '#95A5A6',
};

const StopDetailScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {stop, orderId, orderStatus, signatureData: sigFromRoute} = route.params || {};

  const {arrivedAtStop, completeStop, failStop, skipStop, isActing} = useStopsStore();
  const {requireSignature, requirePhoto} = useSettingsStore();
  const currency = useSettingsStore(s => s.currency);

  // Handle signature returned from SignatureScreen
  React.useEffect(() => {
    if (sigFromRoute && stop?.id) {
      completeStop(stop.id, {signature: sigFromRoute})
        .then(() => Alert.alert(t('stopDetail.success'), t('stopDetail.completedSuccessfully')))
        .catch(err => Alert.alert(t('orderDetail.error'), err?.response?.data?.message || t('orderDetail.failedToUpdate')));
    }
  }, [sigFromRoute]);

  // Guard: stop actions require parent order to be picked_up or in_transit
  const pickupDone = !orderStatus || ['picked_up', 'in_transit'].includes(orderStatus);

  const status = stop?.status || 'pending';
  const statusColor = STATUS_COLORS[status] || '#95A5A6';

  const handleNavigate = useCallback(() => {
    if (stop?.latitude && stop?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`;
      Linking.openURL(url);
    } else if (stop?.address) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`;
      Linking.openURL(url);
    }
  }, [stop]);

  const handleCall = useCallback(() => {
    if (stop?.phone) {
      Linking.openURL(`tel:${stop.phone}`);
    }
  }, [stop]);

  const handleArrived = async () => {
    try {
      await arrivedAtStop(stop.id);
      Alert.alert(t('stopDetail.success'), t('stopDetail.markedArrived'));
    } catch (error) {
      Alert.alert(t('orderDetail.error'), error?.response?.data?.message || t('orderDetail.failedToUpdate'));
    }
  };

  const handleComplete = async () => {
    // Check if signature/photo is required
    if (requireSignature) {
      navigation.navigate(routeNames.Signature, {
        returnScreen: routeNames.StopDetail,
        returnParams: {stop, orderId, orderStatus},
      });
      return;
    }

    try {
      await completeStop(stop.id);
      Alert.alert(t('stopDetail.success'), t('stopDetail.stopCompleted'), [
        {text: t('common.done'), onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert(t('orderDetail.error'), error?.response?.data?.message || t('orderDetail.failedToUpdate'));
    }
  };

  const handleFail = () => {
    Alert.prompt
      ? Alert.prompt(t('stopDetail.reportFailure'), t('stopDetail.enterFailureReason'), [
          {text: t('common.cancel'), style: 'cancel'},
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async reason => {
              try {
                await failStop(stop.id, {reason});
                Alert.alert(t('common.done'), t('stopDetail.stopFailed'), [
                  {text: t('common.done'), onPress: () => navigation.goBack()},
                ]);
              } catch (error) {
                Alert.alert(t('orderDetail.error'), error?.response?.data?.message || t('orderDetail.failedToUpdate'));
              }
            },
          },
        ])
      : Alert.alert(t('stopDetail.reportFailure'), t('stopDetail.failConfirm'), [
          {text: t('common.cancel'), style: 'cancel'},
          {
            text: t('orderDetail.fail'),
            style: 'destructive',
            onPress: async () => {
              try {
                await failStop(stop.id, {reason: t('stopDetail.driverReportedFailure')});
                navigation.goBack();
              } catch {}
            },
          },
        ]);
  };

  const handleSkip = () => {
    Alert.alert(t('stopDetail.skip'), t('stopDetail.skipConfirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.confirm'),
        onPress: async () => {
          try {
            await skipStop(stop.id, {reason: t('stopDetail.skippedByDriver')});
            navigation.goBack();
          } catch (error) {
            Alert.alert(t('orderDetail.error'), error?.response?.data?.message || t('orderDetail.failedToUpdate'));
          }
        },
      },
    ]);
  };

  if (!stop) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('stopDetail.noStopData')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
          <Text style={[styles.statusText, {color: statusColor}]}>
          {t('status.' + status, status).toUpperCase()}
          </Text>
        </View>

        {/* Stop Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('stopDetail.stopNumber', {num: stop.sequence || stop.stop_number || '—'})}</Text>
          {stop.recipient_name && (
            <InfoRow label={t('stopDetail.recipientName')} value={stop.recipient_name} />
          )}
          {stop.address && <InfoRow label={t('stopDetail.address')} value={stop.address} />}
          {stop.phone && <InfoRow label={t('stopDetail.phone')} value={stop.phone} />}
          {stop.emirate && <InfoRow label={t('stopDetail.emirate')} value={stop.emirate} />}
          {stop.notes && <InfoRow label={t('stopDetail.specialInstructions')} value={stop.notes} />}
          {stop.cod_amount ? (
            <InfoRow label={t('stopDetail.codAmount')} value={`${currency} ${stop.cod_amount}`} />
          ) : null}
          {stop.packages_count ? (
            <InfoRow label={t('stopDetail.packages')} value={String(stop.packages_count)} />
          ) : null}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleNavigate}>
            <Text style={styles.actionBtnText}>{t('stopDetail.navigate')}</Text>
          </TouchableOpacity>
          {stop.phone && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <Text style={styles.actionBtnText}>{t('stopDetail.call')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTAs */}
      {(status === 'pending' || status === 'arrived') && pickupDone && (
        <View style={styles.bottomBar}>
          {isActing ? (
            <ActivityIndicator color="#4A90D9" size="large" />
          ) : status === 'pending' ? (
            <>
              <TouchableOpacity
                style={[styles.ctaBtn, {backgroundColor: '#3498DB'}]}
                onPress={handleArrived}>
                <Text style={styles.ctaBtnText}>{t('pickup.arrived')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>{t('stopDetail.skip')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.ctaBtn, {backgroundColor: '#27AE60', flex: 1}]}
                onPress={handleComplete}>
                <Text style={styles.ctaBtnText}>{t('stopDetail.complete')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaBtn, {backgroundColor: '#E74C3C', flex: 1, marginStart: 8}]}
                onPress={handleFail}>
                <Text style={styles.ctaBtnText}>{t('stopDetail.fail')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const InfoRow = ({label, value}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F6FA'},
  content: {padding: 16, paddingBottom: 120},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {fontSize: 15, color: '#999'},
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {fontSize: 12, fontWeight: '700'},
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 12},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {fontSize: 13, color: '#999', flex: 1},
  infoValue: {fontSize: 13, color: '#333', flex: 2, textAlign: 'right'},
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionBtnText: {fontSize: 14, fontWeight: '600', color: '#4A90D9'},
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    paddingBottom: 34,
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  ctaBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaBtnText: {fontSize: 15, fontWeight: '700', color: '#FFF'},
  skipBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  skipBtnText: {fontSize: 15, fontWeight: '600', color: '#666'},
});

export default StopDetailScreen;
