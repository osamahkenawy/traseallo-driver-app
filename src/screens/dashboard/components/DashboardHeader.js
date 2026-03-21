/**
 * DashboardHeader — Teal hero with day/date, driver info card overlay
 */

import React, {useMemo} from 'react';
import {View, StyleSheet, Text, TouchableOpacity, Image} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Bell, User, Clock} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';

const HEADER_BG = '#244066';

const DashboardHeader = ({
  greeting, driverName, vehicleType, photo, rating,
  unreadCount = 0, onNotificationPress, onProfilePress,
  driverStatus = 'offline', loginTime,
}) => {
  const ins = useSafeAreaInsets();

  const now = new Date();
  const hour = now.getHours();
  const greetingText =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateFmt =
    now.toLocaleDateString('en-US', {weekday: 'long'}) +
    ', ' +
    now.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});

  const statusLabel = (driverStatus || 'offline').replace(/_/g, ' ').toUpperCase();
  const statusColor =
    driverStatus === 'available' || driverStatus === 'busy'
      ? '#15C7AE'
      : driverStatus === 'on_break'
      ? '#F9AD28'
      : '#EB466D';

  const vehicleCode = vehicleType
    ? 'PO ' + vehicleType.slice(0, 5).toUpperCase()
    : null;

  const loginTimeFmt = useMemo(() => {
    if (loginTime) return loginTime;
    const h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }, [loginTime]);

  const elapsed = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  return (
    <View>
      {/* ═══ Teal header ═══ */}
      <View style={[$.headerBand, {paddingTop: ins.top + 12}]}>
        <View style={$.topRow}>
          <View>
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
              {photo ? (
                <Image source={{uri: photo}} style={$.avatar} />
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

          {/* Login time bar */}
          <View style={$.timeBar}>
            <View style={$.timeLeft}>
              <Clock size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={$.timeLabel}>Logged from {loginTimeFmt}</Text>
            </View>
            <Text style={$.elapsed}>{elapsed}</Text>
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
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 14,
  },
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
  driverInfo: {flex: 1, marginLeft: 12},
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
    gap: 5,
  },
  statusDot: {width: 7, height: 7, borderRadius: 3.5},
  statusTxt: {fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.5},

  // Time bar
  timeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '08',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timeLeft: {flexDirection: 'row', alignItems: 'center', gap: 6},
  timeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  elapsed: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.secondary,
  },
});

export default React.memo(DashboardHeader);
