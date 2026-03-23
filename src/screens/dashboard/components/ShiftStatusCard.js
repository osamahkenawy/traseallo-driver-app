/**
 * ShiftStatusCard — Bold hero status card
 * Dark themed with vivid accent colors per state.
 */

import React, {useState} from 'react';
import {View, StyleSheet, Text, TouchableOpacity, ActivityIndicator} from 'react-native';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';
import {useTranslation} from 'react-i18next';

const STATUS_CONFIG = {
  offline: {
    icon: 'power-standby',
    title: "You're Offline",
    subtitle: 'Go online to start receiving orders',
    btnLabel: 'Go Online',
    btnIcon: 'power',
    btnColor: '#15C7AE',
    cardBg: '#374151',
    accentColor: '#EB466D',
    pillLabel: 'OFFLINE',
    decoColor: 'rgba(235,70,109,0.15)',
  },
  available: {
    icon: 'signal-variant',
    title: "You're Online",
    subtitle: 'Waiting for new orders',
    btnLabel: 'Take a Break',
    btnIcon: 'coffee-outline',
    btnColor: '#F9AD28',
    cardBg: '#0D4F47',
    accentColor: '#15C7AE',
    pillLabel: 'AVAILABLE',
    decoColor: 'rgba(21,199,174,0.12)',
  },
  busy: {
    icon: 'truck-fast-outline',
    title: 'On Delivery',
    subtitle: 'Active orders in progress',
    btnLabel: 'Continue Route',
    btnIcon: 'navigation-variant-outline',
    btnColor: '#FFF',
    btnTxtColor: colors.primary,
    cardBg: '#1A3352',
    accentColor: '#F9AD28',
    pillLabel: 'BUSY',
    decoColor: 'rgba(249,173,40,0.12)',
  },
  on_break: {
    icon: 'coffee-outline',
    title: 'On Break',
    subtitle: 'New assignments paused',
    btnLabel: 'Resume Work',
    btnIcon: 'play-circle-outline',
    btnColor: '#15C7AE',
    cardBg: '#2D2548',
    accentColor: '#9261C6',
    pillLabel: 'ON BREAK',
    decoColor: 'rgba(146,97,198,0.15)',
  },
};

const ShiftStatusCard = ({
  status = 'offline',
  activeCount = 0,
  deliveredCount = 0,
  pickupCount = 0,
  onGoOnline,
  onGoOffline,
  onBreak,
  onContinueRoute,
}) => {
  const [isActing, setIsActing] = useState(false);
  const {t} = useTranslation();
  const STATUS_CONFIG_T = {
    offline: {...STATUS_CONFIG.offline, title: t('dashboard.offlineTitle'), subtitle: t('dashboard.offlineMsg'), btnLabel: t('dashboard.goOnline')},
    available: {...STATUS_CONFIG.available, title: t('dashboard.onlineTitle'), subtitle: t('dashboard.waitingOrders'), btnLabel: t('dashboard.takeBreak')},
    busy: {...STATUS_CONFIG.busy, title: t('dashboard.onDelivery'), subtitle: t('dashboard.activeInProgress'), btnLabel: t('dashboard.continueRoute')},
    on_break: {...STATUS_CONFIG.on_break, title: t('dashboard.onBreak'), subtitle: t('dashboard.assignmentsPaused'), btnLabel: t('dashboard.resumeWork')},
  };
  const cfg = STATUS_CONFIG_T[status] || STATUS_CONFIG_T.offline;

  const subtitle =
    status === 'busy'
      ? t('dashboard.activeOrderCount', {count: activeCount})
      : cfg.subtitle;

  const handlePress = async () => {
    setIsActing(true);
    try {
      if (status === 'offline') await onGoOnline?.();
      else if (status === 'available') await onBreak?.();
      else if (status === 'busy') onContinueRoute?.();
      else if (status === 'on_break') await onGoOnline?.();
    } catch (e) {
      if (__DEV__) console.warn('Shift action error:', e.message);
    } finally {
      setIsActing(false);
    }
  };

  const showSecondary = status === 'available' || status === 'on_break';
  const btnTxtColor = cfg.btnTxtColor || '#FFF';

  return (
    <View style={[$.card, {backgroundColor: cfg.cardBg}]}>
      {/* Decorative circles */}
      <View style={[$.deco1, {backgroundColor: cfg.decoColor}]} />
      <View style={[$.deco2, {backgroundColor: cfg.decoColor}]} />

      <View style={$.body}>
        {/* Top row: icon + pill */}
        <View style={$.topRow}>
          <View style={[$.iconWrap, {backgroundColor: cfg.accentColor + '25'}]}>
            <Icon name={cfg.icon} size={24} color={cfg.accentColor} />
          </View>
          <View style={[$.pill, {backgroundColor: cfg.accentColor + '20'}]}>
            <View style={[$.pillDot, {backgroundColor: cfg.accentColor}]} />
            <Text style={[$.pillTxt, {color: cfg.accentColor}]}>{t('status.' + status, cfg.pillLabel).toUpperCase()}</Text>
          </View>
        </View>

        {/* Title + subtitle */}
        <Text style={$.title}>{cfg.title}</Text>
        <Text style={$.subtitle}>{subtitle}</Text>

        {/* Quick stats row */}
        {(status === 'busy' || status === 'available') && (
          <View style={$.statsRow}>
            <View style={$.statItem}>
              <Text style={$.statVal}>{activeCount}</Text>
              <Text style={$.statLbl}>{t('dashboard.statActive')}</Text>
            </View>
            <View style={$.statDivider} />
            <View style={$.statItem}>
              <Text style={$.statVal}>{deliveredCount}</Text>
              <Text style={$.statLbl}>{t('dashboard.statDelivered')}</Text>
            </View>
            <View style={$.statDivider} />
            <View style={$.statItem}>
              <Text style={$.statVal}>{pickupCount}</Text>
              <Text style={$.statLbl}>{t('dashboard.statPickups')}</Text>
            </View>
          </View>
        )}

        {/* CTA buttons */}
        <View style={$.btnRow}>
          <TouchableOpacity
            style={[$.btn, {backgroundColor: cfg.btnColor}]}
            onPress={handlePress}
            activeOpacity={0.75}
            disabled={isActing}>
            {isActing ? (
              <ActivityIndicator size="small" color={btnTxtColor} />
            ) : (
              <>
                <Icon name={cfg.btnIcon} size={18} color={btnTxtColor} />
                <Text style={[$.btnTxt, {color: btnTxtColor}]}>{cfg.btnLabel}</Text>
              </>
            )}
          </TouchableOpacity>

          {showSecondary && (
            <TouchableOpacity
              style={$.btnSecondary}
              onPress={onGoOffline}
              activeOpacity={0.7}>
              <Icon name="power-standby" size={16} color="#EB466D" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: -14,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  deco1: {
    position: 'absolute',
    top: -20,
    end: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  deco2: {
    position: 'absolute',
    bottom: -30,
    start: -15,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  body: {padding: 22},
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  pillDot: {width: 7, height: 7, borderRadius: 3.5},
  pillTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 20,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  statItem: {flex: 1, alignItems: 'center'},
  statVal: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: '#FFFFFF',
  },
  statLbl: {
    fontFamily: fontFamily.medium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  btnTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
  },
  btnSecondary: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(235,70,109,0.3)',
    backgroundColor: 'rgba(235,70,109,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(ShiftStatusCard);
