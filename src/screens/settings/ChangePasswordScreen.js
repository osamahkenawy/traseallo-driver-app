/**
 * Change Password Screen — Update current password
 */

import React, {useState} from 'react';
import {View, StyleSheet, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {authApi} from '../../api';
import {useTranslation} from 'react-i18next';

const PasswordField = ({label, icon, value, onChangeText, placeholder, show, onToggle, focused, onFocus, onBlur}) => (
  <View style={s.fieldGroup}>
    <Text style={s.fieldLabel}>{label}</Text>
    <View style={[s.fieldRow, focused && s.fieldRowFocused]}>
      <Icon name={icon} size={16} color={focused ? colors.primary : colors.textMuted} style={{marginStart: 14, marginEnd: 8}} />
      <TextInput
        style={s.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={!show}
        autoCapitalize="none"
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <TouchableOpacity style={s.eyeBtn} onPress={onToggle}>
        <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  </View>
);

const ChangePasswordScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({c: false, n: false, cf: false});
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);

  const valid = current.length >= 6 && newPwd.length >= 6 && newPwd === confirm;

  const handleUpdate = async () => {
    if (!valid) return;
    if (newPwd !== confirm) {
      Alert.alert(t('changePassword.mismatch'), t('changePassword.mismatchDesc'));
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(current, newPwd);
      Alert.alert(t('changePassword.success'), t('changePassword.successDesc'), [
        {text: t('common.done'), onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      Alert.alert(
        t('changePassword.updateFailed'),
        e?.response?.data?.message || t('changePassword.updateFailedDesc'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('changePassword.title')}</Text>
        <View style={{width: 20}} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.infoRow}>
            <Icon name="information-outline" size={15} color={colors.info} />
            <Text style={s.infoText}>{t('changePassword.passwordMin')}</Text>
          </View>

          <PasswordField
            label={t('changePassword.currentPassword')}
            icon="lock-outline"
            value={current}
            onChangeText={setCurrent}
            placeholder={t('changePassword.enterCurrent')}
            show={show.c}
            onToggle={() => setShow(p => ({...p, c: !p.c}))}
            focused={focused === 'c'}
            onFocus={() => setFocused('c')}
            onBlur={() => setFocused(null)}
          />
          <PasswordField
            label={t('changePassword.newPassword')}
            icon="lock-plus-outline"
            value={newPwd}
            onChangeText={setNewPwd}
            placeholder={t('changePassword.minChars')}
            show={show.n}
            onToggle={() => setShow(p => ({...p, n: !p.n}))}
            focused={focused === 'n'}
            onFocus={() => setFocused('n')}
            onBlur={() => setFocused(null)}
          />
          <PasswordField
            label={t('changePassword.confirmPassword')}
            icon="lock-check-outline"
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t('changePassword.repeatNew')}
            show={show.cf}
            onToggle={() => setShow(p => ({...p, cf: !p.cf}))}
            focused={focused === 'cf'}
            onFocus={() => setFocused('cf')}
            onBlur={() => setFocused(null)}
          />
        </View>
      </ScrollView>

      <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
        <TouchableOpacity style={[s.btn, (!valid || loading) && s.btnOff]} disabled={!valid || loading} activeOpacity={0.8} onPress={handleUpdate}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.btnTxt}>{t('changePassword.updatePassword')}</Text>
          )}
        </TouchableOpacity>
      </View>
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
  scroll: {paddingHorizontal: 20, paddingBottom: 100},

  card: {
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF1F5', padding: 20, marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.infoBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20,
  },
  infoText: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.info, flex: 1},

  fieldGroup: {marginBottom: 16},
  fieldLabel: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textSecondary, marginBottom: 6},
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', height: 46,
    backgroundColor: '#F8F9FA', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#EEF1F5',
  },
  fieldRowFocused: {borderColor: colors.primary, backgroundColor: '#FFF'},
  fieldInput: {flex: 1, height: '100%', fontFamily: fontFamily.regular, fontSize: 14, color: colors.textPrimary, paddingEnd: 14},
  eyeBtn: {paddingHorizontal: 14, height: '100%', justifyContent: 'center'},

  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF1F5',
  },
  btn: {
    height: 48, backgroundColor: colors.primary, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  btnOff: {opacity: 0.45},
  btnTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: '#FFF'},
});

export default ChangePasswordScreen;
