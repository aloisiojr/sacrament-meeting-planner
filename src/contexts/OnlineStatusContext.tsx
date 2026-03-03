/**
 * OnlineStatusContext: distributes isOnline from useConnection across the component tree.
 * Single source of truth for offline state (ADR-020).
 * Consumed by tabs, AgendaForm, SpeechSlot to gate write operations.
 */

import React, { createContext, useContext } from 'react';

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
  return (
    <OnlineStatusContext.Provider value={{ isOnline }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus(): boolean {
  return useContext(OnlineStatusContext).isOnline;
}
