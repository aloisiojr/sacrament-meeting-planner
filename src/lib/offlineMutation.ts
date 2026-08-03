/**
 * Wiring between a write and the offline queue.
 *
 * `lib/offlineQueue` persists pending writes and `useOfflineQueueProcessor` replays them, but
 * nothing used to put anything INTO the queue: `enqueue` had no callers, so an edit made with no
 * connectivity simply failed and was lost. CLAUDE.md states the opposite ("mutations must survive
 * offline"). This module is that missing link.
 *
 * Only TRANSPORT failures are queued. A server that answered and refused (RLS, validation, a
 * conflict) is a real error and must reach the caller — replaying it later would just fail again.
 */

import { enqueue, type QueuedMutation } from './offlineQueue';

/**
 * Substrings that identify "the request never reached the server". React Native's fetch, undici
 * and Safari all word this differently, and supabase-js may surface it either as a rejection or,
 * from postgrest-js, as a resolved `{ error }` whose `details` carry the original TypeError.
 */
const NETWORK_HINTS = [
  'network request failed',
  'failed to fetch',
  'network error',
  'networkerror',
  'load failed',
  'connection refused',
  'err_internet_disconnected',
];

/**
 * True when `err` represents a lost/absent connection rather than a server rejection.
 */
export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { message?: unknown; details?: unknown; name?: unknown };
  const text = [e.message, e.details, e.name]
    .filter((v) => typeof v === 'string')
    .join(' ')
    .toLowerCase();
  if (!text) return false;
  return NETWORK_HINTS.some((hint) => text.includes(hint));
}

/** What the queue needs to replay a write later. */
export type OfflineMutationEntry = Pick<QueuedMutation, 'table' | 'operation' | 'data'>;

/**
 * Run a write; if it fails because the device is offline, persist it for replay on reconnect.
 *
 * Returns the server's response, or `null` when the write was queued instead. Callers must treat
 * `null` as "accepted locally, not yet confirmed" — in particular, an `onSuccess` handler cannot
 * assume it received a row.
 *
 * A full queue re-throws: silently dropping the 101st edit would be the very failure this exists
 * to prevent.
 */
export async function withOfflineQueue<T>(
  entry: OfflineMutationEntry,
  run: () => Promise<T>
): Promise<T | null> {
  try {
    return await run();
  } catch (err) {
    if (!isNetworkError(err)) throw err;

    const timestamp = Date.now();
    const queued = await enqueue({
      id: `${entry.table}:${entry.operation}:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      table: entry.table,
      operation: entry.operation,
      data: entry.data,
      timestamp,
    });

    if (!queued) throw err;
    return null;
  }
}
