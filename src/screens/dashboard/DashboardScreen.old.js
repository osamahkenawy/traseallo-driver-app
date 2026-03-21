/**
 * Dashboard — Trasealla Driver App
 * Premium driver dashboard with snap carousel & polished layout
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors, getStatusColor, getStatusBgColor} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {routeNames} from '../../constants/routeNames';
import useAuth from '../../hooks/useAuth';
import useOrders from '../../hooks/useOrders';
import useLocationStore from '../../store/locationStore';
import {images} from '../../theme/assets';

const {width: SW} = Dimensions.get('window');
const HP = 20;                         // horizontal padding
const SLIDE_W = SW - HP * 2;          // carousel slide width
const ORDER_CARD_W = SW * 0.68;       // order card width

/* ── Action grid items ── */
const ACTIONS = [
  {icon: 'package-variant-closed', label: 'My Orders', color: '#244066', bg: '#E8EDF4', route: 'MyOrders'},
  {icon: 'barcode-scan',           label: 'Scanner',   color: '#10A6BA', bg: '#E0F5F7', route: 'Scanner'},
  {icon: 'truck-delivery',         label: 'Pickups',   color: '#4E7AB5', bg: '#E3EEF9', route: 'MyPickups'},
  {icon: 'map-marker-radius',      label: 'Map',       color: '#15C7AE', bg: '#E0F8F3', route: 'MapScreen'},
  {icon: 'wallet-outline',         label: 'Earnings',  color: '#F9AD28', bg: '#FFF4E0', route: 'Earnings'},
  {icon: 'truck-check-outline',    label: 'Load Verify', color: '#7B1FA2', bg: '#EDE7F6', route: 'LoadVerify'},
  {icon: 'bell-ring-outline',      label: 'Alerts',    color: '#EB466D', bg: '#FDE8EE', route: 'Notifications'},
  {icon: 'cog-outline',            label: 'Settings',  color: '#495057', bg: '#EAEBEC', route: 'Settings'},
];

/* ═══════════════════════════════════════════════════════════ */
const DashboardScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();
  const {displayName, getGreeting} = useAuth();
  const {orders, isRefreshing, onRefresh, stats, tabCounts, allTimeStats} =
    useOrders();
  const driverStatus = useLocationStore(s => s.driverStatus);
  const online = driverStatus === 'available';
  const [slide, setSlide] = useState(0);
  const carouselRef = useRef(null);

  /* ── Derived data ── */
  const activeOrders = useMemo(
    () =>
      orders?.filter(o =>
        ['assigned', 'picked_up', 'in_transit'].includes(o.status),
      ) || [],
    [orders],
  );
  const inTransit = useMemo(
    () => orders?.filter(o => o.status === 'in_transit').length || 0,
    [orders],
  );
  const assigned = useMemo(
    () => orders?.filter(o => o.status === 'assigned').length || 0,
    [orders],
  );
  const delivered = stats?.delivered ?? tabCounts?.delivered ?? 0;
  const failed = stats?.failed ?? tabCounts?.failed ?? 0;
  const total = allTimeStats?.total_orders ?? orders?.length ?? 0;
  const revenue = stats?.revenue ?? allTimeStats?.total_revenue ?? 0;
  const rate =
    delivered + failed > 0
      ? Math.round((delivered / (delivered + failed)) * 100)
      : 0;

  /* ── Carousel banner data ── */
  const banners = useMemo(
    () => [
      {
        key: 'perf',
        gradient: colors.primary,
        tag: "TODAY'S PERFORMANCE",
        headline: 'Track your daily\nprogress',
        stats: [
          {v: delivered, l: 'Delivered'},
          {v: failed, l: 'Failed'},
          {v: assigned, l: 'Pending'},
          {v: inTransit, l: 'In Transit'},
        ],
      },
      {
        key: 'rev',
        gradient: '#0C7B6B',
        tag: 'REVENUE & STATS',
        headline: `AED ${revenue}\nearned so far`,
        stats: [
          {v: total, l: 'Total'},
          {v: delivered, l: 'Done'},
          {v: `${rate}%`, l: 'Rate'},
          {v: activeOrders.length, l: 'Active'},
        ],
      },
    ],
    [delivered, failed, assigned, inTransit, revenue, total, rate, activeOrders.length],
  );

  /* ── Autoplay timer ── */
  const autoplayRef = useRef(null);
  useEffect(() => {
    autoplayRef.current = setInterval(() => {
      setSlide(prev => {
        const next = (prev + 1) % (banners.length || 1);
        carouselRef.current?.scrollToOffset({
          offset: next * SW,
          animated: true,
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(autoplayRef.current);
  }, [banners.length]);

  const onCarouselScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setSlide(idx);
  }, []);

  const renderBanner = ({item}) => (
    <View style={$.slideWrap}>
      <View style={$.slide}>
        <View style={[$.slideBg, {backgroundColor: item.gradient}]} />
        {/* decorative circles */}
        <View style={$.slideC1} />
        <View style={$.slideC2} />
        <View style={$.slideC3} />
        <View style={$.slideBody}>
          <Text style={$.slideTag}>{item.tag}</Text>
          <Text style={$.slideHL}>{item.headline}</Text>
          <View style={$.slideStatRow}>
            {item.stats.map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={$.slideDiv} />}
                <View style={$.slideStat}>
                  <Text style={$.slideStatV}>{s.v}</Text>
                  <Text style={$.slideStatL}>{s.l}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={$.root}>
      {/* ── HEADER ── */}
      <View style={[$.hdr, {paddingTop: ins.top + 8}]}>
        <TouchableOpacity
          style={$.bellBtn}
          onPress={() => navigation.navigate(routeNames.Notifications)}
          activeOpacity={0.7}>
          <Icon name="bell-outline" size={22} color={colors.primary} />
          <View style={$.bellDot} />
        </TouchableOpacity>

        <Image
          source={images.logoFullColored}
          style={$.hdrLogo}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={$.avatarBtn}
          onPress={() => navigation.navigate(routeNames.Profile)}
          activeOpacity={0.7}>
          <Icon name="account" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={$.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>

        {/* ── HERO ── */}
        <View style={$.hero}>
          <View style={$.heroBg} />
          <View style={$.heroD1} />
          <View style={$.heroD2} />
          <Image
            source={images.logoIcon}
            style={$.heroWatermark}
            resizeMode="contain"
          />
          <View style={$.heroInner}>
            <View style={$.heroLeft}>
              <Text style={$.heroSub}>{getGreeting()}</Text>
              <Text style={$.heroName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={$.heroPills}>
                <View style={[$.pill, online ? $.pillOn : $.pillOff]}>
                  <View
                    style={[
                      $.pillDot,
                      {backgroundColor: online ? '#15C7AE' : colors.danger},
                    ]}
                  />
                  <Text
                    style={[
                      $.pillLabel,
                      {color: online ? '#15C7AE' : colors.danger},
                    ]}>
                    {online ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Mini stats ── */}
            <View style={$.heroRight}>
              <View style={$.miniStat}>
                <Text style={$.miniVal}>{activeOrders.length}</Text>
                <Text style={$.miniLbl}>Active</Text>
              </View>
              <View style={$.miniDivH} />
              <View style={$.miniStat}>
                <Text style={$.miniVal}>{delivered}</Text>
                <Text style={$.miniLbl}>Done</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={$.gridOuter}>
          <View style={$.gridCard}>
            {[0, 1].map(row => (
              <View key={row} style={$.gridRow}>
                {ACTIONS.slice(row * 4, row * 4 + 4).map((a, i) => (
                  <TouchableOpacity
                    key={i}
                    style={$.gridItem}
                    activeOpacity={0.55}
                    onPress={() => navigation.navigate(routeNames[a.route])}>
                    <View style={[$.gridIc, {backgroundColor: a.bg}]}>
                      <Icon name={a.icon} size={24} color={a.color} />
                    </View>
                    <Text style={$.gridTxt}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* ── CAROUSEL ── */}
        <FlatList
          ref={carouselRef}
          data={banners}
          renderItem={renderBanner}
          keyExtractor={item => item.key}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onCarouselScroll}
          style={$.carousel}
          getItemLayout={(_, index) => ({
            length: SW,
            offset: SW * index,
            index,
          })}
        />
        {/* ── Dots ── */}
        <View style={$.dotsRow}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[
                $.dot,
                i === slide ? $.dotActive : $.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* ── ACTIVE ORDERS ── */}
        <View style={$.secHdr}>
          <Text style={$.secTitle}>Active Orders</Text>
          {activeOrders.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate(routeNames.MyOrders)}>
              <Text style={$.seeAll}>See all</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeOrders.length === 0 ? (
          <View style={$.emptyWrap}>
            <View style={$.emptyIc}>
              <Icon name="package-variant-closed" size={32} color={colors.textLight} />
            </View>
            <Text style={$.emptyTitle}>No active deliveries</Text>
            <Text style={$.emptySub}>
              Pull down to refresh or check back soon
            </Text>
            <TouchableOpacity
              style={$.emptyBtn}
              onPress={onRefresh}
              activeOpacity={0.7}>
              <Icon name="refresh" size={14} color={colors.primary} />
              <Text style={$.emptyBtnTxt}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={$.ordersRow}
            snapToInterval={ORDER_CARD_W + 24}
            decelerationRate="fast">
            {activeOrders.slice(0, 10).map((o, idx) => (
              <OrderCard
                key={o?.id || o?.tracking_token || idx}
                order={o}
                onPress={() =>
                  navigation.navigate(routeNames.OrderDetail, {
                    orderId: o.id,
                    token: o.tracking_token,
                    orderNumber: o.order_number,
                  })
                }
              />
            ))}
          </ScrollView>
        )}

        {/* ── STATS OVERVIEW ── */}
        <View style={$.secHdr}>
          <Text style={$.secTitle}>Overview</Text>
        </View>
        <View style={$.overviewCard}>
          <OverviewStat
            icon="check-decagram"
            color="#15C7AE"
            bg="#E0F8F3"
            value={delivered}
            label="Delivered"
          />
          <View style={$.overviewDiv} />
          <OverviewStat
            icon="close-circle-outline"
            color="#EB466D"
            bg="#FDE8EE"
            value={failed}
            label="Failed"
          />
          <View style={$.overviewDiv} />
          <OverviewStat
            icon="package-variant"
            color="#244066"
            bg="#E8EDF4"
            value={total}
            label="Total"
          />
          <View style={$.overviewDiv} />
          <OverviewStat
            icon="cash-multiple"
            color="#F9AD28"
            bg="#FFF4E0"
            value={`${revenue}`}
            label="Revenue"
          />
        </View>

        <View style={{height: 28}} />
      </ScrollView>
    </View>
  );
};

/* ─── Sub-components ────────────────────────────────────────── */

const OverviewStat = ({icon, color, bg, value, label}) => (
  <View style={$.ovItem}>
    <View style={[$.ovIc, {backgroundColor: bg}]}>
      <Icon name={icon} size={17} color={color} />
    </View>
    <Text style={$.ovVal}>{value}</Text>
    <Text style={$.ovLbl}>{label}</Text>
  </View>
);

const OrderCard = ({order, onPress}) => {
  const st = order?.status || 'assigned';
  const stClr = getStatusColor(st);
  const stBg = getStatusBgColor(st);
  const isCOD =
    order?.payment_method === 'cod' && parseFloat(order?.cod_amount) > 0;

  return (
    <TouchableOpacity style={$.oCard} onPress={onPress} activeOpacity={0.6}>
      <View style={[$.oAccent, {backgroundColor: stClr}]} />
      <View style={$.oBody}>
        {/* top row */}
        <View style={$.oTopRow}>
          <View style={[$.oBadge, {backgroundColor: stBg}]}>
            <View style={[$.oBadgeDot, {backgroundColor: stClr}]} />
            <Text style={[$.oBadgeTxt, {color: stClr}]}>
              {(st || '').replace(/_/g, ' ')}
            </Text>
          </View>
          {isCOD && (
            <View style={$.oCodTag}>
              <Icon name="cash" size={10} color="#F9AD28" />
              <Text style={$.oCodTxt}>COD</Text>
            </View>
          )}
        </View>
        {/* details */}
        <Text style={$.oOrderNum}>#{order?.order_number || '---'}</Text>
        <Text style={$.oRecip} numberOfLines={1}>
          {order?.recipient_name || 'Customer'}
        </Text>
        <View style={$.oLocWrap}>
          <Icon name="map-marker" size={13} color={colors.textMuted} />
          <Text style={$.oLocTxt} numberOfLines={1}>
            {order?.recipient_emirate || order?.recipient_address || '---'}
          </Text>
        </View>
        {/* arrow */}
        <View style={$.oArrowWrap}>
          <Icon name="chevron-right" size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default DashboardScreen;

/* ═══════════════════════════════════════════════════════════ */
/*  STYLES                                                     */
/* ═══════════════════════════════════════════════════════════ */
const $ = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F3F5F9'},

  /* ── Header ── */
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HP,
    paddingBottom: 8,
    backgroundColor: '#F3F5F9',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  hdrLogo: {width: 120, height: 30},
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  /* ── Scroll ── */
  scroll: {paddingBottom: 20},

  /* ── Hero ── */
  hero: {
    marginHorizontal: HP,
    marginTop: 6,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
  },
  heroD1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(78,122,181,0.10)',
    top: -80,
    right: -50,
  },
  heroD2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(78,122,181,0.08)',
    bottom: -30,
    left: 20,
  },
  heroWatermark: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 50,
    height: 50,
    opacity: 0.06,
    tintColor: '#FFF',
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  heroLeft: {flex: 1},
  heroSub: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 2,
  },
  heroName: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: '#FFF',
    marginBottom: 10,
  },
  heroPills: {flexDirection: 'row', gap: 8},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  pillOn: {backgroundColor: 'rgba(21,199,174,0.18)'},
  pillOff: {backgroundColor: 'rgba(235,70,109,0.18)'},
  pillDot: {width: 6, height: 6, borderRadius: 3},
  pillLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroRight: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  miniStat: {alignItems: 'center'},
  miniVal: {fontFamily: fontFamily.bold, fontSize: 20, color: '#FFF'},
  miniLbl: {
    fontFamily: fontFamily.medium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  miniDivH: {
    width: 26,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 8,
  },

  /* ── Quick-Action Grid ── */
  gridOuter: {marginHorizontal: HP, marginTop: 20, marginBottom: 6},
  gridCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 4,
  },
  gridItem: {alignItems: 'center', width: (SW - HP * 2 - 20) / 4},
  gridIc: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  /* ── Carousel ── */
  carousel: {marginTop: 20},
  slideWrap: {
    width: SW,
    paddingHorizontal: HP,
  },
  slide: {
    width: SLIDE_W,
    height: 185,
    borderRadius: 22,
    overflow: 'hidden',
  },
  slideBg: {...StyleSheet.absoluteFillObject},
  slideC1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -60,
  },
  slideC2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -50,
    left: -20,
  },
  slideC3: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: 50,
    left: SW * 0.35,
  },
  slideBody: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 22,
  },
  slideTag: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  slideHL: {
    fontFamily: fontFamily.bold,
    fontSize: 19,
    color: '#FFF',
    lineHeight: 25,
    marginTop: 2,
  },
  slideStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  slideStat: {flex: 1, alignItems: 'center'},
  slideStatV: {fontFamily: fontFamily.bold, fontSize: 17, color: '#FFF'},
  slideStatL: {
    fontFamily: fontFamily.medium,
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  slideDiv: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  /* ── Pagination dots ── */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#C5CAD2',
    opacity: 0.4,
  },

  /* ── Section Headers ── */
  secHdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HP,
    marginBottom: 14,
  },
  secTitle: {fontFamily: fontFamily.bold, fontSize: 17, color: colors.textPrimary},
  seeAll: {fontFamily: fontFamily.bold, fontSize: 13, color: colors.primary},

  /* ── Empty ── */
  emptyWrap: {
    marginHorizontal: HP,
    backgroundColor: '#FFF',
    borderRadius: 22,
    paddingVertical: 44,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    backgroundColor: colors.primary + '08',
  },
  emptyBtnTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },

  /* ── Order Cards ── */
  ordersRow: {paddingHorizontal: HP, paddingRight: HP + 8, gap: 24},
  oCard: {
    width: ORDER_CARD_W,
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  oAccent: {height: 4},
  oBody: {padding: 16},
  oTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  oBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  oBadgeDot: {width: 6, height: 6, borderRadius: 3},
  oBadgeTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    textTransform: 'capitalize',
  },
  oCodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FFF4E0',
  },
  oCodTxt: {fontFamily: fontFamily.bold, fontSize: 8, color: '#F9AD28'},
  oOrderNum: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  oRecip: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  oLocWrap: {flexDirection: 'row', alignItems: 'center', gap: 4},
  oLocTxt: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  oArrowWrap: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Overview card ── */
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: HP,
    backgroundColor: '#FFF',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  overviewDiv: {
    width: 1,
    height: 40,
    backgroundColor: '#E8ECF0',
  },
  ovItem: {
    flex: 1,
    alignItems: 'center',
  },
  ovIc: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  ovVal: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  ovLbl: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
