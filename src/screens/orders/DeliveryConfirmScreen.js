/**
 * Delivery Confirm Screen — Proof of delivery
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import Icon from '../../utils/LucideIcon';
import useOrderStore from '../../store/orderStore';
import {useTranslation} from 'react-i18next';
import {uploadsApi} from '../../api';
import {packagesApi} from '../../api';
import {launchCamera} from 'react-native-image-picker';
import useLocationStore from '../../store/locationStore';
import useSettingsStore from '../../store/settingsStore';
import {routeNames} from '../../constants/routeNames';
import PhotoProofGrid from '../../components/PhotoProofGrid';

const DeliveryConfirmScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const {token, orderId, codAmount = 0, orderStatus, signatureData: sigFromRoute} = route.params || {};
  const hasCod = Number(codAmount) > 0;

  const [invalidStatus, setInvalidStatus] = useState(false);

  // Guard: only allow delivery if order is picked_up or in_transit
  // Also handle already-delivered orders gracefully
  useEffect(() => {
    if (orderStatus === 'delivered') {
      setInvalidStatus(true);
      Alert.alert(
        t('deliveryConfirm.deliverySuccess', 'Success'),
        t('deliveryConfirm.alreadyDelivered', 'This order has already been delivered.'),
        [{text: t('common.ok'), onPress: () => navigation.goBack()}],
      );
      return;
    }
    if (orderStatus && !['picked_up', 'in_transit'].includes(orderStatus)) {
      setInvalidStatus(true);
      Alert.alert(
        t('deliveryConfirm.error'),
        t('deliveryConfirm.pickupRequired', 'Pickup must be completed before confirming delivery.'),
        [{text: t('common.ok'), onPress: () => navigation.goBack()}],
      );
    }
  }, [orderStatus, t, navigation]);

  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [codCollected, setCodCollected] = useState(hasCod ? String(codAmount) : '');
  const [signatureUri, setSignatureUri] = useState(null);

  // Pick up signature data returned from SignatureScreen
  useEffect(() => {
    if (sigFromRoute) setSignatureUri(sigFromRoute);
  }, [sigFromRoute]);
  const [checkingPackages, setCheckingPackages] = useState(true);
  const currentPosition = useLocationStore(s => s.currentPosition);
  const requireSignature = useSettingsStore(s => s.requireSignature);
  const requirePhoto = useSettingsStore(s => s.requirePhoto);
  const currency = useSettingsStore(s => s.currency);
  const deliverOrder = useOrderStore(s => s.deliverOrder);

  const hasPhotos = photos.length > 0;

  // Check if order has packages — if so redirect to per-package flow
  useEffect(() => {
    let cancelled = false;
    const checkAndRedirect = async () => {
      if (!orderId) {
        if (!cancelled) setCheckingPackages(false);
        return;
      }
      try {
        const res = await packagesApi.getOrderPackages(orderId);
        if (cancelled) return;
        const data = res.data?.data || res.data;
        const pkgs = data?.packages || data || [];
        const undelivered = pkgs.find(
          p => !['delivered', 'failed', 'returned', 'cancelled'].includes(p.status),
        );
        if (undelivered) {
          // Redirect to per-package delivery
          navigation.replace(routeNames.PackageDeliver, {
            packageId: undelivered.id,
            orderId,
            token,
            codAmount: undelivered.cod_amount || 0,
            recipientName: undelivered.recipient_name,
            recipientAddress: undelivered.recipient_address,
            barcode: undelivered.barcode,
          });
          return;
        }
        // All packages are in terminal state — order is likely already delivered
        if (pkgs.length > 0) {
          if (!cancelled) {
            setInvalidStatus(true);
            Alert.alert(
              t('deliveryConfirm.deliverySuccess', 'Success'),
              t('deliveryConfirm.allPackagesDelivered', 'All packages have been delivered for this order.'),
              [{text: t('common.ok'), onPress: () => navigation.goBack()}],
            );
          }
          return;
        }
      } catch {
        // No packages or API error — continue with order-level flow
      }
      if (!cancelled) setCheckingPackages(false);
    };
    checkAndRedirect();
    return () => { cancelled = true; };
  }, [orderId]);

  const handleConfirm = async () => {
    if (!orderId) {
      Alert.alert(t('deliveryConfirm.error'), t('deliveryConfirm.noOrderId'));
      return;
    }
    // Enforce settings-driven requirements
    if (requirePhoto && !hasPhotos) {
      Alert.alert(t('deliveryConfirm.photoRequired'), t('deliveryConfirm.photoRequiredDesc'));
      return;
    }
    if (requireSignature && !signatureUri) {
      Alert.alert(t('deliveryConfirm.signatureRequired'), t('deliveryConfirm.photoRequiredDesc'));
      return;
    }
    setLoading(true);
    try {
      // Photos are already uploaded via PhotoProofGrid — grab first photo URL for legacy field
      const proofUrl = photos[0]?.photo_url || null;

      // Upload signature if captured
      let signatureUrl = null;
      if (signatureUri && orderId) {
        try {
          const sigRes = await uploadsApi.uploadOrderSignature(orderId, signatureUri);
          signatureUrl = sigRes.data?.data?.url || sigRes.data?.url || null;
        } catch (sigErr) {
          if (__DEV__) console.warn('[DeliveryConfirm] Signature upload failed:', sigErr?.message);
        }
      }

      // Pre-transition packages through required states before delivery
      // Backend state machine: ... → picked_up → in_transit → delivered
      try {
        const pkgRes = await packagesApi.getOrderPackages(orderId);
        const pkgData = pkgRes.data?.data || pkgRes.data;
        const pkgs = pkgData?.packages || pkgData || [];
        const terminalStatuses = ['delivered', 'failed', 'returned', 'cancelled'];
        for (const pkg of pkgs) {
          if (terminalStatuses.includes(pkg.status)) continue;
          // Step to picked_up if needed
          if (!['picked_up', 'in_transit', 'out_for_delivery'].includes(pkg.status)) {
            await packagesApi.updateStatus(pkg.id, {
              status: 'picked_up',
              lat: currentPosition?.latitude || undefined,
              lng: currentPosition?.longitude || undefined,
            });
          }
          // Step to in_transit if not already
          if (!['in_transit', 'out_for_delivery'].includes(pkg.status)) {
            await packagesApi.updateStatus(pkg.id, {
              status: 'in_transit',
              lat: currentPosition?.latitude || undefined,
              lng: currentPosition?.longitude || undefined,
            });
          }
        }
      } catch (preTransErr) {
        if (__DEV__) console.warn('[DeliveryConfirm] Pre-transition failed:', preTransErr?.message);
      }

      // Deliver order via new API
      const deliverData = {
        note: notes.trim() || undefined,
        proof_photo: proofUrl || undefined,
        signature_url: signatureUrl || undefined,
        // Include raw signature data if upload didn't produce a URL
        signature: !signatureUrl && signatureUri ? signatureUri : undefined,
        lat: currentPosition?.latitude || undefined,
        lng: currentPosition?.longitude || undefined,
      };

      // Include COD collected amount if applicable
      if (hasCod && codCollected) {
        deliverData.cod_collected_amount = Number(codCollected) || 0;
      }

      const result = await deliverOrder(orderId, deliverData);

      if (result.success) {
        Alert.alert(t('deliveryConfirm.deliverySuccess'), t('deliveryConfirm.deliverySuccessDesc'), [
          {text: t('common.done'), onPress: () => navigation.goBack()},
        ]);
      } else {
        Alert.alert(
          t('deliveryConfirm.error'),
          result.error || t('deliveryConfirm.failedToConfirm'),
        );
      }
    } catch (e) {
      Alert.alert(
        t('deliveryConfirm.error'),
        e?.response?.data?.message || e?.message || t('deliveryConfirm.failedToConfirm'),
      );
    } finally {
      setLoading(false);
    }
  };

  if (invalidStatus) {
    return <View style={[s.root, {paddingTop: ins.top}]} />;
  }

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {checkingPackages ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{fontFamily: fontFamily.medium, fontSize: 12, color: colors.textMuted, marginTop: 8}}>
            {t('deliveryConfirm.checkingPackages')}
          </Text>
        </View>
      ) : (
      <>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('deliveryConfirm.title')}</Text>
        <View style={{width: 20}} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <PhotoProofGrid
          orderId={orderId}
          t={t}
          onPhotosChange={setPhotos}
        />

        {/* Signature — shown if tenant requires it */}
        {requireSignature && (
          <>
            <Text style={s.secTitle}>{t('deliveryConfirm.addSignature')} {requireSignature ? t('common.required') : t('common.optional')}</Text>
            <TouchableOpacity
              style={s.photoBox}
              onPress={() => navigation.navigate(routeNames.Signature, {
                returnScreen: routeNames.DeliveryConfirm,
                returnParams: {token, orderId, codAmount, orderStatus},
              })}
              activeOpacity={0.7}>
              {signatureUri ? (
                <Image source={{uri: signatureUri}} style={s.photoImg} resizeMode="contain" />
              ) : (
                <>
                  <View style={s.photoIc}>
                    <Icon name="draw" size={24} color={colors.textMuted} />
                  </View>
                  <Text style={s.photoLabel}>{t('deliveryConfirm.addSignature')}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text style={s.secTitle}>{t('deliveryConfirm.notes')}</Text>
        <TextInput
          style={s.input}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('deliveryConfirm.notesPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* COD Collection */}
        {hasCod && (
          <>
            <Text style={s.secTitle}>{t('deliveryConfirm.codCollection')}</Text>
            <View style={s.codCard}>
              <View style={s.codRow}>
                <Icon name="cash" size={18} color={colors.orange} />
                <Text style={s.codLabel}>{t('deliveryConfirm.codAmount')}</Text>
                <Text style={s.codExpected}>{currency} {Number(codAmount).toFixed(2)}</Text>
              </View>
              <View style={s.codInputRow}>
                <Text style={s.codPrefix}>{currency}</Text>
                <TextInput
                  style={s.codInput}
                  value={codCollected}
                  onChangeText={setCodCollected}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
        <TouchableOpacity
          style={[s.confirmBtn, (loading || (requirePhoto && !hasPhotos)) && {opacity: 0.65}]}
          onPress={handleConfirm}
          activeOpacity={0.75}
          disabled={loading || (requirePhoto && !hasPhotos)}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Icon name="check-circle-outline" size={17} color="#FFF" />
          )}
          <Text style={s.confirmTxt}>{loading ? t('deliveryConfirm.delivering') : t('deliveryConfirm.confirmDelivery')}</Text>
        </TouchableOpacity>
      </View>
      </>
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
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary, textAlign: 'auto', writingDirection: 'auto'},
  scroll: {paddingHorizontal: 20, paddingBottom: 120},
  secTitle: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 8, marginTop: 14, textAlign: 'auto', writingDirection: 'auto'},
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    minHeight: 100,
  },
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF1F5',
  },
  confirmBtn: {
    height: 48,
    backgroundColor: colors.success,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF', marginStart: 8},

  /* COD */
  codCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  codRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  codLabel: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary, flex: 1, marginStart: 8},
  codExpected: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.orange},
  codInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F9FA', borderRadius: 10,
    borderWidth: 1, borderColor: '#EEF1F5',
    height: 44, paddingHorizontal: 12,
  },
  codPrefix: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textMuted, marginEnd: 8},
  codInput: {
    flex: 1, fontFamily: fontFamily.medium, fontSize: 15, color: colors.textPrimary,
    paddingVertical: 0,
  },
});

export default DeliveryConfirmScreen;
