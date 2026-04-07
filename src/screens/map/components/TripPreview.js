/**
 * TripPreview — Enhanced trip planning modal
 *
 * Features:
 *   - Orders sorted by nearest distance from driver
 *   - Trip summary header (total route distance, time, COD total, packages)
 *   - Optimize route button (nearest-neighbor)
 *   - Reorder stops with up/down arrows
 *   - Start individual or all deliveries
 *   - Visual connecting timeline between stops with leg distances
 *   - COD badges and special instructions indicators
 *   - Package count per order
 */
import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../../utils/LucideIcon';
import {colors} from '../../../theme/colors';
import {fontFamily, fontSize} from '../../../theme/fonts';
import {routeApi, stopsApi} from '../../../api';
import useSettingsStore from '../../../store/settingsStore';

const toNum = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateETA = (distKm) => Math.max(1, Math.round((distKm / 30) * 60));

/** Nearest-neighbor route optimization */
const optimizeRoute = (items, startLat, startLng) => {
  if (items.length <= 1) return items;
  const remaining = [...items];
  const result = [];
  let curLat = startLat;
  let curLng = startLng;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const lat = toNum(remaining[i].recipient_lat);
      const lng = toNum(remaining[i].recipient_lng);
      if (lat && lng) {
        const d = haversine(curLat, curLng, lat, lng);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
    }
    const pick = remaining.splice(bestIdx, 1)[0];
    result.push(pick);
    curLat = toNum(pick.recipient_lat) || curLat;
    curLng = toNum(pick.recipient_lng) || curLng;
  }
  return result;
};

const TripPreview = ({
  visible,
  orders = [],
  driverPosition,
  onStartOne,
  onStartAll,
  onClose,
  t,
}) => {
  const ins = useSafeAreaInsets();
  const currency = useSettingsStore(s => s.currency);
  const [startingId, setStartingId] = useState(null);
  const [startingAll, setStartingAll] = useState(false);
  const [localOrder, setLocalOrder] = useState(null);
  const [isOptimized, setIsOptimized] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeSummary, setOptimizeSummary] = useState(null);

  // Assigned orders with distance from driver
  const assignedWithDist = useMemo(() => {
    return orders
      .filter((o) => o.status === 'assigned')
      .map((o) => {
        const lat = toNum(o.recipient_lat);
        const lng = toNum(o.recipient_lng);
        let dist = null;
        if (driverPosition && lat && lng) {
          dist = haversine(driverPosition.latitude, driverPosition.longitude, lat, lng);
        }
        return {...o, _distance: dist};
      })
      .sort((a, b) => {
        if (a._distance == null) return 1;
        if (b._distance == null) return -1;
        return a._distance - b._distance;
      });
  }, [orders, driverPosition]);

  const displayList = localOrder || assignedWithDist;

  useEffect(() => {
    setLocalOrder(null);
    setIsOptimized(false);
  }, [assignedWithDist.length]);

  // ── Trip summary ──────────────────────────
  const tripSummary = useMemo(() => {
    let totalDist = 0;
    let totalCod = 0;
    let codCount = 0;
    let pkgCount = 0;
    let prevLat = driverPosition?.latitude;
    let prevLng = driverPosition?.longitude;

    for (const o of displayList) {
      const lat = toNum(o.recipient_lat);
      const lng = toNum(o.recipient_lng);
      if (prevLat && prevLng && lat && lng) {
        totalDist += haversine(prevLat, prevLng, lat, lng);
        prevLat = lat;
        prevLng = lng;
      }
      if (o.payment_method === 'cod' && parseFloat(o.cod_amount || 0) > 0) {
        totalCod += parseFloat(o.cod_amount);
        codCount++;
      }
      pkgCount += parseInt(o.total_packages || o.package_count || 1, 10);
    }
    return {
      totalDist: optimizeSummary?.distance != null
        ? parseFloat(optimizeSummary.distance).toFixed(1)
        : totalDist.toFixed(1),
      totalTime: optimizeSummary?.duration != null
        ? Math.round(optimizeSummary.duration)
        : estimateETA(totalDist),
      totalCod: totalCod.toFixed(0),
      codCount,
      pkgCount,
      stopCount: displayList.length,
    };
  }, [displayList, driverPosition, optimizeSummary]);

  // ── Leg distances (between consecutive stops) ─────
  const legDistances = useMemo(() => {
    const legs = [];
    for (let i = 0; i < displayList.length; i++) {
      if (i === 0 && driverPosition) {
        const lat = toNum(displayList[i].recipient_lat);
        const lng = toNum(displayList[i].recipient_lng);
        legs.push(
          lat && lng
            ? haversine(driverPosition.latitude, driverPosition.longitude, lat, lng)
            : null,
        );
      } else if (i > 0) {
        const prev = displayList[i - 1];
        const pLat = toNum(prev.recipient_lat);
        const pLng = toNum(prev.recipient_lng);
        const lat = toNum(displayList[i].recipient_lat);
        const lng = toNum(displayList[i].recipient_lng);
        legs.push(pLat && pLng && lat && lng ? haversine(pLat, pLng, lat, lng) : null);
      } else {
        legs.push(null);
      }
    }
    return legs;
  }, [displayList, driverPosition]);

  // ── Reorder helpers ───────────────────────
  const moveUp = useCallback(
    (idx) => {
      if (idx <= 0) return;
      const list = [...(localOrder || assignedWithDist)];
      [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
      setLocalOrder(list);
      setIsOptimized(false);
    },
    [localOrder, assignedWithDist],
  );

  const moveDown = useCallback(
    (idx) => {
      const list = [...(localOrder || assignedWithDist)];
      if (idx >= list.length - 1) return;
      [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
      setLocalOrder(list);
      setIsOptimized(false);
    },
    [localOrder, assignedWithDist],
  );

  // ── Optimize (backend API with local fallback) ──
  const handleOptimize = useCallback(async () => {
    if (!driverPosition) return;
    const list = [...(localOrder || assignedWithDist)];
    setIsOptimizing(true);

    try {
      // Build stops payload for backend
      const stops = list
        .map((o) => ({
          lat: toNum(o.recipient_lat),
          lng: toNum(o.recipient_lng),
          id: o.id,
        }))
        .filter((s) => s.lat && s.lng);

      const res = await routeApi.optimizeStops(
        driverPosition.latitude,
        driverPosition.longitude,
        stops,
      );
      const data = res.data?.data || res.data;
      const optimizedOrder = data?.optimized_order;

      if (optimizedOrder && Array.isArray(optimizedOrder)) {
        // Build an id→order lookup
        const byId = {};
        for (const o of list) byId[o.id] = o;
        // Reorder using backend result
        const reordered = optimizedOrder
          .map((id) => byId[id])
          .filter(Boolean);
        // Append any orders not in the optimized result
        const inResult = new Set(optimizedOrder);
        for (const o of list) {
          if (!inResult.has(o.id)) reordered.push(o);
        }

        const withDist = reordered.map((o) => {
          const lat = toNum(o.recipient_lat);
          const lng = toNum(o.recipient_lng);
          return {
            ...o,
            _distance:
              driverPosition && lat && lng
                ? haversine(driverPosition.latitude, driverPosition.longitude, lat, lng)
                : null,
          };
        });
        setLocalOrder(withDist);
        setIsOptimized(true);
        setOptimizeSummary({
          distance: data.total_distance_km,
          duration: data.total_duration_min,
        });
      } else {
        throw new Error('Invalid backend response');
      }
    } catch {
      // Fallback to local nearest-neighbor heuristic
      const optimized = optimizeRoute(list, driverPosition.latitude, driverPosition.longitude);
      const withDist = optimized.map((o) => {
        const lat = toNum(o.recipient_lat);
        const lng = toNum(o.recipient_lng);
        return {
          ...o,
          _distance:
            driverPosition && lat && lng
              ? haversine(driverPosition.latitude, driverPosition.longitude, lat, lng)
              : null,
        };
      });
      setLocalOrder(withDist);
      setIsOptimized(true);
      setOptimizeSummary(null);
    } finally {
      setIsOptimizing(false);
    }
  }, [localOrder, assignedWithDist, driverPosition]);

  // ── Reset to nearest-first ────────────────
  const handleResetSort = useCallback(() => {
    setLocalOrder(null);
    setIsOptimized(false);
    setOptimizeSummary(null);
  }, []);

  // ── Start handlers ────────────────────────
  const handleStartOne = useCallback(
    async (order) => {
      setStartingId(order.id);
      try {
        await onStartOne(order);
      } finally {
        setStartingId(null);
      }
    },
    [onStartOne],
  );

  const handleStartAll = useCallback(async () => {
    setStartingAll(true);
    try {
      // Persist optimized/manual sequence to backend before starting
      if (localOrder || isOptimized) {
        const orderGroups = {};
        for (let i = 0; i < displayList.length; i++) {
          const o = displayList[i];
          const orderId = o.order_id || o.id;
          if (!orderGroups[orderId]) orderGroups[orderId] = [];
          orderGroups[orderId].push({stop_id: o.stop_id || o.id, sequence: i + 1});
        }
        await Promise.all(
          Object.entries(orderGroups).map(([orderId, stopOrder]) =>
            stopsApi.updateStopSequence(orderId, stopOrder).catch(() => {}),
          ),
        );
      }
      await onStartAll(displayList);
    } finally {
      setStartingAll(false);
    }
  }, [onStartAll, displayList, localOrder, isOptimized]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={$.overlay}>
        <View style={[$.container, {paddingTop: ins.top + 10, paddingBottom: ins.bottom + 10}]}>
          {/* ── Header ─────────────────── */}
          <View style={$.header}>
            <View style={$.headerLeft}>
              <View style={$.headerIcon}>
                <Icon name="map-marker-path" size={18} color={colors.white} />
              </View>
              <Text style={$.title}>{t ? t('map.tripPlan') : 'Trip Plan'}</Text>
              <View style={$.countBadge}>
                <Text style={$.countText}>{displayList.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={$.closeBtn}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* ── Summary Cards ──────────── */}
          <View style={$.summaryRow}>
            <View style={$.summaryCard}>
              <Icon name="road-variant" size={14} color={colors.primary} />
              <Text style={$.summaryValue}>{tripSummary.totalDist} km</Text>
              <Text style={$.summaryLabel}>{t ? t('map.distance') : 'Distance'}</Text>
            </View>
            <View style={$.summaryCard}>
              <Icon name="clock-outline" size={14} color={colors.warning} />
              <Text style={$.summaryValue}>~{tripSummary.totalTime} min</Text>
              <Text style={$.summaryLabel}>{t ? t('map.estTime') : 'Est. Time'}</Text>
            </View>
            <View style={$.summaryCard}>
              <Icon name="cash" size={14} color={colors.success} />
              <Text style={$.summaryValue}>{tripSummary.totalCod}</Text>
              <Text style={$.summaryLabel}>{t ? t('map.codAed', {currency}) : `COD (${currency})`}</Text>
            </View>
            <View style={[$.summaryCard, {marginEnd: 0}]}>
              <Icon name="package-variant" size={14} color={colors.info} />
              <Text style={$.summaryValue}>{tripSummary.pkgCount}</Text>
              <Text style={$.summaryLabel}>{t ? t('map.packages') : 'Packages'}</Text>
            </View>
          </View>

          {/* ── Sort Controls ─────────── */}
          <View style={$.controlRow}>
            <TouchableOpacity
              style={[$.controlBtn, isOptimized && $.controlBtnActive]}
              onPress={handleOptimize}
              disabled={isOptimizing}
              activeOpacity={0.7}>
              {isOptimizing ? (
                <ActivityIndicator size="small" color={colors.primary} style={{marginEnd: 4}} />
              ) : (
                <Icon
                  name="sparkles"
                  size={13}
                  color={isOptimized ? colors.white : colors.primary}
                />
              )}
              <Text style={[$.controlText, isOptimized && $.controlTextActive]}>
                {t ? (isOptimizing ? t('map.optimizing', 'Optimizing…') : isOptimized ? t('map.optimized') : t('map.optimizeRoute')) : (isOptimizing ? 'Optimizing…' : isOptimized ? 'Optimized' : 'Optimize Route')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[$.controlBtn, {marginEnd: 0}, !localOrder && !isOptimized && $.controlBtnActive]}
              onPress={handleResetSort}
              activeOpacity={0.7}>
              <Icon
                name="sort-variant"
                size={13}
                color={!localOrder && !isOptimized ? colors.white : colors.primary}
              />
              <Text
                style={[
                  $.controlText,
                  !localOrder && !isOptimized && $.controlTextActive,
                ]}>
                {t ? t('map.nearestFirst') : 'Nearest First'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Stop List ────────────── */}
          <ScrollView style={$.list} showsVerticalScrollIndicator={false}>
            {displayList.map((order, idx) => {
              const legDist = legDistances[idx];
              const eta = legDist ? estimateETA(legDist) : null;
              const isCod =
                order.payment_method === 'cod' &&
                parseFloat(order.cod_amount || 0) > 0;
              const isStarting = startingId === order.id;
              const isLast = idx === displayList.length - 1;
              const pkgs = parseInt(order.total_packages || order.package_count || 1, 10);
              const hasNotes = !!order.special_instructions;

              // Leg distance to next stop (already computed in legDistances memo)
              const nextLegDist = !isLast ? (legDistances[idx + 1] ?? null) : null;

              return (
                <View key={`order-${order.id}-${idx}`} style={$.stopRow}>
                  {/* Timeline column */}
                  <View style={$.timeline}>
                    <View style={[$.timelineDot, idx === 0 && $.timelineDotFirst]}>
                      <Text style={$.timelineNum}>{idx + 1}</Text>
                    </View>
                    {!isLast && (
                      <View style={$.timelineLine}>
                        {nextLegDist != null && (
                          <View style={$.legBadge}>
                            <Text style={$.legText}>{nextLegDist.toFixed(1)} km</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Card */}
                  <View style={[$.card, idx === 0 && $.cardFirst]}>
                    <View style={$.cardContent}>
                      {/* Row 1: Order # + badges */}
                      <View style={$.cardTop}>
                        <Text style={$.orderNum} numberOfLines={1}>
                          {order.order_number || order.tracking_token || `#${order.id}`}
                        </Text>
                        <View style={$.badgeRow}>
                          {isCod && (
                            <View style={$.codBadge}>
                              <Text style={$.codText}>
                              {t ? t('map.codAmount', {amount: parseFloat(order.cod_amount).toFixed(0), currency}) : `COD ${parseFloat(order.cod_amount).toFixed(0)}`}
                              </Text>
                            </View>
                          )}
                          {hasNotes && (
                            <View style={$.noteBadge}>
                              <Icon name="alert-circle-outline" size={10} color={colors.danger} />
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Recipient name */}
                      <Text style={$.recipientName} numberOfLines={1}>
                        {order.recipient_name || '—'}
                      </Text>

                      {/* Address */}
                      <Text style={$.address} numberOfLines={1}>
                        {order.recipient_address || order.recipient_area || '—'}
                      </Text>

                      {/* Chips */}
                      <View style={$.chipRow}>
                        {legDist != null && (
                          <View style={$.chip}>
                            <Icon name="navigation-variant" size={10} color={colors.primary} />
                            <Text style={[$.chipText, {color: colors.primary}]}>
                              {legDist.toFixed(1)} km
                            </Text>
                          </View>
                        )}
                        {eta != null && (
                          <View style={$.chip}>
                            <Icon name="clock-outline" size={10} color={colors.warning} />
                            <Text style={[$.chipText, {color: colors.warning}]}>
                              ~{eta} min
                            </Text>
                          </View>
                        )}
                        {pkgs > 1 && (
                          <View style={$.chip}>
                            <Icon name="package-variant" size={10} color={colors.info} />
                            <Text style={[$.chipText, {color: colors.info}]}>
                              {t ? t('map.pkgsCount', {count: pkgs}) : `${pkgs} pkgs`}
                            </Text>
                          </View>
                        )}
                        {order.recipient_area ? (
                          <View style={[$.chip, {backgroundColor: colors.bgGray}]}>
                            <Text style={[$.chipText, {color: colors.textSecondary}]}>
                              {order.recipient_area}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Right: reorder + start */}
                    <View style={$.cardActions}>
                      <TouchableOpacity
                        style={[$.arrowBtn, idx === 0 && $.arrowDisabled]}
                        onPress={() => moveUp(idx)}
                        disabled={idx === 0}>
                        <Icon
                          name="chevron-up"
                          size={14}
                          color={idx === 0 ? colors.borderLight : colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[$.arrowBtn, isLast && $.arrowDisabled]}
                        onPress={() => moveDown(idx)}
                        disabled={isLast}>
                        <Icon
                          name="chevron-down"
                          size={14}
                          color={isLast ? colors.borderLight : colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={$.startOneBtn}
                        onPress={() => handleStartOne(order)}
                        disabled={isStarting || startingAll}>
                        {isStarting ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Icon name="play" size={12} color={colors.white} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
            <View style={{height: 16}} />
          </ScrollView>

          {/* ── Footer ───────────────── */}
          <View style={$.footer}>
            <TouchableOpacity
              style={$.startAllBtn}
              onPress={handleStartAll}
              disabled={startingAll || displayList.length === 0}
              activeOpacity={0.8}>
              {startingAll ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Icon name="play-circle-outline" size={20} color={colors.white} />
                  <Text style={$.startAllText}>
                    {t ? t('map.startAllCount', {count: displayList.length}) : `Start All (${displayList.length} orders)`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const $ = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: colors.bgScreen,
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 10,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'auto',
    marginEnd: 10,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.white,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgGray,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginEnd: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryValue: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 4,
  },
  summaryLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 4,
  },

  // Controls
  controlRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginEnd: 8,
  },
  controlBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  controlText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
    marginStart: 6,
  },
  controlTextActive: {
    color: colors.white,
  },

  // List
  list: {
    flex: 1,
  },

  // Stop row (timeline + card)
  stopRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },

  // Timeline
  timeline: {
    width: 32,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotFirst: {
    backgroundColor: colors.success,
  },
  timelineNum: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.white,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
  },
  legBadge: {
    backgroundColor: colors.bgScreen,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  legText: {
    fontFamily: fontFamily.regular,
    fontSize: 7,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Card
  card: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 14,
    marginStart: 8,
    marginBottom: 6,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardFirst: {
    borderStartWidth: 3,
    borderStartColor: colors.success,
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  orderNum: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  codBadge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginStart: 4,
  },
  codText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.warning,
  },
  noteBadge: {
    backgroundColor: colors.dangerBg,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 4,
  },
  recipientName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    marginBottom: 1,
  },
  address: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoBg,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginEnd: 6,
    marginBottom: 4,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.info,
    marginStart: 5,
  },

  // Card Actions
  cardActions: {
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 8,
    width: 34,
  },
  arrowBtn: {
    width: 28,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgGray,
    borderRadius: 6,
    marginBottom: 3,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  startOneBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: colors.success,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // Footer
  footer: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  startAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: colors.success,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startAllText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.white,
    marginStart: 10,
  },
});

export default React.memo(TripPreview);
