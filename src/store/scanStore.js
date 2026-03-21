/**
 * Trasealla Driver App — Scan Store (Zustand)
 */

import {create} from 'zustand';
import {scanApi} from '../api';

const useScanStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  lastScanResult: null, // { type: 'package'|'order', is_assigned, data }
  batchResults: null, // { results[], summary }
  verifyResult: null, // { verified, is_correct_driver, is_correct_stop }
  scanHistory: [], // recent scans for this session
  isScanning: false,
  error: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Scan a single barcode
   */
  scanBarcode: async (barcode) => {
    set({isScanning: true, error: null});
    try {
      const res = await scanApi.scanBarcode(barcode);
      const data = res.data?.data || res.data;

      set(state => ({
        lastScanResult: data,
        scanHistory: [{barcode, result: data, timestamp: Date.now()}, ...state.scanHistory].slice(0, 50),
        isScanning: false,
      }));

      return data;
    } catch (error) {
      set({
        isScanning: false,
        error: error.response?.data?.message || 'Scan failed',
      });
      throw error;
    }
  },

  /**
   * Batch scan multiple barcodes
   */
  batchScan: async (barcodes) => {
    set({isScanning: true, error: null});
    try {
      const res = await scanApi.batchScan(barcodes);
      const data = res.data?.data || res.data;

      set({batchResults: data, isScanning: false});
      return data;
    } catch (error) {
      set({
        isScanning: false,
        error: error.response?.data?.message || 'Batch scan failed',
      });
      throw error;
    }
  },

  /**
   * Verify barcode at delivery point
   */
  verifyDelivery: async (barcode, stopId) => {
    set({isScanning: true, error: null});
    try {
      const res = await scanApi.verifyDelivery(barcode, stopId);
      const data = res.data?.data || res.data;

      set({verifyResult: data, isScanning: false});
      return data;
    } catch (error) {
      set({
        isScanning: false,
        error: error.response?.data?.message || 'Verification failed',
      });
      throw error;
    }
  },

  /** Clear last scan result */
  clearLastScan: () => set({lastScanResult: null}),

  /** Clear batch results */
  clearBatchResults: () => set({batchResults: null}),

  /** Clear verify result */
  clearVerifyResult: () => set({verifyResult: null}),

  /** Clear all scan state */
  clearAll: () => set({
    lastScanResult: null,
    batchResults: null,
    verifyResult: null,
    scanHistory: [],
    error: null,
  }),

  /** Clear error */
  clearError: () => set({error: null}),
}));

export default useScanStore;
