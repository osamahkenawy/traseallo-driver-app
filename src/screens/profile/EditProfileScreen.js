/**
 * Edit Profile Screen — Comprehensive driver profile editor with status toggle
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import useAuthStore from '../../store/authStore';
import useLocationStore from '../../store/locationStore';
import {uploadsApi, authApi} from '../../api';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {showMessage} from 'react-native-flash-message';
import {useTranslation} from 'react-i18next';

const {width: SCREEN_W} = Dimensions.get('window');

// ─── Status Configuration ────────────────────────────
const STATUS_OPTIONS = [
  {key: 'available', labelKey: 'editProfile.available', icon: 'check-circle', color: colors.success, bg: colors.successBg},
  {key: 'on_break', labelKey: 'editProfile.busy', icon: 'clock-outline', color: colors.warning, bg: colors.warningBg},
  {key: 'offline', labelKey: 'editProfile.offline', icon: 'power-sleep', color: colors.danger, bg: colors.dangerBg},
];

// ─── Reusable Input Field ────────────────────────────
const Field = ({label, icon, value, onChangeText, placeholder, editable = true, keyboardType = 'default', multiline = false, children}) => (
  <View style={s.fieldGroup}>
    <Text style={s.fieldLabel}>{label}</Text>
    {children ? children : (
      <View style={[s.fieldRow, !editable && s.fieldRowDisabled, multiline && {height: 80, alignItems: 'flex-start'}]}>
        <Icon name={icon} size={16} color={editable ? colors.primary : colors.textMuted} style={{marginStart: 14, marginEnd: 10, marginTop: multiline ? 14 : 0}} />
        <TextInput
          style={[s.fieldInput, multiline && {textAlignVertical: 'top', paddingTop: 12}]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={editable}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
        {!editable && <Icon name="lock-outline" size={14} color={colors.textMuted} style={{marginEnd: 14}} />}
      </View>
    )}
  </View>
);

// ─── Phone Field with Country Code ───────────────────
const PhoneField = ({label, icon, countryCode, onCountryCodeChange, phone, onPhoneChange, codeLabel}) => (
  <View style={s.fieldGroup}>
    <Text style={s.fieldLabel}>{label}</Text>
    <View style={[s.phoneRow, {flexDirection: 'row', direction: 'ltr'}]}>
      <View style={s.phoneBox}>
        <TextInput
          style={s.phoneInput}
          value={phone}
          onChangeText={onPhoneChange}
          placeholder="5XX XXX XXXX"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />
      </View>
      <View style={[s.codeBox, {marginStart: 8}]}>
        <Icon name={icon} size={16} color={colors.primary} style={{marginStart: 10, marginEnd: 6}} />
        <TextInput
          style={s.codeInput}
          value={countryCode}
          onChangeText={onCountryCodeChange}
          placeholder="+971"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          maxLength={5}
        />
      </View>
    </View>
  </View>
);

// ─── Helper: split phone into country code + number ──
const splitPhone = (fullPhone) => {
  if (!fullPhone) return {code: '+971', number: ''};
  const cleaned = fullPhone.replace(/\s+/g, '');
  // Match common country codes: +XXX, +XX, +X
  const match = cleaned.match(/^(\+\d{1,4})(.*)$/);
  if (match) return {code: match[1], number: match[2]};
  return {code: '+971', number: cleaned};
};

// ─── Section Header ──────────────────────────────────
const SectionHeader = ({icon, title, subtitle}) => (
  <View style={s.sectionHdr}>
    <View style={s.sectionIconWrap}>
      <Icon name={icon} size={16} color={colors.primary} />
    </View>
    <View style={{flex: 1, marginStart: 12}}>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

// ─── Status Pill ─────────────────────────────────────
const StatusPill = ({option, isActive, onPress, animValue, isFirst}) => {
  const {t: tPill} = useTranslation();
  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });
  return (
    <Animated.View style={{transform: [{scale: isActive ? scale : 1}], flex: 1, marginStart: isFirst ? 0 : 8}}>
      <TouchableOpacity
        style={[
          s.statusPill,
          {borderColor: isActive ? option.color : '#EEF1F5'},
          isActive && {backgroundColor: option.bg, borderColor: option.color},
        ]}
        activeOpacity={0.7}
        onPress={() => onPress(option.key)}>
        <Icon
          name={option.icon}
          size={18}
          color={isActive ? option.color : colors.textMuted}
        />
        <Text
          style={[
            s.statusPillTxt,
            {color: isActive ? option.color : colors.textMuted},
            isActive && {fontFamily: fontFamily.bold},
          ]}>
          {tPill(option.labelKey)}
        </Text>
        {isActive && (
          <View style={[s.statusDot, {backgroundColor: option.color}]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════
// ─── Main Screen ─────────────────────────────────────
// ═══════════════════════════════════════════════════════
const EditProfileScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const user = useAuthStore(s => s.user);
  const locationStoreStatus = useLocationStore(s => s.driverStatus);
  const goOnline = useLocationStore(s => s.goOnline);
  const goOffline = useLocationStore(s => s.goOffline);
  const onBreak = useLocationStore(s => s.onBreak);

  // ─── Form State ────────────────────────────────────
  const [name, setName] = useState(user?.full_name || user?.name || '');
  const initialPhone = splitPhone(user?.phone || user?.mobile || '');
  const [countryCode, setCountryCode] = useState(initialPhone.code);
  const [phone, setPhone] = useState(initialPhone.number);
  const [email] = useState(user?.email || '');
  const [vehicleType, setVehicleType] = useState(user?.vehicle_type || '');
  const [vehiclePlate, setVehiclePlate] = useState(user?.vehicle_plate || user?.license_plate || '');
  const [vehicleModel, setVehicleModel] = useState(user?.vehicle_model || '');
  const [vehicleColor, setVehicleColor] = useState(user?.vehicle_color || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatar || user?.photo || null);
  const [driverStatus, setDriverStatus] = useState(locationStoreStatus || user?.status || 'offline');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);

  // Animation for status pill
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in header
    Animated.timing(headerOpacity, {toValue: 1, duration: 400, useNativeDriver: true}).start();
    // Pulse active status
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.03, duration: 800, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 800, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Fetch full driver profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setFetchingProfile(true);
      try {
        const res = await authApi.getProfile();
        const d = res.data?.data || res.data;
        if (d) {
          if (d.full_name) setName(d.full_name);
          if (d.phone || d.mobile) {
            const parsed = splitPhone(d.phone || d.mobile);
            setCountryCode(parsed.code);
            setPhone(parsed.number);
          }
          if (d.vehicle_type) setVehicleType(d.vehicle_type);
          if (d.vehicle_plate || d.license_plate) setVehiclePlate(d.vehicle_plate || d.license_plate);
          if (d.vehicle_model) setVehicleModel(d.vehicle_model);
          if (d.vehicle_color) setVehicleColor(d.vehicle_color);
          if (d.status) setDriverStatus(d.status);
          if (d.photo_url || d.avatar_url || d.avatar || d.photo)
            setAvatarUri(d.photo_url || d.avatar_url || d.avatar || d.photo);
        }
      } catch {
        // Fallback — use existing user data
      } finally {
        setFetchingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  // ─── Handlers ──────────────────────────────────────
  const handlePickAvatar = () => {
    Alert.alert(t('editProfile.updatePhoto'), t('editProfile.chooseOption'), [
      {
        text: t('editProfile.camera'),
        onPress: () =>
          launchCamera({mediaType: 'photo', quality: 0.7, maxWidth: 600, maxHeight: 600}, r => {
            if (!r.didCancel && !r.errorCode && r.assets?.[0]?.uri) setAvatarUri(r.assets[0].uri);
          }),
      },
      {
        text: t('editProfile.gallery'),
        onPress: () =>
          launchImageLibrary({mediaType: 'photo', quality: 0.7, maxWidth: 600, maxHeight: 600}, r => {
            if (!r.didCancel && !r.errorCode && r.assets?.[0]?.uri) setAvatarUri(r.assets[0].uri);
          }),
      },
      {text: t('common.cancel'), style: 'cancel'},
    ]);
  };

  const handleStatusChange = useCallback(async (newStatus) => {
    if (newStatus === driverStatus) return;
    const prev = driverStatus;
    setDriverStatus(newStatus);
    setStatusLoading(true);
    try {
      // Call the appropriate location store action
      if (newStatus === 'available') {
        await goOnline();
      } else if (newStatus === 'offline') {
        await goOffline();
      } else if (newStatus === 'on_break') {
        await onBreak();
      }
      // Also update authStore user object
      useAuthStore.setState({user: {...useAuthStore.getState().user, status: newStatus}});
      const opt = STATUS_OPTIONS.find(o => o.key === newStatus);
      showMessage({
        message: `${t('editProfile.nowStatus')} ${opt ? t(opt.labelKey) : newStatus}`,
        type: newStatus === 'available' ? 'success' : newStatus === 'on_break' ? 'warning' : 'info',
        icon: 'auto',
        duration: 2000,
      });
    } catch (e) {
      setDriverStatus(prev);
      showMessage({
        message: e?.response?.data?.message || t('editProfile.failedStatus'),
        description: t('editProfile.pleaseTryAgain'),
        type: 'danger',
        icon: 'auto',
      });
    } finally {
      setStatusLoading(false);
    }
  }, [driverStatus, goOnline, goOffline, onBreak, t]);

  const handleSave = async () => {
    if (!name.trim()) {
      showMessage({message: t('editProfile.enterName'), type: 'warning', icon: 'auto'});
      return;
    }
    setLoading(true);
    try {
      // Upload avatar if changed (local file URIs indicate a newly picked photo)
      let avatarUrl = user?.avatar || user?.photo || null;
      const isLocalFile = avatarUri && (avatarUri.startsWith('file://') || avatarUri.startsWith('/var') || avatarUri.startsWith('/private') || avatarUri.startsWith('content://'));
      if (isLocalFile) {
        const uploadRes = await uploadsApi.uploadAvatar(avatarUri);
        avatarUrl = uploadRes.data?.data?.url || uploadRes.data?.url || avatarUrl;
      }

      // Persist profile changes to server
      const fullPhone = `${countryCode.trim()}${phone.trim()}`;
      const profileData = {
        full_name: name.trim(),
        phone: fullPhone,
        vehicle_type: vehicleType.trim(),
        vehicle_plate: vehiclePlate.trim(),
        vehicle_model: vehicleModel.trim(),
        vehicle_color: vehicleColor.trim(),
      };

      await authApi.updateProfile(profileData);

      // Update local store
      useAuthStore.setState({
        user: {
          ...user,
          full_name: name.trim(),
          phone: fullPhone,
          avatar: avatarUrl,
          photo: avatarUrl,
          vehicle_type: vehicleType.trim(),
          vehicle_plate: vehiclePlate.trim(),
          vehicle_model: vehicleModel.trim(),
          vehicle_color: vehicleColor.trim(),
        },
      });

      showMessage({message: t('editProfile.profileUpdated'), type: 'success', icon: 'auto', duration: 2500});
      setTimeout(() => navigation.goBack(), 600);
    } catch (e) {
      showMessage({
        message: t('editProfile.updateFailed'),
        description: e?.response?.data?.message || t('editProfile.somethingWrong'),
        type: 'danger',
        icon: 'auto',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Active status option ─────────────────────────
  const activeStatus = STATUS_OPTIONS.find(o => o.key === driverStatus) || STATUS_OPTIONS[2];

  // ─── Render ────────────────────────────────────────
  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <Animated.View style={[s.hdr, {opacity: headerOpacity}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('editProfile.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={s.hdrSave}>{t('editProfile.save')}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[s.scroll, {paddingBottom: ins.bottom + 100}]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ─── Avatar & Name Hero ─────────────────── */}
        <View style={s.heroSection}>
          <View style={s.avatarWrap}>
            <View style={[s.avatarRing, {borderColor: activeStatus.color}]}>
              <View style={s.avatar}>
                {avatarUri ? (
                  <Image
                    source={{uri: avatarUri.startsWith('/') ? uploadsApi.getFileUrl(avatarUri) : avatarUri}}
                    style={s.avatarImg}
                  />
                ) : (
                  <Icon name="account" size={40} color={colors.primary} />
                )}
              </View>
            </View>
            <TouchableOpacity style={s.camBtn} onPress={handlePickAvatar} activeOpacity={0.8}>
              <Icon name="camera" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={s.heroName}>{name || t('editProfile.driverFallback')}</Text>
          <Text style={s.heroEmail}>{email}</Text>
          <View style={[s.heroBadge, {backgroundColor: activeStatus.bg}]}>
            <View style={[s.heroBadgeDot, {backgroundColor: activeStatus.color}]} />
            <Text style={[s.heroBadgeTxt, {color: activeStatus.color}]}>{t(activeStatus.labelKey)}</Text>
          </View>
        </View>

        {/* ─── Driver Status Card ─────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="signal-variant" title={t('editProfile.availabilityStatus')} subtitle={t('editProfile.setAvailability')} />
          <View style={s.statusRow}>
            {STATUS_OPTIONS.map((opt, idx) => (
              <StatusPill
                key={opt.key}
                option={opt}
                isActive={driverStatus === opt.key}
                onPress={handleStatusChange}
                animValue={pulseAnim}
                isFirst={idx === 0}
              />
            ))}
          </View>
          {statusLoading && (
            <View style={s.statusLoadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.statusLoadingTxt}>{t('editProfile.updatingStatus')}</Text>
            </View>
          )}
        </View>

        {/* ─── Personal Info Card ─────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="account-circle-outline" title={t('editProfile.personalInfo')} subtitle={t('editProfile.personalInfoSub')} />
          <Field label={t('editProfile.fullName')} icon="account-outline" value={name} onChangeText={setName} placeholder={t('editProfile.enterFullName')} />
          <PhoneField
            label={t('editProfile.phoneNumber')}
            icon="phone-outline"
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            phone={phone}
            onPhoneChange={setPhone}
            codeLabel={t('editProfile.countryCode')}
          />
          <Field label={t('editProfile.emailAddress')} icon="email-outline" value={email} placeholder="you@example.com" editable={false} />
        </View>

        {/* ─── Vehicle Info Card ──────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="truck-outline" title={t('editProfile.vehicleInfo')} subtitle={t('editProfile.vehicleInfoSub')} />
          <Field label={t('editProfile.vehicleType')} icon="car-outline" value={vehicleType} onChangeText={setVehicleType} placeholder={t('editProfile.vehicleTypePlaceholder')} />
          <Field label={t('editProfile.licensePlate')} icon="card-text-outline" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder={t('editProfile.licensePlatePlaceholder')} />
          <Field label={t('editProfile.vehicleModel')} icon="car-info" value={vehicleModel} onChangeText={setVehicleModel} placeholder={t('editProfile.vehicleModelPlaceholder')} />
          <Field label={t('editProfile.vehicleColor')} icon="palette-outline" value={vehicleColor} onChangeText={setVehicleColor} placeholder={t('editProfile.vehicleColorPlaceholder')} />
        </View>
      </ScrollView>

      {/* ─── Bottom Save Button ───────────────────── */}
      <View style={[s.bottom, {paddingBottom: ins.bottom + 10}]}>
        <TouchableOpacity
          style={[s.saveBtn, loading && {opacity: 0.6}]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View style={s.saveBtnInner}>
              <Icon name="content-save-outline" size={18} color="#FFF" style={{marginEnd: 8}} />
              <Text style={s.saveTxt}>{t('editProfile.saveChanges')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading overlay while fetching profile */}
      {fetchingProfile && (
        <View style={s.fetchOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// ─── Styles ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},

  // ─── Header ────────────────────────────────────────
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: {width: 0, height: 2}},
      android: {elevation: 2},
    }),
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 17, color: colors.textPrimary, textAlign: 'auto'},
  hdrSave: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.primary},
  scroll: {paddingHorizontal: 20},

  // ─── Hero Section (Avatar) ─────────────────────────
  heroSection: {alignItems: 'center', marginTop: 8, marginBottom: 20},
  avatarWrap: {position: 'relative', marginBottom: 12},
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {width: 88, height: 88, borderRadius: 44},
  camBtn: {
    position: 'absolute',
    bottom: 2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F5F7FA',
    ...Platform.select({
      ios: {shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: {width: 0, height: 2}},
      android: {elevation: 4},
    }),
  },
  heroName: {fontFamily: fontFamily.bold, fontSize: 20, color: colors.textPrimary, marginBottom: 2},
  heroEmail: {fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted, marginBottom: 10},
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeDot: {width: 7, height: 7, borderRadius: 4, marginEnd: 6},
  heroBadgeTxt: {fontFamily: fontFamily.semiBold, fontSize: 12},

  // ─── Cards ─────────────────────────────────────────
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: {width: 0, height: 4}},
      android: {elevation: 2},
    }),
  },
  sectionHdr: {flexDirection: 'row', alignItems: 'center', marginBottom: 18},
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary, textAlign: 'auto'},
  sectionSubtitle: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 1, textAlign: 'auto'},

  // ─── Status Pills ─────────────────────────────────
  statusRow: {flexDirection: 'row'},
  statusPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FAFBFC',
  },
  statusPillTxt: {fontFamily: fontFamily.semiBold, fontSize: 11, marginTop: 6, textAlign: 'auto'},
  statusDot: {width: 5, height: 5, borderRadius: 3, marginTop: 5},
  statusLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  statusLoadingTxt: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginStart: 8},

  // ─── Fields ────────────────────────────────────────
  fieldGroup: {marginBottom: 16},
  fieldLabel: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginStart: 2, textAlign: 'auto'},
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  fieldRowDisabled: {backgroundColor: '#F1F3F5', opacity: 0.7},
  fieldInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingEnd: 14,
    textAlign: 'auto',
    writingDirection: 'auto',
  },

  // ─── Phone Split Field ─────────────────────────────
  phoneRow: {
    flexDirection: 'row',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    width: 95,
  },
  codeInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    paddingEnd: 8,
    textAlign: 'auto',
    writingDirection: 'auto',
  },
  phoneBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingStart: 14,
    paddingEnd: 14,
    textAlign: 'auto',
    writingDirection: 'auto',
  },

  // ─── Bottom Bar ────────────────────────────────────
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
    ...Platform.select({
      ios: {shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: {width: 0, height: -4}},
      android: {elevation: 8},
    }),
  },
  saveBtn: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: {width: 0, height: 4}},
      android: {elevation: 4},
    }),
  },
  saveBtnInner: {flexDirection: 'row', alignItems: 'center'},
  saveTxt: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF', textAlign: 'auto'},

  // ─── Fetch Overlay ─────────────────────────────────
  fetchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,247,250,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EditProfileScreen;
