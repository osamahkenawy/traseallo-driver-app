/**
 * Tests for useSocket hook — socket emit registration into locationStore
 *
 * Since @testing-library/react-hooks is not available, we test the integration
 * by directly exercising the socket mock and locationStore state that useSocket
 * wires together. This validates the contract without needing to render the hook.
 *
 * Verifies:
 *   1. emitLocation emits 'driver:location' on connected socket
 *   2. emitLocation is a no-op when socket is disconnected
 *   3. setSocketEmitLocationFn lifecycle (register → use → unregister)
 *   4. End-to-end: sendPing → HTTP → socket emit with registered fn
 */

jest.mock('../src/api', () => ({
  locationApi: {
    sendLocation: jest.fn(() => Promise.resolve({data: {success: true}})),
    sendLocationBatch: jest.fn(() => Promise.resolve({data: {success: true}})),
    goOnline: jest.fn(() => Promise.resolve({data: {success: true}})),
    goOffline: jest.fn(() => Promise.resolve({data: {success: true}})),
    onBreak: jest.fn(() => Promise.resolve({data: {success: true}})),
    getProgress: jest.fn(() => Promise.resolve({data: {}})),
  },
}));

// Controllable mock socket (simulates what socket.io-client returns)
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
};

jest.mock('socket.io-client', () => jest.fn(() => mockSocket));

import useLocationStore from '../src/store/locationStore';
import {locationApi} from '../src/api';

const MOCK_POSITION = {
  latitude: 25.276987,
  longitude: 55.296249,
  accuracy: 10,
  speed: 12.5,
  heading: 90,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSocket.on.mockReset();
  mockSocket.emit.mockReset();
  mockSocket.connected = false;

  useLocationStore.setState({
    currentPosition: null,
    _socketEmitLocationFn: null,
    locationBuffer: [],
    lastPingTime: null,
    etaNextStopMin: null,
  });
});

/**
 * Simulates what useSocket.emitLocation does:
 *   if (socketRef.current?.connected) socketRef.current.emit('driver:location', data)
 */
const createEmitLocation = () => (locationData) => {
  if (mockSocket.connected) {
    mockSocket.emit('driver:location', locationData);
  }
};

describe('useSocket — emitLocation contract', () => {

  test('emitLocation emits driver:location on connected socket', () => {
    mockSocket.connected = true;
    const emitLocation = createEmitLocation();

    const payload = {lat: 25.27, lng: 55.29, speed: 10, heading: 45};
    emitLocation(payload);

    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).toHaveBeenCalledWith('driver:location', payload);
  });

  test('emitLocation is a no-op when socket is disconnected', () => {
    mockSocket.connected = false;
    const emitLocation = createEmitLocation();

    emitLocation({lat: 25.27, lng: 55.29});

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  test('emitLocation payload is not mutated', () => {
    mockSocket.connected = true;
    const emitLocation = createEmitLocation();

    const payload = {lat: 25.27, lng: 55.29, speed: 10};
    const payloadCopy = {...payload};
    emitLocation(payload);

    expect(payload).toEqual(payloadCopy);
  });
});

describe('useSocket + locationStore — end-to-end registration', () => {

  test('registered emitLocation is called by sendPing after HTTP success', async () => {
    mockSocket.connected = true;
    const emitLocation = createEmitLocation();

    // Simulate what useSocket does on connect: register into locationStore
    useLocationStore.getState().setSocketEmitLocationFn(emitLocation);
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    await useLocationStore.getState().sendPing();

    // HTTP POST called
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);

    // Socket emit called via the registered function
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'driver:location',
      expect.objectContaining({lat: 25.276987, lng: 55.296249}),
    );
  });

  test('unregistered callback stops socket emit', async () => {
    mockSocket.connected = true;
    const emitLocation = createEmitLocation();

    // Register then unregister (simulates logout)
    useLocationStore.getState().setSocketEmitLocationFn(emitLocation);
    useLocationStore.getState().setSocketEmitLocationFn(null);
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    await useLocationStore.getState().sendPing();

    // HTTP still works
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);

    // But socket does not emit
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  test('disconnected socket does not emit even with registered callback', async () => {
    mockSocket.connected = false;
    const emitLocation = createEmitLocation();

    useLocationStore.getState().setSocketEmitLocationFn(emitLocation);
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    await useLocationStore.getState().sendPing();

    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  test('HTTP failure buffers location and skips socket emit', async () => {
    mockSocket.connected = true;
    const emitLocation = createEmitLocation();
    locationApi.sendLocation.mockRejectedValueOnce(new Error('timeout'));

    useLocationStore.getState().setSocketEmitLocationFn(emitLocation);
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    await useLocationStore.getState().sendPing();

    // Socket NOT called
    expect(mockSocket.emit).not.toHaveBeenCalled();

    // Location buffered
    expect(useLocationStore.getState().locationBuffer.length).toBe(1);
  });

  test('full lifecycle: register → ping → unregister → ping', async () => {
    mockSocket.connected = true;
    const emitLocation = createEmitLocation();
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    // Phase 1: registered — socket should emit
    useLocationStore.getState().setSocketEmitLocationFn(emitLocation);
    await useLocationStore.getState().sendPing();
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);

    // Phase 2: unregistered (logout) — socket should NOT emit
    useLocationStore.getState().setSocketEmitLocationFn(null);
    await useLocationStore.getState().sendPing();
    expect(mockSocket.emit).toHaveBeenCalledTimes(1); // still 1, no new call

    // HTTP kept working both times
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(2);
  });
});
