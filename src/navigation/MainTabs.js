/**
 * MainTabs — Floating pill-shaped bottom tab bar
 * Center tab has a prominent circular accent-colored button.
 * Matches reference design with rounded corners, minimal icons, no labels.
 */

import React from 'react';
import {View, StyleSheet, TouchableOpacity, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {routeNames} from '../constants/routeNames';
import {colors} from '../theme/colors';
import {fontFamily} from '../theme/fonts';

import {Home, Package, Navigation, Bell, User} from 'lucide-react-native';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import MyOrdersScreen from '../screens/orders/MyOrdersScreen';
import MapScreen from '../screens/map/MapScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

import useNotificationStore from '../store/notificationStore';

const Tab = createBottomTabNavigator();

const ICON_MAP = {
  [routeNames.Dashboard]: Home,
  [routeNames.MyOrders]: Package,
  [routeNames.MapScreen]: Navigation,
  [routeNames.Notifications]: Bell,
  [routeNames.Profile]: User,
};

/** Custom tab bar renderer */
const CustomTabBar = ({state, descriptors, navigation}) => {
  const ins = useSafeAreaInsets();
  const unreadCount = useNotificationStore(st => st.unreadCount);

  return (
    <View style={[$.barOuter, {paddingBottom: ins.bottom > 0 ? ins.bottom : 10}]}>
      <View style={$.bar}>
        {state.routes.map((route, index) => {
          const {options} = descriptors[route.key];
          const focused = state.index === index;
          const isCenter = index === 2; // MapScreen is center

          const IconComp = ICON_MAP[route.name] || Home;

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
                activeOpacity={0.8}>
                <View style={$.centerCircle}>
                  <Navigation size={26} color="#FFF" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={$.tabItem}
              onPress={onPress}
              activeOpacity={0.7}>
              <IconComp
                size={22}
                color={focused ? colors.primary : '#A8B0BC'}
                strokeWidth={focused ? 2.2 : 1.8}
              />
              {/* Notification badge */}
              {route.name === routeNames.Notifications && unreadCount > 0 && (
                <View style={$.badge} />
              )}
              {/* Active indicator dot */}
              {focused && <View style={$.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainTabs = () => {
  return (
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
};

const $ = StyleSheet.create({
  barOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    marginHorizontal: 20,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    width: '90%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  centerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f94c29',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f94c29',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: '30%',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#f94c29',
  },
});

export default MainTabs;
