/**
 * DriverSummaryCard — Premium floating driver status card
 * Overlaps the header for depth. Shows avatar, name, vehicle, live status indicator.
 */

import React, {useState} from 'react';
import {View, Text, TouchableOpacity, Image, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {User, Truck, MapPin, Coffee, WifiOff, ChevronRight} from 'lucide-react-native';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {shadows} from '../../../theme/shadows';
import {borderRadius} from '../../../theme/borderRadius';
import {spacing} from '../../../theme/spacing';
import {uploadsApi} from '../../../api';
import {useTranslation} from 'react-i18next';

const STATUS_CONFIG = {
  available: {label: 'status.online', color: colors.success, icon: MapPin},
  busy: {label: 'dashboard.onDelivery', color: colors.info, icon: Truck},
  on_delivery: {label: 'dashboard.onDelivery', color: colors.info, icon: Truck},
  on_break: {label: 'dashboard.onBreak', color: colors.orange, icon: Coffee},
  offline: {label: 'status.offline', color: colors.textMuted, icon: WifiOff},
};

const DriverSummaryCard = ({
  name,
  photo,
  vehicle,
  status = 'offline',
  onPress,
}) => {
  const {t} = useTranslation();
  const [imgError, setImgError] = useState(false);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const StatusIcon = cfg.icon;
  const vehicleLabel = vehicle ? vehicle.charAt(0).toUpperCase() + vehicle.slice(1) : null;

  return (
    <Animated.View entering={FadeInDown.springify().damping(18).stiffness(130).delay(80)}>
      <TouchableOpacity
        style={$.card}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}>
        <View style={$.content}>
          {/* Avatar with status ring */}
          <View style={$.avatarWrap}>
            {photo && !imgError ? (
              <Image
                source={{uri: photo.startsWith('http') || photo.startsWith('file') ? photo : uploadsApi.getFileUrl(photo)}}
                style={$.avatar}
                onError={() => setImgError(true)}
              />
            ) : (
              <View style={[$.avatar, $.avatarPlaceholder]}>
                <User size={18} color={colors.primary} strokeWidth={2} />
              </View>
            )}
            {/* Live status dot */}
            <View style={[$.statusDot, {backgroundColor: cfg.color}]} />
          </View>

          {/* Info */}
          <View style={$.info}>
            <Text style={$.name} numberOfLines={1}>{name}</Text>
            {vehicleLabel && (
              <Text style={$.vehicle} numberOfLines={1}>
                {vehicleLabel}
              </Text>
            )}
          </View>

          {/* Status pill */}
          <View style={[$.statusPill, {backgroundColor: cfg.color + '14'}]}>
            <StatusIcon size={12} color={cfg.color} strokeWidth={2.5} style={{marginRight: 10}} />
            <Text style={[$.statusText, {color: cfg.color}]}>
              {t(cfg.label).toUpperCase()}
            </Text>
          </View>

          <ChevronRight size={14} color={colors.textLight} strokeWidth={2} style={{marginLeft: 4}} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const $ = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: -24,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.card,
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.primary + '18',
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary + '0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  info: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  name: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  vehicle: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
  },
  statusText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.4,
  },
});

export default React.memo(DriverSummaryCard);
