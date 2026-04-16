/**
 * Forgot Password Screen
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import authApi from '../../api/auth';
import {routeNames} from '../../constants/routeNames';
import {useTranslation} from 'react-i18next';

const RESEND_COOLDOWN = 60; // seconds

const ForgotPasswordScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || loading || cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
      startCooldown();
    } catch (e) {
      setError(e?.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ─── Back Button ─── */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <View style={s.backCircle}>
            <Icon name="arrow-left" size={20} color={colors.textPrimary} />
          </View>
        </TouchableOpacity>

        {/* ─── Hero Section ─── */}
        <View style={s.hero}>
          <View style={s.iconOuter}>
            <View style={s.iconInner}>
              <Icon name="lock-reset" size={26} color="#FFF" />
            </View>
          </View>
          <Text style={s.title}>{t('auth.forgotPasswordTitle')}</Text>
          <Text style={s.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>
        </View>

        {sent ? (
          /* ─── Success State ─── */
          <View style={s.card}>
            <View style={s.successBadge}>
              <Icon name="check-circle-outline" size={24} color="#FFF" />
            </View>
            <Text style={s.successTitle}>{t('auth.otpSent')}</Text>
            <Text style={s.successDesc}>
              {t('auth.otpSentDesc', 'We\'ve sent a 6-digit verification code to your email address. Please check your inbox.')}
            </Text>

            <View style={s.emailPill}>
              <Icon name="email-outline" size={14} color={colors.primary} />
              <Text style={s.emailPillTxt}>{email.trim()}</Text>
            </View>

            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => navigation.navigate(routeNames.VerifyOtp, {identifier: email.trim()})}
              activeOpacity={0.85}>
              <Text style={s.btnPrimaryTxt}>{t('auth.enterOtpReset')}</Text>
              <Icon name="arrow-right" size={18} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.resendRow, (loading || cooldown > 0) && s.resendDisabled]} 
              onPress={handleSubmit} 
              activeOpacity={0.7}
              disabled={loading || cooldown > 0}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : cooldown > 0 ? (
                <Text style={s.resendTxt}>{t('auth.resendIn', 'Resend in')} {cooldown}s</Text>
              ) : (
                <>
                  <Text style={s.resendTxt}>{t('auth.didntReceive', "Didn't receive it?")}{' '}</Text>
                  <Text style={s.resendLink}>{t('auth.resend', 'Resend')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ─── Email Form ─── */
          <View style={s.card}>
            {error ? (
              <View style={s.errorBox}>
                <Icon name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={s.label}>{t('auth.emailAddress')}</Text>
            <View style={[s.inputRow, focused && s.inputFocused, error && s.inputError]}>
              <Icon name="email-outline" size={18} color={focused ? colors.primary : '#A0AEC0'} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                placeholder={t('auth.emailPlaceholderExample')}
                placeholderTextColor="#B0BCC7"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, !email.trim() && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading || !email.trim()}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={s.btnPrimaryTxt}>{t('auth.sendResetLink')}</Text>
                  <Icon name="send" size={16} color="#FFF" style={{marginLeft: 8}} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Bottom Link ─── */}
        <TouchableOpacity style={s.bottomLink} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-left" size={15} color={colors.primary} />
          <Text style={s.bottomLinkTxt}>{t('auth.backToSignIn')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#F5F7FA'},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
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
  hero: {marginBottom: 28},
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

  /* Card */
  card: {
    backgroundColor: '#FFF', borderRadius: 24,
    padding: 24,
    shadowColor: '#0B1D33', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },

  /* Error */
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F4', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
    borderWidth: 1, borderColor: colors.danger + '15',
  },
  errorText: {
    fontFamily: fontFamily.medium, fontSize: 13,
    color: colors.danger, flex: 1, marginLeft: 10, lineHeight: 18,
  },

  /* Input */
  label: {
    fontFamily: fontFamily.semiBold, fontSize: 13,
    color: '#4A5568', marginBottom: 10, letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', height: 54,
    backgroundColor: '#F7F9FC', borderRadius: 16,
    borderWidth: 2, borderColor: '#EDF1F7', marginBottom: 24,
  },
  inputFocused: {
    borderColor: colors.primary + '60', backgroundColor: '#FFF',
    shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: {width: 0, height: 2},
  },
  inputError: {borderColor: colors.danger + '40'},
  inputIcon: {marginStart: 16, marginEnd: 10},
  input: {
    flex: 1, height: '100%',
    fontFamily: fontFamily.medium, fontSize: 15,
    color: colors.textPrimary, paddingEnd: 16,
  },

  /* Primary Button */
  btnPrimary: {
    height: 54, backgroundColor: colors.primary, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  btnDisabled: {opacity: 0.4},
  btnPrimaryTxt: {
    fontFamily: fontFamily.semiBold, fontSize: 16, color: '#FFF',
    letterSpacing: 0.2, marginRight: 4,
  },

  /* Success State */
  successBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 20,
    shadowColor: colors.success, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  successTitle: {
    fontFamily: fontFamily.semiBold, fontSize: 20, color: colors.textPrimary,
    textAlign: 'center', marginBottom: 8,
  },
  successDesc: {
    fontFamily: fontFamily.regular, fontSize: 14, color: '#6B7B8D',
    textAlign: 'center', lineHeight: 22, marginBottom: 16,
  },
  emailPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    backgroundColor: colors.primary + '08', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 24,
  },
  emailPillTxt: {
    fontFamily: fontFamily.medium, fontSize: 13,
    color: colors.primary, marginLeft: 8,
  },
  resendRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 18,
  },
  resendDisabled: {opacity: 0.5},
  resendTxt: {fontFamily: fontFamily.regular, fontSize: 13, color: '#6B7B8D'},
  resendLink: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.secondary},

  /* Bottom Link */
  bottomLink: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 32,
  },
  bottomLinkTxt: {
    fontFamily: fontFamily.semiBold, fontSize: 15,
    color: colors.primary, marginLeft: 8,
  },
});

export default ForgotPasswordScreen;
