/**
 * Reset Password Screen
 */

import React, {useState} from 'react';
import {View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import authApi from '../../api/auth';

const ResetPasswordScreen = ({navigation, route}) => {
  const ins = useSafeAreaInsets();
  const identifier = route.params?.identifier || route.params?.email || '';
  const [otp, setOtp] = useState(route.params?.otp || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);

  const valid = otp.length >= 4 && password.length >= 6 && password === confirm;

  const handleReset = async () => {
    if (!valid) return;
    if (!identifier) {
      Alert.alert('Error', 'Identifier is missing. Please go back and try again.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(identifier, otp, password);
      Alert.alert('Password Reset', 'Your password has been reset successfully. Please log in.', [
        {text: 'OK', onPress: () => navigation.popToTop()},
      ]);
    } catch (e) {
      Alert.alert(
        'Reset Failed',
        e?.response?.data?.message || 'Failed to reset password. The link may have expired.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* ─── Back ──────────────────────────── */}
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <View style={s.backCircle}>
          <Icon name="arrow-left" size={18} color={colors.textPrimary} />
        </View>
      </TouchableOpacity>

      <View style={s.iconWrap}>
        <Icon name="shield-lock-outline" size={28} color={colors.primary} />
      </View>
      <Text style={s.title}>Reset Password</Text>
      <Text style={s.subtitle}>Enter the OTP code sent to your email/phone and create a new password.</Text>

      <View style={s.card}>
        <Text style={s.label}>OTP Code</Text>
        <View style={[s.inputRow, focused === 'o' && s.inputRowFocused]}>
          <Icon name="numeric" size={18} color={focused === 'o' ? colors.primary : colors.textMuted} style={s.inputIc} />
          <TextInput
            style={s.input}
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
            onFocus={() => setFocused('o')}
            onBlur={() => setFocused(null)}
          />
        </View>

        <Text style={s.label}>New Password</Text>
        <View style={[s.inputRow, focused === 'p' && s.inputRowFocused]}>
          <Icon name="lock-outline" size={18} color={focused === 'p' ? colors.primary : colors.textMuted} style={s.inputIc} />
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min 6 characters"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show1}
            autoCapitalize="none"
            onFocus={() => setFocused('p')}
            onBlur={() => setFocused(null)}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShow1(!show1)}>
            <Icon name={show1 ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Confirm Password</Text>
        <View style={[s.inputRow, focused === 'c' && s.inputRowFocused]}>
          <Icon name="lock-check-outline" size={18} color={focused === 'c' ? colors.primary : colors.textMuted} style={s.inputIc} />
          <TextInput
            style={s.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat your password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!show2}
            autoCapitalize="none"
            onFocus={() => setFocused('c')}
            onBlur={() => setFocused(null)}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShow2(!show2)}>
            <Icon name={show2 ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.btn, (!valid || loading) && s.btnOff]} disabled={!valid || loading} activeOpacity={0.8} onPress={handleReset}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.btnText}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA', paddingHorizontal: 24},

  backBtn: {marginTop: 12, marginBottom: 24},
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

  card: {
    backgroundColor: '#FFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#EEF1F5', padding: 20,
  },
  label: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textSecondary, marginBottom: 6},
  inputRow: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    backgroundColor: '#F8F9FA', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#EEF1F5', marginBottom: 16,
  },
  inputRowFocused: {borderColor: colors.primary, backgroundColor: '#FFF'},
  inputIc: {marginLeft: 14, marginRight: 8},
  input: {flex: 1, height: '100%', fontFamily: fontFamily.regular, fontSize: 14, color: colors.textPrimary, paddingRight: 14},
  eyeBtn: {paddingHorizontal: 14, height: '100%', justifyContent: 'center'},

  btn: {
    height: 48, backgroundColor: colors.primary, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  btnOff: {opacity: 0.45},
  btnText: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF'},
});

export default ResetPasswordScreen;
