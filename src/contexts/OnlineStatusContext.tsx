/**
 * OnlineStatusContext: distributes isOnline from useConnection across the component tree.
 * Single source of truth for offline state (ADR-020).
 * Consumed by tabs, AgendaForm, SpeechSlot to gate write operations.
 */

import React, { createContext, useContext, useMemo } from 'react';

interface OnlineStatusContextValue {
  isOnline: boolean;
}

const OnlineStatusContext = createContext<OnlineStatusContextValue>({
  isOnline: true,
});

export function OnlineStatusProvider({
  isOnline,
  children,
}: {
  isOnline: boolean;
  children: React.ReactNode;
}) {
  // RAP-13: memoized value — a fresh object per render would re-render every
  // consumer on any provider render, even when connectivity did not change.
  const value = useMemo(() => ({ isOnline }), [isOnline]);
  return (
    <OnlineStatusContext.Provider value={value}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus(): boolean {
  return useContext(OnlineStatusContext).isOnline;
}
