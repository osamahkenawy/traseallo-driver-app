/**
 * PackageFailScreen — Per-package failure report
 * Failure reason + notes + photo → PATCH /api/packages/:id/status
 */

import React, {useState} from 'react';
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
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import useLocationStore from '../../store/locationStore';
import useOrderStore from '../../store/orderStore';
import {useTranslation} from 'react-i18next';
import {routeNames} from '../../constants/routeNames';

const REASONS = [
  {key: 'recipient_absent', labelKey: 'packageFail.recipientNotAvailable', icon: 'account-off-outline'},
  {key: 'wrong_address', labelKey: 'packageFail.wrongAddress', icon: 'map-marker-off-outline'},
  {key: 'customer_refused', labelKey: 'packageFail.recipientRefused', icon: 'hand-back-left-outline'},
  {key: 'area_unreachable', labelKey: 'packageFail.accessIssue', icon: 'road-variant'},
  {key: 'package_damaged', labelKey: 'packageFail.packageDamaged', icon: 'package-variant-remove'},
  {key: 'other', labelKey: 'packageFail.other', icon: 'dots-horizontal-circle-outline'},
];

const PackageFailScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const {
    packageId,
    orderId,
    token,
    recipientName = '',
    barcode = '',
  } = route.params || {};

  const currentPosition = useLocationStore(s => s.currentPosition);
  const updatePackageLocal = useOrderStore(s => s.updatePackageLocal);

  const [selectedReason, setSelectedReason] = useState(null);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!selectedReason) {
      showMessage({message: t('packageFail.selectReason'), type: 'warning', icon: 'auto'});
      return;
    }
    if (!packageId) {
      Alert.alert(t('packageFail.error'), t('packageFail.noPackageId'));
      return;
    }
    setLoading(true);
    try {
      // Upload photo evidence
      let proofUrl = null;
      if (photoUri && orderId) {
        const uploadRes = await uploadsApi.uploadOrderProofPhoto(orderId, photoUri);
        proofUrl = uploadRes.data?.data?.url || uploadRes.data?.url || null;
      }

      // PATCH package status to failed
      const body = {
        status: 'failed',
        failure_reason: selectedReason,
        notes: notes.trim() || undefined,
        proof_photo_url: proofUrl || undefined,
        lat: currentPosition?.latitude || undefined,
        lng: currentPosition?.longitude || undefined,
      };

      const res = await packagesApi.updateStatus(packageId, body);
      const result = res.data?.data || res.data;

      // Update local store
      updatePackageLocal(packageId, 'failed');

      // Progress toast
      const progress = result?.progress;
      if (progress) {
        showMessage({
          message: t('packageFail.success'),
          type: 'info',
          icon: 'auto',
          duration: 2500,
        });
      } else {
        showMessage({message: t('packageFail.success'), type: 'info', icon: 'auto', duration: 2000});
      }

      // Check if all packages terminal → summary
      if (progress && progress.delivered + progress.failed >= progress.total) {
        navigation.replace(routeNames.DeliverySummary, {orderId, token});
      } else {
        navigation.goBack();
      }
    } catch (e) {
      showMessage({
        message: t('packageFail.failedToSubmit'),
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
          <Text style={s.hdrTitle}>{t('packageFail.title')}</Text>
          <Text style={s.hdrSub}>{barcode || `PKG #${packageId}`}</Text>
        </View>
        <View style={{width: 36}} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Package Info */}
        <View style={s.infoCard}>
          <View style={s.infoBadge}>
            <Icon name="package-variant-remove" size={20} color={colors.danger} />
          </View>
          <View style={{flex: 1}}>
            <Text style={s.infoName}>{recipientName || t('orderDetail.recipient')}</Text>
            {barcode ? <Text style={s.infoBarcode}>{barcode}</Text> : null}
          </View>
        </View>

        {/* Failure Reason */}
        <Text style={s.secTitle}>{t('packageFail.selectReason')}</Text>
        {REASONS.map(r => {
          const on = selectedReason === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[s.reason, on && s.reasonOn]}
              onPress={() => setSelectedReason(r.key)}
              activeOpacity={0.7}>
              <View style={[s.reasonIc, on && {backgroundColor: colors.dangerBg}]}>
                <Icon name={r.icon} size={18} color={on ? colors.danger : colors.textMuted} />
              </View>
              <Text style={[s.reasonLabel, on && s.reasonLabelOn]}>{t(r.labelKey)}</Text>
              <View style={[s.radio, on && s.radioOn]}>
                {on && <View style={s.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Notes */}
        <Text style={s.secTitle}>{t('packageFail.addNotes')}</Text>
        <TextInput
          style={s.input}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('packageFail.addNotes')}
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Photo Evidence */}
        <TouchableOpacity style={s.photoBox} onPress={handleTakePhoto} activeOpacity={0.7}>
          {photoUri ? (
            <>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={[s.photoLabel, {color: colors.success}]}>{t('packageFail.addPhoto')}</Text>
            </>
          ) : (
            <>
              <Icon name="camera-outline" size={18} color={colors.textMuted} />
              <Text style={s.photoLabel}>{t('packageFail.addPhoto')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{height: 100}} />
      </ScrollView>

      {/* Bottom */}
      <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
        <TouchableOpacity
          style={[s.submitBtn, (!selectedReason || loading) && {opacity: 0.45}]}
          onPress={handleSubmit}
          disabled={!selectedReason || loading}
          activeOpacity={0.75}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Icon name="alert-circle-outline" size={17} color="#FFF" />
          )}
          <Text style={s.submitTxt}>{loading ? t('packageFail.submitting') : t('packageFail.submitReport')}</Text>
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
    backgroundColor: colors.dangerBg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.danger + '30', marginBottom: 8, gap: 14,
  },
  infoBadge: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },
  infoName: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary},
  infoBarcode: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.danger, marginTop: 1},

  secTitle: {
    fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary,
    marginBottom: 10, marginTop: 18,
  },

  /* Reason */
  reason: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#EEF1F5', gap: 12,
  },
  reasonOn: {borderColor: colors.danger, backgroundColor: colors.danger + '08'},
  reasonIc: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F7FA',
    justifyContent: 'center', alignItems: 'center',
  },
  reasonLabel: {flex: 1, fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary},
  reasonLabelOn: {color: colors.danger, fontFamily: fontFamily.semiBold},
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#C5CAD1',
    justifyContent: 'center', alignItems: 'center',
  },
  radioOn: {borderColor: colors.danger},
  radioInner: {width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger},

  /* Notes */
  input: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 14,
    fontFamily: fontFamily.regular, fontSize: 13, color: colors.textPrimary,
    borderWidth: 1, borderColor: '#EEF1F5', minHeight: 80,
  },

  /* Photo */
  photoBox: {
    height: 56, backgroundColor: '#FFF', borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E4EA', borderStyle: 'dashed',
    marginTop: 12, gap: 8,
  },
  photoLabel: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted},

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
  submitBtn: {
    height: 50, backgroundColor: colors.danger, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  submitTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF'},
});

export default PackageFailScreen;
