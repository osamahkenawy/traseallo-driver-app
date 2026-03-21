/**
 * Trasealla Driver App — Entry Point
 */

import React, {useEffect} from 'react';
import {enableScreens} from 'react-native-screens';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import FlashMessage from 'react-native-flash-message';

import RootNavigator from './src/navigation/RootNavigator';
import {initI18n} from './src/i18n';
import useAuthStore from './src/store/authStore';
import {initOfflineQueueListener} from './src/utils/offlineQueue';

// Enable native screens for navigation
enableScreens(true);

// Initialize i18n on app start
initI18n();

const App = () => {
  const initAuthExpiredHandler = useAuthStore(
    state => state.initAuthExpiredHandler,
  );

  useEffect(() => {
    // Set up the auth-expired handler so 401 responses trigger logout
    initAuthExpiredHandler();
    // Start offline queue processing on app foreground
    initOfflineQueueListener();
  }, []);

  return (
    <SafeAreaProvider>
      <RootNavigator />
      <FlashMessage position="top" />
    </SafeAreaProvider>
  );
};

export default App;
