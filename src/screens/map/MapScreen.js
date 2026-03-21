/**
 * Traseallo Driver App — Enhanced Map Screen
 *
 * Features:
 *   - Route API integration with ordered delivery stops
 *   - Numbered stop markers with status colors (pending/completed/failed)
 *   - Custom driver marker with heading rotation
 *   - Multi-stop route polyline connecting stops in sequence
 *   - Progress display (completion %, stops delivered)
 *   - Enhanced bottom sheet with contact actions (call, WhatsApp)
 *   - Safe area handled via useSafeAreaInsets
 *   - Driver status cycle: available → busy → on_break → offline
 *   - Pickup point markers on map
 *   - COD badges on markers
 *   - Pull-to-refresh, fit-all, recenter FABs
 *   - Start Trip batch action
 *   - Full i18n
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
  Linking,
  Platform,
} from 'react-native';
import MapView, {Polyline} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import {colors} from '../../theme/colors';
import {fontFamily, fontSize} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useOrderStore from '../../store/orderStore';
import useLocationStore from '../../store/locationStore';
import useRouteStore from '../../store/routeStore';
import {fetchRoadRouteChunked} from '../../utils/routing';

import {DriverMarker, StopMarker, MapTopBar, OrderSheet} from './components';

const {height: SH} = Dimensions.get('window');
const SHEET_HEIGHT = 320;
const LATITUDE_DELTA = 0.015;
const LONGITUDE_DELTA = 0.015;

// ─── Helpers ──────────────────────────────────────────
const isValidCoord = (lat, lng) => {
  const la = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lo = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (la === 0 && lo === 0) return false;
  return la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
};

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

// ─── Driver status cycle (fixed B-1) ─────────────────
// Only includes manually-controllable statuses ('busy' is set automatically by backend)
const DRIVER_STATUSES = ['available', 'on_break', 'offline'];
const STATUS_LABELS = {
  available: 'status.available',
  busy: 'status.busy',
  on_break: 'status.on_break',
  offline: 'status.offline',
};

// ─── Main Component ──────────────────────────────────
const MapScreen = ({navigation}) => {
  const {t} = useTranslation();
  const ins = useSafeAreaInsets();
  const mapRef = useRef(null);

  // ── Stores ──────────────────────────────────
  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const startDelivery = useOrderStore((s) => s.startDelivery);
  const isUpdatingStatus = useOrderStore((s) => s.isUpdatingStatus);

  const currentPosition = useLocationStore((s) => s.currentPosition);
  const driverStatus = useLocationStore((s) => s.driverStatus);
  const goOnline = useLocationStore((s) => s.goOnline);
  const goOffline = useLocationStore((s) => s.goOffline);
  const onBreak = useLocationStore((s) => s.onBreak);

  const route = useRouteStore((s) => s.route);
  const progress = useRouteStore((s) => s.progress);
  const fetchRoute = useRouteStore((s) => s.fetchRoute);
  const fetchProgress = useRouteStore((s) => s.fetchProgress);

  // ── Local state ─────────────────────────────
  const [selectedStop, setSelectedStop] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [roadCoords, setRoadCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null); // {distance, duration}

  // ── Bottom sheet animation ──────────────────
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          dismissSheet();
        } else {
          Animated.spring(sheetY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  const showSheet = useCallback(() => {
    Animated.spring(sheetY, {toValue: 0, useNativeDriver: true, friction: 8}).start();
  }, [sheetY]);

  const dismissSheet = useCallback(() => {
    Animated.timing(sheetY, {toValue: SHEET_HEIGHT, duration: 200, useNativeDriver: true}).start(
      () => setSelectedStop(null),
    );
  }, [sheetY]);

  // ── Data fetching ───────────────────────────
  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      try {
        await Promise.all([
          fetchOrders('active', isRefresh),
          fetchRoute(isRefresh),
          fetchProgress(),
        ]);
      } catch (e) {
        if (__DEV__) console.warn('Map loadAll error:', e?.message);
      } finally {
        if (isRefresh) setIsRefreshing(false);
        if (initialLoad) setInitialLoad(false);
      }
    },
    [fetchOrders, fetchRoute, fetchProgress, initialLoad],
  );

  // Refetch on tab focus
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  // ── Route stops (from route API) ────────────
  const routeStops = useMemo(() => {
    const pickups = (route?.pickups || []).map((p) => ({...p, stop_type: 'pickup'}));
    const deliveries = (route?.delivery_stops || []).map((d) => ({...d, stop_type: 'delivery'}));
    return [...pickups, ...deliveries].filter((s) => {
      const lat = toNum(s.lat);
      const lng = toNum(s.lng);
      return isValidCoord(lat, lng);
    });
  }, [route]);

  // Fallback: use order coordinates if route API has no stops
  const mapStops = useMemo(() => {
    if (routeStops.length > 0) return routeStops;
    // Fallback to active orders
    return orders
      .filter((o) => ['assigned', 'picked_up', 'in_transit'].includes(o.status))
      .filter((o) => isValidCoord(toNum(o.recipient_lat), toNum(o.recipient_lng)))
      .map((o, idx) => ({
        ...o,
        lat: o.recipient_lat,
        lng: o.recipient_lng,
        contact_name: o.recipient_name,
        contact_phone: o.recipient_phone,
        address: o.recipient_address,
        area: o.recipient_area,
        stop_status: o.status === 'assigned' ? 'pending' : o.status,
        sequence_number: idx + 1,
        stop_type: 'delivery',
      }));
  }, [routeStops, orders]);

  // Keep selected stop synced
  useEffect(() => {
    if (!selectedStop) return;
    const fresh = mapStops.find(
      (s) => (s.order_id || s.id) === (selectedStop.order_id || selectedStop.id),
    );
    if (fresh) {
      setSelectedStop(fresh);
    } else {
      dismissSheet();
    }
  }, [mapStops, selectedStop, dismissSheet]);

  // ── Waypoints for route (straight-line fallback + road fetch) ──
  const routeWaypoints = useMemo(() => {
    const sorted = [...mapStops]
      .filter((s) => s.stop_type === 'delivery' && (s.stop_status || 'pending') !== 'completed')
      .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));

    const coords = [];
    if (currentPosition) {
      coords.push({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
      });
    }
    for (const s of sorted) {
      const lat = toNum(s.lat);
      const lng = toNum(s.lng);
      if (isValidCoord(lat, lng)) {
        coords.push({latitude: lat, longitude: lng});
      }
    }
    return coords.length >= 2 ? coords : [];
  }, [mapStops, currentPosition]);

  // ── Fetch road-following route from OSRM ──
  const lastWpKey = useRef('');
  useEffect(() => {
    if (routeWaypoints.length < 2) {
      setRoadCoords([]);
      setRouteInfo(null);
      return;
    }
    // Build a cache key so we only refetch when waypoints actually change
    const key = routeWaypoints
      .map((w) => `${w.latitude.toFixed(4)},${w.longitude.toFixed(4)}`)
      .join('|');
    if (key === lastWpKey.current) return;
    lastWpKey.current = key;

    let cancelled = false;
    (async () => {
      const result = await fetchRoadRouteChunked(routeWaypoints);
      if (cancelled) return;
      if (result) {
        setRoadCoords(result.coordinates);
        setRouteInfo({distance: result.distance, duration: result.duration});
      } else {
        // Fallback to straight lines if OSRM fails
        setRoadCoords(routeWaypoints);
        setRouteInfo(null);
      }
    })();
    return () => { cancelled = true; };
  }, [routeWaypoints]);

  // ── Stats ───────────────────────────────────
  const activeCount = useMemo(
    () => orders.filter((o) => ['assigned', 'picked_up', 'in_transit'].includes(o.status)).length,
    [orders],
  );
  const assignedCount = useMemo(
    () => orders.filter((o) => o.status === 'assigned').length,
    [orders],
  );

  const summary = route?.summary;
  const completedCount = parseInt(summary?.completed_today || progress?.delivered || '0', 10);
  const totalCount = parseInt(summary?.total_active_orders || progress?.total_orders || '0', 10)
    + completedCount;

  // ── Map interactions ────────────────────────
  const onMapPress = useCallback(() => {
    if (selectedStop) dismissSheet();
  }, [selectedStop, dismissSheet]);

  const onStopPress = useCallback(
    (stop) => {
      setSelectedStop(stop);
      showSheet();
      const lat = toNum(stop.lat || stop.recipient_lat);
      const lng = toNum(stop.lng || stop.recipient_lng);
      if (mapRef.current && isValidCoord(lat, lng)) {
        mapRef.current.animateToRegion(
          {latitude: lat, longitude: lng, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA},
          400,
        );
      }
    },
    [showSheet],
  );

  const recenter = useCallback(() => {
    if (!currentPosition || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      400,
    );
  }, [currentPosition]);

  const fitAll = useCallback(() => {
    if (!mapRef.current || mapStops.length === 0) return;
    const coords = mapStops.map((s) => ({
      latitude: toNum(s.lat) || toNum(s.recipient_lat),
      longitude: toNum(s.lng) || toNum(s.recipient_lng),
    })).filter((c) => isValidCoord(c.latitude, c.longitude));
    if (currentPosition) {
      coords.push({latitude: currentPosition.latitude, longitude: currentPosition.longitude});
    }
    if (coords.length === 0) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: {top: 100, right: 60, bottom: 320, left: 60},
      animated: true,
    });
  }, [mapStops, currentPosition]);

  // ── Status toggle (fixed B-1, B-7) ─────────
  const cycleStatus = useCallback(() => {
    // For 'busy' (auto-set by backend), next step is on_break
    const effectiveStatus = driverStatus === 'busy' ? 'available' : driverStatus;
    const idx = DRIVER_STATUSES.indexOf(effectiveStatus);
    const next = DRIVER_STATUSES[(idx + 1) % DRIVER_STATUSES.length];
    const nextLabel = t(STATUS_LABELS[next]);

    Alert.alert(
      t('map.statusChange'),
      t('map.statusChangeMsg', {status: nextLabel}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.confirm'),
          onPress: async () => {
            let result;
            if (next === 'available') result = await goOnline();
            else if (next === 'offline') result = await goOffline();
            else result = await onBreak();
            if (result && !result.success) {
              Alert.alert(t('common.error'), result.error || 'Failed');
            }
          },
        },
      ],
    );
  }, [driverStatus, goOnline, goOffline, onBreak, t]);

  // ── Start Trip ──────────────────────────────
  const handleStartTrip = useCallback(() => {
    if (!currentPosition) return;
    const assigned = orders.filter((o) => o.status === 'assigned');
    Alert.alert(
      t('map.startTrip'),
      t('map.startTripMsg', {count: assigned.length}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await Promise.all(
                assigned.map((o) =>
                  startDelivery(o.id, {
                    lat: currentPosition.latitude,
                    lng: currentPosition.longitude,
                  }),
                ),
              );
              loadAll(true);
            } catch (e) {
              Alert.alert(t('common.error'), e?.message || 'Failed to start trip');
            }
          },
        },
      ],
    );
  }, [startDelivery, orders, currentPosition, loadAll, t]);

  // ── Navigate to stop (external maps) ────────
  const handleNavigate = useCallback(
    (stop) => {
      const lat = toNum(stop.lat || stop.recipient_lat);
      const lng = toNum(stop.lng || stop.recipient_lng);
      if (!isValidCoord(lat, lng)) return;
      const label = encodeURIComponent(stop.contact_name || stop.recipient_name || 'Delivery');
      const url =
        Platform.OS === 'ios'
          ? `maps:?daddr=${lat},${lng}&q=${label}`
          : `google.navigation:q=${lat},${lng}`;
      Linking.openURL(url).catch(() => {});
    },
    [],
  );

  // ── View order detail ───────────────────────
  const handleViewDetail = useCallback(
    (stop) => {
      dismissSheet();
      navigation.navigate(routeNames.OrderDetail, {
        orderId: stop.order_id || stop.id,
        token: stop.tracking_token || stop.order_number,
      });
    },
    [dismissSheet, navigation],
  );

  // ── Initial region (fixed B-3) ──────────────
  const initialRegion = useMemo(() => {
    if (currentPosition) {
      return {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: LATITUDE_DELTA * 2,
        longitudeDelta: LONGITUDE_DELTA * 2,
      };
    }
    return {latitude: 24.4539, longitude: 54.3773, latitudeDelta: 0.1, longitudeDelta: 0.1};
  }, [currentPosition?.latitude, currentPosition?.longitude]);

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <View style={$.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={onMapPress}
        rotateEnabled={false}>

        {/* Custom driver marker */}
        {currentPosition && (
          <DriverMarker position={currentPosition} />
        )}

        {/* Delivery/Pickup stop markers */}
        {mapStops.map((stop, idx) => (
          <StopMarker
            key={`stop-${stop.stop_type || 'd'}-${stop.order_id || stop.id || idx}-${idx}`}
            stop={stop}
            index={idx}
            isSelected={
              selectedStop &&
              (selectedStop.order_id || selectedStop.id) === (stop.order_id || stop.id)
            }
            onPress={onStopPress}
            isPickup={stop.stop_type === 'pickup'}
          />
        ))}

        {/* Road-following route polyline */}
        {roadCoords.length >= 2 && (
          <Polyline
            coordinates={roadCoords}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* Top bar */}
      <MapTopBar
        driverStatus={driverStatus}
        onStatusPress={cycleStatus}
        activeCount={activeCount}
        completedCount={completedCount}
        totalCount={totalCount}
        t={t}
      />

      {/* Loading overlay */}
      {(initialLoad || isRefreshing) && (
        <View style={[$.loadOverlay, {top: ins.top + 52}]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={$.loadText}>
            {initialLoad ? 'Loading map...' : 'Refreshing...'}
          </Text>
        </View>
      )}

      {/* FABs column */}
      <View style={[$.fabCol, {top: ins.top + 56}]}>
        <TouchableOpacity style={$.fab} onPress={recenter} activeOpacity={0.8}>
          <Icon name="crosshairs-gps" size={18} color={colors.primary} />
        </TouchableOpacity>

        {mapStops.length > 0 && (
          <TouchableOpacity style={$.fab} onPress={fitAll} activeOpacity={0.8}>
            <Icon name="fit-to-screen-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={$.fab}
          onPress={() => loadAll(true)}
          activeOpacity={0.8}>
          <Icon name="refresh" size={18} color={isRefreshing ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Start Trip FAB */}
      {assignedCount > 0 && !selectedStop && (
        <TouchableOpacity
          style={[$.startTrip, {bottom: ins.bottom + 16}]}
          onPress={handleStartTrip}
          disabled={isUpdatingStatus}
          activeOpacity={0.8}>
          <Icon name="play-circle-outline" size={18} color={colors.white} />
          <Text style={$.startTripText}>
            {t('map.startTrip')} ({assignedCount})
          </Text>
        </TouchableOpacity>
      )}

      {/* Route summary banner */}
      {!initialLoad && summary && !selectedStop && assignedCount === 0 && (
        <View style={[$.summaryBanner, {bottom: ins.bottom + 16}]}>
          <View style={$.summaryRow}>
            <View style={$.summaryItem}>
              <Text style={$.summaryNum}>{summary.remaining_stops || 0}</Text>
              <Text style={$.summaryLabel}>Remaining</Text>
            </View>
            <View style={[$.summaryDiv]} />
            <View style={$.summaryItem}>
              <Text style={[$.summaryNum, {color: colors.success}]}>{summary.completed_today || 0}</Text>
              <Text style={$.summaryLabel}>Completed</Text>
            </View>
            <View style={[$.summaryDiv]} />
            <View style={$.summaryItem}>
              <Text style={[$.summaryNum, {color: colors.warning}]}>
                {parseFloat(summary.pending_cod || 0).toFixed(0)}
              </Text>
              <Text style={$.summaryLabel}>COD (AED)</Text>
            </View>
          </View>
        </View>
      )}

      {/* Empty state */}
      {!initialLoad && mapStops.length === 0 && !selectedStop && (
        <View style={[$.emptyBanner, {bottom: ins.bottom + 16}]}>
          <Icon name="map-marker-off-outline" size={18} color={colors.textMuted} />
          <Text style={$.emptyText}>{t('map.noDeliveries')}</Text>
        </View>
      )}

      {/* Bottom sheet */}
      <OrderSheet
        stop={selectedStop}
        driverPosition={currentPosition}
        sheetY={sheetY}
        panHandlers={panResponder.panHandlers}
        onDismiss={dismissSheet}
        onNavigate={handleNavigate}
        onViewDetail={handleViewDetail}
        haversine={haversine}
        estimateETA={estimateETA}
        t={t}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────
const $ = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgScreen,
  },

  // Loading
  loadOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  loadText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // FABs
  fabCol: {
    position: 'absolute',
    right: 14,
    gap: 8,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Start Trip
  startTrip: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 26,
    gap: 8,
    shadowColor: colors.success,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startTripText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.white,
  },

  // Route summary banner
  summaryBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNum: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  summaryLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryDiv: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  // Empty
  emptyBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

export default MapScreen;
