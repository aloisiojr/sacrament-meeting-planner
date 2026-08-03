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
 * Stable identifier on the thrown error. Callers must branch on this, never on the message: the
 * message is translated, so matching it would break in two of the three supported locales.
 */
export const REQUIRES_CONNECTION = 'requires_connection';

/** An Error carrying the offline-guard code. */
export interface RequiresConnectionError extends Error {
  code: typeof REQUIRES_CONNECTION;
}

/** True when `err` was raised by throwIfOffline. */
export function isRequiresConnectionError(err: unknown): err is RequiresConnectionError {
  return (err as { code?: unknown } | null)?.code === REQUIRES_CONNECTION;
}

/**
 * Throw an error if the operation requires connection and device is offline.
 *
 * These operations are Edge Functions, so they cannot be queued for replay the way ordinary table
 * writes can. Failing fast with "requires connection" is the honest outcome; without this guard
 * the request goes out anyway and the user gets whichever generic failure the caller maps a raw
 * transport error to ("role change failed"), which does not tell them to reconnect.
 *
 * @param operation - The operation being attempted
 * @param isOnline - Whether the device is currently online
 * @throws Error with i18n message and code REQUIRES_CONNECTION
 */
export function throwIfOffline(operation: string, isOnline: boolean): void {
  if (!isOnline && requiresConnection(operation)) {
    const err = new Error(i18n.t('auth.requiresConnection')) as RequiresConnectionError;
    err.code = REQUIRES_CONNECTION;
    throw err;
  }
}
