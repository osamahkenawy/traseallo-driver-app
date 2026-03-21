/**
 * Pickup Detail Screen — Status-based pickup workflow with CTAs
 */

import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import usePickupStore from '../../store/pickupStore';

const InfoRow = ({icon, label, value}) => (
  <View style={s.infoRow}>
    <Icon name={icon} size={16} color={colors.textMuted} />
    <View style={{flex: 1}}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

const PickupDetailScreen = ({navigation, route}) => {
  const ins = useSafeAreaInsets();
  const pickup = route.params?.pickup || {};
  const {enRoute, markArrived, confirmPickup, failPickup, isActing} = usePickupStore();

  const [status, setStatus] = useState(pickup.status || 'pending');
  const [actionLoading, setActionLoading] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [showFail, setShowFail] = useState(false);

  const orderId = pickup.id || pickup.order_id;
  const statusColor = getStatusColor(status);
  const formatLabel = (st) =>
    (st || 'pending').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handleEnRoute = async () => {
    setActionLoading(true);
    try {
      await enRoute(orderId);
      setStatus('en_route');
      Alert.alert('Success', 'You are now en route to pickup');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrived = async () => {
    setActionLoading(true);
    try {
      await markArrived(orderId);
      setStatus('arrived');
      Alert.alert('Success', 'Arrival confirmed');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to mark arrival');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    Alert.alert('Confirm Pickup', 'Mark this pickup as completed?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Confirm',
        onPress: async () => {
          setActionLoading(true);
          try {
            await confirmPickup(orderId);
            setStatus('picked_up');
            Alert.alert('Success', 'Pickup confirmed!');
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to confirm pickup');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleFail = async () => {
    if (!failReason.trim()) {
      Alert.alert('Required', 'Please enter a failure reason.');
      return;
    }
    setActionLoading(true);
    try {
      await failPickup(orderId, {reason: failReason.trim()});
      setStatus('failed');
      setShowFail(false);
      Alert.alert('Reported', 'Pickup marked as failed.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNavigate = () => {
    const addr = pickup.pickup_address || pickup.address;
    const lat = pickup.latitude || pickup.lat;
    const lng = pickup.longitude || pickup.lng;
    if (lat && lng) {
      Linking.openURL(`https://maps.apple.com/?daddr=${lat},${lng}`);
    } else if (addr) {
      Linking.openURL(`https://maps.apple.com/?daddr=${encodeURIComponent(addr)}`);
    } else {
      Alert.alert('No Address', 'No location available for navigation.');
    }
  };

  const isTerminal = status === 'picked_up' || status === 'completed' || status === 'failed';

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Pickup Detail</Text>
        <View style={{width: 20}} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={s.statusRow}>
          <View style={[s.statusBadge, {backgroundColor: getStatusBgColor(status)}]}>
            <Icon name="package-variant" size={14} color={statusColor} />
            <Text style={[s.statusText, {color: statusColor}]}>{formatLabel(status)}</Text>
          </View>
        </View>

        {/* Pickup Info Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Pickup Information</Text>
          <InfoRow
            icon="store-outline"
            label="Merchant"
            value={pickup.merchant_name || pickup.store_name}
          />
          <View style={s.sep} />
          <InfoRow
            icon="map-marker-outline"
            label="Address"
            value={pickup.pickup_address || pickup.address}
          />
          <View style={s.sep} />
          <InfoRow
            icon="clock-outline"
            label="Scheduled"
            value={
              pickup.scheduled_at
                ? new Date(pickup.scheduled_at).toLocaleString('en-AE', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null
            }
          />
          <View style={s.sep} />
          <InfoRow
            icon="package-variant"
            label="Packages"
            value={`${pickup.package_count || pickup.order_count || pickup.items?.length || 0} items`}
          />
        </View>

        {/* Contact Card */}
        {(pickup.contact_name || pickup.contact_phone) ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Contact</Text>
            {pickup.contact_name && (
              <InfoRow icon="account-outline" label="Name" value={pickup.contact_name} />
            )}
            {pickup.contact_phone && (
              <>
                <View style={s.sep} />
                <TouchableOpacity
                  style={s.infoRow}
                  onPress={() => Linking.openURL(`tel:${pickup.contact_phone}`)}>
                  <Icon name="phone-outline" size={16} color={colors.info} />
                  <View style={{flex: 1}}>
                    <Text style={s.infoLabel}>Phone</Text>
                    <Text style={[s.infoValue, {color: colors.info}]}>{pickup.contact_phone}</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {/* Notes */}
        {pickup.notes ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Notes</Text>
            <Text style={s.notesTxt}>{pickup.notes}</Text>
          </View>
        ) : null}

        {/* Fail Reason Input */}
        {showFail && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Failure Reason</Text>
            <TextInput
              style={s.failInput}
              placeholder="Why can't you complete this pickup?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={failReason}
              onChangeText={setFailReason}
            />
            <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
              <TouchableOpacity
                style={[s.actionBtn, {flex: 1, backgroundColor: colors.bgMuted}]}
                onPress={() => setShowFail(false)}>
                <Text style={[s.actionTxt, {color: colors.textSecondary}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, {flex: 1, backgroundColor: colors.danger}]}
                onPress={handleFail}
                disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.actionTxt}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTAs */}
      {!isTerminal && (
        <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
          {status === 'pending' || status === 'assigned' ? (
            /* Step 1: Navigate  +  En Route */
            <View style={{gap: 10}}>
              <TouchableOpacity style={s.navBtn} onPress={handleNavigate} activeOpacity={0.8}>
                <Icon name="navigation-outline" size={16} color={colors.primary} />
                <Text style={s.navTxt}>Navigate to Pickup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.btn}
                onPress={handleEnRoute}
                activeOpacity={0.8}
                disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="truck-fast-outline" size={16} color="#FFF" />
                    <Text style={s.btnTxt}>En Route to Pickup</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : status === 'en_route' ? (
            /* Step 2: Navigate  +  Mark Arrived */
            <View style={{gap: 10}}>
              <TouchableOpacity style={s.navBtn} onPress={handleNavigate} activeOpacity={0.8}>
                <Icon name="navigation-outline" size={16} color={colors.primary} />
                <Text style={s.navTxt}>Navigate to Pickup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.btn}
                onPress={handleArrived}
                activeOpacity={0.8}
                disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="map-marker-check-outline" size={16} color="#FFF" />
                    <Text style={s.btnTxt}>I've Arrived</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : status === 'arrived' ? (
            /* Step 2: Confirm Pickup  +  Report Problem */
            <View style={{gap: 10}}>
              <TouchableOpacity
                style={s.btn}
                onPress={handleConfirm}
                activeOpacity={0.8}
                disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="check-circle-outline" size={16} color="#FFF" />
                    <Text style={s.btnTxt}>Confirm Pickup</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.dangerBtn}
                onPress={() => setShowFail(true)}
                activeOpacity={0.8}>
                <Icon name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={s.dangerTxt}>Report Problem</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 52,
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary},
  scroll: {paddingHorizontal: 20, paddingBottom: 160},

  statusRow: {alignItems: 'flex-start', marginBottom: 14},
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  statusText: {fontFamily: fontFamily.semiBold, fontSize: 12},

  card: {
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF1F5', padding: 18, marginBottom: 12,
  },
  cardTitle: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 14},
  infoRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 2},
  infoLabel: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted},
  infoValue: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary, marginTop: 1},
  sep: {height: 1, backgroundColor: '#EEF1F5', marginVertical: 10},

  notesTxt: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 19},

  failInput: {
    backgroundColor: '#F5F7FA', borderRadius: 10, padding: 12,
    fontFamily: fontFamily.regular, fontSize: 13, color: colors.textPrimary,
    minHeight: 70, textAlignVertical: 'top',
  },
  actionBtn: {
    height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  actionTxt: {fontFamily: fontFamily.semiBold, fontSize: 13, color: '#FFF'},

  /* Bottom */
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF1F5',
  },
  btn: {
    height: 48, backgroundColor: colors.primary, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  btnTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF'},
  navBtn: {
    height: 44, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.primary,
  },
  navTxt: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.primary},
  dangerBtn: {
    height: 44, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger + '30',
  },
  dangerTxt: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.danger},
});

export default PickupDetailScreen;
