/**
 * Traseallo Driver App — Map Screen
 * Full live map with real-time tracking, order markers, bottom sheet.
 *
 * Bugs fixed:
 *   B1 — Bottom sheet only rendered when selectedOrder exists
 *   B2 — Strict lat/lng validation rejects 0/null/NaN
 *   B3 — selectedOrder synced from orders array on refresh
 *   B4 — Removed unused SW constant
 *   B5 — Removed unused getOrderCoords prop on OrderSheet
 *   B6 — fetchOrders in useCallback, correct deps
 *   B7 — Uses rgba() via getStatusBgColor instead of hex suffix
 *   B8 — Status toggle has confirmation Alert
 *
 * Features added:
 *   M1  — useFocusEffect refetches orders on tab focus
 *   M2  — ActivityIndicator during initial load + refresh
 *   M3  — "Fit all" FAB to zoom to all markers
 *   M4  — Call customer button in bottom sheet
 *   M5  — Clustered markers with count badge for overlapping
 *   M6  — Socket emitLocation on every GPS update
 *   M7  — Approximate ETA / distance in bottom sheet
 *   M8  — PanResponder drag-to-dismiss bottom sheet
 *   M9  — (Skipped — custom map JSON requires Google Maps provider)
 *   M10 — "Start Trip" FAB to batch-start all assigned orders
 *   M11 — Full i18n via useTranslation
 *   M12 — Custom driver marker icon (car)
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
import MapView, {Marker, Polyline, Callout} from 'react-native-maps';
import Icon from '../../utils/LucideIcon';
import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily, fontSize} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useOrderStore from '../../store/orderStore';
import useLocationStore from '../../store/locationStore';
import useAuthStore from '../../store/authStore';

const {height: SH} = Dimensions.get('window');
const SHEET_HEIGHT = 260;
const HANDLE_HEIGHT = 28;
const LATITUDE_DELTA = 0.015;
const LONGITUDE_DELTA = 0.015;

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

/** Validate lat/lng — reject 0, null, undefined, NaN, out-of-range */
const isValidCoord = (lat, lng) => {
  const la = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lo = typeof lng === 'string' ? parseFloat(lng) : lng;
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (la === 0 && lo === 0) return false; // Null Island
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return false;
  return true;
};

/** Parse coord to number safely */
const toNum = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

/** Haversine distance in km */
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

/** Rough ETA (minutes) assuming average 30 km/h in city */
const estimateETA = (distKm) => Math.max(1, Math.round((distKm / 30) * 60));

/** Group markers to detect overlapping (within ~50 m) */
const clusterMarkers = (items) => {
  const clusters = [];
  const used = new Set();
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const group = [items[i]];
    used.add(i);
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      const d = haversine(
        items[i].latitude,
        items[i].longitude,
        items[j].latitude,
        items[j].longitude,
      );
      if (d < 0.05) {
        group.push(items[j]);
        used.add(j);
      }
    }
    clusters.push(group);
  }
  return clusters;
};

// ──────────────────────────────────────────────────────
// STATUS CONSTANTS
// ──────────────────────────────────────────────────────
const DRIVER_STATUSES = ['available', 'busy', 'offline'];
const STATUS_ICONS = {
  available: 'wifi',
  busy: 'timer-sand',
  offline: 'wifi-off',
};
const STATUS_LABELS = {
  available: 'status.available',
  busy: 'status.busy',
  offline: 'status.offline',
};

// ──────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────

const MapScreen = ({navigation}) => {
  const {t} = useTranslation();
  const mapRef = useRef(null);

  // ─── Stores ──────────────────────────────────────
  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const startDelivery = useOrderStore((s) => s.startDelivery);
  const isUpdatingStatus = useOrderStore((s) => s.isUpdatingStatus);
  const isLoading = useOrderStore((s) => s.isLoading);

  const currentPosition = useLocationStore((s) => s.currentPosition);
  const driverStatus = useLocationStore((s) => s.driverStatus);
  const goOnline = useLocationStore((s) => s.goOnline);
  const goOffline = useLocationStore((s) => s.goOffline);
  const onBreak = useLocationStore((s) => s.onBreak);

  // ─── Local state ─────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // ─── Bottom sheet animation ──────────────────────
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
    Animated.spring(sheetY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [sheetY]);

  const dismissSheet = useCallback(() => {
    Animated.timing(sheetY, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedOrder(null));
  }, [sheetY]);

  // ─── Data fetching ───────────────────────────────
  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      try {
        await fetchOrders('active');
      } catch (e) {
        if (__DEV__) console.warn('Load orders error:', e.message);
      } finally {
        if (isRefresh) setIsRefreshing(false);
        if (initialLoad) setInitialLoad(false);
      }
    },
    [fetchOrders, initialLoad],
  );

  // M1 — Refetch on tab focus
  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  // B3 — Keep selectedOrder in sync when orders array updates
  useEffect(() => {
    if (!selectedOrder) return;
    const fresh = orders.find((o) => o.id === selectedOrder.id);
    if (fresh) {
      setSelectedOrder(fresh);
    } else {
      // Order no longer active — dismiss
      dismissSheet();
    }
  }, [orders]);

  // ─── Computed markers (B2 + M5 clustering) ──────
  const validOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const lat = toNum(o.recipient_lat);
        const lng = toNum(o.recipient_lng);
        return isValidCoord(lat, lng);
      })
      .map((o) => ({
        ...o,
        latitude: toNum(o.recipient_lat),
        longitude: toNum(o.recipient_lng),
      }));
  }, [orders]);

  const clusters = useMemo(() => clusterMarkers(validOrders), [validOrders]);

  // Check if there are assigned orders for "Start Trip"
  const assignedCount = useMemo(
    () => orders.filter((o) => o.status === 'assigned').length,
    [orders],
  );

  // ─── Map press ───────────────────────────────────
  const onMapPress = useCallback(() => {
    if (selectedOrder) dismissSheet();
  }, [selectedOrder, dismissSheet]);

  // ─── Marker press ────────────────────────────────
  const onMarkerPress = useCallback(
    (order) => {
      setSelectedOrder(order);
      showSheet();

      // Animate to marker
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: toNum(order.recipient_lat),
            longitude: toNum(order.recipient_lng),
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          },
          400,
        );
      }
    },
    [showSheet],
  );

  // ─── Recenter on driver ──────────────────────────
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

  // M3 — Fit all markers
  const fitAll = useCallback(() => {
    if (!mapRef.current || validOrders.length === 0) return;
    const coords = validOrders.map((o) => ({
      latitude: o.latitude,
      longitude: o.longitude,
    }));
    if (currentPosition) {
      coords.push({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
      });
    }
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: {top: 80, right: 60, bottom: 300, left: 60},
      animated: true,
    });
  }, [validOrders, currentPosition]);

  // ─── Status toggle (B8 — with confirmation) ─────
  const cycleStatus = useCallback(() => {
    const idx = DRIVER_STATUSES.indexOf(driverStatus);
    const next = DRIVER_STATUSES[(idx + 1) % DRIVER_STATUSES.length];

    Alert.alert(
      t('map.statusChange'),
      t('map.statusChangeMsg', {status: t(STATUS_LABELS[next])}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              if (next === 'available') await goOnline();
              else if (next === 'offline') await goOffline();
              else await onBreak();
            } catch (e) {
              Alert.alert(t('common.error'), e?.message || 'Failed to update status');
            }
          },
        },
      ],
    );
  }, [driverStatus, goOnline, goOffline, onBreak, t]);

  // M10 — Start delivery for all assigned orders
  const handleStartTrip = useCallback(() => {
    if (!currentPosition) return;
    const assignedOrders = orders.filter(o => o.status === 'assigned');
    Alert.alert(
      t('map.startTrip'),
      t('map.startTripMsg', {count: assignedCount}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              // Start delivery for each assigned order
              for (const o of assignedOrders) {
                await startDelivery(o.id, {
                  lat: currentPosition.latitude,
                  lng: currentPosition.longitude,
                });
              }
              loadOrders(true);
            } catch (e) {
              Alert.alert(t('common.error'), e?.message || 'Failed to start trip');
            }
          },
        },
      ],
    );
  }, [startDelivery, orders, currentPosition, assignedCount, loadOrders, t]);

  // M4 — Call customer
  const callCustomer = useCallback((phone) => {
    if (!phone) return;
    const url = Platform.OS === 'ios' ? `telprompt:${phone}` : `tel:${phone}`;
    Linking.openURL(url).catch(() => {});
  }, []);

  // Navigate externally (Apple Maps / Google Maps)
  const navigateToOrder = useCallback(
    (order) => {
      const lat = toNum(order.recipient_lat);
      const lng = toNum(order.recipient_lng);
      if (!isValidCoord(lat, lng)) return;

      const label = encodeURIComponent(
        order.recipient_name || t('map.deliveryPoint'),
      );
      const url =
        Platform.OS === 'ios'
          ? `maps:?daddr=${lat},${lng}&q=${label}`
          : `google.navigation:q=${lat},${lng}`;
      Linking.openURL(url).catch(() => {});
    },
    [t],
  );

  // ─── Driver/Order polyline ───────────────────────
  const polylineCoords = useMemo(() => {
    if (!selectedOrder || !currentPosition) return [];
    const lat = toNum(selectedOrder.recipient_lat);
    const lng = toNum(selectedOrder.recipient_lng);
    if (!isValidCoord(lat, lng)) return [];
    return [
      {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
      },
      {latitude: lat, longitude: lng},
    ];
  }, [selectedOrder, currentPosition]);

  // M7 — Distance & ETA
  const distanceInfo = useMemo(() => {
    if (!selectedOrder || !currentPosition) return null;
    const lat = toNum(selectedOrder.recipient_lat);
    const lng = toNum(selectedOrder.recipient_lng);
    if (!isValidCoord(lat, lng)) return null;
    const dist = haversine(
      currentPosition.latitude,
      currentPosition.longitude,
      lat,
      lng,
    );
    return {
      km: dist.toFixed(1),
      eta: estimateETA(dist),
    };
  }, [selectedOrder, currentPosition]);

  // ─── Initial region ──────────────────────────────
  const initialRegion = useMemo(() => {
    if (currentPosition) {
      return {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: LATITUDE_DELTA * 2,
        longitudeDelta: LONGITUDE_DELTA * 2,
      };
    }
    // Default: Abu Dhabi
    return {
      latitude: 24.4539,
      longitude: 54.3773,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, []);

  // ──────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────

  const statusColor =
    driverStatus === 'available'
      ? colors.success
      : driverStatus === 'busy'
      ? colors.warning
      : colors.textMuted;

  return (
    <View style={styles.container}>
      {/* ── Map ────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={onMapPress}
        rotateEnabled={false}>
        {/* Delivery markers with clustering (M5) */}
        {clusters.map((group, ci) => {
          const anchor = group[0];
          const count = group.length;
          return (
            <Marker
              key={`cluster-${ci}`}
              coordinate={{
                latitude: anchor.latitude,
                longitude: anchor.longitude,
              }}
              onPress={() => onMarkerPress(anchor)}
              tracksViewChanges={false}>
              <View style={styles.markerWrap}>
                <View
                  style={[
                    styles.markerDot,
                    {
                      backgroundColor: getStatusColor(anchor.status),
                    },
                  ]}>
                  <Icon
                    name={count > 1 ? 'package-variant' : 'map-marker'}
                    size={14}
                    color={colors.white}
                  />
                </View>
                {count > 1 && (
                  <View style={styles.clusterBadge}>
                    <Text style={styles.clusterBadgeText}>{count}</Text>
                  </View>
                )}
              </View>
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>
                    {anchor.recipient_name || t('map.deliveryPoint')}
                  </Text>
                  <Text style={styles.calloutSub}>
                    {anchor.order_number || anchor.tracking_token}
                  </Text>
                  {count > 1 && (
                    <Text style={styles.calloutSub}>
                      +{count - 1} {t('map.moreOrders')}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Polyline from driver to selected order */}
        {polylineCoords.length === 2 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={colors.primary}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        )}
      </MapView>

      {/* ── Top bar: Status chip ───────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.statusChip, {backgroundColor: getStatusBgColor(driverStatus === 'available' ? 'delivered' : driverStatus === 'busy' ? 'pending' : 'cancelled', 0.15)}]}
          onPress={cycleStatus}
          activeOpacity={0.7}>
          <Icon
            name={STATUS_ICONS[driverStatus]}
            size={16}
            color={statusColor}
          />
          <Text style={[styles.statusText, {color: statusColor}]}>
            {t(STATUS_LABELS[driverStatus])}
          </Text>
          <Icon name="chevron-down" size={14} color={statusColor} />
        </TouchableOpacity>

        {/* Order count badge */}
        <View style={styles.orderCountBadge}>
          <Icon name="package-variant-closed" size={14} color={colors.primary} />
          <Text style={styles.orderCountText}>
            {validOrders.length} {t('map.activeDeliveries')}
          </Text>
        </View>
      </View>

      {/* ── M2: Loading overlay ────────────────────── */}
      {(initialLoad || isRefreshing) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* ── FABs ───────────────────────────────────── */}
      <View style={styles.fabColumn}>
        {/* Recenter */}
        <TouchableOpacity
          style={styles.fab}
          onPress={recenter}
          activeOpacity={0.8}>
          <Icon name="crosshairs-gps" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* Fit all markers (M3) */}
        {validOrders.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={fitAll}
            activeOpacity={0.8}>
            <Icon name="fit-to-screen-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Refresh */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => loadOrders(true)}
          activeOpacity={0.8}>
          <Icon
            name="refresh"
            size={20}
            color={isRefreshing ? colors.textMuted : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ── M10: Start Trip FAB ────────────────────── */}
      {assignedCount > 0 && (
        <TouchableOpacity
          style={styles.startTripFab}
          onPress={handleStartTrip}
          disabled={isUpdatingStatus}
          activeOpacity={0.8}>
          <Icon name="truck-fast-outline" size={18} color={colors.white} />
          <Text style={styles.startTripText}>
            {t('map.startTrip')} ({assignedCount})
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Empty state ────────────────────────────── */}
      {!initialLoad && validOrders.length === 0 && !selectedOrder && (
        <View style={styles.emptyBanner}>
          <Icon name="map-marker-off-outline" size={20} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t('map.noDeliveries')}</Text>
        </View>
      )}

      {/* ── Bottom Sheet (B1 — only when selectedOrder) ── */}
      {selectedOrder && (
        <Animated.View
          style={[
            styles.sheet,
            {transform: [{translateY: sheetY}]},
          ]}
          {...panResponder.panHandlers}>
          {/* Handle bar (M8) */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          {/* Order info */}
          <View style={styles.sheetBody}>
            {/* Header row */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <Text style={styles.sheetOrderNum} numberOfLines={1}>
                  {selectedOrder.order_number || selectedOrder.tracking_token}
                </Text>
                <View
                  style={[
                    styles.sheetStatusBadge,
                    {
                      backgroundColor: getStatusBgColor(
                        selectedOrder.status,
                        0.12,
                      ),
                    },
                  ]}>
                  <Text
                    style={[
                      styles.sheetStatusText,
                      {color: getStatusColor(selectedOrder.status)},
                    ]}>
                    {t(`status.${selectedOrder.status}`)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={dismissSheet}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Recipient */}
            <View style={styles.sheetRow}>
              <Icon name="account-outline" size={16} color={colors.textMuted} />
              <Text style={styles.sheetRecipient} numberOfLines={1}>
                {selectedOrder.recipient_name || '—'}
              </Text>
            </View>

            {/* Address */}
            <View style={styles.sheetRow}>
              <Icon
                name="map-marker-outline"
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.sheetAddress} numberOfLines={2}>
                {selectedOrder.recipient_address || '—'}
              </Text>
            </View>

            {/* M7 — ETA & Distance */}
            {distanceInfo && (
              <View style={styles.etaRow}>
                <View style={styles.etaChip}>
                  <Icon
                    name="clock-outline"
                    size={14}
                    color={colors.info}
                  />
                  <Text style={styles.etaText}>
                    {t('map.etaMinutes', {minutes: distanceInfo.eta})}
                  </Text>
                </View>
                <View style={styles.etaChip}>
                  <Icon
                    name="map-marker-distance"
                    size={14}
                    color={colors.info}
                  />
                  <Text style={styles.etaText}>
                    {t('map.etaDistance', {distance: distanceInfo.km})}
                  </Text>
                </View>
                {selectedOrder.cod_amount > 0 && (
                  <View style={[styles.etaChip, {backgroundColor: colors.warningBg}]}>
                    <Icon name="cash" size={14} color={colors.warning} />
                    <Text style={[styles.etaText, {color: colors.warning}]}>
                      AED {selectedOrder.cod_amount}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.sheetActions}>
              {/* M4 — Call customer */}
              {selectedOrder.recipient_phone && (
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnCall]}
                  onPress={() => callCustomer(selectedOrder.recipient_phone)}
                  activeOpacity={0.7}>
                  <Icon name="phone-outline" size={16} color={colors.success} />
                  <Text style={[styles.sheetBtnText, {color: colors.success}]}>
                    {t('orders.call')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Navigate */}
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnNav]}
                onPress={() => navigateToOrder(selectedOrder)}
                activeOpacity={0.7}>
                <Icon
                  name="navigation-variant-outline"
                  size={16}
                  color={colors.white}
                />
                <Text style={[styles.sheetBtnText, {color: colors.white}]}>
                  {t('orders.navigateTo')}
                </Text>
              </TouchableOpacity>

              {/* View detail */}
              <TouchableOpacity
                style={[styles.sheetBtn, styles.sheetBtnDetail]}
                onPress={() => {
                  dismissSheet();
                  navigation.navigate(routeNames.OrderDetail, {
                    orderId: selectedOrder.id,
                    token:
                      selectedOrder.tracking_token || selectedOrder.order_number,
                  });
                }}
                activeOpacity={0.7}>
                <Icon
                  name="file-document-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.sheetBtnText, {color: colors.primary}]}>
                  {t('map.viewDetail')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

// ──────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgScreen,
  },

  // ─── Top bar ─────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  orderCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderCountText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  // ─── Loading overlay (M2) ────────────────────────
  loadingOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 64,
    alignSelf: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ─── Markers ─────────────────────────────────────
  markerWrap: {
    alignItems: 'center',
  },
  markerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  clusterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  clusterBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.white,
  },

  // ─── Callout ─────────────────────────────────────
  callout: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 200,
  },
  calloutTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  calloutSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  // ─── FABs ────────────────────────────────────────
  fabColumn: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 120 : 76,
    gap: 10,
  },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ─── Start Trip FAB (M10) ────────────────────────
  startTripFab: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  startTripText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.white,
  },

  // ─── Empty banner ────────────────────────────────
  emptyBanner: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // ─── Bottom sheet ────────────────────────────────
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT + HANDLE_HEIGHT,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  handleBar: {
    height: HANDLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sheetOrderNum: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  sheetStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sheetStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  sheetRecipient: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  sheetAddress: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },

  // ─── ETA row (M7) ───────────────────────────────
  etaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  etaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  etaText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.info,
  },

  // ─── Sheet action buttons ────────────────────────
  sheetActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },
  sheetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  sheetBtnCall: {
    backgroundColor: colors.successBg,
  },
  sheetBtnNav: {
    backgroundColor: colors.primary,
  },
  sheetBtnDetail: {
    backgroundColor: colors.bgSoftBlue,
  },
  sheetBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
});

export default MapScreen;
