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
import {useTranslation} from 'react-i18next';

const InfoRow = ({icon, label, value}) => (
  <View style={s.infoRow}>
    <View style={s.infoIconWrap}>
      <Icon name={icon} size={16} color={colors.textMuted} />
    </View>
    <View style={{flex: 1}}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

const PickupDetailScreen = ({navigation, route}) => {
  const ins = useSafeAreaInsets();
  const {t, i18n} = useTranslation();
  const pickup = route.params?.pickup || {};
  const {enRoute, markArrived, confirmPickup, failPickup, isActing} = usePickupStore();

  // Normalize status — API uses pickup_status, OrderDetail passes status
  const [status, setStatus] = useState(
    pickup.status || pickup.pickup_status || 'pending',
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [showFail, setShowFail] = useState(false);

  const orderId = pickup.id || pickup.order_id;
  const statusColor = getStatusColor(status);
  const formatLabel = (st) =>
    t('status.' + (st || 'pending'), (st || 'pending'));

  // Normalize field names — handle both order fields and dedicated pickup fields
  const merchantName = pickup.merchant_name || pickup.store_name || pickup.sender_name || pickup.client_name;
  const pickupAddress = pickup.pickup_address || pickup.address || pickup.sender_address;
  const pickupLat = pickup.latitude || pickup.lat || pickup.sender_lat;
  const pickupLng = pickup.longitude || pickup.lng || pickup.sender_lng;
  const scheduledAt = pickup.scheduled_at || pickup.pickup_scheduled_at;
  const packageCount = pickup.package_count || pickup.order_count || pickup.total_packages || pickup.items?.length || 0;
  const contactName = pickup.contact_name || pickup.sender_name;
  const contactPhone = pickup.contact_phone || pickup.sender_phone;
  const notes = pickup.notes || pickup.pickup_notes || pickup.special_instructions;

  const handleEnRoute = async () => {
    setActionLoading(true);
    try {
      await enRoute(orderId);
      setStatus('en_route');
      Alert.alert(t('pickup.success'), t('pickup.enRouteMsg'));
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('pickup.failedUpdate'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrived = async () => {
    setActionLoading(true);
    try {
      await markArrived(orderId);
      setStatus('arrived');
      Alert.alert(t('pickup.success'), t('pickup.arrivalConfirmed'));
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('pickup.failedArrival'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    Alert.alert(t('pickup.confirmPickup'), t('pickup.confirmPickupMsg'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.confirm'),
        onPress: async () => {
          setActionLoading(true);
          try {
            await confirmPickup(orderId);
            setStatus('picked_up');
            Alert.alert(t('pickup.success'), t('pickup.pickupConfirmed'));
          } catch (err) {
            Alert.alert(t('common.error'), err.response?.data?.message || t('pickup.failedConfirm'));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleFail = async () => {
    if (!failReason.trim()) {
      Alert.alert(t('pickup.required'), t('pickup.enterFailReason'));
      return;
    }
    setActionLoading(true);
    try {
      await failPickup(orderId, {reason: failReason.trim()});
      setStatus('failed');
      setShowFail(false);
      Alert.alert(t('pickup.reported'), t('pickup.pickupFailed'));
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('pickup.failedReport'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleNavigate = () => {
    if (pickupLat && pickupLng) {
      Linking.openURL(`https://maps.apple.com/?daddr=${pickupLat},${pickupLng}`);
    } else if (pickupAddress) {
      Linking.openURL(`https://maps.apple.com/?daddr=${encodeURIComponent(pickupAddress)}`);
    } else {
      Alert.alert(t('pickup.noAddress'), t('pickup.noLocationAvailable'));
    }
  };

  const isTerminal = status === 'picked_up' || status === 'completed' || status === 'failed' || status === 'pickup_failed';

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('pickup.detail')}</Text>
        <View style={{width: 20}} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={s.statusRow}>
          <View style={[s.statusBadge, {backgroundColor: getStatusBgColor(status)}]}>
            <Icon name="package-variant" size={14} color={statusColor} />
            <Text style={[s.statusText, {color: statusColor}]}>{formatLabel(status)}</Text>
          </View>
          {pickup.order_number ? (
            <Text style={s.orderNum}>#{pickup.order_number}</Text>
          ) : null}
        </View>

        {/* Pickup Info Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('pickup.pickupInfo')}</Text>
          <InfoRow
            icon="store-outline"
            label={t('pickup.merchant')}
            value={merchantName}
          />
          <View style={s.sep} />
          <InfoRow
            icon="map-marker-outline"
            label={t('pickup.address')}
            value={pickupAddress}
          />
          <View style={s.sep} />
          <InfoRow
            icon="clock-outline"
            label={t('pickup.scheduled')}
            value={
              scheduledAt
                ? new Date(scheduledAt).toLocaleString(i18n.language === 'ar' ? 'ar-AE' : 'en-AE', {
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
            label={t('pickup.packages')}
            value={`${packageCount} ${t('pickup.items')}`}
          />
        </View>

        {/* Contact Card */}
        {(contactName || contactPhone) ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('pickup.contact')}</Text>
            {contactName && (
              <InfoRow icon="account-outline" label={t('pickup.name')} value={contactName} />
            )}
            {contactPhone && (
              <>
                <View style={s.sep} />
                <TouchableOpacity
                  style={s.infoRow}
                  onPress={() => Linking.openURL(`tel:${contactPhone}`)}>
                  <View style={[s.infoIconWrap, {backgroundColor: colors.info + '15'}]}>
                    <Icon name="phone-outline" size={16} color={colors.info} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={s.infoLabel}>{t('pickup.phone')}</Text>
                    <Text style={[s.infoValue, {color: colors.info}]}>{contactPhone}</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {/* Notes */}
        {notes ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('pickup.notes')}</Text>
            <Text style={s.notesTxt}>{notes}</Text>
          </View>
        ) : null}

        {/* Fail Reason Input */}
        {showFail && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('pickup.failureReason')}</Text>
            <TextInput
              style={s.failInput}
              placeholder={t('pickup.failReasonPlaceholder')}
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
                <Text style={[s.actionTxt, {color: colors.textSecondary}]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, {flex: 1, backgroundColor: colors.danger}]}
                onPress={handleFail}
                disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.actionTxt}>{t('pickup.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTAs */}
      {!isTerminal && (
        <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
          {status === 'pending' || status === 'assigned' || status === 'none' || status === 'pending_pickup' || status === 'pickup_scheduled' ? (
            /* Step 1: Navigate  +  En Route */
            <View style={{gap: 10}}>
              <TouchableOpacity style={s.navBtn} onPress={handleNavigate} activeOpacity={0.8}>
                <Icon name="navigation-outline" size={16} color={colors.primary} />
                <Text style={s.navTxt}>{t('pickup.navigateToPickup')}</Text>
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
                    <Text style={s.btnTxt}>{t('pickup.enRoute')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : status === 'en_route' ? (
            /* Step 2: Navigate  +  Mark Arrived */
            <View style={{gap: 10}}>
              <TouchableOpacity style={s.navBtn} onPress={handleNavigate} activeOpacity={0.8}>
                <Icon name="navigation-outline" size={16} color={colors.primary} />
                <Text style={s.navTxt}>{t('pickup.navigateToPickup')}</Text>
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
                    <Text style={s.btnTxt}>{t('pickup.arrived')}</Text>
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
                    <Text style={s.btnTxt}>{t('pickup.confirmPickup')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.dangerBtn}
                onPress={() => setShowFail(true)}
                activeOpacity={0.8}>
                <Icon name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={s.dangerTxt}>{t('pickup.reportProblem')}</Text>
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
    paddingHorizontal: 20, height: 52, gap: 8,
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary, textAlign: 'auto'},
  scroll: {paddingHorizontal: 20, paddingBottom: 160},

  statusRow: {alignItems: 'flex-start', marginBottom: 14, gap: 6},
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  statusText: {fontFamily: fontFamily.semiBold, fontSize: 12},
  orderNum: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.textMuted},

  card: {
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF1F5', padding: 18, marginBottom: 12,
  },
  cardTitle: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 16},
  infoRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 4},
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#F0F3F8',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  infoLabel: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginBottom: 3},
  infoValue: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary, lineHeight: 18},
  sep: {height: 1, backgroundColor: '#EEF1F5', marginVertical: 12},

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
