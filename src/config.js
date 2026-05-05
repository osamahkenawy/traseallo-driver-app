/**
 * App configuration — environment-aware.
 *
 * Source order for each value:
 *   1. ./config.local.js   (gitignored, optional, dev-only override)
 *   2. __DEV__             → DEV defaults
 *   3. release build       → PROD defaults
 *
 * Create src/config.local.js with:
 *   module.exports = {
 *     API_BASE_URL: 'http://10.0.2.2:8000/api',
 *     SOCKET_URL:   'http://10.0.2.2:8000',
 *   };
 * to point dev builds at a local backend without touching tracked files.
 */

const PROD = {
  API_BASE_URL: 'https://dispatch.traseallo.com/api',
  SOCKET_URL:   'https://dispatch.traseallo.com',
};

// Dev defaults still hit prod for now (matches previous behaviour) but
// can be overridden via config.local.js — see header.
const DEV = {
  API_BASE_URL: 'https://dispatch.traseallo.com/api',
  SOCKET_URL:   'https://dispatch.traseallo.com',
};

let overrides = {};
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  const local = require('./config.local');
  overrides = local && local.default ? local.default : local;
} catch (_) {
  overrides = {};
}

const base = __DEV__ ? DEV : PROD;

export const API_BASE_URL = overrides.API_BASE_URL || base.API_BASE_URL;
export const SOCKET_URL   = overrides.SOCKET_URL   || base.SOCKET_URL;

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('⚙️  config:', {API_BASE_URL, SOCKET_URL});
}
