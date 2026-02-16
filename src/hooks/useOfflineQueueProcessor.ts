/**
 * Processes queued offline mutations when device reconnects.
 * Drains the FIFO queue by replaying mutations against Supabase.
 * Invalidates all queries after processing to refresh stale data.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { dequeue } from '../lib/offlineQueue';

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

    // Only process queue when transitioning from offline to online
    if (!wasOfflineRef.current) return;
    wasOfflineRef.current = false;

    async function processQueue() {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        let mutation = await dequeue();
        while (mutation) {
          try {
            const { table, operation, data } = mutation;
            if (operation === 'INSERT') {
              await supabase.from(table).insert(data);
            } else if (operation === 'UPDATE') {
              const { id, ...rest } = data;
              await supabase.from(table).update(rest).eq('id', id as string);
            } else if (operation === 'DELETE') {
              await supabase.from(table).delete().eq('id', data.id as string);
            }
          } catch (err) {
            console.warn('[OfflineQueue] Failed to process mutation:', err);
          }
          mutation = await dequeue();
        }

        // Invalidate all queries after processing to refresh data
        queryClient.invalidateQueries();
      } finally {
        processingRef.current = false;
      }
    }

    processQueue();
  }, [isOnline, queryClient]);
}
