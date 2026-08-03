/**
 * Processes queued offline mutations when the device reconnects.
 *
 * Contract:
 *  - Drain in FIFO order, one entry at a time, only on an offline -> online transition.
 *  - An entry leaves the queue ONLY after the server accepts it.
 *  - A rejected entry spends one retry from its budget and the drain stops, leaving the rest for
 *    the next reconnect. After MAX_RETRIES `incrementRetry` drops the entry, so a permanently
 *    failing mutation cannot wedge the queue forever.
 *  - The cache is refreshed once, and only if something was actually replayed.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { peek, dequeue, incrementRetry, type QueuedMutation } from '../lib/offlineQueue';

/**
 * Replay one mutation. Returns true when the server accepted it.
 *
 * supabase-js v2 does NOT throw on a rejected write — it resolves `{ data, error }`. The previous
 * implementation discarded that result, so an RLS denial, a foreign-key violation or a duplicate
 * key was indistinguishable from success and the entry was dropped silently. The try/catch is kept
 * for genuine transport failures, which do reject.
 */
async function replay(mutation: QueuedMutation): Promise<boolean> {
  const { table, operation, data } = mutation;

  try {
    if (operation === 'INSERT') {
      const { error } = await supabase.from(table).insert(data);
      if (error) throw error;
    } else if (operation === 'UPDATE') {
      const { id, ...rest } = data;
      const { error } = await supabase
        .from(table)
        .update(rest)
        .eq('id', id as string);
      if (error) throw error;
    } else if (operation === 'DELETE') {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', data.id as string);
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.warn('[OfflineQueue] Replay rejected:', err);
    return false;
  }
}

/**
 * Process the offline mutation queue when transitioning from offline to online.
 */
export function useOfflineQueueProcessor(isOnline: boolean): void {
  const queryClient = useQueryClient();
  const processingRef = useRef(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    // Only process the queue when transitioning from offline to online
    if (!wasOfflineRef.current) return;
    wasOfflineRef.current = false;

    async function processQueue() {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        let replayedAny = false;

        for (;;) {
          const mutation = await peek();
          if (!mutation) break;

          if (await replay(mutation)) {
            await dequeue();
            replayedAny = true;
            continue;
          }

          // Rejected: spend one retry and stop. `incrementRetry` drops the entry once the budget
          // is exhausted, so the queue always makes progress across reconnects.
          await incrementRetry();
          break;
        }

        // Only refresh the cache if something actually reached the server.
        if (replayedAny) {
          queryClient.invalidateQueries();
        }
      } finally {
        processingRef.current = false;
      }
    }

    processQueue();
  }, [isOnline, queryClient]);
}
