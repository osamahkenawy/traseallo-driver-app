/**
 * Tests for Socket.io location emit integration in locationStore
 *
 * Verifies:
 *   1. sendPing emits via socket after successful HTTP POST
 *   2. sendPing does NOT emit when no socket callback is registered
 *   3. sendPing does NOT emit when HTTP POST fails (offline buffer instead)
 *   4. Socket emit receives the correct payload (lat, lng, heading, etc.)
 *   5. Socket emit includes ETA when set
 *   6. setSocketEmitLocationFn registers and unregisters correctly
 *   7. sendPing skips entirely when no position is available
 */

// ─── Mock the API layer ──────────────────────────────
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

import useLocationStore from '../src/store/locationStore';
import {locationApi} from '../src/api';

// ─── Helpers ─────────────────────────────────────────
const resetStore = () => {
  useLocationStore.setState({
    currentPosition: null,
    isTracking: false,
    driverStatus: 'offline',
    sessionStartTime: null,
    trackingIntervalId: null,
    lastPingTime: null,
    locationBuffer: [],
    etaNextStopMin: null,
    _socketEmitLocationFn: null,
  });
};

const MOCK_POSITION = {
  latitude: 25.276987,
  longitude: 55.296249,
  accuracy: 10,
  speed: 12.5,
  heading: 90,
};

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

// ─── Test Suite ──────────────────────────────────────

describe('locationStore — Socket.io emit integration', () => {

  // ── 1. Emits via socket after successful HTTP POST ──
  test('sendPing emits via socket callback after HTTP POST succeeds', async () => {
    const emitFn = jest.fn();
    useLocationStore.setState({
      currentPosition: MOCK_POSITION,
      _socketEmitLocationFn: emitFn,
    });

    await useLocationStore.getState().sendPing();

    // HTTP POST should have been called
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);
    expect(locationApi.sendLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 25.276987,
        lng: 55.296249,
      }),
    );

    // Socket emit should have been called with the same payload
    expect(emitFn).toHaveBeenCalledTimes(1);
    expect(emitFn).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 25.276987,
        lng: 55.296249,
        accuracy: 10,
        speed: 12.5,
        heading: 90,
      }),
    );
  });

  // ── 2. No emit when socket callback is not registered ──
  test('sendPing does NOT emit when no socket callback is registered', async () => {
    useLocationStore.setState({
      currentPosition: MOCK_POSITION,
      _socketEmitLocationFn: null,
    });

    await useLocationStore.getState().sendPing();

    // HTTP POST should succeed
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);

    // lastPingTime should be set (POST succeeded)
    expect(useLocationStore.getState().lastPingTime).not.toBeNull();
  });

  // ── 3. No emit when HTTP POST fails ──
  test('sendPing does NOT emit via socket when HTTP POST fails', async () => {
    locationApi.sendLocation.mockRejectedValueOnce(new Error('Network error'));

    const emitFn = jest.fn();
    useLocationStore.setState({
      currentPosition: MOCK_POSITION,
      _socketEmitLocationFn: emitFn,
    });

    await useLocationStore.getState().sendPing();

    // Socket should NOT have been called
    expect(emitFn).not.toHaveBeenCalled();

    // Should have buffered the location instead
    expect(useLocationStore.getState().locationBuffer.length).toBe(1);
  });

  // ── 4. Payload correctness ──
  test('socket emit payload matches what was sent via HTTP', async () => {
    const emitFn = jest.fn();
    useLocationStore.setState({
      currentPosition: MOCK_POSITION,
      _socketEmitLocationFn: emitFn,
    });

    await useLocationStore.getState().sendPing();

    const httpPayload = locationApi.sendLocation.mock.calls[0][0];
    const socketPayload = emitFn.mock.calls[0][0];

    expect(socketPayload).toEqual(httpPayload);
  });

  // ── 5. ETA is included in socket emit when set ──
  test('socket emit includes eta_next_stop_min when ETA is available', async () => {
    const emitFn = jest.fn();
    useLocationStore.setState({
      currentPosition: MOCK_POSITION,
      _socketEmitLocationFn: emitFn,
      etaNextStopMin: 7.8,
    });

    await useLocationStore.getState().sendPing();

    expect(emitFn).toHaveBeenCalledWith(
      expect.objectContaining({
        eta_next_stop_min: 8, // Math.round(7.8)
      }),
    );

    // HTTP also gets the same ETA
    expect(locationApi.sendLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        eta_next_stop_min: 8,
      }),
    );
  });

  // ── 6. setSocketEmitLocationFn registers and unregisters ──
  test('setSocketEmitLocationFn registers a callback', () => {
    const fn = jest.fn();
    useLocationStore.getState().setSocketEmitLocationFn(fn);
    expect(useLocationStore.getState()._socketEmitLocationFn).toBe(fn);
  });

  test('setSocketEmitLocationFn(null) unregisters the callback', () => {
    const fn = jest.fn();
    useLocationStore.getState().setSocketEmitLocationFn(fn);
    useLocationStore.getState().setSocketEmitLocationFn(null);
    expect(useLocationStore.getState()._socketEmitLocationFn).toBeNull();
  });

  test('setSocketEmitLocationFn(undefined) unregisters the callback', () => {
    const fn = jest.fn();
    useLocationStore.getState().setSocketEmitLocationFn(fn);
    useLocationStore.getState().setSocketEmitLocationFn(undefined);
    expect(useLocationStore.getState()._socketEmitLocationFn).toBeNull();
  });

  // ── 7. sendPing skips when no position ──
  test('sendPing does nothing when currentPosition is null', async () => {
    const emitFn = jest.fn();
    useLocationStore.setState({
      currentPosition: null,
      _socketEmitLocationFn: emitFn,
    });

    await useLocationStore.getState().sendPing();

    expect(locationApi.sendLocation).not.toHaveBeenCalled();
    expect(emitFn).not.toHaveBeenCalled();
  });

  test('sendPing does nothing when latitude is NaN', async () => {
    const emitFn = jest.fn();
    useLocationStore.setState({
      currentPosition: {latitude: NaN, longitude: 55.3},
      _socketEmitLocationFn: emitFn,
    });

    await useLocationStore.getState().sendPing();

    expect(locationApi.sendLocation).not.toHaveBeenCalled();
    expect(emitFn).not.toHaveBeenCalled();
  });

  // ── 8. Multiple consecutive pings each emit ──
  test('multiple sendPing calls each trigger a socket emit', async () => {
    const emitFn = jest.fn();
    useLocationStore.setState({
      currentPosition: MOCK_POSITION,
      _socketEmitLocationFn: emitFn,
    });

    await useLocationStore.getState().sendPing();
    await useLocationStore.getState().sendPing();
    await useLocationStore.getState().sendPing();

    expect(locationApi.sendLocation).toHaveBeenCalledTimes(3);
    expect(emitFn).toHaveBeenCalledTimes(3);
  });

  // ── 9. Socket emit failure does not crash sendPing ──
  test('sendPing does not throw if socket emit callback throws', async () => {
    const emitFn = jest.fn(() => { throw new Error('Socket dead'); });
    useLocationStore.setState({
      currentPosition: MOCK_POSITION,
      _socketEmitLocationFn: emitFn,
    });

    // Should not reject — the HTTP POST succeeded, emit failure is non-fatal
    await expect(useLocationStore.getState().sendPing()).resolves.not.toThrow();

    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);
    expect(emitFn).toHaveBeenCalledTimes(1);
    // lastPingTime should still be set (HTTP succeeded)
    expect(useLocationStore.getState().lastPingTime).not.toBeNull();
  });

  // ── 10. Replacing callback mid-session ──
  test('replacing socket callback uses the new function', async () => {
    const emitFn1 = jest.fn();
    const emitFn2 = jest.fn();

    useLocationStore.setState({
      currentPosition: MOCK_POSITION,
      _socketEmitLocationFn: emitFn1,
    });

    await useLocationStore.getState().sendPing();
    expect(emitFn1).toHaveBeenCalledTimes(1);
    expect(emitFn2).not.toHaveBeenCalled();

    // Replace callback (simulates socket reconnect)
    useLocationStore.getState().setSocketEmitLocationFn(emitFn2);

    await useLocationStore.getState().sendPing();
    expect(emitFn1).toHaveBeenCalledTimes(1); // unchanged
    expect(emitFn2).toHaveBeenCalledTimes(1);
  });
});
