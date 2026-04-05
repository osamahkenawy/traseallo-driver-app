/**
 * RouteProgressCard — Visual progress bar + completion stats
 * Shows: completion %, orders delivered/total, stops completed/total, remaining
 */

import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';

const RouteProgressCard = ({
  completionPct = 0,
  delivered = 0,
  totalOrders = 0,
  completedStops = 0,
  totalStops = 0,
  remaining = 0,
}) => {
  const {t} = useTranslation();
  const pct = Math.min(Math.max(completionPct, 0), 100);
  const hasData = totalOrders > 0 || totalStops > 0;

  if (!hasData) {
    return (
      <View style={$.root}>
        <Text style={$.sectionTitle}>{t('dashboard.routeProgress')}</Text>
        <View style={$.emptyCard}>
          <Icon name="map-marker-path" size={24} color={colors.textLight} />
          <Text style={$.emptyTxt}>{t('dashboard.routeEmptyText')}</Text>
        </View>
      </View>
    );
  }

  // Color based on progress
  const barColor = pct >= 80 ? '#15C7AE' : pct >= 50 ? '#F9AD28' : colors.primary;

  return (
    <View style={$.root}>
      <Text style={$.sectionTitle}>{t('dashboard.routeProgress')}</Text>
      <View style={$.card}>
        {/* Top: percentage + label */}
        <View style={$.topRow}>
          <View style={$.pctWrap}>
            <Text style={[$.pctVal, {color: barColor}]}>{pct}%</Text>
            <Text style={$.pctLabel}>{t('dashboard.completed')}</Text>
          </View>
          <View style={$.remainWrap}>
            <Text style={$.remainVal}>{remaining}</Text>
            <Text style={$.remainLabel}>{t('dashboard.remaining')}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={$.barTrack}>
          <View style={[$.barFill, {width: `${pct}%`, backgroundColor: barColor}]} />
        </View>

        {/* Stats row */}
        <View style={$.statsRow}>
          <View style={$.statItem}>
            <Icon name="check-circle" size={14} color="#15C7AE" />
            <Text style={$.statVal}>{delivered}</Text>
            <Text style={$.statLbl}>{t('dashboard.ofOrders', {count: totalOrders})}</Text>
          </View>
          <View style={$.statDivider} />
          <View style={$.statItem}>
            <Icon name="map-marker-check" size={14} color={colors.primary} />
            <Text style={$.statVal}>{completedStops}</Text>
            <Text style={$.statLbl}>{t('dashboard.ofStops', {count: totalStops})}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const $ = StyleSheet.create({
  root: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pctWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pctVal: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
  },
  pctLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 5,
  },
  remainWrap: {
    alignItems: 'flex-end',
  },
  remainVal: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  remainLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F0F2F5',
    overflow: 'hidden',
    marginBottom: 18,
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 5,
  },
  statLbl: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 5,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E8ECF0',
  },
  // Empty
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTxt: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
  },
});

export default React.memo(RouteProgressCard);
