/**
 * Trasealla Driver App — Root Navigator
 * Handles auth gating, splash screen, and main app navigation
 */

import React, {useEffect, useState, useRef} from 'react';
import {StatusBar, View, StyleSheet} from 'react-native';
import {NavigationContainer, createNavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {routeNames} from '../constants/routeNames';
import {colors} from '../theme/colors';

import useAuthStore from '../store/authStore';
import useSocket from '../hooks/useSocket';
import useLocation from '../hooks/useLocation';
import usePushNotifications from '../hooks/usePushNotifications';

const navigationRef = createNavigationContainerRef();

// ─── Navigators ──────────────────────────────────────
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

// ─── Modal / Detail Screens ──────────────────────────
import SplashScreen from '../screens/SplashScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import DeliveryConfirmScreen from '../screens/orders/DeliveryConfirmScreen';
import FailureReportScreen from '../screens/orders/FailureReportScreen';
import ReturnOrderScreen from '../screens/orders/ReturnOrderScreen';
import PackageDeliverScreen from '../screens/orders/PackageDeliverScreen';
import PackageFailScreen from '../screens/orders/PackageFailScreen';
import DeliverySummaryScreen from '../screens/orders/DeliverySummaryScreen';
import SignatureScreen from '../screens/orders/SignatureScreen';
import StopDetailScreen from '../screens/orders/StopDetailScreen';
import RouteProgressScreen from '../screens/orders/RouteProgressScreen';
import HistoryScreen from '../screens/orders/HistoryScreen';
import ScannerScreen from '../screens/scanner/ScannerScreen';
import LoadVerifyScreen from '../screens/scanner/LoadVerifyScreen';
import MyPickupsScreen from '../screens/pickup/MyPickupsScreen';
import PickupDetailScreen from '../screens/pickup/PickupDetailScreen';
import PickupProofScreen from '../screens/pickup/PickupProofScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import EarningsScreen from '../screens/earnings/EarningsScreen';
import CODPendingScreen from '../screens/earnings/CODPendingScreen';
import RatingsScreen from '../screens/ratings/RatingsScreen';
import WebViewScreen from '../screens/settings/WebViewScreen';
import SupportScreen from '../screens/support/SupportScreen';
import TicketDetailScreen from '../screens/support/TicketDetailScreen';
import HelpScreen from '../screens/support/HelpScreen';


const Stack = createNativeStackNavigator();

/**
 * Invisible component that activates real-time services
 * (socket + GPS tracking) when the driver is authenticated.
 */
const ServiceConnector = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  // Socket auto-connects/disconnects based on auth state internally
  useSocket();

  // GPS tracking — server identifies driver from auth token
  useLocation(isAuthenticated);

  // FCM push notifications — registers token, handles foreground messages
  usePushNotifications(navigationRef);

  return null;
};

const RootNavigator = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const validateSession = useAuthStore(state => state.validateSession);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let splashTimer = null;
    const bootstrap = async () => {
      const splashMin = new Promise(resolve => {
        splashTimer = setTimeout(resolve, 3000);
      });
      try {
        await Promise.all([validateSession(), splashMin]);
      } catch (e) {
        if (__DEV__) console.warn('Bootstrap error:', e?.message);
        // Session invalid — user goes to login
        await splashMin;
      } finally {
        setIsReady(true);
      }
    };
    bootstrap();
    return () => {
      if (splashTimer) clearTimeout(splashTimer);
    };
  }, [validateSession]);

  if (!isReady || isLoading) {
    return <SplashScreen />;
  }

  return (
    <View style={rootStyles.root}>
    <NavigationContainer ref={navigationRef}>
      <ServiceConnector />
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.bgScreen}
        translucent={false}
      />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          contentStyle: {backgroundColor: colors.bgScreen},
        }}>
        {!isAuthenticated ? (
          // ─── Auth Flow ──────────────────────────
          <Stack.Screen name={routeNames.AuthStack} component={AuthStack} />
        ) : (
          // ─── Authenticated Flow ─────────────────
          <>
            <Stack.Screen
              name={routeNames.MainTabs}
              component={MainTabs}
              options={{animation: 'fade'}}
            />

            {/* ─── Order Screens ─────────────────── */}
            <Stack.Screen
              name={routeNames.OrderDetail}
              component={OrderDetailScreen}
            />
            <Stack.Screen
              name={routeNames.DeliveryConfirm}
              component={DeliveryConfirmScreen}
              options={{animation: 'slide_from_bottom'}}
            />
            <Stack.Screen
              name={routeNames.FailureReport}
              component={FailureReportScreen}
              options={{animation: 'slide_from_bottom'}}
            />
            <Stack.Screen
              name={routeNames.ReturnOrder}
              component={ReturnOrderScreen}
              options={{animation: 'slide_from_bottom'}}
            />

            {/* ─── Package-Level Screens ─────────── */}
            <Stack.Screen
              name={routeNames.PackageDeliver}
              component={PackageDeliverScreen}
              options={{animation: 'slide_from_bottom'}}
            />
            <Stack.Screen
              name={routeNames.PackageFail}
              component={PackageFailScreen}
              options={{animation: 'slide_from_bottom'}}
            />
            <Stack.Screen
              name={routeNames.DeliverySummary}
              component={DeliverySummaryScreen}
              options={{animation: 'slide_from_bottom'}}
            />
            <Stack.Screen
              name={routeNames.Signature}
              component={SignatureScreen}
              options={{animation: 'slide_from_bottom'}}
            />

            {/* ─── Stops & Route ─────────────────── */}
            <Stack.Screen
              name={routeNames.StopDetail}
              component={StopDetailScreen}
            />
            <Stack.Screen
              name={routeNames.RouteProgress}
              component={RouteProgressScreen}
            />
            <Stack.Screen
              name={routeNames.History}
              component={HistoryScreen}
            />

            {/* ─── Scanner ───────────────────────── */}
            <Stack.Screen
              name={routeNames.Scanner}
              component={ScannerScreen}
              options={{animation: 'slide_from_bottom'}}
            />
            <Stack.Screen
              name={routeNames.LoadVerify}
              component={LoadVerifyScreen}
            />

            {/* ─── Pickup Screens ────────────────── */}
            <Stack.Screen
              name={routeNames.MyPickups}
              component={MyPickupsScreen}
            />
            <Stack.Screen
              name={routeNames.PickupDetail}
              component={PickupDetailScreen}
            />
            <Stack.Screen
              name={routeNames.PickupProof}
              component={PickupProofScreen}
            />

            {/* ─── Settings & Profile ────────────── */}
            <Stack.Screen
              name={routeNames.Settings}
              component={SettingsScreen}
            />
            <Stack.Screen
              name={routeNames.ChangePassword}
              component={ChangePasswordScreen}
            />
            <Stack.Screen
              name={routeNames.EditProfile}
              component={EditProfileScreen}
            />

            {/* ─── Earnings & Ratings ────────────── */}
            <Stack.Screen
              name={routeNames.Earnings}
              component={EarningsScreen}
            />
            <Stack.Screen
              name={routeNames.CODPending}
              component={CODPendingScreen}
            />
            <Stack.Screen
              name={routeNames.Ratings}
              component={RatingsScreen}
            />
            <Stack.Screen
              name={routeNames.WebView}
              component={WebViewScreen}
            />

            {/* ─── Support ───────────────────────── */}
            <Stack.Screen
              name={routeNames.Support}
              component={SupportScreen}
            />
            <Stack.Screen
              name={routeNames.TicketDetail}
              component={TicketDetailScreen}
            />
            <Stack.Screen
              name={routeNames.Help}
              component={HelpScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </View>
  );
};

const rootStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default RootNavigator;
