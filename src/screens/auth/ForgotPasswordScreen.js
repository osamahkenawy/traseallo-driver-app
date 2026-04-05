/**
 * Forgot Password Screen
 */

import React, {useState} from 'react';
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

const ForgotPasswordScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e?.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ─── Back ──────────────────────────── */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <View style={s.backCircle}>
            <Icon name="arrow-left" size={18} color={colors.textPrimary} />
          </View>
        </TouchableOpacity>

        {/* ─── Icon ──────────────────────────── */}
        <View style={s.iconWrap}>
          <Icon name="lock-reset" size={28} color={colors.primary} />
        </View>

        <Text style={s.title}>{t('auth.forgotPasswordTitle')}</Text>
        <Text style={s.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>

        {sent ? (
          <View style={s.successBox}>
            <Icon name="check-circle-outline" size={18} color={colors.success} />
            <Text style={s.successText}>{t('auth.otpSent')}</Text>
            <TouchableOpacity
              style={[s.btn, {marginTop: 12}]}
              onPress={() => navigation.navigate(routeNames.ResetPassword, {identifier: email.trim()})}
              activeOpacity={0.8}>
              <Text style={s.btnText}>{t('auth.enterOtpReset')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.card}>
            {error ? (
              <View style={s.errorBox}>
                <Icon name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={s.label}>{t('auth.emailAddress')}</Text>
            <View style={[s.inputRow, focused && s.inputRowFocused]}>
              <Icon name="email-outline" size={18} color={focused ? colors.primary : colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholderExample')}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>

            <TouchableOpacity
              style={[s.btn, !email.trim() && s.btnOff]}
              onPress={handleSubmit}
              disabled={loading || !email.trim()}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.btnText}>{t('auth.sendResetLink')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={14} color={colors.primary} />
          <Text style={s.backLinkText}>{t('auth.backToSignIn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#F5F7FA'},
  scroll: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40},

  backBtn: {marginBottom: 24},
  backCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEF1F5',
    justifyContent: 'center', alignItems: 'center',
  },

  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: {fontFamily: fontFamily.bold, fontSize: 22, color: colors.textPrimary, marginBottom: 4},
  subtitle: {fontFamily: fontFamily.regular, fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20},

  /* Success */
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.successBg, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: colors.success + '30',
  },
  successText: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.success, textAlign: 'center', lineHeight: 18, marginTop: 10},

  /* Card */
  card: {
    backgroundColor: '#FFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EEF1F5', padding: 20,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.dangerBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  errorText: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.danger, flex: 1, marginLeft: 8},

  label: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textSecondary, marginBottom: 6},
  inputRow: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    backgroundColor: '#F8F9FA', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#EEF1F5', marginBottom: 20,
  },
  inputRowFocused: {borderColor: colors.primary, backgroundColor: '#FFF'},
  inputIcon: {marginStart: 14, marginEnd: 8},
  input: {flex: 1, height: '100%', fontFamily: fontFamily.regular, fontSize: 14, color: colors.textPrimary, paddingEnd: 14},

  btn: {
    height: 48, backgroundColor: colors.primary, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  btnOff: {opacity: 0.45},
  btnText: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF'},

  backLink: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 24,
  },
  backLinkText: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.primary, marginLeft: 6},
});

export default ForgotPasswordScreen;
