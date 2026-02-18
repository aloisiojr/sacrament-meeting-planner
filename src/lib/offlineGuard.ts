/**
 * OfflineGuard: blocks Edge Function operations when offline.
 * Shows "Requires connection" error for online-only operations.
 */

import i18n from '../i18n';

// --- Constants ---

/**
 * Operations that require an internet connection (Edge Functions).
 * These are NOT queued offline and show an error instead.
 */
export const ONLINE_ONLY_OPERATIONS = [
  'register-first-user',
  'register-invited-user',
  'create-invitation',
  'update-user-role',
  'update-user-name',
  'delete-user',
] as const;

export type OnlineOnlyOperation = (typeof ONLINE_ONLY_OPERATIONS)[number];

// --- Guard Functions ---

/**
 * Check if an operation requires an internet connection.
 */
export function requiresConnection(operation: string): boolean {
  return (ONLINE_ONLY_OPERATIONS as readonly string[]).includes(operation);
}

/**
 * Throw an error if the operation requires connection and device is offline.
 * @param operation - The operation being attempted
 * @param isOnline - Whether the device is currently online
 * @throws Error with i18n message if offline and operation requires connection
 */
export function throwIfOffline(operation: string, isOnline: boolean): void {
  if (!isOnline && requiresConnection(operation)) {
    throw new Error(i18n.t('auth.requiresConnection'));
  }
}
