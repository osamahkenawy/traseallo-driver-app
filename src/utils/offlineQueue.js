/**
 * Offline Queue — Stores pending actions when network is unavailable
 * Auto-retries when connectivity is restored.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState, Alert} from 'react-native';
import {ordersApi, uploadsApi, locationApi, scanApi} from '../api';

const QUEUE_KEY = '@traseallo_offline_queue';
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 2000; // 2 seconds

/**
 * Calculate exponential backoff delay
 * @param {number} retryCount
 * @returns {number} delay in ms
 */
const getBackoffDelay = (retryCount) => {
  return Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, retryCount), 60000); // max 60s
};

/**
 * Check if an action is ready for retry based on backoff
 * @param {object} action
 * @returns {boolean}
 */
const isReadyForRetry = (action) => {
  if (!action.lastRetry) return true;
  const delay = getBackoffDelay(action.retryCount || 0);
  return Date.now() - action.lastRetry >= delay;
};

/**
 * Get all queued actions
 * @returns {Promise<Array>}
 */
export const getOfflineQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Save a new offline action to the queue
 * @param {object} action - Action payload with `type` field
 */
export const saveOfflineAction = async (action) => {
  try {
    const queue = await getOfflineQueue();
    queue.push({
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      retryCount: 0,
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (err) {
    if (__DEV__) console.log('Failed to save offline action:', err.message);
    return false;
  }
};

/**
 * Remove an action from the queue
 * @param {string} actionId
 */
const removeFromQueue = async (actionId) => {
  try {
    const queue = await getOfflineQueue();
    const updated = queue.filter(a => a.id !== actionId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  } catch {}
};

/**
 * Update retry count for a failed action
 * @param {string} actionId
 */
const incrementRetry = async (actionId) => {
  try {
    const queue = await getOfflineQueue();
    const idx = queue.findIndex(a => a.id === actionId);
    if (idx >= 0) {
      queue[idx].retryCount = (queue[idx].retryCount || 0) + 1;
      queue[idx].lastRetry = Date.now();
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {}
};

/**
 * Process a single queued action
 * @param {object} action
 * @returns {boolean} success
 */
const processAction = async (action) => {
  try {
    switch (action.type) {
      case 'deliver_order': {
        let proofUrl = null;
        let signatureUrl = null;

        // Upload photo if available
        if (action.photoUri && action.orderId) {
          try {
            const uploadRes = await uploadsApi.uploadOrderProofPhoto(
              action.orderId,
              action.photoUri,
            );
            proofUrl = uploadRes.data?.data?.url || uploadRes.data?.url || null;
          } catch {}
        }

        // Upload signature if available
        if (action.signatureDataUrl && action.orderId) {
          try {
            const sigRes = await uploadsApi.uploadOrderSignature(
              action.orderId,
              action.signatureDataUrl,
            );
            signatureUrl = sigRes.data?.data?.url || sigRes.data?.url || null;
          } catch {}
        }

        const updateBody = {
          status: 'delivered',
          note: action.notes || undefined,
          proof_photo: proofUrl || undefined,
          signature: signatureUrl || undefined,
          lat: action.lat || undefined,
          lng: action.lng || undefined,
        };

        if (action.codCollected !== undefined) {
          updateBody.cod_collected_amount = action.codCollected;
        }

        await ordersApi.deliverOrder(action.orderId, updateBody);
        return true;
      }

      case 'update_status': {
        // Route to the correct API based on the target status
        if (action.status === 'picked_up' || action.status === 'in_transit') {
          await ordersApi.startDelivery(action.orderId, {
            note: action.notes || undefined,
            lat: action.lat || undefined,
            lng: action.lng || undefined,
          });
        } else if (action.status === 'delivered') {
          await ordersApi.deliverOrder(action.orderId, {
            note: action.notes || undefined,
            lat: action.lat || undefined,
            lng: action.lng || undefined,
          });
        } else if (action.status === 'returned') {
          await ordersApi.returnOrder(action.orderId, {
            note: action.notes || undefined,
            lat: action.lat || undefined,
            lng: action.lng || undefined,
          });
        } else {
          // fallback for accept/reject/other
          await ordersApi.acceptOrder(action.orderId);
        }
        return true;
      }

      case 'report_failure': {
        await ordersApi.failOrder(action.orderId, {
          failure_reason: action.reason,
          note: action.notes || undefined,
          lat: action.lat || undefined,
          lng: action.lng || undefined,
        });
        return true;
      }

      case 'location_batch': {
        if (action.points && action.points.length > 0) {
          await locationApi.sendLocationBatch(action.points);
        }
        return true;
      }

      case 'scan_event': {
        await scanApi.scanBarcode(action.barcode);
        return true;
      }

      case 'upload_photo': {
        if (action.photoUri && action.orderId) {
          await uploadsApi.uploadOrderProofPhoto(action.orderId, action.photoUri);
        } else if (action.photoUri && action.stopId) {
          await uploadsApi.uploadStopProofPhoto(action.stopId, action.photoUri);
        }
        return true;
      }

      case 'upload_signature': {
        if (action.signatureDataUrl && action.orderId) {
          await uploadsApi.uploadOrderSignature(action.orderId, action.signatureDataUrl);
        } else if (action.signatureDataUrl && action.stopId) {
          await uploadsApi.uploadStopSignature(action.stopId, action.signatureDataUrl);
        }
        return true;
      }

      case 'complete_stop': {
        const {stopsApi} = require('../api');
        await stopsApi.completeStop(action.stopId, action.data || {});
        return true;
      }

      case 'fail_stop': {
        const {stopsApi} = require('../api');
        await stopsApi.failStop(action.stopId, action.data || {});
        return true;
      }

      default:
        if (__DEV__) console.log('Unknown offline action type:', action.type);
        return false;
    }
  } catch (err) {
    if (__DEV__) console.log('Processing offline action failed:', err.message);
    return false;
  }
};

/**
 * Process all queued actions — call when connectivity is restored
 * @returns {{ processed: number, failed: number }}
 */
export const processOfflineQueue = async () => {
  const queue = await getOfflineQueue();
  if (!queue.length) return {processed: 0, failed: 0};

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const action of queue) {
    if (action.retryCount >= MAX_RETRIES) {
      // Too many retries — alert user and remove
      if (__DEV__) console.warn('Offline action discarded after max retries:', action.type, action.id);
      Alert.alert(
        'Sync Failed',
        `A queued ${action.type?.replace(/_/g, ' ') || 'action'} could not be submitted after multiple attempts. Please retry manually or contact support.`,
      );
      await removeFromQueue(action.id);
      failed++;
      continue;
    }

    // Exponential backoff: skip if not ready for retry yet
    if (!isReadyForRetry(action)) {
      skipped++;
      continue;
    }

    const success = await processAction(action);
    if (success) {
      await removeFromQueue(action.id);
      processed++;
    } else {
      await incrementRetry(action.id);
      failed++;
    }
  }

  return {processed, failed, skipped};
};

/**
 * Get the count of pending offline actions
 * @returns {Promise<number>}
 */
export const getOfflineQueueCount = async () => {
  const queue = await getOfflineQueue();
  return queue.length;
};

/**
 * Clear the entire offline queue
 */
export const clearOfflineQueue = async () => {
  await AsyncStorage.removeItem(QUEUE_KEY);
};

/**
 * Hook-like initializer: call once when app starts.
 * Sets up AppState listener to process queue when app comes back online.
 */
let _listenerActive = false;
export const initOfflineQueueListener = () => {
  if (_listenerActive) return;
  if (typeof AppState?.addEventListener !== 'function') return;
  _listenerActive = true;

  let lastState = AppState.currentState || 'active';

  AppState.addEventListener('change', async (nextState) => {
    try {
      // When coming back to foreground, try processing the queue
      if (lastState.match(/inactive|background/) && nextState === 'active') {
        const count = await getOfflineQueueCount();
        if (count > 0) {
          const result = await processOfflineQueue();
          if (result.processed > 0) {
            Alert.alert(
              'Offline Sync',
              `${result.processed} pending action(s) submitted successfully.` +
                (result.failed > 0
                  ? ` ${result.failed} action(s) still pending.`
                  : ''),
            );
          }
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('Offline queue sync error:', e.message);
    }
    lastState = nextState;
  });
};
