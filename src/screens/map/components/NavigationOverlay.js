/**
 * NavigationOverlay — In-app navigation mode header + bottom card.
 *
 * Shows turn-by-turn header with next maneuver instruction,
 * and a bottom card with stop info, ETA, and action buttons.
 */
import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import useSettingsStore from '../../../store/settingsStore';
import {fontFamily, fontSize} from '../../../theme/fonts';

// ── Turn icon mapping ───────────────────────────────
const MANEUVER_ICON = {
  'turn-left': 'corner-down-left',
  'turn-right': 'corner-down-right',
  'turn-sharp-left': 'corner-down-left',
  'turn-sharp-right': 'corner-down-right',
  'turn-slight-left': 'corner-down-left',
  'turn-slight-right': 'corner-down-right',
  'straight': 'arrow-up',
  'depart': 'navigation-variant',
  'arrive': 'map-marker-check',
  'merge-left': 'corner-down-left',
  'merge-right': 'corner-down-right',
  'roundabout': 'rotate-ccw',
  'rotary': 'rotate-ccw',
  'fork-left': 'corner-down-left',
  'fork-right': 'corner-down-right',
  'uturn': 'rotate-ccw',
};

function getManeuverIcon(type, modifier) {
  const key = modifier ? `${type}-${modifier}` : type;
  if (MANEUVER_ICON[key]) return MANEUVER_ICON[key];
  if (modifier === 'left' || modifier === 'sharp left' || modifier === 'slight left')
    return 'corner-down-left';
  if (modifier === 'right' || modifier === 'sharp right' || modifier === 'slight right')
    return 'corner-down-right';
  if (modifier === 'straight') return 'arrow-up';
  if (type === 'arrive') return 'map-marker-check';
  return 'navigation-variant';
}

function getManeuverText(step, t) {
  if (!step) return t('nav.headStraight');
  const {maneuver, modifier, name} = step;

  if (maneuver === 'arrive') return t('nav.arriving');
  if (maneuver === 'depart') {
    return name ? t('nav.headOnStreet', {street: name}) : t('nav.headStraight');
  }

  let turnDir = '';
  if (modifier === 'left' || modifier === 'sharp left' || modifier === 'slight left') {
    turnDir = t('nav.turnLeft');
  } else if (modifier === 'right' || modifier === 'sharp right' || modifier === 'slight right') {
    turnDir = t('nav.turnRight');
  } else if (modifier === 'uturn') {
    turnDir = t('nav.uTurn');
  } else {
    turnDir = t('nav.continueStraight');
  }

  return name ? `${turnDir} — ${name}` : turnDir;
}

function formatDistance(meters, t) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} ${t('nav.km')}`;
  return `${Math.round(meters)} ${t('nav.m')}`;
}

function formatDuration(seconds, t) {
  if (seconds < 60) return `< 1 ${t('nav.min')}`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} ${t('nav.min')}`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h} ${t('nav.hr')} ${rm} ${t('nav.min')}` : `${h} ${t('nav.hr')}`;
}

const cleanPhone = (p) => (p || '').replace(/[\s\-()]/g, '');

// ─────────────────────────────────────────────────────
const NavigationOverlay = ({
  stop,
  steps,
  distance,  // total remaining meters
  duration,  // total remaining seconds
  onEndNav,
  onOpenExternal,
  onViewDetail,
  t,
}) => {
  const ins = useSafeAreaInsets();
  const currency = useSettingsStore(s => s.currency);

  // Next meaningful step (skip 'depart' if there's a next one)
  const nextStep = useMemo(() => {
    if (!steps || steps.length === 0) return null;
    // Find first non-depart step
    const nonDepart = steps.find(s => s.maneuver !== 'depart');
    return nonDepart || steps[0];
  }, [steps]);

  // Distance to next maneuver
  const nextStepDist = useMemo(() => {
    if (!steps || steps.length === 0) return null;
    return steps[0]?.distance || null;
  }, [steps]);

  if (!stop) return null;

  const name = stop.contact_name || stop.recipient_name || '—';
  const address = stop.address || stop.recipient_address || '—';
  const phone = stop.contact_phone || stop.recipient_phone;
  const orderNum = stop.order_number || '';
  const isCod = stop.payment_method === 'cod' && parseFloat(stop.cod_amount) > 0;
  const seq = stop.sequence_number;

  const handleCall = () => {
    if (!phone) return;
    const url = Platform.OS === 'ios'
      ? `telprompt:${cleanPhone(phone)}`
      : `tel:${cleanPhone(phone)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <>
      {/* ── Navigation Header (dark bar at top) ── */}
      <View style={[$.header, {paddingTop: ins.top + 8}]}>
        {/* Close navigation */}
        <TouchableOpacity style={$.headerClose} onPress={onEndNav} activeOpacity={0.7}>
          <Icon name="close" size={20} color={colors.white} />
        </TouchableOpacity>

        <View style={$.headerBody}>
          {/* Turn icon */}
          <View style={$.turnIconWrap}>
            <Icon
              name={nextStep ? getManeuverIcon(nextStep.maneuver, nextStep.modifier) : 'arrow-up'}
              size={28}
              color={colors.white}
            />
          </View>

          {/* Instruction text */}
          <View style={$.turnInfo}>
            {nextStepDist != null && (
              <Text style={$.turnDist}>{formatDistance(nextStepDist, t)}</Text>
            )}
            <Text style={$.turnText} numberOfLines={2}>
              {getManeuverText(nextStep, t)}
            </Text>
          </View>
        </View>

        {/* ETA summary */}
        <View style={$.headerEta}>
          <Text style={$.etaTime}>{formatDuration(duration || 0, t)}</Text>
          <Text style={$.etaDist}>{formatDistance(distance || 0, t)}</Text>
        </View>
      </View>

      {/* ── Bottom card ── */}
      <View style={[$.bottom, {paddingBottom: 90 + ins.bottom}]}>
        {/* Stop info row */}
        <View style={$.stopRow}>
          {seq && (
            <View style={$.seqBadge}>
              <Text style={$.seqText}>{seq}</Text>
            </View>
          )}
          <View style={$.stopInfo}>
            <Text style={$.stopName} numberOfLines={1}>{name}</Text>
            <Text style={$.stopAddr} numberOfLines={1}>{address}</Text>
            {orderNum ? <Text style={$.stopOrder}>#{orderNum}</Text> : null}
          </View>

          {/* Call button */}
          {phone && (
            <TouchableOpacity style={$.callBtn} onPress={handleCall} activeOpacity={0.7}>
              <Icon name="phone" size={16} color={colors.success} />
            </TouchableOpacity>
          )}
        </View>

        {/* Info chips */}
        <View style={$.chipRow}>
          <View style={$.chip}>
            <Icon name="clock-outline" size={12} color={colors.white} />
            <Text style={$.chipText}>{formatDuration(duration || 0, t)}</Text>
          </View>
          <View style={$.chip}>
            <Icon name="map-marker-distance" size={12} color={colors.white} />
            <Text style={$.chipText}>{formatDistance(distance || 0, t)}</Text>
          </View>
          {isCod && (
            <View style={[$.chip, {backgroundColor: colors.warning}]}>
              <Icon name="cash" size={12} color={colors.white} />
              <Text style={$.chipText}>{currency} {parseFloat(stop.cod_amount).toFixed(0)}</Text>
            </View>
          )}
        </View>

        {/* Actions row */}
        <View style={$.actRow}>
          <TouchableOpacity
            style={$.actBtn}
            onPress={onOpenExternal}
            activeOpacity={0.7}>
            <Icon name="navigation-variant" size={16} color={colors.white} />
            <Text style={$.actText}>{t('nav.openMaps')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[$.actBtn, $.actBtnOutline]}
            onPress={() => onViewDetail?.(stop)}
            activeOpacity={0.7}>
            <Icon name="file-document-outline" size={16} color={colors.white} />
            <Text style={$.actText}>{t('nav.viewDetails')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[$.actBtn, $.actBtnDanger]}
            onPress={onEndNav}
            activeOpacity={0.7}>
            <Icon name="close" size={16} color={colors.white} />
            <Text style={$.actText}>{t('nav.endNav')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

// ─── Styles ─────────────────────────────────────────
const $ = StyleSheet.create({
  // ── Header ──
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 20,
  },
  headerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },
  headerBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  turnIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  turnInfo: {
    flex: 1,
  },
  turnDist: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.white,
  },
  turnText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  headerEta: {
    alignItems: 'flex-end',
    marginStart: 10,
  },
  etaTime: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.white,
  },
  etaDist: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // ── Bottom card ──
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -3},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 20,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  seqBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },
  seqText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.white,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.white,
  },
  stopAddr: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  stopOrder: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 8,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginEnd: 8,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.white,
    marginStart: 4,
  },

  // Actions
  actRow: {
    flexDirection: 'row',
  },
  actBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 11,
    borderRadius: 12,
    marginEnd: 8,
  },
  actBtnOutline: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actBtnDanger: {
    backgroundColor: colors.danger,
    marginEnd: 0,
  },
  actText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.white,
    marginStart: 5,
  },
});

export default React.memo(NavigationOverlay);
