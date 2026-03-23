/**
 * SignatureScreen — Full-page driver signature capture
 * Matches the clean design: title → name → large canvas → clear → Back / Confirm
 */

import React, {useRef, useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import useAuthStore from '../../store/authStore';
import SignaturePad from '../../components/SignaturePad';
import {useTranslation} from 'react-i18next';

const SignatureScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const {returnScreen, returnParams = {}} = route.params || {};
  const sigRef = useRef(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const sigExportResolve = useRef(null);

  // Get the driver's name from the auth store
  const user = useAuthStore(s => s.user);
  const driverName = user?.full_name || user?.name || 'Driver';

  const handleExport = useCallback((dataUrl) => {
    if (sigExportResolve.current) {
      sigExportResolve.current(dataUrl);
      sigExportResolve.current = null;
    }
  }, []);

  const exportSignatureAsync = useCallback(() => {
    return new Promise((resolve) => {
      if (!hasStrokes) {
        resolve(null);
        return;
      }
      sigExportResolve.current = resolve;
      sigRef.current?.exportSignature();
      setTimeout(() => {
        if (sigExportResolve.current) {
          sigExportResolve.current(null);
          sigExportResolve.current = null;
        }
      }, 3000);
    });
  }, [hasStrokes]);

  const handleConfirm = async () => {
    if (!hasStrokes) return;
    const dataUrl = await exportSignatureAsync();
    if (dataUrl && returnScreen) {
      navigation.navigate({
        name: returnScreen,
        params: {...returnParams, signatureData: dataUrl},
        merge: true,
      });
    } else {
      navigation.goBack();
    }
  };

  const handleClear = () => {
    sigRef.current?.clear();
    setHasStrokes(false);
  };

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header area */}
      <View style={s.header}>
        <Text style={s.title}>{t('signature.title')}</Text>
        <Text style={s.driverName}>{driverName}</Text>
      </View>

      {/* Signature canvas — fills available space */}
      <View style={s.canvasContainer}>
        <SignaturePad
          ref={sigRef}
          style={s.canvas}
          onStrokeEnd={(has) => setHasStrokes(has)}
          onExport={handleExport}
        />
        {/* Signature baseline */}
        <View style={s.baseline} />
      </View>

      {/* Clear signature */}
      <TouchableOpacity style={s.clearBtn} onPress={handleClear} activeOpacity={0.6}>
        <Text style={s.clearTxt}>{t('signature.clear')}</Text>
      </TouchableOpacity>

      {/* Bottom buttons */}
      <View style={[s.bottom, {paddingBottom: ins.bottom + 12}]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={s.backTxt}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.confirmBtn, !hasStrokes && s.confirmDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.7}
          disabled={!hasStrokes}>
          <Text style={s.confirmTxt}>{t('common.confirm')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Header */
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'auto',
    letterSpacing: -0.3,
  },
  driverName: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
  },

  /* Canvas */
  canvasContainer: {
    flex: 1,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 4,
    position: 'relative',
  },
  canvas: {
    flex: 1,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
  },
  baseline: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#D0D5DD',
  },

  /* Clear */
  clearBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  clearTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textMuted,
  },

  /* Bottom buttons */
  bottom: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  backBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});

export default SignatureScreen;
