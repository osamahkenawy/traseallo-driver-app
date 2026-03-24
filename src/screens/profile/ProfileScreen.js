/**
 * Profile Screen — Clean flat-bordered driver profile
 * Fetches real driver data from API
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useAuth from '../../hooks/useAuth';
import {authApi, uploadsApi} from '../../api';
import images from '../../theme/assets';
import {version as appVersion} from '../../../package.json';
import {useTranslation} from 'react-i18next';

const MenuItem = ({icon, iconColor, label, sub, onPress, danger}) => {
  const c = danger ? colors.danger : iconColor || colors.primary;
  return (
    <TouchableOpacity style={s.mi} onPress={onPress} activeOpacity={0.55}>
      <View style={[s.miIc, {backgroundColor: c + '0D'}]}>
        <Icon name={icon} size={17} color={c} />
      </View>
      <View style={{flex: 1}}>
        <Text style={[s.miLabel, danger && {color: colors.danger}]}>{label}</Text>
        {sub ? <Text style={s.miSub}>{sub}</Text> : null}
      </View>
      <Icon name="chevron-right" size={16} color={danger ? colors.danger + '60' : '#C5CAD1'} />
    </TouchableOpacity>
  );
};

const ProfileScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {t} = useTranslation();
  const {user, displayName, logout} = useAuth();
  const [driverProfile, setDriverProfile] = useState(null);

  useEffect(() => {
    authApi.getProfile().then(res => {
      const data = res.data?.data || res.data;
      setDriverProfile(data);
    }).catch(() => {});
  }, []);

  const profile = driverProfile || user;
  const photoUrl = profile?.photo_url || profile?.avatar_url || profile?.photo || profile?.avatar;
  const avatarSource = photoUrl
    ? {uri: photoUrl.startsWith('http') ? photoUrl : uploadsApi.getFileUrl(photoUrl)}
    : images.avatarPlaceholder;

  const driverStatus = profile?.status || 'offline';
  const statusDotColor = driverStatus === 'available' ? colors.success
    : driverStatus === 'busy' || driverStatus === 'on_break' ? colors.warning
    : colors.textMuted;

  const handleSupport = () => {
    navigation.navigate(routeNames.Support);
  };

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.hdr}>
          <Text style={s.title}>{t('profile.title')}</Text>
        </View>

        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.avatarRow}>
            <View style={s.avatarWrap}>
              <Image source={avatarSource} style={s.avatar} resizeMode="cover" />
              <View style={[s.onlineDot, {backgroundColor: statusDotColor}]} />
            </View>
            <View style={{flex: 1}}>
              <Text style={s.name}>{profile?.full_name || displayName}</Text>
              <View style={s.rolePill}>
                <Icon name="steering" size={11} color={colors.primary} />
                <Text style={s.roleText}>{t('profile.role')}</Text>
              </View>
              {(profile?.email || user?.email) ? <Text style={s.email}>{profile?.email || user?.email}</Text> : null}
            </View>
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => navigation.navigate(routeNames.EditProfile)}
              activeOpacity={0.6}>
              <Icon name="pencil-outline" size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Driver stats */}
          {driverProfile && (
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statVal}>{driverProfile.stats?.delivered || driverProfile.stats?.total_orders || 0}</Text>
                <Text style={s.statLabel}>{t('profile.delivered')}</Text>
              </View>
              <View style={s.statDiv} />
              <View style={s.statItem}>
                <Text style={s.statVal}>{driverProfile.rating || '—'}</Text>
                <Text style={s.statLabel}>{t('profile.rating')}</Text>
              </View>
              <View style={s.statDiv} />
              <View style={s.statItem}>
                <Text style={s.statVal}>{driverProfile.vehicle_type || '—'}</Text>
                <Text style={s.statLabel}>{t('profile.vehicle')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Account section */}
        <Text style={s.secLabel}>{t('settings.account')}</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="wallet-outline"
            iconColor={colors.orange}
            label={t('profile.earnings')}
            sub={t('profile.viewEarnings')}
            onPress={() => navigation.navigate(routeNames.Earnings)}
          />
          <View style={s.div} />
          <MenuItem
            icon="star-outline"
            iconColor={colors.warning}
            label={t('profile.ratings')}
            sub={t('profile.customerReviews')}
            onPress={() => navigation.navigate(routeNames.Ratings)}
          />
        </View>

        {/* Preferences section */}
        <Text style={s.secLabel}>{t('settings.preferences')}</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="cog-outline"
            iconColor={colors.textSecondary}
            label={t('settings.title')}
            sub={t('profile.languageNotifications')}
            onPress={() => navigation.navigate(routeNames.Settings)}
          />
          <View style={s.div} />
          <MenuItem
            icon="headset"
            iconColor={colors.info}
            label={t('profile.support')}
            sub={t('profile.helpFeedback')}
            onPress={handleSupport}
          />
        </View>

        {/* Logout */}
        <View style={[s.menuCard, {marginTop: 14}]}>
          <MenuItem icon="logout" label={t('profile.logout')} onPress={logout} danger />
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  scroll: {paddingHorizontal: 20, paddingBottom: 40},
  hdr: {paddingVertical: 14},
  title: {fontFamily: fontFamily.bold, fontSize: 18, color: colors.textPrimary, textAlign: 'auto'},

  /* Profile card */
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    marginBottom: 22,
  },
  avatarRow: {flexDirection: 'row', alignItems: 'center', gap: 14},
  avatarWrap: {position: 'relative'},
  avatar: {width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.primary + '20'},
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
  },
  statItem: {flex: 1, alignItems: 'center'},
  statVal: {fontFamily: fontFamily.bold, fontSize: 15, color: colors.textPrimary},
  statLabel: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize'},
  statDiv: {width: 1, height: 24, backgroundColor: '#EEF1F5'},
  name: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary},
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '0D',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
  },
  roleText: {fontFamily: fontFamily.semiBold, fontSize: 10, color: colors.primary},
  email: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 3},
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary + '0D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Section */
  secLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.textLight,
    letterSpacing: 1.2,
    textAlign: 'auto',
    marginBottom: 8,
    marginStart: 2,
  },

  /* Menu card */
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    overflow: 'hidden',
    marginBottom: 8,
  },
  mi: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  miIc: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miLabel: {fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.textPrimary},
  miSub: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 1},
  div: {height: 1, backgroundColor: '#EEF1F5', marginStart: 58},

  version: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ProfileScreen;
