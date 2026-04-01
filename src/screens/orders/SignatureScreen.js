/**
 * SignatureScreen — Premium customer signature capture
 * Compact branded card with signature pad, preview, and action buttons
 */

import React, {useRef, useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import SignaturePad from '../../components/SignaturePad';
import {useTranslation} from 'react-i18next';

const SignatureScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const {returnScreen, returnParams = {}, signerLabel} = route.params || {};
  const sigRef = useRef(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const savedDataRef = useRef(null);

  const handleExport = useCallback((dataUrl) => {
    if (dataUrl) {
      setSavedData(dataUrl);
      savedDataRef.current = dataUrl;
    }
  }, []);

  const handleConfirm = () => {
    if (savedData && returnScreen) {
      navigation.navigate({
        name: returnScreen,
        params: {...returnParams, signatureData: savedData},
        merge: true,
      });
    } else if (!savedData && hasStrokes) {
      // Auto-export then navigate
      sigRef.current?.exportSignature();
      // Use a small delay for the export callback, read from ref to avoid stale closure
      setTimeout(() => {
        const data = savedDataRef.current;
        if (data && returnScreen) {
          navigation.navigate({
            name: returnScreen,
            params: {...returnParams, signatureData: data},
            merge: true,
          });
        }
      }, 500);
    }
  };

  const handleSave = () => {
    if (hasStrokes) {
      sigRef.current?.exportSignature();
    }
  };

  const handleClear = () => {
    sigRef.current?.clear();
    setHasStrokes(false);
    setSavedData(null);
  };

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Top bar with back */}
      <View style={s.topBar}>
        <TouchableOpacity
          style={s.topBackBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={s.topBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('signature.customerTitle', 'Customer Signature')}</Text>
        <View style={s.topBackBtn} />
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        {/* Instruction card */}
        <View style={s.instructionCard}>
          <View style={s.instructionIcon}>
            <Text style={s.instructionEmoji}>✍️</Text>
          </View>
          <View style={s.instructionTextWrap}>
            <Text style={s.instructionTitle}>
              {t('signature.instructionTitle', 'Proof of Delivery')}
            </Text>
            <Text style={s.instructionSub}>
              {signerLabel ||
                t(
                  'signature.askCustomer',
                  'Please ask the customer to sign below',
                )}
            </Text>
          </View>
        </View>

        {/* Signature pad area */}
        <View style={s.padSection}>
          <Text style={s.padLabel}>
            {t('signature.signatureLabel', 'SIGNATURE')}
          </Text>
          <SignaturePad
            ref={sigRef}
            height={220}
            onStrokeEnd={(has) => setHasStrokes(has)}
            onExport={handleExport}
            onClear={() => {
              setHasStrokes(false);
              setSavedData(null);
            }}
          />
        </View>

        {/* Save button — visible when strokes exist but not yet saved */}
        {hasStrokes && !savedData && (
          <TouchableOpacity
            style={s.saveBtn}
            onPress={handleSave}
            activeOpacity={0.7}>
            <Text style={s.saveBtnTxt}>
              {t('signature.saveSignature', 'Save Signature')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={[s.bottom, {paddingBottom: ins.bottom + 12}]}>
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={s.cancelTxt}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.confirmBtn, !savedData && s.confirmDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.7}
          disabled={!savedData}>
          <Text style={s.confirmTxt}>{t('common.confirm')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgScreen,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBackIcon: {
    fontSize: 28,
    color: colors.textPrimary,
    lineHeight: 32,
    fontFamily: fontFamily.medium,
  },
  topBarTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },

  /* Scroll */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },

  /* Instruction card */
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {elevation: 2},
    }),
  },
  instructionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.bgSoftBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  instructionEmoji: {
    fontSize: 22,
  },
  instructionTextWrap: {
    flex: 1,
  },
  instructionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  instructionSub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },

  /* Pad section */
  padSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    paddingTop: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {elevation: 2},
    }),
  },
  padLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },

  /* Save button */
  saveBtn: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  saveBtnTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  /* Bottom buttons */
  bottom: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelTxt: {
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
