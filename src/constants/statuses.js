/**
 * Trasealla Driver App — Constants
 * Centralized status strings, failure reasons, and type constants.
 */

// ─── Order Statuses ─────────────────────────────────
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
};

// Active statuses (orders currently in play)
export const ACTIVE_STATUSES = [
  ORDER_STATUS.ASSIGNED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.IN_TRANSIT,
];

// Terminal statuses (no further actions)
export const TERMINAL_STATUSES = [
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.RETURNED,
  ORDER_STATUS.CANCELLED,
];

// ─── Pickup Statuses ────────────────────────────────
export const PICKUP_STATUS = {
  NONE: 'none',
  PENDING: 'pending_pickup',
  SCHEDULED: 'pickup_scheduled',
  EN_ROUTE: 'en_route',
  AT_PICKUP: 'at_pickup',
  PICKED_UP: 'picked_up',
  FAILED: 'pickup_failed',
};

// ─── Driver Statuses ────────────────────────────────
export const DRIVER_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
  ON_BREAK: 'on_break',
};

// ─── Stop Statuses ──────────────────────────────────
export const STOP_STATUS = {
  PENDING: 'pending',
  ARRIVED: 'arrived',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

// ─── COD States ─────────────────────────────────────
export const COD_STATE = {
  NOT_COLLECTED: 0,
  COLLECTED: 1,
  SETTLED: 2,
};

// ─── Failure Reasons ────────────────────────────────
export const FAILURE_REASONS = [
  {key: 'not_available', label: 'Recipient not available'},
  {key: 'wrong_address', label: 'Wrong address'},
  {key: 'refused', label: 'Recipient refused'},
  {key: 'damaged', label: 'Package damaged'},
  {key: 'other', label: 'Other'},
];

// ─── Support Ticket Categories ──────────────────────
export const TICKET_CATEGORIES = [
  {key: 'bug', label: 'Bug Report'},
  {key: 'feature_request', label: 'Feature Request'},
  {key: 'billing', label: 'Billing'},
  {key: 'account', label: 'Account'},
  {key: 'technical', label: 'Technical'},
  {key: 'other', label: 'Other'},
];

export const TICKET_PRIORITIES = [
  {key: 'low', label: 'Low'},
  {key: 'medium', label: 'Medium'},
  {key: 'high', label: 'High'},
  {key: 'critical', label: 'Critical'},
];

// ─── Issue Report Types ─────────────────────────────
export const ISSUE_TYPES = [
  {key: 'vehicle_breakdown', label: 'Vehicle Breakdown'},
  {key: 'accident', label: 'Accident'},
  {key: 'wrong_package', label: 'Wrong Package'},
  {key: 'app_bug', label: 'App Bug'},
  {key: 'safety_concern', label: 'Safety Concern'},
  {key: 'other', label: 'Other'},
];

// ─── Notification Types ─────────────────────────────
export const NOTIFICATION_TYPE = {
  ORDER_ASSIGNED: 'order_assigned',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  PICKUP_ASSIGNED: 'pickup_assigned',
  COD_REMINDER: 'cod_reminder',
  SYSTEM: 'system',
};

// ─── Payment Methods ────────────────────────────────
export const PAYMENT_METHOD = {
  CASH: 'cash',
  CARD: 'card',
  COD: 'cod',
  PREPAID: 'prepaid',
};

// ─── Scan Types ─────────────────────────────────────
export const SCAN_TYPE = {
  PACKAGE: 'package',
  ORDER: 'order',
};

// ─── Order Status Labels (human-readable) ───────────
export const ORDER_STATUS_LABEL = {
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.ASSIGNED]: 'Assigned',
  [ORDER_STATUS.ACCEPTED]: 'Accepted',
  [ORDER_STATUS.PICKED_UP]: 'Picked Up',
  [ORDER_STATUS.IN_TRANSIT]: 'In Transit',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.FAILED]: 'Failed',
  [ORDER_STATUS.RETURNED]: 'Returned',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
};
