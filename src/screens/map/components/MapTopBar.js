/**
 * MapTopBar — Status chip, order count, progress bar
 */
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/fonts';

const STATUS_META = {
  available: {icon: 'wifi', color: colors.success, label: 'Online', bg: colors.successBg},
  busy: {icon: 'truck-fast-outline', color: colors.warning, label: 'Busy', bg: colors.warningBg},
  on_break: {icon: 'coffee-outline', color: colors.orange, label: 'Break', bg: 'rgba(216, 141, 13, 0.12)'},
  offline: {icon: 'wifi-off', color: colors.textMuted, label: 'Offline', bg: colors.bgMuted},
};

const MapTopBar = ({
  driverStatus,
  onStatusPress,
  activeCount,
  completedCount,
  totalCount,
  t,
}) => {
  const ins = useSafeAreaInsets();
  const meta = STATUS_META[driverStatus] || STATUS_META.offline;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={[$.root, {top: ins.top + 8}]}>
      {/* Status chip */}
      <TouchableOpacity
        style={[$.statusChip, {backgroundColor: meta.bg}]}
        onPress={onStatusPress}
        activeOpacity={0.7}>
        <View style={[$.statusDot, {backgroundColor: meta.color}]} />
        <Text style={[$.statusText, {color: meta.color}]}>
          {t ? t(`status.${driverStatus}`) : meta.label}
        </Text>
        <Icon name="chevron-down" size={12} color={meta.color} />
      </TouchableOpacity>

      {/* Right side: Progress chip */}
      <View style={$.rightGroup}>
        {/* Active deliveries */}
        <View style={$.countChip}>
          <Icon name="package-variant" size={13} color={colors.primary} />
          <Text style={$.countText}>{activeCount}</Text>
        </View>

        {/* Mini progress */}
        {totalCount > 0 && (
          <View style={$.progressChip}>
            <View style={$.progressBarBg}>
              <View style={[$.progressBarFill, {width: `${Math.min(pct, 100)}%`}]} />
            </View>
            <Text style={$.progressText}>{pct}%</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  countText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  progressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  progressBarBg: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  progressText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.success,
  },
});

export default React.memo(MapTopBar);
