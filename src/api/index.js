/**
 * Trasealla Driver App — API Barrel Export
 */

export {default as apiClient} from './client';
export {
  getToken,
  setToken,
  clearToken,
  getTenantSlug,
  setTenantSlug,
  setTenantId,
  getTenantId,
  setOnAuthExpired,
  getErrorMessage,
} from './client';

export {default as authApi} from './auth';
export {default as ordersApi} from './orders';
export {default as locationApi} from './location';
export {default as pickupApi} from './pickup';
export {default as notificationsApi} from './notifications';
export {default as uploadsApi} from './uploads';
export {default as walletApi} from './wallet';
export {default as packagesApi} from './packages';
export {default as stopsApi} from './stops';
export {default as scanApi} from './scan';
export {default as dashboardApi} from './dashboard';
export {default as routeApi} from './route';
export {default as settingsApi} from './settings';
export {default as supportApi} from './support';
