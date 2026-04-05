/**
 * Trasealla Driver App — Axios API Client
 * Base HTTP client with auth interceptors, tenant headers, error handling.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';

// ─── Configuration ──────────────────────────────
const TIMEOUT = 30000; // 30 seconds

// ─── Token Storage Keys ─────────────────────────────
const TOKEN_KEY = '@trasealla_token';
const TENANT_SLUG_KEY = '@trasealla_tenant_slug';
const TENANT_ID_KEY = '@trasealla_tenant_id';

// ─── In-Memory Cache (avoids 3 async reads per request) ──
let _cachedToken = null;
let _cachedSlug = null;
let _cachedTenantId = null;

// ─── Token Helpers ──────────────────────────────────
export const getToken = async () => {
  if (_cachedToken) return _cachedToken;
  try {
    _cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
    return _cachedToken;
  } catch {
    return null;
  }
};

export const setToken = async (token) => {
  _cachedToken = token;
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    if (__DEV__) console.error('Failed to save token:', error);
  }
};

export const clearToken = async () => {
  _cachedToken = null;
  _cachedSlug = null;
  _cachedTenantId = null;
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, TENANT_SLUG_KEY, TENANT_ID_KEY]);
  } catch (error) {
    if (__DEV__) console.error('Failed to clear token:', error);
  }
};

export const getTenantSlug = async () => {
  if (_cachedSlug) return _cachedSlug;
  try {
    _cachedSlug = await AsyncStorage.getItem(TENANT_SLUG_KEY);
    return _cachedSlug;
  } catch {
    return null;
  }
};

export const setTenantSlug = async (slug) => {
  _cachedSlug = slug;
  try {
    await AsyncStorage.setItem(TENANT_SLUG_KEY, slug);
  } catch (error) {
    if (__DEV__) console.error('Failed to save tenant slug:', error);
  }
};

export const setTenantId = async (id) => {
  _cachedTenantId = String(id);
  try {
    await AsyncStorage.setItem(TENANT_ID_KEY, String(id));
  } catch (error) {
    if (__DEV__) console.error('Failed to save tenant id:', error);
  }
};

export const getTenantId = async () => {
  if (_cachedTenantId) return _cachedTenantId;
  try {
    _cachedTenantId = await AsyncStorage.getItem(TENANT_ID_KEY);
    return _cachedTenantId;
  } catch {
    return null;
  }
};

// ─── Axios Instance ─────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor ────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    // Attach auth token
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach tenant slug
    const slug = await getTenantSlug();
    if (slug) {
      config.headers['x-tenant-slug'] = slug;
    }

    // Attach tenant ID
    const tenantId = await getTenantId();
    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }

    // For FormData uploads, remove Content-Type so the boundary is auto-generated
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Dev logging
    if (__DEV__) {
      console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`, config.params || '');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ─── Response Interceptor ───────────────────────────
// onAuthExpired will be set by the auth store to redirect to login
let onAuthExpired = null;
let authExpiredFired = false;

export const setOnAuthExpired = (callback) => {
  onAuthExpired = callback;
  authExpiredFired = false;
};

apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`);
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const requestUrl = error.config?.url || '';

    if (__DEV__) {
      console.log(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status}`, message);
    }

    // 429 Too Many Requests → retry once after a short delay
    if (status === 429) {
      const retryCount = error.config._retryCount || 0;
      if (retryCount < 1) {
        const retryAfter = parseInt(error.response?.headers?.['retry-after'], 10);
        const delaySec = Number.isFinite(retryAfter) ? Math.min(retryAfter, 5) : 3;
        if (__DEV__) {
          console.log(`⏳ 429 rate-limited, retrying in ${delaySec}s`);
        }
        await new Promise(r => setTimeout(r, delaySec * 1000));
        error.config._retryCount = retryCount + 1;
        return apiClient(error.config);
      }
    }

    // 401 Unauthorized → token expired → redirect to login
    // Skip for login/auth endpoints — those handle their own errors
    const isAuthEndpoint = requestUrl.includes('/login') || requestUrl.includes('/forgot-password') || requestUrl.includes('/reset-password');
    if (status === 401 && !isAuthEndpoint && !authExpiredFired) {
      authExpiredFired = true;
      await clearToken();
      if (onAuthExpired) {
        onAuthExpired();
      }
    }

    return Promise.reject(error);
  },
);

// ─── Helper to get user-friendly error message ──────
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  if (!error.response) {
    return 'Network error. Check your connection.';
  }
  return 'Something went wrong. Please try again.';
};

export default apiClient;
