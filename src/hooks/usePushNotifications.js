/**
 * usePushNotifications — FCM push notification management
 * Handles permission request, token registration, foreground messages,
 * and notification tap navigation.
 */

import {useEffect, useRef, useCallback} from 'react';
import {Platform, Alert} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {showMessage} from 'react-native-flash-message';
import {notificationsApi} from '../api';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';

/**
 * @param {object} navigationRef - React Navigation ref for deep linking from notifications
 */
const usePushNotifications = (navigationRef) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const fetchUnreadCount = useNotificationStore(s => s.fetchUnreadCount);
  const registeredToken = useRef(null);

  /**
   * Request notification permission (iOS)
   */
  const requestPermission = useCallback(async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    } catch (err) {
      if (__DEV__) console.log('Push permission error:', err.message);
      return false;
    }
  }, []);

  /**
   * Get FCM token and register with backend
   */
  const registerToken = useCallback(async () => {
    try {
      const token = await messaging().getToken();
      if (token && token !== registeredToken.current) {
        await notificationsApi.registerDeviceToken(token, Platform.OS);
        registeredToken.current = token;
        if (__DEV__) console.log('📱 FCM token registered');
      }
    } catch (err) {
      if (__DEV__) console.log('FCM token registration failed:', err.message);
    }
  }, []);

  /**
   * Unregister token on logout (no backend call — server invalidates on logout)
   */
  const unregisterToken = useCallback(async () => {
    registeredToken.current = null;
  }, []);

  // ─── Setup when authenticated ───────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up on logout
      if (registeredToken.current) {
        unregisterToken();
      }
      return;
    }

    let unsubscribeOnMessage = null;
    let unsubscribeOnTokenRefresh = null;

    const setup = async () => {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        if (__DEV__) console.log('Push notifications not permitted');
        return;
      }

      // Register FCM token
      await registerToken();

      // Listen for token refresh
      unsubscribeOnTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
        try {
          await notificationsApi.registerDeviceToken(newToken, Platform.OS);
          registeredToken.current = newToken;
        } catch {}
      });

      // Foreground message handler
      unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
        const {notification, data} = remoteMessage;
        const title = notification?.title || data?.title || 'New Notification';
        const body = notification?.body || data?.body || '';

        // Show in-app flash message
        showMessage({
          message: title,
          description: body,
          type: 'info',
          duration: 4000,
          icon: 'auto',
          onPress: () => {
            // Navigate based on notification data
            handleNotificationNavigation(data, navigationRef);
          },
        });

        // Refresh unread count
        fetchUnreadCount();
      });

      // Handle notification tap when app was in background
      messaging().onNotificationOpenedApp((remoteMessage) => {
        handleNotificationNavigation(remoteMessage?.data, navigationRef);
        fetchUnreadCount();
      });

      // Handle notification tap that launched the app from killed state
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        // Small delay to let navigation mount
        setTimeout(() => {
          handleNotificationNavigation(initialNotification?.data, navigationRef);
        }, 1500);
      }
    };

    setup().catch(() => {});

    return () => {
      unsubscribeOnMessage?.();
      unsubscribeOnTokenRefresh?.();
    };
  }, [isAuthenticated]);

  return {
    requestPermission,
    registerToken,
    unregisterToken,
  };
};

/**
 * Navigate based on notification payload data
 */
function handleNotificationNavigation(data, navigationRef) {
  if (!data || !navigationRef?.current) return;

  const nav = navigationRef.current;

  try {
    if (data.order_id) {
      nav.navigate('OrderDetail', {orderId: data.order_id});
    } else if (data.order_token || data.tracking_token) {
      // Fallback for legacy payloads
      nav.navigate('OrderDetail', {
        token: data.order_token || data.tracking_token,
      });
    } else if (data.screen) {
      nav.navigate(data.screen, data.params ? JSON.parse(data.params) : undefined);
    }
  } catch (err) {
    if (__DEV__) console.log('Notification navigation error:', err.message);
  }
}

export default usePushNotifications;
