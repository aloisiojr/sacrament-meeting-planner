/**
 * ConnectionMonitor: tracks network status and WebSocket connection.
 * Provides isOnline state and showOfflineBanner for UI display.
 * Uses @react-native-community/netinfo for network detection.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { isNetInfoOnline } from '../lib/connectionUtils';

// --- Types ---

export interface ConnectionState {
  /** True when device has network connectivity */
  isOnline: boolean;
  /** True when offline banner should be visible */
  showOfflineBanner: boolean;
  /** True when Supabase Realtime WebSocket is connected */
  isWebSocketConnected: boolean;
  /** Set WebSocket connection status (called by RealtimeSync) */
  setWebSocketConnected: (connected: boolean) => void;
}

// --- Hook ---

/**
 * Monitor network and WebSocket connection status.
 * Shows offline banner when device loses network connectivity.
 */
export function useConnection(): ConnectionState {
  const [isOnline, setIsOnline] = useState(true);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = isNetInfoOnline(state);

      if (online) {
        // Cancel any pending offline transition
        if (offlineDebounceRef.current) {
          clearTimeout(offlineDebounceRef.current);
          offlineDebounceRef.current = null;
        }
        // Go online immediately
        setIsOnline(true);
        onlineManager.setOnline(true);
        // Delay hiding banner slightly so user sees the transition
        bannerTimeoutRef.current = setTimeout(() => {
          setShowOfflineBanner(false);
          bannerTimeoutRef.current = null;
        }, 1500);
      } else {
        // Debounce offline transition to avoid false positives on app resume
        if (!offlineDebounceRef.current) {
          offlineDebounceRef.current = setTimeout(() => {
            offlineDebounceRef.current = null;
            setIsOnline(false);
            onlineManager.setOnline(false);
            setShowOfflineBanner(true);
            if (bannerTimeoutRef.current) {
              clearTimeout(bannerTimeoutRef.current);
              bannerTimeoutRef.current = null;
            }
          }, 3000);
        }
      }
    });

    return () => {
      unsubscribe();
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current);
      }
    };
  }, []);

  const setWebSocketConnected = useCallback((connected: boolean) => {
    setIsWebSocketConnected(connected);
  }, []);

  return {
    isOnline,
    showOfflineBanner,
    isWebSocketConnected,
    setWebSocketConnected,
  };
}
