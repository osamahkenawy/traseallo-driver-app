/**
 * PickupProofScreen — Proof of pickup: photo + signature before confirming
 * Photo capture + Signature → POST /driver-app/pickups/:id/confirm
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {showMessage} from 'react-native-flash-message';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {uploadsApi} from '../../api';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import useLocationStore from '../../store/locationStore';
import usePickupStore from '../../store/pickupStore';
import {routeNames} from '../../constants/routeNames';
import {useTranslation} from 'react-i18next';

const PickupProofScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const {
    orderId,
    merchantName = '',
    packageCount = 0,
    signatureData: sigFromRoute = null,
  } = route.params || {};

  const currentPosition = useLocationStore(s => s.currentPosition);
  const {confirmPickup} = usePickupStore();

  const [photoUri, setPhotoUri] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pick up signature data returned from SignatureScreen
  useEffect(() => {
    if (sigFromRoute) {
      setSignatureData(sigFromRoute);
    }
  }, [sigFromRoute]);

  const handleTakePhoto = () => {
    const pickerOptions = {mediaType: 'photo', quality: 0.7, maxWidth: 1200, maxHeight: 1200};
    const handleResponse = (response) => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) setPhotoUri(uri);
    };
    launchCamera(
      {...pickerOptions, cameraType: 'back'},
      (res) => {
        if (res.errorCode === 'camera_unavailable') {
          launchImageLibrary(pickerOptions, handleResponse);
        } else {
          handleResponse(res);
        }
      },
    );
  };

  const openSignatureScreen = () => {
    navigation.navigate(routeNames.Signature, {
      returnScreen: routeNames.PickupProof,
      returnParams: {orderId, merchantName, packageCount},
      signerLabel: merchantName || t('pickup.merchant'),
    });
  };

  const withTimeout = (promise, ms = 15000) =>
    Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('Request timed out')), ms))]);

  const handleConfirm = async () => {
    if (!photoUri) {
      Alert.alert(t('pickup.required'), t('pickup.photoRequired', 'Please take a photo as proof of pickup'));
      return;
    }
    if (!signatureData) {
      Alert.alert(t('pickup.required'), t('pickup.signatureRequired', 'Please collect merchant signature'));
      return;
    }

    setLoading(true);
    try {
      // 1. Upload proof photo (pickup-specific endpoint → pickup_proof_url)
      let proofUrl = null;
      try {
        const uploadRes = await uploadsApi.uploadPickupProofPhoto(orderId, photoUri, {
          lat: currentPosition?.latitude,
          lng: currentPosition?.longitude,
        });
        proofUrl = uploadRes.data?.data?.url || uploadRes.data?.url || null;
      } catch (photoErr) {
        showMessage({
          message: t('pickup.photoUploadFailed', 'Photo upload failed, continuing...'),
          type: 'warning',
          duration: 2000,
        });
      }

      // 2. Upload signature (pickup-specific endpoint → pickup_signature_url)
      let signatureUrl = null;
      try {
        const sigRes = await uploadsApi.uploadPickupSignature(orderId, signatureData);
        signatureUrl = sigRes.data?.data?.url || sigRes.data?.url || null;
      } catch (sigErr) {
        showMessage({
          message: t('pickup.signatureUploadFailed', 'Signature upload failed, continuing...'),
          type: 'warning',
          duration: 2000,
        });
      }

      // 3. Confirm pickup
      await withTimeout(confirmPickup(orderId, {
        proof_photo_url: proofUrl || undefined,
        signature_url: signatureUrl || undefined,
        lat: currentPosition?.latitude,
        lng: currentPosition?.longitude,
      }));

      showMessage({message: t('pickup.pickupConfirmed'), type: 'success'});
      setTimeout(() => {
        navigation.navigate(routeNames.MainTabs, {screen: routeNames.MyOrders});
      }, 400);
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err.response?.data?.message || err.message || t('pickup.failedConfirm'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.hdrBack}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{flex: 1, alignItems: 'center'}}>
          <Text style={s.hdrTitle}>{t('pickup.proofOfPickup', 'Proof of Pickup')}</Text>
        </View>
        <View style={{width: 36}} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={s.infoBanner}>
          <View style={s.infoBannerIcon}>
            <Icon name="shield-check-outline" size={20} color="#1565C0" />
          </View>
          <View style={{flex: 1, marginLeft: 12}}>
            <Text style={s.infoBannerTitle}>
              {t('pickup.proofRequired', 'Proof required before confirming')}
            </Text>
            <Text style={s.infoBannerSub}>
              {t('pickup.proofDesc', 'Take a photo of the packages and collect merchant signature')}
            </Text>
          </View>
        </View>

        {/* Pickup Summary */}
        {(merchantName || packageCount > 0) && (
          <View style={s.summaryCard}>
            {merchantName ? (
              <View style={s.summaryRow}>
                <Icon name="store-outline" size={15} color={colors.textMuted} />
                <Text style={s.summaryLabel}>{t('pickup.merchant')}</Text>
                <Text style={s.summaryValue}>{merchantName}</Text>
              </View>
            ) : null}
            {packageCount > 0 && (
              <View style={[s.summaryRow, merchantName ? {marginTop: 8} : {}]}>
                <Icon name="package-variant" size={15} color={colors.textMuted} />
                <Text style={s.summaryLabel}>{t('pickup.packages')}</Text>
                <Text style={s.summaryValue}>
                  {packageCount} {packageCount === 1 ? t('pickup.item', 'item') : t('pickup.items', 'items')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Photo Section */}
        <View style={s.card}>
          <View style={s.cardHdr}>
            <View style={[s.cardIconWrap, {backgroundColor: '#E3F2FD'}]}>
              <Icon name="camera-outline" size={16} color="#1565C0" />
            </View>
            <Text style={s.cardTitle}>{t('pickup.proofPhoto', 'Proof Photo')}</Text>
            {photoUri && (
              <View style={s.checkBadge}>
                <Icon name="check" size={12} color="#FFF" />
              </View>
            )}
          </View>

          {photoUri ? (
            <View style={s.photoPreview}>
              <Image source={{uri: photoUri}} style={s.photoImg} />
              <TouchableOpacity style={s.retakeBtn} onPress={handleTakePhoto} activeOpacity={0.7}>
                <Icon name="camera-outline" size={14} color={colors.primary} />
                <Text style={s.retakeTxt}>{t('pickup.retakePhoto', 'Retake')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.captureBox} onPress={handleTakePhoto} activeOpacity={0.7}>
              <View style={s.captureIconCircle}>
                <Icon name="camera-outline" size={26} color={colors.primary} />
              </View>
              <Text style={s.captureTxt}>
                {t('pickup.takePhoto', 'Take a photo of packages')}
              </Text>
              <Text style={s.captureSub}>
                {t('pickup.takePhotoDesc', 'Capture all collected packages clearly')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Signature Section */}
        <View style={s.card}>
          <View style={s.cardHdr}>
            <View style={[s.cardIconWrap, {backgroundColor: '#E8F5E9'}]}>
              <Icon name="draw-pen" size={16} color="#2E7D32" />
            </View>
            <Text style={s.cardTitle}>{t('pickup.merchantSignature', 'Merchant Signature')}</Text>
            {signatureData && (
              <View style={s.checkBadge}>
                <Icon name="check" size={12} color="#FFF" />
              </View>
            )}
          </View>

          {signatureData ? (
            <View style={s.sigPreview}>
              <Image
                source={{uri: signatureData}}
                style={s.sigImg}
                resizeMode="contain"
              />
              <TouchableOpacity style={s.retakeBtn} onPress={openSignatureScreen} activeOpacity={0.7}>
                <Icon name="draw-pen" size={14} color={colors.primary} />
                <Text style={s.retakeTxt}>{t('pickup.resignature', 'Re-sign')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.captureBox} onPress={openSignatureScreen} activeOpacity={0.7}>
              <View style={[s.captureIconCircle, {backgroundColor: '#E8F5E9'}]}>
                <Icon name="draw-pen" size={26} color="#2E7D32" />
              </View>
              <Text style={s.captureTxt}>
                {t('pickup.collectSignature', 'Collect Merchant Signature')}
              </Text>
              <Text style={s.captureSub}>
                {t('pickup.signatureDesc', 'Ask the merchant to sign as confirmation')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
        <TouchableOpacity
          style={[
            s.confirmBtn,
            (!photoUri || !signatureData) && s.confirmBtnDisabled,
          ]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View style={s.confirmBtnInner}>
              <Icon name="check-circle-outline" size={20} color="#FFF" />
              <Text style={s.confirmBtnTxt}>
                {t('pickup.confirmPickup')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
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

  scroll: {paddingHorizontal: 16, paddingBottom: 140},

  /* Info Banner */
  infoBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', borderRadius: 14, padding: 16, marginBottom: 12,
  },
  infoBannerIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#BBDEFB',
    justifyContent: 'center', alignItems: 'center',
  },
  infoBannerTitle: {fontFamily: fontFamily.semiBold, fontSize: 13, color: '#0D47A1'},
  infoBannerSub: {fontFamily: fontFamily.regular, fontSize: 11, color: '#1565C0', marginTop: 2, lineHeight: 16},

  /* Summary */
  summaryCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  summaryRow: {flexDirection: 'row', alignItems: 'center'},
  summaryLabel: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginLeft: 8},
  summaryValue: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary, marginLeft: 'auto'},

  /* Card */
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  cardHdr: {flexDirection: 'row', alignItems: 'center', marginBottom: 14},
  cardIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary, flex: 1, marginLeft: 10},
  checkBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#2E7D32',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Capture box */
  captureBox: {
    borderWidth: 2, borderColor: '#E0E4EA', borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 30, alignItems: 'center',
  },
  captureIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  captureTxt: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary},
  captureSub: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 20},

  /* Photo preview */
  photoPreview: {alignItems: 'center'},
  photoImg: {width: '100%', height: 200, borderRadius: 12},
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 10, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: '#F0F3F8',
  },
  retakeTxt: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.primary, marginLeft: 6},

  /* Signature preview */
  sigPreview: {alignItems: 'center'},
  sigImg: {width: '100%', height: 120, borderRadius: 12, backgroundColor: '#FAFBFC'},

  /* Bottom */
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF1F5',
    shadowColor: '#000', shadowOffset: {width: 0, height: -2}, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 5,
  },
  confirmBtn: {
    backgroundColor: '#2E7D32', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnDisabled: {backgroundColor: '#B0BEC5'},
  confirmBtnInner: {flexDirection: 'row', alignItems: 'center'},
  confirmBtnTxt: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF', marginLeft: 8},
});

export default PickupProofScreen;
