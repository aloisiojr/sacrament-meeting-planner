/**
 * RealtimeSync: subscribes to Supabase Realtime channels for ward-scoped tables.
 * Maps events to TanStack Query cache invalidation.
 * Falls back to polling (POLLING_INTERVAL_MS = 10s, src/lib/sync.ts) when the
 * WebSocket is disconnected. (EST-24: this comment used to claim 2.5s.)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SYNCED_TABLES, getQueryKeysForTable, POLLING_INTERVAL_MS } from '../lib/sync';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- Types ---

interface UseRealtimeSyncOptions {
  /** Whether the device is online */
  isOnline: boolean;
  /** Callback to set WebSocket connection status */
  setWebSocketConnected: (connected: boolean) => void;
}

// --- Hook ---

/**
 * Subscribe to Supabase Realtime for all synced tables.
 * Falls back to polling when WebSocket is unavailable.
 */
export function useRealtimeSync({ isOnline, setWebSocketConnected }: UseRealtimeSyncOptions): void {
  const { wardId, user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  // Invalidate queries for a given table
  const invalidateForTable = useCallback(
    (table: string) => {
      const keys = getQueryKeysForTable(table);
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    [queryClient]
  );

  // Invalidate ALL synced table queries (on reconnect)
  const invalidateAll = useCallback(() => {
    for (const table of SYNCED_TABLES) {
      invalidateForTable(table);
    }
  }, [invalidateForTable]);

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    pollingRef.current = setInterval(() => {
      invalidateAll();
    }, POLLING_INTERVAL_MS);
  }, [invalidateAll]);

  // Stop polling fallback
  const stopPolling = useCallback(() => {
    if (!isPollingRef.current) return;
    isPollingRef.current = false;

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Subscribe to Realtime
  useEffect(() => {
    if (!wardId || !isOnline) {
      // Cleanup existing channel if going offline
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setWebSocketConnected(false);
      }
      // No polling fallback here on purpose. Reaching this point means there is no ward or no
      // connection, and every synced query is ward-scoped — a poll would refetch nothing while
      // still waking the device on a timer. (There used to be an `if (isOnline && wardId)` branch
      // here, which was unreachable inside `if (!wardId || !isOnline)`.)
      return;
    }

    // EST-18: one channel named per ward+user. A topic shared across sessions/devices of
    // the same ward let a connection flap stack duplicate handlers on the same topic;
    // scoping the name to this user keeps each subscription's lifecycle independent.
    const channel = supabase.channel(`ward-sync-${wardId}-${userId ?? 'anon'}`);

    for (const table of SYNCED_TABLES) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `ward_id=eq.${wardId}`,
        },
        (payload) => {
          invalidateForTable(payload.table);
        }
      );
    }

    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setWebSocketConnected(true);
          stopPolling();
          // Immediate refetch on subscribe/reconnect
          invalidateAll();
        } else if (
          status === 'CLOSED' ||
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          // TIMED_OUT (flaky link) previously left the socket marked connected with no
          // polling fallback → stale data. Treat it like a disconnect.
          setWebSocketConnected(false);
          // Fall back to polling
          if (isOnline) {
            startPolling();
          }
        }
      });

    channelRef.current = channel;

    return () => {
      stopPolling();
      // EST-18: remove EXACTLY the channel this effect created. Reading channelRef here
      // could remove a newer channel (or none) if a later effect already replaced it.
      void supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
      setWebSocketConnected(false);
    };
  }, [wardId, userId, isOnline, invalidateForTable, invalidateAll, setWebSocketConnected, startPolling, stopPolling]);

  // When going offline, stop polling and cleanup
  useEffect(() => {
    if (!isOnline) {
      stopPolling();
    }
  }, [isOnline, stopPolling]);
}
