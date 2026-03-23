/**
 * Delivery Confirm Screen — Proof of delivery
 */

import React, {useState} from 'react';
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

const DeliveryConfirmScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const {token, orderId, codAmount = 0} = route.params || {};
  const hasCod = Number(codAmount) > 0;
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codCollected, setCodCollected] = useState(hasCod ? String(codAmount) : '');
  const [signatureUri, setSignatureUri] = useState(null);
  const [checkingPackages, setCheckingPackages] = useState(true);
  const currentPosition = useLocationStore(s => s.currentPosition);
  const requireSignature = useSettingsStore(s => s.requireSignature);
  const requirePhoto = useSettingsStore(s => s.requirePhoto);
  const currency = useSettingsStore(s => s.currency);
  const deliverOrder = useOrderStore(s => s.deliverOrder);

  // Check if order has packages — if so redirect to per-package flow
  React.useEffect(() => {
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
      } catch {
        // No packages or API error — continue with order-level flow
      }
      if (!cancelled) setCheckingPackages(false);
    };
    checkAndRedirect();
    return () => { cancelled = true; };
  }, [orderId]);

  const handleTakePhoto = () => {
    launchCamera(
      {mediaType: 'photo', cameraType: 'back', quality: 0.7, maxWidth: 1200, maxHeight: 1200},
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const uri = response.assets?.[0]?.uri;
        if (uri) setPhotoUri(uri);
      },
    );
  };

  const handleConfirm = async () => {
    if (!orderId) {
      Alert.alert(t('deliveryConfirm.error'), t('deliveryConfirm.noOrderId'));
      return;
    }
    // Enforce settings-driven requirements
    if (requirePhoto && !photoUri) {
      Alert.alert(t('deliveryConfirm.photoRequired'), t('deliveryConfirm.photoRequiredDesc'));
      return;
    }
    if (requireSignature && !signatureUri) {
      Alert.alert(t('deliveryConfirm.signatureRequired'), t('deliveryConfirm.photoRequiredDesc'));
      return;
    }
    setLoading(true);
    try {
      // Upload proof photo if taken
      let proofUrl = null;
      if (photoUri && orderId) {
        const uploadRes = await uploadsApi.uploadOrderProofPhoto(orderId, photoUri);
        proofUrl = uploadRes.data?.data?.url || uploadRes.data?.url || null;
      }

      // Upload signature if captured
      let signatureUrl = null;
      if (signatureUri && orderId) {
        const sigRes = await uploadsApi.uploadOrderSignature(orderId, signatureUri);
        signatureUrl = sigRes.data?.data?.url || sigRes.data?.url || null;
      }

      // Deliver order via new API
      const deliverData = {
        note: notes.trim() || undefined,
        proof_photo: proofUrl || undefined,
        signature_url: signatureUrl || undefined,
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
        <Text style={s.secTitle}>{t('deliveryConfirm.takePhoto')} {requirePhoto ? t('common.required') : ''}</Text>
        <TouchableOpacity style={s.photoBox} onPress={handleTakePhoto} activeOpacity={0.7}>
          {photoUri ? (
            <Image source={{uri: photoUri}} style={s.photoImg} resizeMode="cover" />
          ) : (
            <>
              <View style={s.photoIc}>
                <Icon name="camera-outline" size={24} color={colors.textMuted} />
              </View>
              <Text style={s.photoLabel}>{t('deliveryConfirm.takePhoto')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Signature — shown if tenant requires it */}
        {requireSignature && (
          <>
            <Text style={s.secTitle}>{t('deliveryConfirm.addSignature')} {requireSignature ? t('common.required') : t('common.optional')}</Text>
            <TouchableOpacity
              style={s.photoBox}
              onPress={() => navigation.navigate(routeNames.Signature, {
                onSave: (uri) => setSignatureUri(uri),
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
        <TouchableOpacity style={[s.confirmBtn, loading && {opacity: 0.65}]} onPress={handleConfirm} activeOpacity={0.75} disabled={loading}>
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
    paddingHorizontal: 20, height: 52, gap: 8,
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary, textAlign: 'auto'},
  scroll: {paddingHorizontal: 20, paddingBottom: 120},
  secTitle: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 8, marginTop: 14},
  photoBox: {
    height: 180,
    backgroundColor: '#FFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E4EA',
    borderStyle: 'dashed',
    gap: 8,
  },
  photoIc: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#F0F2F5', justifyContent: 'center', alignItems: 'center',
  },
  photoLabel: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted},
  photoImg: {width: '100%', height: '100%', borderRadius: 14},
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
    gap: 8,
  },
  confirmTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF'},

  /* COD */
  codCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  codRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  codLabel: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary, flex: 1},
  codExpected: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.orange},
  codInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
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
