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
import MapView, {Polyline, Polygon} from 'react-native-maps';
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
import useStopsStore from '../../store/stopsStore';
import {fetchRoadRouteChunked, fetchOptimizedRoute, fetchNavigationRoute} from '../../utils/routing';
import {settingsApi} from '../../api';
import useSettingsStore from '../../store/settingsStore';

import {DriverMarker, StopMarker, MapTopBar, OrderSheet, TripPreview, NavigationOverlay} from './components';

const {height: SH} = Dimensions.get('window');
const SHEET_HEIGHT = 320;
const LATITUDE_DELTA = 0.015;
const LONGITUDE_DELTA = 0.015;
const TAB_BAR_HEIGHT = 90; // floating tab bar + safe area

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
  const currency = useSettingsStore(s => s.currency);
  const companyLat = useSettingsStore(s => s.companyLat);
  const companyLng = useSettingsStore(s => s.companyLng);
  const mapRef = useRef(null);

  // ── Stores ──────────────────────────────────
  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const acceptOrder = useOrderStore((s) => s.acceptOrder);
  const startDelivery = useOrderStore((s) => s.startDelivery);
  const isUpdatingStatus = useOrderStore((s) => s.isUpdatingStatus);

  const currentPosition = useLocationStore((s) => s.currentPosition);
  const driverStatus = useLocationStore((s) => s.driverStatus);
  const goOnline = useLocationStore((s) => s.goOnline);
  const goOffline = useLocationStore((s) => s.goOffline);
  const onBreak = useLocationStore((s) => s.onBreak);
  const setEtaNextStop = useLocationStore((s) => s.setEtaNextStop);

  const route = useRouteStore((s) => s.route);
  const progress = useRouteStore((s) => s.progress);
  const fetchRoute = useRouteStore((s) => s.fetchRoute);
  const fetchProgress = useRouteStore((s) => s.fetchProgress);
  const reoptimize = useRouteStore((s) => s.reoptimize);
  const optimizedCoords = useRouteStore((s) => s.optimizedCoords);
  const optimizedRouteInfo = useRouteStore((s) => s.optimizedRouteInfo);
  const clearOptimized = useRouteStore((s) => s.clearOptimized);

  const needsReoptimize = useStopsStore((s) => s.needsReoptimize);
  const clearReoptimize = useStopsStore((s) => s.clearReoptimize);

  // ── Local state ─────────────────────────────
  const [selectedStop, setSelectedStop] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [roadCoords, setRoadCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null); // {distance, duration}
  const [showTripPreview, setShowTripPreview] = useState(false);

  // ── Navigation mode state ───────────────────
  const [navMode, setNavMode] = useState(false);
  const [navStop, setNavStop] = useState(null);
  const [navRoute, setNavRoute] = useState([]);
  const [navSteps, setNavSteps] = useState([]);
  const [navDistance, setNavDistance] = useState(0);
  const [navDuration, setNavDuration] = useState(0);
  const navRefreshTimer = useRef(null);

  // ── Zone polygons ──────────────────────────
  const [zones, setZones] = useState([]);
  const [showZones, setShowZones] = useState(false);

  // ── Map display options ─────────────────────
  const [mapType, setMapType] = useState('standard'); // 'standard' | 'satellite' | 'hybrid'
  const [showTraffic, setShowTraffic] = useState(false);

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
      }
    },
    [fetchOrders, fetchRoute, fetchProgress],
  );

  // Refetch on tab focus — pass isRefresh=true after initial load so
  // orders reset to page 1 and the UI shows the refreshing indicator.
  const hasLoadedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasLoadedOnce.current) {
        loadAll(true);
      } else {
        hasLoadedOnce.current = true;
        loadAll().then(() => setInitialLoad(false));
      }
    }, [loadAll]),
  );

  // Fetch zones once
  useEffect(() => {
    let cancelled = false;
    settingsApi.getZones().then((res) => {
      if (cancelled) return;
      const data = res.data?.data || res.data;
      const items = data?.zones || data || [];
      setZones(Array.isArray(items) ? items : []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ── Build an order lookup for enriching route stops ──
  const orderById = useMemo(() => {
    const map = {};
    for (const o of orders) {
      map[o.id] = o;
    }
    return map;
  }, [orders]);

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
  // Enrich with latest order data, then split into active vs completed
  const allStops = useMemo(() => {
    let stops;
    if (routeStops.length > 0) {
      // Enrich route stops with real order status & extra fields
      stops = routeStops.map((s) => {
        const order = orderById[s.order_id];
        if (!order) return s;
        return {
          ...s,
          // Use real order status for coloring
          stop_status: order.status,
          // Merge useful fields from order if missing on route stop
          payment_method: s.payment_method || order.payment_method,
          cod_amount: s.cod_amount || order.cod_amount,
          special_instructions: s.special_instructions || order.special_instructions,
          total_packages: order.total_packages,
          order_number: s.order_number || order.order_number,
          tracking_token: s.tracking_token || order.tracking_token,
        };
      });
    } else {
      // Fallback to active orders
      stops = orders
        .filter((o) => ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(o.status))
        .filter((o) => isValidCoord(toNum(o.recipient_lat), toNum(o.recipient_lng)))
        .map((o) => ({
          ...o,
          lat: o.recipient_lat,
          lng: o.recipient_lng,
          contact_name: o.recipient_name,
          contact_phone: o.recipient_phone,
          address: o.recipient_address,
          area: o.recipient_area,
          stop_status: o.status,
          stop_type: 'delivery',
        }));
    }
    return stops;
  }, [routeStops, orders, orderById]);

  // Active stops only (exclude completed/failed/delivered/cancelled)
  const INACTIVE_STATUSES = ['completed', 'delivered', 'failed', 'returned', 'cancelled'];
  const mapStops = useMemo(() => {
    const active = allStops.filter(
      (s) => !INACTIVE_STATUSES.includes(s.stop_status || s.status || 'pending'),
    );
    // Assign fresh sequential numbers to active stops only
    return active.map((s, idx) => ({...s, sequence_number: idx + 1}));
  }, [allStops]);

  // Completed/failed stops (shown dimmed on map)
  const completedStops = useMemo(() => {
    return allStops.filter(
      (s) => INACTIVE_STATUSES.includes(s.stop_status || s.status || 'pending'),
    );
  }, [allStops]);

  // The very next stop to deliver (sequence #1 among active deliveries)
  const nextStopId = useMemo(() => {
    const next = mapStops.find(
      (s) => s.stop_type === 'delivery' && !INACTIVE_STATUSES.includes(s.stop_status || 'pending'),
    );
    return next ? (next.order_id || next.id) : null;
  }, [mapStops]);

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

  // ── Check for stored route polyline from backend (avoids OSRM call) ──
  const storedPolyline = useMemo(() => {
    // Look for route_polyline in any active order
    const activeOrders = orders.filter((o) =>
      ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(o.status),
    );
    // For single active order, use its stored polyline directly
    if (activeOrders.length === 1 && activeOrders[0].route_polyline) {
      const poly = activeOrders[0].route_polyline;
      if (Array.isArray(poly) && poly.length >= 2) {
        return poly.map((p) => ({
          latitude: p.lat || p[0] || p.latitude,
          longitude: p.lng || p[1] || p.longitude,
        })).filter((c) => isValidCoord(c.latitude, c.longitude));
      }
    }
    return null;
  }, [orders]);

  // ── Fetch optimized road-following route from OSRM ──
  const lastWpKey = useRef('');
  useEffect(() => {
    if (routeWaypoints.length < 2) {
      setRoadCoords([]);
      setRouteInfo(null);
      return;
    }

    // Use stored polyline from backend if available (instant load)
    if (storedPolyline && storedPolyline.length >= 2) {
      setRoadCoords(storedPolyline);
      // RouteInfo not available from stored polyline, keep previous or null
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
      try {
        // Try optimized route first (TSP), then fall back to ordered route
        let result = routeWaypoints.length <= 25
          ? await fetchOptimizedRoute(routeWaypoints)
          : null;
        if (!result) {
          result = await fetchRoadRouteChunked(routeWaypoints);
        }
        if (cancelled) return;
        if (result) {
          setRoadCoords(result.coordinates);
          setRouteInfo({distance: result.distance, duration: result.duration});
        } else {
          // Fallback to straight lines if OSRM fails
          setRoadCoords(routeWaypoints);
          setRouteInfo(null);
        }
      } catch {
        if (!cancelled) {
          setRoadCoords(routeWaypoints);
          setRouteInfo(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [routeWaypoints]);

  // ── Re-optimize when a stop is completed/failed/skipped ──
  useEffect(() => {
    if (!needsReoptimize || !currentPosition) return;

    // Get remaining pending waypoints (exclude driver position at index 0)
    const remaining = routeWaypoints.slice(1);
    if (remaining.length >= 1) {
      reoptimize(currentPosition, remaining);
    }
    clearReoptimize();
  }, [needsReoptimize, currentPosition, routeWaypoints, reoptimize, clearReoptimize]);

  // Apply reoptimized route from store
  useEffect(() => {
    if (optimizedCoords && optimizedCoords.length >= 2) {
      setRoadCoords(optimizedCoords);
      if (optimizedRouteInfo) {
        setRouteInfo(optimizedRouteInfo);
      }
      clearOptimized();
      // Reset waypoint key so normal waypoint changes still trigger fresh fetch
      lastWpKey.current = '';
    }
  }, [optimizedCoords, optimizedRouteInfo, clearOptimized]);

  // ── Stats ───────────────────────────────────
  const activeCount = useMemo(
    () => orders.filter((o) => ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(o.status)).length,
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
    // Only zoom to active (remaining) stops, not completed ones
    const coords = mapStops.map((s) => ({
      latitude: toNum(s.lat) || toNum(s.recipient_lat),
      longitude: toNum(s.lng) || toNum(s.recipient_lng),
    })).filter((c) => isValidCoord(c.latitude, c.longitude));
    if (currentPosition) {
      coords.push({latitude: currentPosition.latitude, longitude: currentPosition.longitude});
    }
    if (coords.length === 0) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: {top: 100, right: 60, bottom: TAB_BAR_HEIGHT + 120, left: 60},
      animated: true,
    });
  }, [mapStops, currentPosition]);

  // ── Zoom controls ──────────────────────────
  const zoomIn = useCallback(() => {
    mapRef.current?.getCamera?.().then((cam) => {
      if (!cam) return;
      if (Platform.OS === 'ios') {
        mapRef.current.animateCamera(
          {...cam, altitude: (cam.altitude || 10000) / 2},
          {duration: 200},
        );
      } else {
        mapRef.current.animateCamera(
          {...cam, zoom: (cam.zoom || 15) + 1},
          {duration: 200},
        );
      }
    }).catch(() => {});
  }, []);

  const zoomOut = useCallback(() => {
    mapRef.current?.getCamera?.().then((cam) => {
      if (!cam) return;
      if (Platform.OS === 'ios') {
        mapRef.current.animateCamera(
          {...cam, altitude: Math.min((cam.altitude || 10000) * 2, 500000)},
          {duration: 200},
        );
      } else {
        mapRef.current.animateCamera(
          {...cam, zoom: Math.max((cam.zoom || 15) - 1, 3)},
          {duration: 200},
        );
      }
    }).catch(() => {});
  }, []);

  const toggleMapType = useCallback(() => {
    setMapType((prev) => {
      if (prev === 'standard') return 'satellite';
      if (prev === 'satellite') return 'hybrid';
      return 'standard';
    });
  }, []);

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
            try {
              let result;
              if (next === 'available') result = await goOnline();
              else if (next === 'offline') result = await goOffline();
              else result = await onBreak();
              if (result && !result.success) {
                Alert.alert(t('common.error'), result.error || t('common.failed'));
              }
            } catch (e) {
              Alert.alert(t('common.error'), e?.message || t('common.failed'));
            }
          },
        },
      ],
    );
  }, [driverStatus, goOnline, goOffline, onBreak, t]);

  // ── Start Trip (opens preview modal) ─────
  const handleStartTrip = useCallback(() => {
    setShowTripPreview(true);
  }, []);

  const handleStartOneOrder = useCallback(
    async (order) => {
      const status = order.status;

      if (status === 'assigned') {
        const result = await acceptOrder(order.id);
        if (result?.success) {
          loadAll(true);
        } else {
          Alert.alert(t('common.error'), result?.error || t('map.failedAcceptOrder'));
        }
        return;
      }

      if (status === 'accepted') {
        navigation.navigate(routeNames.OrderDetail, {
          orderId: order.id,
          token: order.tracking_token,
          orderNumber: order.order_number,
        });
        return;
      }

      if (status === 'picked_up') {
        if (!currentPosition) {
          Alert.alert(t('common.error'), t('map.locationRequired'));
          return;
        }
        const result = await startDelivery(order.id, {
          lat: currentPosition.latitude,
          lng: currentPosition.longitude,
        });
        if (result?.success) {
          loadAll(true);
        } else {
          Alert.alert(t('common.error'), result?.error || t('map.failedStartDelivery'));
        }
        return;
      }

      // Fallback: go to order detail
      navigation.navigate(routeNames.OrderDetail, {
        orderId: order.id,
        token: order.tracking_token,
        orderNumber: order.order_number,
      });
    },
    [acceptOrder, startDelivery, currentPosition, loadAll, navigation, t],
  );

  const handleStartAllOrders = useCallback(
    async (orderedList) => {
      // Backend order lifecycle: assigned → accept → accepted → pickup confirm → picked_up → start-delivery → in_transit
      // "Start All" accepts assigned orders and starts delivery for picked_up.
      // Accepted orders need pickup first (driver must scan/collect packages).
      const toAccept = orderedList.filter(o => o.status === 'assigned');
      const toStart = orderedList.filter(o => o.status === 'picked_up');

      if (toAccept.length === 0 && toStart.length === 0) {
        Alert.alert(t('common.error'), t('map.noActionableOrders'));
        return;
      }

      if (toStart.length > 0 && !currentPosition) {
        Alert.alert(t('common.error'), t('map.locationRequired'));
        return;
      }

      const locData = currentPosition
        ? {lat: currentPosition.latitude, lng: currentPosition.longitude}
        : {};
      let failCount = 0;

      // Step 1: Accept all assigned orders
      const acceptResults = await Promise.all(
        toAccept.map(o => acceptOrder(o.id)),
      );
      failCount += acceptResults.filter(r => !r?.success).length;

      // Step 2: Start delivery for picked_up orders
      if (toStart.length > 0) {
        const startResults = await Promise.all(
          toStart.map(o => startDelivery(o.id, locData)),
        );
        failCount += startResults.filter(r => !r?.success).length;
      }

      setShowTripPreview(false);
      // Small delay so Modal fully unmounts before MapView re-renders
      setTimeout(() => loadAll(true), 300);

      const acceptedCount = acceptResults.filter(r => r?.success).length;

      if (failCount > 0) {
        Alert.alert(
          t('common.error'),
          t('map.someOrdersFailed', {count: failCount}),
        );
      } else if (acceptedCount > 0 && toStart.length === 0) {
        Alert.alert(
          t('common.success'),
          t('map.ordersAccepted', {count: acceptedCount}),
        );
      }
    },
    [acceptOrder, startDelivery, currentPosition, loadAll, t],
  );

  // ── Navigate to stop (external maps) ────────
  const handleExternalNav = useCallback(
    (stop) => {
      const lat = toNum(stop.lat || stop.recipient_lat);
      const lng = toNum(stop.lng || stop.recipient_lng);
      if (!isValidCoord(lat, lng)) return;
      const label = encodeURIComponent(stop.contact_name || stop.recipient_name || t('map.deliveryPoint'));
      const url =
        Platform.OS === 'ios'
          ? `maps:?daddr=${lat},${lng}&q=${label}`
          : `google.navigation:q=${lat},${lng}`;
      Linking.openURL(url).catch(() => {});
    },
    [],
  );

  // ── In-app Navigation mode ──────────────────
  const fetchNavRoute = useCallback(
    async (stop) => {
      if (!currentPosition) return;
      const lat = toNum(stop.lat || stop.recipient_lat);
      const lng = toNum(stop.lng || stop.recipient_lng);
      if (!isValidCoord(lat, lng)) return;

      const result = await fetchNavigationRoute(
        {latitude: currentPosition.latitude, longitude: currentPosition.longitude},
        {latitude: lat, longitude: lng},
      );
      if (result) {
        setNavRoute(result.coordinates);
        setNavSteps(result.steps || []);
        setNavDistance(result.distance || 0);
        setNavDuration(result.duration || 0);
        // Broadcast ETA to backend via location pings
        setEtaNextStop((result.duration || 0) / 60);
      } else {
        // Fallback to straight line
        setNavRoute([
          {latitude: currentPosition.latitude, longitude: currentPosition.longitude},
          {latitude: lat, longitude: lng},
        ]);
        setNavSteps([]);
        const dist = haversine(currentPosition.latitude, currentPosition.longitude, lat, lng);
        setNavDistance(dist * 1000);
        setNavDuration(estimateETA(dist) * 60);
        setEtaNextStop(estimateETA(dist));
      }
    },
    [currentPosition, setEtaNextStop],
  );

  const handleNavigate = useCallback(
    (stop) => {
      dismissSheet();
      setNavStop(stop);
      setNavMode(true);
      fetchNavRoute(stop);

      // Zoom to stop
      const lat = toNum(stop.lat || stop.recipient_lat);
      const lng = toNum(stop.lng || stop.recipient_lng);
      if (mapRef.current && currentPosition && isValidCoord(lat, lng)) {
        mapRef.current.fitToCoordinates(
          [
            {latitude: currentPosition.latitude, longitude: currentPosition.longitude},
            {latitude: lat, longitude: lng},
          ],
          {edgePadding: {top: 180, right: 60, bottom: 280, left: 60}, animated: true},
        );
      }
    },
    [dismissSheet, fetchNavRoute, currentPosition],
  );

  const handleEndNav = useCallback(() => {
    setNavMode(false);
    setNavStop(null);
    setNavRoute([]);
    setNavSteps([]);
    setNavDistance(0);
    setNavDuration(0);
    setEtaNextStop(null);
    if (navRefreshTimer.current) clearInterval(navRefreshTimer.current);
  }, [setEtaNextStop]);

  // Auto-update nav route as driver moves (every 15 s)
  useEffect(() => {
    if (!navMode || !navStop) return;
    if (navRefreshTimer.current) clearInterval(navRefreshTimer.current);
    navRefreshTimer.current = setInterval(() => {
      fetchNavRoute(navStop);
    }, 15000);
    return () => {
      if (navRefreshTimer.current) clearInterval(navRefreshTimer.current);
    };
  }, [navMode, navStop, fetchNavRoute]);

  // Recenter on driver while in nav mode when position changes
  useEffect(() => {
    if (!navMode || !currentPosition || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      300,
    );
  }, [navMode, currentPosition?.latitude, currentPosition?.longitude]);

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
    return {latitude: companyLat || 24.4539, longitude: companyLng || 54.3773, latitudeDelta: 0.1, longitudeDelta: 0.1};
  }, [currentPosition?.latitude, currentPosition?.longitude, companyLat, companyLng]);

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
        mapType={mapType}
        showsTraffic={showTraffic}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={onMapPress}
        rotateEnabled={false}>

        {/* Custom driver marker */}
        {currentPosition && (
          <DriverMarker position={currentPosition} />
        )}

        {/* Completed/failed stop markers (dimmed) */}
        {completedStops.map((stop, idx) => (
          <StopMarker
            key={`done-${stop.stop_id || stop.order_id || stop.id || idx}-${stop.stop_type || 'd'}`}
            stop={stop}
            index={idx}
            isSelected={
              selectedStop &&
              (selectedStop.order_id || selectedStop.id) === (stop.order_id || stop.id)
            }
            onPress={onStopPress}
            isPickup={stop.stop_type === 'pickup'}
            dimmed
          />
        ))}

        {/* Active delivery/pickup stop markers */}
        {mapStops.map((stop, idx) => (
          <StopMarker
            key={`stop-${stop.stop_id || stop.order_id || stop.id || idx}-${stop.stop_type || 'd'}`}
            stop={stop}
            index={idx}
            isSelected={
              selectedStop &&
              (selectedStop.order_id || selectedStop.id) === (stop.order_id || stop.id)
            }
            onPress={onStopPress}
            isPickup={stop.stop_type === 'pickup'}
            isNext={(stop.order_id || stop.id) === nextStopId}
          />
        ))}

        {/* Road-following route polyline */}
        {!navMode && roadCoords.length >= 2 && (
          <Polyline
            coordinates={roadCoords}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Navigation mode route polyline */}
        {navMode && navRoute.length >= 2 && (
          <Polyline
            coordinates={navRoute}
            strokeColor={colors.success}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Zone polygons — filter before map to avoid returning null inside MapView
             (null children cause RCTUIManager removedChildren count mismatch on iOS) */}
        {showZones && zones
          .filter((zone) => {
            const pts = zone.polygon || zone.coordinates || [];
            return pts.filter((p) => {
              const lat = p.lat || p[0] || p.latitude;
              const lng = p.lng || p[1] || p.longitude;
              return isValidCoord(lat, lng);
            }).length >= 3;
          })
          .map((zone) => {
            const coords = (zone.polygon || zone.coordinates || [])
              .map((p) => ({
                latitude: p.lat || p[0] || p.latitude,
                longitude: p.lng || p[1] || p.longitude,
              }))
              .filter((c) => isValidCoord(c.latitude, c.longitude));
            const zoneColor = zone.color || (zone.type === 'restricted' ? '#FF000040' : '#4CAF5040');
            const strokeColor = zone.color
              ? zone.color.replace(/[0-9a-f]{2}$/i, 'AA')
              : (zone.type === 'restricted' ? '#FF0000AA' : '#4CAF50AA');
            return (
              <Polygon
                key={`zone-${zone.id}`}
                coordinates={coords}
                fillColor={zoneColor}
                strokeColor={strokeColor}
                strokeWidth={1.5}
              />
            );
          })}
      </MapView>

      {/* ── Normal mode overlays ── */}
      {!navMode && (
        <>
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
                {initialLoad ? t('map.loadingMap') : t('map.refreshing')}
              </Text>
            </View>
          )}

          {/* FABs column */}
          <View style={[$.fabCol, {top: ins.top + (navMode ? 120 : 80)}]}>
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

            {zones.length > 0 && (
              <TouchableOpacity
                style={[$.fab, showZones && {backgroundColor: colors.primary}]}
                onPress={() => setShowZones(prev => !prev)}
                activeOpacity={0.8}>
                <Icon name="layers-outline" size={18} color={showZones ? colors.white : colors.primary} />
              </TouchableOpacity>
            )}

            {/* Map type toggle */}
            <TouchableOpacity
              style={[$.fab, mapType !== 'standard' && {backgroundColor: colors.primary}]}
              onPress={toggleMapType}
              activeOpacity={0.8}>
              <Icon
                name={mapType === 'satellite' ? 'satellite-variant' : mapType === 'hybrid' ? 'layers' : 'map-outline'}
                size={18}
                color={mapType !== 'standard' ? colors.white : colors.primary}
              />
            </TouchableOpacity>

            {/* Traffic toggle */}
            <TouchableOpacity
              style={[$.fab, showTraffic && {backgroundColor: colors.warning}]}
              onPress={() => setShowTraffic(prev => !prev)}
              activeOpacity={0.8}>
              <Icon name="car-multiple" size={18} color={showTraffic ? colors.white : colors.primary} />
            </TouchableOpacity>

            {/* Zoom controls */}
            <View style={$.zoomDivider} />
            <TouchableOpacity style={$.fab} onPress={zoomIn} activeOpacity={0.8}>
              <Icon name="plus" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={$.fab} onPress={zoomOut} activeOpacity={0.8}>
              <Icon name="minus" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

      {/* Start Trip FAB */}
      {assignedCount > 0 && !selectedStop && (
        <TouchableOpacity
          style={[$.startTrip, {bottom: TAB_BAR_HEIGHT + 16}]}
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
        <View style={[$.summaryBanner, {bottom: TAB_BAR_HEIGHT + 16}]}>
          <View style={$.summaryRow}>
            <View style={$.summaryItem}>
              <Text style={$.summaryNum}>{summary.remaining_stops || 0}</Text>
              <Text style={$.summaryLabel}>{t('map.remaining')}</Text>
            </View>
            <View style={[$.summaryDiv]} />
            <View style={$.summaryItem}>
              <Text style={[$.summaryNum, {color: colors.success}]}>{summary.completed_today || 0}</Text>
              <Text style={$.summaryLabel}>{t('map.completed')}</Text>
            </View>
            <View style={[$.summaryDiv]} />
            <View style={$.summaryItem}>
              <Text style={[$.summaryNum, {color: colors.warning}]}>
                {parseFloat(summary.pending_cod || 0).toFixed(0)}
              </Text>
              <Text style={$.summaryLabel}>{t('map.codAed', {currency})}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Empty state — only show if no summary banner is already visible */}
      {!initialLoad && mapStops.length === 0 && !selectedStop && !(summary && assignedCount === 0) && (
        <View style={[$.emptyBanner, {bottom: TAB_BAR_HEIGHT + 16}]}>
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
        </>
      )}

      {/* ── Navigation mode overlay ── */}
      {navMode && (
        <>
          {/* Zoom controls during nav */}
          <View style={[$.fabCol, {top: ins.top + 90}]}>
            <TouchableOpacity style={$.fab} onPress={recenter} activeOpacity={0.8}>
              <Icon name="crosshairs-gps" size={18} color={colors.primary} />
            </TouchableOpacity>
            <View style={$.zoomDivider} />
            <TouchableOpacity style={$.fab} onPress={zoomIn} activeOpacity={0.8}>
              <Icon name="plus" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={$.fab} onPress={zoomOut} activeOpacity={0.8}>
              <Icon name="minus" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <NavigationOverlay
            stop={navStop}
            steps={navSteps}
            distance={navDistance}
            duration={navDuration}
            onEndNav={handleEndNav}
            onOpenExternal={() => navStop && handleExternalNav(navStop)}
            onViewDetail={(stop) => {
              handleEndNav();
              handleViewDetail(stop);
            }}
            t={t}
          />
        </>
      )}

      {/* Trip Preview Modal */}
      <TripPreview
        visible={showTripPreview}
        orders={orders}
        driverPosition={currentPosition}
        onStartOne={handleStartOneOrder}
        onStartAll={handleStartAllOrders}
        onClose={() => setShowTripPreview(false)}
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
    marginStart: 8,
  },

  // FABs
  fabCol: {
    position: 'absolute',
    end: 14,
  },
  fab: {
    width: 42,
    height: 42,
    marginBottom: 14,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomDivider: {
    width: 24,
    height: 1,
    backgroundColor: colors.border,
    alignSelf: 'center',
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
    marginStart: 8,
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
    marginStart: 6,
  },
});

export default MapScreen;
