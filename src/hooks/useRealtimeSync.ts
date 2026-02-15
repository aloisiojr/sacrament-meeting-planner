/**
 * RealtimeSync: subscribes to Supabase Realtime channels for ward-scoped tables.
 * Maps events to TanStack Query cache invalidation.
 * Falls back to polling (2.5s) when WebSocket is disconnected.
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
  const { wardId } = useAuth();
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
      // Start polling if online but no ward (shouldn't happen in practice)
      if (isOnline && wardId) {
        startPolling();
      }
      return;
    }

    // Create Realtime channel for this ward
    const channel = supabase
      .channel(`ward-sync-${wardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          filter: `ward_id=eq.${wardId}`,
        },
        (payload) => {
          const table = payload.table;
          if (table) {
            invalidateForTable(table);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setWebSocketConnected(true);
          stopPolling();
          // Immediate refetch on subscribe/reconnect
          invalidateAll();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setWebSocketConnected(false);
    };
  }, [wardId, isOnline, invalidateForTable, invalidateAll, setWebSocketConnected, startPolling, stopPolling]);

  // When going offline, stop polling and cleanup
  useEffect(() => {
    if (!isOnline) {
      stopPolling();
    }
  }, [isOnline, stopPolling]);
}
