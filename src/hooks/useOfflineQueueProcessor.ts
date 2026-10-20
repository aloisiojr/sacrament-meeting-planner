/**
 * Processes queued offline mutations when the device reconnects.
 *
 * Contract:
 *  - Drain in FIFO order, one entry at a time, on an offline -> online transition AND on mount when
 *    already online (a cold start with leftover entries must not wait for the next network flap).
 *  - An entry leaves the queue ONLY after the server accepts it.
 *  - A rejected entry spends one retry from its budget and the drain stops, leaving the rest for the
 *    next reconnect. Once the budget is exhausted the entry moves to the persisted dead-letter list
 *    (visible as "N unsynced", registered in app_health_events) and the SAME drain continues with
 *    the next entries — a poison entry can block the queue for at most MAX_RETRIES reconnects,
 *    never forever, and is never silently dropped (EST-04).
 *  - INSERT/UPSERT replay uses `upsert` on the client-assigned id (or the entry's conflict target),
 *    so replaying a write that had actually landed neither duplicates the row nor hits a UNIQUE
 *    violation.
 *  - The cache is refreshed once, and only if something was actually replayed.
 */

import { useContext, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseDynamic } from '../lib/supabase';
import { AuthContext } from '../contexts/AuthContext';
import { reportHealthEvent } from '../lib/appHealth';
import {
  peek,
  dequeue,
  incrementRetry,
  deadLetterHead,
  type QueuedMutation,
} from '../lib/offlineQueue';
import { logAction } from '../lib/activityLog';

/**
 * Is this failure an expired/invalid session (HTTP 401) rather than a rejection of the
 * write itself? PostgREST reports it as status 401 / code PGRST301 ("JWT expired").
 */
export function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: unknown; code?: unknown; message?: unknown };
  if (e.status === 401 || e.status === '401') return true;
  if (e.code === 'PGRST301') return true;
  return typeof e.message === 'string' && /jwt|unauthorized|invalid.*token/i.test(e.message);
}

type ReplayOutcome = 'accepted' | 'rejected' | 'auth-expired' | 'conflict';

/**
 * Replay one mutation.
 *
 * supabase-js v2 does NOT throw on a rejected write — it resolves `{ data, error }`. The previous
 * implementation discarded that result, so an RLS denial, a foreign-key violation or a duplicate
 * key was indistinguishable from success and the entry was dropped silently. The try/catch is kept
 * for genuine transport failures, which do reject.
 */
async function replay(mutation: QueuedMutation): Promise<ReplayOutcome> {
  const { table, operation, data, onConflict } = mutation;

  try {
    if (operation === 'INSERT') {
      // Upsert on the client-assigned id: if the original attempt landed before the connection
      // dropped, this updates that very row instead of inserting a duplicate.
      const { error } =
        data.id != null
          ? await supabaseDynamic.from(table).upsert(data, { onConflict: 'id' })
          : await supabaseDynamic.from(table).insert(data);
      if (error) throw error;
    } else if (operation === 'UPSERT') {
      const { error } = await supabaseDynamic
        .from(table)
        .upsert(data, onConflict ? { onConflict } : undefined);
      if (error) throw error;
    } else if (operation === 'UPDATE') {
      const { id, ...rest } = data;
      if (mutation.expectedUpdatedAt) {
        // CONF-09: guarded replay — 0 rows means another device changed the row since
        // the edit was queued. That is a conflict, not a success and not a retry.
        const { data: rows, error } = await supabaseDynamic
          .from(table)
          .update(rest)
          .eq('id', id as string)
          .eq('updated_at', mutation.expectedUpdatedAt)
          .select('id');
        if (error) throw error;
        if (!rows || rows.length === 0) return 'conflict';
      } else {
        const { error } = await supabaseDynamic
          .from(table)
          .update(rest)
          .eq('id', id as string);
        if (error) throw error;
      }
    } else if (operation === 'DELETE') {
      const { error } = await supabaseDynamic
        .from(table)
        .delete()
        .eq('id', data.id as string);
      if (error) throw error;
    }
    return 'accepted';
  } catch (err) {
    console.warn('[OfflineQueue] Replay rejected:', err);
    return isAuthError(err) ? 'auth-expired' : 'rejected';
  }
}

/**
 * Process the offline mutation queue when transitioning from offline to online, and once on mount
 * when the device is already online.
 */
export function useOfflineQueueProcessor(isOnline: boolean): void {
  const queryClient = useQueryClient();
  // Read the context directly (not useAuth): the ward id only enriches health events, and draining
  // must never depend on an AuthProvider being above this hook.
  const wardId = useContext(AuthContext)?.wardId ?? null;
  const processingRef = useRef(false);
  const wasOfflineRef = useRef(false);
  const mountedRef = useRef(false);
  const wardIdRef = useRef(wardId);
  useEffect(() => {
    wardIdRef.current = wardId;
  }, [wardId]);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      mountedRef.current = true;
      return;
    }

    // Drain on the offline -> online transition, and also on the first online mount: entries left
    // over from a previous session (app killed while offline, crash mid-queue) would otherwise sit
    // unsynced until the connection happened to flap again.
    const isFirstMount = !mountedRef.current;
    mountedRef.current = true;
    if (!wasOfflineRef.current && !isFirstMount) return;
    wasOfflineRef.current = false;

    async function processQueue() {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        let replayedAny = false;

        for (;;) {
          const mutation = await peek();
          if (!mutation) break;

          const outcome = await replay(mutation);
          if (outcome === 'accepted') {
            await dequeue();
            replayedAny = true;
            // CONF-11: the write has landed — emit its queued activity log exactly once
            // (the entry is already dequeued, so no later drain can repeat it).
            if (mutation.logIntent) {
              const intent = mutation.logIntent;
              await logAction(
                intent.wardId,
                intent.userId,
                intent.userEmail,
                intent.actionType,
                intent.description,
                intent.userName
              );
            }
            continue;
          }

          // CONF-09: a guarded replay that landed 0 rows is a visible conflict — the row
          // moved on another device. Dead-letter it (badge-visible, not silently dropped
          // and not retried into a last-write-wins overwrite) and keep draining.
          if (outcome === 'conflict') {
            await deadLetterHead();
            await reportHealthEvent(wardIdRef.current, 'offline_queue_conflict', {});
            continue;
          }

          // EST-17: a 401 is the session's fault, not the entry's. Pause the drain WITHOUT
          // spending a retry — otherwise good edits would be dead-lettered just because the
          // user needs to sign in again. The next drain (after re-auth) retries from here.
          if (outcome === 'auth-expired') {
            await reportHealthEvent(wardIdRef.current, 'offline_queue_paused_auth', {});
            break;
          }

          // Rejected: spend one retry. `incrementRetry` moves the entry to the persisted
          // dead-letter list once the budget is exhausted and returns false — in that case the
          // queue is unblocked, so keep draining the entries behind it; while budget remains,
          // stop here to preserve FIFO ordering for the next reconnect.
          const hasBudgetLeft = await incrementRetry();
          if (hasBudgetLeft) break;

          await reportHealthEvent(wardIdRef.current, 'offline_dead_letter', {
            retries: mutation.retryCount + 1,
          });
        }

        // Only refresh the cache if something actually reached the server.
        if (replayedAny) {
          queryClient.invalidateQueries();
        }
      } finally {
        processingRef.current = false;
      }
    }

    processQueue().catch((err) => {
      // Never an unhandled rejection: a storage failure stops this drain, but it is recorded so
      // the queue does not silently stop syncing forever (EST-04/EST-17).
      console.warn('[OfflineQueue] Drain failed:', err);
      void reportHealthEvent(wardIdRef.current, 'offline_queue_drain_failed', {});
    });
  }, [isOnline, queryClient]);
}
