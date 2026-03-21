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

const {width: SCREEN_W} = Dimensions.get('window');

// ─── Status Configuration ────────────────────────────
const STATUS_OPTIONS = [
  {key: 'available', label: 'Available', icon: 'check-circle', color: colors.success, bg: colors.successBg},
  {key: 'busy', label: 'Busy', icon: 'clock-outline', color: colors.warning, bg: colors.warningBg},
  {key: 'offline', label: 'Offline', icon: 'power-sleep', color: colors.danger, bg: colors.dangerBg},
];

// ─── Reusable Input Field ────────────────────────────
const Field = ({label, icon, value, onChangeText, placeholder, editable = true, keyboardType = 'default', multiline = false}) => (
  <View style={s.fieldGroup}>
    <Text style={s.fieldLabel}>{label}</Text>
    <View style={[s.fieldRow, !editable && s.fieldRowDisabled, multiline && {height: 80, alignItems: 'flex-start'}]}>
      <Icon name={icon} size={16} color={editable ? colors.primary : colors.textMuted} style={{marginLeft: 14, marginRight: 10, marginTop: multiline ? 14 : 0}} />
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
      {!editable && <Icon name="lock-outline" size={14} color={colors.textMuted} style={{marginRight: 14}} />}
    </View>
  </View>
);

// ─── Section Header ──────────────────────────────────
const SectionHeader = ({icon, title, subtitle}) => (
  <View style={s.sectionHdr}>
    <View style={s.sectionIconWrap}>
      <Icon name={icon} size={16} color={colors.primary} />
    </View>
    <View style={{flex: 1}}>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

// ─── Status Pill ─────────────────────────────────────
const StatusPill = ({option, isActive, onPress, animValue}) => {
  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });
  return (
    <Animated.View style={{transform: [{scale: isActive ? scale : 1}], flex: 1}}>
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
          {option.label}
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
  const user = useAuthStore(s => s.user);
  const locationStoreStatus = useLocationStore(s => s.driverStatus);
  const goOnline = useLocationStore(s => s.goOnline);
  const goOffline = useLocationStore(s => s.goOffline);
  const onBreak = useLocationStore(s => s.onBreak);

  // ─── Form State ────────────────────────────────────
  const [name, setName] = useState(user?.full_name || user?.name || '');
  const [phone, setPhone] = useState(user?.phone || user?.mobile || '');
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
          if (d.phone || d.mobile) setPhone(d.phone || d.mobile);
          if (d.vehicle_type) setVehicleType(d.vehicle_type);
          if (d.vehicle_plate || d.license_plate) setVehiclePlate(d.vehicle_plate || d.license_plate);
          if (d.vehicle_model) setVehicleModel(d.vehicle_model);
          if (d.vehicle_color) setVehicleColor(d.vehicle_color);
          if (d.status) setDriverStatus(d.status);
          if (d.avatar || d.photo) setAvatarUri(d.avatar || d.photo);
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
    Alert.alert('Update Photo', 'Choose an option', [
      {
        text: 'Camera',
        onPress: () =>
          launchCamera({mediaType: 'photo', quality: 0.7, maxWidth: 600, maxHeight: 600}, r => {
            if (!r.didCancel && !r.errorCode && r.assets?.[0]?.uri) setAvatarUri(r.assets[0].uri);
          }),
      },
      {
        text: 'Gallery',
        onPress: () =>
          launchImageLibrary({mediaType: 'photo', quality: 0.7, maxWidth: 600, maxHeight: 600}, r => {
            if (!r.didCancel && !r.errorCode && r.assets?.[0]?.uri) setAvatarUri(r.assets[0].uri);
          }),
      },
      {text: 'Cancel', style: 'cancel'},
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
      } else if (newStatus === 'busy' || newStatus === 'on_break') {
        await onBreak();
      }
      // Also update authStore user object
      useAuthStore.setState({user: {...useAuthStore.getState().user, status: newStatus}});
      const opt = STATUS_OPTIONS.find(o => o.key === newStatus);
      showMessage({
        message: `You're now ${opt?.label || newStatus}`,
        type: newStatus === 'available' ? 'success' : newStatus === 'busy' ? 'warning' : 'info',
        icon: 'auto',
        duration: 2000,
      });
    } catch (e) {
      setDriverStatus(prev);
      showMessage({
        message: 'Failed to update status',
        description: e?.response?.data?.message || 'Please try again.',
        type: 'danger',
        icon: 'auto',
      });
    } finally {
      setStatusLoading(false);
    }
  }, [driverStatus, goOnline, goOffline, onBreak]);

  const handleSave = async () => {
    if (!name.trim()) {
      showMessage({message: 'Please enter your name', type: 'warning', icon: 'auto'});
      return;
    }
    setLoading(true);
    try {
      // Upload avatar if changed
      let avatarUrl = user?.avatar || user?.photo || null;
      if (avatarUri && avatarUri !== avatarUrl) {
        const uploadRes = await uploadsApi.uploadAvatar(avatarUri);
        avatarUrl = uploadRes.data?.data?.url || uploadRes.data?.url || avatarUrl;
      }

      // Persist profile changes to server
      const profileData = {
        full_name: name.trim(),
        phone: phone.trim(),
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
          phone: phone.trim(),
          avatar: avatarUrl,
          vehicle_type: vehicleType.trim(),
          vehicle_plate: vehiclePlate.trim(),
          vehicle_model: vehicleModel.trim(),
          vehicle_color: vehicleColor.trim(),
        },
      });

      showMessage({message: 'Profile updated successfully!', type: 'success', icon: 'auto', duration: 2500});
      setTimeout(() => navigation.goBack(), 600);
    } catch (e) {
      showMessage({
        message: 'Update Failed',
        description: e?.response?.data?.message || 'Something went wrong.',
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
        <Text style={s.hdrTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={s.hdrSave}>Save</Text>
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
                  <Image source={{uri: avatarUri}} style={s.avatarImg} />
                ) : (
                  <Icon name="account" size={40} color={colors.primary} />
                )}
              </View>
            </View>
            <TouchableOpacity style={s.camBtn} onPress={handlePickAvatar} activeOpacity={0.8}>
              <Icon name="camera" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={s.heroName}>{name || 'Driver'}</Text>
          <Text style={s.heroEmail}>{email}</Text>
          <View style={[s.heroBadge, {backgroundColor: activeStatus.bg}]}>
            <View style={[s.heroBadgeDot, {backgroundColor: activeStatus.color}]} />
            <Text style={[s.heroBadgeTxt, {color: activeStatus.color}]}>{activeStatus.label}</Text>
          </View>
        </View>

        {/* ─── Driver Status Card ─────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="signal-variant" title="Availability Status" subtitle="Set your availability for new orders" />
          <View style={s.statusRow}>
            {STATUS_OPTIONS.map(opt => (
              <StatusPill
                key={opt.key}
                option={opt}
                isActive={driverStatus === opt.key}
                onPress={handleStatusChange}
                animValue={pulseAnim}
              />
            ))}
          </View>
          {statusLoading && (
            <View style={s.statusLoadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.statusLoadingTxt}>Updating status...</Text>
            </View>
          )}
        </View>

        {/* ─── Personal Info Card ─────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="account-circle-outline" title="Personal Information" subtitle="Your basic contact details" />
          <Field label="Full Name" icon="account-outline" value={name} onChangeText={setName} placeholder="Enter your full name" />
          <Field label="Phone Number" icon="phone-outline" value={phone} onChangeText={setPhone} placeholder="+971 XX XXX XXXX" keyboardType="phone-pad" />
          <Field label="Email Address" icon="email-outline" value={email} placeholder="you@example.com" editable={false} />
        </View>

        {/* ─── Vehicle Info Card ──────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="truck-outline" title="Vehicle Information" subtitle="Keep your vehicle details up to date" />
          <Field label="Vehicle Type" icon="car-outline" value={vehicleType} onChangeText={setVehicleType} placeholder="e.g. Van, Motorcycle, Truck" />
          <Field label="License Plate" icon="card-text-outline" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="e.g. ABC 12345" />
          <Field label="Vehicle Model" icon="car-info" value={vehicleModel} onChangeText={setVehicleModel} placeholder="e.g. Toyota Hiace 2024" />
          <Field label="Vehicle Color" icon="palette-outline" value={vehicleColor} onChangeText={setVehicleColor} placeholder="e.g. White" />
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
              <Icon name="content-save-outline" size={18} color="#FFF" style={{marginRight: 8}} />
              <Text style={s.saveTxt}>Save Changes</Text>
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
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 17, color: colors.textPrimary},
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
  heroBadgeDot: {width: 7, height: 7, borderRadius: 4, marginRight: 6},
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
    marginRight: 12,
  },
  sectionTitle: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.textPrimary},
  sectionSubtitle: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 1},

  // ─── Status Pills ─────────────────────────────────
  statusRow: {flexDirection: 'row', gap: 8},
  statusPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#FAFBFC',
  },
  statusPillTxt: {fontFamily: fontFamily.semiBold, fontSize: 11, marginTop: 6},
  statusDot: {width: 5, height: 5, borderRadius: 3, marginTop: 5},
  statusLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  statusLoadingTxt: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginLeft: 8},

  // ─── Fields ────────────────────────────────────────
  fieldGroup: {marginBottom: 16},
  fieldLabel: {fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginLeft: 2},
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
    paddingRight: 14,
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
  saveTxt: {fontFamily: fontFamily.bold, fontSize: 15, color: '#FFF'},

  // ─── Fetch Overlay ─────────────────────────────────
  fetchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,247,250,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EditProfileScreen;
