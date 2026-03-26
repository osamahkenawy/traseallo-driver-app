/**
 * Trasealla Driver App — Auth Store (Zustand)
 */

import {create} from 'zustand';
import {authApi} from '../api';
import {
  setToken,
  clearToken,
  getToken,
  setTenantSlug,
  getTenantSlug,
  setTenantId,
  getTenantId,
  setOnAuthExpired,
} from '../api/client';

const useAuthStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  user: null,
  token: null,
  tenantId: null,
  tenantSlug: null,
  driverId: null,
  isAuthenticated: false,
  isLoading: true, // true while checking stored token on app launch
  loginError: null,
  subscriptionBlocked: false,
  subscriptionMessage: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Login with username/email + password
   * Tenant slug 'trasealla' is hardcoded for the driver app.
   */
  login: async (username, password) => {
    const DEFAULT_TENANT_SLUG = 'swiftdrop';
    set({isLoading: true, loginError: null});
    try {
      // Pre-set tenant slug so the request interceptor sends x-tenant-slug header
      await setTenantSlug(DEFAULT_TENANT_SLUG);
      const res = await authApi.login(username, password);
      const body = res.data?.data || res.data;
      const token = body.token;

      // Handle both response formats:
      // 1) /driver-app/login: { token, user: {...}, driver: {...} }
      // 2) /auth/login: flat { token, id, full_name, role, tenant: {...}, driver_id, ... }
      const rawUser = body.user || body;
      const driver = body.driver || {};
      const tenant = rawUser.tenant || body.tenant || {};

      // Check subscription status before proceeding
      if (body.subscription_blocked) {
        const msg = body.message || 'Your organization\'s subscription has expired. Please contact your administrator.';
        set({isLoading: false, loginError: msg, subscriptionBlocked: true, subscriptionMessage: msg});
        return {success: false, error: msg, subscription_blocked: true};
      }

      // Merge user + driver info into a flat user object
      const user = {
        id: rawUser.id,
        username: rawUser.username,
        email: rawUser.email || driver.email,
        full_name: rawUser.full_name || driver.full_name,
        role: rawUser.role,
        phone: driver.phone || rawUser.phone,
        avatar: rawUser.avatar_url || driver.photo_url,
        photo: driver.photo_url || rawUser.avatar_url,
        vehicle_type: driver.vehicle_type,
        vehicle_plate: driver.vehicle_plate,
        vehicle_model: driver.vehicle_model,
        vehicle_color: driver.vehicle_color,
        rating: driver.rating,
        status: driver.status,
        driver_id: driver.id || body.driver_id,
        tenant_id: rawUser.tenant_id || tenant.id,
      };

      if (token) await setToken(token);
      if (tenant?.slug) await setTenantSlug(tenant.slug);
      if (tenant?.id) await setTenantId(String(tenant.id));

      set({
        user,
        token,
        driverId: driver.id || body.driver_id || null,
        tenantId: tenant?.id || null,
        tenantSlug: tenant?.slug || DEFAULT_TENANT_SLUG,
        isAuthenticated: true,
        isLoading: false,
        loginError: null,
        subscriptionBlocked: false,
        subscriptionMessage: null,
      });

      return {success: true, driver};
    } catch (error) {
      const message =
        error.response?.data?.message || 'Login failed. Please try again.';
      set({isLoading: false, loginError: message});
      return {success: false, error: message};
    }
  },

  /**
   * Validate stored token on app launch
   */
  validateSession: async () => {
    set({isLoading: true});
    try {
      const storedToken = await getToken();
      if (!storedToken) {
        set({isLoading: false, isAuthenticated: false});
        return false;
      }

      const res = await authApi.getSession();
      // Profile API returns { success, data: { id, full_name, email, status, vehicle_type, ... } }
      const profile = res.data?.data || res.data;

      // Restore tenant info from AsyncStorage
      const slug = await getTenantSlug();
      const tenantId = await getTenantId();

      const user = {
        id: profile.user_id || profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.photo_url,
        photo: profile.photo_url,
        vehicle_type: profile.vehicle_type,
        vehicle_plate: profile.vehicle_plate,
        vehicle_model: profile.vehicle_model,
        vehicle_color: profile.vehicle_color,
        rating: profile.rating,
        status: profile.status,
        driver_id: profile.id,
        role: 'driver',
      };

      set({
        user,
        token: storedToken,
        driverId: profile.id || null,
        tenantId: tenantId ? Number(tenantId) : null,
        tenantSlug: slug || null,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error) {
      await clearToken();
      set({
        user: null,
        token: null,
        tenantId: null,
        tenantSlug: null,
        driverId: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },

  /**
   * Logout — clear everything
   */
  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // silent — we'll clear locally regardless
    }
    await clearToken();
    set({
      user: null,
      token: null,
      tenantId: null,
      tenantSlug: null,
      driverId: null,
      isAuthenticated: false,
      isLoading: false,
      loginError: null,
      subscriptionBlocked: false,
      subscriptionMessage: null,
    });
  },

  /**
   * Set driver ID (discovered from my-orders response)
   */
  setDriverId: (driverId) => set({driverId}),

  /**
   * Set auth expired handler for interceptor
   */
  initAuthExpiredHandler: () => {
    setOnAuthExpired(() => {
      get().logout();
    });
  },

  /**
   * Clear login error
   */
  clearLoginError: () => set({loginError: null}),
}));

export default useAuthStore;
