/**
 * Tests for locationStore — full coverage beyond socket emit
 *
 * Covers:
 *   - goOnline / goOffline / onBreak lifecycle
 *   - sendPing edge cases (position validation, payload construction)
 *   - bufferLocation overflow (FIFO at 1000)
 *   - flushLocationBuffer (batch sync)
 *   - startTracking / stopTracking interval management
 *   - setEtaNextStop
 *   - M5 fix validation: sendPing promise resolves correctly for .then() chaining
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

import useLocationStore from '../src/store/locationStore';
import {locationApi} from '../src/api';

const MOCK_POSITION = {
  latitude: 25.276987,
  longitude: 55.296249,
  accuracy: 10,
  speed: 12.5,
  heading: 90,
};

const resetStore = () => {
  // Clear any running intervals
  const intervalId = useLocationStore.getState().trackingIntervalId;
  if (intervalId) clearInterval(intervalId);

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

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  resetStore();
});

afterEach(() => {
  // Clean up intervals
  const intervalId = useLocationStore.getState().trackingIntervalId;
  if (intervalId) clearInterval(intervalId);
  jest.useRealTimers();
});

// ══════════════════════════════════════════════════════
// goOnline / goOffline / onBreak
// ══════════════════════════════════════════════════════

describe('locationStore — Driver status lifecycle', () => {
  test('goOnline sets status to available', async () => {
    const result = await useLocationStore.getState().goOnline();
    expect(result).toEqual({success: true});
    expect(useLocationStore.getState().driverStatus).toBe('available');
    expect(useLocationStore.getState().sessionStartTime).not.toBeNull();
  });

  test('goOnline sends current position if available', async () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});
    await useLocationStore.getState().goOnline();
    expect(locationApi.goOnline).toHaveBeenCalledWith({
      lat: 25.276987,
      lng: 55.296249,
    });
  });

  test('goOnline sends empty object if no position', async () => {
    await useLocationStore.getState().goOnline();
    expect(locationApi.goOnline).toHaveBeenCalledWith({});
  });

  test('goOnline does not overwrite existing sessionStartTime', async () => {
    const earlyTime = '2024-01-01T00:00:00.000Z';
    useLocationStore.setState({sessionStartTime: earlyTime});
    await useLocationStore.getState().goOnline();
    expect(useLocationStore.getState().sessionStartTime).toBe(earlyTime);
  });

  test('goOnline returns error on API failure', async () => {
    locationApi.goOnline.mockRejectedValueOnce({
      response: {data: {message: 'Server down'}},
    });
    const result = await useLocationStore.getState().goOnline();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Server down');
  });

  test('goOffline sets status to offline and clears session', async () => {
    useLocationStore.setState({driverStatus: 'available', sessionStartTime: new Date().toISOString()});
    const result = await useLocationStore.getState().goOffline();
    expect(result).toEqual({success: true});
    expect(useLocationStore.getState().driverStatus).toBe('offline');
    expect(useLocationStore.getState().sessionStartTime).toBeNull();
  });

  test('goOffline stops tracking', async () => {
    useLocationStore.setState({isTracking: true, trackingIntervalId: 123});
    await useLocationStore.getState().goOffline();
    expect(useLocationStore.getState().isTracking).toBe(false);
  });

  test('goOffline returns error on API failure', async () => {
    locationApi.goOffline.mockRejectedValueOnce({
      response: {data: {message: 'Network error'}},
    });
    const result = await useLocationStore.getState().goOffline();
    expect(result.success).toBe(false);
  });

  test('onBreak sets status to on_break', async () => {
    useLocationStore.setState({driverStatus: 'available'});
    const result = await useLocationStore.getState().onBreak();
    expect(result).toEqual({success: true});
    expect(useLocationStore.getState().driverStatus).toBe('on_break');
  });

  test('onBreak returns error on API failure', async () => {
    locationApi.onBreak.mockRejectedValueOnce({
      response: {data: {message: 'Not authorized'}},
    });
    const result = await useLocationStore.getState().onBreak();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authorized');
  });

  test('full status cycle: offline → online → break → offline', async () => {
    expect(useLocationStore.getState().driverStatus).toBe('offline');

    await useLocationStore.getState().goOnline();
    expect(useLocationStore.getState().driverStatus).toBe('available');

    await useLocationStore.getState().onBreak();
    expect(useLocationStore.getState().driverStatus).toBe('on_break');

    await useLocationStore.getState().goOffline();
    expect(useLocationStore.getState().driverStatus).toBe('offline');
  });
});

// ══════════════════════════════════════════════════════
// sendPing — edge cases and payload construction
// ══════════════════════════════════════════════════════

describe('locationStore — sendPing edge cases', () => {
  test('sendPing constructs correct payload from position', async () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});
    await useLocationStore.getState().sendPing();

    expect(locationApi.sendLocation).toHaveBeenCalledWith({
      lat: 25.276987,
      lng: 55.296249,
      accuracy: 10,
      speed: 12.5,
      heading: 90,
    });
  });

  test('sendPing includes ETA when set', async () => {
    useLocationStore.setState({
      currentPosition: MOCK_POSITION,
      etaNextStopMin: 15.4,
    });
    await useLocationStore.getState().sendPing();

    expect(locationApi.sendLocation).toHaveBeenCalledWith(
      expect.objectContaining({eta_next_stop_min: 15}),
    );
  });

  test('sendPing excludes ETA when null', async () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION, etaNextStopMin: null});
    await useLocationStore.getState().sendPing();

    const payload = locationApi.sendLocation.mock.calls[0][0];
    expect(payload).not.toHaveProperty('eta_next_stop_min');
  });

  test('sendPing skips when latitude is NaN', async () => {
    useLocationStore.setState({
      currentPosition: {latitude: NaN, longitude: 55.29},
    });
    await useLocationStore.getState().sendPing();
    expect(locationApi.sendLocation).not.toHaveBeenCalled();
  });

  test('sendPing skips when position is null', async () => {
    useLocationStore.setState({currentPosition: null});
    await useLocationStore.getState().sendPing();
    expect(locationApi.sendLocation).not.toHaveBeenCalled();
  });

  test('sendPing updates lastPingTime on success', async () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});
    expect(useLocationStore.getState().lastPingTime).toBeNull();
    await useLocationStore.getState().sendPing();
    expect(useLocationStore.getState().lastPingTime).not.toBeNull();
  });

  test('sendPing does NOT update lastPingTime on failure', async () => {
    locationApi.sendLocation.mockRejectedValueOnce(new Error('timeout'));
    useLocationStore.setState({currentPosition: MOCK_POSITION});
    await useLocationStore.getState().sendPing();
    expect(useLocationStore.getState().lastPingTime).toBeNull();
  });

  test('sendPing handles position with zero speed and heading', async () => {
    useLocationStore.setState({
      currentPosition: {latitude: 25.27, longitude: 55.29, accuracy: 5, speed: 0, heading: 0},
    });
    await useLocationStore.getState().sendPing();

    expect(locationApi.sendLocation).toHaveBeenCalledWith(
      expect.objectContaining({speed: 0, heading: 0}),
    );
  });

  test('sendPing resolves (not rejects) on HTTP failure for safe .then() chaining (M5)', async () => {
    locationApi.sendLocation.mockRejectedValueOnce(new Error('Network error'));
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    // This validates the M5 fix: loadAll().then(() => setInitialLoad(false))
    // If sendPing rejected, Promise.all in loadAll would reject and .then() wouldn't fire.
    // sendPing must resolve (swallow errors gracefully).
    await expect(useLocationStore.getState().sendPing()).resolves.toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════
// bufferLocation — offline GPS buffer
// ══════════════════════════════════════════════════════

describe('locationStore — bufferLocation', () => {
  test('adds a point with recorded_at timestamp', () => {
    const payload = {lat: 25.27, lng: 55.29, accuracy: 10};
    useLocationStore.getState().bufferLocation(payload);

    const buffer = useLocationStore.getState().locationBuffer;
    expect(buffer).toHaveLength(1);
    expect(buffer[0].lat).toBe(25.27);
    expect(buffer[0].recorded_at).toBeDefined();
  });

  test('accumulates multiple points', () => {
    for (let i = 0; i < 5; i++) {
      useLocationStore.getState().bufferLocation({lat: 25 + i * 0.01, lng: 55});
    }
    expect(useLocationStore.getState().locationBuffer).toHaveLength(5);
  });

  test('FIFO eviction at 1000 points', () => {
    // Pre-fill to 1000
    const initialBuffer = Array.from({length: 1000}, (_, i) => ({
      lat: 25 + i * 0.0001,
      lng: 55,
      recorded_at: `2024-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
    }));
    useLocationStore.setState({locationBuffer: initialBuffer});

    // Add one more
    useLocationStore.getState().bufferLocation({lat: 99.99, lng: 88.88});

    const buffer = useLocationStore.getState().locationBuffer;
    expect(buffer).toHaveLength(1000);
    // First oldest point was evicted
    expect(buffer[0].lat).not.toBe(initialBuffer[0].lat);
    // Newest point is last
    expect(buffer[999].lat).toBe(99.99);
  });

  test('buffer does not exceed 1000 with rapid adds', () => {
    const initial = Array.from({length: 998}, () => ({lat: 25, lng: 55, recorded_at: 'x'}));
    useLocationStore.setState({locationBuffer: initial});

    useLocationStore.getState().bufferLocation({lat: 1, lng: 1});
    useLocationStore.getState().bufferLocation({lat: 2, lng: 2});
    useLocationStore.getState().bufferLocation({lat: 3, lng: 3});

    expect(useLocationStore.getState().locationBuffer.length).toBeLessThanOrEqual(1000);
  });
});

// ══════════════════════════════════════════════════════
// flushLocationBuffer — batch sync
// ══════════════════════════════════════════════════════

describe('locationStore — flushLocationBuffer', () => {
  test('sends buffered points via batch API and clears buffer', async () => {
    const buffer = [
      {lat: 25.27, lng: 55.29, recorded_at: '2024-01-01T00:00:00.000Z'},
      {lat: 25.28, lng: 55.30, recorded_at: '2024-01-01T00:00:01.000Z'},
    ];
    useLocationStore.setState({locationBuffer: buffer});

    await useLocationStore.getState().flushLocationBuffer();

    expect(locationApi.sendLocationBatch).toHaveBeenCalledWith(buffer);
    expect(useLocationStore.getState().locationBuffer).toHaveLength(0);
  });

  test('does nothing when buffer is empty', async () => {
    useLocationStore.setState({locationBuffer: []});
    await useLocationStore.getState().flushLocationBuffer();
    expect(locationApi.sendLocationBatch).not.toHaveBeenCalled();
  });

  test('keeps buffer on flush failure', async () => {
    locationApi.sendLocationBatch.mockRejectedValueOnce(new Error('Server error'));
    const buffer = [{lat: 25.27, lng: 55.29, recorded_at: 'x'}];
    useLocationStore.setState({locationBuffer: buffer});

    await useLocationStore.getState().flushLocationBuffer();

    // Buffer retained
    expect(useLocationStore.getState().locationBuffer).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════════════
// startTracking / stopTracking
// ══════════════════════════════════════════════════════

describe('locationStore — startTracking / stopTracking', () => {
  test('startTracking sets isTracking true', () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});
    useLocationStore.getState().startTracking();
    expect(useLocationStore.getState().isTracking).toBe(true);
    expect(useLocationStore.getState().trackingIntervalId).not.toBeNull();
  });

  test('startTracking sends immediate ping', () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});
    useLocationStore.getState().startTracking();
    // sendPing is async but called immediately
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);
  });

  test('startTracking sends periodic pings every 30s', () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});
    useLocationStore.getState().startTracking();

    // Initial ping
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);

    // Advance 30 seconds
    jest.advanceTimersByTime(30000);
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(2);

    // Advance another 30 seconds
    jest.advanceTimersByTime(30000);
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(3);
  });

  test('stopTracking clears interval and sets isTracking false', () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});
    useLocationStore.getState().startTracking();
    expect(useLocationStore.getState().isTracking).toBe(true);

    useLocationStore.getState().stopTracking();
    expect(useLocationStore.getState().isTracking).toBe(false);
    expect(useLocationStore.getState().trackingIntervalId).toBeNull();
  });

  test('stopTracking stops further pings', () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});
    useLocationStore.getState().startTracking();
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);

    useLocationStore.getState().stopTracking();

    // Advance time — should NOT trigger more pings
    jest.advanceTimersByTime(90000);
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(1);
  });

  test('startTracking clears previous interval before creating new one', () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    useLocationStore.getState().startTracking();
    const firstId = useLocationStore.getState().trackingIntervalId;

    useLocationStore.getState().startTracking();
    const secondId = useLocationStore.getState().trackingIntervalId;

    expect(firstId).not.toBe(secondId);

    // Only 2 immediate pings (one per startTracking), not accumulating
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(2);

    // Advance 30s — only 1 interval fires, not 2
    jest.advanceTimersByTime(30000);
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(3);
  });
});

// ══════════════════════════════════════════════════════
// setPosition / setDriverStatus / setEtaNextStop
// ══════════════════════════════════════════════════════

describe('locationStore — simple setters', () => {
  test('setPosition updates currentPosition', () => {
    useLocationStore.getState().setPosition(MOCK_POSITION);
    expect(useLocationStore.getState().currentPosition).toEqual(MOCK_POSITION);
  });

  test('setPosition can clear position with null', () => {
    useLocationStore.getState().setPosition(MOCK_POSITION);
    useLocationStore.getState().setPosition(null);
    expect(useLocationStore.getState().currentPosition).toBeNull();
  });

  test('setDriverStatus updates driverStatus', () => {
    useLocationStore.getState().setDriverStatus('busy');
    expect(useLocationStore.getState().driverStatus).toBe('busy');
  });

  test('setEtaNextStop updates etaNextStopMin', () => {
    useLocationStore.getState().setEtaNextStop(42);
    expect(useLocationStore.getState().etaNextStopMin).toBe(42);
  });

  test('setEtaNextStop can be cleared with null', () => {
    useLocationStore.getState().setEtaNextStop(10);
    useLocationStore.getState().setEtaNextStop(null);
    expect(useLocationStore.getState().etaNextStopMin).toBeNull();
  });
});

// ══════════════════════════════════════════════════════
// M4/M5 validation: loadAll and useFocusEffect behavior
// These test the contract that makes M4/M5 work correctly
// ══════════════════════════════════════════════════════

describe('locationStore — M4/M5 contract validation', () => {
  test('sendPing resolves (not rejects) even when HTTP fails', async () => {
    // M5: loadAll().then(() => setInitialLoad(false)) relies on promises resolving
    locationApi.sendLocation.mockRejectedValueOnce(new Error('Network'));
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    let resolved = false;
    let rejected = false;
    await useLocationStore
      .getState()
      .sendPing()
      .then(() => { resolved = true; })
      .catch(() => { rejected = true; });

    expect(resolved).toBe(true);
    expect(rejected).toBe(false);
  });

  test('multiple concurrent sendPing calls all resolve independently', async () => {
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    // Simulate Promise.all in loadAll
    const results = await Promise.all([
      useLocationStore.getState().sendPing(),
      useLocationStore.getState().sendPing(),
      useLocationStore.getState().sendPing(),
    ]);

    // All resolve to undefined (no rejection)
    results.forEach(r => expect(r).toBeUndefined());
    expect(locationApi.sendLocation).toHaveBeenCalledTimes(3);
  });

  test('sendPing failure buffers location (offline resilience)', async () => {
    locationApi.sendLocation.mockRejectedValueOnce(new Error('offline'));
    useLocationStore.setState({currentPosition: MOCK_POSITION});

    await useLocationStore.getState().sendPing();

    const buffer = useLocationStore.getState().locationBuffer;
    expect(buffer).toHaveLength(1);
    expect(buffer[0].lat).toBe(25.276987);
    expect(buffer[0].lng).toBe(55.296249);
  });
});
