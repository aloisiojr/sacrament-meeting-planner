/**
 * Cache-persistence and retry policy for the React Query client.
 *
 * These values and predicates used to live inline in app/_layout.tsx, where nothing could import
 * them. Two test files "covered" them by re-declaring the same constants and asserting their own
 * copies — so the app's cache could have been configured to expire in an hour and both would have
 * stayed green. Pure config belongs in lib/ per CLAUDE.md; _layout.tsx now imports it.
 */

/** How long a persisted cache entry stays usable offline. */
export const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Garbage-collection window. Must be >= CACHE_MAX_AGE_MS: if the client evicts an entry sooner
 * than the persister is willing to restore it, the cache is written and then thrown away, and the
 * app opens empty offline.
 */
export const CACHE_GC_TIME_MS = CACHE_MAX_AGE_MS;

/** How long a query is served without refetching. */
export const STALE_TIME_MS = 1000 * 60 * 5;

/** AsyncStorage key holding the persisted cache. */
export const CACHE_STORAGE_KEY = '@query_cache';

/** Minimum gap between cache writes, so a burst of updates does not thrash storage. */
export const CACHE_THROTTLE_MS = 1000;

/** Cache buster when the app has no version — never undefined, or the cache never invalidates. */
export const DEFAULT_CACHE_BUSTER = '1.0.0';

/**
 * The persisted cache is keyed by app version: a new build must not read a cache written by a
 * schema its code no longer understands.
 */
export function cacheBuster(appVersion: string | undefined | null): string {
  return appVersion || DEFAULT_CACHE_BUSTER;
}

/**
 * Retry policy for queries.
 *
 * Offline: never retry — the offline cache is the answer, and retrying only drains the battery.
 * 4xx: never retry — the server has already given its final answer.
 * Otherwise: up to two retries.
 */
export function shouldRetryQuery(
  failureCount: number,
  error: { status?: number } | null | undefined,
  isOnline: boolean
): boolean {
  if (!isOnline) return false;
  const status = error?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

/**
 * Whether a failed mutation should be reported to the user with an alert.
 *
 * A mutation that failed because the device is offline is not an error the user needs to see —
 * it is the expected path, and the offline queue will replay it. Mutations that opt out via
 * `meta.suppressGlobalError` handle their own reporting.
 */
export function shouldAlertMutationError(
  error: { message?: string } | null | undefined,
  isOnline: boolean,
  meta?: { suppressGlobalError?: boolean }
): boolean {
  if (meta?.suppressGlobalError) return false;
  if (!isOnline) return false;
  const message = error?.message ?? '';
  const isNetworkError =
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('Failed to fetch');
  return !isNetworkError;
}
