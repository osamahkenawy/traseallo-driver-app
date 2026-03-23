/**
 * Failure Report Screen — Report delivery failure
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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import Icon from '../../utils/LucideIcon';
import {ordersApi, uploadsApi, packagesApi} from '../../api';
import {launchCamera} from 'react-native-image-picker';
import useLocationStore from '../../store/locationStore';
import {routeNames} from '../../constants/routeNames';
import {useTranslation} from 'react-i18next';

const REASONS = [
  {key: 'no_answer', labelKey: 'failureReport.recipientNotAvailable'},
  {key: 'wrong_address', labelKey: 'failureReport.wrongAddress'},
  {key: 'customer_refused', labelKey: 'failureReport.recipientRefused'},
  {key: 'unreachable', labelKey: 'failureReport.accessIssue'},
  {key: 'other', labelKey: 'failureReport.other'},
];

const FailureReportScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const {token, orderId} = route.params || {};
  const [sel, setSel] = useState(null);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingPackages, setCheckingPackages] = useState(true);
  const currentPosition = useLocationStore(s => s.currentPosition);

  // Check if order has packages — if so redirect to per-package failure
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
          navigation.replace(routeNames.PackageFail, {
            packageId: undelivered.id,
            orderId,
            token,
            barcode: undelivered.barcode,
            recipientName: undelivered.recipient_name,
          });
          return;
        }
      } catch {
        // No packages — continue with order-level flow
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

  const handleReport = async () => {
    if (!sel) return;
    if (!orderId) {
      Alert.alert(t('failureReport.error'), t('failureReport.noOrderId'));
      return;
    }
    setLoading(true);
    try {
      // Upload photo if taken
      let proofUrl = null;
      if (photoUri && orderId) {
        const uploadRes = await uploadsApi.uploadOrderProofPhoto(orderId, photoUri);
        proofUrl = uploadRes.data?.data?.url || uploadRes.data?.url || null;
      }

      await ordersApi.failOrder(orderId, {
        reason: sel,
        note: `Reason: ${t(REASONS.find(r => r.key === sel)?.labelKey || sel)}${notes.trim() ? `. ${notes.trim()}` : ''}`,
        proof_photo: proofUrl || undefined,
        lat: currentPosition?.latitude || undefined,
        lng: currentPosition?.longitude || undefined,
      });

      Alert.alert(t('failureReport.submitted'), t('failureReport.submittedDesc'), [
        {text: t('common.done'), onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      Alert.alert(
        t('failureReport.error'),
        e?.response?.data?.message || t('failureReport.failedToSubmit'),
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
            {t('common.checkingPackages')}
          </Text>
        </View>
      ) : (
      <>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('failureReport.title')}</Text>
        <View style={{width: 20}} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.failIc}>
          <Icon name="close-circle-outline" size={32} color={colors.danger} />
        </View>
        <Text style={s.question}>{t('failureReport.selectReason')}</Text>

        {REASONS.map(r => {
          const on = sel === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[s.reason, on && s.reasonOn]}
              onPress={() => setSel(r.key)}>
              <View style={[s.radio, on && s.radioOn]}>
                {on && <View style={s.radioInner} />}
              </View>
              <Text style={[s.reasonLabel, on && s.reasonLabelOn]}>{t(r.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={s.secTitle}>{t('failureReport.addNotes')}</Text>
        <TextInput
          style={s.input}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('failureReport.addNotes')}
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity style={s.photoBox} onPress={handleTakePhoto} activeOpacity={0.7}>
          {photoUri ? (
            <>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={[s.photoLabel, {color: colors.success}]}>{t('failureReport.addPhoto')}</Text>
            </>
          ) : (
            <>
              <Icon name="camera-outline" size={18} color={colors.textMuted} />
              <Text style={s.photoLabel}>{t('failureReport.addPhoto')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
        <TouchableOpacity
          style={[s.reportBtn, (!sel || loading) && {opacity: 0.45}]}
          onPress={handleReport}
          disabled={!sel || loading}
          activeOpacity={0.75}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.reportTxt}>{t('failureReport.submitReport')}</Text>
          )}
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
  scroll: {paddingHorizontal: 20, paddingBottom: 120, alignItems: 'center'},

  failIc: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.danger + '0D',
    justifyContent: 'center', alignItems: 'center',
  },
  question: {
    fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary,
    marginTop: 12, marginBottom: 20, textAlign: 'center',
  },

  reason: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    gap: 10,
  },
  reasonOn: {borderColor: colors.danger, backgroundColor: colors.danger + '08'},
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#C5CAD1',
    justifyContent: 'center', alignItems: 'center',
  },
  radioOn: {borderColor: colors.danger},
  radioInner: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger},
  reasonLabel: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary},
  reasonLabelOn: {color: colors.danger, fontFamily: fontFamily.semiBold},

  secTitle: {
    fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary,
    alignSelf: 'flex-start', marginTop: 16, marginBottom: 8,
  },
  input: {
    width: '100%',
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
  photoBox: {
    width: '100%', height: 64,
    backgroundColor: '#FFF',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E4EA', borderStyle: 'dashed',
    marginTop: 10, gap: 6,
  },
  photoLabel: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted},

  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF1F5',
  },
  reportBtn: {
    height: 48, backgroundColor: colors.danger, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  reportTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF'},
});

export default FailureReportScreen;
