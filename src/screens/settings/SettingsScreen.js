/**
 * Settings Screen — Language, notifications, password, about
 */

import React, {useState, useCallback} from 'react';
import {View, StyleSheet, Text, ScrollView, TouchableOpacity, Modal, Pressable, Alert, Switch, Linking, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {useTranslation} from 'react-i18next';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import {changeLanguage} from '../../i18n';
import {version as appVersion} from '../../../package.json';

const TOS_URL = 'https://trasealla.com/terms';
const PRIVACY_URL = 'https://trasealla.com/privacy';

const LANGUAGES = [
  {code: 'en', label: 'English', icon: 'alpha-e-circle-outline'},
  {code: 'ar', label: 'Arabic', icon: 'abjad-arabic'},
];

const SettingRow = ({iconName, iconColor, label, value, onPress, showChevron = true}) => (
  <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.6}>
    <View style={s.rowLeft}>
      <View style={[s.rowIcon, {backgroundColor: (iconColor || colors.primary) + '12'}]}>
        <Icon name={iconName || 'cog'} size={16} color={iconColor || colors.primary} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
    </View>
    <View style={s.rowRight}>
      {value ? <Text style={s.rowValue}>{value}</Text> : null}
      {showChevron && <Icon name="chevron-right" size={16} color={colors.textMuted} />}
    </View>
  </TouchableOpacity>
);

const SettingsScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t, i18n} = useTranslation();
  const [langModal, setLangModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleLanguageSelect = useCallback(async (lang) => {
    setLangModal(false);
    if (lang.code === i18n.language) return;
    await changeLanguage(lang.code);
    Alert.alert(
      t('settings.languageChanged'),
      lang.code === 'ar'
        ? t('settings.restartRTL')
        : t('settings.languageUpdated'),
    );
  }, [i18n.language, t]);

  const handleNotificationsToggle = useCallback((val) => {
    setNotificationsEnabled(val);
    if (!val) {
      Alert.alert(
        t('settings.disableNotifications'),
        t('settings.openSystemSettings'),
        [
          {text: t('settings.openSettings'), onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:').catch(() => {});
            } else {
              Linking.openSettings().catch(() => {});
            }
          }},
          {text: t('common.cancel'), style: 'cancel', onPress: () => setNotificationsEnabled(true)},
        ],
      );
    }
  }, []);

  const handleOpenTOS = useCallback(() => {
    navigation.navigate(routeNames.WebView, {url: TOS_URL, title: t('settings.termsOfService')});
  }, [navigation]);

  const handleOpenPrivacy = useCallback(() => {
    navigation.navigate(routeNames.WebView, {url: PRIVACY_URL, title: t('settings.privacyPolicy')});
  }, [navigation]);

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* ─── Header ────────────────────────── */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('settings.title')}</Text>
        <View style={{width: 20}} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Account ─────────────────────── */}
        <Text style={s.secLabel}>{t('settings.account')}</Text>
        <View style={s.card}>
          <SettingRow
            iconName="lock-outline"
            iconColor={colors.primary}
            label={t('changePassword.title')}
            onPress={() => navigation.navigate(routeNames.ChangePassword)}
          />
        </View>

        {/* ─── Preferences ─────────────────── */}
        <Text style={s.secLabel}>{t('settings.preferences')}</Text>
        <View style={s.card}>
          <SettingRow iconName="translate" iconColor={colors.info} label={t('settings.language')} value={currentLang.label} onPress={() => setLangModal(true)} />
          <View style={s.divider} />
          <TouchableOpacity style={s.row} onPress={() => handleNotificationsToggle(!notificationsEnabled)} activeOpacity={0.6}>
            <View style={s.rowLeft}>
              <View style={[s.rowIcon, {backgroundColor: (colors.warning) + '12'}]}>
                <Icon name="bell-outline" size={16} color={colors.warning} />
              </View>
              <Text style={s.rowLabel}>{t('settings.notifications')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{false: '#DDE1E6', true: colors.primary + '55'}}
              thumbColor={notificationsEnabled ? colors.primary : '#F4F3F4'}
              ios_backgroundColor="#DDE1E6"
            />
          </TouchableOpacity>
        </View>

        {/* ─── About ───────────────────────── */}
        <Text style={s.secLabel}>{t('settings.about')}</Text>
        <View style={s.card}>
          <SettingRow iconName="information-outline" iconColor={colors.textMuted} label={t('settings.version')} value={appVersion || '1.0.0'} showChevron={false} onPress={() => {}} />
          <View style={s.divider} />
          <SettingRow iconName="file-document-outline" iconColor={colors.textSecondary} label={t('settings.termsOfService')} onPress={handleOpenTOS} />
          <View style={s.divider} />
          <SettingRow iconName="shield-check-outline" iconColor={colors.success} label={t('settings.privacyPolicy')} onPress={handleOpenPrivacy} />
        </View>
      </ScrollView>

      {/* ─── Language Picker Modal ──────────── */}
      <Modal visible={langModal} transparent animationType="fade" onRequestClose={() => setLangModal(false)}>
        <Pressable style={s.overlay} onPress={() => setLangModal(false)}>
          <Pressable style={[s.sheet, {paddingBottom: ins.bottom + 16}]} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{t('settings.selectLanguage')}</Text>

            {LANGUAGES.map(lang => {
              const active = lang.code === i18n.language;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[s.langRow, active && s.langRowActive]}
                  onPress={() => handleLanguageSelect(lang)}
                  activeOpacity={0.6}>
                  <View style={[s.langIconWrap, active && {backgroundColor: colors.primary + '12'}]}>
                    <Icon name={lang.icon} size={20} color={active ? colors.primary : colors.textSecondary} />
                  </View>
                  <Text style={[s.langLabel, active && s.langLabelActive]}>{lang.label}</Text>
                  {active && <Icon name="check-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
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
  scroll: {paddingHorizontal: 20, paddingBottom: 40},

  secLabel: {
    fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.textMuted,
    letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginStart: 4,
  },
  card: {
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF1F5',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rowIcon: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  rowLabel: {fontFamily: fontFamily.medium, fontSize: 14, color: colors.textPrimary},
  rowRight: {flexDirection: 'row', alignItems: 'center', gap: 6},
  rowValue: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted},
  divider: {height: 1, backgroundColor: '#EEF1F5', marginStart: 58},

  /* Language Modal */
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 24, paddingTop: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#DDE1E6', alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary, marginBottom: 16},
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 12, marginBottom: 6,
  },
  langRowActive: {backgroundColor: colors.primary + '0A'},
  langIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center', alignItems: 'center',
  },
  langLabel: {fontFamily: fontFamily.medium, fontSize: 15, color: colors.textPrimary, flex: 1},
  langLabelActive: {fontFamily: fontFamily.semiBold, color: colors.primary},
});

export default SettingsScreen;
