/**
 * EarningsCODCard — Financial summary
 * Shows: today earnings, COD collected, COD pending
 */

import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import {fontFamily} from '../../../theme/fonts';

const EarningsCODCard = ({
  earnings = 0,
  codCollected = 0,
  codPending = 0,
  deliveredCount = 0,
  currency = 'AED',
  onPress,
}) => {
  const hasData = earnings > 0 || codCollected > 0 || codPending > 0 || deliveredCount > 0;

  if (!hasData) {
    return (
      <View style={$.root}>
        <Text style={$.sectionTitle}>Earnings & COD</Text>
        <View style={$.emptyCard}>
          <Icon name="wallet-outline" size={24} color={colors.textLight} />
          <Text style={$.emptyTxt}>Today's earnings will appear here after your first completed order</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={$.root}>
      {/* Section header */}
      <View style={$.headerRow}>
        <Text style={$.sectionTitle}>Earnings & COD</Text>
        {onPress && (
          <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Text style={$.viewAll}>Details</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={$.card}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}>
        {/* Decorative gradient bg */}
        <View style={$.bgDecor} />
        <View style={$.bgCircle1} />
        <View style={$.bgCircle2} />

        {/* Content */}
        <View style={$.content}>
          {/* Earnings headline */}
          <View style={$.earningsTop}>
            <View style={$.earningsIconWrap}>
              <Icon name="trending-up" size={18} color="#FFF" />
            </View>
            <View>
              <Text style={$.earningsLabel}>Today's Earnings</Text>
              <Text style={$.earningsVal}>{currency} {earnings}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={$.statsRow}>
            <View style={$.statBox}>
              <View style={$.statIconWrap}>
                <Icon name="cash-check" size={14} color="#15C7AE" />
              </View>
              <Text style={$.statVal}>{currency} {codCollected}</Text>
              <Text style={$.statLbl}>COD Collected</Text>
            </View>

            <View style={$.statDivider} />

            <View style={$.statBox}>
              <View style={[$.statIconWrap, {backgroundColor: 'rgba(249,173,40,0.15)'}]}>
                <Icon name="clock-outline" size={14} color="#F9AD28" />
              </View>
              <Text style={$.statVal}>{currency} {codPending}</Text>
              <Text style={$.statLbl}>COD Pending</Text>
            </View>

            <View style={$.statDivider} />

            <View style={$.statBox}>
              <View style={[$.statIconWrap, {backgroundColor: 'rgba(36,64,102,0.1)'}]}>
                <Icon name="check-all" size={14} color={colors.primary} />
              </View>
              <Text style={$.statVal}>{deliveredCount}</Text>
              <Text style={$.statLbl}>Completed</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const $ = StyleSheet.create({
  root: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  viewAll: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0C7B6B',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  bgDecor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B6E60',
  },
  bgCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -40,
  },
  bgCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -20,
    left: 20,
  },
  content: {
    padding: 22,
  },
  earningsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  earningsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  earningsVal: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(21,199,174,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statVal: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: '#FFF',
    marginBottom: 2,
  },
  statLbl: {
    fontFamily: fontFamily.medium,
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // Empty
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyTxt: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default React.memo(EarningsCODCard);
