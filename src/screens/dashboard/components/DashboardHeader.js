/**
 * DashboardHeader — Teal hero with day/date, driver info card overlay
 */

import React, {useMemo, useState} from 'react';
import {View, StyleSheet, Text, TouchableOpacity, Image} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Bell, User} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {useTranslation} from 'react-i18next';
import {uploadsApi} from '../../../api';

const HEADER_BG = '#244066';

const DashboardHeader = ({
  greeting, driverName, vehicleType, photo, rating,
  unreadCount = 0, onNotificationPress, onProfilePress,
  driverStatus = 'offline',
}) => {
  const ins = useSafeAreaInsets();
  const {t, i18n} = useTranslation();
  const [imgError, setImgError] = useState(false);

  const now = new Date();
  const hour = now.getHours();
  const greetingText =
    hour < 12 ? t('dashboard.goodMorning') : hour < 17 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening');
  const locale = i18n.language === 'ar' ? 'ar-AE' : 'en-US';
  const dateFmt =
    now.toLocaleDateString(locale, {weekday: 'long'}) +
    ', ' +
    now.toLocaleDateString(locale, {month: 'short', day: 'numeric', year: 'numeric'});

  const statusLabel = t('status.' + (driverStatus || 'offline')).toUpperCase();
  const statusColor =
    driverStatus === 'available'
      ? '#15C7AE'
      : driverStatus === 'busy' || driverStatus === 'on_break'
      ? '#F9AD28'
      : '#EB466D';

  const vehicleCode = vehicleType
    ? vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)
    : null;

  return (
    <View>
      {/* ═══ Teal header ═══ */}
      <View style={[$.headerBand, {paddingTop: ins.top + 12}]}>
        <View style={$.topRow}>
          <View style={{flex: 1}}>
            <Text style={$.dayName}>{greetingText}</Text>
            <Text style={$.dateText}>{dateFmt}</Text>
          </View>
          <TouchableOpacity style={$.bellBtn} onPress={onNotificationPress} activeOpacity={0.7}>
            <Bell size={20} color="#FFF" strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={$.bellBadge}>
                <Text style={$.bellBadgeTxt}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ Floating driver card ═══ */}
      <View style={$.cardWrap}>
        <View style={$.driverCard}>
          <View style={$.driverRow}>
            <TouchableOpacity onPress={onProfilePress} activeOpacity={0.8}>
              {photo && !imgError ? (
                <Image source={{uri: photo.startsWith('http') || photo.startsWith('file') ? photo : uploadsApi.getFileUrl(photo)}} style={$.avatar} onError={() => setImgError(true)} />
              ) : (
                <View style={[$.avatar, $.avatarPlaceholder]}>
                  <User size={26} color={colors.primary} strokeWidth={2} />
                </View>
              )}
            </TouchableOpacity>
            <View style={$.driverInfo}>
              <Text style={$.driverName} numberOfLines={1}>{driverName}</Text>
              {vehicleCode && <Text style={$.driverCode}>{vehicleCode}</Text>}
            </View>
            <View style={[$.statusPill, {backgroundColor: statusColor + '15'}]}>
              <View style={[$.statusDot, {backgroundColor: statusColor}]} />
              <Text style={[$.statusTxt, {color: statusColor}]}>{statusLabel}</Text>
            </View>
          </View>


        </View>
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  headerBand: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 28,
  },
  dateText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeTxt: {fontFamily: fontFamily.bold, fontSize: 9, color: '#FFF'},

  // Floating card
  cardWrap: {marginTop: -34, paddingHorizontal: 20},
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderStartWidth: 4,
    borderStartColor: colors.secondary,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  driverInfo: {flex: 1, marginStart: 14},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: colors.primary + '25',
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.primary,
    lineHeight: 22,
  },
  driverCode: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {width: 7, height: 7, borderRadius: 3.5, marginEnd: 6},
  statusTxt: {fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.5},
});

export default React.memo(DashboardHeader);
