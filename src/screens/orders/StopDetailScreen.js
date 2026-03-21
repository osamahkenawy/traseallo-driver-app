/**
 * Trasealla Driver App — Stop Detail Screen
 * Shows details of a single delivery stop with actions
 */

import React, {useState, useCallback} from 'react';
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

const STATUS_COLORS = {
  pending: '#F39C12',
  arrived: '#3498DB',
  completed: '#27AE60',
  failed: '#E74C3C',
  skipped: '#95A5A6',
};

const StopDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {stop, orderId} = route.params || {};

  const {arrivedAtStop, completeStop, failStop, skipStop, isActing} = useStopsStore();
  const {requireSignature, requirePhoto} = useSettingsStore();

  const [failReason, setFailReason] = useState('');

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
      Alert.alert('Success', 'Marked as arrived at stop.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to mark arrived.');
    }
  };

  const handleComplete = async () => {
    // Check if signature/photo is required
    if (requireSignature) {
      navigation.navigate(routeNames.Signature, {
        stopId: stop.id,
        orderId,
        onComplete: async signatureData => {
          await completeStop(stop.id, {signature: signatureData});
        },
      });
      return;
    }

    try {
      await completeStop(stop.id);
      Alert.alert('Success', 'Stop completed.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to complete stop.');
    }
  };

  const handleFail = () => {
    Alert.prompt
      ? Alert.prompt('Fail Stop', 'Enter a reason for failure:', [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Submit',
            style: 'destructive',
            onPress: async reason => {
              try {
                await failStop(stop.id, {reason});
                Alert.alert('Done', 'Stop marked as failed.', [
                  {text: 'OK', onPress: () => navigation.goBack()},
                ]);
              } catch (error) {
                Alert.alert('Error', error?.response?.data?.message || 'Failed to fail stop.');
              }
            },
          },
        ])
      : Alert.alert('Fail Stop', 'Mark this stop as failed?', [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Fail',
            style: 'destructive',
            onPress: async () => {
              try {
                await failStop(stop.id, {reason: 'Driver reported failure'});
                navigation.goBack();
              } catch {}
            },
          },
        ]);
  };

  const handleSkip = () => {
    Alert.alert('Skip Stop', 'Are you sure you want to skip this stop?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Skip',
        onPress: async () => {
          try {
            await skipStop(stop.id, {reason: 'Skipped by driver'});
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to skip stop.');
          }
        },
      },
    ]);
  };

  if (!stop) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No stop data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
          <Text style={[styles.statusText, {color: statusColor}]}>
            {status.toUpperCase()}
          </Text>
        </View>

        {/* Stop Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stop #{stop.sequence || stop.stop_number || '—'}</Text>
          {stop.recipient_name && (
            <InfoRow label="Recipient" value={stop.recipient_name} />
          )}
          {stop.address && <InfoRow label="Address" value={stop.address} />}
          {stop.phone && <InfoRow label="Phone" value={stop.phone} />}
          {stop.emirate && <InfoRow label="Emirate" value={stop.emirate} />}
          {stop.notes && <InfoRow label="Notes" value={stop.notes} />}
          {stop.cod_amount ? (
            <InfoRow label="COD Amount" value={`AED ${stop.cod_amount}`} />
          ) : null}
          {stop.packages_count ? (
            <InfoRow label="Packages" value={String(stop.packages_count)} />
          ) : null}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleNavigate}>
            <Text style={styles.actionBtnText}>Navigate</Text>
          </TouchableOpacity>
          {stop.phone && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <Text style={styles.actionBtnText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTAs */}
      {(status === 'pending' || status === 'arrived') && (
        <View style={styles.bottomBar}>
          {isActing ? (
            <ActivityIndicator color="#4A90D9" size="large" />
          ) : status === 'pending' ? (
            <>
              <TouchableOpacity
                style={[styles.ctaBtn, {backgroundColor: '#3498DB'}]}
                onPress={handleArrived}>
                <Text style={styles.ctaBtnText}>I've Arrived</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.ctaBtn, {backgroundColor: '#27AE60', flex: 1}]}
                onPress={handleComplete}>
                <Text style={styles.ctaBtnText}>Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaBtn, {backgroundColor: '#E74C3C', flex: 1, marginLeft: 8}]}
                onPress={handleFail}>
                <Text style={styles.ctaBtnText}>Fail</Text>
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
