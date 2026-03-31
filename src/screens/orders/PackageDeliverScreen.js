/**
 * PackageDeliverScreen — Per-package delivery confirmation
 * Photo + Signature + COD + GPS → PATCH /api/packages/:id/status
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {showMessage} from 'react-native-flash-message';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {packagesApi, uploadsApi} from '../../api';
import {launchCamera} from 'react-native-image-picker';
import useLocationStore from '../../store/locationStore';
import useOrderStore from '../../store/orderStore';
import useSettingsStore from '../../store/settingsStore';
import {routeNames} from '../../constants/routeNames';
import {useTranslation} from 'react-i18next';

const PackageDeliverScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const currency = useSettingsStore(s => s.currency);
  const {
    packageId,
    orderId,
    token,
    codAmount = 0,
    recipientName = '',
    recipientAddress = '',
    barcode = '',
    signatureData: sigFromRoute = null,
  } = route.params || {};

  const hasCod = Number(codAmount) > 0;
  const currentPosition = useLocationStore(s => s.currentPosition);
  const updatePackageLocal = useOrderStore(s => s.updatePackageLocal);

  // ─── Form State ─────────────────────────────────
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [codCollected, setCodCollected] = useState(hasCod ? String(codAmount) : '');
  const [loading, setLoading] = useState(false);

  // Pick up signature data returned from SignatureScreen
  useEffect(() => {
    if (sigFromRoute) {
      setSignatureData(sigFromRoute);
    }
  }, [sigFromRoute]);

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

  const openSignatureScreen = () => {
    navigation.navigate(routeNames.Signature, {
      returnScreen: routeNames.PackageDeliver,
      returnParams: {packageId, orderId, token, codAmount, recipientName, recipientAddress, barcode},
    });
  };


  const handleConfirm = async () => {
    if (!packageId) {
      Alert.alert(t('packageDeliver.error'), t('packageDeliver.noPackageId'));
      return;
    }
    setLoading(true);
    try {
      // 1. Upload proof photo
      let proofUrl = null;
      if (photoUri && orderId) {
        const uploadRes = await uploadsApi.uploadOrderProofPhoto(orderId, photoUri);
        proofUrl = uploadRes.data?.data?.url || uploadRes.data?.url || null;
      }

      // 2. Upload signature (already captured from SignatureScreen)
      let signatureUrl = null;
      if (signatureData && orderId) {
        const sigRes = await uploadsApi.uploadOrderSignature(orderId, signatureData);
        signatureUrl = sigRes.data?.data?.url || sigRes.data?.url || null;
      }

      // 3. Auto-transition package to picked_up if not already in a deliverable state
      try {
        const pkgRes = await packagesApi.getPackage(packageId);
        const pkgData = pkgRes.data?.data || pkgRes.data;
        const pkgStatus = pkgData?.status;
        if (pkgStatus && !['picked_up', 'in_transit', 'out_for_delivery'].includes(pkgStatus)) {
          await packagesApi.updateStatus(packageId, {
            status: 'picked_up',
            lat: currentPosition?.latitude || undefined,
            lng: currentPosition?.longitude || undefined,
          });
        }
      } catch (_ignored) {
        // Continue — the delivery PATCH will give a clear error if transition fails
      }

      // 4. PATCH package status to delivered
      const body = {
        status: 'delivered',
        notes: notes.trim() || undefined,
        proof_photo_url: proofUrl || undefined,
        signature_url: signatureUrl || undefined,
        lat: currentPosition?.latitude || undefined,
        lng: currentPosition?.longitude || undefined,
      };

      if (hasCod && codCollected) {
        body.cod_collected = Number(codCollected) || 0;
      }

      const res = await packagesApi.updateStatus(packageId, body);
      const result = res.data?.data || res.data;

      // Update local store
      updatePackageLocal(packageId, 'delivered');

      // Show progress toast
      const progress = result?.progress;
      if (progress) {
        showMessage({
          message: t('packageDeliver.success'),
          type: 'success',
          icon: 'auto',
          duration: 2500,
        });
      } else {
        showMessage({
          message: t('packageDeliver.success'),
          type: 'success',
          icon: 'auto',
          duration: 2000,
        });
      }

      // Check if all done → go to summary
      if (progress && progress.delivered + progress.failed >= progress.total) {
        navigation.replace(routeNames.DeliverySummary, {orderId, token});
      } else {
        navigation.goBack();
      }
    } catch (e) {
      showMessage({
        message: t('packageDeliver.failedToDeliver'),
        description: e?.response?.data?.message || t('common.error'),
        type: 'danger',
        icon: 'auto',
      });
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
          <Text style={s.hdrTitle}>{t('packageDeliver.title')}</Text>
          <Text style={s.hdrSub}>{barcode || `PKG #${packageId}`}</Text>
        </View>
        <View style={{width: 36}} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Package Info Header */}
        <View style={s.infoCard}>
          <View style={s.infoBadge}>
            <Icon name="package-variant" size={20} color={colors.success} />
          </View>
          <View style={{flex: 1}}>
            <Text style={s.infoName}>{recipientName || t('orderDetail.recipient')}</Text>
            {barcode ? <Text style={s.infoBarcode}>{barcode}</Text> : null}
            {recipientAddress ? (
              <Text style={s.infoAddr} numberOfLines={2}>{recipientAddress}</Text>
            ) : null}
          </View>
        </View>

        {/* Proof Photo */}
        <Text style={s.secTitle}>{t('packageDeliver.takePhoto')}</Text>
        <TouchableOpacity style={s.photoBox} onPress={handleTakePhoto} activeOpacity={0.7}>
          {photoUri ? (
            <Image source={{uri: photoUri}} style={s.photoImg} resizeMode="cover" />
          ) : (
            <>
              <View style={s.photoIc}>
                <Icon name="camera-outline" size={24} color={colors.textMuted} />
              </View>
              <Text style={s.photoLabel}>{t('packageDeliver.takePhoto')}</Text>
            </>
          )}
        </TouchableOpacity>
        {photoUri && (
          <TouchableOpacity style={s.retakeBtn} onPress={handleTakePhoto}>
            <Icon name="camera-retake-outline" size={14} color={colors.primary} />
            <Text style={s.retakeTxt}>{t('packageDeliver.retakePhoto')}</Text>
          </TouchableOpacity>
        )}

        {/* Signature */}
        <Text style={s.secTitle}>{t('packageDeliver.addSignature')}</Text>
        <TouchableOpacity
          style={[s.sigTapBox, signatureData && s.sigTapBoxDone]}
          onPress={openSignatureScreen}
          activeOpacity={0.7}>
          {signatureData ? (
            <View style={s.sigDoneContent}>
              <View style={s.sigDoneIconWrap}>
                <Icon name="check-circle" size={22} color={colors.success} />
              </View>
              <View style={{flex: 1}}>
                <Text style={s.sigDoneLabel}>{t('signature.done')}</Text>
                <Text style={s.sigDoneSub}>{t('packageDeliver.retakePhoto')}</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </View>
          ) : (
            <>
              <View style={s.sigIconWrap}>
                <Icon name="draw" size={24} color={colors.textMuted} />
              </View>
              <Text style={s.sigTapLabel}>{t('packageDeliver.addSignature')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delivery Notes */}
        <Text style={s.secTitle}>{t('packageDeliver.notes')}</Text>
        <TextInput
          style={s.input}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('packageDeliver.notesPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* COD */}
        {hasCod && (
          <>
            <Text style={s.secTitle}>{t('packageDeliver.codCollection')}</Text>
            <View style={s.codCard}>
              <View style={s.codRow}>
                <Icon name="cash" size={18} color={colors.orange} />
                <Text style={s.codLabel}>{t('packageDeliver.codAmount', {amount: Number(codAmount).toFixed(2)})}</Text>
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

        <View style={{height: 100}} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
        <TouchableOpacity
          style={[s.confirmBtn, loading && {opacity: 0.6}]}
          onPress={handleConfirm}
          activeOpacity={0.75}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Icon name="check-decagram" size={18} color="#FFF" />
          )}
          <Text style={s.confirmTxt}>{loading ? t('packageDeliver.delivering') : t('packageDeliver.confirmDelivery')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  hdr: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, gap: 8,
  },
  hdrBack: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 15, color: colors.textPrimary, textAlign: 'auto'},
  hdrSub: {fontFamily: fontFamily.medium, fontSize: 10, color: colors.textMuted, marginTop: 1},
  scroll: {paddingHorizontal: 20, paddingBottom: 120},

  /* Info card */
  infoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.successBg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.success + '30', marginBottom: 8, gap: 14,
  },
  infoBadge: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },
  infoName: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary},
  infoBarcode: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.success, marginTop: 1},
  infoAddr: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2},

  /* Sections */
  secTitle: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary, marginBottom: 8, marginTop: 16},

  /* Photo */
  photoBox: {
    height: 180, backgroundColor: '#FFF', borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E4EA', borderStyle: 'dashed', gap: 8, overflow: 'hidden',
  },
  photoIc: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#F0F2F5', justifyContent: 'center', alignItems: 'center',
  },
  photoLabel: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted},
  photoImg: {width: '100%', height: '100%', borderRadius: 14},
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    marginTop: 8, gap: 4,
  },
  retakeTxt: {fontFamily: fontFamily.medium, fontSize: 12, color: colors.primary},

  /* Signature tap box */
  sigTapBox: {
    height: 80, backgroundColor: '#FFF', borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E4EA', borderStyle: 'dashed', gap: 6,
  },
  sigTapBoxDone: {
    borderStyle: 'solid', borderColor: colors.success + '40',
    backgroundColor: colors.successBg, height: 'auto', paddingVertical: 14, paddingHorizontal: 16,
  },
  sigIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0F2F5', justifyContent: 'center', alignItems: 'center',
  },
  sigTapLabel: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted},
  sigDoneContent: {
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%',
  },
  sigDoneIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },
  sigDoneLabel: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary},
  sigDoneSub: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 1},

  /* Notes */
  input: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    fontFamily: fontFamily.regular, fontSize: 13, color: colors.textPrimary,
    borderWidth: 1, borderColor: '#EEF1F5', minHeight: 80,
  },

  /* COD */
  codCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  codRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
  codLabel: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary, flex: 1},
  codExpected: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.orange},
  codInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8F9FA', borderRadius: 10,
    borderWidth: 1, borderColor: '#EEF1F5', height: 44, paddingHorizontal: 12,
  },
  codPrefix: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textMuted, marginEnd: 8},
  codInput: {
    flex: 1, fontFamily: fontFamily.medium, fontSize: 15, color: colors.textPrimary, paddingVertical: 0,
  },

  /* Bottom */
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF1F5',
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: {width: 0, height: -4}},
      android: {elevation: 8},
    }),
  },
  confirmBtn: {
    height: 50, backgroundColor: colors.success, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  confirmTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF'},
});

export default PackageDeliverScreen;
