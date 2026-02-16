import React from 'react';
import { useConnection } from '../hooks/useConnection';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useOfflineQueueProcessor } from '../hooks/useOfflineQueueProcessor';
import { useRegisterPushToken, useNotificationHandler } from '../hooks/useNotifications';
import { OfflineBanner } from '../components/OfflineBanner';

interface SyncProviderProps {
  children: React.ReactNode;
}

/**
 * SyncProvider: orchestrates connection monitoring, realtime sync,
 * offline queue processing, and push notifications.
 * Must be placed inside AuthProvider (needs wardId/role)
 * and QueryClientProvider (needs queryClient).
 *
 * Renders OfflineBanner above children when device is offline.
 */
export function SyncProvider({ children }: SyncProviderProps) {
  // 1. Connection monitoring (must be first -- provides isOnline)
  const { isOnline, showOfflineBanner, setWebSocketConnected } = useConnection();

  // 2. Realtime sync (depends on isOnline from useConnection)
  useRealtimeSync({ isOnline, setWebSocketConnected });

  // 3. Offline queue processing (depends on isOnline)
  useOfflineQueueProcessor(isOnline);

  // 4. Push token registration (depends on isOnline)
  useRegisterPushToken(isOnline);

  // 5. Notification tap handler (independent)
  useNotificationHandler();

  return (
    <>
      <OfflineBanner visible={showOfflineBanner} />
      {children}
    </>
  );
}
