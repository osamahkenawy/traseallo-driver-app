/**
 * @format
 */

import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Dev-only: silence noisy warnings from long-lived native subscriptions
// (Geolocation.watchPosition + socket polling) accumulating MessageQueue callbacks.
LogBox.ignoreLogs([
  'Excessive number of pending callbacks',
  'Sending `onAnimatedValueUpdate`',
]);

AppRegistry.registerComponent(appName, () => App);
