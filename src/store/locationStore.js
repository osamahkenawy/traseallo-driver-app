/**
 * Trasealla Driver App — Location & Shift Store (Zustand)
 */

import {create} from 'zustand';
import {locationApi} from '../api';

const useLocationStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  currentPosition: null, // Set by GPS watch — null until first real fix
  isTracking: false,
  driverStatus: 'offline', // 'available' | 'busy' | 'offline' | 'on_break'
  sessionStartTime: null, // ISO string — when the driver went online
  trackingIntervalId: null,
  lastPingTime: null,
  // Offline GPS buffer
  locationBuffer: [],
  // ETA to next stop (minutes), set by MapScreen during navigation
  etaNextStopMin: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Update current position from device GPS
   */
  setPosition: (position) => set({currentPosition: position}),

  /**
   * Set driver status locally
   */
  setDriverStatus: (status) => set({driverStatus: status}),

  /**
   * Set ETA to next stop (in minutes) — called from MapScreen nav mode
   */
  setEtaNextStop: (minutes) => set({etaNextStopMin: minutes}),

  /**
   * Go Online — POST /driver-app/go-online
   */
  goOnline: async () => {
    try {
      const pos = get().currentPosition;
      const data = pos ? {lat: pos.latitude, lng: pos.longitude} : {};
      await locationApi.goOnline(data);
      set(state => ({
        driverStatus: 'available',
        sessionStartTime: state.sessionStartTime || new Date().toISOString(),
      }));
      return {success: true};
    } catch (error) {
      return {success: false, error: error.response?.data?.message || 'Failed to go online'};
    }
  },

  /**
   * Go Offline — POST /driver-app/go-offline
   */
  goOffline: async () => {
    try {
      await locationApi.goOffline();
      set({driverStatus: 'offline', sessionStartTime: null});
      get().stopTracking();
      return {success: true};
    } catch (error) {
      return {success: false, error: error.response?.data?.message || 'Failed to go offline'};
    }
  },

  /**
   * Take a Break — POST /driver-app/on-break
   */
  onBreak: async () => {
    try {
      await locationApi.onBreak();
      set({driverStatus: 'on_break'});
      return {success: true};
    } catch (error) {
      return {success: false, error: error.response?.data?.message || 'Failed to set break status'};
    }
  },

  /**
   * Send a single GPS ping to backend
   * POST /driver-app/location
   */
  sendPing: async () => {
    const position = get().currentPosition;
    if (!position || !Number.isFinite(position.latitude)) return;

    const payload = {
      lat: position.latitude,
      lng: position.longitude,
      accuracy: position.accuracy,
      speed: position.speed,
      heading: position.heading,
    };

    // Include ETA to next stop if available
    const eta = get().etaNextStopMin;
    if (eta != null) {
      payload.eta_next_stop_min = Math.round(eta);
    }

    try {
      await locationApi.sendLocation(payload);
      set({lastPingTime: new Date().toISOString()});
    } catch (error) {
      // Buffer for offline sync
      get().bufferLocation(payload);
      if (__DEV__) {
        console.log('📍 Location ping failed, buffered:', error.message);
      }
    }
  },

  /**
   * Buffer a GPS point for offline sync
   */
  bufferLocation: (payload) => {
    const buffer = get().locationBuffer;
    const point = {...payload, recorded_at: new Date().toISOString()};
    // Max 1000 points (FIFO)
    const updated = buffer.length >= 1000
      ? [...buffer.slice(1), point]
      : [...buffer, point];
    set({locationBuffer: updated});
  },

  /**
   * Flush offline GPS buffer — POST /driver-app/location/batch
   */
  flushLocationBuffer: async () => {
    const buffer = get().locationBuffer;
    if (buffer.length === 0) return;

    try {
      await locationApi.sendLocationBatch(buffer);
      set({locationBuffer: []});
      if (__DEV__) console.log(`📍 Flushed ${buffer.length} buffered GPS points`);
    } catch (error) {
      if (__DEV__) console.log('📍 GPS buffer flush failed:', error.message);
    }
  },

  /**
   * Start periodic location tracking (30s interval)
   */
  startTracking: () => {
    const existing = get().trackingIntervalId;
    if (existing) clearInterval(existing);

    // Send initial ping
    get().sendPing().catch(() => {});

    // Set interval for every 30 seconds
    const intervalId = setInterval(() => {
      get().sendPing().catch(() => {});
    }, 30000);

    set({isTracking: true, trackingIntervalId: intervalId});
  },

  /**
   * Stop location tracking
   */
  stopTracking: () => {
    const intervalId = get().trackingIntervalId;
    if (intervalId) {
      clearInterval(intervalId);
    }
    set({isTracking: false, trackingIntervalId: null});
  },
}));

export default useLocationStore;
