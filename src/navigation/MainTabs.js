/**
 * MainTabs — Bottom tab bar matching new dashboard reference.
 * White card with rounded top corners, labeled icons, blue active color,
 * prominent blue circular center button (Map / Navigate), badge counts.
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {routeNames} from '../constants/routeNames';
import {Home, Layers, Navigation, Bell, User} from 'lucide-react-native';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import MyOrdersScreen from '../screens/orders/MyOrdersScreen';
import MapScreen from '../screens/map/MapScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

import useNotificationStore from '../store/notificationStore';

const Tab = createBottomTabNavigator();

const PRIMARY = '#244066';
const INACTIVE = '#9AA1AE';
const TEXT_ACTIVE = '#244066';

const ICON_MAP = {
  [routeNames.Dashboard]: {Icon: Home, label: 'Home'},
  [routeNames.MyOrders]: {Icon: Layers, label: 'Orders'},
  [routeNames.MapScreen]: {Icon: Navigation, label: 'Map'},
  [routeNames.Notifications]: {Icon: Bell, label: 'Notifications'},
  [routeNames.Profile]: {Icon: User, label: 'Profile'},
};

const CustomTabBar = ({state, descriptors, navigation}) => {
  const ins = useSafeAreaInsets();
  const unreadCount = useNotificationStore(st => st.unreadCount);

  return (
    <View style={[$.barOuter, {paddingBottom: ins.bottom > 0 ? ins.bottom : 8}]}>
      <View style={$.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const isCenter = index === 2;
          const meta = ICON_MAP[route.name] || {Icon: Home, label: ''};
          const {Icon, label} = meta;

          const onPress = () => {
            const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
            if (!event.defaultPrevented && !focused) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                style={$.centerBtn}
                onPress={onPress}
                activeOpacity={0.85}>
                <View style={$.centerCircle}>
                  <Navigation size={22} color="#FFF" strokeWidth={2.6} />
                </View>
              </TouchableOpacity>
            );
          }

          const isNotif = route.name === routeNames.Notifications;
          const showBadge = isNotif && unreadCount > 0;

          return (
            <TouchableOpacity
              key={route.key}
              style={$.tabItem}
              onPress={onPress}
              activeOpacity={0.7}>
              <View>
                <Icon
                  size={22}
                  color={focused ? PRIMARY : INACTIVE}
                  strokeWidth={focused ? 2.4 : 1.9}
                />
                {showBadge && (
                  <View style={$.badge}>
                    <Text style={$.badgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[$.label, {color: focused ? TEXT_ACTIVE : INACTIVE, fontFamily: focused ? 'Poppins-SemiBold' : 'Poppins-Medium'}]}>
                {label}
              </Text>
              {focused && <View style={$.activeUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{headerShown: false}}>
    <Tab.Screen name={routeNames.Dashboard} component={DashboardScreen} />
    <Tab.Screen name={routeNames.MyOrders} component={MyOrdersScreen} />
    <Tab.Screen name={routeNames.MapScreen} component={MapScreen} />
    <Tab.Screen name={routeNames.Notifications} component={NotificationsScreen} />
    <Tab.Screen name={routeNames.Profile} component={ProfileScreen} />
  </Tab.Navigator>
);

const $ = StyleSheet.create({
  barOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {shadowColor: '#0B1220', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.05, shadowRadius: 12},
      android: {elevation: 12},
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -2,
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: PRIMARY,
  },
  centerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {shadowColor: PRIMARY, shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.35, shadowRadius: 10},
      android: {elevation: 8},
    }),
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeTxt: {
    fontFamily: 'Poppins-Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
});

export default MainTabs;
