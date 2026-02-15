/**
 * Pure utility functions for connection monitoring.
 * Separated from hooks for testability (no react-native dependencies).
 */

/**
 * Determine if device is online from NetInfo state.
 */
export function isNetInfoOnline(state: { isConnected: boolean | null; isInternetReachable: boolean | null }): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}
