/**
 * Trasealla Driver App — useAuth Hook
 * Convenience wrapper around authStore
 */

import {useEffect} from 'react';
import useAuthStore from '../store/authStore';

const useAuth = () => {
  const {
    user,
    token,
    tenantId,
    tenantSlug,
    driverId,
    isAuthenticated,
    isLoading,
    loginError,
    login,
    logout,
    validateSession,
    setDriverId,
    initAuthExpiredHandler,
    clearLoginError,
  } = useAuthStore();

  // Init auth expired handler on mount
  useEffect(() => {
    initAuthExpiredHandler();
  }, []);

  /**
   * Get greeting based on time of day
   */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  /**
   * Get driver's display name
   */
  const displayName = user?.full_name || user?.name || user?.username || 'Driver';

  /**
   * Check if user is a driver
   */
  const isDriver = user?.role === 'driver';

  return {
    user,
    token,
    tenantId,
    tenantSlug,
    driverId,
    isAuthenticated,
    isLoading,
    loginError,
    displayName,
    isDriver,
    login,
    logout,
    validateSession,
    setDriverId,
    clearLoginError,
    getGreeting,
  };
};

export default useAuth;
