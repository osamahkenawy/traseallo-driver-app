/**
 * Trasealla Driver App — Settings Store (Zustand)
 */

import {create} from 'zustand';
import {settingsApi} from '../api';

const useSettingsStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  settings: null, // full settings object from backend
  requireSignature: false,
  requirePhoto: false,
  requireBarcodeScan: false,
  requireOtp: false,
  autoCodCollect: false,
  navigationProvider: 'google_maps',
  currency: 'AED',
  allowOffline: true,
  maxOfflineMinutes: 30,
  isLoading: false,
  error: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Fetch tenant / app settings
   */
  fetchSettings: async () => {
    set({isLoading: true, error: null});
    try {
      const res = await settingsApi.getSettings();
      const data = res.data?.data || res.data;

      set({
        settings: data || null,
        requireSignature: data?.require_signature ?? data?.settings?.require_signature ?? false,
        requirePhoto: data?.require_photo_proof ?? data?.settings?.require_photo_proof ?? data?.require_photo ?? false,
        requireBarcodeScan: data?.require_barcode_scan ?? data?.settings?.require_barcode_scan ?? false,
        requireOtp: data?.require_otp ?? data?.settings?.require_otp ?? false,
        autoCodCollect: data?.auto_cod_collect ?? data?.settings?.auto_cod_collect ?? false,
        navigationProvider: data?.navigation_provider ?? data?.settings?.navigation_provider ?? 'google_maps',
        currency: data?.currency ?? data?.settings?.currency ?? 'AED',
        allowOffline: data?.allow_offline ?? data?.settings?.allow_offline ?? true,
        maxOfflineMinutes: data?.max_offline_minutes ?? data?.settings?.max_offline_minutes ?? 30,
        isLoading: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to load settings',
      });
      return null;
    }
  },
}));

export default useSettingsStore;
