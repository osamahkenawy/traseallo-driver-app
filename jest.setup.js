import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Patch AppState.addEventListener for test env (RN 0.70 test renderer doesn't include it)
const RN = require('react-native');
RN.AppState.addEventListener = jest.fn(() => ({remove: jest.fn()}));
RN.AppState.currentState = 'active';

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}) => children,
  SafeAreaView: ({children}) => children,
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-flash-message', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => null,
    showMessage: jest.fn(),
    hideMessage: jest.fn(),
  };
});

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({children}) => children,
  Swipeable: jest.fn(),
  DrawerLayout: jest.fn(),
  State: {},
  PanGestureHandler: jest.fn(),
  BaseButton: jest.fn(),
  RectButton: jest.fn(),
  TouchableOpacity: jest.fn(),
}));

jest.mock('@react-native-firebase/app', () => ({}));
jest.mock('@react-native-firebase/messaging', () => () => ({
  requestPermission: jest.fn(),
  getToken: jest.fn(),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('react-native-geolocation-service', () => ({
  requestAuthorization: jest.fn(() => Promise.resolve('granted')),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  getCurrentPosition: jest.fn(),
}));

jest.mock('socket.io-client', () => jest.fn(() => ({
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
})));

jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(() => Promise.resolve('')),
  setString: jest.fn(),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const MapView = (props) => React.createElement('MapView', props, props.children);
  MapView.Marker = (props) => React.createElement('Marker', props);
  MapView.Polyline = (props) => React.createElement('Polyline', props);
  return {__esModule: true, default: MapView, Marker: MapView.Marker, Polyline: MapView.Polyline, PROVIDER_GOOGLE: 'google'};
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  return {__esModule: true, default: (props) => React.createElement('WebView', props)};
});

jest.mock('react-native-camera-kit', () => ({
  CameraScreen: jest.fn(),
  Camera: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-restart', () => ({
  Restart: jest.fn(),
}));

jest.mock('react-native-signature-canvas', () => {
  const React = require('react');
  return {__esModule: true, default: React.forwardRef((props, ref) => React.createElement('SignatureCanvas', props))};
});
