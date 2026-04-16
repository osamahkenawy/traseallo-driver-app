/**
 * Verify OTP Screen
 * User enters the OTP code received via email, then proceeds to reset password.
 */

import React, {useState, useRef} from 'react';
import {
  View, StyleSheet, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import {useTranslation} from 'react-i18next';

const OTP_LENGTH = 6;

const VerifyOtpScreen = ({navigation, route}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const identifier = route.params?.identifier || '';
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const otpValue = otp.join('');
  const valid = otpValue.length === OTP_LENGTH;

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    // Handle paste of full OTP
    if (text.length > 1) {
      const chars = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      chars.forEach((c, i) => { if (i < OTP_LENGTH) newOtp[i] = c; });
      setOtp(newOtp);
      const nextIdx = Math.min(chars.length, OTP_LENGTH - 1);
      inputs.current[nextIdx]?.focus();
      return;
    }
    newOtp[index] = text.replace(/\D/g, '');
    setOtp(newOtp);
    setError('');
    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = () => {
    if (!valid) return;
    navigation.navigate(routeNames.ResetPassword, {
      identifier,
      otp: otpValue,
    });
  };

  return (
    <KeyboardAvoidingView style={{flex: 1, backgroundColor: '#F5F7FA'}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView
      contentContainerStyle={[s.scroll, {paddingTop: ins.top + 16}]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>

      {/* ─── Back ─── */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
        <View style={s.backCircle}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </View>
      </TouchableOpacity>

      {/* ─── Hero ─── */}
      <View style={s.hero}>
        <View style={s.iconOuter}>
          <View style={s.iconInner}>
            <Icon name="message-text-outline" size={24} color="#FFF" />
          </View>
        </View>
        <Text style={s.title}>{t('auth.verifyOtpTitle', 'Verify Code')}</Text>
        <Text style={s.subtitle}>
          {t('auth.verifyOtpSubtitle', 'Enter the 6-digit code we sent to your email')}
        </Text>
      </View>

      {/* ─── Email Pill ─── */}
      {!!identifier && (
        <View style={s.emailPill}>
          <Icon name="email-outline" size={14} color={colors.primary} />
          <Text style={s.emailPillTxt}>{identifier}</Text>
        </View>
      )}

      {/* ─── OTP Input ─── */}
      <View style={s.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => { inputs.current[i] = ref; }}
            style={[
              s.otpBox,
              digit ? s.otpBoxFilled : null,
              error ? s.otpBoxError : null,
            ]}
            value={digit}
            onChangeText={(text) => handleChange(text, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            textContentType="oneTimeCode"
          />
        ))}
      </View>

      {!!error && (
        <View style={s.errorRow}>
          <Icon name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={s.errorTxt}>{error}</Text>
        </View>
      )}

      {/* ─── Confirm Button ─── */}
      <TouchableOpacity
        style={[s.btn, (!valid || loading) && s.btnDisabled]}
        disabled={!valid || loading}
        activeOpacity={0.85}
        onPress={handleConfirm}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Text style={s.btnText}>{t('auth.confirmOtp', 'Confirm')}</Text>
            <Icon name="arrow-right" size={18} color="#FFF" style={{marginLeft: 8}} />
          </>
        )}
      </TouchableOpacity>

      {/* ─── Resend ─── */}
      <View style={s.resendRow}>
        <Text style={s.resendTxt}>{t('auth.didntReceive', "Didn't receive it?")} </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.resendLink}>{t('auth.resend', 'Resend')}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },

  /* Back */
  backBtn: {marginBottom: 32},
  backCircle: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0B1D33', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },

  /* Hero */
  hero: {marginBottom: 20},
  iconOuter: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 22,
  },
  iconInner: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 28, color: colors.textPrimary,
    letterSpacing: -0.5, marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 15, color: '#6B7B8D',
    lineHeight: 23,
  },

  /* Email pill */
  emailPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: colors.primary + '08', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 28,
  },
  emailPillTxt: {
    fontFamily: fontFamily.medium, fontSize: 13,
    color: colors.primary, marginLeft: 8,
  },

  /* OTP boxes */
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 50, height: 58, borderRadius: 14,
    backgroundColor: '#F7F9FC',
    borderWidth: 2, borderColor: '#EDF1F7',
    textAlign: 'center',
    fontFamily: fontFamily.bold, fontSize: 22,
    color: colors.textPrimary,
  },
  otpBoxFilled: {
    borderColor: colors.primary + '60',
    backgroundColor: '#FFF',
    shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  otpBoxError: {
    borderColor: colors.danger + '50',
  },

  /* Error */
  errorRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 20,
  },
  errorTxt: {
    fontFamily: fontFamily.medium, fontSize: 13,
    color: colors.danger, marginLeft: 8,
  },

  /* Button */
  btn: {
    height: 54, backgroundColor: colors.primary, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  btnDisabled: {opacity: 0.35},
  btnText: {
    fontFamily: fontFamily.semiBold, fontSize: 16, color: '#FFF',
    letterSpacing: 0.2,
  },

  /* Resend */
  resendRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 28,
  },
  resendTxt: {fontFamily: fontFamily.regular, fontSize: 14, color: '#6B7B8D'},
  resendLink: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.secondary},
});

export default VerifyOtpScreen;
