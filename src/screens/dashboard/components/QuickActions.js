/**
 * QuickActions — Focused 4-icon grid with an expandable "More" row
 * Primary: Orders, Scanner, Map, Earnings
 * Secondary (toggleable): Pickups, Alerts, Settings, Support
 */

import React, {useState} from 'react';
import {View, StyleSheet, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIMARY_ACTIONS = [
  {icon: 'package-variant-closed', labelKey: 'dashboard.ordersLabel', color: '#244066', bg: '#E8EDF4', route: 'MyOrders'},
  {icon: 'barcode-scan', labelKey: 'dashboard.scannerLabel', color: '#10A6BA', bg: '#E0F5F7', route: 'Scanner'},
  {icon: 'map-marker-radius', labelKey: 'dashboard.mapLabel', color: '#15C7AE', bg: '#E0F8F3', route: 'MapScreen'},
  {icon: 'wallet-outline', labelKey: 'dashboard.earningsLabel', color: '#F9AD28', bg: '#FFF4E0', route: 'Earnings'},
];

const SECONDARY_ACTIONS = [
  {icon: 'truck-delivery', labelKey: 'dashboard.pickupsLabel', color: '#4E7AB5', bg: '#E3EEF9', route: 'MyPickups'},
  {icon: 'bell-ring-outline', labelKey: 'dashboard.alertsLabel', color: '#EB466D', bg: '#FDE8EE', route: 'Notifications'},
  {icon: 'cog-outline', labelKey: 'dashboard.settingsLabel', color: '#495057', bg: '#EAEBEC', route: 'Settings'},
  {icon: 'headset', labelKey: 'dashboard.supportLabel', color: '#9261C6', bg: '#EDE7F6', route: 'Support'},
];

const QuickActions = ({onNavigate}) => {
  const [expanded, setExpanded] = useState(false);
  const {t} = useTranslation();

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={$.root}>
      <View style={$.card}>
        {/* Primary row */}
        <View style={$.row}>
          {PRIMARY_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.route}
              style={$.item}
              activeOpacity={0.55}
              onPress={() => onNavigate?.(a.route)}>
              <View style={[$.iconWrap, {backgroundColor: a.bg}]}>
                <Icon name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={$.label}>{t(a.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>

        {/* Secondary row (expanded) */}
        {expanded && (
          <View style={$.row}>
            {SECONDARY_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.route}
                style={$.item}
                activeOpacity={0.55}
                onPress={() => onNavigate?.(a.route)}>
                <View style={[$.iconWrap, {backgroundColor: a.bg}]}>
                  <Icon name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={$.label}>{t(a.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Toggle */}
        <TouchableOpacity
          style={$.toggleBtn}
          onPress={toggleExpand}
          activeOpacity={0.6}>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
          <Text style={$.toggleTxt}>{expanded ? t('dashboard.less') : t('dashboard.more')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  root: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingTop: 22,
    paddingBottom: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  item: {
    alignItems: 'center',
    width: 74,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  toggleTxt: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 5,
  },
});

export default React.memo(QuickActions);
