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
export type OfflineMutationEntry = Pick<
  QueuedMutation,
  'table' | 'operation' | 'data' | 'onConflict' | 'logIntent' | 'expectedUpdatedAt'
>;

/**
 * A client-generated UUID for a queue entry (and, for INSERTs, the row itself). Giving the row its
 * id on the client is what makes replay idempotent: the processor upserts on that id, so a write
 * that actually landed before the connection dropped is neither duplicated nor a UNIQUE violation
 * when it is replayed.
 */
export function createClientId(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  // RFC 4122 v4 fallback for runtimes without crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
    const id = createClientId();
    const queued = await enqueue({
      id,
      table: entry.table,
      operation: entry.operation,
      // An INSERT replayed without the row's id would create a second row (or explode on a UNIQUE
      // constraint) when the first attempt had in fact landed. Stamp the client id onto the row
      // unless the caller already assigned one; replay upserts on it.
      data:
        entry.operation === 'INSERT' && entry.data.id == null
          ? { ...entry.data, id }
          : entry.data,
      onConflict: entry.onConflict,
      logIntent: entry.logIntent,
      expectedUpdatedAt: entry.expectedUpdatedAt,
      timestamp,
    });

    if (!queued) throw err;
    return null;
  }
}
