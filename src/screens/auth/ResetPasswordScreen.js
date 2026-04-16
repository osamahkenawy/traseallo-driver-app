/**
 * Reset Password Screen
 */

import React, {useState} from 'react';
import {View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import authApi from '../../api/auth';
import {useTranslation} from 'react-i18next';

const ResetPasswordScreen = ({navigation, route}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const identifier = route.params?.identifier || route.params?.email || '';
  const otp = route.params?.otp || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);

  const valid = password.length >= 6 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;

  const handleReset = async () => {
    if (!valid) return;
    if (!identifier || !otp) {
      Alert.alert(t('common.error'), t('auth.identifierMissing'));
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(identifier, otp, password);
      Alert.alert(t('auth.passwordResetTitle'), t('auth.passwordResetSuccess'), [
        {text: t('common.confirm'), onPress: () => navigation.popToTop()},
      ]);
    } catch (e) {
      Alert.alert(
        t('auth.resetFailed'),
        e?.response?.data?.message || t('auth.resetFailedMsg'),
      );
    } finally {
      setLoading(false);
    }
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
            <Icon name="shield-lock-outline" size={24} color="#FFF" />
          </View>
        </View>
        <Text style={s.title}>{t('auth.resetPasswordTitle')}</Text>
        <Text style={s.subtitle}>{t('auth.resetPasswordSubtitle')}</Text>
      </View>

      {/* ─── Form Card ─── */}
      <View style={s.card}>

        {/* Password Field */}
        <Text style={s.label}>{t('auth.newPassword')}</Text>
        <View style={[s.inputRow, focused === 'p' && s.inputFocused]}>
          <Icon name="lock-outline" size={18} color={focused === 'p' ? colors.primary : '#A0AEC0'} style={s.inputIc} />
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.minCharsPlaceholder', {count: 6})}
            placeholderTextColor="#B0BCC7"
            secureTextEntry={!show1}
            autoCapitalize="none"
            onFocus={() => setFocused('p')}
            onBlur={() => setFocused(null)}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShow1(!show1)}>
            <Icon name={show1 ? 'eye-off-outline' : 'eye-outline'} size={18} color="#A0AEC0" />
          </TouchableOpacity>
        </View>

        {/* Confirm Password Field */}
        <Text style={s.label}>{t('auth.confirmPassword')}</Text>
        <View style={[s.inputRow, focused === 'c' && s.inputFocused, mismatch && s.inputError]}>
          <Icon name="lock-check-outline" size={18} color={focused === 'c' ? colors.primary : '#A0AEC0'} style={s.inputIc} />
          <TextInput
            style={s.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t('auth.repeatPasswordPlaceholder')}
            placeholderTextColor="#B0BCC7"
            secureTextEntry={!show2}
            autoCapitalize="none"
            onFocus={() => setFocused('c')}
            onBlur={() => setFocused(null)}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShow2(!show2)}>
            <Icon name={show2 ? 'eye-off-outline' : 'eye-outline'} size={18} color="#A0AEC0" />
          </TouchableOpacity>
        </View>
        {mismatch && (
          <Text style={s.errorHint}>{t('auth.passwordMismatch', 'Passwords do not match')}</Text>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[s.btn, (!valid || loading) && s.btnDisabled]}
          disabled={!valid || loading}
          activeOpacity={0.85}
          onPress={handleReset}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={s.btnText}>{t('auth.resetPassword')}</Text>
              <Icon name="arrow-right" size={18} color="#FFF" style={{marginLeft: 8}} />
            </>
          )}
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

  divider: {
    height: 1, backgroundColor: '#F0F3F7',
    marginVertical: 8, marginHorizontal: -4,
  },

  /* Inputs */
  label: {
    fontFamily: fontFamily.semiBold, fontSize: 13,
    color: '#4A5568', marginBottom: 10, letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', height: 54,
    backgroundColor: '#F7F9FC', borderRadius: 16,
    borderWidth: 2, borderColor: '#EDF1F7', marginBottom: 20,
  },
  inputFocused: {
    borderColor: colors.primary + '60', backgroundColor: '#FFF',
    shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: {width: 0, height: 2},
  },
  inputError: {borderColor: colors.danger + '50'},
  inputIc: {marginStart: 16, marginEnd: 10},
  input: {
    flex: 1, height: '100%',
    fontFamily: fontFamily.medium, fontSize: 15,
    color: colors.textPrimary, paddingEnd: 14,
  },
  eyeBtn: {paddingHorizontal: 16, height: '100%', justifyContent: 'center'},
  errorHint: {
    fontFamily: fontFamily.medium, fontSize: 12,
    color: colors.danger, marginTop: -14, marginBottom: 16, marginLeft: 4,
  },

  /* Button */
  btn: {
    height: 54, backgroundColor: colors.primary, borderRadius: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  btnDisabled: {opacity: 0.35},
  btnText: {
    fontFamily: fontFamily.semiBold, fontSize: 16, color: '#FFF',
    letterSpacing: 0.2,
  },

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

export default ResetPasswordScreen;
