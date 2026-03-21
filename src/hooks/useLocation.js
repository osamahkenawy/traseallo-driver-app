/**
 * Trasealla Driver App — useLocation Hook
 * Manages GPS permissions + foreground tracking
 * No driverId needed — server identifies driver from auth token.
 */

import {useEffect, useRef, useCallback} from 'react';
import {Platform, Alert, Linking, AppState} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import useLocationStore from '../store/locationStore';

/**
 * @param {boolean} [enabled=true] - Whether tracking should be active
 */
const useLocation = (enabled = true) => {
  const {
    currentPosition,
    isTracking,
    driverStatus,
    setPosition,
    startTracking,
    stopTracking,
    sendPing,
    goOnline,
    goOffline,
    onBreak,
    bufferLocation,
    flushLocationBuffer,
  } = useLocationStore();

  const watchId = useRef(null);
  const appState = useRef(AppState.currentState);

  /**
   * Request location permissions
   */
  const requestPermission = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const {PermissionsAndroid} = require('react-native');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Traseallo — Location Access',
            message:
              'Traseallo needs access to your location to track deliveries and share your position with dispatchers.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      // iOS: request via react-native-geolocation-service
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted' || auth === 'whenInUse';
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }, []);

  /**
   * Start watching device position
   */
  const startWatching = useCallback(() => {
    if (watchId.current !== null) return;

    try {
      watchId.current = Geolocation.watchPosition(
        (position) => {
          setPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
          });
        },
        (error) => {
          if (__DEV__) console.log('📍 Watch position error:', error.message);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 10000,
          fastestInterval: 5000,
          showLocationDialog: true,
          forceRequestLocation: true,
        },
      );
    } catch (error) {
      if (__DEV__) console.log('📍 Geolocation not available:', error.message);
    }
  }, [setPosition]);

  /**
   * Stop watching device position
   */
  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      try {
        Geolocation.clearWatch(watchId.current);
      } catch {}
      watchId.current = null;
    }
  }, []);

  /**
   * Get current position once
   */
  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      try {
        Geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading,
            };
            setPosition(pos);
            resolve(pos);
          },
          reject,
          {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
        );
      } catch (error) {
        reject(error);
      }
    });
  }, [setPosition]);

  // Start/stop tracking based on enabled + driverStatus
  useEffect(() => {
    if (!enabled || driverStatus === 'offline') {
      stopTracking();
      stopWatching();
      return;
    }

    const init = async () => {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        Alert.alert(
          'Location Required',
          'Enable location access in Settings to use tracking.',
          [{text: 'Open Settings', onPress: () => Linking.openSettings()}, {text: 'Cancel'}],
        );
        return;
      }

      startWatching();
      startTracking();
    };

    init();

    return () => {
      stopTracking();
      stopWatching();
    };
  }, [enabled, driverStatus]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        enabled &&
        driverStatus !== 'offline'
      ) {
        // App came to foreground — send immediate ping & flush offline buffer
        sendPing();
        flushLocationBuffer();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [enabled, driverStatus]);

  return {
    currentPosition,
    isTracking,
    driverStatus,
    getCurrentPosition,
    requestPermission,
    goOnline,
    goOffline,
    onBreak,
  };
};

export default useLocation;
