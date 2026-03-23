/**
 * TodayStatsRow — Clean single-row horizontal KPI strip
 */

import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';

const STAT_ITEMS = [
  {key: 'active', icon: 'package-variant', color: '#F9AD28', labelKey: 'dashboard.activeStat'},
  {key: 'delivered', icon: 'check-decagram', color: '#15C7AE', labelKey: 'dashboard.deliveredStat'},
  {key: 'pickups', icon: 'truck-delivery', color: '#4E7AB5', labelKey: 'dashboard.pickupsStat'},
  {key: 'remaining', icon: 'map-marker-path', color: '#EB466D', labelKey: 'dashboard.remainingStat'},
];

const TodayStatsRow = ({
  active = 0,
  delivered = 0,
  pickups = 0,
  remaining = 0,
}) => {
  const values = {active, delivered, pickups, remaining};
  const {t} = useTranslation();

  return (
    <View style={$.root}>
      <View style={$.card}>
        {STAT_ITEMS.map((item, idx) => (
          <React.Fragment key={item.key}>
            <View style={$.item}>
              <View style={[$.iconDot, {backgroundColor: item.color + '18'}]}>
                <Icon name={item.icon} size={16} color={item.color} />
              </View>
              <Text style={$.val}>{values[item.key]}</Text>
              <Text style={$.label}>{t(item.labelKey)}</Text>
            </View>
            {idx < STAT_ITEMS.length - 1 && <View style={$.divider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  root: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  iconDot: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  val: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#ECEEF2',
  },
});

export default React.memo(TodayStatsRow);
