/**
 * framer-motion shim for React Native
 * Moti v0.25.x imports usePresence, PresenceContext, and AnimatePresence
 * from framer-motion. On native, we provide no-op stubs so Metro can resolve them.
 */

import React from 'react';

// AnimatePresence — just render children
export const AnimatePresence = ({children}) => <>{children}</>;

// PresenceContext — empty React context
export const PresenceContext = React.createContext(null);

// usePresence — component is always "present" on native
export function usePresence() {
  return [true, null];
}

// isValidMotionProp — needed by some Moti internals
export function isValidMotionProp() {
  return false;
}
