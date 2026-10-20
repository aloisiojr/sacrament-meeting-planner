/**
 * Cache-persistence and retry policy for the React Query client.
 *
 * These values and predicates used to live inline in app/_layout.tsx, where nothing could import
 * them. Two test files "covered" them by re-declaring the same constants and asserting their own
 * copies — so the app's cache could have been configured to expire in an hour and both would have
 * stayed green. Pure config belongs in lib/ per CLAUDE.md; _layout.tsx now imports it.
 */

import { isOfflineBlockedError } from './offlineGuard';

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
 *
 * RAP-04/DEC-02: the ward joins the buster when known. A cache written under another ward (or
 * anonymously, before sign-in) has a different buster and is discarded on restore, never read —
 * so switching user/ward on the same device cannot resurrect someone else's data.
 */
export function cacheBuster(
  appVersion: string | undefined | null,
  wardId?: string | null
): string {
  const version = appVersion || DEFAULT_CACHE_BUSTER;
  return wardId ? `${version}:${wardId}` : version;
}

/** Maximum size of the persisted cache payload; older queries are pruned past this (RAP-04). */
export const CACHE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Query roots allowed in the persisted cache (RAP-04/DEC-02 allowlist): the ward data the app
 * needs to open offline. Everything else — the paginated activity log, search results, other
 * wards — stays memory-only.
 */
export const PERSISTED_QUERY_ROOTS: ReadonlySet<string> = new Set([
  'agendas',
  'speeches',
  'members',
  'hymns',
  'topics',
]);

/** Roots whose query keys carry no ward id (global catalogs, safe for any signed-in ward). */
const WARDLESS_PERSISTED_ROOTS: ReadonlySet<string> = new Set(['hymns']);

/**
 * Whether a query may be serialized into the persisted cache.
 *
 * Ward-scoped roots must carry the CURRENT ward id in their key; a query from another ward is
 * refused even if it is still in memory during a ward switch. Keys with a `search` segment are
 * refused: search results are transient and can embed what the user typed.
 */
export function shouldPersistQuery(
  queryKey: readonly unknown[],
  wardId: string | null | undefined
): boolean {
  const root = queryKey[0];
  if (typeof root !== 'string' || !PERSISTED_QUERY_ROOTS.has(root)) return false;
  if (queryKey.some((part) => part === 'search')) return false;
  if (WARDLESS_PERSISTED_ROOTS.has(root)) return true;
  if (!wardId) return false;
  return queryKey.some((part) => part === wardId);
}

/** `dehydrateOptions.shouldDehydrateQuery` shape: only successful, allowlisted queries persist. */
export function shouldDehydratePersistedQuery(
  query: { queryKey: readonly unknown[]; state: { status: string } },
  wardId: string | null | undefined
): boolean {
  return query.state.status === 'success' && shouldPersistQuery(query.queryKey, wardId);
}

function utf8ByteLength(value: string): number {
  return encodeURIComponent(value).replace(/%[0-9A-F]{2}/g, 'x').length;
}

/**
 * Prune a serialized persisted cache down to `maxBytes`, dropping the oldest queries first.
 * Returns the (possibly unchanged) payload plus how many queries were dropped, so the caller
 * can emit telemetry when — and only when — pruning actually happened.
 */
export function prunePersistedCache(
  serialized: string,
  maxBytes: number = CACHE_MAX_BYTES
): { value: string; dropped: number; bytesBefore: number } {
  const bytesBefore = utf8ByteLength(serialized);
  if (bytesBefore <= maxBytes) return { value: serialized, dropped: 0, bytesBefore };
  let parsed: { clientState?: { queries?: { state?: { dataUpdatedAt?: number } }[] } };
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { value: serialized, dropped: 0, bytesBefore };
  }
  const queries = parsed.clientState?.queries;
  if (!Array.isArray(queries) || queries.length === 0) {
    return { value: serialized, dropped: 0, bytesBefore };
  }
  const oldestFirst = [...queries].sort(
    (a, b) => (a.state?.dataUpdatedAt ?? 0) - (b.state?.dataUpdatedAt ?? 0)
  );
  let dropped = 0;
  let value = serialized;
  while (utf8ByteLength(value) > maxBytes && dropped < oldestFirst.length) {
    const victim = oldestFirst[dropped];
    parsed.clientState!.queries = parsed.clientState!.queries!.filter((q) => q !== victim);
    dropped += 1;
    value = JSON.stringify(parsed);
  }
  return { value, dropped, bytesBefore };
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
 *
 * The one explicit exception is a mutation BLOCKED because it is offline (DEC-01,
 * `offline_blocked`): that rejection exists precisely to tell the user "connect to save this
 * change", so it alerts even while offline. Swallowing it would recreate the silent-failure
 * mode this classification exists to remove.
 */
export function shouldAlertMutationError(
  error: { message?: string; code?: string } | null | undefined,
  isOnline: boolean,
  meta?: { suppressGlobalError?: boolean }
): boolean {
  if (meta?.suppressGlobalError) return false;
  if (isOfflineBlockedError(error)) return true;
  if (!isOnline) return false;
  const message = error?.message ?? '';
  const isNetworkError =
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('Failed to fetch');
  return !isNetworkError;
}
