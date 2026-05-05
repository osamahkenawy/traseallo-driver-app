/**
 * DriverSummaryCard — top white pill with avatar, name/vehicle, status badge.
 * Props: { name, photo, vehicle, status, onPress }
 */
import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {User, ChevronRight} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {D} from './dashboardTheme';
import {API_BASE_URL} from '../../../config';

// Resolve a possibly-relative image path against the API host (origin only).
const resolvePhoto = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  try {
    const origin = API_BASE_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    return `${origin}/${trimmed.replace(/^\/+/, '')}`;
  } catch {
    return null;
  }
};

const statusMeta = (status, t) => {
  const s = (status || 'offline').toLowerCase();
  if (s === 'online' || s === 'available') {
    return {label: t('dashboard.online', 'Online'), color: D.green, soft: D.greenSoft};
  }
  if (s === 'busy' || s === 'on_delivery') {
    return {label: t('dashboard.busy', 'Busy'), color: D.orange, soft: D.orangeSoft};
  }
  return {label: t('dashboard.offline', 'Offline'), color: D.textMuted, soft: '#EEF0F4'};
};

const DriverSummaryCard = ({name, photo, vehicle, status, onPress}) => {
  const {t} = useTranslation();
  const meta = statusMeta(status, t);
  const displayName = name || t('dashboard.driver', 'Driver');
  const displayVehicle = vehicle || t('dashboard.vehicle', 'Vehicle');
  const [imgFailed, setImgFailed] = React.useState(false);
  const photoUri = React.useMemo(() => resolvePhoto(photo), [photo]);
  const showImage = !!photoUri && !imgFailed;

  return (
    <Animated.View entering={FadeInDown.duration(380).springify().damping(16)}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={s.card}>
        <View style={s.avatarWrap}>
          {showImage ? (
            <Image
              source={{uri: photoUri}}
              style={s.avatar}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <User size={22} color={D.primary} strokeWidth={2.2} />
            </View>
          )}
        </View>

        <View style={s.info}>
          <Text style={s.greet} numberOfLines={1}>
            {t('dashboard.welcome', 'Welcome back')}
          </Text>
          <Text style={s.name} numberOfLines={1}>{displayName}</Text>
          <Text style={s.sub} numberOfLines={1}>{displayVehicle}</Text>
        </View>

        <View style={[s.badge, {backgroundColor: meta.soft}]}>
          <View style={[s.dot, {backgroundColor: meta.color}]} />
          <Text style={[s.badgeTxt, {color: meta.color}]}>{meta.label}</Text>
        </View>

        <ChevronRight size={18} color={D.textLight} strokeWidth={2} style={{marginLeft: 6}} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.surface,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 3,
  },
  avatarWrap: {marginRight: 12},
  avatar: {width: 46, height: 46, borderRadius: 23, backgroundColor: D.primarySoft},
  avatarFallback: {alignItems: 'center', justifyContent: 'center'},
  info: {flex: 1, minWidth: 0},
  greet: {fontSize: 11, color: D.textLight, marginBottom: 2},
  name: {fontSize: 15, fontWeight: '700', color: D.text},
  sub: {fontSize: 12, color: D.textMuted, marginTop: 1},
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: {width: 6, height: 6, borderRadius: 3, marginRight: 6},
  badgeTxt: {fontSize: 11, fontWeight: '700'},
});

export default React.memo(DriverSummaryCard);
