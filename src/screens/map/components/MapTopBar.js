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
  available: {icon: 'wifi', color: colors.success, label: 'Online'},
  busy: {icon: 'truck-fast-outline', color: colors.warning, label: 'Busy'},
  on_break: {icon: 'coffee-outline', color: '#D88D0D', label: 'Break'},
  offline: {icon: 'wifi-off', color: colors.textMuted, label: 'Offline'},
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
        style={$.statusChip}
        onPress={onStatusPress}
        activeOpacity={0.7}>
        <View style={[$.statusDot, {backgroundColor: meta.color}]} />
        <Text style={$.statusLabel}>
          {t ? t(`status.${driverStatus}`) : meta.label}
        </Text>
        <Icon name="chevron-down" size={12} color={colors.textSecondary} />
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
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 7,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
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
    gap: 6,
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
