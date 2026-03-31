/**
 * Pickup Detail Screen — Modern pickup workflow with rich status UI
 */

import React, {useState, useRef, useEffect} from 'react';
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
  Animated,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import usePickupStore from '../../store/pickupStore';
import {useTranslation} from 'react-i18next';
import {showMessage} from 'react-native-flash-message';

/* ── Steps config ── */
const STEPS = [
  {key: 'pending', label: 'Pending', icon: 'clock-outline'},
  {key: 'en_route', label: 'En Route', icon: 'truck-fast-outline'},
  {key: 'arrived', label: 'Arrived', icon: 'map-marker-check-outline'},
  {key: 'picked_up', label: 'Picked Up', icon: 'check-circle-outline'},
];

const stepIndex = (status) => {
  const map = {
    none: 0, pending: 0, assigned: 0, pending_pickup: 0, pickup_scheduled: 0, accepted: 0,
    en_route: 1, en_route_to_pickup: 1,
    arrived: 2, at_pickup: 2, driver_arrived: 2,
    picked_up: 3, completed: 3,
  };
  return map[status] ?? 0;
};

const PickupDetailScreen = ({navigation, route}) => {
  const ins = useSafeAreaInsets();
  const {t, i18n} = useTranslation();
  const pickup = route.params?.pickup || {};
  const {enRoute, markArrived, confirmPickup, failPickup} = usePickupStore();

  const [status, setStatus] = useState(
    pickup.status || pickup.pickup_status || 'pending',
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [showFail, setShowFail] = useState(false);

  const orderId = pickup.id || pickup.order_id;
  const statusColor = getStatusColor(status);
  const currentStep = stepIndex(status);
  const formatLabel = (st) => t('status.' + (st || 'pending'), (st || 'pending'));

  // Pulse animation for active step
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.25, duration: 800, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 800, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Normalize fields
  const merchantName = pickup.merchant_name || pickup.store_name || pickup.sender_name || pickup.client_name;
  const pickupAddress = pickup.pickup_address || pickup.address || pickup.sender_address;
  const pickupLat = pickup.latitude || pickup.lat || pickup.sender_lat;
  const pickupLng = pickup.longitude || pickup.lng || pickup.sender_lng;
  const scheduledAt = pickup.scheduled_at || pickup.pickup_scheduled_at;
  const packageCount = pickup.package_count || pickup.order_count || pickup.total_packages || pickup.items?.length || 0;
  const contactName = pickup.contact_name || pickup.sender_name;
  const contactPhone = pickup.contact_phone || pickup.sender_phone;
  const notes = pickup.notes || pickup.pickup_notes || pickup.special_instructions;
  const orderNumber = pickup.order_number || '';

  /* ── Handlers ── */
  const handleEnRoute = async () => {
    setActionLoading(true);
    try {
      await enRoute(orderId);
      setStatus('en_route');
      showMessage({message: t('pickup.enRouteMsg'), type: 'success'});
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
      showMessage({message: t('pickup.arrivalConfirmed'), type: 'success'});
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
            showMessage({message: t('pickup.pickupConfirmed'), type: 'success'});
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
      showMessage({message: t('pickup.pickupFailed'), type: 'warning'});
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

  const handleCall = () => {
    if (contactPhone) Linking.openURL(`tel:${contactPhone}`);
  };

  const handleWhatsApp = () => {
    if (contactPhone) {
      const phone = contactPhone.replace(/[\s\-()]/g, '');
      Linking.openURL(`https://wa.me/${phone}`);
    }
  };

  const handleCopyOrder = () => {
    if (orderNumber) {
      Clipboard.setString(orderNumber);
      showMessage({message: 'Order number copied', type: 'info', duration: 1500});
    }
  };

  const isTerminal = status === 'picked_up' || status === 'completed' || status === 'failed' || status === 'pickup_failed';

  /* ── CTA config per status ── */
  const getCTA = () => {
    if (isTerminal) return null;
    const s0 = ['pending', 'assigned', 'none', 'pending_pickup', 'pickup_scheduled', 'accepted'];
    if (s0.includes(status)) return {icon: 'truck-fast-outline', label: t('pickup.enRoute'), sub: t('pickup.ctaEnRouteSub', 'Heading to pickup location'), color: '#1565C0', onPress: handleEnRoute};
    if (status === 'en_route' || status === 'en_route_to_pickup') return {icon: 'map-marker-check-outline', label: t('pickup.arrived'), sub: t('pickup.ctaArrivedSub', 'Confirm your arrival'), color: '#00796B', onPress: handleArrived};
    if (status === 'arrived' || status === 'at_pickup' || status === 'driver_arrived') return {icon: 'check-circle-outline', label: t('pickup.confirmPickup'), sub: t('pickup.ctaConfirmSub', 'All packages collected'), color: '#2E7D32', onPress: handleConfirm};
    return null;
  };
  const cta = getCTA();

  return (
    <View style={[$.root, {paddingTop: ins.top}]}>
      {/* ── Header ── */}
      <View style={$.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={$.hdrBack}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{flex: 1, alignItems: 'center'}}>
          <Text style={$.hdrTitle}>{t('pickup.detail')}</Text>
          {orderNumber ? <Text style={$.hdrSub}>#{orderNumber}</Text> : null}
        </View>
        <View style={{width: 36}} />
      </View>

      <ScrollView contentContainerStyle={$.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Status Hero Card ── */}
        <View style={[$.heroCard, {borderLeftColor: statusColor}]}>
          <View style={$.heroTop}>
            <View style={[$.heroBadge, {backgroundColor: getStatusBgColor(status)}]}>
              <Icon name="package-variant" size={13} color={statusColor} />
              <Text style={[$.heroBadgeText, {color: statusColor}]}>{formatLabel(status)}</Text>
            </View>
            {orderNumber ? (
              <TouchableOpacity onPress={handleCopyOrder} activeOpacity={0.6} style={$.copyBtn}>
                <Text style={$.copyText}>#{orderNumber}</Text>
                <Icon name="content-copy" size={12} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          {merchantName ? (
            <Text style={$.heroMerchant}>{merchantName}</Text>
          ) : null}
          {pickupAddress ? (
            <View style={$.heroAddressRow}>
              <Icon name="map-marker-outline" size={14} color={colors.textMuted} />
              <Text style={$.heroAddress} numberOfLines={2}>{pickupAddress}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Progress Tracker ── */}
        {!isTerminal && status !== 'failed' && (
          <View style={$.progressCard}>
            <View style={$.stepsRow}>
              {STEPS.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                const dotColor = done ? '#15C7AE' : active ? statusColor : '#D5DDE5';
                return (
                  <View key={step.key} style={$.stepItem}>
                    <View style={$.stepDotRow}>
                      {i > 0 && (
                        <View style={[$.stepLine, done && {backgroundColor: '#15C7AE'}]} />
                      )}
                      {active ? (
                        <Animated.View style={[$.stepDotActive, {backgroundColor: statusColor, transform: [{scale: pulseAnim}]}]}>
                          <Icon name={step.icon} size={12} color="#FFF" />
                        </Animated.View>
                      ) : (
                        <View style={[$.stepDot, {backgroundColor: dotColor}]}>
                          {done ? (
                            <Icon name="check" size={10} color="#FFF" />
                          ) : (
                            <View style={$.stepDotInner} />
                          )}
                        </View>
                      )}
                    </View>
                    <Text style={[$.stepLabel, (done || active) && {color: colors.textPrimary, fontFamily: fontFamily.semiBold}]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Pickup Info Card ── */}
        <View style={$.card}>
          <View style={$.cardHdr}>
            <View style={[$.cardIcon, {backgroundColor: '#E8F5E9'}]}>
              <Icon name="store-outline" size={15} color="#2E7D32" />
            </View>
            <Text style={$.cardTitle}>{t('pickup.pickupInfo')}</Text>
          </View>
          <View style={$.cardBody}>
            {merchantName ? (
              <View style={$.infoRow}>
                <Text style={$.infoLabel}>{t('pickup.merchant')}</Text>
                <Text style={$.infoValue}>{merchantName}</Text>
              </View>
            ) : null}
            {pickupAddress ? (
              <>
                <View style={$.sep} />
                <View style={$.infoRow}>
                  <Text style={$.infoLabel}>{t('pickup.address')}</Text>
                  <Text style={$.infoValue}>{pickupAddress}</Text>
                </View>
              </>
            ) : null}
            <View style={$.sep} />
            <View style={$.infoGrid}>
              <View style={$.infoGridItem}>
                <View style={[$.infoGridIcon, {backgroundColor: '#E3F2FD'}]}>
                  <Icon name="clock-outline" size={14} color="#1565C0" />
                </View>
                <Text style={$.infoGridLabel}>{t('pickup.scheduled')}</Text>
                <Text style={$.infoGridValue}>
                  {scheduledAt
                    ? new Date(scheduledAt).toLocaleString(i18n.language === 'ar' ? 'ar-AE' : 'en-AE', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </Text>
              </View>
              <View style={$.infoGridItem}>
                <View style={[$.infoGridIcon, {backgroundColor: '#FFF3E0'}]}>
                  <Icon name="package-variant" size={14} color="#E65100" />
                </View>
                <Text style={$.infoGridLabel}>{t('pickup.packages')}</Text>
                <Text style={$.infoGridValue}>{packageCount} {t('pickup.items')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Contact Card ── */}
        {(contactName || contactPhone) ? (
          <View style={$.contactCard}>
            {/* Contact header band */}
            <View style={$.contactBand}>
              <View style={$.contactAvatarLg}>
                <Text style={$.contactAvatarLgTxt}>{(contactName || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{flex: 1, marginLeft: 14}}>
                {contactName ? <Text style={$.contactNameLg}>{contactName}</Text> : null}
                {contactPhone ? (
                  <View style={$.contactPhoneRow}>
                    <Icon name="phone-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={$.contactPhoneLg}>{contactPhone}</Text>
                  </View>
                ) : null}
              </View>
              <View style={$.contactMerchantTag}>
                <Icon name="store-outline" size={11} color="#FFF" />
                <Text style={$.contactMerchantTagTxt}>{t('pickup.merchant')}</Text>
              </View>
            </View>
            {/* Action buttons */}
            {contactPhone ? (
              <View style={$.contactActions}>
                <TouchableOpacity style={$.contactActionBtn} onPress={handleCall} activeOpacity={0.7}>
                  <View style={[$.contactActionIcon, {backgroundColor: '#E3F2FD'}]}>
                    <Icon name="phone-outline" size={18} color="#1565C0" />
                  </View>
                  <Text style={[$.contactActionLabel, {color: '#1565C0'}]}>{t('pickup.callBtn', 'Call')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={$.contactActionBtn} onPress={handleWhatsApp} activeOpacity={0.7}>
                  <View style={[$.contactActionIcon, {backgroundColor: '#E8F5E9'}]}>
                    <Icon name="whatsapp" size={18} color="#25D366" />
                  </View>
                  <Text style={[$.contactActionLabel, {color: '#25D366'}]}>{t('pickup.whatsappBtn', 'WhatsApp')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={$.contactActionBtn} onPress={handleNavigate} activeOpacity={0.7}>
                  <View style={[$.contactActionIcon, {backgroundColor: '#FFF3E0'}]}>
                    <Icon name="navigation-variant-outline" size={18} color="#E65100" />
                  </View>
                  <Text style={[$.contactActionLabel, {color: '#E65100'}]}>{t('pickup.navigateBtn', 'Navigate')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Notes Card ── */}
        {notes ? (
          <View style={$.card}>
            <View style={$.cardHdr}>
              <View style={[$.cardIcon, {backgroundColor: '#FFF8E1'}]}>
                <Icon name="note-text-outline" size={15} color="#F9A825" />
              </View>
              <Text style={$.cardTitle}>{t('pickup.notes')}</Text>
            </View>
            <View style={$.notesBubble}>
              <Text style={$.notesTxt}>{notes}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Fail Reason Input ── */}
        {showFail && (
          <View style={$.card}>
            <View style={$.cardHdr}>
              <View style={[$.cardIcon, {backgroundColor: colors.dangerBg}]}>
                <Icon name="alert-circle-outline" size={15} color={colors.danger} />
              </View>
              <Text style={$.cardTitle}>{t('pickup.failureReason')}</Text>
            </View>
            <TextInput
              style={$.failInput}
              placeholder={t('pickup.failReasonPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={failReason}
              onChangeText={setFailReason}
            />
            <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
              <TouchableOpacity
                style={[$.failAction, {backgroundColor: '#F0F3F8'}]}
                onPress={() => setShowFail(false)}>
                <Text style={[$.failActionTxt, {color: colors.textSecondary}]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[$.failAction, {backgroundColor: colors.danger}]}
                onPress={handleFail}
                disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={$.failActionTxt}>{t('pickup.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Terminal Status Banner ── */}
        {isTerminal && (
          <View style={[$.terminalBanner, {backgroundColor: status === 'failed' || status === 'pickup_failed' ? colors.dangerBg : '#E8F5E9'}]}>
            <Icon
              name={status === 'failed' || status === 'pickup_failed' ? 'close-circle-outline' : 'check-circle-outline'}
              size={28}
              color={status === 'failed' || status === 'pickup_failed' ? colors.danger : '#2E7D32'}
            />
            <Text style={[$.terminalText, {color: status === 'failed' || status === 'pickup_failed' ? colors.danger : '#2E7D32'}]}>
              {formatLabel(status)}
            </Text>
            <Text style={$.terminalSub}>
              {status === 'failed' || status === 'pickup_failed' ? t('pickup.terminalFailed', 'This pickup was reported as failed') : t('pickup.terminalSuccess', 'All packages collected successfully')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom CTAs ── */}
      {cta && !showFail && (
        <View style={[$.bottom, {paddingBottom: ins.bottom + 10}]}>
          {/* Primary CTA Card */}
          <TouchableOpacity
            style={[$.ctaPrimary, {backgroundColor: cta.color}]}
            onPress={cta.onPress}
            activeOpacity={0.85}
            disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={$.ctaInner}>
                <View style={$.ctaIconCircle}>
                  <Icon name={cta.icon} size={20} color="#FFF" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={$.ctaPrimaryTxt}>{cta.label}</Text>
                  <Text style={$.ctaSubTxt}>{cta.sub}</Text>
                </View>
                <Icon name="chevron-right" size={22} color="rgba(255,255,255,0.6)" />
              </View>
            )}
          </TouchableOpacity>

          {/* Secondary row */}
          <View style={$.ctaSecRow}>
            <TouchableOpacity style={$.ctaSec} onPress={handleNavigate} activeOpacity={0.7}>
              <Icon name="navigation-variant-outline" size={16} color={colors.primary} />
              <Text style={$.ctaSecTxt}>{t('pickup.navigateToPickup')}</Text>
            </TouchableOpacity>
            {(status === 'arrived' || status === 'at_pickup' || status === 'driver_arrived') && (
              <TouchableOpacity style={$.ctaDanger} onPress={() => setShowFail(true)} activeOpacity={0.7}>
                <Icon name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={$.ctaDangerTxt}>{t('pickup.reportProblem')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

/* ────────────────────── Styles ────────────────────── */
const $ = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},

  /* Header */
  hdr: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, height: 52,
  },
  hdrBack: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary},
  hdrSub: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 1},

  scroll: {paddingHorizontal: 16, paddingBottom: 180},

  /* Hero Card */
  heroCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
  },
  heroTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  heroBadgeText: {fontFamily: fontFamily.semiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4},
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F5F7FA',
  },
  copyText: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.textMuted},
  heroMerchant: {fontFamily: fontFamily.bold, fontSize: 18, color: colors.textPrimary, marginBottom: 6},
  heroAddressRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  heroAddress: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 19, flex: 1},

  /* Progress Card */
  progressCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.04, shadowRadius: 6,
    elevation: 2,
  },
  stepsRow: {flexDirection: 'row', justifyContent: 'space-between'},
  stepItem: {flex: 1, alignItems: 'center'},
  stepDotRow: {flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: 8, height: 28},
  stepLine: {
    position: 'absolute', left: 0, right: '50%', top: 13, height: 2.5,
    backgroundColor: '#D5DDE5', borderRadius: 2,
  },
  stepDot: {
    width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  stepDotInner: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF'},
  stepDotActive: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.15, shadowRadius: 6,
    elevation: 4,
  },
  stepLabel: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, textAlign: 'center'},

  /* Card base */
  card: {
    backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.04, shadowRadius: 6,
    elevation: 2,
  },
  cardHdr: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
  },
  cardIcon: {width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center'},
  cardTitle: {fontFamily: fontFamily.semiBold, fontSize: 13.5, color: colors.textPrimary},
  cardBody: {paddingHorizontal: 18, paddingBottom: 18},
  infoRow: {paddingVertical: 2},
  infoLabel: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginBottom: 3},
  infoValue: {fontFamily: fontFamily.medium, fontSize: 13.5, color: colors.textPrimary, lineHeight: 19},
  sep: {height: 1, backgroundColor: '#F0F3F8', marginVertical: 12},

  infoGrid: {flexDirection: 'row', gap: 12},
  infoGridItem: {flex: 1, backgroundColor: '#FAFBFD', borderRadius: 12, padding: 14, alignItems: 'center'},
  infoGridIcon: {width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8},
  infoGridLabel: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, marginBottom: 2},
  infoGridValue: {fontFamily: fontFamily.semiBold, fontSize: 12.5, color: colors.textPrimary},

  /* Contact — premium card */
  contactCard: {
    backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
  },
  contactBand: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 16,
  },
  contactAvatarLg: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  contactAvatarLgTxt: {fontFamily: fontFamily.bold, fontSize: 20, color: '#FFF'},
  contactNameLg: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF'},
  contactPhoneRow: {flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3},
  contactPhoneLg: {fontFamily: fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)'},
  contactMerchantTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  contactMerchantTagTxt: {fontFamily: fontFamily.medium, fontSize: 9, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.4},
  contactActions: {
    flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 16, gap: 10,
  },
  contactActionBtn: {
    flex: 1, alignItems: 'center', gap: 8,
  },
  contactActionIcon: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  contactActionLabel: {fontFamily: fontFamily.semiBold, fontSize: 11},

  /* Notes */
  notesBubble: {
    marginHorizontal: 18, marginBottom: 18, backgroundColor: '#FFFDE7', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#FFF9C4',
  },
  notesTxt: {fontFamily: fontFamily.regular, fontSize: 13, color: '#827717', lineHeight: 19},

  /* Fail */
  failInput: {
    marginHorizontal: 18, backgroundColor: '#F5F7FA', borderRadius: 12, padding: 14,
    fontFamily: fontFamily.regular, fontSize: 13, color: colors.textPrimary,
    minHeight: 80, textAlignVertical: 'top',
  },
  failAction: {flex: 1, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginHorizontal: 18},
  failActionTxt: {fontFamily: fontFamily.semiBold, fontSize: 13, color: '#FFF'},

  /* Terminal Banner */
  terminalBanner: {
    borderRadius: 16, padding: 26, alignItems: 'center', marginBottom: 12,
  },
  terminalText: {fontFamily: fontFamily.bold, fontSize: 18, marginTop: 10},
  terminalSub: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center'},

  /* Bottom */
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 14,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.08, shadowRadius: 12,
    elevation: 12,
  },
  ctaPrimary: {
    height: 60, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.2, shadowRadius: 12,
    elevation: 8, marginBottom: 10,
  },
  ctaInner: {flexDirection: 'row', alignItems: 'center', flex: 1},
  ctaIconCircle: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center', marginEnd: 12,
  },
  ctaPrimaryTxt: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF', letterSpacing: 0.2},
  ctaSubTxt: {fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1},
  ctaSecRow: {flexDirection: 'row', gap: 10, marginBottom: 6},
  ctaSec: {
    flex: 1, height: 44, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F5F7FA',
  },
  ctaSecTxt: {fontFamily: fontFamily.semiBold, fontSize: 12.5, color: colors.primary},
  ctaDanger: {
    flex: 1, height: 44, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger + '20',
  },
  ctaDangerTxt: {fontFamily: fontFamily.semiBold, fontSize: 12.5, color: colors.danger},
});

export default PickupDetailScreen;
